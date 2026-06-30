import { OreType } from '../../core/GameTypes';

export type TerrainMaterial = 'air' | 'dirt' | 'stone' | 'oxygen' | OreType;

export interface Vec2Like {
  x: number;
  y: number;
}

export interface InputVector extends Vec2Like {
  strength: number;
}

export interface ContinuousPosition extends Vec2Like {}

export interface TerrainSample {
  material: TerrainMaterial;
  hardness: number;
}

export interface TerrainSampleCoordinate {
  x: number;
  y: number;
}

export interface RemovedTerrainSample {
  coordinate: TerrainSampleCoordinate;
  material: TerrainMaterial;
  units: number;
}

export interface TerrainDigDelta {
  removedSamples: RemovedTerrainSample[];
}
