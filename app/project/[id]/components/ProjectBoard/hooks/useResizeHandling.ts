import { useEffect, useState, useRef } from 'react';
import { Block } from '@/app/types';

export function useResizeHandling(
    containerRef: React.RefObject<HTMLDivElement>,
    adjustPositions: (blocks: Block[], oldSize: any, newSize: any) => Block[],
    blocks: Block[],
    setBlocks: React.Dispatch<React.SetStateAction<Block[]>>
) {
    const [boardSize, setBoardSize] = useState({ width: 0, height: 0 });
    const prevSizeRef = useRef(boardSize);
    const initialSizeSetRef = useRef(false);
    const isDevToolsChangeRef = useRef(false);
    const lastUpdateTimeRef = useRef(0);

    useEffect(() => {
        const updateSize = () => {
            if (!containerRef.current) return;

            const newSize = {
                width: containerRef.current.offsetWidth,
                height: containerRef.current.offsetHeight,
            };

            const oldSize = prevSizeRef.current;
            const now = Date.now();

            // Check if this might be a DevTools panel change
            // DevTools usually causes rapid consecutive resizes
            if (now - lastUpdateTimeRef.current < 500) {
                isDevToolsChangeRef.current = true;
            } else if (now - lastUpdateTimeRef.current > 1000) {
                isDevToolsChangeRef.current = false;
            }

            lastUpdateTimeRef.current = now;

            // Only update if significant change and not likely from DevTools
            const significantChange =
                Math.abs(newSize.width - oldSize.width) > 5 ||
                Math.abs(newSize.height - oldSize.height) > 5;

            if (significantChange) {
                setBoardSize(newSize);

                // Adjust block positions only if:
                // 1. We've already set the initial size
                // 2. The board had valid size before
                // 3. This doesn't appear to be a DevTools change
                if (initialSizeSetRef.current &&
                    oldSize.width > 10 &&
                    oldSize.height > 10 &&
                    !isDevToolsChangeRef.current) {
                    setBlocks(prev => adjustPositions(prev, oldSize, newSize));
                }

                // If this is our first valid size, mark initial size as set
                if (!initialSizeSetRef.current && newSize.width > 10 && newSize.height > 10) {
                    initialSizeSetRef.current = true;
                }

                prevSizeRef.current = newSize;
            }
        };

        // Set up ResizeObserver
        const resizeObserver = new ResizeObserver(() => {
            window.requestAnimationFrame(updateSize);
        });

        if (containerRef.current) {
            resizeObserver.observe(containerRef.current);
        }

        // Listen for window resize too
        window.addEventListener('resize', updateSize);

        // Initial size update
        updateSize();

        return () => {
            resizeObserver.disconnect();
            window.removeEventListener('resize', updateSize);
        };
    }, [adjustPositions, containerRef, setBlocks]);

    return { boardSize };
}