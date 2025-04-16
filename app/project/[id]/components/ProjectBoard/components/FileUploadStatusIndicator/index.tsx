// @/app/project/[id]/components/ProjectBoard/components/FileUploadStatusIndicator/index.tsx
import React from 'react';
import { FaCheckCircle, FaExclamationTriangle, FaFileUpload } from 'react-icons/fa';
import { Block } from '@/app/types';
import styles from './FileUploadStatusIndicator.module.css';

interface FileUploadStatusIndicatorProps {
    blocks: Block[];
}

const FileUploadStatusIndicator: React.FC<FileUploadStatusIndicatorProps> = ({ blocks }) => {
    // Find input block
    const inputBlock = blocks.find(block => block.type === 'input');

    // If no input block exists yet
    if (!inputBlock) {
        return (
            <div className={`${styles.statusIndicator} ${styles.warning}`}>
                <FaFileUpload className={styles.icon} />
                <span>Add input file block first</span>
            </div>
        );
    }

    // If input block exists but no file uploaded
    if (!inputBlock.config?.data || !inputBlock.config?.fileName) {
        return (
            <div className={`${styles.statusIndicator} ${styles.incomplete}`}>
                <FaExclamationTriangle className={styles.icon} />
                <span>Upload a file to continue</span>
            </div>
        );
    }

    // File is uploaded
    return (
        <div className={`${styles.statusIndicator} ${styles.complete}`}>
            <FaCheckCircle className={styles.icon} />
            <span>File: {inputBlock.config.fileName}</span>
        </div>
    );
};

export default FileUploadStatusIndicator;