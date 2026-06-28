import { gameState, GameState } from '../core/GameState';
import {
  BuffId,
  cloneRunState,
  GridPosition,
  PlayerStats,
  RunInventory,
  RunState,
  SaveData,
  TileType,
} from '../core/GameTypes';
import { getPlayerStats, RUN_CONFIG, TILE_CONFIG } from '../config/GameConfig';
import { MineGrid, MineTile } from './MineGrid';
import { buffManager, BuffManager } from './BuffManager';
import { tileEffectResolver, TileEffectResolver } from './TileEffectResolver';

export type MoveDirection = 'up' | 'down' | 'left' | 'right';

export type RunEndReason = 'oxygenDepleted' | 'manualReturn';

export type RunActionType = 'move' | 'dig' | 'blocked' | 'ended';

export type RunBlockReason = 'outOfBounds' | 'backpackFull' | 'upwardDigForbidden';

export interface RunActionResult {
  type: RunActionType;
  position: GridPosition;
  run: RunState;
  targetTile?: MineTile;
  collectedOre?: TileType;
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
  private positionValue: GridPosition;
  private statsValue: PlayerStats | null = null;
  private activeBuffsValue: BuffId[] = [];
  private runValue: RunState | null = null;

  public constructor(
    state: GameState = gameState,
    grid = new MineGrid(),
    buffs = buffManager,
    tileEffects = tileEffectResolver,
  ) {
    this.state = state;
    this.grid = grid;
    this.buffs = buffs;
    this.tileEffects = tileEffects;
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
      inventory: this.createEmptyInventory(),
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
      this.positionValue = target;
      this.consumeOxygen(RUN_CONFIG.moveOxygenCost);
      this.refreshDepth();
      this.refreshCoinsPreview();
      this.syncRun();
      return this.finishAction('move', targetTile);
    }

    if (direction === 'up') {
      return this.createResult('blocked', 'upwardDigForbidden', targetTile);
    }

    if (!this.tileEffects.canApply(targetTile.type, this.requireRun())) {
      return this.createResult('blocked', 'backpackFull', targetTile);
    }

    const digDamage = this.buffs.getDigDamage(stats.pickaxeLevel, this.activeBuffsValue, targetTile.type);
    const digResult = this.grid.dig(target, digDamage);
    this.consumeOxygen(TILE_CONFIG[targetTile.type].oxygenCost);

    let collectedOre: TileType | undefined;
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
    return this.endRun('manualReturn');
  }

  public calculateCoins(run: RunState): number {
    const stats = this.requireStats();
    const copperValue = run.inventory.copper * TILE_CONFIG.copper.oreValue;
    const silverValue = run.inventory.silver * TILE_CONFIG.silver.oreValue;
    return Math.floor((copperValue + silverValue) * stats.oreValueMultiplier) +
      this.buffs.getDeepBonus(run, this.activeBuffsValue);
  }

  private consumeOxygen(amount: number): void {
    const run = this.requireRun();
    const actualCost = this.buffs.getOxygenCost(Math.max(0, amount), this.activeBuffsValue);
    run.oxygen = Math.max(0, run.oxygen - actualCost);
  }

  private applyTileEffect(effect: ReturnType<TileEffectResolver['resolve']>): void {
    const run = this.requireRun();
    // 只有 Manager 持有并修改可变 run；Resolver 返回的 delta 在这里一次性落地。
    run.inventory.copper += effect.copperDelta;
    run.inventory.silver += effect.silverDelta;
    run.backpackUsed += effect.backpackUsedDelta;
    run.oxygen = Math.min(run.maxOxygen, run.oxygen + effect.recoveredOxygen);
  }

  private finishAction(
    type: RunActionType,
    targetTile?: MineTile,
    collectedOre?: TileType,
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
    collectedOre?: TileType,
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

  private createEmptyInventory(): RunInventory {
    return {
      copper: 0,
      silver: 0,
    };
  }

}
