import type { SaveData } from '../../core/GameTypes';
import type { MiningScreenActions } from '../MiningScreenTypes';
import { UiFactory } from '../UiFactory';
import { ScreenTextView } from './ScreenTextView';

export class HomeScreenView {
  private readonly textView: ScreenTextView;

  public constructor(private readonly ui: UiFactory) {
    this.textView = new ScreenTextView(ui);
  }

  public render(save: SaveData, actions: MiningScreenActions): void {
    this.textView.renderTitleBody(
      '挖矿 Roguelite 原型',
      [
        `金币：${save.coins}`,
        `最深：${save.bestDepth}m`,
        '',
        '核心流程：下矿 -> 挖矿收集 -> 触发局内三选一 -> 结算 -> 升级 -> 再来一局',
      ].join('\n'),
    );

    this.ui.button({ text: '开始下矿', x: -220, y: -230, onClick: actions.startRun, width: 170, height: 58 });
    this.ui.button({ text: '升级装备', x: 0, y: -230, onClick: actions.showUpgrade, width: 170, height: 58 });
    this.ui.button({ text: '技能', x: 220, y: -230, onClick: actions.showSkills, width: 170, height: 58 });
  }
}
