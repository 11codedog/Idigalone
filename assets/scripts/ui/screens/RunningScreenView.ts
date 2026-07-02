import { Color } from 'cc';
import type { MiningScreenActions, MiningScreenModel } from '../MiningScreenTypes';
import { ContinuousTerrainView } from '../ContinuousTerrainView';
import { RunFooterView } from '../RunFooterView';
import { RunHudView } from '../RunHudView';
import { createRunScreenLayout } from '../RunScreenLayout';
import { UiFactory } from '../UiFactory';

export interface RunningScreenLogLayout {
  logY: number;
  logWidth: number;
}

export class RunningScreenView {
  private readonly terrainView: ContinuousTerrainView;
  private readonly hudView: RunHudView;
  private readonly footerView: RunFooterView;

  public constructor(private readonly ui: UiFactory) {
    this.terrainView = new ContinuousTerrainView(ui);
    this.hudView = new RunHudView(ui);
    this.footerView = new RunFooterView(ui);
  }

  public render(model: MiningScreenModel, actions: MiningScreenActions): RunningScreenLogLayout {
    const run = model.runManager?.run;
    if (!run || !model.runManager) {
      actions.showHome();
      return { logY: -410, logWidth: 660 };
    }

    const layout = createRunScreenLayout(this.ui.getLayoutMetrics());
    this.hudView.render(run, layout.hud);
    this.ui.label({
      text: '按住摇杆自由挖掘，挖到铜矿 x50 会触发矿工灵感。',
      x: 0,
      y: layout.legendY,
      fontSize: 15,
      color: new Color(210, 240, 255, 255),
      width: layout.legendWidth,
      height: 48,
    });
    this.terrainView.render(model.runManager, layout.grid, model.terrainDigMask);
    this.footerView.render(model.runManager, run, model.inputHint, actions, layout.footer);

    return { logY: layout.logY, logWidth: layout.logWidth };
  }
}
