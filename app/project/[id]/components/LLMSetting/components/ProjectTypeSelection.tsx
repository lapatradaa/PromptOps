// app/project/[id]/components/LLMSetting/components/ProjectTypeSelection.tsx

import React from 'react';
import { ProjectType } from '@/app/types';
import styles from '../LLMSetting.module.css';

interface ProjectTypeSelectionProps {
    value: ProjectType;
    onChange: (type: ProjectType) => void;
}

const ProjectTypeSelection: React.FC<ProjectTypeSelectionProps> = ({ value, onChange }) => {
    return (
        <div className={styles.field}>
            <label htmlFor="type">Type</label>
            <div className={styles.radioGroupInline}>
                {['qa', 'sentiment'].map((type) => (
                    <div key={type} className={styles.radioLabelInline}>
                        <input
                            type="radio"
                            id={type}
                            name="type"
                            checked={value === type}
                            onChange={() => onChange(type as ProjectType)}
                            className={styles.radioInputInline}
                            required
                        />
                        <label htmlFor={type}>{type === 'qa' ? 'Q&A' : 'Sentiment'}</label>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ProjectTypeSelection;