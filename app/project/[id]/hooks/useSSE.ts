// @/app/project/[id]/hooks/useSSE.ts
import { useState, useEffect, useRef } from 'react';
import SSEConnectionManager from '@/app/utils/test-utils/SSEConnectionManager';

interface StatusData {
    status?: string;
    progress?: string;
    results?: any;
    error?: string;
    runtime_seconds?: number;
}

/**
 * React hook for subscribing to SSE updates with optimized connection handling
 */
export function useSSE(projectId: string, testId: string | null) {
    const [status, setStatus] = useState<StatusData | null>(null);
    const [isConnected, setIsConnected] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    // Generate a stable listener ID for this component instance
    const listenerIdRef = useRef<string>(`listener-${Math.random().toString(36).substring(2, 9)}`);

    useEffect(() => {
        if (!projectId || !testId) {
            setIsConnected(false);
            return;
        }

        setIsConnected(true);

        // Use the singleton manager to subscribe
        const unsubscribe = SSEConnectionManager.subscribe(
            projectId,
            testId,
            listenerIdRef.current,
            (data: StatusData) => {
                setStatus(data);

                if (data.error) {
                    setError(data.error);
                } else {
                    setError(null);
                }

                // For terminal states, update connection status
                if (['completed', 'error', 'aborted', 'not_found'].includes(data.status || '')) {
                    setIsConnected(false);
                }
            }
        );

        // Clean up subscription when component unmounts or inputs change
        return () => {
            unsubscribe();
            setIsConnected(false);
        };
    }, [projectId, testId]);

    // Function to manually close the connection
    const closeConnection = () => {
        setIsConnected(false);
        // No need to directly close the source - the manager handles this
    };

    return {
        status,
        isConnected,
        error,
        closeConnection
    };
}

export default useSSE;