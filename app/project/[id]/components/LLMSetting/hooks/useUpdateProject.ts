import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { ProjectType, SystemPrompt } from '@/app/types';

export interface UpdateProjectParams {
    type: ProjectType;
    llm: string;
    apiKey: string | null;
    url: string | null;
    systemPrompt: SystemPrompt;
    modelProvider?: string;
}

interface UseUpdateProjectProps {
    projectId: string;
    onSuccess?: (updatedProject: any) => void;
    onTypeChange?: (type: ProjectType) => void;
}

export function useUpdateProject({
    projectId,
    onSuccess,
    onTypeChange
}: UseUpdateProjectProps) {
    const [isLoading, setIsLoading] = useState(false);

    const updateProject = async (data: UpdateProjectParams) => {
        setIsLoading(true);
        try {
            const response = await fetch(`/api/projects/${projectId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to update settings');
            }

            const updatedProject = await response.json();

            if (onSuccess) {
                onSuccess(updatedProject);
            }

            if (onTypeChange) {
                onTypeChange(updatedProject.type);
            }

            toast.success('Settings updated successfully');
            return updatedProject;
        } catch (error) {
            console.error('Error updating settings:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to update settings');
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    return {
        updateProject,
        isLoading
    };
}