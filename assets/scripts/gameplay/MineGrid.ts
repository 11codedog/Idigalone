import { GridPosition, OreType, TileType } from '../core/GameTypes';
import {
  getAvailableOreTypes,
  getOreWeight,
  RUN_CONFIG,
  TILE_CONFIG,
} from '../config/GameConfig';

export interface MineTile {
  type: TileType;
  hardnessRemaining: number;
}

export interface DigResult {
  tile: MineTile;
  broken: boolean;
}

export interface MineGenerationOptions {
  rareOreBonus: number;
}

interface OreVein {
  oreType: OreType;
  centerX: number;
  centerY: number;
  radiusX: number;
  radiusY: number;
  slope: number;
  richness: number;
}

type RandomSource = () => number;

const ORE_VEIN_CHUNK_WIDTH = 12;
const ORE_VEIN_CHUNK_HEIGHT = 8;
const GOLDEN_RATIO_32 = 0x9e3779b9;

export const MAX_CACHED_TILES = 10000;
export const MAX_CACHED_VEINS = 4096;

export interface MineGridCacheStats {
  tiles: number;
  veins: number;
  maxTiles: number;
  maxVeins: number;
}

export class MineGrid {
  public readonly width: number;
  public readonly generatedDepth: number;
  public readonly centerX = 0;

  private readonly seed: number;
  private readonly tiles = new Map<string, MineTile>();
  private readonly veinsByChunk = new Map<string, OreVein | null>();
  private generationOptions: MineGenerationOptions = {
    rareOreBonus: 0,
  };

  public constructor(
    visibleWidth = RUN_CONFIG.gridWidth,
    generatedDepth = RUN_CONFIG.generatedDepth,
    random: RandomSource = Math.random,
  ) {
    this.width = visibleWidth;
    this.generatedDepth = generatedDepth;
    this.seed = Math.max(1, Math.floor(random() * 0x7fffffff));
  }

  public isInBounds(position: GridPosition): boolean {
    return position.y >= RUN_CONFIG.surfaceDepth && position.y <= this.generatedDepth;
  }

  public getCacheStats(): MineGridCacheStats {
    return {
      tiles: this.tiles.size,
      veins: this.veinsByChunk.size,
      maxTiles: MAX_CACHED_TILES,
      maxVeins: MAX_CACHED_VEINS,
    };
  }

  public reset(): void {
    this.tiles.clear();
    this.veinsByChunk.clear();
  }

  public setGenerationOptions(options: Partial<MineGenerationOptions>): void {
    this.generationOptions = {
      ...this.generationOptions,
      ...options,
    };
    this.reset();
  }

  public getTile(position: GridPosition): MineTile {
    if (!this.isInBounds(position)) {
      return this.createTile('stone');
    }

    const cachedTile = this.tiles.get(this.getKey(position));
    if (cachedTile) {
      return { ...cachedTile };
    }

    return this.generateTile(position);
  }

  public dig(position: GridPosition, damage: number): DigResult {
    if (!this.isInBounds(position)) {
      return {
        tile: this.createTile('stone'),
        broken: false,
      };
    }

    const key = this.getKey(position);
    const tile = this.getTile(position);

    if (tile.type === 'empty') {
      return {
        tile,
        broken: true,
      };
    }

    const nextHardness = Math.max(0, tile.hardnessRemaining - Math.max(1, damage));
    if (nextHardness > 0) {
      const damagedTile = {
        ...tile,
        hardnessRemaining: nextHardness,
      };
      this.tiles.set(key, damagedTile);
      this.trimTileCacheAround(position);
      return {
        tile: damagedTile,
        broken: false,
      };
    }

    this.tiles.set(key, this.createTile('empty'));
    this.trimTileCacheAround(position);
    return {
      tile,
      broken: true,
    };
  }

  public setTile(position: GridPosition, type: TileType): void {
    if (!this.isInBounds(position)) {
      return;
    }

    this.tiles.set(this.getKey(position), this.createTile(type));
    this.trimTileCacheAround(position);
  }

  private generateTile(position: GridPosition): MineTile {
    if (position.y === RUN_CONFIG.surfaceDepth) {
      return this.createTile('empty');
    }

    const veinOre = this.tryGenerateVeinOre(position);
    if (veinOre) {
      return this.createTile(veinOre);
    }

    const depth = position.y;
    const oxygenChance = depth >= RUN_CONFIG.oxygenPackMinDepth ? RUN_CONFIG.oxygenPackChance : 0;
    const backgroundOreChance = Math.min(
      0.22,
      RUN_CONFIG.backgroundOreChance + depth * 0.0008 + this.generationOptions.rareOreBonus * 0.4,
    );
    const stoneChance = Math.min(0.42, 0.08 + depth * 0.0025);
    const roll = this.randomAt(position.x, position.y, 101);

    if (roll < backgroundOreChance) {
      return this.createTile(this.pickOreType(depth, this.randomAt(position.x, position.y, 102)));
    }

    if (roll < backgroundOreChance + oxygenChance) {
      return this.createTile('oxygen');
    }

    if (roll < backgroundOreChance + oxygenChance + stoneChance) {
      return this.createTile('stone');
    }

    return this.createTile('dirt');
  }

  private tryGenerateVeinOre(position: GridPosition): OreType | null {
    const chunkX = this.getChunkX(position.x);
    const chunkY = this.getChunkY(position.y);

    for (let yOffset = -1; yOffset <= 1; yOffset += 1) {
      for (let xOffset = -1; xOffset <= 1; xOffset += 1) {
        const vein = this.getVein(chunkX + xOffset, chunkY + yOffset);
        if (!vein || !this.isInsideVein(position, vein)) {
          continue;
        }

        const localCenterX = this.getVeinCenterXAtDepth(vein, position.y);
        const distanceX = Math.abs(position.x - localCenterX) / Math.max(1, vein.radiusX);
        const distanceY = Math.abs(position.y - vein.centerY) / Math.max(1, vein.radiusY);
        const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);
        const chance = Math.max(0.12, vein.richness * (1 - distance * 0.65));
        if (this.randomAt(position.x, position.y, 201) < chance) {
          return vein.oreType;
        }
      }
    }

    return null;
  }

  private getVein(chunkX: number, chunkY: number): OreVein | null {
    if (chunkY < 0) {
      return null;
    }

    const key = `${chunkX}:${chunkY}`;
    if (this.veinsByChunk.has(key)) {
      return this.veinsByChunk.get(key) ?? null;
    }

    const depth = chunkY * ORE_VEIN_CHUNK_HEIGHT + Math.ceil(ORE_VEIN_CHUNK_HEIGHT / 2);
    const chance = Math.min(
      0.58,
      RUN_CONFIG.veinBaseChance + depth * RUN_CONFIG.veinDepthChanceGrowth + this.generationOptions.rareOreBonus,
    );
    if (this.randomAt(chunkX, chunkY, 301) > chance) {
      this.veinsByChunk.set(key, null);
      this.trimVeinCacheAround(chunkX, chunkY);
      return null;
    }

    const radiusBoost = depth >= 60 ? 1 : 0;
    const vein: OreVein = {
      oreType: this.pickOreType(depth, this.randomAt(chunkX, chunkY, 302)),
      centerX: chunkX * ORE_VEIN_CHUNK_WIDTH + Math.floor(this.randomAt(chunkX, chunkY, 303) * ORE_VEIN_CHUNK_WIDTH),
      centerY: chunkY * ORE_VEIN_CHUNK_HEIGHT + 1 + Math.floor(this.randomAt(chunkX, chunkY, 304) * ORE_VEIN_CHUNK_HEIGHT),
      radiusX: 2 + radiusBoost,
      radiusY: 1 + (depth >= 90 ? 1 : 0),
      slope: this.createVeinSlope(chunkX, chunkY, depth),
      richness: Math.min(0.82, 0.48 + (depth / this.generatedDepth) * 0.34),
    };
    this.veinsByChunk.set(key, vein);
    this.trimVeinCacheAround(chunkX, chunkY);
    return vein;
  }

  private isInsideVein(position: GridPosition, vein: OreVein): boolean {
    const localCenterX = this.getVeinCenterXAtDepth(vein, position.y);
    const distanceX = Math.abs(position.x - localCenterX) / Math.max(1, vein.radiusX);
    const distanceY = Math.abs(position.y - vein.centerY) / Math.max(1, vein.radiusY);
    return distanceX * distanceX + distanceY * distanceY <= 1;
  }

  private getVeinCenterXAtDepth(vein: OreVein, y: number): number {
    return vein.centerX + (y - vein.centerY) * vein.slope;
  }

  private createVeinSlope(chunkX: number, chunkY: number, depth: number): number {
    const maxSlope = depth >= 80 ? 0.55 : 0.35;
    return (this.randomAt(chunkX, chunkY, 305) * 2 - 1) * maxSlope;
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

  private createTile(type: TileType): MineTile {
    return {
      type,
      hardnessRemaining: TILE_CONFIG[type].hardness,
    };
  }

  private getChunkX(x: number): number {
    return Math.floor(x / ORE_VEIN_CHUNK_WIDTH);
  }

  private getChunkY(y: number): number {
    return Math.floor(Math.max(0, y - 1) / ORE_VEIN_CHUNK_HEIGHT);
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

  private trimTileCacheAround(center: GridPosition): void {
    if (this.tiles.size <= MAX_CACHED_TILES) {
      return;
    }

    const targetSize = Math.floor(MAX_CACHED_TILES * 0.85);
    const entries = Array.from(this.tiles.keys()).map((key) => {
      const position = this.parseKey(key);
      return {
        key,
        distance: Math.abs(position.x - center.x) + Math.abs(position.y - center.y),
      };
    });
    entries.sort((a, b) => b.distance - a.distance);

    for (let index = 0; this.tiles.size > targetSize && index < entries.length; index += 1) {
      this.tiles.delete(entries[index].key);
    }
  }

  private trimVeinCacheAround(centerChunkX: number, centerChunkY: number): void {
    if (this.veinsByChunk.size <= MAX_CACHED_VEINS) {
      return;
    }

    const targetSize = Math.floor(MAX_CACHED_VEINS * 0.85);
    const entries = Array.from(this.veinsByChunk.keys()).map((key) => {
      const position = this.parseKey(key);
      return {
        key,
        distance: Math.abs(position.x - centerChunkX) + Math.abs(position.y - centerChunkY),
      };
    });
    entries.sort((a, b) => b.distance - a.distance);

    for (let index = 0; this.veinsByChunk.size > targetSize && index < entries.length; index += 1) {
      this.veinsByChunk.delete(entries[index].key);
    }
  }

  private parseKey(key: string): GridPosition {
    const separatorIndex = key.indexOf(':');
    return {
      x: Number(key.slice(0, separatorIndex)),
      y: Number(key.slice(separatorIndex + 1)),
    };
  }

  private getKey(position: GridPosition): string {
    return `${position.x}:${position.y}`;
  }
}
