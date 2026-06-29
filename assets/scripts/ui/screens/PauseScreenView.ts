import type { RunState } from '../../core/GameTypes';
import type { MiningScreenActions } from '../MiningScreenTypes';
import { RunTextPresenter } from '../RunTextPresenter';
import { UiFactory } from '../UiFactory';
import { ScreenTextView } from './ScreenTextView';

export class PauseScreenView {
  private readonly textView: ScreenTextView;
  private readonly textPresenter = new RunTextPresenter();

  public constructor(private readonly ui: UiFactory) {
    this.textView = new ScreenTextView(ui);
  }

  public render(run: RunState | null, actions: MiningScreenActions): void {
    if (!run) {
      actions.showHome();
      return;
    }

    this.textView.renderTitleBody('暂停', this.textPresenter.pauseBody(run));
    this.ui.button({ text: '继续下矿', x: -200, y: -250, onClick: actions.resumeRun, width: 170, height: 54 });
    this.ui.button({ text: '返回结算', x: 0, y: -250, onClick: actions.returnToSurface, width: 170, height: 54 });
    this.ui.button({ text: '回首页', x: 200, y: -250, onClick: actions.confirmAbandonRun, width: 170, height: 54 });
  }
}
