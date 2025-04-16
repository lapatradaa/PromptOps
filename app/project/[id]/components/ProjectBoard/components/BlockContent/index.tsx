// @/app/project/[id]/components/ProjectBoard/components/DraggableBlock/components/BlockContent/index.tsx
import React, { useEffect } from 'react';
import { FaLightbulb } from 'react-icons/fa';
import { MdDriveFolderUpload } from 'react-icons/md'
import { RiEyeFill } from 'react-icons/ri';
import { GrDrag } from 'react-icons/gr';
import { TiThLarge } from 'react-icons/ti';
import { BiTable } from 'react-icons/bi';
import { FaFileExcel, FaFileCode } from 'react-icons/fa';
import * as XLSX from 'xlsx';

// Components
import TopicList from '@/app/project/[id]/components/ProjectBoard/components/TopicList';
import TestCaseFields from '@/app/project/[id]/components/ProjectBoard/components/TestCaseFields';
import FileUploadBlock from '@/app/project/[id]/components/ProjectBoard/components/FileUploadBlock';
import OutputBlock from '@/app/project/[id]/components/ProjectBoard/components/OutputBlock';

// Types
import {
  Block,
  TopicType,
  BlockType,
  TestResults,
  BlockConfig,
} from '@/app/types';

// Styles
import styles from './BlockContent.module.css';

// Icon Mapping for Different Block Types
const BLOCK_ICONS: Record<string, React.ReactNode> = {
  'input': null,
  'evaluation-container': <FaLightbulb className={styles.blockIcon} />,
  'topic': <FaLightbulb className={styles.blockIcon} />,
  'dashboard': <RiEyeFill className={styles.blockIcon} />,
  'output-container': <MdDriveFolderUpload className={styles.outputIcon} />,
  'test-case': <TiThLarge
    className={styles.blockIcon}
    style={{ color: "#CCA3DA", fontSize: "38px" }}
  />,
  'metric': null,
};

// Output format icons
const OUTPUT_FORMAT_ICONS: Record<string, React.ReactNode> = {
  'csv': <BiTable className={styles.outputIcon} />,
  'xlsx': <FaFileExcel className={styles.outputIcon} />,
  'json': <FaFileCode className={styles.outputIcon} />,
};

// Block Header Component
interface BlockHeaderProps {
  icon?: React.ReactNode;
  label?: string;
  method?: string;
  additionalContent?: React.ReactNode;
}

const BlockHeader: React.FC<BlockHeaderProps> = ({ icon, label, method, additionalContent }) => {
  // Choose appropriate icon based on method
  let displayIcon = icon;

  if (method && OUTPUT_FORMAT_ICONS[method]) {
    displayIcon = OUTPUT_FORMAT_ICONS[method];
  }

  return (
    <div className={styles.blockHeader}>
      <div className={styles.draggableBlockLeft}>
        {displayIcon}
        <span>{label}</span>
      </div>
      {additionalContent}
      <div className={styles.dragIndicator}>
        <GrDrag />
      </div>
    </div>
  );
};

interface BlockContentProps {
  block: Block;
  projectType?: string;
  onContextOptionChange?: (option: string) => void;
  onUpdateBlock?: (id: string, updatedBlock: Block) => void;
  onShowPreprocessPrompt?: () => void;
  onShowApplicabilityDashboard?: () => void;
  processingFinished?: boolean;
  handleShowDashboard?: (mode: 'applicability' | 'results') => void;
  testResults?: TestResults | null;
  testRunId?: string | null;
  hasApplicabilityResults?: boolean;
  projectHasDefaultSystemPrompt?: boolean;
  isTestInProgress?: boolean; // Add new prop
}

const BlockContent: React.FC<BlockContentProps> = ({
  block,
  projectType,
  onContextOptionChange,
  onUpdateBlock,
  onShowPreprocessPrompt,
  onShowApplicabilityDashboard,
  processingFinished,
  handleShowDashboard,
  testResults,
  testRunId,
  hasApplicabilityResults,
  projectHasDefaultSystemPrompt,
  isTestInProgress
}) => {
  // Use a type guard to ensure proper block type checking
  const isBlockType = (type: string): type is BlockType => {
    return ['input', 'evaluation-container', 'topic', 'dashboard',
      'output-container', 'test-case', 'metric'].includes(type);
  };

  // Topic List Block
  if (isBlockType(block.type) && block.type === 'evaluation-container' && block.method === 'topic-list') {
    return (
      <TopicList
        topics={block.config?.topics || []}
        onRemoveTopic={(topic) => {
          if (block.config?.topics && onUpdateBlock) {
            const updatedTopics = block.config.topics.filter(
              (t: TopicType) => t !== topic
            );
            onUpdateBlock(block.id, {
              ...block,
              config: {
                ...block.config,
                topics: updatedTopics,
                // Remove topic config if it exists
                topicConfigs: block.config.topicConfigs
                  ? Object.keys(block.config.topicConfigs)
                    .filter(key => key !== topic.toLowerCase())
                    .reduce((obj, key) => {
                      // Use non-null assertion since we've already checked it exists in the ternary
                      obj[key] = block.config!.topicConfigs![key];
                      return obj;
                    }, {} as Record<string, any>)
                  : undefined
              }
            });
          }
        }}
        onUpdateTopicConfig={(topic, config) => {
          if (!onUpdateBlock || !block.config) return;

          const topicConfigsCopy = block.config.topicConfigs ? { ...block.config.topicConfigs } : {};
          topicConfigsCopy[topic.toLowerCase()] = config;

          const updatedConfig: BlockConfig = {
            ...block.config,
            topicConfigs: topicConfigsCopy
          };

          onUpdateBlock(block.id, {
            ...block,
            config: updatedConfig
          });
        }}
        topicConfigs={block.config?.topicConfigs || {}}
      />
    );
  }

  // Dashboard Block
  if (isBlockType(block.type) && block.type === 'dashboard') {
    // Always show test results when clicking the dashboard block
    const handleDashboardClick = () => {
      // console.log('[BlockContent] Dashboard block clicked - showing test results');
      handleShowDashboard?.('results');
    };

    return (
      <div
        className={`${styles.blockHeader} ${styles.dashboardHeader}`}
        onClick={handleDashboardClick}
      >
        <div className={styles.draggableBlockLeft}>
          <RiEyeFill className={styles.blockIcon} />
        </div>
        <div className={styles.dragIndicator}>
          <GrDrag />
        </div>
      </div>
    );
  }

  // Test Case Block
  if (isBlockType(block.type) && block.type === 'test-case') {
    return (
      <>
        <div className={styles.blockHeader}>
          <div className={styles.draggableBlockLeft}>
            <TiThLarge
              className={styles.blockIcon}
              style={{ color: "#CCA3DA", fontSize: "38px" }}
            />
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
          <TestCaseFields
            format={block.testCaseFormat}
          />
        </div>
      </>
    );
  }

  // Input Block (File Upload)
  if (isBlockType(block.type) && block.type === 'input') {
    const fileType = (block.label?.toLowerCase() as 'csv' | 'xlsx') || 'csv';

    // Get context option from block config, defaulting to the withContext value from project settings
    const contextOption = block.config?.contextOption ? 
      (block.config.contextOption === 'withContext' ? 'withContext' : 'withoutContext') : 
      'withoutContext';

    // Handle context option change
    const handleContextOptionChange = (option: string) => {
      if (onUpdateBlock) {
        // Update the block's config
        onUpdateBlock(block.id, {
          ...block,
          config: {
            ...block.config,
            contextOption: option
          }
        });

        // Call the project board's function to update system prompt
        if (onContextOptionChange) {
          onContextOptionChange(option);
        }
      }
    };

    // Dashboard handler for file upload block
    const dashboardHandler = () => {
      if (block.config?.processed) {
        // console.log('[BlockContent] File block dashboard button clicked');

        // If applicability results exist, show them
        if (hasApplicabilityResults) {
          // console.log('[BlockContent] Showing applicability dashboard');
          handleShowDashboard?.('applicability');
        } else {
          // Otherwise show test results if they might exist
          // console.log('[BlockContent] No applicability results, showing regular dashboard');
          handleShowDashboard?.('results');
        }
      }
    };

    return (
      <FileUploadBlock
        fileName={block.config?.fileName}
        fileType={fileType}
        projectType={projectType}
        contextOption={contextOption}
        onContextOptionChange={handleContextOptionChange}
        projectHasDefaultSystemPrompt={projectHasDefaultSystemPrompt}
        onFileSelect={async (file) => {
          try {
            if (fileType === 'xlsx') {
              // Read the file as ArrayBuffer
              const arrayBuffer = await file.arrayBuffer();

              // Parse Excel file with SheetJS
              const workbook = XLSX.read(arrayBuffer, { type: 'array' });

              // Get first worksheet
              const worksheet = workbook.Sheets[workbook.SheetNames[0]];

              // Convert to CSV string
              const csvContent = XLSX.utils.sheet_to_csv(worksheet);

              // Store as CSV data but keep XLSX method for UI
              onUpdateBlock?.(block.id, {
                ...block,
                method: 'xlsx', // Keep xlsx in UI
                config: {
                  ...block.config,
                  data: csvContent, // Store as CSV string
                  fileName: file.name,
                  processed: false,
                  contextOption: contextOption
                }
              });
            } else {
              // Regular CSV handling
              const content = await file.text();
              onUpdateBlock?.(block.id, {
                ...block,
                method: fileType,
                config: {
                  ...block.config,
                  data: content,
                  fileName: file.name,
                  processed: false,
                  contextOption: contextOption
                }
              });
            }
          } catch (error) {
            console.error('Error processing file:', error);
          }
        }}
        onFileRemove={() => {
          onUpdateBlock?.(block.id, {
            ...block,
            config: {
              ...block.config,
              data: undefined,
              fileName: undefined,
              processed: false
            }
          });
        }}
        onShowPreprocessPrompt={onShowPreprocessPrompt}
        isProcessComplete={block.config?.processed}
        onShowDashboard={dashboardHandler}
        hasApplicabilityResults={hasApplicabilityResults}
      />
    );
  }

  // Output Container Block
  if (isBlockType(block.type) && block.type === 'output-container') {
    // Determine format based on label or method
    let format = block.method;
    if (!format && block.label) {
      const label = block.label.toLowerCase();
      if (label === 'csv') format = 'csv';
      else if (label === 'excel' || label === 'xlsx') format = 'xlsx';
      else if (label === 'json') format = 'json';
    }

    useEffect(() => {
      if (!block.method && format && onUpdateBlock) {
        onUpdateBlock(block.id, {
          ...block,
          method: format
        });
      }
    }, [block, format, onUpdateBlock]);

    return (
      <>
        <BlockHeader
          icon={BLOCK_ICONS['output-container']}
          label={block.label || 'Results'}
          method={format}
        />
        <div className={styles.blockMain}>
          <OutputBlock
            results={testResults || null}
            method={format}
            label={block.label}
            projectId={window.location.pathname.split('/').pop()}
            testRunId={testRunId}
            isTestInProgress={isTestInProgress}
          />
        </div>
      </>
    );
  }

  // Default Block Rendering
  return (
    <>
      <BlockHeader
        icon={BLOCK_ICONS[block.type] || null}
        label={block.label}
      />
      <div className={styles.blockMain} />
    </>
  );
};

export default BlockContent;