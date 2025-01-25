import { useState, useCallback } from 'react';
import { Block, TopicType } from '@/app/types';

export const useBlockUpdates = (initialBlocks: Block[] = []) => {
    const [blocks, setBlocks] = useState<Block[]>(initialBlocks);
    const [totalBlocks, setTotalBlocks] = useState(0);

    const handleBlocksUpdate = useCallback((updatedBlocks: Block[], newTotalBlocks: number) => {
        const apiBlocks = updatedBlocks.map(block => ({
            ...block,
            method: block.method || block.type,
            config: block.config || {}
        }));

        // console.log('Blocks updated:', {
        //     connected: apiBlocks.length,
        //     total: newTotalBlocks,
        //     blocks: apiBlocks
        // });

        setBlocks(apiBlocks);
        setTotalBlocks(newTotalBlocks);
    }, []);

    const handleRemoveBlock = useCallback((id: string) => {
        setBlocks(prevBlocks => prevBlocks.filter(block => block.id !== id));
    }, []);

    const handleUpdateBlock = useCallback((id: string, updatedBlock: Block) => {
        setBlocks(prevBlocks =>
            prevBlocks.map(block => (block.id === id ? updatedBlock : block))
        );
    }, []);

    const handleAddTopic = useCallback((containerId: string, topic: TopicType) => {
        setBlocks(prevBlocks =>
            prevBlocks.map(block => {
                if (block.id === containerId) {
                    const currentTopics = block.config?.topics || [];
                    if (!currentTopics.includes(topic)) {
                        return {
                            ...block,
                            method: 'topic-list',
                            config: {
                                ...block.config,
                                topics: [...currentTopics, topic]
                            }
                        };
                    }
                }
                return block;
            })
        );
    }, []);

    const handleRemoveTopic = useCallback((containerId: string, topic: TopicType) => {
        setBlocks(prevBlocks =>
            prevBlocks.map(block => {
                if (block.id === containerId && block.config?.topics) {
                    return {
                        ...block,
                        config: {
                            ...block.config,
                            topics: block.config.topics.filter((t: string) => t !== topic)
                        }
                    };
                }
                return block;
            })
        );
    }, []);

    const handleMoveBlock = useCallback((id: string, x: number, y: number) => {
        setBlocks(prevBlocks =>
            prevBlocks.map(block =>
                block.id === id ? { ...block, position: { x, y } } : block
            )
        );
    }, []);

    const handleClearBlocks = useCallback(() => {
        setBlocks([]);
        setTotalBlocks(0);
    }, []);

    const getConnectedBlocks = useCallback(() => {
        return blocks.filter(block => block.config?.isConnected);
    }, [blocks]);

    return {
        blocks,
        totalBlocks,
        handleBlocksUpdate,
        handleRemoveBlock,
        handleUpdateBlock,
        handleAddTopic,
        handleRemoveTopic,
        handleMoveBlock,
        handleClearBlocks,
        getConnectedBlocks
    };
};

export type UseBlockUpdatesReturn = ReturnType<typeof useBlockUpdates>;