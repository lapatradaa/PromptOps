import React from 'react';
import { MODEL_OPTIONS } from '@/app/types';
import styles from '../LLMSetting.module.css';

interface ModelSelectionProps {
    value: string;
    onModelChange: (model: string) => void;
    customModelName?: string;
    onCustomModelNameChange?: (name: string) => void;
}

const ModelSelection: React.FC<ModelSelectionProps> = ({
    value,
    onModelChange,
    customModelName = '',
    onCustomModelNameChange
}) => {
    return (
        <>
            <div className={styles.field}>
                <label className={styles.label}>LLM</label>
                <select
                    value={value}
                    onChange={(e) => onModelChange(e.target.value)}
                    className={`${styles.select} ${!value && styles.placeholder}`}
                >
                    <option value="" disabled>Select LLM</option>
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

            {value === 'custom' && onCustomModelNameChange && (
                <div className={styles.field}>
                    <label className={styles.label}>Custom Model Name</label>
                    <input
                        type="text"
                        value={customModelName}
                        onChange={(e) => onCustomModelNameChange(e.target.value)}
                        placeholder="Enter custom model name (e.g., mathstral-7b-v0.1)"
                        className={styles.textInput}
                    />
                </div>
            )}
        </>
    );
};

export default ModelSelection;