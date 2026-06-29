import { Color } from 'cc';
import { RunState } from '../core/GameTypes';
import { RUN_CONFIG } from '../config/GameConfig';
import { RunManager } from '../gameplay/RunManager';
import type { MiningScreenActions } from './MiningScreenTypes';
import { RunFooterLayout } from './RunScreenLayout';
import { UiFactory } from './UiFactory';

export class RunFooterView {
  public constructor(private readonly ui: UiFactory) {}

  public render(
    runManager: RunManager,
    run: RunState,
    inputHint: string,
    actions: MiningScreenActions,
    layout: RunFooterLayout,
  ): void {
    this.ui.button({
      text: '暂停',
      x: layout.pauseX,
      y: layout.y,
      onClick: actions.showPause,
      width: 140,
      height: 52,
    });

    if (runManager.position.y === RUN_CONFIG.surfaceDepth && run.depth > RUN_CONFIG.surfaceDepth) {
      this.renderSurfaceSell(actions, layout);
      return;
    }

    this.ui.label({
      text: inputHint,
      x: layout.hintX,
      y: layout.y,
      fontSize: 20,
      color: new Color(230, 245, 255, 255),
      width: layout.hintWidth,
      height: 52,
    });
  }

  private renderSurfaceSell(actions: MiningScreenActions, layout: RunFooterLayout): void {
    this.ui.label({
      text: '已回到地表：可出售矿石结算，或继续下矿',
      x: layout.surfaceTextX,
      y: layout.surfaceTextY,
      fontSize: 17,
      color: new Color(255, 235, 170, 255),
      width: layout.surfaceTextWidth,
      height: 28,
    });
    this.ui.button({
      text: '出售结算',
      x: layout.sellButtonX,
      y: layout.y,
      onClick: actions.sellAtSurface,
      width: 150,
      height: 48,
    });
    this.ui.label({
      text: 'Enter / Space',
      x: layout.shortcutX,
      y: layout.y,
      fontSize: 17,
      color: new Color(230, 245, 255, 255),
      width: 180,
      height: 34,
    });
  }
}
