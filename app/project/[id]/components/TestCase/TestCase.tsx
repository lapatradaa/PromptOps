import React from 'react';
import { useDrop } from 'react-dnd';

import { FaTrashAlt } from 'react-icons/fa';

import styles from './TestCase.module.css';
import DraggableBlock from "@/app/project/[id]/components/SidebarBlock/SidebarBlock";

interface TestCaseProps {
    openMenuItem: string | null;
    handleMenuItemClick: (item: string) => void;
    isDraggingBlock: boolean;
}

// Separate RemoveZone component
const RemoveZone = ({ isDragging }: { isDragging: boolean }) => {
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
            className={`${styles.emptyArea} ${isDragging ? styles.showRemoveZone : ''} ${isOver ? styles.removeZoneActive : ''
                }`}
        >
            <FaTrashAlt className={styles.trashIcon} />
            <span>{isOver ? 'Drop to Remove' : 'Drag here to remove'}</span>
        </div>
    );
};

const TestCase: React.FC<TestCaseProps> = ({
    openMenuItem,
    handleMenuItemClick,
    isDraggingBlock,
}) => {
    return (
        <>
            <div className={styles.menuList}>
                <RemoveZone isDragging={isDraggingBlock} />
                <div
                    className={`${styles.menuItem} ${openMenuItem === 'icqa' ? styles.active : ''}`}
                    onClick={() => handleMenuItemClick('icqa')}
                >
                    <span>ICQA Format</span>
                </div>
                {openMenuItem === 'icqa' && (
                    <div className={styles.dropdownContent}>
                        <DraggableBlock 
                            type='test-case'
                            testCaseFormat='ICQA Format'
                            shotType='Zero Shot'
                        />
                    </div>
                )}
                {openMenuItem === 'icqa' && (
                    <div className={styles.dropdownContent}>
                        <DraggableBlock 
                            type='test-case'
                            testCaseFormat='ICQA Format'
                            shotType='One Shot'
                        />
                    </div>
                )}
                {openMenuItem === 'icqa' && (
                    <div className={styles.dropdownContent}>
                        <DraggableBlock 
                            type='test-case'
                            testCaseFormat='ICQA Format'
                            shotType='Few Shot'
                        />
                    </div>
                )}

                <div
                    className={`${styles.menuItem} ${openMenuItem === 'std' ? styles.active : ''}`}
                    onClick={() => handleMenuItemClick('std')}
                >
                    Standard
                </div>
                {openMenuItem === 'std' && (
                    <div className={styles.dropdownContent}>
                        <DraggableBlock 
                            type='test-case'
                            testCaseFormat='Standard'
                            shotType='Zero Shot'
                        />
                    </div>
                )}
                {openMenuItem === 'std' && (
                    <div className={styles.dropdownContent}>
                        <DraggableBlock 
                            type='test-case'
                            testCaseFormat='Standard'
                            shotType='One Shot'
                        />
                    </div>
                )}
                {openMenuItem === 'std' && (
                    <div className={styles.dropdownContent}>
                        <DraggableBlock 
                            type='test-case'
                            testCaseFormat='Standard'
                            shotType='Few Shot'
                        />
                    </div>
                )}

                <div
                    className={`${styles.menuItem} ${openMenuItem === 'cot' ? styles.active : ''}`}
                    onClick={() => handleMenuItemClick('cot')}
                >
                    Chain-of-Thought
                </div>
                {openMenuItem === 'cot' && (
                    <div className={styles.dropdownContent}>
                        <DraggableBlock 
                            type='test-case'
                            testCaseFormat='Chain-of-Thought'
                            shotType='Zero Shot'
                        />
                    </div>
                )}
                {openMenuItem === 'cot' && (
                    <div className={styles.dropdownContent}>
                        <DraggableBlock 
                            type='test-case'
                            testCaseFormat='Chain-of-Thought'
                            shotType='One Shot'
                        />
                    </div>
                )}
                {openMenuItem === 'cot' && (
                    <div className={styles.dropdownContent}>
                        <DraggableBlock 
                            type='test-case'
                            testCaseFormat='Chain-of-Thought'
                            shotType='Few Shot'
                        />
                    </div>
                )}
            </div>
        </>
    );
};

export default TestCase;