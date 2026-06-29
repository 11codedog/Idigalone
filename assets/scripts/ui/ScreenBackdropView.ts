import { Color } from 'cc';
import { RunState } from '../core/GameTypes';
import { UiFactory } from './UiFactory';

export class ScreenBackdropView {
  public constructor(private readonly ui: UiFactory) {}

  public render(screen: string, run: RunState | null): void {
    const layout = this.ui.getLayoutMetrics();
    this.ui.image({
      name: 'ArtBackground',
      path: this.getBackgroundPath(screen, run),
      x: 0,
      y: 0,
      width: layout.backgroundWidth,
      height: layout.backgroundHeight,
    });

    if (screen === 'running') {
      return;
    }

    this.ui.backdrop(680, Math.min(980, layout.designHeight - 160), new Color(0, 0, 0, 190));
  }

  private getBackgroundPath(screen: string, run: RunState | null): string {
    if (screen === 'running' || screen === 'pause') {
      return run && run.depth >= 35
        ? 'art/backgrounds/bg_deep_mine'
        : 'art/backgrounds/bg_shallow_mine';
    }

    return 'art/backgrounds/bg_surface_mine';
  }
}
