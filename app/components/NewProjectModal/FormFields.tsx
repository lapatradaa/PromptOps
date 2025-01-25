import React from 'react';
import { FormState } from './types';
import { MODEL_OPTIONS } from './constants';
import styles from './NewProjectModal.module.css';

interface FormFieldsProps {
    formData: FormState;
    updateFormField: <K extends keyof FormState>(field: K, value: FormState[K]) => void;
}

export const ProjectNameField: React.FC<FormFieldsProps> = ({ formData, updateFormField }) => (
    <div className={styles.formSection}>
        <label htmlFor="projectName">PROJECT'S NAME</label>
        <input
            type="text"
            id="projectName"
            value={formData.projectName}
            onChange={(e) => updateFormField('projectName', e.target.value)}
            placeholder="Your Project's Name"
            className={styles.input}
        />
    </div>
);

export const TypeField: React.FC<FormFieldsProps> = ({ formData, updateFormField }) => (
    <div className={styles.formSection}>
        <label htmlFor="type">TYPE</label>
        <div className={styles.radioGroupInline}>
            <div className={styles.radioLabelInline}>
                <input
                    type="radio"
                    id="qa"
                    name="type"
                    checked={formData.type === 'qa'}
                    onChange={() => updateFormField('type', 'qa')}
                    className={styles.radioInputInline}
                />
                <label htmlFor="qa">Q&A</label>
            </div>
            <div className={styles.radioLabelInline}>
                <input
                    type="radio"
                    id="sentiment"
                    name="type"
                    checked={formData.type === 'sentiment'}
                    onChange={() => updateFormField('type', 'sentiment')}
                    className={styles.radioInputInline}
                />
                <label htmlFor="sentiment">Sentiment</label>
            </div>
        </div>
    </div>
);

export const LLMField: React.FC<FormFieldsProps> = ({ formData, updateFormField }) => (
    <div className={styles.formSection}>
        <label htmlFor="llm">LLM</label>
        <select
            id="llm"
            value={formData.llm}
            onChange={(e) => updateFormField('llm', e.target.value)}
            className={`${styles.llmDropdown} ${!formData.llm && styles.placeholder}`}
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
);

export const SystemContentField: React.FC<FormFieldsProps> = ({ formData, updateFormField }) => (
    <div className={styles.formSection}>
        <label htmlFor="systemContent">SYSTEM CONTENT</label>
        <div className={styles.radioGroupColumn}>
            <div className={styles.radioWrapper}>
                <input
                    type="radio"
                    id="qa-content"
                    name="systemContent"
                    checked={formData.systemContent.type === 'qa'}
                    onChange={() => updateFormField('systemContent', { type: 'qa' })}
                    className={styles.radioInputInline}
                />
                <label htmlFor="qa-content" className={styles.radioLabel}>
                    You will be acted like a Question Answering system
                </label>
            </div>

            <div className={styles.radioWrapper}>
                <input
                    type="radio"
                    id="none"
                    name="systemContent"
                    checked={formData.systemContent.type === 'none'}
                    onChange={() => updateFormField('systemContent', { type: 'none' })}
                    className={styles.radioInputInline}
                />
                <label htmlFor="none" className={styles.radioLabel}>
                    Not selected
                </label>
            </div>

            <div className={styles.radioWrapper}>
                <input
                    type="radio"
                    id="custom"
                    name="systemContent"
                    checked={formData.systemContent.type === 'custom'}
                    onChange={() => updateFormField('systemContent', { type: 'custom' })}
                    className={styles.radioInputInline}
                />
                <label htmlFor="custom" className={styles.radioLabel}>
                    Other
                </label>
                <input
                    placeholder="Your content"
                    value={formData.customContent}
                    onChange={(e) => updateFormField('customContent', e.target.value)}
                    disabled={formData.systemContent.type !== 'custom'}
                    className={`${styles.customInput} ${formData.systemContent.type !== 'custom' ? styles.disabled : ''}`}
                />
            </div>
        </div>
    </div>
);

export const ApiKeyField: React.FC<FormFieldsProps> = ({ formData, updateFormField }) => (
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