import { Block } from '@/app/types';

const BLOCK_DIMENSIONS = {
  width: 250,
  height: 80,
  padding: 2
};

export const areBlocksOverlapping = (block1: Block, block2: Block): boolean => {
  const { width, height, padding } = BLOCK_DIMENSIONS;

  const block1Left = block1.position.x - width / 2 - padding;
  const block1Right = block1.position.x + width / 2 + padding;
  const block1Top = block1.position.y - height / 2 - padding;
  const block1Bottom = block1.position.y + height / 2 + padding;

  const block2Left = block2.position.x - width / 2 - padding;
  const block2Right = block2.position.x + width / 2 + padding;
  const block2Top = block2.position.y - height / 2 - padding;
  const block2Bottom = block2.position.y + height / 2 + padding;

  return !(
    block1Right < block2Left ||
    block1Left > block2Right ||
    block1Bottom < block2Top ||
    block1Top > block2Bottom
  );
};

const checkBlockIntersections = (
  lineStartX: number,
  lineStartY: number,
  lineEndX: number,
  lineEndY: number,
  blocks: Block[]
): boolean => {
  const { width, height, padding } = BLOCK_DIMENSIONS;

  return blocks.some(block => {
    const blockLeft = block.position.x - width / 2 - padding;
    const blockRight = block.position.x + width / 2 + padding;
    const blockTop = block.position.y - height / 2 - padding;
    const blockBottom = block.position.y + height / 2 + padding;

    // Special handling for vertical lines
    if (Math.abs(lineStartX - lineEndX) < 1) {
      const isInXRange = lineStartX >= blockLeft && lineStartX <= blockRight;
      const isInYRange = (
        Math.min(lineStartY, lineEndY) <= blockBottom &&
        Math.max(lineStartY, lineEndY) >= blockTop
      );
      return isInXRange && isInYRange;
    }

    // Special handling for horizontal lines
    if (Math.abs(lineStartY - lineEndY) < 1) {
      const isInYRange = lineStartY >= blockTop && lineStartY <= blockBottom;
      const isInXRange = (
        Math.min(lineStartX, lineEndX) <= blockRight &&
        Math.max(lineStartX, lineEndX) >= blockLeft
      );
      return isInXRange && isInYRange;
    }

    // For diagonal lines
    const slope = (lineEndY - lineStartY) / (lineEndX - lineStartX);
    const yIntercept = lineStartY - slope * lineStartX;

    // Check all four corners of the block
    const corners = [
      { x: blockLeft, y: blockTop },
      { x: blockRight, y: blockTop },
      { x: blockLeft, y: blockBottom },
      { x: blockRight, y: blockBottom }
    ];

    // Check if line intersects any block edge
    for (let i = 0; i < corners.length; i++) {
      const corner = corners[i];
      const nextCorner = corners[(i + 1) % corners.length];

      // Calculate line intersection with block edge
      const expectedY = slope * corner.x + yIntercept;
      const isInYRange = expectedY >= Math.min(corner.y, nextCorner.y) &&
                        expectedY <= Math.max(corner.y, nextCorner.y);
      const isInXRange = corner.x >= Math.min(lineStartX, lineEndX) &&
                        corner.x <= Math.max(lineStartX, lineEndX);

      if (isInXRange && isInYRange) {
        return true;
      }
    }

    return false;
  });
};

export const checkLineIntersection = (
  lineStartX: number,
  lineStartY: number,
  lineEndX: number,
  lineEndY: number,
  blocks: Block[]
): boolean => {
  const otherBlocks = blocks.filter(b => {
    return !(Math.abs(b.position.x - lineStartX) < 1 && Math.abs(b.position.y - lineStartY) < 1);
  });

  // First check for overlapping blocks
  for (let i = 0; i < otherBlocks.length; i++) {
    for (let j = i + 1; j < otherBlocks.length; j++) {
      if (areBlocksOverlapping(otherBlocks[i], otherBlocks[j])) {
        return true;
      }
    }
  }

  return checkBlockIntersections(lineStartX, lineStartY, lineEndX, lineEndY, otherBlocks);
};