import { ContinuousPosition } from '../gameplay/terrain/TerrainTypes';

export interface TerrainViewportFrameRequest {
  playerPosition: ContinuousPosition;
  viewWidth: number;
  viewHeight: number;
  worldWidth: number;
  worldHeight: number;
  surfaceY: number;
}

export interface TerrainScreenRect {
  y: number;
  height: number;
}

export interface TerrainViewportFrame {
  center: ContinuousPosition;
  playerScreenPosition: ContinuousPosition;
  surfaceScreenY: number;
  soilRect: TerrainScreenRect;
}

const START_PLAYER_SCREEN_Y_RATIO = 0.28;

export function createTerrainViewportFrame(request: TerrainViewportFrameRequest): TerrainViewportFrame {
  const center = {
    x: request.playerPosition.x,
    y: Math.max(request.playerPosition.y, request.surfaceY + request.worldHeight * START_PLAYER_SCREEN_Y_RATIO),
  };
  const playerScreenPosition = toScreen(
    request.playerPosition,
    center,
    request.viewWidth,
    request.viewHeight,
    request.worldWidth,
    request.worldHeight,
  );
  const surfaceScreenY = toScreen(
    { x: request.playerPosition.x, y: request.surfaceY },
    center,
    request.viewWidth,
    request.viewHeight,
    request.worldWidth,
    request.worldHeight,
  ).y;
  const top = request.viewHeight / 2;
  const bottom = -request.viewHeight / 2;
  const soilTop = clamp(surfaceScreenY, bottom, top);
  const soilHeight = Math.max(0, soilTop - bottom);

  return {
    center,
    playerScreenPosition,
    surfaceScreenY,
    soilRect: {
      y: bottom + soilHeight / 2,
      height: soilHeight,
    },
  };
}

export function toTerrainScreen(
  position: ContinuousPosition,
  center: ContinuousPosition,
  viewWidth: number,
  viewHeight: number,
  worldWidth: number,
  worldHeight: number,
): ContinuousPosition {
  return toScreen(position, center, viewWidth, viewHeight, worldWidth, worldHeight);
}

function toScreen(
  position: ContinuousPosition,
  center: ContinuousPosition,
  viewWidth: number,
  viewHeight: number,
  worldWidth: number,
  worldHeight: number,
): ContinuousPosition {
  return {
    x: normalizeZero(((position.x - center.x) / worldWidth) * viewWidth),
    y: normalizeZero(-((position.y - center.y) / worldHeight) * viewHeight),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function normalizeZero(value: number): number {
  return Math.abs(value) < 0.000001 ? 0 : value;
}
