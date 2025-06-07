// app/project/[id]/hooks/useTestLLM.ts

import { useState, useCallback, useRef, useEffect } from "react";
import {
  Block,
  SHOT_TYPE_MAP,
  TEMPLATE_MAP,
  TestResults as TypedTestResults,
  DEFAULT_TEST_RESULTS,
} from "@/app/types";
import { useTestStatus } from "@/app/hooks/useTestStatus";
import testApiClient from "@/app/utils/test-utils/test-api-client";
import { disableFileChecking, enableFileChecking } from "@/app/utils/client-file-utils";
import { testEvents } from "@/app/utils/test-utils/test-events";

interface UseTestLLMProps {
  blocks: Block[];
  projectId: string;
  project?: { 
    llm?: string;
    modelProvider?: string;
    type?: string;
    url?: string;
    apiKey?: string | null;
    SystemPrompt?: any;
  } | null;
}

export function useTestLLM({ blocks, projectId, project }: UseTestLLMProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<TypedTestResults | null>(null);
  const [testRunId, setTestRunId] = useState<string | null>(null);
  const [savedToDb, setSavedToDb] = useState(false);
  const startTimeRef = useRef<number | null>(null);

  const statusEvt = useTestStatus(projectId, testRunId);

  // disable file‐watching while a test is mounted
  useEffect(() => {
    disableFileChecking();
    return () => enableFileChecking();
  }, []);

  const clearResults = useCallback(() => {
    setTestResults(null);
    setSavedToDb(false);
    setTestRunId(null);
  }, []);

  const clearTestRunId = useCallback(() => {
    setTestRunId(null);
  }, []);

  useEffect(() => {
    if (!statusEvt) return;
    switch (statusEvt.status) {
      case "initializing":
      case "queued":
      case "running":
        setIsPlaying(true);
        setIsLoading(true);
        setError(null);
        break;
      case "completed": {
        setIsPlaying(false);
        setIsLoading(false);
        setError(null);
        const finalResults = statusEvt.results ?? DEFAULT_TEST_RESULTS;
        setTestResults(finalResults);
        if (!savedToDb) {
          setSavedToDb(true);
          const evalBlock = blocks.find(b => b.type === "evaluation-container");
          const topics: string[] = evalBlock?.config?.topics || [];
          testApiClient.saveResults(projectId, { topics, ...finalResults })
            .catch(err => console.error("Failed to save results:", err));
        }
        testEvents.emit("testComplete", {
          projectId, testId: testRunId!, results: statusEvt.results
        });
        break;
      }
      case "error":
        setIsPlaying(false);
        setIsLoading(false);
        setError(statusEvt.error || "Test failed");
        break;
      case "aborted":
        setIsPlaying(false);
        setIsLoading(false);
        setError("Test aborted");
        break;
    }
  }, [statusEvt, projectId, testRunId, savedToDb, blocks]);

  const handleTest = useCallback(async () => {
    if (isPlaying) return false;
    if (!blocks.length) {
      setError("No blocks to test");
      return false;
    }

    setIsLoading(true);
    setIsPlaying(true);
    setError(null);
    clearResults();
    startTimeRef.current = Date.now();
    testEvents.emit("testStart", { projectId, timestamp: Date.now() });

    // 1) fetch the very latest project from your Next.js API
    let latest: any = null;
    try {
      const resp = await fetch(`/api/projects/${projectId}`);
      if (!resp.ok) throw new Error("Fetch failed");
      latest = await resp.json();
    } catch (err) {
      console.warn("Could not fetch fresh project, falling back to state:", err);
      latest = project;
    }

    // 2) pull parameters from that up-to-date object
    const testCase = blocks.find(b => b.type === "test-case");
    const shotType = testCase?.shotType ? SHOT_TYPE_MAP[testCase.shotType] : "zero";
    const template = testCase?.testCaseFormat ? TEMPLATE_MAP[testCase.testCaseFormat] : "std";
    const evalBlock = blocks.find(b => b.type === "evaluation-container");
    const topics = evalBlock?.config?.topics || [];
    const topicConfigs = evalBlock?.config?.topicConfigs;
    const modelProvider = latest?.modelProvider;
    const model = latest?.llm;
    const url = latest?.url;
    const apiKey = latest?.apiKey || undefined;

    let systemPrompt: string | undefined;
    if (latest?.systemPrompt) {
      const sp = latest.systemPrompt;
      systemPrompt = sp.type === "custom" ? sp.customPrompt : sp.defaultPrompt;
    }

    console.log("🚀 Starting test with:", { modelProvider, model, url });

    try {
      const resp = await testApiClient.startTest(projectId, {
        blocks,
        shotType,
        template,
        topics,
        topicConfigs,
        systemPrompt,
        projectId,
        projectType: project?.type || 'qa',
        modelProvider,
        model,
        apiKey,
        url,
      });
      setTestRunId(resp.testId);
      return true;
    } catch (e) {
      setIsLoading(false);
      setIsPlaying(false);
      setError(e instanceof Error ? e.message : String(e));
      return false;
    }
  }, [
    isPlaying,
    blocks,
    projectId,
    project,    // used as fallback
    clearResults
  ]);

  const handleStop = useCallback(async () => {
    if (!isPlaying || !testRunId) return;
    try {
      await testApiClient.abortTest(projectId, testRunId);
      setIsPlaying(false);
      setIsLoading(false);
    } catch {
      // ignore
    }
  }, [isPlaying, testRunId, projectId]);

  const fetchResultsFromDb = useCallback(async () => {
    if (!projectId || !testRunId) return;
    try {
      setIsLoading(true);
      const result = await testApiClient.getTestResults(projectId, testRunId);
      if (result.results) {
        setTestResults(result.results);
        setSavedToDb(true);
      }
    } finally {
      setIsLoading(false);
    }
  }, [projectId, testRunId]);

  useEffect(() => {
    if (projectId && !testResults && !isPlaying && testRunId) {
      fetchResultsFromDb();
    }
  }, [projectId, testResults, isPlaying, testRunId, fetchResultsFromDb]);

  return {
    isLoading,
    isPlaying,
    error,
    testResults,
    testRunId,
    savedToDb,
    handleTest,
    handleStop,
    clearResults,
    clearTestRunId,
  };
}

export default useTestLLM;
