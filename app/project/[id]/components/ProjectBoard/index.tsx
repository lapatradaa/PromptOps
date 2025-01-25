import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useDrop } from 'react-dnd';

import DraggableBlock from './DraggableBlock/index';
import { checkLineIntersection } from './utils/blockUtils';
import { mergeRefs } from './utils/connectionUtils';
import { Block, DragItem } from '@/app/types';
import styles from './ProjectBoard.module.css';

import { FaBrain } from 'react-icons/fa';

interface ProjectBoardProps {
  initialBlocks?: Block[];
  onBlocksUpdate?: (blocks: Block[], totalBlocks: number) => void;
  onDashboardClick?: () => void;
}

const ProjectBoard: React.FC<ProjectBoardProps> = ({
  initialBlocks = [],
  onBlocksUpdate,
  onDashboardClick
}) => {
  // State
  const [internalBlocks, setInternalBlocks] = useState<Block[]>(initialBlocks);
  const [boardSize, setBoardSize] = useState({ width: 0, height: 0 });
  const boardRef = useRef<HTMLDivElement>(null);

  // Block connection checking
  const isBlockConnected = useCallback((block: Block, coreCenterX: number, coreCenterY: number, allBlocks: Block[]): boolean => {
    const otherBlocks = allBlocks.filter(b => b.id !== block.id);
    const hasIntersection = checkLineIntersection(
      block.position.x,
      block.position.y,
      coreCenterX,
      coreCenterY,
      otherBlocks
    );
    return !hasIntersection;
  }, []);

  // Block handlers
  const handleMove = useCallback((id: string, x: number, y: number) => {
    setInternalBlocks(prev => prev.map(block =>
      block.id === id ? { ...block, position: { x, y } } : block
    ));
  }, []);

  const handleRemove = useCallback((id: string) => {
    setInternalBlocks(prev => prev.filter(block => block.id !== id));
  }, []);

  const handleUpdateBlock = useCallback((id: string, updatedBlock: Block) => {
    setInternalBlocks(prev => prev.map(block => 
      block.id === id ? updatedBlock : block
    ));
  }, []);

  // Drop handling
  const handleDrop = useCallback((item: DragItem, monitor: any) => {
    const offset = monitor.getClientOffset();
    const boardRect = boardRef.current?.getBoundingClientRect();

    if (!offset || !boardRect) {
      console.log('Drop failed: No offset or board rect found');
      return;
    }

    const x = offset.x - boardRect.left;
    const y = offset.y - boardRect.top;

    // Handle topic drops into evaluation container
    if (item.type === 'topic' && item.topicType) {
      const dropTargetBlock = internalBlocks.find(block => {
        const blockRect = {
          left: block.position.x - 125,
          right: block.position.x + 125,
          top: block.position.y - 40,
          bottom: block.position.y + 40
        };

        return block.type === 'evaluation-container' &&
               x >= blockRect.left && x <= blockRect.right &&
               y >= blockRect.top && y <= blockRect.bottom;
      });

      if (dropTargetBlock) {
        setInternalBlocks(prev => prev.map(block => {
          if (block.id === dropTargetBlock.id) {
            const currentTopics = block.config?.topics || [];
            if (!currentTopics.includes(item.topicType!)) {
              return {
                ...block,
                method: 'topic-list',
                config: {
                  ...block.config,
                  topics: [...currentTopics, item.topicType!]
                }
              };
            }
          }
          return block;
        }));
        return;
      }
    }

    // Handle regular block drops
    if (item.id) {
      handleMove(item.id, x, y);
    } else {
      const newBlock: Block = {
        id: `${item.type}-${Date.now()}`,
        type: item.type,
        method: item.method,
        position: { x, y },
        label: item.label || item.type.split('-')
          .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' '),
        topicType: item.topicType,
        testCaseFormat: item.testCaseFormat,
        shotType: item.shotType,
        isContainer: item.type.includes('container'),
        config: {
          topics: []
        }
      };
      setInternalBlocks(prev => [...prev, newBlock]);
    }
  }, [internalBlocks, handleMove]);

  // Drop configuration
  const [, drop] = useDrop({
    accept: ['block', 'BLOCK', 'file', 'PLACED_BLOCK'],
    drop: handleDrop
  });

  // Board size effects
  useEffect(() => {
    const updateBoardSize = () => {
      if (boardRef.current) {
        setBoardSize({
          width: boardRef.current.offsetWidth,
          height: boardRef.current.offsetHeight
        });
      }
    };

    const resizeObserver = new ResizeObserver(updateBoardSize);
    if (boardRef.current) {
      resizeObserver.observe(boardRef.current);
    }
    window.addEventListener('resize', updateBoardSize);
    updateBoardSize();

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateBoardSize);
    };
  }, []);

  // Connection update effect
  useEffect(() => {
    if (!boardSize.width || !boardSize.height) return;

    const coreCenterX = boardSize.width / 2;
    const coreCenterY = boardSize.height / 2;

    const connectedBlocks = internalBlocks.filter(block =>
      isBlockConnected(block, coreCenterX, coreCenterY, internalBlocks)
    );

    onBlocksUpdate?.(connectedBlocks, internalBlocks.length);
  }, [internalBlocks, boardSize, isBlockConnected, onBlocksUpdate]);

  const coreCenterX = boardSize.width / 2;
  const coreCenterY = boardSize.height / 2;

  return (
    <div className={styles.boardWrapper}>
      <div ref={mergeRefs(boardRef, drop)} className={styles.container}>
        <svg className={styles.connections}>
          {internalBlocks.map(block => {
            const isConnected = isBlockConnected(block, coreCenterX, coreCenterY, internalBlocks);
            const connectionClassName = `${styles.connectionLine} ${isConnected ? styles.connected : ''}`;

            return (
              <line
                key={block.id}
                x1={block.position.x}
                y1={block.position.y}
                x2={coreCenterX}
                y2={coreCenterY}
                className={connectionClassName}
              />
            );
          })}
        </svg>

        <div className={styles.core} style={{ left: coreCenterX, top: coreCenterY }}>
          <FaBrain />
        </div>

        {internalBlocks.map((block) => (
          <DraggableBlock
            key={block.id}
            block={block}
            onMove={handleMove}
            onRemove={handleRemove}
            onUpdateBlock={handleUpdateBlock}
            onDashboardClick={onDashboardClick}
          />
        ))}
      </div>
    </div>
  );
};

export default ProjectBoard;