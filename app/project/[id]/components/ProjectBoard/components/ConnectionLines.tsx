import React from 'react';
import { Block } from '@/app/types';
import styles from '../ProjectBoard.module.css';

interface ConnectionLinesProps {
    blocks: Block[];
    centerX: number;
    centerY: number;
    isConnected: (block: Block, centerX: number, centerY: number, blocks: Block[]) => boolean;
}

const ConnectionLines: React.FC<ConnectionLinesProps> = ({
    blocks, centerX, centerY, isConnected
}) => (
    <svg className={styles.connections}>
        {blocks.map(block => {
            const connected = isConnected(block, centerX, centerY, blocks);
            const lineClass = `${styles.connectionLine} ${connected ? styles.connected : ''}`;

            return (
                <line
                    key={block.id}
                    x1={block.position.x}
                    y1={block.position.y}
                    x2={centerX}
                    y2={centerY}
                    className={lineClass}
                />
            );
        })}
    </svg>
);

export default ConnectionLines;