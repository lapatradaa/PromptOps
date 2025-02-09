import { useState, useCallback } from 'react';
import { Block, TestCaseFormat, ShotType } from '@/app/types';
import { TestResults } from '../components/DashboardPanel/types';

export const useTestLLM = (blocks: Block[], projectId: string) => {
    const [isLoading, setIsLoading] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [testResults, setTestResults] = useState<TestResults | null>(null);

    // Map your UI-based enums to the backend-friendly strings
    const shotTypeMap: Record<ShotType, string> = {
        'Zero Shot': 'zero',
        'One Shot': 'one',
        'Few Shot': 'few',
    };

    const templateMap: Record<TestCaseFormat, string> = {
        'ICQA Format': 'icqa',
        'Standard': 'std',
        'Chain-of-Thought': 'cot',
    };

    const handleTest = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);

            // 1) Gather topics from every block
            const allTopics = blocks.flatMap(block => block.config?.topics || []);
            const uniqueTopics = Array.from(new Set(allTopics));

            // 2) Find the test-case block to read shotType & testCaseFormat
            const testCaseBlock = blocks.find(b => b.type === 'test-case');
            const shot_type = testCaseBlock?.shotType
                ? shotTypeMap[testCaseBlock.shotType]
                : 'zero'; // default fallback if missing
            const template = testCaseBlock?.testCaseFormat
                ? templateMap[testCaseBlock.testCaseFormat]
                : 'std'; // default fallback if missing

            // 3) Build the POST payload
            //    This will be sent to your Next.js route, which calls `process-combined` in FastAPI

            const endpoint = "process-combined";
            const payload = {
                endpoint,
                shot_type,
                template,
                blocks,
                topics: uniqueTopics, // <— pass all topics here
            };

            // 4) Call the Next.js endpoint: /api/projects/[projectId]
            //    In your route, you’ll forward to FastAPI /process-combined
            const response = await fetch(`/api/projects/${projectId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const msg = await response.text();
                throw new Error(`HTTP error! status: ${response.status}, message: ${msg}`);
            }

            // 5) This response should combine both normal & robust results
            const rawResults = await response.json();
            // rawResults might look like: 
            // {
            //   results: [...],
            //   summary: {...},
            //   index_scores: {...},
            //   robust_results: [...]
            // }

            // 6) Now compute *all* scores
            const scoreResponse = await fetch(`/api/projects/calculate-scores`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(rawResults),
            });

            if (!scoreResponse.ok) {
                const msg = await scoreResponse.text();
                throw new Error(`Failed to calculate scores: ${msg}`);
            }

            const scoreData = await scoreResponse.json();
            // scoreData might look like:
            // {
            //   overall_score: {...},
            //   performance_score: {...}
            // }

            console.log("overall_score: ", scoreData.overall_score)

            // 7) Merge the score data with the original results
            const finalResults: TestResults = {
                ...rawResults,
                overall_score: scoreData.overall_score,
                performance_score: scoreData.performance_score,
            };

            setTestResults(finalResults);
            setIsPlaying(true);
        } catch (err) {
            console.error('❌ Test LLM error:', err);
            setError(err instanceof Error ? err.message : 'Failed to test LLM');
            setIsPlaying(false);
        } finally {
            setIsLoading(false);
        }
    }, [blocks, projectId]);

    // Pausing / Stopping logic
    const handleStop = useCallback(async () => {
        try {
            const response = await fetch('/api/projects/stop', { method: 'POST' });
            if (!response.ok) {
                throw new Error(`Failed to pause test: ${await response.text()}`);
            }
            setIsPlaying(false);
        } catch (err) {
            console.error('❌ Error pausing test:', err);
            setError(err instanceof Error ? err.message : 'Failed to pause test');
        }
    }, []);

    // Clears state
    const clearResults = useCallback(() => {
        setTestResults(null);
        setError(null);
        setIsPlaying(false);
        setIsLoading(false);
    }, []);

    return {
        isLoading,
        isPlaying,
        error,
        testResults,
        handleTest,
        handleStop,
        clearResults,
    };
};
