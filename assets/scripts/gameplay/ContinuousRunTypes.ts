import { BuffId, OreType, RunState } from '../core/GameTypes';
import { DigBrushResult } from './terrain/DigBrushResolver';
import { ContinuousPosition } from './terrain/TerrainTypes';
import type { CoinBreakdown, RunEndReason } from './RunManager';

export type ContinuousRunActionType = 'idle' | 'move' | 'dig' | 'ended';

export interface ContinuousRunActionResult {
  type: ContinuousRunActionType;
  position: ContinuousPosition;
  run: RunState;
  collectedOre?: OreType;
  digResult?: DigBrushResult;
  endedReason?: RunEndReason;
  earnedCoins?: number;
  coinBreakdown?: CoinBreakdown;
  inventorySavedSlots?: number;
  rewardChoices?: BuffId[];
  rewardReason?: string;
}

export const CONTINUOUS_RUN_CONFIG = {
  moveSpeedPerSecond: 3.2,
  digRadius: 0.38,
  undergroundOxygenPerSecond: 0.18,
  digOxygenMultiplier: 0.08,
  blockedMoveRatio: 0,
} as const;
