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
  radius: number;
  richness: number;
}

type RandomSource = () => number;

export class MineGrid {
  public readonly width: number;
  public readonly generatedDepth: number;
  public readonly centerX: number;

  private readonly random: RandomSource;
  private readonly tiles = new Map<string, MineTile>();
  private readonly veinsByDepth = new Map<number, OreVein | null>();
  private generationOptions: MineGenerationOptions = {
    rareOreBonus: 0,
  };

  public constructor(
    width = RUN_CONFIG.gridWidth,
    generatedDepth = RUN_CONFIG.generatedDepth,
    random: RandomSource = Math.random,
  ) {
    this.width = width;
    this.generatedDepth = generatedDepth;
    this.centerX = Math.floor(width / 2);
    this.random = random;
  }

  public isInBounds(position: GridPosition): boolean {
    return position.x >= 0 && position.x < this.width && position.y >= 0 && position.y <= this.generatedDepth;
  }

  public reset(): void {
    this.tiles.clear();
    this.veinsByDepth.clear();
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

    const key = this.getKey(position);
    let tile = this.tiles.get(key);
    if (!tile) {
      tile = this.generateTile(position);
      this.tiles.set(key, tile);
    }

    return { ...tile };
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
      return {
        tile: damagedTile,
        broken: false,
      };
    }

    this.tiles.set(key, this.createTile('empty'));
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
  }

  private generateTile(position: GridPosition): MineTile {
    if (position.y === 0) {
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
    const roll = this.random();

    if (roll < backgroundOreChance) {
      return this.createTile(this.pickOreType(depth));
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
    const vein = this.getVein(position.y);
    if (!vein) {
      return null;
    }

    const distance = Math.abs(position.x - vein.centerX);
    if (distance > vein.radius) {
      return null;
    }

    const distancePenalty = distance / (vein.radius + 1);
    const chance = Math.max(0.12, vein.richness * (1 - distancePenalty));
    return this.random() < chance ? vein.oreType : null;
  }

  private getVein(depth: number): OreVein | null {
    if (this.veinsByDepth.has(depth)) {
      return this.veinsByDepth.get(depth) ?? null;
    }

    const chance = Math.min(
      0.58,
      RUN_CONFIG.veinBaseChance + depth * RUN_CONFIG.veinDepthChanceGrowth + this.generationOptions.rareOreBonus,
    );
    if (this.random() > chance) {
      this.veinsByDepth.set(depth, null);
      return null;
    }

    const vein: OreVein = {
      oreType: this.pickOreType(depth),
      centerX: Math.floor(this.random() * this.width),
      radius: depth >= 60 ? 2 : 1,
      richness: Math.min(0.82, 0.48 + depth * 0.002),
    };
    this.veinsByDepth.set(depth, vein);
    return vein;
  }

  private pickOreType(depth: number): OreType {
    const availableOres = getAvailableOreTypes(depth);
    if (availableOres.length === 0) {
      return 'copper';
    }

    const totalWeight = availableOres.reduce((sum, oreType) => sum + getOreWeight(oreType, depth), 0);
    let roll = this.random() * totalWeight;
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

  private getKey(position: GridPosition): string {
    return `${position.x}:${position.y}`;
  }
}
