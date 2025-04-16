import React from 'react';
import { useDrag } from 'react-dnd';
import BlockContent from '../BlockContent';
import { Block, DropResult } from '@/app/types';
import styles from './DraggableBlock.module.css';

interface DraggableBlockProps {
  block: Block;
  projectType: string;
  onContextOptionChange?: (option: string) => void;
  onMove: (id: string, x: number, y: number) => void;
  onRemove: (id: string) => void;
  onUpdateBlock?: (id: string, updatedBlock: Block) => void;
  onDashboardClick?: () => void;
  onShowPreprocessPrompt?: () => void;
  onShowApplicabilityDashboard?: () => void;
  processingFinished?: boolean;
  showDashboardResults?: (mode: 'applicability' | 'results') => void;
  testResults?: any | null;
  testRunId?: string | null;
  hasApplicabilityResults?: boolean;
  projectHasDefaultSystemPrompt?: boolean;
  isTestInProgress?: boolean;
}

const DraggableBlock: React.FC<DraggableBlockProps> = ({
  block,
  onMove,
  onRemove,
  onUpdateBlock,
  onDashboardClick,
  onShowPreprocessPrompt,
  onShowApplicabilityDashboard,
  onContextOptionChange,
  projectType,
  processingFinished,
  testResults,
  testRunId,
  showDashboardResults,
  hasApplicabilityResults,
  projectHasDefaultSystemPrompt,
  isTestInProgress = false
}) => {
  // Configure drag behavior
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'PLACED_BLOCK',
    item: { ...block },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging()
    }),
    end: (item, monitor) => {
      const dropResult = monitor.getDropResult<DropResult>();
      if (dropResult?.isRemoveZone) {
        onRemove(block.id);
      }
    }
  }), [block, onRemove]);

  const handleClick = () => {
    if (block.type === 'dashboard' && onDashboardClick) {
      onDashboardClick();
    }
  };

  // Compute class names
  const blockClassName = `
    ${styles.blockContainer}
    ${isDragging ? styles.dragging : ''}
    ${styles[`${block.type}Container`] || ''}
  `.trim();

  return (
    <div
      id={block.id}
      ref={drag}
      className={blockClassName}
      style={{
        position: 'absolute',
        left: block.position.x,
        top: block.position.y,
        transform: 'translate(-50%, -50%)',
        opacity: isDragging ? 0.5 : 1,
      }}
      onClick={handleClick}
    >
      <BlockContent
        block={block}
        onUpdateBlock={onUpdateBlock}
        onShowPreprocessPrompt={onShowPreprocessPrompt}
        onShowApplicabilityDashboard={onShowApplicabilityDashboard}
        onContextOptionChange={onContextOptionChange}
        projectType={projectType}
        processingFinished={block.config?.processed}
        handleShowDashboard={showDashboardResults}
        testResults={testResults}
        testRunId={testRunId}
        hasApplicabilityResults={hasApplicabilityResults}
        projectHasDefaultSystemPrompt={projectHasDefaultSystemPrompt}
        isTestInProgress={isTestInProgress} // Pass the prop to BlockContent
      />
    </div>
  );
};

export default DraggableBlock;