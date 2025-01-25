import React from 'react';
import { FormState } from './types';
import { isLlamaModel } from './utils';
import styles from './NewProjectModal.module.css';

interface FormStepTwoProps {
    formData: FormState;
    updateFormField: <K extends keyof FormState>(field: K, value: FormState[K]) => void;
}

export const FormStepTwo: React.FC<FormStepTwoProps> = ({ formData, updateFormField }) => {
    if (isLlamaModel(formData.llm)) return null;

    return (
        <div className={styles.inputGroup}>
            <label htmlFor="apiKey">API KEY</label>
            <input
                type="password"
                id="apiKey"
                value={formData.apiKey}
                onChange={(e) => updateFormField('apiKey', e.target.value)}
                placeholder="Enter your API key"
                className={styles.input}
                autoFocus
            />
        </div>
    );
};