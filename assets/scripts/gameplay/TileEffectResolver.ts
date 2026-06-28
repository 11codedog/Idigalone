import { RunState, TileType } from '../core/GameTypes';
import { TILE_CONFIG } from '../config/GameConfig';

export interface TileEffectResult {
  collectedOre?: TileType;
  recoveredOxygen: number;
  copperDelta: number;
  silverDelta: number;
  backpackUsedDelta: number;
}

export class TileEffectResolver {
  public canApply(tileType: TileType, run: RunState): boolean {
    const tileConfig = TILE_CONFIG[tileType];
    if (tileConfig.backpackSize <= 0) {
      return true;
    }

    return run.backpackUsed + tileConfig.backpackSize <= run.backpackCapacity;
  }

  public resolve(tileType: TileType, run: RunState): TileEffectResult {
    // Resolver 只计算 delta，不直接改 RunState；真正的状态写入统一交给 RunManager。
    const result: TileEffectResult = {
      recoveredOxygen: 0,
      copperDelta: 0,
      silverDelta: 0,
      backpackUsedDelta: 0,
    };

    if (tileType === 'copper') {
      result.collectedOre = 'copper';
      result.copperDelta = 1;
      result.backpackUsedDelta = TILE_CONFIG.copper.backpackSize;
      return result;
    }

    if (tileType === 'silver') {
      result.collectedOre = 'silver';
      result.silverDelta = 1;
      result.backpackUsedDelta = TILE_CONFIG.silver.backpackSize;
      return result;
    }

    const recoveredOxygen = TILE_CONFIG[tileType].oxygenRecover;
    if (recoveredOxygen > 0) {
      result.recoveredOxygen = Math.min(run.maxOxygen, run.oxygen + recoveredOxygen) - run.oxygen;
    }

    return result;
  }
}

export const tileEffectResolver = new TileEffectResolver();
