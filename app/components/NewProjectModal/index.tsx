import React, { useState, useCallback } from 'react';

import { NewProjectModalProps, FormState } from './types';
import { INITIAL_FORM_STATE } from './constants';
import { FormStepOne } from './FormStepOne';
import { FormStepTwo } from './FormStepTwo';
import { getSelectedModelLabel, isLlamaModel, isNextButtonDisabled, isCreateButtonDisabled } from './utils';

import styles from './NewProjectModal.module.css';

import { TiChevronRight } from 'react-icons/ti';

const NewProjectModal: React.FC<NewProjectModalProps> = ({ isOpen, onClose, onSubmit }) => {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState<FormState>(INITIAL_FORM_STATE);
    const [previousStates, setPreviousStates] = useState<FormState[]>([]);

    const updateFormField = useCallback(<K extends keyof FormState>(field: K, value: FormState[K]) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    }, []);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const finalSystemContent = formData.systemContent.type === 'custom'
            ? { ...formData.systemContent, content: formData.customContent }
            : formData.systemContent;

        onSubmit(
            formData.projectName,
            formData.type,
            formData.llm,
            isLlamaModel(formData.llm) ? '' : formData.apiKey,
            finalSystemContent
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