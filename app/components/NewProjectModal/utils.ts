import { MODEL_OPTIONS } from './constants';
import { FormState } from './types';

export const isLlamaModel = (model: string) => {
    return model.toLowerCase().includes('llama');
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
    const customContentValidation = formData.systemContent.type === 'custom' && !formData.customContent;
    return basicValidation || customContentValidation;
};

export const isCreateButtonDisabled = (formData: FormState) => {
    if (isLlamaModel(formData.llm)) return false;
    return !formData.apiKey;
};