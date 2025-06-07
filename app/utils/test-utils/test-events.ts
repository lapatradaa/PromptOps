// @/app/utils/test-utils/test-events.ts

// Define event types and payload interfaces
export type TestEventType = 'testStart' | 'testComplete' | 'testError';

export interface TestStartPayload { projectId: string; timestamp?: number; }
export interface TestCompletePayload { projectId: string; testId: string; results?: any; }
export interface TestErrorPayload { projectId: string; error: string; }
export type TestEventPayload = TestStartPayload | TestCompletePayload | TestErrorPayload;
export type TestEventCallback = (data: TestEventPayload) => void;

// Simple event system for test lifecycle events
const listeners = new Map<TestEventType, Set<TestEventCallback>>();

/**
 * Subscribe to a test event.
 * @returns a function to unsubscribe
 */
export function subscribeTestEvent(
    eventType: TestEventType,
    callback: TestEventCallback
): () => void {
    if (!listeners.has(eventType)) {
        listeners.set(eventType, new Set());
    }
    listeners.get(eventType)!.add(callback);
    return () => {
        listeners.get(eventType)!.delete(callback);
    };
}

/**
 * Emit a test event to all listeners.
 */
export function emitTestEvent(eventType: TestEventType, data: TestEventPayload) {
    const callbacks = listeners.get(eventType);
    if (callbacks) {
        callbacks.forEach(cb => {
            try {
                cb(data);
            } catch (err) {
                console.error(`Error in test event callback for ${eventType}:`, err);
            }
        });
    }
}

// Pre-defined event emitter object for convenience
export const testEvents = {
    subscribe: subscribeTestEvent,
    emit: emitTestEvent
};
