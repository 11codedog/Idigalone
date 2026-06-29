import type { SaveData } from '../../core/GameTypes';
import { ORE_TYPES, RUN_CONFIG, TILE_CONFIG } from '../../config/GameConfig';
import { inventoryCalculator } from '../../skill/InventoryCalculator';
import type { MiningScreenActions, SettlementSnapshot } from '../MiningScreenTypes';
import { UiFactory } from '../UiFactory';
import { ScreenTextView } from './ScreenTextView';

export class SettlementScreenView {
  private readonly textView: ScreenTextView;

  public constructor(private readonly ui: UiFactory) {
    this.textView = new ScreenTextView(ui);
  }

  public render(
    settlement: SettlementSnapshot | null,
    save: SaveData,
    actions: MiningScreenActions,
  ): void {
    if (!settlement) {
      actions.showHome();
      return;
    }

    this.textView.renderTitleBody('本局结算', this.formatBody(settlement, save));
    this.ui.button({ text: '再来一局', x: -200, y: -275, onClick: actions.showBuffSelect, width: 170, height: 54 });
    this.ui.button({ text: '升级装备', x: 0, y: -275, onClick: actions.showUpgrade, width: 170, height: 54 });
    this.ui.button({ text: '回首页', x: 200, y: -275, onClick: actions.showHome, width: 170, height: 54 });
  }

  private formatBody(settlement: SettlementSnapshot, save: SaveData): string {
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
