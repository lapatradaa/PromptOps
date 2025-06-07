// app/project/[id]/components/TestStatus/index.tsx
"use client";

import { useEffect } from "react";
import { toast } from "react-hot-toast";
import { useTestStatus } from "@/app/hooks/useTestStatus";

interface Props {
    projectId: string;
    testId: string | null;
}

export default function TestStatus({ projectId, testId }: Props) {
    const evt = useTestStatus(projectId, testId);

    useEffect(() => {
        console.log("[TestStatus] received evt:", evt);
        if (!evt) return;
        const key = "test-status";

        switch (evt.status) {
            case "initializing":
            case "queued":
            case "running":
                toast.loading(evt.progress || "Running test…", {
                    id: key,
                    duration: Infinity,
                });
                break;

            case "completed":
                toast.success("Test completed!", { id: key, duration: 4000 });
                break;

            case "error":
                toast.error(`Error: ${evt.error || "Unknown"}`, {
                    id: key,
                    duration: 8000,
                });
                break;

            case "aborted":
                toast("Test aborted", { id: key, icon: "⚠️", duration: 4000 });
                break;

            case "not_found":
                toast.error("Test not found", { id: key, duration: 4000 });
                break;

            default:
                toast(evt.progress || evt.status, { id: key, duration: 4000 });
        }
    }, [evt]);

    return null;
}
