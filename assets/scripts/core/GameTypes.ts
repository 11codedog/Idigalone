export type GamePhase = 'boot' | 'home' | 'running' | 'paused' | 'settlement';

export type OreType =
  | 'copper'
  | 'coal'
  | 'tin'
  | 'iron'
  | 'silver'
  | 'gold'
  | 'emerald'
  | 'crystal'
  | 'ruby'
  | 'obsidian';

export type TileType = 'empty' | 'dirt' | 'stone' | 'oxygen' | OreType;

export type UpgradeId = 'pickaxe' | 'oxygenTank' | 'backpack' | 'oreValue';

export type BuffId =
  | 'oxygenSaver'
  | 'richVeins'
  | 'biggerBag'
  | 'fastPickaxe'
  | 'betterBuyer'
  | 'deepBonus'
  | 'stoneBreaker';

export interface GridPosition {
  x: number;
  y: number;
}

export interface TileDefinition {
  type: TileType;
  displayName: string;
  hardness: number;
  oxygenCost: number;
  oreValue: number;
  backpackSize: number;
  oxygenRecover: number;
}

export interface PlayerStats {
  pickaxeLevel: number;
  maxOxygen: number;
  backpackCapacity: number;
  oreValueMultiplier: number;
}

export type RunInventory = Record<OreType, number>;

export interface RunState {
  depth: number;
  oxygen: number;
  maxOxygen: number;
  backpackUsed: number;
  backpackCapacity: number;
  coinsPreview: number;
  inventory: RunInventory;
  activeBuffs: BuffId[];
}

export interface SaveData {
  version: number;
  coins: number;
  upgrades: Record<UpgradeId, number>;
  bestDepth: number;
}

export interface GameEvents {
  phaseChanged: { phase: GamePhase };
  runStarted: { run: RunState };
  runUpdated: { run: RunState };
  runEnded: { run: RunState; earnedCoins: number };
  saveChanged: { save: SaveData };
}

export function createEmptyInventory(): RunInventory {
  return {
    copper: 0,
    coal: 0,
    tin: 0,
    iron: 0,
    silver: 0,
    gold: 0,
    emerald: 0,
    crystal: 0,
    ruby: 0,
    obsidian: 0,
  };
}

export function cloneSaveData(save: SaveData): SaveData {
  return {
    version: save.version,
    coins: save.coins,
    bestDepth: save.bestDepth,
    upgrades: { ...save.upgrades },
  };
}

export function cloneRunState(run: RunState): RunState {
  return {
    depth: run.depth,
    oxygen: run.oxygen,
    maxOxygen: run.maxOxygen,
    backpackUsed: run.backpackUsed,
    backpackCapacity: run.backpackCapacity,
    coinsPreview: run.coinsPreview,
    inventory: { ...run.inventory },
    activeBuffs: [...run.activeBuffs],
  };
}
