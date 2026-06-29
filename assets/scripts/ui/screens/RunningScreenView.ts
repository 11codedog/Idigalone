import { Color } from 'cc';
import type { MiningScreenActions, MiningScreenModel } from '../MiningScreenTypes';
import { MineGridView } from '../MineGridView';
import { RunFooterView } from '../RunFooterView';
import { RunHudView } from '../RunHudView';
import { createRunScreenLayout } from '../RunScreenLayout';
import { UiFactory } from '../UiFactory';

export interface RunningScreenLogLayout {
  logY: number;
  logWidth: number;
}

export class RunningScreenView {
  private readonly gridView: MineGridView;
  private readonly hudView: RunHudView;
  private readonly footerView: RunFooterView;

  public constructor(private readonly ui: UiFactory) {
    this.gridView = new MineGridView(ui);
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
    this.hudView.render(run, model.selectedBuff, layout.hud);
    this.ui.label({
      text: '图例：蓝=玩家 深色=空地 棕=泥土 灰=石头\n橙=铜矿 银=银矿 灰白=铁矿 金=金矿 蓝绿=水晶 深紫=黑曜 绿=氧气',
      x: 0,
      y: layout.legendY,
      fontSize: 15,
      color: new Color(210, 240, 255, 255),
      width: layout.legendWidth,
      height: 48,
    });
    this.gridView.render(model.runManager, model.lastActionPosition, layout.grid);
    this.footerView.render(model.runManager, run, model.inputHint, actions, layout.footer);

    return { logY: layout.logY, logWidth: layout.logWidth };
  }
}
