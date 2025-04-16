// @/app/project/[id]/hooks/useTestLLM.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { Block, SHOT_TYPE_MAP, TEMPLATE_MAP } from '@/app/types';
import { useSSE } from './useSSE';
import { disableFileChecking, enableFileChecking } from '@/app/utils/client-file-utils';

// Define event types and payload interfaces
export type TestEventType = 'testStart' | 'testComplete' | 'testError';

interface TestStartPayload {
    projectId: string;
    timestamp?: number;
}

interface TestCompletePayload {
    projectId: string;
    testId: string;
    results?: any;
}

interface TestErrorPayload {
    projectId: string;
    error: string;
}

export type TestEventPayload = TestStartPayload | TestCompletePayload | TestErrorPayload;
export type TestEventCallback = (data: TestEventPayload) => void;

// Simple event system for test lifecycle events
export const testEvents = {
    listeners: new Map<TestEventType, Set<TestEventCallback>>(),

    subscribe(eventType: TestEventType, callback: TestEventCallback): () => void {
        if (!this.listeners.has(eventType)) {
            this.listeners.set(eventType, new Set<TestEventCallback>());
        }
        const callbacks = this.listeners.get(eventType);
        callbacks?.add(callback);

        return () => {
            callbacks?.delete(callback);
        };
    },

    emit(eventType: TestEventType, data: TestEventPayload): void {
        if (this.listeners.has(eventType)) {
            this.listeners.get(eventType)?.forEach(callback => {
                try {
                    callback(data);
                } catch (err) {
                    console.error('Error in test event listener:', err);
                }
            });
        }
    }
};

export function useTestLLM(blocks: Block[], projectId: string) {
    const [isLoading, setIsLoading] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [testResults, setTestResults] = useState<any>(null);
    const [testRunId, setTestRunId] = useState<string | null>(null);
    const [resultId, setResultId] = useState<string | null>(null);
    const [savedToDb, setSavedToDb] = useState(false);
    const [isAutoLoaded, setIsAutoLoaded] = useState(false);
    const [testDuration, setTestDuration] = useState<number | null>(null);
    const [usingLocalFallback, setUsingLocalFallback] = useState(false);

    const startTimeRef = useRef<number | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

    const { status: sseStatus } = useSSE(projectId, testRunId);

    useEffect(() => {
        disableFileChecking();
        return () => {
            enableFileChecking();
            if (pollTimerRef.current) {
                clearTimeout(pollTimerRef.current);
                pollTimerRef.current = null;
            }
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
                abortControllerRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        if (!sseStatus) return;
        console.log("[useTestLLM] SSE status update:", sseStatus);

        if (sseStatus.status === 'running') {
            setIsPlaying(true);
            setIsLoading(true);
            setError(null);
        } else if (sseStatus.status === 'completed') {
            setIsPlaying(false);
            setIsLoading(false);
            setError(null);
            setTestResults(sseStatus.results);
            setSavedToDb(true);
            if (startTimeRef.current) {
                const endTime = Date.now();
                setTestDuration((endTime - startTimeRef.current) / 1000);
            }
        } else if (sseStatus.status === 'error' || sseStatus.status === 'aborted') {
            setIsPlaying(false);
            setIsLoading(false);
            setError(sseStatus.error || 'Test failed');
            if (startTimeRef.current) {
                const endTime = Date.now();
                setTestDuration((endTime - startTimeRef.current) / 1000);
            }
        }
    }, [sseStatus]);

    const resetStates = useCallback(() => {
        console.log("[useTestLLM] Resetting states");
        setIsPlaying(false);
        setIsLoading(false);
    }, []);

    const clearResults = useCallback(() => {
        setTestResults(null);
        setSavedToDb(false);
        setIsAutoLoaded(false);
        setTestDuration(null);
        setTestRunId(null);  // Explicitly clear testRunId when clearing results
    }, []);

    const handleTest = useCallback(async () => {
        if (isPlaying) {
            console.log("Test already in progress");
            return false;
        }
        if (!blocks || blocks.length === 0) {
            setError("No blocks to test");
            return false;
        }
        try {
            // Reset state and record start time.
            setIsLoading(true);
            setIsPlaying(true);
            setError(null);
            setTestResults(null);
            setSavedToDb(false);
            setIsAutoLoaded(false);
            startTimeRef.current = Date.now();

            // Emit test start event BEFORE making network request
            // This allows components to clear themselves immediately
            testEvents.emit('testStart', {
                projectId,
                timestamp: Date.now()
            } as TestStartPayload);

            // --- Prepare FormData for the consolidated test endpoint ---
            const formData = new FormData();
            formData.append("blocks", JSON.stringify(blocks));
            formData.append("project_id", projectId);

            const testCaseBlock = blocks.find(b => b.type === "test-case");
            const shotType = testCaseBlock?.shotType
                ? SHOT_TYPE_MAP[testCaseBlock.shotType] || "zero"
                : "zero";
            const template = testCaseBlock?.testCaseFormat
                ? TEMPLATE_MAP[testCaseBlock.testCaseFormat] || "std"
                : "std";

            const evaluationBlock = blocks.find(b => b.type === "evaluation-container");
            const topics = JSON.stringify(evaluationBlock?.config?.topics || []);

            console.log(`Starting test with: shotType=${shotType}, template=${template}, topics=${topics}`);
            formData.append("shot_type", shotType);
            formData.append("template", template);
            formData.append("topics", topics);

            console.log("Starting test for project:", projectId);

            // Call the consolidated test endpoint
            const startTestRes = await fetch(`/api/projects/${projectId}/test`, {
                method: "POST",
                body: formData,
            });

            if (!startTestRes.ok) {
                const errorText = await startTestRes.text();
                throw new Error(`Failed to start test: ${errorText}`);
            }

            // Parse response to get testId and resultId
            const startTestData = await startTestRes.json();
            setTestRunId(startTestData.testId);
            setResultId(startTestData.resultId);
            console.log("Test started with ID:", startTestData.testId);
            console.log("Result document ID:", startTestData.resultId);

            return true;
        } catch (err) {
            setIsLoading(false);
            setIsPlaying(false);
            const errorMessage = err instanceof Error ? err.message : String(err);
            setError(errorMessage);
            console.error("Error starting test:", errorMessage);
            return false;
        }
    }, [isPlaying, blocks, projectId]);

    // const handleStop = useCallback(async () => {
    //     if (!isPlaying || !testRunId) {
    //         console.log("No test running to stop");
    //         return;
    //     }

    //     // Update UI state immediately
    //     setIsPlaying(false);
    //     setIsLoading(false);

    //     console.log(`Stopping test: ${testRunId}`);

    //     // Send abort request
    //     try {
    //         await fetch(`/api/projects/${projectId}/test`, {
    //             method: 'POST',
    //             headers: { 'Content-Type': 'application/json' },
    //             body: JSON.stringify({
    //                 action: 'update-status',
    //                 testId: testRunId,
    //                 status: 'aborted',
    //                 progress: 'Test aborted by user'
    //             }),
    //         });
    //     } catch (err) {
    //         console.error("Error stopping test:", err);
    //     }
    // }, [isPlaying, testRunId, projectId]);

    const clearTestRunId = useCallback(() => {
        console.log("[useTestLLM] Clearing testRunId");
        setTestRunId(null);
    }, []);

    const saveTestResults = useCallback(async (results: any) => {
        if (!testRunId || !projectId) {
            console.error("Cannot save results: missing testId or projectId");
            return false;
        }

        try {
            // Call the consolidated endpoint with action=save-results
            const response = await fetch(`/api/projects/${projectId}/test`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'save-results',
                    testId: testRunId,
                    results: results
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to save results: ${errorText}`);
            }

            setSavedToDb(true);
            console.log("Test results saved successfully");
            return true;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            console.error("Error saving test results:", errorMessage);
            return false;
        }
    }, [testRunId, projectId]);

    // Save results to database when received from SSE
    useEffect(() => {
        if (sseStatus?.status === 'completed' && sseStatus?.results && testRunId) {
            saveTestResults(sseStatus.results);
            // Ensure states are reset
            resetStates();
        } else if (sseStatus?.status === 'error' || sseStatus?.status === 'aborted') {
            // Also reset states on error or abort
            resetStates();
        }
    }, [sseStatus, testRunId, saveTestResults, resetStates]);

    const fetchResultsFromDb = useCallback(async () => {
        if (!projectId) return;
        try {
            setIsLoading(true);
            // Use the consolidated endpoint GET method
            const response = await fetch(`/api/projects/${projectId}/test`);

            if (!response.ok) {
                if (response.status === 404) {
                    console.log("No previous results found");
                    setTestResults(null);
                    setSavedToDb(false);
                } else {
                    throw new Error(`Failed to fetch results: ${response.statusText}`);
                }
            } else {
                const data = await response.json();
                if (data && data.results && Object.keys(data.results).length > 0) {
                    console.log("Loaded previous results from database");
                    setTestResults(data.results);
                    setSavedToDb(true);
                    setIsAutoLoaded(true);
                } else {
                    setTestResults(null);
                    setSavedToDb(false);
                }
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            console.error("Error fetching results:", errorMessage);
        } finally {
            setIsLoading(false);
        }
    }, [projectId]);

    useEffect(() => {
        if (projectId && !testResults && !isPlaying) {
            fetchResultsFromDb();
        }
    }, [projectId, testResults, isPlaying, fetchResultsFromDb]);

    return {
        isLoading,
        isPlaying,
        error,
        testResults,
        testRunId,
        savedToDb,
        isAutoLoaded,
        usingLocalFallback,
        testDuration,
        handleTest,
        // handleStop,
        clearResults,
        fetchResultsFromDb,
        saveTestResults,
        resetStates,
        clearTestRunId
    };
}