import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useDrag, useDrop } from 'react-dnd';

import { FaBrain, FaLightbulb, FaList } from 'react-icons/fa';
import { MdDriveFolderUpload, MdQueue } from 'react-icons/md';
import { RiBook2Fill, RiEyeFill, RiFlag2Fill, RiQuestionAnswerFill } from 'react-icons/ri';
import { GrDrag } from 'react-icons/gr';
import { TiThLarge } from 'react-icons/ti';
import { HiQuestionMarkCircle } from 'react-icons/hi';

import styles from './ProjectBoard.module.css';
import { Block, BlockType, DropResult, TopicType, TestCaseFormat, ShotType } from '../Block/types';

interface ProjectBoardProps {
  initialBlocks?: Block[];
  onBlocksUpdate?: (blocks: Block[]) => void;
  onDashboardClick?: () => void;
}

interface DragItem {
  id?: string;
  type: BlockType;
  label?: string;
  topicType?: TopicType;
  testCaseFormat?: TestCaseFormat;
  shotType?: ShotType;
}

const DraggableBlock = ({
  block,
  onMove,
  onRemove,
  onDashboardClick
}: {
  block: Block;
  onMove: (id: string, x: number, y: number) => void;
  onRemove: (id: string) => void;
  onDashboardClick?: () => void;
}) => {
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

  const blockClassName = `
        ${styles.blockContainer}
        ${isDragging ? styles.dragging : ''}
        ${block.type === 'evaluation-container' ? styles.evaluationContainer : ''}
        ${block.type === 'topic' ? styles.topicContainer : ''}
        ${block.type === 'dashboard' ? styles.dashboardContainer : ''}
        ${block.type === 'output-container' ? styles.outputContainer : ''}
        ${block.type === 'input' ? styles.uploadBlock : ''}
        ${block.type === 'test-case' ? styles.testCaseBlock : ''}
    `.trim();

    const renderTestCaseFields = (format: TestCaseFormat | undefined) => {
      switch (format) {
          case 'ICQA Format':
              return (
                  <div className={styles.fieldsContainer}>
                      <div className={styles.fieldRow}>
                          <div className={styles.fieldIcon}>
                              <RiFlag2Fill />
                          </div>
                          <div className={styles.fieldBox}>Instruction</div>
                      </div>
                      <div className={styles.fieldRow}>
                          <div className={styles.fieldIcon}>
                              <RiBook2Fill />
                          </div>
                          <div className={styles.fieldBox}>Context</div>
                      </div>
                      <div className={styles.fieldRow}>
                          <div className={styles.fieldIcon}>
                              <HiQuestionMarkCircle />
                          </div>
                          <div className={styles.fieldBox}>Question</div>
                      </div>
                      <div className={styles.fieldRow}>
                          <div className={styles.fieldIcon}>
                              <RiQuestionAnswerFill />
                          </div>
                          <div className={styles.fieldBox}>Answer</div>
                      </div>
                  </div>
              );
          case 'Standard':
              return (
                  <div className={styles.fieldsContainer}>
                      <div className={styles.fieldRow}>
                          <div className={styles.fieldIcon}>
                              <HiQuestionMarkCircle />
                          </div>
                          <div className={styles.fieldBox}>Question</div>
                      </div>
                      <div className={styles.fieldRow}>
                          <div className={styles.fieldIcon}>
                              <RiQuestionAnswerFill />
                          </div>
                          <div className={styles.fieldBox}>Answer</div>
                      </div>
                  </div>
              );
          case 'Chain-of-Thought':
              return (
                  <div className={styles.fieldsContainer}>
                      <div className={styles.fieldRow}>
                          <div className={styles.fieldIcon}>
                              <HiQuestionMarkCircle />
                          </div>
                          <div className={styles.fieldBox}>Question</div>
                      </div>
                      <div className={styles.fieldRow}>
                          <div className={styles.fieldIcon}>
                              <MdQueue />
                          </div>
                          <div className={styles.fieldBox}>Elaboration</div>
                      </div>
                      <div className={styles.fieldRow}>
                          <div className={styles.fieldIcon}>
                              <RiQuestionAnswerFill />
                          </div>
                          <div className={styles.fieldBox}>Answer</div>
                      </div>
                  </div>
              );
          default:
              return null;
      }
  };

  const renderBlockContent = () => {
      if (block.type === 'dashboard') {
          return (
              <>
                  <div className={`${styles.blockHeader} ${styles.dashboardHeader}`}>
                      <div className={styles.draggableBlockLeft}>
                          <RiEyeFill className={styles.blockIcon} />
                      </div>
                      <div className={styles.dragIndicator}>
                          <GrDrag />
                      </div>
                  </div>
                  <div className={styles.blockMain}></div>
              </>
          );
      }

      if (block.type === 'test-case') {
          return (
              <>
                  <div className={`${styles.blockHeader}`}>
                      <div className={styles.draggableBlockLeft}>
                          <TiThLarge className={styles.blockIcon} />
                      </div>
                      <div className={styles.testCaseInfo}>
                          <span className={styles.shotType}>{block.shotType}</span>
                          <span className={styles.testFormat}>{block.testCaseFormat}</span>
                      </div>
                      <div className={styles.dragIndicator}>
                          <GrDrag />
                      </div>
                  </div>
                  <div className={styles.blockMain}>
                      {renderTestCaseFields(block.testCaseFormat)}
                  </div>
              </>
          );
      }

      return (
          <>
              <div className={styles.blockHeader}>
                  <div className={styles.draggableBlockLeft}>
                      {block.type === 'evaluation-container' && <FaList className={styles.evaluationIcon} />}
                      {block.type === 'output-container' && <MdDriveFolderUpload className={styles.outputIcon} />}
                      {block.type === 'topic' && <FaLightbulb className={styles.blockIcon} />}
                      {block.type === 'input' && <MdDriveFolderUpload className={styles.blockIcon} />}
                      <span>{block.label}</span>
                  </div>
                  <div className={styles.dragIndicator}>
                      <GrDrag />
                  </div>
              </div>
              <div className={styles.blockMain}>
                  {(block.type === 'input') && (
                      <button className={styles.uploadButton}>+ Upload</button>
                  )}
              </div>
          </>
      );
  };

  return (
    <div
      ref={drag}
      className={`${blockClassName} ${isDragging ? styles.dragging : ''}`}
      style={{
        position: 'absolute',
        left: block.position.x,
        top: block.position.y,
        transform: 'translate(-50%, -50%)',
      }}
      onClick={handleClick}
    >
      {renderBlockContent()}
    </div>
  );
};

const mergeRefs = <T extends any>(...refs: Array<React.MutableRefObject<T> | React.LegacyRef<T>>): React.RefCallback<T> => {
  return (value) => {
    refs.forEach((ref) => {
      if (typeof ref === 'function') {
        ref(value);
      } else if (ref != null) {
        (ref as React.MutableRefObject<T | null>).current = value;
      }
    });
  };
};

const ProjectBoard: React.FC<ProjectBoardProps> = ({
  initialBlocks = [],
  onBlocksUpdate,
  onDashboardClick
}) => {
  const [blocks, setBlocks] = useState<Block[]>(initialBlocks);
  const [boardSize, setBoardSize] = useState({ width: 0, height: 0 });
  const boardRef = useRef<HTMLDivElement>(null);

  const handleMove = useCallback((id: string, x: number, y: number) => {
    setBlocks(prev => prev.map(block =>
      block.id === id ? { ...block, position: { x, y } } : block
    ));
  }, []);

  const handleRemove = useCallback((id: string) => {
    setBlocks(prev => prev.filter(block => block.id !== id));
  }, []);

  const [, drop] = useDrop(() => ({
    accept: ['file', 'PLACED_BLOCK'],
    drop: (item: DragItem, monitor) => {
      const offset = monitor.getClientOffset();
      const boardRect = boardRef.current?.getBoundingClientRect();

      if (!offset || !boardRect) return;

      const x = offset.x - boardRect.left;
      const y = offset.y - boardRect.top;

      if (item.id) {
        handleMove(item.id, x, y);
      } else {
        const newBlock: Block = {
          id: `${item.type}-${Date.now()}`,
          type: item.type,
          position: { x, y },
          label: item.label || item.type.split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' '),
          topicType: item.topicType,
          testCaseFormat: item.testCaseFormat,
          shotType: item.shotType,
          isContainer: item.type.includes('container')
        };
        setBlocks(prev => [...prev, newBlock]);
      }
    }
  }), [handleMove]);

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

  useEffect(() => {
    onBlocksUpdate?.(blocks);
  }, [blocks, onBlocksUpdate]);

  const coreCenterX = boardSize.width / 2;
  const coreCenterY = boardSize.height / 2;

  return (
    <div className={styles.boardWrapper}>
      <div
        ref={mergeRefs(boardRef, drop)}
        className={styles.container}
      >
        <svg className={styles.connections}>
          {blocks.map(block => {
            const isAligned = Math.abs(block.position.y - coreCenterY) < 10;

            if (isAligned) {
              return (
                <line
                  key={block.id}
                  x1={block.position.x}
                  y1={block.position.y}
                  x2={coreCenterX}
                  y2={coreCenterY}
                  className={styles.connectionLine}
                />
              );
            }

            const controlPoint1X = block.position.x + (coreCenterX - block.position.x) / 2;
            const controlPoint2X = coreCenterX - (coreCenterX - block.position.x) / 2;

            return (
              <path
                key={block.id}
                d={`M ${block.position.x} ${block.position.y} 
                    C ${controlPoint1X} ${block.position.y} 
                      ${controlPoint2X} ${coreCenterY} 
                      ${coreCenterX} ${coreCenterY}`}
                className={styles.connectionPath}
              />
            );
          })}
        </svg>

        <div
          className={styles.core}
          style={{ left: coreCenterX, top: coreCenterY }}
        >
          <FaBrain />
          <div className={styles.connectorLeft} />
          <div className={styles.connectorRight} />
        </div>

        {blocks.map((block) => (
          <DraggableBlock
            key={block.id}
            block={block}
            onMove={handleMove}
            onRemove={handleRemove}
            onDashboardClick={onDashboardClick}
          />
        ))}
      </div>
    </div>
  );
};

export default ProjectBoard;