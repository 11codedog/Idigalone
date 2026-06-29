import { _decorator, Component } from 'cc';
import { BuffId, UpgradeId } from '../core/GameTypes';
import { gameState } from '../core/GameState';
import { BUFF_CONFIG, UPGRADE_CONFIG } from '../config/GameConfig';
import { saveManager } from '../core/SaveManager';
import { upgradeManager } from '../core/UpgradeManager';
import { buffManager } from '../gameplay/BuffManager';
import { MoveDirection, RunActionResult, RunManager } from '../gameplay/RunManager';
import { PlatformManager } from '../platform/PlatformManager';
import {
  MiningScreenActions,
  MiningScreenState,
  MiningScreenView,
  SettlementSnapshot,
} from './MiningScreenView';
import { PlayerInputController } from './PlayerInputController';
import { RunTextPresenter } from './RunTextPresenter';
import { UiFactory } from './UiFactory';

const { ccclass } = _decorator;

@ccclass('MiningDebugPanel')
export class MiningDebugPanel extends Component {
  private screen: MiningScreenState = 'loading';
  private runManager: RunManager | null = null;
  private pendingBuffChoices: BuffId[] = [];
  private selectedBuff: BuffId | null = null;
  private lastSettlement: SettlementSnapshot | null = null;
  private lastLog = '正在读取存档...';
  private lastActionPosition: { x: number; y: number } | null = null;
  private ui: UiFactory | null = null;
  private screenView: MiningScreenView | null = null;
  private readonly textPresenter = new RunTextPresenter();
  private readonly inputController = new PlayerInputController({
    isRunning: () => this.canMoveByInput(),
    move: (direction: MoveDirection) => this.move(direction),
    canSellAtSurface: () => this.canSellAtSurface(),
    sellAtSurface: () => {
      void this.sellAtSurface();
    },
  });

  public start(): void {
    this.ui = new UiFactory(this.node);
    this.ui.ensureRoot();
    this.screenView = new MiningScreenView(this.ui);
    this.renderLoading();
    void this.initializeData();
  }

  public onEnable(): void {
    this.inputController.enable();
  }

  public onDisable(): void {
    this.inputController.disable();
  }

  public update(deltaTime: number): void {
    this.inputController.update(deltaTime);
  }

  private get uiFactory(): UiFactory {
    if (!this.ui) {
      this.ui = new UiFactory(this.node);
      this.ui.ensureRoot();
    }

    return this.ui;
  }

  private get view(): MiningScreenView {
    if (!this.screenView) {
      this.screenView = new MiningScreenView(this.uiFactory);
    }

    return this.screenView;
  }

  private get actions(): MiningScreenActions {
    return {
      showHome: () => this.showHome(),
      showBuffSelect: () => this.showBuffSelect(),
      showUpgrade: () => this.showUpgrade(),
      showPause: () => this.showPause(),
      startRun: (buffId: BuffId) => this.startRun(buffId),
      move: (direction: MoveDirection) => this.move(direction),
      returnToSurface: () => this.returnToSurface(),
      sellAtSurface: () => this.sellAtSurface(),
      resumeRun: () => this.resumeRun(),
      confirmAbandonRun: () => this.confirmAbandonRun(),
      buyUpgrade: (upgradeId: UpgradeId) => this.buyUpgrade(upgradeId),
    };
  }

  private async initializeData(): Promise<void> {
    const save = await saveManager.load();
    this.lastLog = `存档已读取：金币 ${save.coins}`;
    this.showHome();
  }

  private showHome(): void {
    this.screen = 'home';
    this.runManager = null;
    this.pendingBuffChoices = [];
    this.selectedBuff = null;
    this.lastActionPosition = null;
    this.render();
  }

  private showBuffSelect(): void {
    this.screen = 'buffSelect';
    this.pendingBuffChoices = buffManager.chooseRandomBuffs(3);
    this.lastLog = '选择一个本局增益后开始下矿。';
    this.render();
  }

  private showUpgrade(): void {
    this.screen = 'upgrade';
    this.render();
  }

  private showPause(): void {
    if (!this.runManager?.run) {
      this.showHome();
      return;
    }

    this.screen = 'pause';
    this.lastLog = '下矿已暂停。';
    this.render();
  }

  private startRun(buffId: BuffId): void {
    this.selectedBuff = buffId;
    this.runManager = new RunManager();
    const run = this.runManager.start(gameState.save, [buffId]);
    this.screen = 'running';
    this.pendingBuffChoices = [];
    this.lastSettlement = null;
    this.lastActionPosition = null;
    this.lastLog = `选择增益：${BUFF_CONFIG[buffId].displayName}，氧气 ${run.oxygen}，背包 ${run.backpackCapacity}`;
    this.render();
  }

  private move(direction: MoveDirection): void {
    if (!this.runManager?.run) {
      this.lastLog = '还没有开始下矿。';
      this.render();
      return;
    }

    const result = this.runManager.move(direction);
    void this.handleRunAction(result);
  }

  private async returnToSurface(): Promise<void> {
    if (!this.runManager?.run) {
      this.lastLog = '还没有可以使用返回绳的下矿局。';
      this.render();
      return;
    }

    const result = this.runManager.returnToSurface();
    await this.handleRunAction(result);
  }

  private async sellAtSurface(): Promise<void> {
    if (!this.runManager?.run) {
      this.lastLog = '还没有可以出售的下矿局。';
      this.render();
      return;
    }

    const result = this.runManager.sellAtSurface();
    await this.handleRunAction(result);
  }

  private async handleRunAction(result: RunActionResult): Promise<void> {
    if (result.type === 'blocked') {
      void PlatformManager.platform.vibrateShort();
      this.lastLog = `被挡住：${this.textPresenter.blockReason(result.reason)}`;
      this.render();
      return;
    }

    if (result.type === 'ended') {
      this.lastSettlement = {
        run: result.run,
        earnedCoins: result.earnedCoins ?? 0,
        reason: this.textPresenter.endReason(result.endedReason),
      };
      const saveResult = await saveManager.save();
      this.runManager = null;
      this.screen = 'settlement';
      this.lastLog = saveResult.ok
        ? `本局结束：${this.lastSettlement.reason}，获得 ${this.lastSettlement.earnedCoins} 金币`
        : `本局已结算，但存档写入失败：${saveResult.error ?? '未知错误'}`;
      this.render();
      return;
    }

    void PlatformManager.platform.vibrateShort();
    this.lastActionPosition = result.position;
    const oreText = result.collectedOre ? `，获得 ${this.textPresenter.tileName(result.collectedOre)}` : '';
    const oxygenText = result.recoveredOxygen ? `，氧气 +${result.recoveredOxygen}` : '';
    const surfaceText = this.canSellAtSurface() ? '，已回到地表，可出售结算' : '';
    this.lastLog = `${result.type === 'move' ? '移动' : '挖掘'}到 (${result.position.x}, ${result.position.y})${oreText}${oxygenText}${surfaceText}`;
    this.render();
  }

  private canSellAtSurface(): boolean {
    const run = this.runManager?.run;
    return Boolean(run && this.runManager?.position.y === 0 && run.depth > 0);
  }

  private async buyUpgrade(upgradeId: UpgradeId): Promise<void> {
    const result = await upgradeManager.buy(upgradeId);
    if (!result.ok) {
      this.lastLog = this.formatUpgradeFailure(result.reason, result.cost, result.error);
      this.render();
      return;
    }

    void PlatformManager.platform.vibrateShort();
    this.lastLog = `升级成功：${UPGRADE_CONFIG[upgradeId].displayName} Lv.${result.nextLevel}，花费 ${result.cost}`;
    this.render();
  }

  private renderLoading(): void {
    this.screen = 'loading';
    this.render();
  }

  private render(): void {
    this.view.render(
      {
        screen: this.screen,
        save: gameState.save,
        pendingBuffChoices: this.pendingBuffChoices,
        selectedBuff: this.selectedBuff,
        runManager: this.runManager,
        lastSettlement: this.lastSettlement,
        lastActionPosition: this.lastActionPosition,
        lastLog: this.lastLog,
        inputHint: this.inputController.getHint(),
      },
      this.actions,
    );
  }

  private resumeRun(): void {
    if (!this.runManager?.run) {
      this.showHome();
      return;
    }

    this.screen = 'running';
    this.lastLog = '继续下矿。';
    this.render();
  }

  private confirmAbandonRun(): void {
    this.runManager = null;
    this.lastSettlement = null;
    this.lastActionPosition = null;
    this.lastLog = '已放弃本局，未结算矿石。';
    this.showHome();
  }

  private canMoveByInput(): boolean {
    return this.screen === 'running' && Boolean(this.runManager?.run);
  }

  private formatUpgradeFailure(reason: string | undefined, cost: number, error: string | undefined): string {
    if (reason === 'notEnoughCoins') {
      return `金币不足：需要 ${cost}`;
    }

    if (reason === 'saveFailed') {
      return `升级失败：存档写入失败 ${error ?? ''}`;
    }

    return '已经达到最高等级。';
  }
}
