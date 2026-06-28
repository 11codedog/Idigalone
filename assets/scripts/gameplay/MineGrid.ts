import { GridPosition, TileType } from '../core/GameTypes';
import { RUN_CONFIG, TILE_CONFIG } from '../config/GameConfig';

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

type RandomSource = () => number;

export class MineGrid {
  public readonly width: number;
  public readonly generatedDepth: number;
  public readonly centerX: number;

  private readonly random: RandomSource;
  private readonly tiles = new Map<string, MineTile>();
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

  public setGenerationOptions(options: Partial<MineGenerationOptions>): void {
    this.generationOptions = {
      ...this.generationOptions,
      ...options,
    };
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

    const depth = position.y;
    const stoneChance = Math.min(0.35, 0.08 + depth * 0.003);
    const oxygenChance = depth >= RUN_CONFIG.oxygenPackMinDepth ? RUN_CONFIG.oxygenPackChance : 0;
    const silverChance =
      depth < 8
        ? 0
        : Math.min(0.35, 0.04 + depth * 0.002 + this.generationOptions.rareOreBonus);
    const copperChance = Math.min(0.32, 0.18 + depth * 0.001);
    const chances = this.normalizeChances({
      silver: silverChance,
      copper: copperChance,
      oxygen: oxygenChance,
      stone: stoneChance,
    });
    const roll = this.random();

    if (roll < chances.silver) {
      return this.createTile('silver');
    }

    if (roll < chances.silver + chances.copper) {
      return this.createTile('copper');
    }

    if (roll < chances.silver + chances.copper + chances.oxygen) {
      return this.createTile('oxygen');
    }

    if (roll < chances.silver + chances.copper + chances.oxygen + chances.stone) {
      return this.createTile('stone');
    }

    return this.createTile('dirt');
  }

  private createTile(type: TileType): MineTile {
    return {
      type,
      hardnessRemaining: TILE_CONFIG[type].hardness,
    };
  }

  private normalizeChances(chances: {
    silver: number;
    copper: number;
    oxygen: number;
    stone: number;
  }): { silver: number; copper: number; oxygen: number; stone: number } {
    // 深度和增益叠加后概率可能超过 1；归一化保证泥土/石头分布不会被静默挤压。
    const total = chances.silver + chances.copper + chances.oxygen + chances.stone;
    if (total <= 1) {
      return chances;
    }

    return {
      silver: chances.silver / total,
      copper: chances.copper / total,
      oxygen: chances.oxygen / total,
      stone: chances.stone / total,
    };
  }

  private getKey(position: GridPosition): string {
    return `${position.x}:${position.y}`;
  }
}
