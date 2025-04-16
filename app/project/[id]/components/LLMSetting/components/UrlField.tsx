import React from 'react';
import styles from '../LLMSetting.module.css';

interface UrlFieldProps {
    value: string;
    onChange: (url: string) => void;
}

const UrlField: React.FC<UrlFieldProps> = ({ value, onChange }) => {
    return (
        <div className={styles.field}>
            <label className={styles.label}>URL</label>
            <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder="Enter LLM URL (e.g., http://127.0.0.1:8000/v1/chat/completions)"
                className={styles.textInput}
            />
        </div>
    );
};

export default UrlField;