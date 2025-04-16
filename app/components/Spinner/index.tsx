// @/app/components/Spinner/index.tsx
'use client';

import React from 'react';
import styles from './Spinner.module.css';

interface SpinnerProps {
    size?: 'small' | 'medium' | 'large';
    inline?: boolean;
    text?: string;
}

const Spinner: React.FC<SpinnerProps> = ({
    size = 'medium',
    inline = false,
    text
}) => {
    const sizeClass = styles[size];

    const spinner = (
        <div className={`${styles.spinnerCircle} ${sizeClass}`}></div>
    );

    if (inline) {
        return (
            <div className={styles.inlineSpinner}>
                {spinner}
                {text && <span className={styles.spinnerText}>{text}</span>}
            </div>
        );
    }

    return (
        <div className={styles.spinnerContainer}>
            <div className={styles.spinner}>
                {spinner}
                {text && <div className={styles.spinnerText}>{text}</div>}
            </div>
        </div>
    );
};

export default Spinner;