import { ORE_TYPES, RUN_CONFIG, TILE_CONFIG } from '../config/GameConfig';
import { BuffId, PlayerStats, RunState } from '../core/GameTypes';
import { BuffManager } from './BuffManager';
import type { CoinBreakdown, OreCoinBreakdown } from './RunManager';

export function calculateContinuousCoinBreakdown(
  run: RunState,
  stats: PlayerStats,
  activeBuffs: BuffId[],
  buffs: BuffManager,
): CoinBreakdown {
  const ores = ORE_TYPES
    .map((oreType): OreCoinBreakdown => {
      const count = run.inventory[oreType];
      const unitValue = TILE_CONFIG[oreType].oreValue;
      return {
        oreType,
        displayName: TILE_CONFIG[oreType].displayName,
        count,
        unitValue,
        totalValue: count * unitValue,
      };
    })
    .filter((ore) => ore.count > 0);
  const oreValue = ores.reduce((sum, ore) => sum + ore.totalValue, 0);
  const depthBonus = Math.floor(run.depth / 20) * RUN_CONFIG.depthBonusPerTwentyMeters;
  const multipliedValue = Math.floor((oreValue + depthBonus) * stats.oreValueMultiplier);
  const deepBonus = buffs.getDeepBonus(run, activeBuffs);
  return {
    ores,
    oreValue,
    depthBonus,
    oreValueMultiplier: stats.oreValueMultiplier,
    multipliedValue,
    deepBonus,
    total: multipliedValue + deepBonus,
  };
}
