import { getPlayerStats, ORE_TYPES, RUN_CONFIG } from '../config/GameConfig';
import { gameState, GameState } from '../core/GameState';
import {
  BuffId,
  cloneRunState,
  cloneSaveData,
  createEmptyInventory,
  OreType,
  PlayerStats,
  RunState,
  SaveData,
} from '../core/GameTypes';
import { inventoryCalculator, InventoryCalculator } from '../skill/InventoryCalculator';
import { buffManager, BuffManager } from './BuffManager';
import { getContinuousActionOxygenCost, getFirstCollectedOre } from './ContinuousRunActionResolver';
import { calculateContinuousCoinBreakdown } from './ContinuousRunEconomy';
import { ContinuousRunRewardTracker } from './ContinuousRunRewardTracker';
import { ContinuousTerrain } from './terrain/ContinuousTerrain';
import { DigBrushResolver, DigBrushResult } from './terrain/DigBrushResolver';
import { ContinuousPosition, InputVector, TerrainMaterial } from './terrain/TerrainTypes';
import { normalizeVector } from './terrain/VectorMath';
import { CONTINUOUS_RUN_CONFIG, ContinuousRunActionResult, ContinuousRunActionType } from './ContinuousRunTypes';
import type { CoinBreakdown, RunEndReason } from './RunManager';

export type { ContinuousRunActionResult, ContinuousRunActionType } from './ContinuousRunTypes';

export class ContinuousRunManager {
  public readonly terrain: ContinuousTerrain;

  private readonly state: GameState;
  private readonly buffs: BuffManager;
  private readonly resolver: DigBrushResolver;
  private readonly inventory: InventoryCalculator;
  private readonly rewards: ContinuousRunRewardTracker;
  private positionValue: ContinuousPosition = { x: 0, y: 0 };
  private statsValue: PlayerStats | null = null;
  private saveValue: SaveData | null = null;
  private activeBuffsValue: BuffId[] = [];
  private runValue: RunState | null = null;

  public constructor(
    state: GameState = gameState,
    terrain = new ContinuousTerrain({ seed: Math.floor(Math.random() * 0x7fffffff) }),
    buffs = buffManager,
    resolver = new DigBrushResolver(),
    inventory = inventoryCalculator,
    rewards = new ContinuousRunRewardTracker(),
  ) {
    this.state = state;
    this.terrain = terrain;
    this.buffs = buffs;
    this.resolver = resolver;
    this.inventory = inventory;
    this.rewards = rewards;
  }

  public get playerPosition(): ContinuousPosition {
    return { ...this.positionValue };
  }

  public get run(): RunState | null {
    return this.runValue ? cloneRunState(this.runValue) : null;
  }

  public start(
    save: SaveData = this.state.save,
    activeBuffs: BuffId[] = [],
    startPosition: ContinuousPosition = { x: 0, y: 0 },
  ): RunState {
    const baseSave = cloneSaveData(save);
    const stats = this.buffs.applyToStats(getPlayerStats(save), activeBuffs);
    const run: RunState = {
      depth: Math.max(0, Math.floor(startPosition.y)),
      oxygen: stats.maxOxygen,
      maxOxygen: stats.maxOxygen,
      backpackUsed: 0,
      backpackCapacity: stats.backpackCapacity,
      coinsPreview: 0,
      inventory: createEmptyInventory(),
      activeBuffs: [...activeBuffs],
    };

    this.saveValue = baseSave;
    this.statsValue = stats;
    this.activeBuffsValue = [...activeBuffs];
    this.positionValue = { ...startPosition };
    this.runValue = run;
    this.rewards.reset();
    this.refreshCoinsPreview();
    this.state.startRun(run);
    return cloneRunState(run);
  }

  public applyInput(input: InputVector, deltaTime: number): ContinuousRunActionResult {
    const run = this.requireRun();
    const safeDeltaTime = Math.max(0, deltaTime);
    if (safeDeltaTime <= 0 || input.strength <= 0) {
      return this.createResult('idle');
    }

    const direction = normalizeVector(input);
    if (direction.x === 0 && direction.y === 0) {
      return this.createResult('idle');
    }

    const distance = CONTINUOUS_RUN_CONFIG.moveSpeedPerSecond * Math.min(1, input.strength) * safeDeltaTime;
    const target = {
      x: this.positionValue.x + direction.x * distance,
      y: this.positionValue.y + direction.y * distance,
    };
    const targetSample = this.terrain.sample(target);
    let actionType: ContinuousRunActionType = 'move';
    let digResult: DigBrushResult | undefined;
    let moveRatio = 1;

    if (targetSample.material !== 'air') {
      actionType = 'dig';
      digResult = this.digAt(target, targetSample.material);
      moveRatio = digResult.removedMaterialUnits > 0 ? 1 : CONTINUOUS_RUN_CONFIG.blockedMoveRatio;
      this.applyDigResult(digResult);
    }

    this.positionValue = {
      x: this.positionValue.x + direction.x * distance * moveRatio,
      y: this.positionValue.y + direction.y * distance * moveRatio,
    };
    this.consumeOxygen(getContinuousActionOxygenCost(this.positionValue.y, safeDeltaTime, digResult));
    this.refreshDepth();
    this.refreshCoinsPreview();
    const collectedOre = getFirstCollectedOre(digResult);
    this.rewards.tryCreateCollectionReward(collectedOre, run, this.activeBuffsValue, this.buffs);
    this.syncRun();

    if (run.oxygen <= 0) {
      return this.endRun('oxygenDepleted', digResult, collectedOre);
    }

    const pendingReward = this.rewards.pendingReward;
    return {
      type: actionType,
      position: this.playerPosition,
      run: cloneRunState(run),
      collectedOre,
      digResult,
      rewardChoices: pendingReward?.choices,
      rewardReason: pendingReward?.reason,
    };
  }

  public returnToSurface(): ContinuousRunActionResult {
    return this.endRun('manualSettlement');
  }

  public sellAtSurface(): ContinuousRunActionResult {
    if (this.positionValue.y > RUN_CONFIG.surfaceDepth) {
      return this.createResult('idle');
    }

    return this.endRun('surfaceSell');
  }

  public abandonRun(): RunState | null {
    if (!this.runValue) {
      this.state.abandonRun('home');
      return null;
    }

    const abandonedRun = cloneRunState(this.runValue);
    this.runValue = null;
    this.state.abandonRun('home');
    return abandonedRun;
  }

  public chooseRewardBuff(buffId: BuffId): RunState | null {
    const pendingReward = this.rewards.acceptChoice(buffId);
    if (!pendingReward) {
      return null;
    }

    const run = this.requireRun();
    if (this.activeBuffsValue.indexOf(buffId) < 0) {
      this.activeBuffsValue.push(buffId);
    }

    run.activeBuffs = [...this.activeBuffsValue];
    this.refreshStatsFromActiveBuffs();
    this.refreshCoinsPreview();
    this.syncRun();
    return cloneRunState(run);
  }

  public calculateCoins(run: RunState): number {
    return this.calculateCoinBreakdown(run).total;
  }

  public calculateCoinBreakdown(run: RunState): CoinBreakdown {
    return calculateContinuousCoinBreakdown(run, this.requireStats(), this.activeBuffsValue, this.buffs);
  }

  private digAt(position: ContinuousPosition, material: Exclude<TerrainMaterial, 'air'>): DigBrushResult {
    const stats = this.requireStats();
    const digPower = this.buffs.getDigDamage(stats.pickaxeLevel, this.activeBuffsValue, material);
    return this.resolver.resolve(this.terrain, {
      center: position,
      radius: CONTINUOUS_RUN_CONFIG.digRadius,
      digPower,
    });
  }

  private applyDigResult(result: DigBrushResult): void {
    const run = this.requireRun();
    this.terrain.applyDigDelta(result.digDelta);
    for (const oreType of ORE_TYPES) {
      run.inventory[oreType] += result.inventoryDelta[oreType] ?? 0;
    }
    run.backpackUsed = this.inventory.calculateUsage(run.inventory).usedSlots;
  }

  private consumeOxygen(amount: number): void {
    const run = this.requireRun();
    const actualCost = this.buffs.getOxygenCost(Math.max(0, amount), this.activeBuffsValue);
    run.oxygen = Math.max(0, run.oxygen - actualCost);
  }

  private refreshDepth(): void {
    const run = this.requireRun();
    run.depth = Math.max(run.depth, Math.floor(this.positionValue.y));
  }

  private refreshCoinsPreview(): void {
    const run = this.requireRun();
    run.coinsPreview = this.calculateCoins(run);
  }

  private syncRun(): void {
    this.state.updateRun(cloneRunState(this.requireRun()));
  }

  private endRun(
    endedReason: RunEndReason,
    digResult?: DigBrushResult,
    collectedOre?: OreType,
  ): ContinuousRunActionResult {
    const run = this.requireRun();
    const coinBreakdown = this.calculateCoinBreakdown(run);
    const earnedCoins = coinBreakdown.total;
    const endedRun = cloneRunState(run);
    const inventorySavedSlots = this.inventory.calculateUsage(run.inventory).savedSlots;
    this.state.endRun(earnedCoins);
    this.runValue = null;

    return {
      type: 'ended',
      position: this.playerPosition,
      run: endedRun,
      collectedOre,
      digResult,
      endedReason,
      earnedCoins,
      coinBreakdown,
      inventorySavedSlots,
    };
  }

  private refreshStatsFromActiveBuffs(): void {
    const save = this.saveValue ?? this.state.save;
    const stats = this.buffs.applyToStats(getPlayerStats(save), this.activeBuffsValue);
    const run = this.requireRun();
    this.statsValue = stats;
    run.backpackCapacity = stats.backpackCapacity;
    run.activeBuffs = [...this.activeBuffsValue];
  }

  private createResult(type: ContinuousRunActionType): ContinuousRunActionResult {
    const pendingReward = this.rewards.pendingReward;
    return {
      type,
      position: this.playerPosition,
      run: cloneRunState(this.requireRun()),
      rewardChoices: pendingReward?.choices,
      rewardReason: pendingReward?.reason,
    };
  }

  private requireRun(): RunState {
    if (!this.runValue) {
      throw new Error('ContinuousRunManager: 当前没有进行中的下矿局。');
    }

    return this.runValue;
  }

  private requireStats(): PlayerStats {
    if (!this.statsValue) {
      throw new Error('ContinuousRunManager: 玩家属性尚未初始化。');
    }

    return this.statsValue;
  }
}
