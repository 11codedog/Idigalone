import { EventKeyboard, EventTouch, input, Input, sys } from 'cc';
import { MoveDirection } from '../gameplay/RunManager';
import { KeyboardMoveController } from './KeyboardMoveController';
import { SwipeMoveController } from './SwipeMoveController';

interface PlayerInputActions {
  isRunning(): boolean;
  move(direction: MoveDirection): void;
  canSellAtSurface(): boolean;
  sellAtSurface(): void;
}

export class PlayerInputController {
  private readonly keyboard: KeyboardMoveController;
  private readonly swipe: SwipeMoveController;

  public constructor(actions: PlayerInputActions) {
    this.keyboard = new KeyboardMoveController(actions);
    this.swipe = new SwipeMoveController(actions);
  }

  public enable(): void {
    if (this.isMobileInput()) {
      input.on(Input.EventType.TOUCH_START, this.handleTouchStart, this);
      input.on(Input.EventType.TOUCH_END, this.handleTouchEnd, this);
      return;
    }

    input.on(Input.EventType.KEY_DOWN, this.handleKeyDown, this);
    input.on(Input.EventType.KEY_UP, this.handleKeyUp, this);
  }

  public disable(): void {
    input.off(Input.EventType.KEY_DOWN, this.handleKeyDown, this);
    input.off(Input.EventType.KEY_UP, this.handleKeyUp, this);
    input.off(Input.EventType.TOUCH_START, this.handleTouchStart, this);
    input.off(Input.EventType.TOUCH_END, this.handleTouchEnd, this);
    this.keyboard.reset();
    this.swipe.reset();
  }

  public update(deltaTime: number): void {
    if (!this.isMobileInput()) {
      this.keyboard.update(deltaTime);
    }
  }

  public getHint(): string {
    return this.isMobileInput() ? '滑动移动与挖掘' : 'WASD / 方向键移动与挖掘，可长按';
  }

  private handleKeyDown(event: EventKeyboard): void {
    this.keyboard.handleKeyDown(event);
  }

  private handleKeyUp(event: EventKeyboard): void {
    this.keyboard.handleKeyUp(event);
  }

  private handleTouchStart(event: EventTouch): void {
    this.swipe.handleTouchStart(event);
  }

  private handleTouchEnd(event: EventTouch): void {
    this.swipe.handleTouchEnd(event);
  }

  private isMobileInput(): boolean {
    return sys.isMobile;
  }
}
