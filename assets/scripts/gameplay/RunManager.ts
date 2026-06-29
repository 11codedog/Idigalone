import { gameState, GameState } from '../core/GameState';
import {
  BuffId,
  cloneRunState,
  createEmptyInventory,
  GridPosition,
  OreType,
  PlayerStats,
  RunState,
  SaveData,
} from '../core/GameTypes';
import { getPlayerStats, ORE_TYPES, RUN_CONFIG, TILE_CONFIG } from '../config/GameConfig';
import { MineGrid, MineTile } from './MineGrid';
import { buffManager, BuffManager } from './BuffManager';
import { tileEffectResolver, TileEffectResolver } from './TileEffectResolver';
import { inventoryCalculator, InventoryCalculator } from '../skill/InventoryCalculator';

export type MoveDirection = 'up' | 'down' | 'left' | 'right';

export type RunEndReason = 'oxygenDepleted' | 'manualSettlement' | 'surfaceSell';

export type RunActionType = 'move' | 'dig' | 'blocked' | 'ended';

export type RunBlockReason = 'outOfBounds' | 'backpackFull' | 'upwardDigForbidden' | 'notAtSurface';

export interface RunActionResult {
  type: RunActionType;
  position: GridPosition;
  run: RunState;
  targetTile?: MineTile;
  collectedOre?: OreType;
  recoveredOxygen?: number;
  reason?: RunBlockReason;
  endedReason?: RunEndReason;
  earnedCoins?: number;
}

export class RunManager {
  public readonly grid: MineGrid;

  private readonly state: GameState;
  private readonly buffs: BuffManager;
  private readonly tileEffects: TileEffectResolver;
  private readonly inventory: InventoryCalculator;
  private positionValue: GridPosition;
  private statsValue: PlayerStats | null = null;
  private activeBuffsValue: BuffId[] = [];
  private runValue: RunState | null = null;

  public constructor(
    state: GameState = gameState,
    grid = new MineGrid(),
    buffs = buffManager,
    tileEffects = tileEffectResolver,
    inventory = inventoryCalculator,
  ) {
    this.state = state;
    this.grid = grid;
    this.buffs = buffs;
    this.tileEffects = tileEffects;
    this.inventory = inventory;
    this.positionValue = {
      x: grid.centerX,
      y: 0,
    };
  }

  public get position(): GridPosition {
    return { ...this.positionValue };
  }

  public get run(): RunState | null {
    return this.runValue ? cloneRunState(this.runValue) : null;
  }

  public get stats(): PlayerStats | null {
    return this.statsValue ? { ...this.statsValue } : null;
  }

  public start(save: SaveData = this.state.save, activeBuffs: BuffId[] = []): RunState {
    const stats = this.buffs.applyToStats(getPlayerStats(save), activeBuffs);
    const modifiers = this.buffs.getModifiers(activeBuffs);
    const run: RunState = {
      depth: 0,
      oxygen: stats.maxOxygen,
      maxOxygen: stats.maxOxygen,
      backpackUsed: 0,
      backpackCapacity: stats.backpackCapacity,
      coinsPreview: 0,
      inventory: createEmptyInventory(),
      activeBuffs: [...activeBuffs],
    };

    this.statsValue = stats;
    this.activeBuffsValue = [...activeBuffs];
    this.runValue = run;
    this.grid.setGenerationOptions({
      rareOreBonus: modifiers.rareOreBonus,
    });
    this.positionValue = {
      x: this.grid.centerX,
      y: 0,
    };
    this.refreshCoinsPreview();
    this.state.startRun(run);
    return cloneRunState(run);
  }

  public move(direction: MoveDirection): RunActionResult {
    this.requireRun();
    const stats = this.requireStats();
    const target = this.getTargetPosition(direction);

    if (!this.grid.isInBounds(target)) {
      return this.createResult('blocked', 'outOfBounds');
    }

    const targetTile = this.grid.getTile(target);
    if (targetTile.type === 'empty') {
      const oxygenCost = this.getMoveOxygenCost(target);
      this.positionValue = target;
      this.consumeOxygen(oxygenCost);
      this.refreshDepth();
      this.refreshCoinsPreview();
      this.syncRun();
      return this.finishAction('move', targetTile);
    }

    if (direction === 'up') {
      return this.createResult('blocked', 'upwardDigForbidden', targetTile);
    }

    const capacityPreview = this.tileEffects.resolve(targetTile.type, this.requireRun());
    if (!this.canApplyTileEffect(capacityPreview)) {
      return this.createResult('blocked', 'backpackFull', targetTile);
    }

    const digDamage = this.buffs.getDigDamage(stats.pickaxeLevel, this.activeBuffsValue, targetTile.type);
    const digResult = this.grid.dig(target, digDamage);
    this.consumeOxygen(TILE_CONFIG[targetTile.type].oxygenCost);

    let collectedOre: OreType | undefined;
    let recoveredOxygen = 0;
    if (digResult.broken) {
      this.positionValue = target;
      this.refreshDepth();
      const effect = this.tileEffects.resolve(targetTile.type, this.requireRun());
      this.applyTileEffect(effect);
      collectedOre = effect.collectedOre;
      recoveredOxygen = effect.recoveredOxygen;
    }

    this.refreshCoinsPreview();
    this.syncRun();
    return this.finishAction('dig', digResult.tile, collectedOre, recoveredOxygen);
  }

  public returnToSurface(): RunActionResult {
    return this.endRun('manualSettlement');
  }

  public sellAtSurface(): RunActionResult {
    if (this.positionValue.y !== RUN_CONFIG.surfaceDepth) {
      return this.createResult('blocked', 'notAtSurface');
    }

    return this.endRun('surfaceSell');
  }

  public calculateCoins(run: RunState): number {
    const stats = this.requireStats();
    const oreValue = ORE_TYPES.reduce(
      (sum, oreType) => sum + run.inventory[oreType] * TILE_CONFIG[oreType].oreValue,
      0,
    );
    const depthBonus = Math.floor(run.depth / 20) * RUN_CONFIG.depthBonusPerTwentyMeters;
    const multipliedValue = Math.floor((oreValue + depthBonus) * stats.oreValueMultiplier);
    return multipliedValue + this.buffs.getDeepBonus(run, this.activeBuffsValue);
  }

  private consumeOxygen(amount: number): void {
    const run = this.requireRun();
    const actualCost = this.buffs.getOxygenCost(Math.max(0, amount), this.activeBuffsValue);
    run.oxygen = Math.max(0, run.oxygen - actualCost);
  }

  private getMoveOxygenCost(target: GridPosition): number {
    // 地表是安全区：玩家在地表左右移动不消耗氧气，进入地下后才开始消耗。
    if (this.positionValue.y <= RUN_CONFIG.surfaceDepth && target.y <= RUN_CONFIG.surfaceDepth) {
      return 0;
    }

    return RUN_CONFIG.moveOxygenCost;
  }

  private applyTileEffect(effect: ReturnType<TileEffectResolver['resolve']>): void {
    const run = this.requireRun();
    // Resolver 只返回 delta，真正写入 RunState 的职责集中在 RunManager，避免状态被分散修改。
    for (const oreType of ORE_TYPES) {
      run.inventory[oreType] += effect.inventoryDelta[oreType] ?? 0;
    }

    run.backpackUsed = this.inventory.calculateUsage(run.inventory).usedSlots;
    run.oxygen = Math.min(run.maxOxygen, run.oxygen + effect.recoveredOxygen);
  }

  private canApplyTileEffect(effect: ReturnType<TileEffectResolver['resolve']>): boolean {
    const run = this.requireRun();
    return this.inventory.canApplyDelta(run.inventory, effect.inventoryDelta, run.backpackCapacity);
  }

  private finishAction(
    type: RunActionType,
    targetTile?: MineTile,
    collectedOre?: OreType,
    recoveredOxygen = 0,
  ): RunActionResult {
    const run = this.requireRun();
    if (run.oxygen <= 0) {
      return this.endRun('oxygenDepleted', targetTile, collectedOre, recoveredOxygen);
    }

    return {
      type,
      position: this.position,
      run: cloneRunState(run),
      targetTile,
      collectedOre,
      recoveredOxygen,
    };
  }

  private endRun(
    endedReason: RunEndReason,
    targetTile?: MineTile,
    collectedOre?: OreType,
    recoveredOxygen = 0,
  ): RunActionResult {
    const run = this.requireRun();
    const earnedCoins = this.calculateCoins(run);
    const endedRun = cloneRunState(run);
    this.state.endRun(earnedCoins);
    this.runValue = null;

    return {
      type: 'ended',
      position: this.position,
      run: endedRun,
      targetTile,
      collectedOre,
      recoveredOxygen,
      endedReason,
      earnedCoins,
    };
  }

  private refreshDepth(): void {
    const run = this.requireRun();
    run.depth = Math.max(run.depth, this.positionValue.y);
  }

  private refreshCoinsPreview(): void {
    const run = this.requireRun();
    run.coinsPreview = this.calculateCoins(run);
  }

  private syncRun(): void {
    const run = this.requireRun();
    this.state.updateRun(cloneRunState(run));
  }

  private getTargetPosition(direction: MoveDirection): GridPosition {
    const position = this.positionValue;
    if (direction === 'up') {
      return { x: position.x, y: position.y - 1 };
    }

    if (direction === 'down') {
      return { x: position.x, y: position.y + 1 };
    }

    if (direction === 'left') {
      return { x: position.x - 1, y: position.y };
    }

    return { x: position.x + 1, y: position.y };
  }

  private createResult(type: RunActionType, reason: RunBlockReason, targetTile?: MineTile): RunActionResult {
    return {
      type,
      reason,
      position: this.position,
      run: cloneRunState(this.requireRun()),
      targetTile,
    };
  }

  private requireRun(): RunState {
    if (!this.runValue) {
      throw new Error('RunManager: 当前没有进行中的下矿局。');
    }

    return this.runValue;
  }

  private requireStats(): PlayerStats {
    if (!this.statsValue) {
      throw new Error('RunManager: 当前没有玩家属性。');
    }

    return this.statsValue;
  }
}
