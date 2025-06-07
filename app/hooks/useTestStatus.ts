// app/hooks/useTestStatus.ts
import { useState, useEffect } from "react";

export interface TestStatusEvent {
    status: string;
    progress?: string;
    error?: string;
    results?: any;
    runtime_seconds?: number;
}

export function useTestStatus(
    projectId: string | null,
    testId: string | null
): TestStatusEvent | null {
    const [evt, setEvt] = useState<TestStatusEvent | null>(null);

    // Whenever we start listening to a new testId, clear out any old event
    useEffect(() => {
        setEvt(null);
    }, [projectId, testId]);

    useEffect(() => {
        if (!projectId || !testId) {
            return;
        }

        const url = `/api/projects/${projectId}/sse-status/${encodeURIComponent(
            testId
        )}`;
        console.log("[SSE] opening EventSource to", url);

        const es = new EventSource(url, { withCredentials: true });

        es.addEventListener("status", (e: MessageEvent) => {
            console.log("[SSE] raw event data:", e.data);
            try {
                const parsed = JSON.parse(e.data) as TestStatusEvent;
                console.log("[SSE] parsed event:", parsed);
                setEvt(parsed);
            } catch (err) {
                console.error("[SSE] malformed JSON:", err, e.data);
            }
        });

        es.onerror = (err) => {
            console.error("[SSE] error", err);
            es.close();
        };

        return () => {
            console.log("[SSE] closing EventSource");
            es.close();
        };
    }, [projectId, testId]);

    return evt;
}
