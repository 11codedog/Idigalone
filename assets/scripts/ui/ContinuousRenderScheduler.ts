export class ContinuousRenderScheduler {
  private pending = false;
  private cooldownSeconds = 0;

  public constructor(private readonly intervalSeconds = 1 / 12) {}

  public request(): void {
    this.pending = true;
  }

  public cancel(): void {
    this.pending = false;
    this.cooldownSeconds = 0;
  }

  public update(deltaTime: number): boolean {
    if (!this.pending) {
      return false;
    }

    this.cooldownSeconds = Math.max(0, this.cooldownSeconds - Math.max(0, deltaTime));
    if (this.cooldownSeconds > 0) {
      return false;
    }

    this.pending = false;
    this.cooldownSeconds = this.intervalSeconds;
    return true;
  }
}
