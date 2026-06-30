import { Color, EventMouse, EventTouch, Node, Vec2 } from 'cc';
import { InputVector } from '../gameplay/terrain/TerrainTypes';
import { AnalogJoystickState } from './AnalogJoystickState';
import { UiFactory } from './UiFactory';

interface FloatingJoystickActions {
  isRunning(): boolean;
  applyInput(input: InputVector, deltaTime: number): void;
}

interface JoystickPoint {
  x: number;
  y: number;
}

const DEAD_ZONE = 24;
const MAX_KNOB_DISTANCE = 58;
const TOUCH_POINTER_ID = 1;
const MOUSE_POINTER_ID = 2;

export class FloatingJoystickController {
  private ui: UiFactory | null = null;
  private readonly joystickState = new AnalogJoystickState({
    deadZone: DEAD_ZONE,
    maxRadius: MAX_KNOB_DISTANCE,
    invertY: true,
  });
  private rootNode: Node | null = null;
  private knobNode: Node | null = null;

  public constructor(private readonly actions: FloatingJoystickActions) {}

  public bindUi(ui: UiFactory): void {
    this.ui = ui;
  }

  public handleTouchStart(event: EventTouch): void {
    this.handlePointerStart(TOUCH_POINTER_ID, event.getUILocation());
  }

  public handleTouchMove(event: EventTouch): void {
    this.handlePointerMove(TOUCH_POINTER_ID, event.getUILocation());
  }

  public handleTouchEnd(): void {
    this.handlePointerEnd(TOUCH_POINTER_ID);
  }

  public handleMouseDown(event: EventMouse): void {
    this.handlePointerStart(MOUSE_POINTER_ID, event.getUILocation());
  }

  public handleMouseMove(event: EventMouse): void {
    this.handlePointerMove(MOUSE_POINTER_ID, event.getUILocation());
  }

  public handleMouseUp(): void {
    this.handlePointerEnd(MOUSE_POINTER_ID);
  }

  public update(deltaTime: number): void {
    const activeInput = this.joystickState.getInput();
    if (!this.joystickState.isActive || activeInput.strength <= 0) {
      return;
    }

    if (!this.actions.isRunning()) {
      this.reset();
      return;
    }

    this.actions.applyInput(activeInput, deltaTime);
  }

  public renderOverlay(): void {
    if (!this.joystickState.isActive || !this.ui) {
      return;
    }

    if (!this.actions.isRunning()) {
      this.reset();
      return;
    }

    if (this.rootNode?.isValid && this.knobNode?.isValid) {
      this.updateKnobPosition();
      return;
    }

    this.rootNode = this.ui.layer({
      name: 'FloatingJoystick',
      x: this.joystickState.getBasePosition().x,
      y: this.joystickState.getBasePosition().y,
      width: MAX_KNOB_DISTANCE * 2.4,
      height: MAX_KNOB_DISTANCE * 2.4,
    });
    this.ui.rect({
      name: 'JoystickBase',
      x: 0,
      y: 0,
      width: MAX_KNOB_DISTANCE * 2,
      height: MAX_KNOB_DISTANCE * 2,
      fillColor: new Color(16, 28, 38, 125),
      strokeColor: new Color(155, 220, 255, 160),
      strokeWidth: 2,
      parent: this.rootNode,
    });
    this.ui.rect({
      name: 'JoystickGuide',
      x: 0,
      y: 0,
      width: DEAD_ZONE * 2,
      height: DEAD_ZONE * 2,
      fillColor: new Color(210, 245, 255, 42),
      parent: this.rootNode,
    });
    this.knobNode = this.ui.rect({
      name: 'JoystickKnob',
      x: this.joystickState.getKnobOffset().x,
      y: this.joystickState.getKnobOffset().y,
      width: MAX_KNOB_DISTANCE * 0.86,
      height: MAX_KNOB_DISTANCE * 0.86,
      fillColor: new Color(80, 178, 235, 205),
      strokeColor: Color.WHITE,
      strokeWidth: 2,
      parent: this.rootNode,
    });
  }

  public reset(): void {
    if (this.rootNode?.isValid) {
      this.rootNode.destroy();
    }

    this.joystickState.reset();
    this.rootNode = null;
    this.knobNode = null;
  }

  private updateKnobPosition(): void {
    if (!this.knobNode?.isValid) {
      this.renderOverlay();
      return;
    }

    const knobOffset = this.joystickState.getKnobOffset();
    this.knobNode.setPosition(knobOffset.x, knobOffset.y);
  }

  private toDesignPoint(point: Vec2): JoystickPoint {
    const metrics = this.ui?.getLayoutMetrics();
    if (!metrics) {
      return { x: point.x, y: point.y };
    }

    return {
      x: point.x - metrics.visibleWidth / 2,
      y: point.y - metrics.visibleHeight / 2,
    };
  }

  private handlePointerStart(pointerId: number, location: Vec2): void {
    if (!this.actions.isRunning()) {
      this.reset();
      return;
    }

    this.joystickState.begin(pointerId, this.toDesignPoint(location));
    this.renderOverlay();
  }

  private handlePointerMove(pointerId: number, location: Vec2): void {
    if (!this.joystickState.isActive || !this.actions.isRunning()) {
      this.reset();
      return;
    }

    this.joystickState.move(pointerId, this.toDesignPoint(location));
    this.updateKnobPosition();
  }

  private handlePointerEnd(pointerId: number): void {
    this.joystickState.end(pointerId);
    if (!this.joystickState.isActive) {
      this.reset();
    }
  }
}
