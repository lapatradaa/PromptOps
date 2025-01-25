// app/project/[id]/hooks/useProject.ts
import { useState, useEffect } from 'react';
import { Project } from '@/app/types';

export const useProject = (projectId: string) => {
    const [project, setProject] = useState<Project | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchProject = async () => {
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
        };

        fetchProject();
    }, [projectId]);

    return { project, isLoading, error };
};