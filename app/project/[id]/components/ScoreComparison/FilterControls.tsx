import React, { useState } from "react";
import styles from "./ScoreComparison.module.css";

interface FilterControlsProps {
    projectType?: 'qa' | 'sentiment';
    onProjectTypeChange: (type: 'qa' | 'sentiment') => void;
    error: string | null;
    showProjectType?: boolean;
}

export const FilterControls: React.FC<FilterControlsProps> = ({
    projectType,
    onProjectTypeChange,
    error,
    showProjectType = true
}) => {

    return (
        <div className={styles.controlRow}>
            {showProjectType && (
                <div className={styles.projectTypeFilter}>
                    <label className={styles.filterLabel}>Project Type:</label>
                    <div className={styles.typeButtons}>
                        <button
                            className={`${styles.typeButton} ${projectType === 'qa' ? styles.activeType : ''}`}
                            onClick={() => onProjectTypeChange('qa')}
                        >
                            Q&A
                        </button>
                        <button
                            className={`${styles.typeButton} ${projectType === 'sentiment' ? styles.activeType : ''}`}
                            onClick={() => onProjectTypeChange('sentiment')}
                        >
                            Sentiment
                        </button>
                    </div>
                </div>
            )}

            {error && (
                <div className={styles.errorMessage}>
                    {error.includes('No results found for project type') ? (
                        <>
                            <strong>No Data Available</strong>
                            <p>{error}</p>
                        </>
                    ) : (
                        error
                    )}
                </div>
            )}
        </div>
    );
};