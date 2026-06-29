import { Color } from 'cc';
import { UiFactory } from '../UiFactory';

export class ScreenTextView {
  public constructor(private readonly ui: UiFactory) {}

  public renderTitleBody(title: string, body: string): void {
    this.ui.label({
      text: title,
      x: 0,
      y: 300,
      fontSize: 28,
      color: Color.WHITE,
      width: 680,
      height: 70,
    });
    this.ui.label({
      text: body,
      x: 0,
      y: 70,
      fontSize: 22,
      color: new Color(210, 240, 255, 255),
      width: 660,
      height: 330,
    });
  }

  public renderTitle(title: string, y = 315): void {
    this.ui.label({
      text: title,
      x: 0,
      y,
      fontSize: 30,
      color: Color.WHITE,
      width: 680,
      height: 60,
    });
  }
}
