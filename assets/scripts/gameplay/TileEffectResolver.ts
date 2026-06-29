import { OreType, RunState, TileType } from '../core/GameTypes';
import { isOreType, TILE_CONFIG } from '../config/GameConfig';
import { InventoryDelta } from '../skill/InventoryCalculator';

export interface TileEffectResult {
  collectedOre?: OreType;
  recoveredOxygen: number;
  inventoryDelta: InventoryDelta;
}

export class TileEffectResolver {
  public resolve(tileType: TileType, run: RunState): TileEffectResult {
    const result: TileEffectResult = {
      recoveredOxygen: 0,
      inventoryDelta: {},
    };

    if (isOreType(tileType)) {
      result.collectedOre = tileType;
      result.inventoryDelta[tileType] = 1;
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
