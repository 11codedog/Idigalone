import { ORE_TYPES, RUN_CONFIG } from '../config/GameConfig';
import { OreType } from '../core/GameTypes';
import { CONTINUOUS_RUN_CONFIG } from './ContinuousRunTypes';
import { DigBrushResult } from './terrain/DigBrushResolver';

export function getContinuousActionOxygenCost(
  playerDepth: number,
  deltaTime: number,
  digResult: DigBrushResult | undefined,
): number {
  const undergroundCost = playerDepth > RUN_CONFIG.surfaceDepth
    ? CONTINUOUS_RUN_CONFIG.undergroundOxygenPerSecond * deltaTime
    : 0;
  const digCost = (digResult?.oxygenCost ?? 0) * CONTINUOUS_RUN_CONFIG.digOxygenMultiplier;
  return undergroundCost + digCost;
}

export function getFirstCollectedOre(digResult: DigBrushResult | undefined): OreType | undefined {
  if (!digResult) {
    return undefined;
  }

  return ORE_TYPES.find((oreType) => (digResult.inventoryDelta[oreType] ?? 0) > 0);
}
