import { BuffId, PlayerStats, RunState, TileType } from '../core/GameTypes';

export interface RunBuffModifiers {
  oxygenCostMultiplier: number;
  backpackCapacityMultiplier: number;
  oreValueMultiplierBonus: number;
  digDamageBonus: number;
  stoneDigDamageBonus: number;
  rareOreBonus: number;
  deepBonusPerTenMeters: number;
}

const DEFAULT_MODIFIERS: RunBuffModifiers = {
  oxygenCostMultiplier: 1,
  backpackCapacityMultiplier: 1,
  oreValueMultiplierBonus: 0,
  digDamageBonus: 0,
  stoneDigDamageBonus: 0,
  rareOreBonus: 0,
  deepBonusPerTenMeters: 0,
};

const SELECTABLE_BUFFS: BuffId[] = [
  'oxygenSaver',
  'richVeins',
  'biggerBag',
  'fastPickaxe',
  'betterBuyer',
  'deepBonus',
  'stoneBreaker',
];

export class BuffManager {
  public chooseRandomBuffs(
    count = 3,
    random: () => number = Math.random,
    sourcePool: BuffId[] = SELECTABLE_BUFFS,
  ): BuffId[] {
    const pool = [...sourcePool];
    const result: BuffId[] = [];

    while (result.length < count && pool.length > 0) {
      const index = Math.floor(random() * pool.length);
      const [buff] = pool.splice(index, 1);
      result.push(buff);
    }

    return result;
  }

  public getModifiers(activeBuffs: BuffId[]): RunBuffModifiers {
    const modifiers = { ...DEFAULT_MODIFIERS };

    // 所有增益先汇总到 modifiers，消费端只读 modifiers，避免某个系统偷偷写特例。
    for (const buffId of activeBuffs) {
      if (buffId === 'oxygenSaver') {
        modifiers.oxygenCostMultiplier *= 0.8;
      } else if (buffId === 'richVeins') {
        modifiers.rareOreBonus += 0.12;
      } else if (buffId === 'biggerBag') {
        modifiers.backpackCapacityMultiplier *= 1.3;
      } else if (buffId === 'fastPickaxe') {
        modifiers.digDamageBonus += 1;
      } else if (buffId === 'betterBuyer') {
        modifiers.oreValueMultiplierBonus += 0.2;
      } else if (buffId === 'deepBonus') {
        modifiers.deepBonusPerTenMeters += 10;
      } else if (buffId === 'stoneBreaker') {
        modifiers.stoneDigDamageBonus += 2;
      }
    }

    return modifiers;
  }

  public applyToStats(stats: PlayerStats, activeBuffs: BuffId[]): PlayerStats {
    const modifiers = this.getModifiers(activeBuffs);

    return {
      ...stats,
      backpackCapacity: Math.floor(stats.backpackCapacity * modifiers.backpackCapacityMultiplier),
      oreValueMultiplier: stats.oreValueMultiplier + modifiers.oreValueMultiplierBonus,
    };
  }

  public getOxygenCost(baseCost: number, activeBuffs: BuffId[]): number {
    if (baseCost <= 0) {
      return 0;
    }

    const modifiers = this.getModifiers(activeBuffs);
    return Math.max(0, baseCost * modifiers.oxygenCostMultiplier);
  }

  public getDigDamage(baseDamage: number, activeBuffs: BuffId[], tileType: TileType): number {
    const modifiers = this.getModifiers(activeBuffs);
    const stoneBonus = tileType === 'stone' ? modifiers.stoneDigDamageBonus : 0;
    return baseDamage + modifiers.digDamageBonus + stoneBonus;
  }

  public getDeepBonus(run: RunState, activeBuffs: BuffId[]): number {
    const modifiers = this.getModifiers(activeBuffs);
    return Math.floor(run.depth / 10) * modifiers.deepBonusPerTenMeters;
  }
}

export const buffManager = new BuffManager();
