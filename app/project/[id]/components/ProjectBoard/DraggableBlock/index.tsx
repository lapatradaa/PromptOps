import React from 'react';
import { useDrag } from 'react-dnd';

import BlockContent from './BlockContent';
import { Block, DropResult } from '@/app/types';

import styles from './DraggableBlock.module.css';

interface DraggableBlockProps {
    block: Block;
    onMove: (id: string, x: number, y: number) => void;
    onRemove: (id: string) => void;
    onUpdateBlock?: (id: string, updatedBlock: Block) => void;
    onDashboardClick?: () => void;
}

const DraggableBlock: React.FC<DraggableBlockProps> = ({
    block,
    onMove,
    onRemove,
    onUpdateBlock,
    onDashboardClick
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
            />
        </div>
    );
};

export default DraggableBlock;