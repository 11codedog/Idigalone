import { Color } from 'cc';
import { BuffId, RunState } from '../core/GameTypes';
import { BUFF_CONFIG, ORE_TYPES } from '../config/GameConfig';
import { RunHudLayout } from './RunScreenLayout';
import { RunTextPresenter } from './RunTextPresenter';
import { UiFactory } from './UiFactory';

export class RunHudView {
  private readonly textPresenter = new RunTextPresenter();

  public constructor(private readonly ui: UiFactory) {}

  public render(run: RunState, selectedBuff: BuffId | null, layout: RunHudLayout): void {
    this.ui.rect({
      name: 'RunHudPanel',
      x: 0,
      y: layout.panelY,
      width: layout.panelWidth,
      height: layout.panelHeight,
      fillColor: new Color(4, 10, 14, 205),
      strokeColor: new Color(70, 120, 150, 210),
      strokeWidth: 1,
    });

    this.renderSummary(run, selectedBuff, layout);
    this.renderResourceBars(run, layout);
    this.renderWarning(run, layout);
  }

  private renderSummary(run: RunState, selectedBuff: BuffId | null, layout: RunHudLayout): void {
    const buffName = selectedBuff ? BUFF_CONFIG[selectedBuff].displayName : '无';
    this.ui.label({
      text: `深度 ${run.depth}m    金币预估 ${run.coinsPreview}    增益 ${buffName}`,
      x: 0,
      y: layout.summaryY,
      fontSize: 18,
      color: Color.WHITE,
      width: layout.panelWidth - 40,
      height: 28,
    });
    this.ui.label({
      text: this.formatOreSummary(run),
      x: layout.panelWidth / 2 - 130,
      y: layout.oreY,
      fontSize: 16,
      color: new Color(230, 240, 245, 255),
      width: 230,
      height: 26,
    });
  }

  private renderResourceBars(run: RunState, layout: RunHudLayout): void {
    this.renderMeter(
      '氧气',
      run.oxygen,
      run.maxOxygen,
      layout.meterX,
      layout.oxygenY,
      this.textPresenter.warningColor(run),
    );
    this.renderMeter(
      '背包',
      run.backpackUsed,
      run.backpackCapacity,
      layout.meterX,
      layout.backpackY,
      new Color(230, 170, 80, 255),
    );
  }

  private renderMeter(
    label: string,
    current: number,
    max: number,
    x: number,
    y: number,
    fillColor: Color,
  ): void {
    const safeMax = Math.max(1, max);
    this.ui.label({
      text: `${label} ${current}/${max}`,
      x: x - 130,
      y,
      fontSize: 15,
      color: Color.WHITE,
      width: 115,
      height: 24,
    });
    this.ui.progressBar({
      name: `${label}Bar`,
      x,
      y,
      width: 190,
      height: 16,
      ratio: current / safeMax,
      fillColor,
      trackColor: new Color(22, 30, 36, 255),
      strokeColor: new Color(90, 110, 120, 255),
    });
  }

  private renderWarning(run: RunState, layout: RunHudLayout): void {
    this.ui.label({
      text: this.textPresenter.warningText(run),
      x: 0,
      y: layout.warningY,
      fontSize: 16,
      color: this.textPresenter.warningColor(run),
      width: layout.panelWidth - 40,
      height: 26,
    });
  }

  private formatOreSummary(run: RunState): string {
    const totalCount = ORE_TYPES.reduce((sum, oreType) => sum + run.inventory[oreType], 0);
    const oreKinds = ORE_TYPES.filter((oreType) => run.inventory[oreType] > 0).length;
    return `矿石 ${totalCount} 个 / ${oreKinds} 种`;
  }
}
