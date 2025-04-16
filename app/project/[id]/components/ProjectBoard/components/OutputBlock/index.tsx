import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FiDownload } from 'react-icons/fi';
import { TestResults } from '@/app/types';
import {
  checkServerFile,
  downloadServerFile,
  downloadResults
} from '@/app/utils/client-file-utils';
import {
  getFormatDisplayName,
  detectFormatFromBlock,
  FileFormat
} from '@/app/utils/file-utils';
import { useTestResults } from '@/app/contexts/TestResultsContext';
import useTestClearOutput from './hooks/useTestClearOutput';
import styles from './OutputBlock.module.css';

interface OutputBlockProps {
  results: TestResults | null;
  method?: string; // Block method (csv, xlsx, json)
  label?: string; // Block label
  projectId?: string; // Project ID for server downloads
  testRunId?: string | null;
  isAutoLoaded?: boolean;
  isTestInProgress?: boolean; // Add new prop to track test status
}

const OutputBlock: React.FC<OutputBlockProps> = ({
  results,
  method,
  label,
  projectId,
  testRunId,
  isAutoLoaded = false,
  isTestInProgress = false // Default to false if not provided
}) => {
  // States
  const [isDownloading, setIsDownloading] = useState(false);
  const [fileAvailable, setFileAvailable] = useState(false);
  const [lastCheckedTestRunId, setLastCheckedTestRunId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Track if this is the initial mount - prevent auto-fetching on first render
  const isInitialMount = useRef(true);

  // Track the previous testRunId
  const prevTestRunIdRef = useRef<string | null>(null);

  // Ref to track if we've already handled a clear event
  const clearHandledRef = useRef(false);

  // Get context functions
  const { storeResults, getResults, clearResults } = useTestResults();

  // Use the clear output hook to respond to test start events
  const { isCleared } = useTestClearOutput(projectId || '');

  // Determine format from method or label using utility function
  const format = detectFormatFromBlock(method, label) as FileFormat;

  // Clear results when a new test starts (via isCleared signal)
  useEffect(() => {
    if (!projectId) return;

    if (isCleared && !clearHandledRef.current) {
      console.log(`[OutputBlock] Clearing results for ${format} due to new test`);
      clearHandledRef.current = true;

      // Clear the stored results for this format
      clearResults(projectId, format);

      // Reset UI state
      setFileAvailable(false);

      // Reset the last checked test run ID to force a new check when a new ID arrives
      setLastCheckedTestRunId(null);

      // Reset the previous test run ID
      prevTestRunIdRef.current = null;
    } else if (!isCleared) {
      // Reset our tracking ref when isCleared becomes false
      clearHandledRef.current = false;
    }
  }, [isCleared, projectId, format, clearResults]);

  // Only process test run ID changes after initial mount
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    // Only process if we have a new test run ID
    if (testRunId && testRunId !== prevTestRunIdRef.current) {
      console.log(`[OutputBlock] New test run ID: ${testRunId}`);
      prevTestRunIdRef.current = testRunId;
    }
  }, [testRunId]);

  // Get stored results from context if needed (but not on initial mount)
  const storedData = (!isInitialMount.current && projectId && !results)
    ? getResults(projectId, format)
    : { results: null, testRunId: null };

  const storedResults = storedData.results;
  const storedTestRunId = storedData.testRunId;

  // Store new results in context when they arrive
  useEffect(() => {
    if (projectId && results && testRunId && !testRunId.startsWith('saved-')) {
      // Store the results
      storeResults(projectId, format, results, testRunId);
    }
  }, [projectId, format, results, testRunId, storeResults]);

  // Generate a filename based on format
  const getFileName = (originalTimestamp?: string) => {
    // If we have an original timestamp from a cached result, use it
    if (originalTimestamp) {
      return `test-results-${originalTimestamp}`;
    }

    // Otherwise generate a new timestamp for current results
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `test-results-${year}-${month}-${day}-${hours}.${minutes}`;
  };

  // Normalize results data structure for backward compatibility
  const normalizeResultsData = useCallback((data: TestResults | null) => {
    if (!data) return null;
    return data;
  }, []);

  // Check for server-side files only when testRunId changes and it's final
  useEffect(() => {
    // Skip if:
    // 1. Initial mount
    // 2. No project ID
    // 3. No test run ID
    // 4. We've already checked this test run ID
    // 5. The test run ID is from a saved result (starts with 'saved-')
    // 6. NEW: A test is currently in progress
    if (
      isInitialMount.current ||
      !projectId ||
      !testRunId ||
      testRunId === lastCheckedTestRunId ||
      testRunId.startsWith('saved-') ||
      isTestInProgress // Skip if test is in progress
    ) {
      return;
    }

    console.log(`[OutputBlock] Checking for results with testRunId: ${testRunId}`);
    setLastCheckedTestRunId(testRunId);
    setFileAvailable(false);
    setIsLoading(true);

    // Check for server file
    const checkFile = async () => {
      try {
        // Wait longer for server processing to complete
        await new Promise(resolve => setTimeout(resolve, 2000));
        // Use forceCheck to bypass global flag check
        const isAvailable = await checkServerFile(projectId, format, 3, 1000, true);
        setFileAvailable(isAvailable);
        console.log(`[OutputBlock] Server file check for ${format}: ${isAvailable ? 'Available' : 'Not available'}`);
      } catch (error) {
        console.error(`[OutputBlock] Error checking file availability:`, error);
      } finally {
        setIsLoading(false);
      }
    };

    checkFile();
  }, [projectId, format, testRunId, lastCheckedTestRunId, isTestInProgress]);

  // Handle download click
  const handleDownload = async () => {
    if (!projectId) {
      console.error('[OutputBlock] No project ID provided for download');
      return;
    }

    // Determine which results to use (live results or stored)
    const activeResults = results ||
      (storedTestRunId === testRunId ? storedResults : null);
    const activeTestRunId = testRunId ||
      (storedTestRunId === testRunId ? storedTestRunId : null);

    if (!activeResults && !fileAvailable) {
      console.error('[OutputBlock] No results available for download');
      return;
    }

    setIsDownloading(true);

    try {
      // First try server download if available and matches current test run
      if (fileAvailable && activeTestRunId === testRunId) {
        console.log(`[OutputBlock] Downloading ${format} file from server for test run ${testRunId}`);
        // Use the utility function for server download
        const downloadResponse = await downloadServerFile(projectId, format);
        if (!downloadResponse.success) {
          throw new Error(downloadResponse.message || 'Server download failed');
        }
      }
      // Otherwise use client-side download with results object
      else if (activeResults) {
        console.log(`[OutputBlock] Downloading ${format} file using client-side conversion for test run ${activeTestRunId}`);
        const normalizedResults = normalizeResultsData(activeResults);
        // Check if normalizedResults is not null before proceeding
        if (normalizedResults) {
          downloadResults(normalizedResults, {
            filename: `${getFileName()}.${format}`,
            format
          });
        } else {
          throw new Error('Failed to normalize results data');
        }
      } else {
        throw new Error('No active test results available');
      }
    } catch (error) {
      console.error('[OutputBlock] Download error:', error);
      // If server download fails, try client-side as fallback
      if (activeResults) {
        try {
          console.log(`[OutputBlock] Using fallback client-side download`);
          const normalizedResults = normalizeResultsData(activeResults);
          // Check if normalizedResults is not null before proceeding
          if (normalizedResults) {
            downloadResults(normalizedResults, {
              filename: `${getFileName()}.${format}`,
              format
            });
          } else {
            throw new Error('Failed to normalize results data in fallback');
          }
        } catch (fallbackError) {
          console.error('[OutputBlock] Fallback download failed:', fallbackError);
          alert('Failed to download results. Please try again.');
        }
      } else {
        alert('Download failed. No results available.');
      }
    } finally {
      setIsDownloading(false);
    }
  };

  // Show loading state when actually loading or test is in progress
  if (isLoading || isTestInProgress) {
    return (
      <div className={styles.noResults}>
        <div className={styles.downloadSpinner}></div>
        <p>{isTestInProgress ? "Test in progress..." : "Checking for results..."}</p>
      </div>
    );
  }

  // Determine which results to display (live results take precedence over stored)
  const activeResults = results ||
    (storedTestRunId === testRunId ? storedResults : null);

  // Don't show results if:
  // 1. Initial mount (prevents auto-fetching on drag)
  // 2. There are no active results and no file available
  // 3. The block is auto-loaded
  // 4. NEW: A test is currently in progress
  if (
    isInitialMount.current ||
    (!activeResults && !fileAvailable) ||
    isAutoLoaded ||
    isTestInProgress
  ) {
    return (
      <div className={styles.noResults}>
        <p>{isTestInProgress
          ? "Test in progress. Results will appear when completed."
          : "No test results available. Please run a test first."}</p>
      </div>
    );
  }

  return (
    <div className={styles.fileList}>
      <div className={styles.fileItem}>
        <div className={styles.fileName}>
          {getFileName()}.{format}
          {!results && storedResults && storedTestRunId === testRunId && (
            <span className={styles.fromCache}> (Cached)</span>
          )}
        </div>
        <button
          onClick={handleDownload}
          className={styles.fileDownload}
          disabled={isDownloading}
          aria-label={`Download as ${getFormatDisplayName(format)}`}
        >
          {isDownloading ? (
            <div className={styles.downloadSpinner}></div>
          ) : (
            <FiDownload />
          )}
        </button>
      </div>
    </div>
  );
};

export default OutputBlock;