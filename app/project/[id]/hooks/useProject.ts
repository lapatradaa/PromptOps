// app/project/[id]/hooks/useProject.ts

import { useState, useEffect, useCallback } from 'react';
import { Project } from '@/app/types';

export const useProject = (projectId: string) => {
    const [project, setProject] = useState<Project | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch the project fresh from the server
    const fetchProject = useCallback(async () => {
        if (!projectId) return;
        try {
            setIsLoading(true);
            const res = await fetch(`/api/projects/${projectId}`);
            if (!res.ok) throw new Error('Failed to fetch project');
            const data: Project = await res.json();
            setProject(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred');
        } finally {
            setIsLoading(false);
        }
    }, [projectId]);

    useEffect(() => {
        fetchProject();
    }, [fetchProject]);

    /**
     * mutate(newData?): 
     *  • if newData is provided, merge it into the existing `project` state
     *    (so that fields you didn’t return from PATCH aren’t wiped out).
     *  • if no args, just re‐fetch the project.
     */
    const mutate = useCallback(
        async (newData?: Partial<Project>) => {
            if (newData) {
                setProject(prev =>
                    prev
                        ? { ...prev, ...newData }
                        : (newData as Project)
                );
            } else {
                await fetchProject();
            }
        },
        [fetchProject]
    );

    return { project, isLoading, error, mutate };
};
