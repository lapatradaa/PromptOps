// app/project/[id]/hooks/useProject.ts
import { useState, useEffect, useCallback } from 'react';
import { Project } from '@/app/types';

export const useProject = (projectId: string) => {
    const [project, setProject] = useState<Project | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchProject = useCallback(async () => {
        if (!projectId) return;
        try {
            setIsLoading(true);
            const response = await fetch(`/api/projects/${projectId}`);
            if (!response.ok) {
                throw new Error('Failed to fetch project');
            }
            const data = await response.json();
            setProject(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setIsLoading(false);
        }
    }, [projectId]);

    useEffect(() => {
        fetchProject();
    }, [fetchProject]);

    // Add mutate function to update project data
    const mutate = useCallback(async (newData?: Project) => {
        if (newData) {
            // If new data is provided, update immediately
            setProject(newData);
        } else {
            // If no data provided, refetch from the server
            await fetchProject();
        }
    }, [fetchProject]);

    return { project, isLoading, error, mutate };
};