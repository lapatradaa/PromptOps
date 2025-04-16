// @/app/project/[id]/components/Dashboard/utils/hooks.tsx

import { useState, useEffect, useCallback } from 'react';
import { TestResults } from '@/app/types';

type ViewMode = 'results' | 'applicability';

interface ViewModeHookResult {
    viewMode: ViewMode;
    toggleViewMode: () => void;
    userManuallyToggled: boolean;
}

interface PaginationHookResult {
    currentPage: number;
    goToNextPage: () => void;
    goToPrevPage: () => void;
    canGoNext: boolean;
    canGoPrev: boolean;
    totalPages: number;
}

interface TestResultsHookResult {
    results: TestResults | null;
    isLoading: boolean;
    fetchResults: () => Promise<void>;
}

/**
 * Hook to manage dashboard view mode and toggling
 */
export const useDashboardViewMode = (
    initialMode: ViewMode = 'results',
    hasValidResults: boolean = false,
    hasApplicabilityResults: boolean = false
): ViewModeHookResult => {
    const [viewMode, setViewMode] = useState<ViewMode>(initialMode);
    const [userManuallyToggled, setUserManuallyToggled] = useState<boolean>(false);

    // Determine initial view based on available data
    useEffect(() => {
        // Reset manual toggle flag when dashboard first appears
        setUserManuallyToggled(false);

        if (initialMode) {
            // Always respect explicit initial view mode from parent
            setViewMode(initialMode);
        } else if (hasApplicabilityResults && !hasValidResults) {
            // Show applicability if we only have that data
            setViewMode('applicability');
        }
    }, [initialMode, hasApplicabilityResults, hasValidResults]);

    // Auto-switch if needed (only if user hasn't manually toggled)
    useEffect(() => {
        if (!hasValidResults && hasApplicabilityResults && viewMode === 'results' && !userManuallyToggled) {
            setViewMode('applicability');
        }
    }, [hasValidResults, hasApplicabilityResults, viewMode, userManuallyToggled]);

    // Toggle handler
    const toggleViewMode = useCallback(() => {
        setUserManuallyToggled(true);
        setViewMode(prev => prev === 'results' ? 'applicability' : 'results');
    }, []);

    return {
        viewMode,
        toggleViewMode,
        userManuallyToggled
    };
};

/**
 * Hook to fetch test results from API
 */
export const useTestResults = (
    projectId: string | null,
    initialResults: TestResults | null = null
): TestResultsHookResult => {
    const [results, setResults] = useState<TestResults | null>(initialResults);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    // Update local results when initialResults changes
    useEffect(() => {
        if (initialResults) {
            setResults(initialResults);
        }
    }, [initialResults]);

    // Fetch results function
    const fetchResults = useCallback(async () => {
        if (!projectId || results) return;

        try {
            setIsLoading(true);
            const response = await fetch(`/api/projects/results/${projectId}`);

            if (!response.ok) {
                if (response.status !== 404) { // 404 is expected if no results yet
                    console.error(`Error fetching results: ${response.statusText}`);
                }
                return;
            }

            const data = await response.json();
            setResults(data);
        } catch (error) {
            console.error('Error fetching results:', error);
        } finally {
            setIsLoading(false);
        }
    }, [projectId, results]);

    return {
        results,
        isLoading,
        fetchResults
    };
};

/**
 * Hook to manage pagination state
 */
export const usePagination = (
    totalItems: number,
    initialPage: number = 0
): PaginationHookResult => {
    const [currentPage, setCurrentPage] = useState<number>(initialPage);

    // Reset current page if total items changes
    useEffect(() => {
        if (currentPage >= totalItems) {
            setCurrentPage(0);
        }
    }, [totalItems, currentPage]);

    const goToNextPage = useCallback(() => {
        if (currentPage < totalItems - 1) {
            setCurrentPage(prev => prev + 1);
        }
    }, [currentPage, totalItems]);

    const goToPrevPage = useCallback(() => {
        if (currentPage > 0) {
            setCurrentPage(prev => prev - 1);
        }
    }, [currentPage]);

    return {
        currentPage,
        goToNextPage,
        goToPrevPage,
        canGoNext: currentPage < totalItems - 1,
        canGoPrev: currentPage > 0,
        totalPages: totalItems
    };
};