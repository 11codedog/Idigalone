import { Color } from 'cc';
import type { SaveData, UpgradeId } from '../../core/GameTypes';
import { getUpgradeCost, UPGRADE_CONFIG } from '../../config/GameConfig';
import type { MiningScreenActions } from '../MiningScreenTypes';
import { UiFactory } from '../UiFactory';
import { ScreenTextView } from './ScreenTextView';

export class UpgradeScreenView {
  private readonly textView: ScreenTextView;

  public constructor(private readonly ui: UiFactory) {
    this.textView = new ScreenTextView(ui);
  }

  public render(save: SaveData, actions: MiningScreenActions): void {
    this.textView.renderTitle('升级装备');
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
      this.renderUpgradeRow(upgradeId, save, actions, 155 - index * 76);
    }

    this.ui.button({ text: '返回首页', x: -120, y: -250, onClick: actions.showHome, width: 160, height: 52 });
    this.ui.button({ text: '开始下矿', x: 120, y: -250, onClick: actions.showBuffSelect, width: 160, height: 52 });
  }

  private renderUpgradeRow(upgradeId: UpgradeId, save: SaveData, actions: MiningScreenActions, y: number): void {
    const config = UPGRADE_CONFIG[upgradeId];
    const level = save.upgrades[upgradeId];
    const cost = getUpgradeCost(upgradeId, level);

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
}
