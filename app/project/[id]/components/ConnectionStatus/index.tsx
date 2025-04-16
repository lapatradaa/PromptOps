// @/app/project/[id]/components/ConnectionStatus/index.tsx
import { toast } from "react-hot-toast";
import React, { useEffect, useRef } from "react";
import useSSE from "../../hooks/useSSE";

interface ConnectionStatusProps {
  projectId: string;
  testId: string;
  onStatusChange?: (status: StatusState) => void;
}

// Add 'pending' to the supported status types
export type StatusType = 'connecting' | 'connected' | 'error' | 'completed' | 'aborted' | 'not_found' | 'pending';

export interface StatusState {
  type: StatusType;
  message: string;
  progress?: string;
  error?: string;
  results?: any;
  runtime?: number;
  status?: string;
}

/**
 * ConnectionStatus shows a persistent toast notification with a spinner
 * while waiting for test results.
 */
const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  projectId,
  testId,
  onStatusChange,
}) => {
  const { status: sseStatus, isConnected, error: sseError } = useSSE(projectId, testId);
  const toastIdRef = useRef<string | null>(null);

  // Map the SSE status data to our component's status format
  const mapStatusDataToState = (): StatusState => {
    if (!testId) {
      return {
        type: 'error',
        message: 'No test ID provided'
      };
    }

    if (sseError) {
      return {
        type: 'error',
        message: 'Connection error',
        error: sseError
      };
    }

    if (!isConnected && !sseStatus) {
      return {
        type: 'connecting',
        message: 'Connecting to test server...'
      };
    }

    if (!sseStatus) {
      return {
        type: 'connecting',
        message: 'Waiting for status update...'
      };
    }

    // Based on the server status, determine our component state
    const serverStatus = sseStatus.status;
    let statusType: StatusType;
    let message: string;

    if (serverStatus === 'running' || serverStatus === 'processing') {
      statusType = 'connected';
      message = 'Test in progress';
    } else if (serverStatus === 'completed') {
      statusType = 'completed';
      message = 'Test completed successfully';
    } else if (serverStatus === 'error') {
      statusType = 'error';
      message = 'Test failed with error';
    } else if (serverStatus === 'aborted') {
      statusType = 'aborted';
      message = 'Test was aborted';
    } else if (serverStatus === 'not_found') {
      statusType = 'not_found';
      message = 'Test not found';
    } else if (serverStatus === 'pending') {
      // Handle pending status properly
      statusType = 'pending';
      message = 'Test initialization in progress';
    } else {
      statusType = 'error';
      message = `Unknown test status: ${serverStatus}`;
    }

    return {
      type: statusType,
      message,
      progress: sseStatus.progress,
      error: sseStatus.error,
      results: sseStatus.results,
      runtime: sseStatus.runtime_seconds,
      status: serverStatus
    };
  };

  useEffect(() => {
    const statusState = mapStatusDataToState();

    // Get the message to display in the toast
    let toastMessage = statusState.message;
    if (statusState.progress) {
      toastMessage = `${toastMessage}`;
    }

    // Handle different status types
    if (statusState.type === 'connecting' || statusState.type === 'connected' || statusState.type === 'pending') {
      // Create or update loading toast - include pending in loading states
      if (!toastIdRef.current) {
        toastIdRef.current = toast.loading(toastMessage, {
          id: "test-status",
          duration: Infinity,
          style: {
            backgroundColor: statusState.type === 'pending' ? '#f9fafb' : '#f0f9ff', // Light gray for pending, light blue for others
            padding: '12px',
            borderLeft: `4px solid ${statusState.type === 'pending' ? '#9ca3af' : '#3b82f6'}`,
          },
        });
      } else {
        toast.loading(toastMessage, {
          id: toastIdRef.current,
        });
      }
    } else if (statusState.type === 'completed') {
      // Success toast
      if (toastIdRef.current) {
        toast.success(toastMessage, {
          id: toastIdRef.current,
          duration: 4000,
          style: {
            backgroundColor: '#f0fdf4', // Light green background
            padding: '12px',
            borderLeft: '4px solid #22c55e',
          },
        });
        toastIdRef.current = null;
      }
    } else if (statusState.type === 'error') {
      // Error toast
      if (toastIdRef.current) {
        toast.error(`${toastMessage}${statusState.error ? `: ${statusState.error}` : ''}`, {
          id: toastIdRef.current,
          duration: 8000,
          style: {
            backgroundColor: '#fef2f2', // Light red background
            padding: '12px',
            borderLeft: '4px solid #ef4444',
          },
        });
        toastIdRef.current = null;
      }
    } else {
      // Other terminal states (aborted, not found)
      if (toastIdRef.current) {
        toast.dismiss(toastIdRef.current);
        toast(toastMessage, {
          icon: '⚠️',
          duration: 4000,
          style: {
            backgroundColor: '#fefce8', // Light yellow background
            padding: '12px',
            borderLeft: '4px solid #eab308',
          },
        });
        toastIdRef.current = null;
      }
    }

    // Call onStatusChange callback if provided
    if (onStatusChange) {
      onStatusChange(statusState);
    }
  }, [testId, sseStatus, isConnected, sseError]); // eslint-disable-line react-hooks/exhaustive-deps

  // Clean up toast when component unmounts
  useEffect(() => {
    return () => {
      if (toastIdRef.current) {
        toast.dismiss(toastIdRef.current);
      }
    };
  }, []);

  return null;
};

export default ConnectionStatus;