import React from 'react';
import { SystemPrompt, SystemPromptType } from '@/app/types';
import styles from '../LLMSetting.module.css';

interface SystemPromptSectionProps {
    content: SystemPrompt
    onPromptTypeChange: (type: SystemPromptType) => void;
    onCustomPromptChange: (content: string) => void;
}

const SystemPromptSection: React.FC<SystemPromptSectionProps> = ({
    content,
    onPromptTypeChange,
    onCustomPromptChange
}) => {
    const handleCustomPromptChange = (newPrompt: string) => {
        // First change the type to custom
        if (content.type !== 'custom') {
            onPromptTypeChange('custom');
        }

        // Then update the content
        onCustomPromptChange(newPrompt);
    };

    return (
        <div className={styles.field}>
            <label className={styles.label}>System Prompt</label>
            <div className={styles.radioGroup}>
                <label className={styles.radioLabel}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <input
                            type="radio"
                            name="SystemPrompt"
                            value="default"
                            checked={content.type === 'default'}
                            onChange={() => onPromptTypeChange('default')}
                            className={styles.radioInput}
                        />
                        <span className={styles.radioText}>Default</span>
                    </div>
                </label>
                <label className={styles.radioLabel}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <input
                            type="radio"
                            name="SystemPrompt"
                            value="custom"
                            checked={content.type === 'custom'}
                            onChange={() => onPromptTypeChange('custom')}
                            className={styles.radioInput}
                        />
                        <span className={styles.radioText}>Custom</span>
                    </div>
                    <input
                        type="text"
                        value={content.customPrompt || ''}
                        onChange={(e) => handleCustomPromptChange(e.target.value)}
                        onClick={() => {
                            if (content.type !== 'custom') {
                                onPromptTypeChange('custom');
                            }
                        }}
                        className={`${styles.textInput} ${content.type !== 'custom' && styles.disabled}`}
                        disabled={content.type !== 'custom'}
                        style={{ marginLeft: '30px', marginTop: '8px' }}
                        placeholder="Enter your custom system prompt here"
                    />
                </label>
            </div>
        </div>
    );
};

export default SystemPromptSection;