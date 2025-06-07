// app/project/[id]/components/LLMSetting/index.tsx
'use client';
import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { ProjectType } from '@/app/types';
import { isLlamaModelOrCustom } from '@/app/overview/components/NewProjectModal/utils';
import { useProject } from '@/app/project/[id]/hooks/useProject';
import Spinner from '@/app/components/Spinner';
import styles from './LLMSetting.module.css';

// Hooks
import { useLLMSettingsForm } from './hooks/useLLMSettingsForm';
import { useUpdateProject } from './hooks/useUpdateProject';
import { mapProjectToFormData } from './utils/modelHelpers';

// Components
import ProjectTypeSelection from './components/ProjectTypeSelection';
import ModelSelection from './components/ModelSelection';
// import UrlField from './components/UrlField';
import SystemPromptSection from './components/SystemPromptSection';
import ApiKeyField from './components/ApiKeyField';

interface LLMSettingContainerProps {
    onProjectTypeChange?: (type: ProjectType) => void;
}

const LLMSettingContainer: React.FC<LLMSettingContainerProps> = ({ onProjectTypeChange }) => {
    const params = useParams();
    const projectId = params.id as string;
    const { project, isLoading: projectLoading, mutate } = useProject(projectId);

    const {
        formData,
        updateField,
        handleLLMChange,
        showPassword,
        setShowPassword,
        isFormValid,
        getSubmissionData
    } = useLLMSettingsForm();

    const { updateProject, isLoading: updateLoading } = useUpdateProject({
        projectId,
        onSuccess: mutate,
        onTypeChange: onProjectTypeChange
    });

    // Initialize form data when project loads
    useEffect(() => {
        if (project) {
            const initialData = mapProjectToFormData(project);
            if (initialData) {
                Object.entries(initialData).forEach(([key, value]) => {
                    // Only update if key is a valid field name in our form
                    if (key in formData) {
                        updateField(key as keyof typeof formData, value);
                    }
                });
            }
        }
    }, [project]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const data = getSubmissionData();
        await updateProject(data);
    };

    if (projectLoading) {
        return <Spinner size="large" />;
    }

    return (
        <div className={styles.wrapper}>
            <div className={styles.container}>
                <form onSubmit={handleSubmit} className={styles.form}>
                    <h1 className={styles.title}>LLM Setting</h1>

                    {/* Project Type */}
                    <ProjectTypeSelection
                        value={formData.projectType}
                        onChange={(type) => updateField('projectType', type)}
                    />

                    {/* Model Selection */}
                    <ModelSelection
                        value={formData.llm}
                        onModelChange={handleLLMChange}
                        customModelName={formData.customModelName}
                        onCustomModelNameChange={(name) => updateField('customModelName', name)}
                    />

                    {/* URL Field - Only shown for Llama and custom models */}
                    {/* {isLlamaModelOrCustom(formData.llm) && (
                        <UrlField
                            value={formData.url}
                            onChange={(url) => updateField('url', url)}
                        />
                    )} */}

                    {/* System Prompt */}
                    <SystemPromptSection
                        content={formData.systemPrompt}
                        onPromptTypeChange={(type) => updateField('systemPrompt', {
                            ...formData.systemPrompt,
                            type,
                            // Clear custom content when switching to default
                            customPrompt: type === 'default' ? '' : formData.systemPrompt.customPrompt
                        })}
                        onCustomPromptChange={(customPrompt) => updateField('systemPrompt', {
                            ...formData.systemPrompt,
                            customPrompt
                            // No need to update type here as it's handled in systemPromptSection
                        })}
                    />

                    {/* API Key - Only shown for non-Llama models */}
                    {!isLlamaModelOrCustom(formData.llm) && (
                        <ApiKeyField
                            value={formData.apiKey}
                            onChange={(key) => updateField('apiKey', key)}
                            showPassword={showPassword}
                            onToggleShowPassword={() => setShowPassword(!showPassword)}
                        />
                    )}

                    {/* Submit Button */}
                    <button
                        type="submit"
                        className={`${styles.button} ${updateLoading ? styles.buttonUpdating : ''}`}
                        disabled={!isFormValid() || updateLoading}
                    >
                        {updateLoading ? (
                            <Spinner inline size="small" text="Updating..." />
                        ) : 'Apply'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default LLMSettingContainer;