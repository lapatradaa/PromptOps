// app/project/[id]/components/LLMSetting/hooks/useLLMSettingsForm.ts
import { useState } from 'react';
import { ProjectType, SystemPrompt } from '@/app/types';
import { isLlamaModelOrCustom } from '@/app/overview/components/NewProjectModal/utils';
import { getModelProviderFromLLM } from '../utils/modelHelpers';

export interface LLMFormData {
  projectType: ProjectType;
  llm: string;
  systemPrompt: SystemPrompt;
  apiKey: string;
  url: string;
  modelProvider?: string;
  customModelName?: string;
}

const initialFormState: LLMFormData = {
  projectType: 'qa',
  llm: '',
  systemPrompt: {
    type: 'default',
    withContext: false,
    defaultPrompt: '',
    customPrompt: ''
  },
  apiKey: '',
  url: '',
  modelProvider: '',
  customModelName: ''
};

export interface UseLLMSettingsFormProps {
  initialData?: Partial<LLMFormData>;
}

export function useLLMSettingsForm({ initialData = {} }: UseLLMSettingsFormProps = {}) {
  const [formData, setFormData] = useState<LLMFormData>({
    ...initialFormState,
    ...initialData
  });
  const [showPassword, setShowPassword] = useState(false);

  const updateField = <K extends keyof LLMFormData>(
    field: K,
    value: LLMFormData[K]
  ) => {
    setFormData(prev => {
      // Create updated state
      const updatedState = {
        ...prev,
        [field]: value,
      };

      // Handle special case when project type changes
      if (field === 'projectType') {
        updatedState.systemPrompt = {
          type: 'default',
          withContext: false,
          defaultPrompt: '',
          customPrompt: '',
        };
      }

      return updatedState;
    });
  };

  // Update model provider when LLM changes
  const handleLLMChange = (selectedLlm: string) => {
    updateField('llm', selectedLlm);
    const modelProvider = getModelProviderFromLLM(selectedLlm);
    updateField('modelProvider', modelProvider);
    // Clear customModelName if not custom
    if (selectedLlm !== 'custom') {
      updateField('customModelName', '');
    }
  };

  const isFormValid = () => {
    const isLlamaOrCustom = isLlamaModelOrCustom(formData.llm);
    const isCustomWithNoName = formData.llm === 'custom' && !formData.customModelName;
    return !!formData.llm &&
      !!formData.projectType &&
      !isCustomWithNoName &&
      !(isLlamaOrCustom && !formData.url) &&
      !(!isLlamaOrCustom && !formData.apiKey);
  };

  // Prepare data for API submission
  const getSubmissionData = () => {
    // Determine the actual model value to send
    const modelValue = (formData.llm === 'custom' && formData.customModelName)
      ? formData.customModelName
      : formData.llm;

    const systemPrompt = formData.systemPrompt.type === 'custom'
      ? {
        ...formData.systemPrompt,
        customPrompt: formData.systemPrompt.customPrompt
      }
      : {
        ...formData.systemPrompt,
        customPrompt: '' // Clear custom content when using default type
      };

    return {
      type: formData.projectType,
      llm: modelValue,
      apiKey: formData.apiKey || null,
      url: formData.url || null,
      systemPrompt,
      modelProvider: formData.modelProvider
    };
  };

  return {
    formData,
    updateField,
    handleLLMChange,
    showPassword,
    setShowPassword,
    isFormValid,
    getSubmissionData
  };
}