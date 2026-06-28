import { Color } from 'cc';
import { BuffId, GridPosition, SaveData, RunState, UpgradeId } from '../core/GameTypes';
import { BUFF_CONFIG, getUpgradeCost, UPGRADE_CONFIG } from '../config/GameConfig';
import { MoveDirection, RunManager } from '../gameplay/RunManager';
import { MineGridView } from './MineGridView';
import { RunTextPresenter } from './RunTextPresenter';
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
}

export interface MiningScreenActions {
  showHome(): void;
  showBuffSelect(): void;
  showUpgrade(): void;
  showPause(): void;
  startRun(buffId: BuffId): void;
  move(direction: MoveDirection): void;
  returnToSurface(): void | Promise<void>;
  resumeRun(): void;
  confirmAbandonRun(): void;
  buyUpgrade(upgradeId: UpgradeId): void | Promise<void>;
}

export class MiningScreenView {
  private readonly gridView: MineGridView;
  private readonly textPresenter = new RunTextPresenter();

  public constructor(private readonly ui: UiFactory) {
    this.gridView = new MineGridView(ui);
  }

  public render(model: MiningScreenModel, actions: MiningScreenActions): void {
    this.ui.clear();
    this.ui.backdrop();

    if (model.screen === 'loading') {
      this.renderBaseText('读取中', '正在读取本地存档...');
    } else if (model.screen === 'home') {
      this.renderHome(model.save, actions);
    } else if (model.screen === 'buffSelect') {
      this.renderBuffSelect(model.pendingBuffChoices, actions);
    } else if (model.screen === 'running') {
      this.renderRunning(model, actions);
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
      y: -410,
      fontSize: 18,
      color: new Color(255, 230, 150, 255),
      width: 660,
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

  private renderRunning(model: MiningScreenModel, actions: MiningScreenActions): void {
    const run = model.runManager?.run;
    if (!run || !model.runManager) {
      actions.showHome();
      return;
    }

    this.ui.label({
      text: this.textPresenter.statusText(run, model.selectedBuff),
      x: 0,
      y: 355,
      fontSize: 18,
      color: this.textPresenter.statusColor(run),
      width: 680,
      height: 64,
    });
    this.ui.label({
      text: this.textPresenter.warningText(run),
      x: 0,
      y: 302,
      fontSize: 18,
      color: this.textPresenter.warningColor(run),
      width: 660,
      height: 32,
    });
    this.ui.label({
      text: '图例：蓝=玩家  深色=空地  棕=泥土  灰=石头\n橙=铜矿  银=银矿  绿=氧气包',
      x: 0,
      y: 270,
      fontSize: 15,
      color: new Color(210, 240, 255, 255),
      width: 660,
      height: 48,
    });
    this.gridView.render(model.runManager, model.lastActionPosition);

    this.ui.button({ text: '暂停', x: -250, y: -285, onClick: actions.showPause, width: 160, height: 52 });
    this.ui.button({ text: '上', x: 145, y: -260, onClick: () => actions.move('up'), width: 88, height: 48 });
    this.ui.button({ text: '左', x: 45, y: -320, onClick: () => actions.move('left'), width: 88, height: 48 });
    this.ui.button({ text: '下', x: 145, y: -320, onClick: () => actions.move('down'), width: 88, height: 48 });
    this.ui.button({ text: '右', x: 245, y: -320, onClick: () => actions.move('right'), width: 88, height: 48 });
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

    this.renderBaseText(
      '本局结算',
      [
        `结束原因：${settlement.reason}`,
        `最大深度：${settlement.run.depth}m`,
        `铜矿：${settlement.run.inventory.copper}`,
        `银矿：${settlement.run.inventory.silver}`,
        `本局收入：${settlement.earnedCoins}`,
        `当前金币：${save.coins}`,
      ].join('\n'),
    );

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
}
