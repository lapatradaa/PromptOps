import React from 'react';
import { useDrop } from 'react-dnd';
import { FaTrashAlt } from 'react-icons/fa';

import styles from './TestSetup.module.css';
import { TopicType } from '@/app/types';
import SidebarBlock from '@/app/project/[id]/components/SidebarBlock/SidebarBlock';

interface TestSetupProps {
  openMenuItem: string | null;
  handleMenuItemClick: (item: string) => void;
  isDraggingBlock: boolean;
  projectType: string;
}

const TOPIC_MAPPING: Record<string, TopicType[]> = {
  sentiment: [
    'Vocabulary',
    'Robustness',
    'NER',
    'Temporal',
    'Negation',
    'Fairness',
  ],
  qa: [
    'Taxonomy',
    'Robustness',
    'NER',
    'Temporal',
    'Negation',
    'Coreference',
    'SRL',
    'Logic',
    'Vocabulary',
    'Fairness',
  ],
  default: [],
};

// Define input types
const INPUT_TYPES = ['CSV', 'XLSX'];

// Define output types
const OUTPUT_TYPES = ['CSV', 'XLSX', 'PKL', 'json'];

const RemoveZone: React.FC<{ isDragging: boolean }> = ({ isDragging }) => {
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
      className={`${styles.emptyArea} 
        ${isDragging ? styles.showRemoveZone : ''} 
        ${isOver ? styles.removeZoneActive : ''}`}
    >
      <FaTrashAlt className={styles.trashIcon} />
      <span>{isOver ? 'Drop to Remove' : 'Drag here to remove'}</span>
    </div>
  );
};

interface MenuSectionProps {
  isOpen: boolean;
  title: string;
  onClick: () => void;
  children?: React.ReactNode;
}

const MenuSection: React.FC<MenuSectionProps> = ({
  isOpen,
  title,
  onClick,
  children
}) => (
  <>
    <div
      className={`${styles.menuItem} ${isOpen ? styles.active : ''}`}
      onClick={onClick}
    >
      {title}
    </div>
    {isOpen && (
      <div className={styles.dropdownContent}>
        {children}
      </div>
    )}
  </>
);

const TestSetup: React.FC<TestSetupProps> = ({
  openMenuItem,
  handleMenuItemClick,
  isDraggingBlock,
  projectType,
}) => {
  const filteredTopics = TOPIC_MAPPING[projectType] || TOPIC_MAPPING.default;

  console.log("Project Type:", projectType);
  console.log("Filtered Topics:", filteredTopics);

  return (
    <div className={styles.menuList}>
      <RemoveZone isDragging={isDraggingBlock} />

      {/* Input Files Section */}
      <MenuSection
        isOpen={openMenuItem === 'input'}
        title="Input File"
        onClick={() => handleMenuItemClick('input')}
      >
        {INPUT_TYPES.map((type) => (
          <SidebarBlock key={type} type="input" label={type} />
        ))}
      </MenuSection>

      {/* Evaluation Section */}
      <MenuSection
        isOpen={openMenuItem === 'evaluation'}
        title="Evaluation Aspect"
        onClick={() => handleMenuItemClick('evaluation')}
      >
        <SidebarBlock
          type="evaluation-container"
          label="Evaluation Aspect"
          isContainer={true}
          method="topic-list"
        />
        {filteredTopics.map((topic) => (
          <SidebarBlock
            key={topic}
            type="topic"
            label={topic}
            topicType={topic}
            method="topic-list"
          />
        ))}
      </MenuSection>

      {/* Dashboard Section */}
      <MenuSection
        isOpen={openMenuItem === 'dashboard'}
        title="Dashboard"
        onClick={() => handleMenuItemClick('dashboard')}
      >
        <SidebarBlock type="dashboard" label="Dashboard" />
      </MenuSection>

      {/* Output Files Section */}
      <MenuSection
        isOpen={openMenuItem === 'output'}
        title="Output File"
        onClick={() => handleMenuItemClick('output')}
      >
        {OUTPUT_TYPES.map((type) => (
          <SidebarBlock key={type} type="output-container" label={type} />
        ))}
      </MenuSection>
    </div>
  );
};

export default TestSetup;