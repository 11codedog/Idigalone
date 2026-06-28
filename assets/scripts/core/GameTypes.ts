export type GamePhase = 'boot' | 'home' | 'running' | 'paused' | 'settlement';

export type TileType = 'empty' | 'dirt' | 'stone' | 'copper' | 'silver' | 'oxygen';

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

export interface RunInventory {
  copper: number;
  silver: number;
}

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

// RunState / SaveData 只能从这里克隆，避免新增字段时多个手写副本漏改。
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
