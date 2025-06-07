// app/project/[id]/hooks/useTestClearOutput.ts
import { useEffect, useRef, useState } from 'react';
import { testEvents, TestEventPayload } from '@/app/utils/test-utils/test-events';

/**
 * Hook to clear output when a test starts
 * @param projectId The current project ID
 * @returns Object with isCleared flag to trigger UI updates
 */
export function useTestClearOutput(projectId: string) {
  const [isCleared, setIsCleared] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const unsubscribe = testEvents.subscribe('testStart', (data: TestEventPayload) => {
      if (data.projectId === projectId) {
        console.log(`[useTestClearOutput] Test started for project ${projectId}, clearing output`);
        setIsCleared(true);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => setIsCleared(false), 100);
      }
    });

    return () => {
      unsubscribe();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [projectId]);

  return { isCleared };
}

export default useTestClearOutput;
