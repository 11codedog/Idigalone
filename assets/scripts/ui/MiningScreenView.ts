import { Color } from 'cc';
import { BuffId, GridPosition, RunState, SaveData, UpgradeId } from '../core/GameTypes';
import {
  BUFF_CONFIG,
  getUpgradeCost,
  ORE_TYPES,
  RUN_CONFIG,
  TILE_CONFIG,
  UPGRADE_CONFIG,
} from '../config/GameConfig';
import { MoveDirection, RunManager } from '../gameplay/RunManager';
import { inventoryCalculator } from '../skill/InventoryCalculator';
import { MineGridView } from './MineGridView';
import { RunHudView } from './RunHudView';
import { RunFooterView } from './RunFooterView';
import { createRunScreenLayout, RunScreenLayout } from './RunScreenLayout';
import { RunTextPresenter } from './RunTextPresenter';
import { ScreenBackdropView } from './ScreenBackdropView';
import { UiFactory } from './UiFactory';

export type MiningScreenState =
  | 'loading'
  | 'home'
  | 'buffSelect'
  | 'running'
  | 'pause'
  | 'settlement'
  | 'upgrade';

export interface SettlementSnapshot {
  run: RunState;
  earnedCoins: number;
  reason: string;
}

export interface MiningScreenModel {
  screen: MiningScreenState;
  save: SaveData;
  pendingBuffChoices: BuffId[];
  selectedBuff: BuffId | null;
  runManager: RunManager | null;
  lastSettlement: SettlementSnapshot | null;
  lastActionPosition: GridPosition | null;
  lastLog: string;
  inputHint: string;
}

export interface MiningScreenActions {
  showHome(): void;
  showBuffSelect(): void;
  showUpgrade(): void;
  showPause(): void;
  startRun(buffId: BuffId): void;
  move(direction: MoveDirection): void;
  returnToSurface(): void | Promise<void>;
  sellAtSurface(): void | Promise<void>;
  resumeRun(): void;
  confirmAbandonRun(): void;
  buyUpgrade(upgradeId: UpgradeId): void | Promise<void>;
}

export class MiningScreenView {
  private readonly gridView: MineGridView;
  private readonly backdropView: ScreenBackdropView;
  private readonly hudView: RunHudView;
  private readonly footerView: RunFooterView;
  private readonly textPresenter = new RunTextPresenter();

  public constructor(private readonly ui: UiFactory) {
    this.gridView = new MineGridView(ui);
    this.backdropView = new ScreenBackdropView(ui);
    this.hudView = new RunHudView(ui);
    this.footerView = new RunFooterView(ui);
  }

  public render(model: MiningScreenModel, actions: MiningScreenActions): void {
    this.ui.clear();
    this.backdropView.render(model.screen, model.runManager?.run ?? null);
    let logY = -410;
    let logWidth = 660;

    if (model.screen === 'loading') {
      this.renderBaseText('读取中', '正在读取本地存档...');
    } else if (model.screen === 'home') {
      this.renderHome(model.save, actions);
    } else if (model.screen === 'buffSelect') {
      this.renderBuffSelect(model.pendingBuffChoices, actions);
    } else if (model.screen === 'running') {
      const layout = createRunScreenLayout(this.ui.getLayoutMetrics());
      this.renderRunning(model, actions, layout);
      logY = layout.logY;
      logWidth = layout.logWidth;
    } else if (model.screen === 'pause') {
      this.renderPause(model.runManager?.run ?? null, actions);
    } else if (model.screen === 'settlement') {
      this.renderSettlement(model.lastSettlement, model.save, actions);
    } else {
      this.renderUpgrade(model.save, actions);
    }

    this.ui.label({
      text: `日志：${model.lastLog}`,
      x: 0,
      y: logY,
      fontSize: 18,
      color: new Color(255, 230, 150, 255),
      width: logWidth,
      height: 44,
    });
  }

  private renderHome(save: SaveData, actions: MiningScreenActions): void {
    this.renderBaseText(
      '挖矿 Roguelite 原型',
      [
        `金币：${save.coins}`,
        `最深：${save.bestDepth}m`,
        '',
        '核心流程：下矿 -> 选择增益 -> 挖矿 -> 结算 -> 升级 -> 再来一局',
      ].join('\n'),
    );

    this.ui.button({ text: '开始下矿', x: -150, y: -230, onClick: actions.showBuffSelect, width: 190, height: 58 });
    this.ui.button({ text: '升级装备', x: 150, y: -230, onClick: actions.showUpgrade, width: 190, height: 58 });
  }

  private renderBuffSelect(pendingBuffChoices: BuffId[], actions: MiningScreenActions): void {
    this.renderBaseText(
      '选择本局增益',
      '每局先选 1 个临时增益。增益只在本局生效，结算后重置。',
    );

    for (let index = 0; index < pendingBuffChoices.length; index += 1) {
      const buffId = pendingBuffChoices[index];
      const config = BUFF_CONFIG[buffId];
      const x = -220 + index * 220;
      this.ui.button({ text: config.displayName, x, y: -135, onClick: () => actions.startRun(buffId), width: 180, height: 58 });
      this.ui.label({
        text: config.description,
        x,
        y: -195,
        fontSize: 16,
        color: new Color(210, 240, 255, 255),
        width: 190,
        height: 70,
      });
    }

    this.ui.button({ text: '返回首页', x: 0, y: -310, onClick: actions.showHome, width: 180, height: 52 });
  }

  private renderRunning(
    model: MiningScreenModel,
    actions: MiningScreenActions,
    layout: RunScreenLayout,
  ): void {
    const run = model.runManager?.run;
    if (!run || !model.runManager) {
      actions.showHome();
      return;
    }

    this.hudView.render(run, model.selectedBuff, layout.hud);
    this.ui.label({
      text: '图例：蓝=玩家 深色=空地 棕=泥土 灰=石头\n橙=铜 灰白=铁 银=银 金=金 蓝绿=水晶 黑紫=黑曜 绿=氧气',
      x: 0,
      y: layout.legendY,
      fontSize: 15,
      color: new Color(210, 240, 255, 255),
      width: layout.legendWidth,
      height: 48,
    });
    this.gridView.render(model.runManager, model.lastActionPosition, layout.grid);

    this.footerView.render(model.runManager, run, model.inputHint, actions, layout.footer);
  }

  private renderPause(run: RunState | null, actions: MiningScreenActions): void {
    if (!run) {
      actions.showHome();
      return;
    }

    this.renderBaseText('暂停', this.textPresenter.pauseBody(run));
    this.ui.button({ text: '继续下矿', x: -200, y: -250, onClick: actions.resumeRun, width: 170, height: 54 });
    this.ui.button({ text: '返回结算', x: 0, y: -250, onClick: actions.returnToSurface, width: 170, height: 54 });
    this.ui.button({ text: '回首页', x: 200, y: -250, onClick: actions.confirmAbandonRun, width: 170, height: 54 });
  }

  private renderSettlement(
    settlement: SettlementSnapshot | null,
    save: SaveData,
    actions: MiningScreenActions,
  ): void {
    if (!settlement) {
      actions.showHome();
      return;
    }

    this.renderBaseText('本局结算', this.formatSettlementBody(settlement, save));

    this.ui.button({ text: '再来一局', x: -200, y: -275, onClick: actions.showBuffSelect, width: 170, height: 54 });
    this.ui.button({ text: '升级装备', x: 0, y: -275, onClick: actions.showUpgrade, width: 170, height: 54 });
    this.ui.button({ text: '回首页', x: 200, y: -275, onClick: actions.showHome, width: 170, height: 54 });
  }

  private renderUpgrade(save: SaveData, actions: MiningScreenActions): void {
    this.ui.label({
      text: '升级装备',
      x: 0,
      y: 315,
      fontSize: 30,
      color: Color.WHITE,
      width: 680,
      height: 60,
    });
    this.ui.label({
      text: `金币：${save.coins}    升级会影响下一局下矿`,
      x: 0,
      y: 245,
      fontSize: 20,
      color: new Color(210, 240, 255, 255),
      width: 660,
      height: 44,
    });

    const upgradeIds: UpgradeId[] = ['pickaxe', 'oxygenTank', 'backpack', 'oreValue'];
    for (let index = 0; index < upgradeIds.length; index += 1) {
      const upgradeId = upgradeIds[index];
      const config = UPGRADE_CONFIG[upgradeId];
      const level = save.upgrades[upgradeId];
      const cost = getUpgradeCost(upgradeId, level);
      const y = 155 - index * 76;
      this.ui.label({
        text: `${config.displayName}  Lv.${level}`,
        x: -210,
        y,
        fontSize: 20,
        color: Color.WHITE,
        width: 210,
        height: 44,
      });
      this.ui.label({
        text: `下级费用：${cost}`,
        x: 15,
        y,
        fontSize: 20,
        color: new Color(210, 240, 255, 255),
        width: 210,
        height: 44,
      });
      this.ui.button({ text: '升级', x: 230, y, onClick: () => actions.buyUpgrade(upgradeId), width: 110, height: 44 });
    }

    this.ui.button({ text: '返回首页', x: -120, y: -250, onClick: actions.showHome, width: 160, height: 52 });
    this.ui.button({ text: '开始下矿', x: 120, y: -250, onClick: actions.showBuffSelect, width: 160, height: 52 });
  }

  private renderBaseText(title: string, body: string): void {
    this.ui.label({
      text: title,
      x: 0,
      y: 300,
      fontSize: 28,
      color: Color.WHITE,
      width: 680,
      height: 70,
    });
    this.ui.label({
      text: body,
      x: 0,
      y: 70,
      fontSize: 22,
      color: new Color(210, 240, 255, 255),
      width: 660,
      height: 330,
    });
  }

  private formatSettlementBody(settlement: SettlementSnapshot, save: SaveData): string {
    const oreLines = ORE_TYPES
      .filter((oreType) => settlement.run.inventory[oreType] > 0)
      .map((oreType) => {
        const count = settlement.run.inventory[oreType];
        const value = count * TILE_CONFIG[oreType].oreValue;
        return `${TILE_CONFIG[oreType].displayName} x${count} = ${value}`;
      });
    const depthBonus = Math.floor(settlement.run.depth / 20) * RUN_CONFIG.depthBonusPerTwentyMeters;
    const inventoryUsage = inventoryCalculator.calculateUsage(settlement.run.inventory);

    return [
      `结束原因：${settlement.reason}`,
      `最大深度：${settlement.run.depth}m`,
      oreLines.length > 0 ? oreLines.join('\n') : '没有带回矿石',
      `矿石压缩：节省 ${inventoryUsage.savedSlots} 格背包`,
      `深度基础奖励：${depthBonus}`,
      `本局收入：${settlement.earnedCoins}`,
      `当前金币：${save.coins}`,
    ].join('\n');
  }
}
