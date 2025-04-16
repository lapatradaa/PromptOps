// @/app/project/[id]/components/ValidationStatusIndicator.tsx
import React from 'react';
import { FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import { BlockValidationResult } from '@/app/types';
import styles from './ValidationStatusIndicator.module.css';

interface ValidationStatusIndicatorProps {
    validationResult: BlockValidationResult;
    className?: string;
}

const ValidationStatusIndicator: React.FC<ValidationStatusIndicatorProps> = ({
    validationResult,
    className = ''
}) => {
    if (validationResult.isComplete) {
        return (
            <div className={`${styles.statusIndicator} ${styles.complete} ${className}`}>
                <FaCheckCircle className={styles.icon} />
                <span>Ready to run</span>
            </div>
        );
    }

    return (
        <div className={`${styles.statusIndicator} ${styles.incomplete} ${className}`}>
            <FaExclamationTriangle className={styles.icon} />
            <span>
                {validationResult.missingBlocks.length === 1
                    ? '1 block missing'
                    : `${validationResult.missingBlocks.length} blocks missing`}
            </span>
        </div>
    );
};

export default ValidationStatusIndicator;