import React from 'react';
import { FaList } from 'react-icons/fa';
import { GrDrag, GrFormClose } from 'react-icons/gr';
import { TopicType } from '../../../../types';
import styles from './TopicList.module.css';

interface TopicListProps {
  topics?: TopicType[];
  onRemoveTopic?: (topic: TopicType) => void;
}

const TopicList: React.FC<TopicListProps> = ({ 
  topics = [],
  onRemoveTopic
}) => {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <FaList className={styles.evaluationIcon} />
          <span className={styles.title}>Evaluation Aspect</span>
        </div>
        <div className={styles.dragHandle}>
          <GrDrag />
        </div>
      </div>
      
      <div className={styles.content}>
        {topics.map((topic) => (
          <div
            key={topic}
            className={styles.topicItem}
          >
            <span className={styles.topicText}>{topic}</span>
            <button
              className={styles.removeButton}
              onClick={(e) => {
                e.stopPropagation();
                onRemoveTopic?.(topic);
              }}
            >
              <GrFormClose />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TopicList;