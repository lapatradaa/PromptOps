import React from 'react';
import { Block, TopicType } from '@/app/types';
import TopicList from '@/app/project/[id]/components/TopicList/TopicList';
import TestCaseFields from './TestCaseFields';
import FileUpload from './FileUpload';
import styles from './BlockContent.module.css';
import { FaLightbulb } from 'react-icons/fa';
import { MdDriveFolderUpload } from 'react-icons/md';
import { RiEyeFill } from 'react-icons/ri';
import { GrDrag } from 'react-icons/gr';
import { TiThLarge } from 'react-icons/ti';

interface BlockContentProps {
  block: Block;
  onUpdateBlock?: (id: string, updatedBlock: Block) => void;
}

const BlockContent: React.FC<BlockContentProps> = ({
  block,
  onUpdateBlock
}) => {
  // Handle TopicList rendering
  if (block.type === 'evaluation-container' && block.method === 'topic-list') {
    return (
      <TopicList
        topics={block.config?.topics || []}
        onRemoveTopic={(topic) => {
          if (block.config?.topics && onUpdateBlock) {
            const updatedTopics = block.config.topics.filter((t: TopicType) => t !== topic);
            onUpdateBlock(block.id, {
              ...block,
              config: {
                ...block.config,
                topics: updatedTopics
              }
            });
          }
        }}
      />
    );
  }

  // Handle Dashboard rendering
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
      </>
    );
  }

  // Handle Test Case rendering
  if (block.type === 'test-case') {
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
          <TestCaseFields format={block.testCaseFormat} />
        </div>
      </>
    );
  }

  // Handle Input block with file upload
  if (block.type === 'input') {
    return (
      <FileUpload
        fileName={block.config?.fileName}
        fileType={block.label?.toLowerCase() as 'csv' | 'xlsx'}
        onFileSelect={async (file) => {
          if (!onUpdateBlock) return;

          try {
            if (block.label?.toLowerCase() === 'csv') {
              const content = await file.text();
              onUpdateBlock(block.id, {
                ...block,
                method: 'csv',
                config: {
                  ...block.config,
                  data: content,
                  fileName: file.name
                }
              });
            } else if (block.label?.toLowerCase() === 'xlsx') {
              const content = await file.arrayBuffer();
              const base64 = btoa(
                new Uint8Array(content)
                  .reduce((data, byte) => data + String.fromCharCode(byte), '')
              );
              onUpdateBlock(block.id, {
                ...block,
                method: 'xlsx',
                config: {
                  ...block.config,
                  data: base64,
                  fileName: file.name
                }
              });
            }
          } catch (error) {
            console.error('Error reading file:', error);
          }
        }}
        onFileRemove={() => {
          if (!onUpdateBlock) return;

          onUpdateBlock(block.id, {
            ...block,
            config: {
              ...block.config,
              data: undefined,
              fileName: undefined
            }
          });
        }}
      />
    );
  }

  // Default block rendering
  return (
    <>
      <div className={styles.blockHeader}>
        <div className={styles.draggableBlockLeft}>
          {block.type === 'output-container' && (
            <MdDriveFolderUpload className={styles.outputIcon} />
          )}
          {block.type === 'topic' && (
            <FaLightbulb className={styles.blockIcon} />
          )}
          <span>{block.label}</span>
        </div>
        <div className={styles.dragIndicator}>
          <GrDrag />
        </div>
      </div>
      <div className={styles.blockMain} />
    </>
  );
};

export default BlockContent;