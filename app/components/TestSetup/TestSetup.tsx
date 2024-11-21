import React from 'react';
import { useDrop } from 'react-dnd';

import { FaTrashAlt } from 'react-icons/fa';

import styles from './TestSetup.module.css';
import DraggableBlock from "@/app/components/Block/Block";

interface TestSetupProps {
  openMenuItem: string | null;
  handleMenuItemClick: (item: string) => void;
  isDraggingBlock: boolean;
}

// Separate RemoveZone component
const RemoveZone = ({ isDragging }: { isDragging: boolean }) => {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: 'PLACED_BLOCK',
    drop: () => ({ isRemoveZone: true }),
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  }));

  return (
    <div
      ref={drop}
      className={`${styles.emptyArea} ${isDragging ? styles.showRemoveZone : ''} ${
        isOver ? styles.removeZoneActive : ''
      }`}
    >
      <FaTrashAlt className={styles.trashIcon} />
      <span>{isOver ? 'Drop to Remove' : 'Drag here to remove'}</span>
    </div>
  );
};

const TestSetup: React.FC<TestSetupProps> = ({
  openMenuItem,
  handleMenuItemClick,
  isDraggingBlock,
}) => {
  return (
    <>
      <div className={styles.menuList}>
        <RemoveZone isDragging={isDraggingBlock} />

        <div
          className={`${styles.menuItem} ${openMenuItem === 'input' ? styles.active : ''}`}
          onClick={() => handleMenuItemClick('input')}
        >
          <span>Input File</span>
        </div>
        {openMenuItem === 'input' && (
          <div className={styles.dropdownContent}>
            <DraggableBlock
              type="input"
              label="CSV"
            />
            <DraggableBlock
              type="input"
              label="XLSX"
            />
          </div>
        )}

        <div
          className={`${styles.menuItem} ${openMenuItem === 'evaluation' ? styles.active : ''}`}
          onClick={() => handleMenuItemClick('evaluation')}
        >
          Evaluation Aspect
        </div>
        {openMenuItem === 'evaluation' && (
          <div className={styles.dropdownContent}>
            <DraggableBlock
              type="evaluation-container"
              label="Evaluation Aspect"
              isContainer={true}
            />
            <DraggableBlock
              type="topic"
              label="Coreference"
              topicType="Coreference"
            />
            <DraggableBlock
              type="topic"
              label="Fairness"
              topicType="Fairness"
            />
            <DraggableBlock
              type="topic"
              label="Logic"
              topicType="Logic"
            />
            <DraggableBlock
              type="topic"
              label="NER"
              topicType="NER"
            />
            <DraggableBlock
              type="topic"
              label="Negation"
              topicType="Negation"
            />
            <DraggableBlock
              type="topic"
              label="Robustness"
              topicType="Robustness"
            />
            <DraggableBlock
              type="topic"
              label="SRL"
              topicType="SRL"
            />
            <DraggableBlock
              type="topic"
              label="Taxonomy"
              topicType="Taxonomy"
            />
            <DraggableBlock
              type="topic"
              label="Temporal"
              topicType="Temporal"
            />
            <DraggableBlock
              type="topic"
              label="Vocabulary"
              topicType="Vocabulary"
            />
          </div>
        )}

        <div
          className={`${styles.menuItem} ${openMenuItem === 'dashboard' ? styles.active : ''}`}
          onClick={() => handleMenuItemClick('dashboard')}
        >
          Dashboard
        </div>
        {openMenuItem === 'dashboard' && (
          <div className={styles.dropdownContent}>
            <DraggableBlock
              type="dashboard"
              label="Dashboard"
            />
          </div>
        )}

        <div
          className={`${styles.menuItem} ${openMenuItem === 'output' ? styles.active : ''}`}
          onClick={() => handleMenuItemClick('output')}
        >
          Output File
        </div>
        {openMenuItem === 'output' && (
          <div className={styles.dropdownContent}>
            <DraggableBlock
              type="output-container"
              label="CSV"
            />
            <DraggableBlock
              type="output-container"
              label="XLSX"
            />
            <DraggableBlock
              type="output-container"
              label="PKL"
            />
            <DraggableBlock
              type="output-container"
              label="json"
            />
          </div>
        )}
      </div>
    </>
  );
};

export default TestSetup;