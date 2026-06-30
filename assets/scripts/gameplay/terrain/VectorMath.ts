import { InputVector, Vec2Like } from './TerrainTypes';

export function normalizeVector(vector: Vec2Like): Vec2Like {
  const length = getVectorLength(vector);
  if (length <= 0) {
    return { x: 0, y: 0 };
  }

  return {
    x: vector.x / length,
    y: vector.y / length,
  };
}

export function vectorFromAngle(radians: number): Vec2Like {
  return {
    x: Math.cos(radians),
    y: Math.sin(radians),
  };
}

export function createInputVector(vector: Vec2Like, deadZone: number): InputVector {
  const length = getVectorLength(vector);
  const safeDeadZone = Math.max(0, deadZone);
  if (length <= safeDeadZone) {
    return { x: 0, y: 0, strength: 0 };
  }

  const direction = normalizeVector(vector);
  return {
    x: direction.x,
    y: direction.y,
    strength: Math.min(1, length / Math.max(1, safeDeadZone)),
  };
}

export function getVectorLength(vector: Vec2Like): number {
  return Math.sqrt(vector.x * vector.x + vector.y * vector.y);
}
