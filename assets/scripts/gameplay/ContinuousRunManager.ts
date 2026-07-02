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
import { OreMagnetResolver } from './terrain/OreMagnetResolver';
import { ContinuousPosition, InputVector, TerrainMaterial, Vec2Like } from './terrain/TerrainTypes';
import { normalizeVector } from './terrain/VectorMath';
import { CONTINUOUS_RUN_CONFIG, ContinuousRunActionResult, ContinuousRunActionType } from './ContinuousRunTypes';
import type { CoinBreakdown, RunEndReason } from './RunManager';

export type { ContinuousRunActionResult, ContinuousRunActionType } from './ContinuousRunTypes';

export class ContinuousRunManager {
  public readonly terrain: ContinuousTerrain;

  private readonly state: GameState;
  private readonly buffs: BuffManager;
  private readonly resolver: DigBrushResolver;
  private readonly magnetResolver: OreMagnetResolver;
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
    magnetResolver = new OreMagnetResolver(),
    inventory = inventoryCalculator,
    rewards = new ContinuousRunRewardTracker(),
  ) {
    this.state = state;
    this.terrain = terrain;
    this.buffs = buffs;
    this.resolver = resolver;
    this.magnetResolver = magnetResolver;
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
    const modifiers = this.buffs.getModifiers(activeBuffs);
    const safeStartPosition = this.clampToPlayableDepth(startPosition);
    const run: RunState = {
      depth: Math.max(0, Math.floor(safeStartPosition.y)),
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
    this.terrain.setGenerationOptions({ rareOreBonus: modifiers.rareOreBonus });
    this.positionValue = safeStartPosition;
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

    const strength = Math.min(1, input.strength);
    const simulatedDeltaTime = Math.min(safeDeltaTime, CONTINUOUS_RUN_CONFIG.maxInputDeltaTime);
    const distance = CONTINUOUS_RUN_CONFIG.moveSpeedPerSecond * strength * simulatedDeltaTime;
    const stepCount = Math.max(1, Math.ceil(distance / CONTINUOUS_RUN_CONFIG.maxSimulationStepDistance));
    const stepDeltaTime = simulatedDeltaTime / stepCount;
    let actionType: ContinuousRunActionType = 'move';
    let digResult: DigBrushResult | undefined;

    for (let step = 0; step < stepCount; step += 1) {
      const stepResult = this.applyInputStep(direction, strength, stepDeltaTime);
      if (stepResult.actionType === 'dig') {
        actionType = 'dig';
      }
      digResult = this.mergeDigResults(digResult, stepResult.digResult);
      if (run.oxygen <= 0) {
        break;
      }
    }

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

  private applyInputStep(
    direction: Vec2Like,
    strength: number,
    deltaTime: number,
  ): { actionType: ContinuousRunActionType; digResult?: DigBrushResult } {
    const distance = CONTINUOUS_RUN_CONFIG.moveSpeedPerSecond * strength * deltaTime;
    const target = this.clampToPlayableDepth({
      x: this.positionValue.x + direction.x * distance,
      y: this.positionValue.y + direction.y * distance,
    });
    const targetSample = this.terrain.sample(target);
    let actionType: ContinuousRunActionType = 'move';
    let digResult: DigBrushResult | undefined;
    let moveRatio = 1;

    if (targetSample.material !== 'air') {
      actionType = 'dig';
      const resolvedDigResult = this.digAt(target, targetSample.material);
      if (this.canApplyDigResult(resolvedDigResult)) {
        digResult = resolvedDigResult;
        moveRatio = digResult.removedMaterialUnits > 0 ? 1 : CONTINUOUS_RUN_CONFIG.blockedMoveRatio;
        this.applyDigResult(digResult);
      } else {
        moveRatio = CONTINUOUS_RUN_CONFIG.blockedMoveRatio;
      }
    }

    this.positionValue = this.clampToPlayableDepth({
      x: this.positionValue.x + direction.x * distance * moveRatio,
      y: this.positionValue.y + direction.y * distance * moveRatio,
    });
    const magnetResult = this.collectNearbyOres();
    if (magnetResult) {
      this.applyDigResult(magnetResult);
      digResult = this.mergeDigResults(digResult, magnetResult);
    }
    this.consumeOxygen(getContinuousActionOxygenCost(this.positionValue.y, deltaTime, digResult));
    if (digResult) {
      this.recoverOxygen(digResult.recoveredOxygen);
    }
    this.refreshDepth();
    return { actionType, digResult };
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

  private collectNearbyOres(): DigBrushResult | undefined {
    const run = this.requireRun();
    const removedSamples = [];
    const inventoryDelta: Partial<Record<OreType, number>> = {};

    for (const candidate of this.magnetResolver.resolve(this.terrain, {
      center: this.positionValue,
      radius: CONTINUOUS_RUN_CONFIG.oreMagnetRadius,
    })) {
      const nextInventoryDelta = {
        ...inventoryDelta,
        [candidate.material]: (inventoryDelta[candidate.material] ?? 0) + 1,
      };
      if (!this.inventory.canApplyDelta(run.inventory, nextInventoryDelta, run.backpackCapacity)) {
        continue;
      }

      inventoryDelta[candidate.material] = nextInventoryDelta[candidate.material];
      removedSamples.push({
        coordinate: { ...candidate.coordinate },
        material: candidate.material,
        units: 1,
      });
    }

    if (removedSamples.length === 0) {
      return undefined;
    }

    return {
      removedMaterialUnits: removedSamples.length,
      inventoryDelta,
      oxygenCost: 0,
      recoveredOxygen: 0,
      slowedByHardness: false,
      digDelta: {
        removedSamples,
      },
    };
  }

  private canApplyDigResult(result: DigBrushResult): boolean {
    const run = this.requireRun();
    return this.inventory.canApplyDelta(run.inventory, result.inventoryDelta, run.backpackCapacity);
  }

  private mergeDigResults(current: DigBrushResult | undefined, next: DigBrushResult | undefined): DigBrushResult | undefined {
    if (!next) {
      return current;
    }

    if (!current) {
      return {
        ...next,
        inventoryDelta: { ...next.inventoryDelta },
        digDelta: {
          removedSamples: next.digDelta.removedSamples.map((sample) => ({
            coordinate: { ...sample.coordinate },
            material: sample.material,
            units: sample.units,
          })),
        },
      };
    }

    const inventoryDelta: Partial<Record<OreType, number>> = { ...current.inventoryDelta };
    for (const oreType of ORE_TYPES) {
      const units = (next.inventoryDelta[oreType] ?? 0) + (inventoryDelta[oreType] ?? 0);
      if (units > 0) {
        inventoryDelta[oreType] = units;
      }
    }

    return {
      removedMaterialUnits: current.removedMaterialUnits + next.removedMaterialUnits,
      inventoryDelta,
      oxygenCost: current.oxygenCost + next.oxygenCost,
      recoveredOxygen: current.recoveredOxygen + next.recoveredOxygen,
      slowedByHardness: current.slowedByHardness || next.slowedByHardness,
      digDelta: {
        removedSamples: [
          ...current.digDelta.removedSamples,
          ...next.digDelta.removedSamples.map((sample) => ({
            coordinate: { ...sample.coordinate },
            material: sample.material,
            units: sample.units,
          })),
        ],
      },
    };
  }

  private consumeOxygen(amount: number): void {
    const run = this.requireRun();
    const actualCost = this.buffs.getOxygenCost(Math.max(0, amount), this.activeBuffsValue);
    run.oxygen = Math.max(0, run.oxygen - actualCost);
  }

  private recoverOxygen(amount: number): void {
    if (amount <= 0) {
      return;
    }

    const run = this.requireRun();
    run.oxygen = Math.min(run.maxOxygen, run.oxygen + amount);
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
    const modifiers = this.buffs.getModifiers(this.activeBuffsValue);
    const run = this.requireRun();
    this.statsValue = stats;
    run.backpackCapacity = stats.backpackCapacity;
    run.activeBuffs = [...this.activeBuffsValue];
    this.terrain.setGenerationOptions({ rareOreBonus: modifiers.rareOreBonus });
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

  private clampToPlayableDepth(position: ContinuousPosition): ContinuousPosition {
    return {
      x: position.x,
      y: Math.max(RUN_CONFIG.surfaceDepth, position.y),
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
