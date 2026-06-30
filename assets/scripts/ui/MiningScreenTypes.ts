import type { BuffId, RunState, SaveData, UpgradeId } from '../core/GameTypes';
import type { CoinBreakdown } from '../gameplay/RunManager';
import type { ContinuousRunManager } from '../gameplay/ContinuousRunManager';

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
  coinBreakdown: CoinBreakdown;
  inventorySavedSlots: number;
  reason: string;
}

export interface MiningScreenModel {
  screen: MiningScreenState;
  save: SaveData;
  pendingBuffChoices: BuffId[];
  rewardReason: string;
  runManager: ContinuousRunManager | null;
  lastSettlement: SettlementSnapshot | null;
  lastLog: string;
  inputHint: string;
}

export interface MiningScreenActions {
  showHome(): void;
  showUpgrade(): void;
  showSkills(): void;
  showPause(): void;
  startRun(): void;
  chooseRewardBuff(buffId: BuffId): void;
  returnToSurface(): void | Promise<void>;
  sellAtSurface(): void | Promise<void>;
  resumeRun(): void;
  confirmAbandonRun(): void;
  buyUpgrade(upgradeId: UpgradeId): void | Promise<void>;
}
