import React from 'react';
import { FormState, SystemPromptType, MODEL_OPTIONS } from '@/app/types';
import styles from './NewProjectModal.module.css';

interface FormStepOneProps {
  formData: FormState;
  updateFormField: <K extends keyof FormState>(
    field: K,
    value: FormState[K]
  ) => void;
}

export const FormStepOne: React.FC<FormStepOneProps> = ({
  formData,
  updateFormField,
}) => {

  // Handle system prompt option change based on type
  const handleSystemPromptChange = (promptType: SystemPromptType) => {
    // Always preserve existing values to prevent undefined
    const basePrompt = {
      type: promptType,
      customPrompt: formData.systemPrompt.customPrompt || '',
      withContext: formData.systemPrompt.withContext || false
    };

    // Add type-specific fields
    if (promptType === 'custom') {
      updateFormField('systemPrompt', basePrompt);
    } else {
      // For default type, include defaultPrompt
      updateFormField('systemPrompt', {
        ...basePrompt,
        defaultPrompt: 'You will act like a question-answering system that answers the given question.'
      });
    }
  };

  // Handle LLM selection change
  const handleLlmChange = (selectedLlm: string) => {
    updateFormField('llm', selectedLlm);

    // Find the selected model's provider
    let modelProvider = '';

    for (const [_, models] of Object.entries(MODEL_OPTIONS)) {
      const selectedModel = models.find(model => model.value === selectedLlm);
      if (selectedModel && selectedModel.modelProvider) {
        modelProvider = selectedModel.modelProvider;
        break;
      }
    }

    // Update the modelProvider field
    updateFormField('modelProvider', modelProvider);
  };

  // Check if LLM is llama or custom to show URL input
  const showUrlInput = formData.modelProvider === 'llama' || formData.modelProvider === 'custom';

  // Render custom model name field when custom is selected
  const renderCustomModelField = () => {
    if (formData.llm !== 'custom') {
      return null;
    }

    return (
      <div className={styles.formSection}>
        <label htmlFor="customModelName">Custom Model Name</label>
        <input
          type="text"
          id="customModelName"
          value={formData.customModelName || ''}
          onChange={(e) => updateFormField('customModelName', e.target.value)}
          placeholder="Enter your custom model name (e.g., mathstral-7b-v0.1)"
          className={styles.input}
        />
      </div>
    );
  };

  // Ensure the custom prompt is never undefined
  const customPrompt = formData.systemPrompt.customPrompt || '';

  return (
    <div className={styles.inputGroup}>
      {/* Project Name */}
      <div className={styles.formSection}>
        <label htmlFor="projectName">Project Name</label>
        <input
          type="text"
          id="projectName"
          value={formData.projectName || ''}
          onChange={(e) => updateFormField('projectName', e.target.value)}
          placeholder="Your Project Name"
          className={styles.input}
        />
      </div>

      {/* Type */}
      <div className={styles.formSection}>
        <label htmlFor="type">Type</label>
        <div className={styles.radioGroupInline}>
          <div className={styles.radioLabelInline}>
            <input
              type="radio"
              id="qa"
              name="type"
              checked={formData.type === 'qa'}
              onChange={() => {
                updateFormField('type', 'qa');
                if (!['default', 'custom', 'withContext', 'withoutContext'].includes(formData.systemPrompt.type)) {
                  // Reset to default if current selection isn't valid for QA
                  handleSystemPromptChange('default');
                }
              }}
              className={styles.radioInputInline}
              required
            />
            <label htmlFor="qa">Q&A</label>
          </div>
          <div className={styles.radioLabelInline}>
            <input
              type="radio"
              id="sentiment"
              name="type"
              checked={formData.type === 'sentiment'}
              onChange={() => {
                updateFormField('type', 'sentiment');
                if (formData.systemPrompt.type !== 'custom' && formData.systemPrompt.type !== 'default') {
                  // Reset to default if current selection isn't valid for sentiment
                  handleSystemPromptChange('default');
                }
              }}
              className={styles.radioInputInline}
              required
            />
            <label htmlFor="sentiment">Sentiment</label>
          </div>
        </div>
      </div>

      {/* LLM */}
      <div className={styles.formSection}>
        <label htmlFor="llm">LLM</label>
        <select
          id="llm"
          value={formData.llm || ''}
          onChange={(e) => handleLlmChange(e.target.value)}
          className={`${styles.llmDropdown} ${!formData.llm && styles.placeholder}`}
        >
          <option value="" disabled>
            Select LLM
          </option>
          {Object.entries(MODEL_OPTIONS).map(([group, models]) => (
            <optgroup key={group} label={group}>
              {models.map((model) => (
                <option key={model.value} value={model.value}>
                  {model.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      {/* Custom Model Name (only when custom is selected) */}
      {renderCustomModelField()}

      {/* URL Input for Llama and Custom models */}
      {showUrlInput && (
        <div className={styles.formSection}>
          <label htmlFor="url">URL</label>
          <input
            type="text"
            id="url"
            value={formData.url || ''}
            onChange={(e) => updateFormField('url', e.target.value)}
            placeholder="Enter LLM URL (e.g., http://127.0.0.1:8000/v1/chat/completions)"
            className={styles.input}
          />
        </div>
      )}

      <div className={styles.formSection}>
        <label htmlFor="systemPrompt">System Prompt</label>
        <div className={styles.radioGroupColumn}>
          {/* Default option for both QA and Sentiment */}
          <div className={styles.radioWrapper}>
            <input
              type="radio"
              id="default"
              name="systemPrompt"
              checked={formData.systemPrompt.type === 'default'}
              onChange={() => handleSystemPromptChange('default')}
              className={styles.radioInputInline}
            />
            <label htmlFor="default" className={styles.radioLabel}>
              Default
            </label>
          </div>

          {/* Custom option for both QA and Sentiment */}
          <div className={styles.radioWrapper}>
            <input
              type="radio"
              id="custom"
              name="systemPrompt"
              checked={formData.systemPrompt.type === 'custom'}
              onChange={() => handleSystemPromptChange('custom')}
              className={styles.radioInputInline}
            />
            <label htmlFor="custom" className={styles.radioLabel}>
              Custom
            </label>
            <input
              placeholder="Your content"
              value={customPrompt}
              onChange={(e) => {
                const newCustomPrompt = e.target.value;
                updateFormField('systemPrompt', {
                  ...formData.systemPrompt,
                  customPrompt: newCustomPrompt
                });
              }}
              disabled={formData.systemPrompt.type !== 'custom'}
              className={`${styles.customInput} ${formData.systemPrompt.type !== 'custom' ? styles.disabled : ''}`}
            />
          </div>
        </div>
      </div>
    </div>
  );
};