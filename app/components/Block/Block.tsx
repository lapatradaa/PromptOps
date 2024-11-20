import { RiBook2Fill, RiEyeFill, RiFlag2Fill, RiQuestionAnswerFill } from 'react-icons/ri';
import { HiQuestionMarkCircle } from 'react-icons/hi'
import { GrDrag } from 'react-icons/gr';
import { FaLightbulb, FaList } from 'react-icons/fa';
import { MdDriveFolderUpload, MdQueue } from 'react-icons/md';
import { TiThLarge } from 'react-icons/ti'

import { useDrag } from 'react-dnd';

import styles from './Block.module.css';
import { BlockProps, TestCaseFormat } from './types';

const DraggableBlock = ({
    type,
    label,
    isContainer,
    topicType,
    testCaseFormat,
    shotType
}: BlockProps) => {
    const [{ isDragging }, drag] = useDrag(() => ({
        type: 'file',
        item: { type, label, topicType, testCaseFormat, shotType },
        collect: (monitor) => ({
            isDragging: monitor.isDragging()
        }),
        previewOptions: {
            captureDraggingState: true,
        },
    }));

    const blockClassName = `
        ${styles.blockContainer}
        ${isDragging ? styles.dragging : ''}
        ${type === 'evaluation-container' ? styles.evaluationContainer : ''}
        ${type === 'topic' ? styles.topicContainer : ''}
        ${type === 'dashboard' ? styles.dashboardContainer : ''}
        ${type === 'output-container' ? styles.outputContainer : ''}
        ${type === 'input' ? styles.uploadBlock : ''}
        ${type === 'test-case' ? styles.testCaseBlock : ''}
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
        if (type === 'dashboard') {
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

        if (type === 'test-case') {
            return (
                <>
                    <div className={`${styles.blockHeader}`}>
                        <div className={styles.draggableBlockLeft}>
                            <TiThLarge className={styles.blockIcon} />
                        </div>
                        <div className={styles.testCaseInfo}>
                            <span className={styles.shotType}>{shotType}</span>
                            <span className={styles.testFormat}>{testCaseFormat}</span>
                        </div>
                        <div className={styles.dragIndicator}>
                            <GrDrag />
                        </div>
                    </div>
                    <div className={styles.blockMain}>
                        {renderTestCaseFields(testCaseFormat)}
                    </div>
                </>
            );
        }

        return (
            <>
                <div className={styles.blockHeader}>
                    <div className={styles.draggableBlockLeft}>
                        {type === 'evaluation-container' && <FaList className={styles.evaluationIcon} />}
                        {type === 'output-container' && <MdDriveFolderUpload className={styles.outputIcon} />}
                        {type === 'topic' && <FaLightbulb className={styles.blockIcon} />}
                        {type === 'input' && <MdDriveFolderUpload className={styles.blockIcon} />}
                        <span>{label}</span>
                    </div>
                    <div className={styles.dragIndicator}>
                        <GrDrag />
                    </div>
                </div>
                <div className={styles.blockMain}>
                    {(type === 'input') && (
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
                opacity: isDragging ? 0.5 : 1,
            }}
        >
            {renderBlockContent()}
        </div>
    );
};

export default DraggableBlock;