// @/app/project/[id]/components/ProjectBoard/components/BlockValidationChecker/index.tsx
import React, { useMemo } from 'react';
import { RiErrorWarningLine } from 'react-icons/ri';
import { FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import { BlockValidationCheckerProps } from '@/app/types';
import { getRequiredBlocks } from '@/app/types/blockRequirements';
import styles from './BlockValidationChecker.module.css';

const BlockValidationChecker: React.FC<BlockValidationCheckerProps> = ({
  blocks,
  projectType,
  isTestAttempted = false
}) => {
  // Get required blocks from centralized source
  const requiredBlocks = useMemo(() => {
    return getRequiredBlocks(projectType);
  }, [projectType]);

  // Check which blocks are missing
  const missingBlocks = useMemo(() => {
    return requiredBlocks.filter(req => {
      if (!req.required) return false;
      return !blocks.some(block => block.type === req.type);
    });
  }, [blocks, requiredBlocks]);

  // Check if input file has been uploaded
  const inputBlock = blocks.find(block => block.type === 'input');
  const fileUploaded = inputBlock && inputBlock.config?.data && inputBlock.config?.fileName;

  // Check if evaluation container has topics (if present)
  const evaluationContainer = blocks.find(block => block.type === 'evaluation-container');
  const missingTopics = evaluationContainer &&
    (!evaluationContainer.config?.topics ||
      evaluationContainer.config.topics.length === 0);

  // Build a consolidated list of missing requirements
  const consolidatedMissing: string[] = [];

  // Add missing blocks
  missingBlocks.forEach(block => {
    consolidatedMissing.push(block.label);
  });

  // Add file upload status if input block exists but no file
  if (inputBlock && !fileUploaded) {
    consolidatedMissing.push('Upload a file to the Input block');
  }

  // Add missing topics if evaluation container exists
  if (missingTopics) {
    consolidatedMissing.push('Add evaluation topics to the Evaluation Container');
  }

  // Don't show anything if all requirements are met
  if (consolidatedMissing.length === 0) {
    return (
      <div className={styles.validationComplete}>
        <FaCheckCircle className={styles.checkIcon} />
        <span>All required blocks added</span>
      </div>
    );
  }

  // Show a more prominent warning if test was attempted without all blocks
  if (isTestAttempted) {
    return (
      <div className={`${styles.validationChecker} ${styles.testAttemptedWarning}`}>
        <div className={styles.validationHeader}>
          <FaExclamationTriangle className={styles.errorIcon} />
          <span>Cannot run test: Missing required blocks</span>
        </div>
        <ul className={styles.missingList}>
          {consolidatedMissing.map((message, index) => (
            <li key={index}>{message}</li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className={styles.validationChecker}>
      <div className={styles.validationHeader}>
        <RiErrorWarningLine className={styles.warningIcon} />
        <span>Required blocks missing:</span>
      </div>
      <ul className={styles.missingList}>
        {consolidatedMissing.map((message, index) => (
          <li key={index}>{message}</li>
        ))}
      </ul>
    </div>
  );
};

export default BlockValidationChecker;