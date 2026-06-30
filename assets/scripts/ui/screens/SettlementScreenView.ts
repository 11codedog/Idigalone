import type { SaveData } from '../../core/GameTypes';
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
    const breakdown = settlement.coinBreakdown;
    const oreLines = breakdown.ores.map((ore) => `${ore.displayName} x${ore.count} = ${ore.totalValue}`);

    return [
      `结束原因：${settlement.reason}`,
      `最大深度：${settlement.run.depth}m`,
      oreLines.length > 0 ? oreLines.join('\n') : '没有带回矿石',
      `矿石压缩：节省 ${settlement.inventorySavedSlots} 格背包`,
      `矿石基础收入：${breakdown.oreValue}`,
      `深度基础奖励：${breakdown.depthBonus}`,
      `售价倍率：x${breakdown.oreValueMultiplier.toFixed(1)}`,
      `倍率后收入：${breakdown.multipliedValue}`,
      `深层额外奖励：${breakdown.deepBonus}`,
      `本局收入：${breakdown.total}`,
      `当前金币：${save.coins}`,
    ].join('\n');
  }
}
