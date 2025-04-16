import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useDrop } from 'react-dnd';
import DraggableBlock from './components/DraggableBlock';
import { toast } from 'react-hot-toast';

// components
import ConnectionLines from './components/ConnectionLines';
import BoardCore from './components/BoardCore';
import PreprocessingModal from './components/PreprocessingModal';
import BlockValidationChecker from './components/BlockValidationChecker';

// hooks
import { useBlockOperations } from './hooks/useBlockOperations';
import { useResizeHandling } from './hooks/useResizeHandling';
import { useApplicability } from './hooks/useApplicability';

// utils
import { generateSystemPrompt } from '@/app/utils/system-prompt-generator';
import { validateBlocks, getMissingBlocksMessage } from './utils/blockValidation';
import { mergeRefs } from './utils/connectionUtils';

import { Block, DragItem, ProjectBoardProps, ProjectType, SystemPrompt } from '@/app/types';

import styles from './ProjectBoard.module.css';

const ProjectBoard: React.FC<ProjectBoardProps> = ({
  initialBlocks = [],
  onBlocksUpdate,
  onDashboardClick,
  projectId,
  projectType,
  onApplicabilityResults,
  showDashboardResults,
  clearResults: parentClearResults,
  testResults: parentTestResults,
  testRunId: parentTestRunId,
  sseStatus
}) => {
  // State
  const [blocks, setBlocks] = useState<Block[]>(initialBlocks);
  const [projectSystemPromptType, setProjectSystemPromptType] = useState<string>('default');
  const [projectHasDefaultSystemPrompt, setProjectHasDefaultSystemPrompt] = useState<boolean>(true);
  const [showValidationChecker, setShowValidationChecker] = useState<boolean>(true);
  const [testAttemptedWithMissingBlocks, setTestAttemptedWithMissingBlocks] = useState<boolean>(false);

  // Refs
  const boardRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Custom hooks
  const {
    isBlockConnected,
    handleMove: moveBlockFn,
    handleRemove: removeBlockFn,
    handleUpdateBlock: updateBlockFn,
    adjustBlockPositions
  } = useBlockOperations();

  const { boardSize } = useResizeHandling(
    containerRef,
    (blocks, oldSize, newSize) => blocks, // Prevent repositioning on resize
    blocks,
    setBlocks
  );

  // Fetch project data when component mounts or projectId/projectType changes
  useEffect(() => {
    if (projectId) {
      fetch(`/api/projects/${projectId}`)
        .then(res => res.json())
        .then(project => {
          const promptType = project.type;
          setProjectSystemPromptType(promptType);

          // Check if project has default system prompt
          const hasDefaultPrompt = promptType === 'default';
          setProjectHasDefaultSystemPrompt(hasDefaultPrompt);

          console.log('Project data loaded:', {
            projectType: project.type,
            SystemPromptType: promptType,
            hasDefaultPrompt: hasDefaultPrompt
          });
        })
        .catch(error => console.error('Error fetching project:', error));
    }
  }, [projectId, projectType]); // Add projectType as dependency to reload when it changes

  // Toggle validation checker based on blocks state
  useEffect(() => {
    // Only show the validation checker if there are some blocks but not all required ones
    setShowValidationChecker(blocks.length > 0);
  }, [blocks]);

  // Wrapper functions to update state
  const handleMove = useCallback((id: string, x: number, y: number) => {
    setBlocks(prev => moveBlockFn(prev, id, x, y));
  }, [moveBlockFn]);

  const handleRemove = useCallback((id: string) => {
    setBlocks(prev => removeBlockFn(prev, id));
  }, [removeBlockFn]);

  const handleUpdateBlock = useCallback((id: string, updatedBlock: Block) => {
    setBlocks(prev => updateBlockFn(prev, id, updatedBlock));
  }, [updateBlockFn]);

  // Dashboard handling
  const handleShowDashboard = useCallback((mode: 'applicability' | 'results') => {
    if (onDashboardClick) onDashboardClick();
    if (showDashboardResults) showDashboardResults(mode);
  }, [onDashboardClick, showDashboardResults]);

  // Function to update project system prompt via API
  const updateProjectSystemPrompt = async (projectId: string, SystemPrompt: SystemPrompt) => {
    try {
      // In updateProjectSystemPrompt function
      console.log('Updating system prompt with:', JSON.stringify({
        SystemPrompt
      }, null, 2));

      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          systemPrompt: SystemPrompt
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Server error response:', errorData);
        throw new Error(errorData.error || 'Failed to update system prompt');
      }

      // Update local state to track system prompt type
      setProjectSystemPromptType(SystemPrompt.type);
      setProjectHasDefaultSystemPrompt(SystemPrompt.type === 'default');

      // Show success toast
      toast.success('System prompt automatically updated based on shot type', {
        duration: 4000,
        position: 'bottom-right',
      });

      console.log('System prompt updated successfully');
    } catch (error) {
      console.error('Error updating system prompt:', error);
      // Show error toast
      toast.error('Failed to update system prompt', {
        duration: 4000,
        position: 'bottom-right',
      });
    }
  };

  // Function to check which blocks are on the board and update prompt accordingly
  const updateSystemPrompt = useCallback(async () => {
    if (!projectId) return;

    try {
      // Get current project data to check system prompt type
      const projectResponse = await fetch(`/api/projects/${projectId}`);
      if (projectResponse.ok) {
        const projectData = await projectResponse.json();

        // Skip if the project already has custom system prompt
        if (projectData.SystemPrompt?.type === 'custom') {
          console.log('Project has custom system prompt, skipping auto-update');
          return;
        }

        // Only continue if type is 'default' or not set
        const testCaseBlock = blocks.find(b => b.type === 'test-case');
        if (!testCaseBlock || !testCaseBlock.shotType) {
          console.log('No test case found on the board or missing shot type');
          return;
        }

        const inputBlock = blocks.find(b => b.type === 'input');
        const contextOption = inputBlock?.config?.contextOption || 'withoutContext';

        // Generate new system prompt based on shot type and context option
        const newSystemPrompt = generateSystemPrompt(
          projectType as ProjectType,
          testCaseBlock.shotType,
          contextOption === 'withContext'
        );

        // Only update if project has default system prompt
        await updateProjectSystemPrompt(projectId, newSystemPrompt);
      }
    } catch (error) {
      console.error('Error updating system prompt:', error);
    }
  }, [blocks, projectId, projectType]);

  // Function to update system prompt based on context option
  const updateSystemPromptBasedOnContext = async (contextOption: string) => {
    if (!projectId) return;

    try {
      // Get current project
      const projectResponse = await fetch(`/api/projects/${projectId}`);
      if (projectResponse.ok) {
        const projectData = await projectResponse.json();

        // Skip update if system prompt is custom
        if (projectData.SystemPrompt?.type === 'custom') {
          console.log('Project has custom system prompt, skipping context update');
          return;
        }

        // Find test case block to get shot type
        const testCaseBlock = blocks.find(b => b.type === 'test-case');
        if (!testCaseBlock || !testCaseBlock.shotType) {
          console.log('No test case found on the board or missing shot type');
          return;
        }

        // Generate new system prompt based on shot type and new context option
        const newSystemPrompt = generateSystemPrompt(
          projectType as ProjectType,
          testCaseBlock.shotType,
          contextOption === 'withContext'
        );

        // Update system prompt
        await updateProjectSystemPrompt(projectId, newSystemPrompt);
      }
    } catch (error) {
      console.error('Error updating system prompt based on context:', error);
    }
  };

  // Helper function to check if a block type already exists on the board
  // Updated to ignore the block being moved (when applicable)
  const blockTypeExists = useCallback((type: string, method?: string, blockId?: string) => {
    // If blockId is provided, we're moving an existing block, not adding a new one
    // So we need to exclude that block from our duplicate check

    // For input blocks (file uploads), check if any file input exists
    if (type === 'input') {
      return blocks.some(block => block.type === 'input' && (!blockId || block.id !== blockId));
    }

    // For output containers, check if any output container exists
    if (type === 'output-container') {
      return blocks.some(block => block.type === 'output-container' && (!blockId || block.id !== blockId));
    }

    // For evaluation containers, only allow one
    if (type === 'evaluation-container') {
      return blocks.some(block => block.type === 'evaluation-container' && (!blockId || block.id !== blockId));
    }

    // For dashboard blocks, only allow one
    if (type === 'dashboard') {
      return blocks.some(block => block.type === 'dashboard' && (!blockId || block.id !== blockId));
    }

    // For test case blocks, only allow one
    if (type === 'test-case') {
      return blocks.some(block => block.type === 'test-case' && (!blockId || block.id !== blockId));
    }

    // For topics, allow multiple but check for duplicates
    if (type === 'topic' && method) {
      return blocks.some(block =>
        block.type === 'topic' &&
        block.method === method &&
        (!blockId || block.id !== blockId)
      );
    }

    return false;
  }, [blocks]);

  // Updated handle drop function to use the improved blockTypeExists
  const handleDrop = useCallback(async (item: DragItem, monitor: any) => {
    // console.log('Project type when adding test case:', projectType);
    const offset = monitor.getClientOffset();
    const boardRect = containerRef.current?.getBoundingClientRect();

    if (!offset || !boardRect) return;

    const x = offset.x - boardRect.left;
    const y = offset.y - boardRect.top;

    // Special handling for topics
    if (item.type === 'topic' && item.topicType) {
      // Check if there's an evaluation container on the board
      const evaluationContainers = blocks.filter(block => block.type === 'evaluation-container');

      if (evaluationContainers.length === 0) {
        // No evaluation container exists
        toast.error('Please add an Evaluation Container first before adding topics.');
        return;
      }

      // Get all evaluation container DOM elements
      const evaluationElements = evaluationContainers.map(container => {
        // Get DOM element for this container block
        const element = document.getElementById(container.id);
        return { container, element };
      }).filter(({ element }) => element !== null);

      // Check if the drop coordinates are within any evaluation container
      const targetContainer = evaluationElements.find(({ element }) => {
        if (!element) return false;

        // Get bounding rect
        const rect = element.getBoundingClientRect();

        // Convert client coordinates to board-relative
        const dropClientX = offset.x;
        const dropClientY = offset.y;

        // Check if drop is inside this container's bounds
        return (
          dropClientX >= rect.left && dropClientX <= rect.right &&
          dropClientY >= rect.top && dropClientY <= rect.bottom
        );
      });

      if (targetContainer) {
        // Topic is being dropped onto an evaluation container - proceed with existing logic
        const targetBlock = targetContainer.container;
        const topics = targetBlock.config?.topics || [];

        // Check if this topic is already in the container
        if (topics.includes(item.topicType)) {
          toast.error(`Topic ${item.topicType} is already added to the evaluation.`);
          return;
        }

        setBlocks(prev => prev.map(block => {
          if (block.id === targetBlock.id) {
            return {
              ...block,
              method: 'topic-list',
              config: {
                ...block.config,
                topics: [...topics, item.topicType!],
              },
            };
          }
          return block;
        }));
        return;
      } else {
        // Topic is being dropped on the board but not on an evaluation container
        toast.error('Topics can only be added to an Evaluation Container. Please drag the topic onto a container.');
        return;
      }
    }

    // Check if this is an existing block being moved
    if (item.id) {
      // It's an existing block, just update its position
      handleMove(item.id, x, y);
      return;
    }

    // For new blocks, check for duplicates
    if (blockTypeExists(item.type, item.method)) {
      // Show toast notification with react-hot-toast
      toast.error(`You can only add one ${item.label || item.type} block to the board.`);
      return;
    }

    // Clear results when adding output container
    if (item.type === 'output-container' && parentClearResults) {
      parentClearResults();
    }

    // Create a new block
    const newBlock: Block = {
      id: `${item.type}-${Date.now()}`,
      type: item.type,
      method: item.method,
      position: { x, y },
      label: item.label || item.type
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' '),
      topicType: item.topicType,
      testCaseFormat: item.testCaseFormat,
      shotType: item.shotType,
      isContainer: item.type.includes('container'),
      config: { topics: [] },
    };

    if (item.type === 'test-case' && item.shotType && projectId) {
      // Add the block first
      setBlocks(prev => [...prev, newBlock]);

      // Then update system prompt based on the new test case
      try {
        // Get context option from any existing file block
        const fileBlock = blocks.find(b => b.type === 'input');
        const contextOption = fileBlock?.config?.contextOption || 'withoutContext';

        // Get current project data
        const projectResponse = await fetch(`/api/projects/${projectId}`);
        if (projectResponse.ok) {
          const projectData = await projectResponse.json();

          // Skip update if system prompt is custom
          if (projectData.systemPrompt?.type === 'custom') {
            console.log('Project has custom system prompt, skipping auto-update for new test case');
            return;
          }

          // Generate new system prompt based on shot type and context
          const newSystemPrompt = generateSystemPrompt(
            projectData.type,
            item.shotType,
            contextOption === 'withContext'
          );

          // Update the project's system prompt
          updateProjectSystemPrompt(projectId, newSystemPrompt);
        }
      } catch (error) {
        console.error('Error updating system prompt:', error);
      }

      return; // Important: return after adding the block
    }

    setBlocks(prev => [...prev, newBlock]);

  }, [blocks, handleMove, parentClearResults, blockTypeExists, projectId, projectType, updateSystemPrompt]);

  // Applicability processing
  const {
    perturbations,
    hasResults,
    showModal,
    uploadedBlock,
    showPreprocessPrompt,
    processData,
    cancelPreprocess,
    showApplicabilityDashboard
  } = useApplicability(
    projectType,
    onApplicabilityResults,
    handleUpdateBlock,
    handleShowDashboard
  );

  const [, drop] = useDrop({
    accept: ['block', 'BLOCK', 'file', 'PLACED_BLOCK'],
    drop: handleDrop,
  });

  // Update connected blocks
  React.useEffect(() => {
    if (!boardSize.width || !boardSize.height) return;

    const centerX = boardSize.width / 2;
    const centerY = boardSize.height / 2;
    const connected = blocks.filter(block =>
      isBlockConnected(block, centerX, centerY, blocks)
    );

    onBlocksUpdate?.(connected, blocks.length);
  }, [blocks, boardSize, isBlockConnected, onBlocksUpdate]);

  // Core center coordinates
  const centerX = boardSize.width / 2;
  const centerY = boardSize.height / 2;

  return (
    <div className={styles.boardWrapper} ref={boardRef}>
      <div ref={mergeRefs(containerRef, drop)} className={styles.container}>
        {/* Connections */}
        <ConnectionLines
          blocks={blocks}
          centerX={centerX}
          centerY={centerY}
          isConnected={isBlockConnected}
        />

        {/* Center brain */}
        <BoardCore centerX={centerX} centerY={centerY} />

        {/* Blocks */}
        {blocks.map(block => (
          <DraggableBlock
            key={block.id}
            block={block}
            projectType={projectType}
            projectHasDefaultSystemPrompt={projectHasDefaultSystemPrompt}
            onContextOptionChange={updateSystemPromptBasedOnContext}
            onMove={handleMove}
            onRemove={handleRemove}
            onUpdateBlock={handleUpdateBlock}
            onDashboardClick={() => handleShowDashboard('results')}
            onShowPreprocessPrompt={() => showPreprocessPrompt(block)}
            onShowApplicabilityDashboard={showApplicabilityDashboard}
            testResults={parentTestResults}
            testRunId={parentTestRunId}
            hasApplicabilityResults={hasResults}
            showDashboardResults={handleShowDashboard}
            isTestInProgress={parentTestRunId != null && (sseStatus?.status === 'running' || !parentTestResults)}
          />
        ))}

        {/* Block Validation Checker */}
        {showValidationChecker && (
          <BlockValidationChecker
            blocks={blocks}
            projectType={projectType}
            isTestAttempted={testAttemptedWithMissingBlocks}
          />
        )}
      </div>

      {/* Preprocessing Modal */}
      {showModal && (
        <PreprocessingModal
          onConfirm={processData}
          onCancel={cancelPreprocess}
        />
      )}
    </div>
  );
};

export default ProjectBoard;