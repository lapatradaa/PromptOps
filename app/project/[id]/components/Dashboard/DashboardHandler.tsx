// @/app/project/[id]/components/Dashboard/DashboardHandler.tsx
import React, { useState, useCallback, useEffect, useRef } from 'react';
import ResultsPanel from './panels/ResultsPanel';
import PerturbationResultsPanel from './panels/PerturbationResultsPanel';
import { TestResults } from '@/app/types/testing';

interface DashboardHandlerProps {
  testResults?: TestResults | null;
  applicabilityResults?: any;
  fileName?: string;
  projectId?: string;
  testId?: string; // NEW: Unique test identifier to detect a new test run
  onClose?: () => void;
  isVisible?: boolean;
  initialViewMode?: 'applicability' | 'results';
  projectType?: string;
}

const DashboardHandler: React.FC<DashboardHandlerProps> = ({
  testResults,
  applicabilityResults,
  fileName,
  projectId,
  testId, // NEW prop
  onClose,
  isVisible = false,
  initialViewMode = 'results',
  projectType = 'qa'
}) => {
  const initializedRef = useRef(false);
  const shouldFetchRef = useRef(true);

  const [localResults, setLocalResults] = useState<TestResults | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'applicability' | 'results'>(initialViewMode);
  const [userManuallyToggled, setUserManuallyToggled] = useState(false);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // NEW: When testId changes, clear previous results and reset fetch flag.
  useEffect(() => {
    setLocalResults(null);
    shouldFetchRef.current = true;
  }, [testId]);

  const resultsToUse = testResults || localResults;
  const hasValidResults = resultsToUse &&
    resultsToUse.performance_score &&
    resultsToUse.overall_score &&
    Object.keys(resultsToUse.performance_score || {}).length > 0 &&
    Object.keys(resultsToUse.overall_score || {}).length > 0;

  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      if (initialViewMode) {
        setViewMode(initialViewMode);
      } else if (applicabilityResults && !hasValidResults) {
        setViewMode('applicability');
      }
    }
  }, [initialViewMode, applicabilityResults, hasValidResults]);

  const fetchResults = useCallback(async () => {
    if (!projectId || localResults || !shouldFetchRef.current) return;
    shouldFetchRef.current = false;
    try {
      setIsLoading(true);
      // Append a timestamp to bust any cache
      const response = await fetch(`/api/projects/results/${projectId}?t=${Date.now()}`);
      if (!response.ok) {
        if (response.status !== 404) {
          console.error(`[DashboardHandler] Error fetching results: ${response.statusText}`);
        }
        return;
      }
      const data = await response.json();
      setLocalResults(data);
    } catch (error) {
      console.error('[DashboardHandler] Error fetching results:', error);
    } finally {
      setIsLoading(false);
    }
  }, [projectId, localResults]);

  useEffect(() => {
    if (testResults) {
      setLocalResults(testResults);
    }
  }, [testResults]);

  useEffect(() => {
    if (viewMode === 'results' && !localResults && !testResults && projectId && isVisible) {
      fetchResults();
    }
  }, [viewMode, localResults, testResults, projectId, fetchResults, isVisible]);

  const handleToggleViewMode = useCallback(() => {
    setUserManuallyToggled(true);
    setViewMode(currentMode => currentMode === 'results' ? 'applicability' : 'results');
  }, []);

  const handleClose = useCallback(() => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
    }
    closeTimeoutRef.current = setTimeout(() => {
      if (onClose) {
        onClose();
      }
      closeTimeoutRef.current = null;
    }, 50);
  }, [onClose]);

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  if (!isVisible) {
    return null;
  }

  if (viewMode === 'applicability') {
    let formattedResults: { perturbation_results: Record<string, any> } = {
      perturbation_results: {}
    };

    if (applicabilityResults) {
      if (applicabilityResults.perturbation_results) {
        formattedResults = applicabilityResults;
      } else if (applicabilityResults.overall && applicabilityResults.perturbation_results) {
        formattedResults = applicabilityResults;
      } else {
        Object.keys(applicabilityResults).forEach(key => {
          if (key !== "overall") {
            formattedResults.perturbation_results[key] = applicabilityResults[key];
          }
        });
      }
    }

    return (
      <PerturbationResultsPanel
        results={formattedResults}
        onClose={handleClose}
        fileName={fileName}
        isVisible={true}
        projectType={projectType}
      />
    );
  }

  return (
    <ResultsPanel
      results={hasValidResults ? resultsToUse : null}
      onClose={handleClose}
      fileName={fileName}
      isLoading={isLoading}
      onViewModeToggle={applicabilityResults ? handleToggleViewMode : undefined}
    />
  );
};

export default DashboardHandler;