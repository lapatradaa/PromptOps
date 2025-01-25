import React from 'react';

/**
 * Merges multiple React refs into a single ref callback.
 * Useful when you need to apply multiple refs to a single element.
 * 
 * @param refs - Array of refs to merge (can be callback refs or MutableRefObjects)
 * @returns A callback ref that updates all provided refs
 */
export const mergeRefs = <T extends any>(
  ...refs: Array<React.MutableRefObject<T> | React.LegacyRef<T>>
): React.RefCallback<T> => {
  return (value) => {
    refs.forEach((ref) => {
      if (typeof ref === 'function') {
        ref(value);
      } else if (ref != null) {
        (ref as React.MutableRefObject<T | null>).current = value;
      }
    });
  };
};

/**
 * Calculates the angle between two points
 * 
 * @param x1 Start point x coordinate
 * @param y1 Start point y coordinate
 * @param x2 End point x coordinate
 * @param y2 End point y coordinate
 * @returns Angle in radians
 */
export const calculateAngle = (x1: number, y1: number, x2: number, y2: number): number => {
  return Math.atan2(y2 - y1, x2 - x1);
};

/**
 * Calculates the distance between two points
 * 
 * @param x1 Start point x coordinate
 * @param y1 Start point y coordinate
 * @param x2 End point x coordinate
 * @param y2 End point y coordinate
 * @returns Distance between the points
 */
export const calculateDistance = (x1: number, y1: number, x2: number, y2: number): number => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
};

/**
 * Generates SVG path data for a curved connection line
 * 
 * @param startX Start point x coordinate
 * @param startY Start point y coordinate
 * @param endX End point x coordinate
 * @param endY End point y coordinate
 * @param curvature Amount of curve (0-1)
 * @returns SVG path data string
 */
export const generateCurvedPath = (
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  curvature: number = 0.3
): string => {
  const dx = endX - startX;
  const dy = endY - startY;
  const controlX = startX + dx * 0.5;
  const controlY = startY + dy * 0.5 - (Math.abs(dx) * curvature);

  return `M ${startX} ${startY} Q ${controlX} ${controlY} ${endX} ${endY}`;
};

/**
 * Checks if a point is within a specified radius of a line
 * 
 * @param pointX Point x coordinate
 * @param pointY Point y coordinate
 * @param lineStartX Line start x coordinate
 * @param lineStartY Line start y coordinate
 * @param lineEndX Line end x coordinate
 * @param lineEndY Line end y coordinate
 * @param radius Distance threshold
 * @returns Boolean indicating if point is near line
 */
export const isPointNearLine = (
  pointX: number,
  pointY: number,
  lineStartX: number,
  lineStartY: number,
  lineEndX: number,
  lineEndY: number,
  radius: number
): boolean => {
  const A = pointX - lineStartX;
  const B = pointY - lineStartY;
  const C = lineEndX - lineStartX;
  const D = lineEndY - lineStartY;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = -1;

  if (lenSq !== 0) {
    param = dot / lenSq;
  }

  let xx, yy;

  if (param < 0) {
    xx = lineStartX;
    yy = lineStartY;
  } else if (param > 1) {
    xx = lineEndX;
    yy = lineEndY;
  } else {
    xx = lineStartX + param * C;
    yy = lineStartY + param * D;
  }

  const dx = pointX - xx;
  const dy = pointY - yy;

  return (dx * dx + dy * dy) <= radius * radius;
};