import { useCallback } from 'react';
import { Block } from '@/app/types';
import { checkLineIntersection } from '../utils/blockUtils';

export function useBlockOperations() {
    // Check if block is connected to center
    const isBlockConnected = useCallback(
        (block: Block, centerX: number, centerY: number, allBlocks: Block[]): boolean => {
            const otherBlocks = allBlocks.filter(b => b.id !== block.id);
            return !checkLineIntersection(
                block.position.x, block.position.y, centerX, centerY, otherBlocks
            );
        }, []
    );

    // Handle block movement
    const handleMove = useCallback((blocks: Block[], id: string, x: number, y: number) => {
        return blocks.map(block =>
            block.id === id ? { ...block, position: { x, y } } : block
        );
    }, []);

    // Handle block removal
    const handleRemove = useCallback((blocks: Block[], id: string) => {
        return blocks.filter(block => block.id !== id);
    }, []);

    // Handle block update
    const handleUpdateBlock = useCallback((blocks: Block[], id: string, updatedBlock: Block) => {
        return blocks.map(block => (block.id === id ? updatedBlock : block));
    }, []);

    // Adjust positions proportionally when board resizes
    const adjustBlockPositions = useCallback(
        (blocks: Block[],
            oldSize: { width: number; height: number },
            newSize: { width: number; height: number }) => {
            // Simply return the original blocks without any adjustment
            // This will prevent any repositioning during resize
            return blocks;

            /* Original code commented out:
            if (!oldSize.width || !oldSize.height || !newSize.width || !newSize.height ||
              (oldSize.width === newSize.width && oldSize.height === newSize.height)) {
              return blocks;
            }
            
            const widthRatio = newSize.width / oldSize.width;
            const heightRatio = newSize.height / oldSize.height;
            return blocks.map(block => ({
              ...block,
              position: {
                x: block.position.x * widthRatio,
                y: block.position.y * heightRatio
              }
            }));
            */
        }, []
    );

    return {
        isBlockConnected,
        handleMove,
        handleRemove,
        handleUpdateBlock,
        adjustBlockPositions
    };
}