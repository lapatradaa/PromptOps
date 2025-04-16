import React, { useState, useCallback } from 'react';

import { NewProjectModalProps, FormState, INITIAL_FORM_STATE } from '@/app/types';
import { FormStepOne } from './FormStepOne';
import { FormStepTwo } from './FormStepTwo';
import { getSelectedModelLabel, isLlamaModelOrCustom, isNextButtonDisabled, isCreateButtonDisabled } from './utils';

import styles from './NewProjectModal.module.css';

import { TiChevronRight } from 'react-icons/ti';

const NewProjectModal: React.FC<NewProjectModalProps> = ({ isOpen, onClose, onSubmit, userId }) => {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState<FormState>(INITIAL_FORM_STATE);
    const [previousStates, setPreviousStates] = useState<FormState[]>([]);

    const updateFormField = useCallback(<K extends keyof FormState>(field: K, value: FormState[K]) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    }, []);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Determine the model value to send
        const modelValue = (formData.llm === 'custom' && formData.customModelName)
            ? formData.customModelName
            : formData.llm;

        // Setup final system prompt
        let finalSystemPrompt = { ...formData.systemPrompt };

        if (formData.systemPrompt.type === 'custom') {
            // For custom, include prompt field
            finalSystemPrompt.customPrompt = formData.systemPrompt.customPrompt;
        } else {
            // For default, include defaultPrompt
            finalSystemPrompt.defaultPrompt = 'You will act like a question-answering system that answers the given question.';
        }

        // Make sure withContext is set properly for QA projects
        if (formData.type === 'qa' && finalSystemPrompt.withContext === undefined) {
            finalSystemPrompt.withContext = true; // Default to true if undefined
        }

        // Make sure URL is never empty for Llama/custom models
        const finalUrl = (isLlamaModelOrCustom(formData.llm) && !formData.url)
            ? "http://localhost:8000/v1" // Provide fallback URL if empty
            : formData.url || "";

        onSubmit(
            formData.projectName,
            formData.type,
            modelValue,
            finalUrl,
            isLlamaModelOrCustom(formData.llm) ? '' : formData.apiKey,
            finalSystemPrompt,
            formData.systemPrompt.customPrompt as string,
            formData.modelProvider || '',
        );

        resetForm();
    };

    const resetForm = () => {
        setFormData(INITIAL_FORM_STATE);
        setPreviousStates([]);
        setStep(1);
        onClose();
    };

    const handleNext = () => {
        if (!isNextButtonDisabled(formData)) {
            // If it's a Llama model, handle submission here
            if (isLlamaModelOrCustom(formData.llm)) {
                // Make sure URL is set
                if (!formData.url) {
                    alert("Please enter a URL for the Llama model");
                    return;
                }
                // Create a synthetic event object that satisfies React.FormEvent
                const syntheticEvent = { preventDefault: () => { } } as React.FormEvent;
                handleSubmit(syntheticEvent);
            } else {
                setPreviousStates(prev => [...prev, { ...formData }]);
                setStep(2);
            }
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

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modal}>
                <div className={styles.breadcrumb}>
                    <span className={styles.activeCrumb}>Create new project</span>
                    <TiChevronRight className={styles.chevron} />
                    <span className={formData.llm ? styles.activeCrumb : styles.crumb}>
                        {getSelectedModelLabel(formData)}
                    </span>
                </div>

                <div className={styles.divider} />

                <form onSubmit={handleSubmit}>
                    {step === 1 ? (
                        <FormStepOne
                            formData={formData}
                            updateFormField={updateFormField}
                        />
                    ) : (
                        <FormStepTwo
                            formData={formData}
                            updateFormField={updateFormField}
                        />
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
                                    disabled={isNextButtonDisabled(formData)}
                                >
                                    {isLlamaModelOrCustom(formData.llm) ? 'Create Project' : 'Next >'}
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
                                    disabled={isCreateButtonDisabled(formData)}
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