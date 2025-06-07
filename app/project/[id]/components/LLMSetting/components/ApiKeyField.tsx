// app/project/[id]/components/LLMSetting/components/ApiKeyField.tsx
import React from 'react';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import styles from '../LLMSetting.module.css';

interface ApiKeyFieldProps {
    value: string;
    onChange: (key: string) => void;
    showPassword: boolean;
    onToggleShowPassword: () => void;
}

const ApiKeyField: React.FC<ApiKeyFieldProps> = ({
    value,
    onChange,
    showPassword,
    onToggleShowPassword
}) => {
    return (
        <div className={styles.field}>
            <label className={styles.label}>API Key</label>
            <div className={styles.passwordContainer}>
                <input
                    type={showPassword ? "text" : "password"}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="Your API Key"
                    className={styles.textInput}
                />
                <button
                    type="button"
                    onClick={onToggleShowPassword}
                    className={styles.eyeIcon}
                >
                    {showPassword ? <FiEyeOff size={20} /> : <FiEye size={20} />}
                </button>
            </div>
        </div>
    );
};

export default ApiKeyField;