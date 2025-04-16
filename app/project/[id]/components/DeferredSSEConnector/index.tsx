// @/app/project/[id]/components/DeferredSSEConnector.tsx
import React, { useEffect, useState, useRef } from 'react';
import ConnectionStatus, { StatusState } from '../ConnectionStatus';

interface DeferredSSEConnectorProps {
    projectId: string;
    testId: string;
    onStatusChange?: (status: StatusState) => void;
    active?: boolean;
}

/**
 * A component that manages the lifecycle of SSE connections
 * Only renders the ConnectionStatus component when needed and 
 * handles cleanup on terminal states
 */
const DeferredSSEConnector: React.FC<DeferredSSEConnectorProps> = ({
    projectId,
    testId,
    onStatusChange,
    active = true,
}) => {
    const [shouldRender, setShouldRender] = useState(false);
    const previousTestIdRef = useRef<string | null>(null);
    const connectionEstablishedRef = useRef<boolean>(false);
    const mountedRef = useRef<boolean>(false);

    // Track component lifecycle
    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    // Only render after a short delay to allow any state updates
    useEffect(() => {
        if (!mountedRef.current) return;

        // Reset if the test ID has changed
        if (testId !== previousTestIdRef.current) {
            previousTestIdRef.current = testId;
            connectionEstablishedRef.current = false;
        }

        if (active && testId && !connectionEstablishedRef.current) {
            const timer = setTimeout(() => {
                if (mountedRef.current) {
                    setShouldRender(true);
                }
            }, 500);

            return () => clearTimeout(timer);
        } else if (!active) {
            setShouldRender(false);
        }
    }, [testId, active]);

    const handleStatusChange = (status: StatusState) => {
        if (!mountedRef.current) return;

        if (status.type === 'connected') {
            connectionEstablishedRef.current = true;
        }

        if (onStatusChange) {
            onStatusChange(status);
        }

        // On terminal statuses, remove the connector after a brief delay.
        if (
            status.type === 'completed' ||
            status.type === 'error' ||
            status.type === 'aborted' ||
            status.type === 'not_found'
        ) {
            setTimeout(() => {
                if (mountedRef.current) {
                    setShouldRender(false);
                }
            }, 500);
        }
    };

    if (!shouldRender || !active || !testId) {
        return null;
    }

    return (
        <ConnectionStatus
            projectId={projectId}
            testId={testId}
            onStatusChange={handleStatusChange}
        />
    );
};

export default DeferredSSEConnector;