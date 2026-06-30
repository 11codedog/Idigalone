import { Color } from 'cc';
import type { MiningScreenActions, MiningScreenModel } from './MiningScreenTypes';
import { ScreenBackdropView } from './ScreenBackdropView';
import { UiFactory } from './UiFactory';
import { BuffSelectScreenView } from './screens/BuffSelectScreenView';
import { HomeScreenView } from './screens/HomeScreenView';
import { PauseScreenView } from './screens/PauseScreenView';
import { RunningScreenView } from './screens/RunningScreenView';
import { ScreenTextView } from './screens/ScreenTextView';
import { SettlementScreenView } from './screens/SettlementScreenView';
import { SkillsScreenView } from './screens/SkillsScreenView';
import { UpgradeScreenView } from './screens/UpgradeScreenView';

export type {
  MiningScreenActions,
  MiningScreenModel,
  MiningScreenState,
  SettlementSnapshot,
} from './MiningScreenTypes';

interface ScreenLogPlacement {
  logY: number;
  logWidth: number;
}

const DEFAULT_LOG_PLACEMENT: ScreenLogPlacement = {
  logY: -410,
  logWidth: 660,
};

export class MiningScreenView {
  private readonly backdropView: ScreenBackdropView;
  private readonly textView: ScreenTextView;
  private readonly homeScreen: HomeScreenView;
  private readonly buffSelectScreen: BuffSelectScreenView;
  private readonly runningScreen: RunningScreenView;
  private readonly pauseScreen: PauseScreenView;
  private readonly settlementScreen: SettlementScreenView;
  private readonly upgradeScreen: UpgradeScreenView;
  private readonly skillsScreen: SkillsScreenView;

  public constructor(private readonly ui: UiFactory) {
    this.backdropView = new ScreenBackdropView(ui);
    this.textView = new ScreenTextView(ui);
    this.homeScreen = new HomeScreenView(ui);
    this.buffSelectScreen = new BuffSelectScreenView(ui);
    this.runningScreen = new RunningScreenView(ui);
    this.pauseScreen = new PauseScreenView(ui);
    this.settlementScreen = new SettlementScreenView(ui);
    this.upgradeScreen = new UpgradeScreenView(ui);
    this.skillsScreen = new SkillsScreenView(ui);
  }

  public render(model: MiningScreenModel, actions: MiningScreenActions): void {
    this.ui.clear();
    this.backdropView.render(model.screen, model.runManager?.run ?? null);

    const logPlacement = this.renderCurrentScreen(model, actions);
    this.renderLog(model.lastLog, logPlacement);
  }

  private renderCurrentScreen(
    model: MiningScreenModel,
    actions: MiningScreenActions,
  ): ScreenLogPlacement {
    // 页面路由集中在这里，具体页面只关心自己的 UI，避免 MiningDebugPanel 继续膨胀。
    if (model.screen === 'loading') {
      this.textView.renderTitleBody('读取中', '正在读取本地存档...');
    } else if (model.screen === 'home') {
      this.homeScreen.render(model.save, actions);
    } else if (model.screen === 'buffSelect') {
      this.buffSelectScreen.render(model.pendingBuffChoices, model.rewardReason, actions);
    } else if (model.screen === 'running') {
      return this.runningScreen.render(model, actions);
    } else if (model.screen === 'pause') {
      this.pauseScreen.render(model.runManager?.run ?? null, actions);
    } else if (model.screen === 'settlement') {
      this.settlementScreen.render(model.lastSettlement, model.save, actions);
    } else if (model.screen === 'upgrade') {
      this.upgradeScreen.render(model.save, actions);
    } else {
      this.skillsScreen.render(actions);
    }

    return DEFAULT_LOG_PLACEMENT;
  }

  private renderLog(lastLog: string, placement: ScreenLogPlacement): void {
    this.ui.label({
      text: `日志：${lastLog}`,
      x: 0,
      y: placement.logY,
      fontSize: 18,
      color: new Color(255, 230, 150, 255),
      width: placement.logWidth,
      height: 44,
    });
  }
}
