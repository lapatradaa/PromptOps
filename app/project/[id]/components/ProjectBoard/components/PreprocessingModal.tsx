import React from 'react';
import ReactDOM from 'react-dom';
import { HiSparkles } from 'react-icons/hi';
import styles from '../ProjectBoard.module.css';

interface PreprocessingModalProps {
    onConfirm: () => void;
    onCancel: () => void;
}

const PreprocessingModal: React.FC<PreprocessingModalProps> = ({
    onConfirm, onCancel
}) => (
    ReactDOM.createPortal(
        <div className={styles.popupOverlay}>
            <div className={styles.popupContent}>
                <div className={styles.svgContainer}>
                    <HiSparkles />
                </div>
                <h2>Preprocessing</h2>
                <p>Would you like to proceed with finding applicability of each perturbation?</p>
                <div style={{ marginTop: '2rem' }}>
                    <button onClick={onConfirm} className={styles.yesButton}>
                        Yes, Preprocess
                    </button>
                    <button onClick={onCancel} className={styles.cancelButton}>
                        Cancel
                    </button>
                </div>
            </div>
        </div>,
        document.body
    )
);

export default PreprocessingModal;