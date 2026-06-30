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

  public render(pendingBuffChoices: BuffId[], rewardReason: string, actions: MiningScreenActions): void {
    this.textView.renderTitleBody(
      '矿工灵感',
      `完成目标：${rewardReason}\n选择 1 个本局奖励，立刻改变接下来的挖矿路线。`,
    );

    for (let index = 0; index < pendingBuffChoices.length; index += 1) {
      const buffId = pendingBuffChoices[index];
      const config = BUFF_CONFIG[buffId];
      const x = -220 + index * 220;
      this.ui.button({ text: config.displayName, x, y: -135, onClick: () => actions.chooseRewardBuff(buffId), width: 180, height: 58 });
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
    this.ui.label({
      text: '选择后继续本局；本局结束后奖励重置。',
      x: 0,
      y: -310,
      fontSize: 18,
      color: new Color(255, 230, 150, 255),
      width: 520,
      height: 40,
    });
  }
}
