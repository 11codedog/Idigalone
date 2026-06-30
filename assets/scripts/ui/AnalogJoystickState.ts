import { InputVector } from '../gameplay/terrain/TerrainTypes';

export interface AnalogJoystickPoint {
  x: number;
  y: number;
}

export interface AnalogJoystickOptions {
  deadZone: number;
  maxRadius: number;
  invertY?: boolean;
}

export class AnalogJoystickState {
  private readonly deadZone: number;
  private readonly maxRadius: number;
  private readonly invertY: boolean;
  private activePointerId: number | null = null;
  private baseValue: AnalogJoystickPoint = { x: 0, y: 0 };
  private currentValue: AnalogJoystickPoint = { x: 0, y: 0 };

  public constructor(options: AnalogJoystickOptions) {
    this.deadZone = Math.max(0, options.deadZone);
    this.maxRadius = Math.max(1, options.maxRadius);
    this.invertY = Boolean(options.invertY);
  }

  public get isActive(): boolean {
    return this.activePointerId !== null;
  }

  public begin(pointerId: number, point: AnalogJoystickPoint): void {
    this.activePointerId = pointerId;
    this.baseValue = { ...point };
    this.currentValue = { ...point };
  }

  public move(pointerId: number, point: AnalogJoystickPoint): void {
    if (this.activePointerId !== pointerId) {
      return;
    }

    this.currentValue = { ...point };
  }

  public end(pointerId: number): void {
    if (this.activePointerId !== pointerId) {
      return;
    }

    this.reset();
  }

  public reset(): void {
    this.activePointerId = null;
    this.baseValue = { x: 0, y: 0 };
    this.currentValue = { x: 0, y: 0 };
  }

  public getInput(): InputVector {
    const delta = this.getDelta();
    const distance = this.getDistance(delta);
    if (distance < this.deadZone) {
      return { x: 0, y: 0, strength: 0 };
    }

    const y = this.invertY ? -delta.y : delta.y;
    return {
      x: delta.x / distance,
      y: y / distance,
      strength: Math.min(1, distance / this.maxRadius),
    };
  }

  public getKnobOffset(): AnalogJoystickPoint {
    const delta = this.getDelta();
    const distance = this.getDistance(delta);
    if (distance <= this.maxRadius) {
      return delta;
    }

    const ratio = this.maxRadius / distance;
    return {
      x: delta.x * ratio,
      y: delta.y * ratio,
    };
  }

  public getBasePosition(): AnalogJoystickPoint {
    return { ...this.baseValue };
  }

  private getDelta(): AnalogJoystickPoint {
    if (!this.isActive) {
      return { x: 0, y: 0 };
    }

    return {
      x: this.currentValue.x - this.baseValue.x,
      y: this.currentValue.y - this.baseValue.y,
    };
  }

  private getDistance(point: AnalogJoystickPoint): number {
    return Math.sqrt(point.x * point.x + point.y * point.y);
  }
}
