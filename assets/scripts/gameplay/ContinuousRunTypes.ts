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
  oreMagnetRadius: 0.8,
  undergroundOxygenPerSecond: 0.18,
  digOxygenMultiplier: 0.08,
  blockedMoveRatio: 0,
  maxInputDeltaTime: 0.12,
  maxSimulationStepDistance: 0.16,
  /** 矿石渲染上限：避免大量矿石同屏时性能下降 */
  maxRenderedOreSprites: 140,
} as const;
