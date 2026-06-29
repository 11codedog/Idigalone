import { EventTouch, Vec2 } from 'cc';
import { MoveDirection } from '../gameplay/RunManager';

interface SwipeMoveActions {
  isRunning(): boolean;
  move(direction: MoveDirection): void;
}

const MIN_SWIPE_DISTANCE = 36;

export class SwipeMoveController {
  private startPosition: Vec2 | null = null;

  public constructor(private readonly actions: SwipeMoveActions) {}

  public handleTouchStart(event: EventTouch): void {
    if (!this.actions.isRunning()) {
      this.startPosition = null;
      return;
    }

    this.startPosition = event.getUILocation();
  }

  public handleTouchEnd(event: EventTouch): void {
    if (!this.startPosition || !this.actions.isRunning()) {
      this.startPosition = null;
      return;
    }

    const endPosition = event.getUILocation();
    const deltaX = endPosition.x - this.startPosition.x;
    const deltaY = endPosition.y - this.startPosition.y;
    this.startPosition = null;

    const direction = this.getDirection(deltaX, deltaY);
    if (direction) {
      this.actions.move(direction);
    }
  }

  public reset(): void {
    this.startPosition = null;
  }

  private getDirection(deltaX: number, deltaY: number): MoveDirection | null {
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);
    if (Math.max(absX, absY) < MIN_SWIPE_DISTANCE) {
      return null;
    }

    if (absX > absY) {
      return deltaX > 0 ? 'right' : 'left';
    }

    return deltaY > 0 ? 'up' : 'down';
  }
}
