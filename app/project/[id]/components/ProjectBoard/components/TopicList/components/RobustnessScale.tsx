import React, { useState } from 'react';
import styles from './RobustnessScale.module.css';

interface RobustnessScaleProps {
    onChange: (value: number) => void;
    initialValue?: number;
}

const RobustnessScale: React.FC<RobustnessScaleProps> = ({
    onChange,
    initialValue = 10
}) => {
    const [percentage, setPercentage] = useState(initialValue);

    const increment = () => {
        const newValue = Math.min(percentage + 5, 100);
        setPercentage(newValue);
        onChange(newValue);
    };

    const decrement = () => {
        const newValue = Math.max(percentage - 5, 10);
        setPercentage(newValue);
        onChange(newValue);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const inputValue = e.target.value.replace(/[^0-9]/g, '');
        let value = parseInt(inputValue, 10);

        if (inputValue === '' || isNaN(value)) {
            setPercentage(10);
            onChange(10);
            return;
        }

        value = Math.max(10, Math.min(100, value));

        setPercentage(value);
        onChange(value);
    };

    return (
        <div className={styles.scaleContainer}>
            <div className={styles.label}>Level</div>
            <div className={styles.inputContainer}>
                <div className={styles.buttonControl} onClick={decrement}>&lt;</div>
                <div className={styles.inputWrapper}>
                    <input
                        type="text"
                        value={percentage}
                        onChange={handleInputChange}
                        className={styles.inputField}
                    />
                    <span className={styles.percentageSymbol}>%</span>
                </div>
                <div className={styles.buttonControl} onClick={increment}>&gt;</div>
            </div>
        </div>
    );
};

export default RobustnessScale;