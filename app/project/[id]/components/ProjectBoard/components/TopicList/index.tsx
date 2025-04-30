import React from 'react';
import { useDrop } from 'react-dnd';
import { FaList } from 'react-icons/fa';
import { GrDrag, GrFormClose } from 'react-icons/gr';
import { TopicType } from '@/app/types';
import RobustnessScale from './components/RobustnessScale';
import styles from './TopicList.module.css';

interface TopicListProps {
  topics?: TopicType[];
  onRemoveTopic?: (topic: TopicType) => void;
  onUpdateTopicConfig?: (topic: TopicType, config: any) => void;
  topicConfigs?: Record<string, any>;
}

const TopicList: React.FC<TopicListProps> = ({
  topics = [],
  onRemoveTopic,
  onUpdateTopicConfig,
  topicConfigs = {}
}) => {
  const handleRobustnessChange = (value: number) => {
    if (onUpdateTopicConfig) {
      onUpdateTopicConfig('Robustness', { swapPercentage: value });
    }
  };

  // Set up the drop target using react-dnd, but only for visual hover effect
  // The actual drop handling happens in ProjectBoard.tsx
  const [{ isOver }, drop] = useDrop(() => ({
    accept: ['block', 'PLACED_BLOCK'],
    // Don't provide a drop handler, so the event bubbles up to the board
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
  }), []);

  return (
    <div
      ref={drop}
      className={`${styles.container} ${isOver ? styles.containerHover : ''}`}
    >
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
            <div className={styles.topicHeader}>
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

            {/* Render RobustnessScale if topic is 'robustness' */}
            {topic.toLowerCase() === 'robustness' && (
              <div className={styles.topicConfig}>
                <RobustnessScale
                  onChange={handleRobustnessChange}
                  initialValue={topicConfigs && topicConfigs.robustness ? topicConfigs.robustness.swapPercentage : 5}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TopicList;