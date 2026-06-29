import type { BuffId, GridPosition, RunState, SaveData, UpgradeId } from '../core/GameTypes';
import type { MoveDirection, RunManager } from '../gameplay/RunManager';

export type MiningScreenState =
  | 'loading'
  | 'home'
  | 'buffSelect'
  | 'running'
  | 'pause'
  | 'settlement'
  | 'upgrade'
  | 'skills';

export interface SettlementSnapshot {
  run: RunState;
  earnedCoins: number;
  reason: string;
}

export interface MiningScreenModel {
  screen: MiningScreenState;
  save: SaveData;
  pendingBuffChoices: BuffId[];
  selectedBuff: BuffId | null;
  runManager: RunManager | null;
  lastSettlement: SettlementSnapshot | null;
  lastActionPosition: GridPosition | null;
  lastLog: string;
  inputHint: string;
}

export interface MiningScreenActions {
  showHome(): void;
  showBuffSelect(): void;
  showUpgrade(): void;
  showSkills(): void;
  showPause(): void;
  startRun(buffId: BuffId): void;
  move(direction: MoveDirection): void;
  returnToSurface(): void | Promise<void>;
  sellAtSurface(): void | Promise<void>;
  resumeRun(): void;
  confirmAbandonRun(): void;
  buyUpgrade(upgradeId: UpgradeId): void | Promise<void>;
}
