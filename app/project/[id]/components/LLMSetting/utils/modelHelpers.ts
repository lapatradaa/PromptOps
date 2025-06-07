// app/project/[id]/components/LLMSetting/utils/modelHelpers.ts
/**
 * Get the model provider based on LLM name
 */
export function getModelProviderFromLLM(llm: string): string {
    if (llm.startsWith('gpt')) return 'openai';
    if (llm.startsWith('gemini')) return 'gemini';
    if (llm.startsWith('claude')) return 'claude';
    if (llm.startsWith('llama')) return 'llama';
    if (llm.startsWith('typhoon')) return 'typhoon';
    if (llm === 'custom') return 'custom';
    return '';
}

/**
 * Maps a project data from API to form data structure
 */
export function mapProjectToFormData(project: any): Record<string, any> | null {
    if (!project) return null;
    
    // Determine if this is a custom model
    const isCustomModel = project.modelProvider === 'custom';

    return {
        projectType: project.type,
        // For custom models, set llm to 'custom' to select the custom option
        llm: isCustomModel ? 'custom' : project.llm,
        systemPrompt: {
            type: project.systemPrompt.type || 'default',
            withContext: !!project.systemPrompt.withContext,
            defaultPrompt: project.systemPrompt.defaultPrompt || '',
            customPrompt: project.systemPrompt.customPrompt || ''
        },
        apiKey: project.apiKey || '',
        url: project.url || '',
        modelProvider: project.modelProvider || '',
        // Store the actual model name for custom models
        customModelName: isCustomModel ? project.llm : ''
    };
}