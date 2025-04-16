// @/app/contexts/TestResultsContext.tsx
import React, { createContext, useContext, useState, ReactNode, useRef, useCallback } from 'react';
import { TestResults } from '@/app/types';

type StorageKey = `${string}_${string}`;

interface TestResultsContextState {
    storedResults: Record<StorageKey, { results: TestResults; testRunId: string }>;
    storeResults: (projectId: string, format: string, results: TestResults, testRunId: string) => void;
    getResults: (projectId: string, format: string) => { results: TestResults | null; testRunId: string | null };
    clearResults: (projectId: string, format: string) => void;
}

const TestResultsContext = createContext<TestResultsContextState>({
    storedResults: {},
    storeResults: () => { },
    getResults: () => ({ results: null, testRunId: null }),
    clearResults: () => { },
});

export const useTestResults = () => useContext(TestResultsContext);

export const TestResultsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [storedResults, setStoredResults] = useState<Record<StorageKey, { results: TestResults; testRunId: string }>>({});
    const storedKeysRef = useRef<Record<string, boolean>>({});

    const storeResults = useCallback(
        (projectId: string, format: string, results: TestResults, testRunId: string) => {
            const key = `${projectId}_${format}` as StorageKey;
            const trackingKey = `${key}_${testRunId}`;
            if (storedKeysRef.current[trackingKey]) return;
            storedKeysRef.current[trackingKey] = true;
            setStoredResults(prev => {
                if (prev[key]?.testRunId === testRunId) return prev;
                return { ...prev, [key]: { results, testRunId } };
            });
        },
        []
    );

    const getResults = useCallback(
        (projectId: string, format: string) => {
            const key = `${projectId}_${format}` as StorageKey;
            const entry = storedResults[key];
            return { results: entry ? entry.results : null, testRunId: entry ? entry.testRunId : null };
        },
        [storedResults]
    );

    const clearResults = useCallback(
        (projectId: string, format: string) => {
            const key = `${projectId}_${format}` as StorageKey;
            const keysToDelete: string[] = [];
            Object.keys(storedKeysRef.current).forEach(trackingKey => {
                if (trackingKey.startsWith(key)) {
                    keysToDelete.push(trackingKey);
                }
            });
            keysToDelete.forEach(trackingKey => {
                delete storedKeysRef.current[trackingKey];
            });
            setStoredResults(prev => {
                const newState = { ...prev };
                delete newState[key];
                return newState;
            });
        },
        []
    );

    const contextValue: TestResultsContextState = {
        storedResults,
        storeResults,
        getResults,
        clearResults,
    };

    return <TestResultsContext.Provider value={contextValue}>{children}</TestResultsContext.Provider>;
};

export default TestResultsProvider;
