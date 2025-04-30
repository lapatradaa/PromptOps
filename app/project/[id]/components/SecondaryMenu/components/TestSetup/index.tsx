import React from 'react';
import { useDrop } from 'react-dnd';
import { FaTrashAlt } from 'react-icons/fa';

import { TopicType } from '@/app/types';
import SidebarBlock from '@/app/project/[id]/components/SecondaryMenu/components/SidebarBlock';

import styles from './TestSetup.module.css';

interface TestSetupProps {
  openMenuItem: string | null;
  handleMenuItemClick: (item: string) => void;
  isDraggingBlock: boolean;
  projectType: string;
  onPerturbationsChange?: (perturbations: TopicType[]) => void;
}

const TOPIC_MAPPING: Record<string, TopicType[]> = {
  sentiment: [
    'Taxonomy',
    'NER',
    'Temporal',
    'Negation',
    'Vocabulary',
    'Fairness',
    'Robustness',
  ],
  qa: [
    'Taxonomy',
    'Negation',
    'Coreference',
    'SRL',
    'Vocabulary',
    'Fairness',
    'Robustness',
  ],
  default: [],
};

// Define input types
const INPUT_TYPES = ['CSV', 'XLSX'];

// Define output types
const OUTPUT_TYPES = ['XLSX', 'json'];

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
  onPerturbationsChange,
}) => {
  const filteredTopics = TOPIC_MAPPING[projectType] || TOPIC_MAPPING.default;

  React.useEffect(() => {
    // console.log('[DEBUG] TestSetup topics for type:', projectType, filteredTopics);
    onPerturbationsChange?.(filteredTopics);
  }, [projectType, filteredTopics, onPerturbationsChange]);

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