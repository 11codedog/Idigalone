import { EventKeyboard, EventMouse, EventTouch, input, Input } from 'cc';
import { MoveDirection } from '../gameplay/RunManager';
import { InputVector } from '../gameplay/terrain/TerrainTypes';
import { FloatingJoystickController } from './FloatingJoystickController';
import { KeyboardMoveController } from './KeyboardMoveController';
import { UiFactory } from './UiFactory';

interface PlayerInputActions {
  isRunning(): boolean;
  applyInput(input: InputVector, deltaTime: number): void;
  canSellAtSurface(): boolean;
  sellAtSurface(): void;
}

const KEYBOARD_STEP_SECONDS = 0.12;

export class PlayerInputController {
  private readonly keyboard: KeyboardMoveController;
  private readonly joystick: FloatingJoystickController;

  public constructor(actions: PlayerInputActions) {
    this.keyboard = new KeyboardMoveController({
      isRunning: actions.isRunning,
      move: (direction: MoveDirection) => actions.applyInput(this.toInputVector(direction), KEYBOARD_STEP_SECONDS),
      canSellAtSurface: actions.canSellAtSurface,
      sellAtSurface: actions.sellAtSurface,
    });
    this.joystick = new FloatingJoystickController(actions);
  }

  public bindUi(ui: UiFactory): void {
    this.joystick.bindUi(ui);
  }

  public enable(): void {
    input.on(Input.EventType.KEY_DOWN, this.handleKeyDown, this);
    input.on(Input.EventType.KEY_UP, this.handleKeyUp, this);
    input.on(Input.EventType.TOUCH_START, this.handleTouchStart, this);
    input.on(Input.EventType.TOUCH_MOVE, this.handleTouchMove, this);
    input.on(Input.EventType.TOUCH_END, this.handleTouchEnd, this);
    input.on(Input.EventType.TOUCH_CANCEL, this.handleTouchEnd, this);
    input.on(Input.EventType.MOUSE_DOWN, this.handleMouseDown, this);
    input.on(Input.EventType.MOUSE_MOVE, this.handleMouseMove, this);
    input.on(Input.EventType.MOUSE_UP, this.handleMouseUp, this);
  }

  public disable(): void {
    input.off(Input.EventType.KEY_DOWN, this.handleKeyDown, this);
    input.off(Input.EventType.KEY_UP, this.handleKeyUp, this);
    input.off(Input.EventType.TOUCH_START, this.handleTouchStart, this);
    input.off(Input.EventType.TOUCH_MOVE, this.handleTouchMove, this);
    input.off(Input.EventType.TOUCH_END, this.handleTouchEnd, this);
    input.off(Input.EventType.TOUCH_CANCEL, this.handleTouchEnd, this);
    input.off(Input.EventType.MOUSE_DOWN, this.handleMouseDown, this);
    input.off(Input.EventType.MOUSE_MOVE, this.handleMouseMove, this);
    input.off(Input.EventType.MOUSE_UP, this.handleMouseUp, this);
    this.keyboard.reset();
    this.joystick.reset();
  }

  public update(deltaTime: number): void {
    this.keyboard.update(deltaTime);
    this.joystick.update(deltaTime);
  }

  public renderOverlay(): void {
    this.joystick.renderOverlay();
  }

  public getHint(): string {
    return 'WASD / 方向键，手机端按住任意位置 360° 拖动挖掘';
  }

  private handleKeyDown(event: EventKeyboard): void {
    this.keyboard.handleKeyDown(event);
  }

  private handleKeyUp(event: EventKeyboard): void {
    this.keyboard.handleKeyUp(event);
  }

  private handleTouchStart(event: EventTouch): void {
    this.joystick.handleTouchStart(event);
  }

  private handleTouchMove(event: EventTouch): void {
    this.joystick.handleTouchMove(event);
  }

  private handleTouchEnd(_event: EventTouch): void {
    this.joystick.handleTouchEnd();
  }

  private handleMouseDown(event: EventMouse): void {
    this.joystick.handleMouseDown(event);
  }

  private handleMouseMove(event: EventMouse): void {
    this.joystick.handleMouseMove(event);
  }

  private handleMouseUp(_event: EventMouse): void {
    this.joystick.handleMouseUp();
  }

  private toInputVector(direction: MoveDirection): InputVector {
    if (direction === 'up') {
      return { x: 0, y: -1, strength: 1 };
    }

    if (direction === 'down') {
      return { x: 0, y: 1, strength: 1 };
    }

    if (direction === 'left') {
      return { x: -1, y: 0, strength: 1 };
    }

    return { x: 1, y: 0, strength: 1 };
  }
}
