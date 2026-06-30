import { EventBus } from './EventBus';
import { cloneRunState, cloneSaveData, GameEvents, GamePhase, RunState, SaveData, UpgradeId } from './GameTypes';
import { DEFAULT_SAVE_DATA } from '../config/GameConfig';

export class GameState {
  public readonly events = new EventBus<GameEvents>();

  private phaseValue: GamePhase = 'boot';
  private saveValue: SaveData = cloneSaveData(DEFAULT_SAVE_DATA);
  private runValue: RunState | null = null;

  public get phase(): GamePhase {
    return this.phaseValue;
  }

  public get save(): SaveData {
    return cloneSaveData(this.saveValue);
  }

  public get run(): RunState | null {
    return this.runValue ? cloneRunState(this.runValue) : null;
  }

  public setPhase(phase: GamePhase): void {
    if (this.phaseValue === phase) {
      return;
    }

    this.phaseValue = phase;
    this.events.emit('phaseChanged', { phase });
  }

  public setSave(save: SaveData): void {
    this.saveValue = cloneSaveData(save);
    this.events.emit('saveChanged', { save: this.save });
  }

  public addCoins(amount: number): void {
    this.saveValue.coins = Math.max(0, this.saveValue.coins + amount);
    this.events.emit('saveChanged', { save: this.save });
  }

  public setUpgradeLevel(upgradeId: UpgradeId, level: number): void {
    this.saveValue.upgrades[upgradeId] = Math.max(1, Math.floor(level));
    this.events.emit('saveChanged', { save: this.save });
  }

  public startRun(run: RunState): void {
    const nextRun = cloneRunState(run);
    this.runValue = nextRun;
    this.setPhase('running');
    this.events.emit('runStarted', { run: nextRun });
  }

  public updateRun(run: RunState): void {
    const nextRun = cloneRunState(run);
    this.runValue = nextRun;
    this.events.emit('runUpdated', { run: nextRun });
  }

  public endRun(earnedCoins: number): void {
    if (!this.runValue) {
      return;
    }

    const endedRun = cloneRunState(this.runValue);
    // 先把完整的一局快照发出去，再清空 run；监听方不要读取半更新的全局状态。
    this.events.emit('runEnded', { run: endedRun, earnedCoins });
    this.runValue = null;
    this.saveValue.bestDepth = Math.max(this.saveValue.bestDepth, endedRun.depth);
    this.saveValue.coins = Math.max(0, this.saveValue.coins + earnedCoins);
    this.events.emit('saveChanged', { save: this.save });
    this.setPhase('settlement');
  }

  public abandonRun(nextPhase: GamePhase = 'home'): void {
    this.runValue = null;
    this.setPhase(nextPhase);
  }
}

export const gameState = new GameState();
