import { Color } from 'cc';
import type { BuffId } from '../../core/GameTypes';
import { BUFF_CONFIG } from '../../config/GameConfig';
import type { MiningScreenActions } from '../MiningScreenTypes';
import { UiFactory } from '../UiFactory';
import { ScreenTextView } from './ScreenTextView';

export class BuffSelectScreenView {
  private readonly textView: ScreenTextView;

  public constructor(private readonly ui: UiFactory) {
    this.textView = new ScreenTextView(ui);
  }

  public render(pendingBuffChoices: BuffId[], actions: MiningScreenActions): void {
    this.textView.renderTitleBody(
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
}
