import { FormState, MODEL_OPTIONS } from '@/app/types';

export const isLlamaModelOrCustom = (model: string) => {
    return model.toLowerCase().includes('llama') || model.toLowerCase().includes('custom');
};

export const getSelectedModelLabel = (formData: FormState) => {
    if (!formData.llm) return "Select Model";
    const modelGroup = Object.entries(MODEL_OPTIONS).find(([_, models]) =>
        models.some(model => model.value === formData.llm)
    );
    if (!modelGroup) return "Select Model";
    const model = MODEL_OPTIONS[modelGroup[0] as keyof typeof MODEL_OPTIONS]
        .find(model => model.value === formData.llm);
    return model?.label || "Select Model";
};

export const isNextButtonDisabled = (formData: FormState) => {
    const basicValidation = !formData.projectName || !formData.llm;
    const customContentValidation = formData.systemPrompt.type === 'custom' && !formData.systemPrompt.customPrompt;

    // Add URL validation for Llama or custom models
    const urlValidation = isLlamaModelOrCustom(formData.llm) && !formData.url;

    return basicValidation || customContentValidation || urlValidation;
};

export const isCreateButtonDisabled = (formData: FormState) => {
    if (isLlamaModelOrCustom(formData.llm)) {
        // For Llama/custom models, require URL
        return !formData.url;
    }
    return !formData.apiKey;
};