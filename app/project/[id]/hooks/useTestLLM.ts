import { useState, useCallback } from 'react';
import { Block } from '@/app/types';
import { TestResults } from '../components/DashboardPanel/types';

interface TestConfig {
    modelProvider: string;
    model: string;
    systemContent: string;
    temperature: number;
    topP: number;
    maxTokens: number;
    llamaUrl: string;
}

interface TestTemplate {
    instruction: string;
    context: string;
    query: string;
}

const defaultConfig: TestConfig = {
    modelProvider: "llama",
    model: "llama-13b",
    systemContent: "You are an assistant that generates logical sentences.",
    temperature: 0.5,
    topP: 0.9,
    maxTokens: 150,
    llamaUrl: "http://127.0.0.1:8000/v1/chat/completions"
};

const defaultTemplate: TestTemplate = {
    instruction: "Answer the question based on the context below. Answer each question with a simple Boolean answer (Yes or No).",
    context: "Seedless cucumber fruit does not require pollination. Cucumber plants need insects to pollinate them. Entomophobia is a fear of insects.",
    query: "Is growing seedless cucumber good for a gardener with entomophobia?"
};

export const useTestLLM = (blocks: Block[]) => {
    const [isLoading, setIsLoading] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [testResults, setTestResults] = useState<TestResults | null>(null);

    const handleTest = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);

            const testData = {
                config: defaultConfig,
                blocks: blocks.map(block => ({
                    type: block.type,
                    method: block.method || block.type,
                    config: {
                        data: block.config?.data,  // This will include the file content
                        ...block.config
                    }
                })),
                template: defaultTemplate
            };

            console.log('Sending request to:', 'http://localhost:8001/api/test-llm');
            const response = await fetch('http://localhost:8001/api/test-llm', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(testData),
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Response not OK:', {
                    status: response.status,
                    statusText: response.statusText,
                    errorText
                });
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
            }

            const results = await response.json();

            // Transform results if needed
            const transformedResults = {
                summary: results.summary || '',
                tests: results.tests || [],
                ...results
            };

            setTestResults(results);
            setIsPlaying(true);

        } catch (err) {
            console.error('Test LLM error:', err);
            setError(err instanceof Error ? err.message : 'Failed to test LLM');
            setIsPlaying(false);
        } finally {
            setIsLoading(false);
        }
    }, [blocks]);

    const handleStop = useCallback(async () => {
        try {
            const response = await fetch('http://localhost:8001/api/stop-test', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (!response.ok) {
                throw new Error('Failed to stop test');
            }

            setIsPlaying(false);
            setIsLoading(false);
            setError(null);

        } catch (err) {
            console.error('Error stopping test:', err);
            setError(err instanceof Error ? err.message : 'Failed to stop test');
        }
    }, []);

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
        clearResults
    };
};

export type UseTestLLMReturn = ReturnType<typeof useTestLLM>;