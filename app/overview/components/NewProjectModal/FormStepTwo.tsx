import React, { useState } from 'react';
import { FormState } from '@/app/types';
import { isLlamaModelOrCustom } from './utils';
import styles from './NewProjectModal.module.css';
import { FiEye, FiEyeOff } from "react-icons/fi";

interface FormStepTwoProps {
    formData: FormState;
    updateFormField: <K extends keyof FormState>(field: K, value: FormState[K]) => void;
}

export const FormStepTwo: React.FC<FormStepTwoProps> = ({ formData, updateFormField }) => {
    const [showPassword, setShowPassword] = useState(false);

    if (isLlamaModelOrCustom(formData.llm)) return null;

    return (
        <div className={styles.inputGroup}>
            <label htmlFor="apiKey">API Key</label>
            <div className={styles.passwordContainer}>
                <input
                    type={showPassword ? "text" : "password"}
                    id="apiKey"
                    value={formData.apiKey}
                    onChange={(e) => updateFormField('apiKey', e.target.value)}
                    placeholder="Enter your API key"
                    className={styles.input}
                    autoFocus
                />
                <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={styles.eyeIcon}
                >
                    {showPassword ? <FiEyeOff size={20} /> : <FiEye size={20} />}
                </button>
            </div>
        </div>
    );
};