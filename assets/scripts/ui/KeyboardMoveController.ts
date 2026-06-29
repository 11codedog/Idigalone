import { EventKeyboard, KeyCode } from 'cc';
import { MoveDirection } from '../gameplay/RunManager';

interface KeyboardMoveActions {
  isRunning(): boolean;
  move(direction: MoveDirection): void;
  canSellAtSurface(): boolean;
  sellAtSurface(): void;
}

const INITIAL_REPEAT_DELAY = 0.18;
const REPEAT_INTERVAL = 0.12;

export class KeyboardMoveController {
  private readonly pressedMoveKeys = new Map<KeyCode, MoveDirection>();
  private activeDirection: MoveDirection | null = null;
  private repeatTimer = 0;

  public constructor(private readonly actions: KeyboardMoveActions) {}

  public handleKeyDown(event: EventKeyboard): void {
    if (!this.actions.isRunning()) {
      this.reset();
      return;
    }

    if (this.isSurfaceSellKey(event.keyCode) && this.actions.canSellAtSurface()) {
      this.actions.sellAtSurface();
      return;
    }

    const direction = this.getMoveDirectionFromKey(event.keyCode);
    if (!direction || this.pressedMoveKeys.has(event.keyCode)) {
      return;
    }

    this.pressedMoveKeys.set(event.keyCode, direction);
    this.activeDirection = direction;
    this.repeatTimer = INITIAL_REPEAT_DELAY;
    this.actions.move(direction);
  }

  public handleKeyUp(event: EventKeyboard): void {
    if (!this.pressedMoveKeys.delete(event.keyCode)) {
      return;
    }

    this.activeDirection = this.getLastPressedDirection();
    this.repeatTimer = REPEAT_INTERVAL;
  }

  public update(deltaTime: number): void {
    if (!this.actions.isRunning()) {
      this.reset();
      return;
    }

    if (!this.activeDirection) {
      return;
    }

    this.repeatTimer -= deltaTime;
    if (this.repeatTimer > 0) {
      return;
    }

    this.actions.move(this.activeDirection);
    this.repeatTimer = REPEAT_INTERVAL;
  }

  public reset(): void {
    this.pressedMoveKeys.clear();
    this.activeDirection = null;
    this.repeatTimer = 0;
  }

  private getLastPressedDirection(): MoveDirection | null {
    const directions = [...this.pressedMoveKeys.values()];
    return directions[directions.length - 1] ?? null;
  }

  private getMoveDirectionFromKey(keyCode: KeyCode): MoveDirection | null {
    if (keyCode === KeyCode.KEY_W || keyCode === KeyCode.ARROW_UP) {
      return 'up';
    }

    if (keyCode === KeyCode.KEY_S || keyCode === KeyCode.ARROW_DOWN) {
      return 'down';
    }

    if (keyCode === KeyCode.KEY_A || keyCode === KeyCode.ARROW_LEFT) {
      return 'left';
    }

    if (keyCode === KeyCode.KEY_D || keyCode === KeyCode.ARROW_RIGHT) {
      return 'right';
    }

    return null;
  }

  private isSurfaceSellKey(keyCode: KeyCode): boolean {
    return keyCode === KeyCode.ENTER || keyCode === KeyCode.SPACE;
  }
}
