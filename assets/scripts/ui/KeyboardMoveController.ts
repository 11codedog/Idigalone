import { EventKeyboard, KeyCode } from 'cc';
import { MoveDirection } from '../gameplay/RunManager';

interface KeyboardMoveActions {
  isRunning(): boolean;
  move(direction: MoveDirection, deltaTime: number): void;
  canSellAtSurface(): boolean;
  sellAtSurface(): void;
}

export class KeyboardMoveController {
  private readonly pressedMoveKeys = new Map<KeyCode, MoveDirection>();
  private activeDirection: MoveDirection | null = null;

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
  }

  public handleKeyUp(event: EventKeyboard): void {
    if (!this.pressedMoveKeys.delete(event.keyCode)) {
      return;
    }

    this.activeDirection = this.getLastPressedDirection();
  }

  public update(deltaTime: number): void {
    if (!this.actions.isRunning()) {
      this.reset();
      return;
    }

    if (!this.activeDirection) {
      return;
    }

    this.actions.move(this.activeDirection, deltaTime);
  }

  public reset(): void {
    this.pressedMoveKeys.clear();
    this.activeDirection = null;
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
