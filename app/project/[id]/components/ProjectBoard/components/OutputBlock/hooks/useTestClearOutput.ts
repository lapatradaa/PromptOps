// @/app/project/[id]/hooks/useTestClearOutput.ts
import { useEffect, useRef, useState } from 'react';
import { testEvents, TestEventPayload } from '../../../../../hooks/useTestLLM';

/**
 * Hook to clear output when a test starts
 * @param projectId The current project ID
 * @returns Object with isCleared flag to trigger UI updates
 */
export function useTestClearOutput(projectId: string) {
  const [isCleared, setIsCleared] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    // Subscribe to test start events
    const unsubscribe = testEvents.subscribe('testStart', (data: TestEventPayload) => {
      // Type guard to narrow down the payload type
      if ('projectId' in data) {
        // Only respond to events for our project
        if (data.projectId === projectId) {
          console.log(`[useTestClearOutput] Test started for project ${projectId}, clearing output`);
          
          // Set cleared flag to trigger UI updates
          setIsCleared(true);
          
          // Reset the cleared flag after a delay (allows components to react)
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }
          
          timeoutRef.current = setTimeout(() => {
            setIsCleared(false);
          }, 100);
        }
      }
    });
    
    // Clean up subscription and any pending timeouts
    return () => {
      unsubscribe();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [projectId]);
  
  return { isCleared };
}

export default useTestClearOutput;