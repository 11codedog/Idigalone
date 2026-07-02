import { _decorator, Component } from 'cc';
import { BuffId, UpgradeId } from '../core/GameTypes';
import { gameState } from '../core/GameState';
import { BUFF_CONFIG, RUN_CONFIG } from '../config/GameConfig';
import { saveManager } from '../core/SaveManager';
import { upgradeManager } from '../core/UpgradeManager';
import { ContinuousRunActionResult, ContinuousRunManager } from '../gameplay/ContinuousRunManager';
import { InputVector } from '../gameplay/terrain/TerrainTypes';
import { PlatformManager } from '../platform/PlatformManager';
import { ContinuousRenderScheduler } from './ContinuousRenderScheduler';
import { MiningScreenView } from './MiningScreenView';
import type { MiningScreenActions, MiningScreenState, SettlementSnapshot } from './MiningScreenTypes';
import { PlayerInputController } from './PlayerInputController';
import { MiningDebugPanelLogPresenter } from './MiningDebugPanelLogPresenter';
import { RunTextPresenter } from './RunTextPresenter';
import { TerrainDigMaskPresenter } from './TerrainDigMaskPresenter';
import { UiFactory } from './UiFactory';

const { ccclass } = _decorator;

@ccclass('MiningDebugPanel')
export class MiningDebugPanel extends Component {
  private screen: MiningScreenState = 'loading';
  private runManager: ContinuousRunManager | null = null;
  private pendingBuffChoices: BuffId[] = [];
  private rewardReason = '';
  private lastSettlement: SettlementSnapshot | null = null;
  private lastLog = '正在读取存档...';
  private ui: UiFactory | null = null;
  private screenView: MiningScreenView | null = null;
  private readonly continuousRenderScheduler = new ContinuousRenderScheduler();
  private readonly terrainDigMask = new TerrainDigMaskPresenter();
  private readonly logPresenter = new MiningDebugPanelLogPresenter();
  private readonly textPresenter = new RunTextPresenter();
  private readonly inputController = new PlayerInputController({
    isRunning: () => this.canMoveByInput(),
    applyInput: (input: InputVector, deltaTime: number) => this.applyInput(input, deltaTime),
    canSellAtSurface: () => this.canSellAtSurface(),
    sellAtSurface: () => {
      void this.sellAtSurface();
    },
  });

  public start(): void {
    this.ui = new UiFactory(this.node);
    this.ui.ensureRoot();
    this.inputController.bindUi(this.ui);
    this.screenView = new MiningScreenView(this.ui);
    this.screen = 'loading';
    this.render();
    void this.initializeData();
  }

  public onEnable(): void { this.inputController.enable(); }

  public onDisable(): void { this.inputController.disable(); }

  public update(deltaTime: number): void {
    this.inputController.update(deltaTime);
    this.flushContinuousRender(deltaTime);
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
      showUpgrade: () => this.showUpgrade(),
      showSkills: () => this.showSkills(),
      showPause: () => this.showPause(),
      startRun: () => this.startRun(),
      chooseRewardBuff: (buffId: BuffId) => this.chooseRewardBuff(buffId),
      returnToSurface: () => this.returnToSurface(),
      sellAtSurface: () => this.sellAtSurface(),
      resumeRun: () => this.resumeRun(),
      confirmAbandonRun: () => this.confirmAbandonRun(),
      buyUpgrade: (upgradeId: UpgradeId) => this.buyUpgrade(upgradeId),
    };
  }

  private async initializeData(): Promise<void> {
    const loadResult = await saveManager.load();
    const save = loadResult.data ?? gameState.save;
    this.lastLog = this.logPresenter.loadResult(loadResult, save);
    this.showHome();
  }

  private showHome(): void {
    if (!this.runManager?.run) {
      gameState.setPhase('home');
    }

    this.screen = 'home';
    this.runManager = null;
    this.terrainDigMask.reset();
    this.pendingBuffChoices = [];
    this.rewardReason = '';
    this.render();
  }

  private showUpgrade(): void {
    gameState.setPhase('home');
    this.screen = 'upgrade';
    this.render();
  }

  private showSkills(): void {
    gameState.setPhase('home');
    this.screen = 'skills';
    this.lastLog = '查看当前已启用技能。';
    this.render();
  }

  private showPause(): void {
    if (!this.runManager?.run) {
      this.showHome();
      return;
    }

    this.screen = 'pause';
    gameState.setPhase('paused');
    this.lastLog = '下矿已暂停。';
    this.render();
  }

  private startRun(): void {
    this.runManager = new ContinuousRunManager();
    const run = this.runManager.start(gameState.save);
    this.terrainDigMask.reset();
    this.screen = 'running';
    this.pendingBuffChoices = [];
    this.rewardReason = '';
    this.lastSettlement = null;
    this.lastLog = this.logPresenter.startRun(run);
    this.render();
  }

  private applyInput(input: InputVector, deltaTime: number): void {
    if (!this.runManager?.run) {
      this.lastLog = '还没有开始下矿。';
      this.render();
      return;
    }

    const result = this.runManager.applyInput(input, deltaTime);
    void this.handleRunAction(result, true);
  }

  private async returnToSurface(): Promise<void> {
    if (!this.runManager?.run) {
      this.lastLog = '还没有可以结算的下矿局。';
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

  private async handleRunAction(result: ContinuousRunActionResult, isContinuousInput = false): Promise<void> {
    if (result.type === 'ended') {
      this.lastSettlement = {
        run: result.run,
        earnedCoins: result.earnedCoins ?? 0,
        coinBreakdown: result.coinBreakdown!,
        inventorySavedSlots: result.inventorySavedSlots ?? 0,
        reason: this.textPresenter.endReason(result.endedReason),
      };
      const saveResult = await saveManager.save();
      this.runManager = null;
      this.screen = 'settlement';
      this.lastLog = this.logPresenter.runEnded(this.lastSettlement, saveResult);
      this.triggerHapticFeedback('runEnded');
      this.render();
      return;
    }

    this.terrainDigMask.recordRunAction(result);

    if (result.rewardChoices && result.rewardChoices.length > 0) {
      this.pendingBuffChoices = result.rewardChoices;
      this.rewardReason = result.rewardReason ?? '收集目标';
      this.screen = 'buffSelect';
      this.triggerHapticFeedback('reward');
      this.lastLog = `触发矿工灵感：${this.rewardReason}`;
      this.render();
      return;
    }

    if (result.type === 'idle') {
      return;
    }

    const oreName = result.collectedOre ? this.textPresenter.tileName(result.collectedOre) : '';
    this.lastLog = this.logPresenter.runAction(result, oreName, this.canSellAtSurface());
    if (result.collectedOre) {
      this.triggerHapticFeedback('oreCollect');
    }

    if (isContinuousInput) {
      this.requestContinuousRender();
      return;
    }

    this.render();
  }

  private canSellAtSurface(): boolean {
    const run = this.runManager?.run;
    return Boolean(run && this.runManager && this.runManager.playerPosition.y <= RUN_CONFIG.surfaceDepth && run.depth > RUN_CONFIG.surfaceDepth);
  }

  private async buyUpgrade(upgradeId: UpgradeId): Promise<void> {
    const result = await upgradeManager.buy(upgradeId);
    if (!result.ok) {
      this.lastLog = this.logPresenter.upgradeFailure(result.reason, result.cost, result.error);
      this.render();
      return;
    }

    this.lastLog = this.logPresenter.upgradeSuccess(upgradeId, result.nextLevel, result.cost);
    this.triggerHapticFeedback('upgrade');
    this.render();
  }

  private chooseRewardBuff(buffId: BuffId): void {
    if (!this.runManager?.run) {
      this.showHome();
      return;
    }

    const run = this.runManager.chooseRewardBuff(buffId);
    if (!run) {
      this.lastLog = '当前没有可选择的局内奖励。';
      this.render();
      return;
    }

    this.triggerHapticFeedback('buff');
    this.screen = 'running';
    this.pendingBuffChoices = [];
    this.rewardReason = '';
    this.lastLog = `获得局内奖励：${BUFF_CONFIG[buffId].displayName}`;
    this.render();
  }

  private render(): void {
    this.continuousRenderScheduler.cancel();
    this.renderView();
  }

  private renderView(): void {
    this.view.render(
      {
        screen: this.screen,
        save: gameState.save,
        pendingBuffChoices: this.pendingBuffChoices,
        rewardReason: this.rewardReason,
        runManager: this.runManager,
        terrainDigMask: this.terrainDigMask.mask,
        lastSettlement: this.lastSettlement,
        lastLog: this.lastLog,
        inputHint: this.inputController.getHint(),
      },
      this.actions,
    );
    this.inputController.renderOverlay();
  }

  private requestContinuousRender(): void {
    if (this.screen !== 'running') {
      this.render();
      return;
    }

    this.continuousRenderScheduler.request();
  }

  private flushContinuousRender(deltaTime: number): void {
    if (this.screen !== 'running') {
      this.continuousRenderScheduler.cancel();
      return;
    }

    if (this.continuousRenderScheduler.update(deltaTime)) {
      this.renderView();
    }
  }

  private triggerHapticFeedback(reason: string): void {
    void PlatformManager.platform.vibrateShort().then((result) => {
      if (!result.ok) {
        console.warn(`[MiningDebugPanel] vibrateShort failed after ${reason}: ${result.error ?? 'unknown error'}`);
      }
    }).catch((error: unknown) => {
      console.warn(`[MiningDebugPanel] vibrateShort rejected after ${reason}: ${String(error)}`);
    });
  }

  private resumeRun(): void {
    if (!this.runManager?.run) {
      this.showHome();
      return;
    }

    this.screen = 'running';
    gameState.setPhase('running');
    this.lastLog = '继续下矿。';
    this.render();
  }

  private confirmAbandonRun(): void {
    this.runManager?.abandonRun();
    this.runManager = null;
    this.lastSettlement = null;
    this.lastLog = '已放弃本局，未结算矿石。';
    this.showHome();
  }

  private canMoveByInput(): boolean {
    return this.screen === 'running' && Boolean(this.runManager?.run);
  }

}
