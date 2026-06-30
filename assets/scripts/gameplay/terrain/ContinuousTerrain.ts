import { getAvailableOreTypes, getOreWeight, TILE_CONFIG } from '../../config/GameConfig';
import { OreType } from '../../core/GameTypes';
import {
  ContinuousPosition,
  TerrainDigDelta,
  TerrainMaterial,
  TerrainSample,
  TerrainSampleCoordinate,
} from './TerrainTypes';
import { TERRAIN_CONFIG } from './TerrainConfig';

export interface ContinuousTerrainOptions {
  seed: number;
}

const GOLDEN_RATIO_32 = 0x9e3779b9;

export class ContinuousTerrain {
  private readonly seed: number;
  private readonly materialOverrides = new Map<string, TerrainMaterial>();

  public constructor(options: ContinuousTerrainOptions) {
    this.seed = Math.max(1, Math.floor(options.seed));
  }

  public sample(position: ContinuousPosition): TerrainSample {
    if (position.y <= TERRAIN_CONFIG.surfaceY) {
      return {
        material: 'air',
        hardness: 0,
      };
    }

    const coordinate = this.getSampleCoordinate(position);
    return this.sampleAtCoordinate(coordinate);
  }

  public sampleAtCoordinate(coordinate: TerrainSampleCoordinate): TerrainSample {
    if (coordinate.y <= this.toSampleCoordinate(TERRAIN_CONFIG.surfaceY)) {
      return {
        material: 'air',
        hardness: 0,
      };
    }

    const key = this.getKey(coordinate);
    const material = this.materialOverrides.get(key) ?? this.generateMaterial(
      coordinate.x,
      coordinate.y,
      this.getSampleCenter(coordinate).y,
    );
    return {
      material,
      hardness: this.getHardness(material),
    };
  }

  public getSampleCoordinate(position: ContinuousPosition): TerrainSampleCoordinate {
    return {
      x: this.toSampleCoordinate(position.x),
      y: this.toSampleCoordinate(position.y),
    };
  }

  public getSampleCenter(coordinate: TerrainSampleCoordinate): ContinuousPosition {
    return {
      x: (coordinate.x + 0.5) * TERRAIN_CONFIG.sampleSize,
      y: (coordinate.y + 0.5) * TERRAIN_CONFIG.sampleSize,
    };
  }

  public applyDigDelta(delta: TerrainDigDelta): void {
    for (const removedSample of delta.removedSamples) {
      this.materialOverrides.set(this.getKey(removedSample.coordinate), 'air');
    }
  }

  private generateMaterial(sampleX: number, sampleY: number, depth: number): TerrainMaterial {
    const oxygenChance = depth >= TERRAIN_CONFIG.oxygenMinDepth ? TERRAIN_CONFIG.oxygenChance : 0;
    const oreChance = Math.min(
      TERRAIN_CONFIG.maxOreChance,
      TERRAIN_CONFIG.baseOreChance + depth * TERRAIN_CONFIG.oreChanceDepthGrowth,
    );
    const stoneChance = Math.min(
      TERRAIN_CONFIG.maxStoneChance,
      TERRAIN_CONFIG.baseStoneChance + depth * TERRAIN_CONFIG.stoneChanceDepthGrowth,
    );
    const roll = this.randomAt(sampleX, sampleY, 101);

    if (roll < oxygenChance) {
      return 'oxygen';
    }

    if (roll < oxygenChance + oreChance) {
      return this.pickOreType(depth, this.randomAt(sampleX, sampleY, 102));
    }

    if (roll < oxygenChance + oreChance + stoneChance) {
      return 'stone';
    }

    return 'dirt';
  }

  private pickOreType(depth: number, rollRatio: number): OreType {
    const availableOres = getAvailableOreTypes(depth);
    if (availableOres.length === 0) {
      return 'copper';
    }

    const totalWeight = availableOres.reduce((sum, oreType) => sum + getOreWeight(oreType, depth), 0);
    let roll = rollRatio * totalWeight;
    for (const oreType of availableOres) {
      roll -= getOreWeight(oreType, depth);
      if (roll <= 0) {
        return oreType;
      }
    }

    return availableOres[availableOres.length - 1];
  }

  private getHardness(material: TerrainMaterial): number {
    if (material === 'air') {
      return 0;
    }

    return TILE_CONFIG[material].hardness;
  }

  private toSampleCoordinate(value: number): number {
    return Math.floor(value / TERRAIN_CONFIG.sampleSize);
  }

  private getKey(coordinate: TerrainSampleCoordinate): string {
    return `${coordinate.x}:${coordinate.y}`;
  }

  private randomAt(x: number, y: number, salt: number): number {
    return this.hashToUint32(x, y, salt) / 0x100000000;
  }

  private hashToUint32(x: number, y: number, salt: number): number {
    let hash = this.mixUint32(this.seed + GOLDEN_RATIO_32 + (salt >>> 0));
    hash ^= this.mixUint32((x >>> 0) + GOLDEN_RATIO_32);
    hash = this.mixUint32(hash);
    hash ^= this.mixUint32((y >>> 0) + 0x85ebca6b);
    return this.mixUint32(hash);
  }

  private mixUint32(value: number): number {
    let hash = value >>> 0;
    hash = Math.imul(hash ^ (hash >>> 16), 0x7feb352d);
    hash = Math.imul(hash ^ (hash >>> 15), 0x846ca68b);
    return (hash ^ (hash >>> 16)) >>> 0;
  }
}
