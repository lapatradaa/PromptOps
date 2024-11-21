import React, { useState } from 'react';
import { TiChevronRight } from 'react-icons/ti';

import styles from './NewProjectModal.module.css';

interface NewProjectModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (projectName: string, llm: string, apiKey: string, systemContent: SystemContent) => void;
}

interface SystemContent {
    type: 'qa' | 'none' | 'custom';
    content?: string;
}

interface FormState {
    projectName: string;
    llm: string;
    apiKey: string;
    systemContent: SystemContent;
    customContent: string;
}

const INITIAL_FORM_STATE: FormState = {
    projectName: '',
    llm: '',
    apiKey: '',
    systemContent: { type: 'none' },
    customContent: ''
};

const MODEL_OPTIONS = {
    Gemini: [
        { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
        { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
        { value: 'gemini-1.0-pro', label: 'Gemini 1.0 Pro' }
    ],
    GPT: [
        { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
        { value: 'gpt-4', label: 'GPT-4' },
        { value: 'gpt-4o', label: 'GPT-4o' },
        { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' }
    ],
    Claude: [
        { value: 'claude', label: 'Claude' }
    ],
    Llama: [
        { value: 'llama-3.2-3b', label: 'Llama 3.2 3B' }
    ],
    Other: [
        { value: 'custom', label: 'Custom Model' }
    ]
};

const NewProjectModal: React.FC<NewProjectModalProps> = ({ isOpen, onClose, onSubmit }) => {

    if (!isOpen) return null;

    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState<FormState>(INITIAL_FORM_STATE);
    const [previousStates, setPreviousStates] = useState<FormState[]>([]);

    const updateFormField = <K extends keyof FormState>(field: K, value: FormState[K]) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const finalSystemContent = formData.systemContent.type === 'custom'
            ? { ...formData.systemContent, content: formData.customContent }
            : formData.systemContent;

        onSubmit(
            formData.projectName,
            formData.llm,
            isLlamaModel(formData.llm) ? '' : formData.apiKey,
            finalSystemContent
        );

        setFormData(INITIAL_FORM_STATE);
        setPreviousStates([]);
        setStep(1);
        onClose();
    };

    const handleNext = () => {
        const isValidToProgress = formData.projectName &&
            formData.llm &&
            (formData.systemContent.type !== 'custom' ||
                (formData.systemContent.type === 'custom' && formData.customContent));

        if (isValidToProgress) {
            setPreviousStates(prev => [...prev, { ...formData }]);
            setStep(2);
        }
    };

    const handleBack = () => {
        if (step > 1) {
            const previousState = previousStates[previousStates.length - 1];
            setFormData(previousState || INITIAL_FORM_STATE);
            setPreviousStates(prev => prev.slice(0, -1));
            setStep(step - 1);
        } else {
            onClose();
        }
    };

    const isLlamaModel = (model: string) => {
        return model.toLowerCase().includes('llama');
    };

    const isNextButtonDisabled = () => {
        const basicValidation = !formData.projectName || !formData.llm;
        const customContentValidation = formData.systemContent.type === 'custom' && !formData.customContent;
        return basicValidation || customContentValidation;
    };

    const isCreateButtonDisabled = () => {
        if (isLlamaModel(formData.llm)) {
            return false; // No API key required for Llama models
        }
        return !formData.apiKey; // API key required for other models
    };

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modal}>
                <div className={styles.breadcrumb}>
                    <span className={styles.activeCrumb}>Create new project</span>
                    <TiChevronRight className={styles.chevron} />
                    <span className={formData.llm ? styles.activeCrumb : styles.crumb}>
                        {formData.llm ? MODEL_OPTIONS[Object.keys(MODEL_OPTIONS).find(group =>
                            MODEL_OPTIONS[group as keyof typeof MODEL_OPTIONS].some(model => model.value === formData.llm)
                        ) as keyof typeof MODEL_OPTIONS].find(model => model.value === formData.llm)?.label : "Select Model"}
                    </span>
                </div>

                <div style={{ width: '100%', height: '100%', border: '1px #9F9DB0 solid' }}></div>

                <form onSubmit={handleSubmit}>
                    {step === 1 ? (
                        <div className={styles.inputGroup}>
                            <label htmlFor="projectName">PROJECT NAME</label>
                            <input
                                type="text"
                                id="projectName"
                                value={formData.projectName}
                                onChange={(e) => updateFormField('projectName', e.target.value)}
                                placeholder="Project Name"
                                className={styles.input}
                                autoFocus
                            />

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
                                        {models.map(model => (
                                            <option key={model.value} value={model.value}>
                                                {model.label}
                                            </option>
                                        ))}
                                    </optgroup>
                                ))}
                            </select>

                            <label htmlFor="systemContent">SYSTEM CONTENT</label>
                            <div className={styles.radioGroup}>
                                <div className={styles.radioWrapper}>
                                    <input
                                        type="radio"
                                        id="qa"
                                        name="systemContent"
                                        checked={formData.systemContent.type === 'qa'}
                                        onChange={() => updateFormField('systemContent', { type: 'qa' })}
                                        className={styles.radioInput}
                                    />
                                    <label htmlFor="qa" className={styles.radioLabel}>
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
                                        className={styles.radioInput}
                                    />
                                    <label htmlFor="none" className={styles.radioLabel}>
                                        Not Selected
                                    </label>
                                </div>

                                <div className={styles.radioOptionWithInput}>
                                    <div className={styles.radioWrapper}>
                                        <input
                                            type="radio"
                                            id="custom"
                                            name="systemContent"
                                            checked={formData.systemContent.type === 'custom'}
                                            onChange={() => updateFormField('systemContent', { type: 'custom' })}
                                            className={styles.radioInput}
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
                        </div>
                    ) : (
                        <>
                            {!isLlamaModel(formData.llm) && (
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
                            )}
                        </>
                    )}

                    <div className={styles.buttonGroup}>
                        {step === 1 ? (
                            <>
                                <button type="button" onClick={onClose} className={styles.cancelBtn}>
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleNext}
                                    className={styles.nxtBtn}
                                    disabled={isNextButtonDisabled()}
                                >
                                    {isLlamaModel(formData.llm) ? 'Create Project' : 'Next >'}
                                </button>
                            </>
                        ) : (
                            <>
                                <button
                                    type="button"
                                    onClick={handleBack}
                                    className={styles.cancelBtn}
                                >
                                    Back
                                </button>
                                <button
                                    type="submit"
                                    className={styles.nxtBtn}
                                    disabled={isCreateButtonDisabled()}
                                >
                                    Create Project
                                </button>
                            </>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
};

export default NewProjectModal;