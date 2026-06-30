import {
  BuffId,
  OreType,
  PlayerStats,
  SaveData,
  TileDefinition,
  TileType,
  UpgradeId,
} from '../core/GameTypes';

export const SAVE_VERSION = 1;

export const DEFAULT_SAVE_DATA: SaveData = {
  version: SAVE_VERSION,
  coins: 0,
  bestDepth: 0,
  upgrades: {
    pickaxe: 1,
    oxygenTank: 1,
    backpack: 1,
    oreValue: 1,
  },
};

export const ORE_TYPES: OreType[] = [
  'copper',
  'coal',
  'tin',
  'iron',
  'silver',
  'gold',
  'emerald',
  'crystal',
  'ruby',
  'obsidian',
];

export interface OreDepthConfig {
  type: OreType;
  minDepth: number;
  baseWeight: number;
  depthWeightGrowth: number;
}

export const ORE_DEPTH_CONFIG: Record<OreType, OreDepthConfig> = {
  copper: {
    type: 'copper',
    minDepth: 1,
    baseWeight: 80,
    depthWeightGrowth: 0.2,
  },
  coal: {
    type: 'coal',
    minDepth: 8,
    baseWeight: 56,
    depthWeightGrowth: 0.18,
  },
  tin: {
    type: 'tin',
    minDepth: 16,
    baseWeight: 46,
    depthWeightGrowth: 0.2,
  },
  iron: {
    type: 'iron',
    minDepth: 28,
    baseWeight: 42,
    depthWeightGrowth: 0.24,
  },
  silver: {
    type: 'silver',
    minDepth: 42,
    baseWeight: 28,
    depthWeightGrowth: 0.2,
  },
  gold: {
    type: 'gold',
    minDepth: 65,
    baseWeight: 16,
    depthWeightGrowth: 0.16,
  },
  crystal: {
    type: 'crystal',
    minDepth: 105,
    baseWeight: 9,
    depthWeightGrowth: 0.12,
  },
  emerald: {
    type: 'emerald',
    minDepth: 82,
    baseWeight: 12,
    depthWeightGrowth: 0.13,
  },
  ruby: {
    type: 'ruby',
    minDepth: 135,
    baseWeight: 7,
    depthWeightGrowth: 0.1,
  },
  obsidian: {
    type: 'obsidian',
    minDepth: 165,
    baseWeight: 5,
    depthWeightGrowth: 0.08,
  },
};

export const TILE_CONFIG: Record<TileType, TileDefinition> = {
  empty: {
    type: 'empty',
    displayName: '空地',
    hardness: 0,
    oxygenCost: 0,
    oreValue: 0,
    backpackSize: 0,
    oxygenRecover: 0,
  },
  dirt: {
    type: 'dirt',
    displayName: '泥土',
    hardness: 1,
    oxygenCost: 1,
    oreValue: 0,
    backpackSize: 0,
    oxygenRecover: 0,
  },
  stone: {
    type: 'stone',
    displayName: '石头',
    hardness: 2,
    oxygenCost: 2,
    oreValue: 0,
    backpackSize: 0,
    oxygenRecover: 0,
  },
  copper: {
    type: 'copper',
    displayName: '铜矿',
    hardness: 1,
    oxygenCost: 1,
    oreValue: 5,
    backpackSize: 1,
    oxygenRecover: 0,
  },
  coal: {
    type: 'coal',
    displayName: '煤矿',
    hardness: 1,
    oxygenCost: 1,
    oreValue: 8,
    backpackSize: 1,
    oxygenRecover: 0,
  },
  tin: {
    type: 'tin',
    displayName: '锡矿',
    hardness: 1,
    oxygenCost: 1,
    oreValue: 10,
    backpackSize: 1,
    oxygenRecover: 0,
  },
  iron: {
    type: 'iron',
    displayName: '铁矿',
    hardness: 2,
    oxygenCost: 2,
    oreValue: 13,
    backpackSize: 1,
    oxygenRecover: 0,
  },
  silver: {
    type: 'silver',
    displayName: '银矿',
    hardness: 2,
    oxygenCost: 2,
    oreValue: 18,
    backpackSize: 1,
    oxygenRecover: 0,
  },
  gold: {
    type: 'gold',
    displayName: '金矿',
    hardness: 3,
    oxygenCost: 3,
    oreValue: 38,
    backpackSize: 2,
    oxygenRecover: 0,
  },
  emerald: {
    type: 'emerald',
    displayName: '翡翠矿',
    hardness: 3,
    oxygenCost: 3,
    oreValue: 55,
    backpackSize: 2,
    oxygenRecover: 0,
  },
  crystal: {
    type: 'crystal',
    displayName: '水晶',
    hardness: 3,
    oxygenCost: 3,
    oreValue: 78,
    backpackSize: 2,
    oxygenRecover: 0,
  },
  ruby: {
    type: 'ruby',
    displayName: '红宝矿',
    hardness: 4,
    oxygenCost: 4,
    oreValue: 115,
    backpackSize: 3,
    oxygenRecover: 0,
  },
  obsidian: {
    type: 'obsidian',
    displayName: '黑曜矿',
    hardness: 4,
    oxygenCost: 4,
    oreValue: 150,
    backpackSize: 3,
    oxygenRecover: 0,
  },
  oxygen: {
    type: 'oxygen',
    displayName: '氧气包',
    hardness: 1,
    oxygenCost: 1,
    oreValue: 0,
    backpackSize: 0,
    oxygenRecover: 12,
  },
};

export interface UpgradeConfig {
  id: UpgradeId;
  displayName: string;
  baseCost: number;
  costGrowth: number;
  maxLevel: number;
}

export const UPGRADE_CONFIG: Record<UpgradeId, UpgradeConfig> = {
  pickaxe: {
    id: 'pickaxe',
    displayName: '矿镐',
    baseCost: 100,
    costGrowth: 1.8,
    maxLevel: 20,
  },
  oxygenTank: {
    id: 'oxygenTank',
    displayName: '氧气瓶',
    baseCost: 80,
    costGrowth: 1.7,
    maxLevel: 20,
  },
  backpack: {
    id: 'backpack',
    displayName: '背包',
    baseCost: 90,
    costGrowth: 1.75,
    maxLevel: 20,
  },
  oreValue: {
    id: 'oreValue',
    displayName: '矿石手册',
    baseCost: 120,
    costGrowth: 1.9,
    maxLevel: 20,
  },
};

export interface BuffConfig {
  id: BuffId;
  displayName: string;
  description: string;
}

export const BUFF_CONFIG: Record<BuffId, BuffConfig> = {
  oxygenSaver: {
    id: 'oxygenSaver',
    displayName: '省氧达人',
    description: '本局氧气消耗降低。',
  },
  richVeins: {
    id: 'richVeins',
    displayName: '富矿嗅觉',
    description: '本局矿脉出现率提升。',
  },
  biggerBag: {
    id: 'biggerBag',
    displayName: '大背包',
    description: '本局背包容量提升。',
  },
  fastPickaxe: {
    id: 'fastPickaxe',
    displayName: '快速矿镐',
    description: '本局所有矿块更容易挖开。',
  },
  betterBuyer: {
    id: 'betterBuyer',
    displayName: '高价出货',
    description: '本局矿石售价提升。',
  },
  deepBonus: {
    id: 'deepBonus',
    displayName: '深层奖金',
    description: '每到固定深度获得额外金币。',
  },
  stoneBreaker: {
    id: 'stoneBreaker',
    displayName: '破石专家',
    description: '本局挖石头时额外强力。',
  },
};

export const BASE_PLAYER_STATS = {
  maxOxygen: 60,
  backpackCapacity: 10,
  oreValueMultiplier: 1,
};

export const RUN_CONFIG = {
  surfaceDepth: 0,
  gridWidth: 9,
  generatedDepth: 220,
  moveOxygenCost: 1,
  oxygenPerTankLevel: 10,
  backpackSlotsPerLevel: 3,
  oreValueMultiplierPerLevel: 0.1,
  oxygenPackMinDepth: 4,
  oxygenPackChance: 0.06,
  depthBonusPerTwentyMeters: 6,
  veinBaseChance: 0.18,
  veinDepthChanceGrowth: 0.0012,
  backgroundOreChance: 0.1,
};

export function isOreType(tileType: TileType): tileType is OreType {
  return ORE_TYPES.indexOf(tileType as OreType) >= 0;
}

export function getAvailableOreTypes(depth: number): OreType[] {
  return ORE_TYPES.filter((oreType) => depth >= ORE_DEPTH_CONFIG[oreType].minDepth);
}

export function getOreWeight(oreType: OreType, depth: number): number {
  const config = ORE_DEPTH_CONFIG[oreType];
  if (depth < config.minDepth) {
    return 0;
  }

  return config.baseWeight + (depth - config.minDepth) * config.depthWeightGrowth;
}

export function getUpgradeCost(upgradeId: UpgradeId, currentLevel: number): number {
  const config = UPGRADE_CONFIG[upgradeId];
  return Math.floor(config.baseCost * Math.pow(config.costGrowth, Math.max(0, currentLevel - 1)));
}

export function getPlayerStats(save: SaveData): PlayerStats {
  return {
    pickaxeLevel: save.upgrades.pickaxe,
    maxOxygen:
      BASE_PLAYER_STATS.maxOxygen +
      Math.max(0, save.upgrades.oxygenTank - 1) * RUN_CONFIG.oxygenPerTankLevel,
    backpackCapacity:
      BASE_PLAYER_STATS.backpackCapacity +
      Math.max(0, save.upgrades.backpack - 1) * RUN_CONFIG.backpackSlotsPerLevel,
    oreValueMultiplier:
      BASE_PLAYER_STATS.oreValueMultiplier +
      Math.max(0, save.upgrades.oreValue - 1) * RUN_CONFIG.oreValueMultiplierPerLevel,
  };
}
