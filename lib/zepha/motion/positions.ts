import { BOTTOM_UI_OFFSET, EDGE_MARGIN, ZEPHA_SIZE } from '../config';
import type { ZephaPositions } from '../types';

export function buildZephaPositions(width: number, height: number): ZephaPositions {
  const leftWallX = EDGE_MARGIN;
  const rightWallX = Math.max(EDGE_MARGIN, width - ZEPHA_SIZE - EDGE_MARGIN);
  const topWallY = EDGE_MARGIN;
  const bottomWallY = Math.max(topWallY, height - ZEPHA_SIZE - BOTTOM_UI_OFFSET);

  return {
    leftWallX,
    rightWallX,
    topWallY,
    bottomWallY,
    getSleepPosition: () => ({ x: leftWallX, y: topWallY }),
    getLightWakePosition: () => ({ x: leftWallX, y: topWallY + 2 }),
    getIdleHomePosition: () => ({ x: leftWallX, y: bottomWallY }),
    getGuardPosition: () => ({ x: rightWallX, y: bottomWallY }),
    getWatchPosition: () => ({
      x: Math.max(leftWallX + 40, rightWallX - 56),
      y: bottomWallY,
    }),
    getCuriousPosition: () => ({
      x: Math.max(leftWallX + 55, Math.min(rightWallX - 90, width * 0.42)),
      y: Math.max(topWallY + 80, bottomWallY - 110),
    }),
    getGuardMidwayPosition: () => ({
      x: Math.max(leftWallX + 90, Math.min(rightWallX - 120, width * 0.62)),
      y: bottomWallY,
    }),
    getOfferAnchor: () => ({
      x: rightWallX + 14,
      y: topWallY + 8,
    }),
  };
}