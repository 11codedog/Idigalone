import { ContinuousPosition } from '../gameplay/terrain/TerrainTypes';

export interface TerrainDigBrush {
  center: ContinuousPosition;
  radius: number;
  softness: number;
}

export interface TerrainDigStroke {
  from: ContinuousPosition;
  to: ContinuousPosition;
  radius: number;
  softness: number;
}

const MAX_CONNECTED_BRUSH_GAP_MULTIPLIER = 2.4;
export const MAX_TERRAIN_DIG_MASK_BRUSHES = 140;

export class TerrainDigMask {
  private readonly brushes: TerrainDigBrush[] = [];
  private readonly strokes: TerrainDigStroke[] = [];

  public addBrush(brush: TerrainDigBrush): void {
    const normalized = {
      center: { ...brush.center },
      radius: Math.max(0.01, brush.radius),
      softness: Math.max(0.001, Math.min(0.95, brush.softness)),
    };
    const previous = this.brushes[this.brushes.length - 1];
    if (previous && this.shouldConnect(previous, normalized)) {
      this.strokes.push({
        from: { ...previous.center },
        to: { ...normalized.center },
        radius: Math.max(previous.radius, normalized.radius),
        softness: Math.max(previous.softness, normalized.softness),
      });
    }

    this.brushes.push(normalized);
    this.trimBrushHistory();
  }

  public pruneOutsideView(center: ContinuousPosition, width: number, height: number, margin: number): void {
    const halfWidth = width / 2 + margin;
    const halfHeight = height / 2 + margin;
    const retained = this.brushes.filter((brush) => (
      Math.abs(brush.center.x - center.x) <= halfWidth + brush.radius &&
      Math.abs(brush.center.y - center.y) <= halfHeight + brush.radius
    ));

    if (retained.length === this.brushes.length) {
      return;
    }

    this.brushes.length = 0;
    this.brushes.push(...retained);
    this.rebuildStrokes();
  }

  public reset(): void {
    this.brushes.length = 0;
    this.strokes.length = 0;
  }

  public getBrushes(): TerrainDigBrush[] {
    return this.brushes.map((brush) => ({
      center: { ...brush.center },
      radius: brush.radius,
      softness: brush.softness,
    }));
  }

  public getStrokes(): TerrainDigStroke[] {
    return this.strokes.map((stroke) => ({
      from: { ...stroke.from },
      to: { ...stroke.to },
      radius: stroke.radius,
      softness: stroke.softness,
    }));
  }

  public getCoverage(position: ContinuousPosition): number {
    let coverage = 1;
    for (const brush of this.brushes) {
      coverage = Math.min(coverage, this.getBrushCoverage(position, brush));
      if (coverage <= 0) {
        return 0;
      }
    }

    for (const stroke of this.strokes) {
      coverage = Math.min(coverage, this.getStrokeCoverage(position, stroke));
      if (coverage <= 0) {
        return 0;
      }
    }

    return coverage;
  }

  private shouldConnect(previous: TerrainDigBrush, next: TerrainDigBrush): boolean {
    const distance = this.distance(previous.center, next.center);
    const maxRadius = Math.max(previous.radius, next.radius);
    return distance <= maxRadius * MAX_CONNECTED_BRUSH_GAP_MULTIPLIER;
  }

  private getBrushCoverage(position: ContinuousPosition, brush: TerrainDigBrush): number {
    if (
      Math.abs(position.x - brush.center.x) > brush.radius ||
      Math.abs(position.y - brush.center.y) > brush.radius
    ) {
      return 1;
    }

    const distance = this.distance(position, brush.center);
    return this.getDistanceCoverage(distance, brush.radius, brush.softness);
  }

  private getStrokeCoverage(position: ContinuousPosition, stroke: TerrainDigStroke): number {
    const minX = Math.min(stroke.from.x, stroke.to.x) - stroke.radius;
    const maxX = Math.max(stroke.from.x, stroke.to.x) + stroke.radius;
    const minY = Math.min(stroke.from.y, stroke.to.y) - stroke.radius;
    const maxY = Math.max(stroke.from.y, stroke.to.y) + stroke.radius;
    if (position.x < minX || position.x > maxX || position.y < minY || position.y > maxY) {
      return 1;
    }

    const distance = this.distanceToSegment(position, stroke.from, stroke.to);
    return this.getDistanceCoverage(distance, stroke.radius, stroke.softness);
  }

  private getDistanceCoverage(distance: number, radius: number, softness: number): number {
    const innerRadius = radius * (1 - softness);

    if (distance <= innerRadius) {
      return 0;
    }

    if (distance >= radius) {
      return 1;
    }

    return (distance - innerRadius) / Math.max(0.001, radius - innerRadius);
  }

  private distance(a: ContinuousPosition, b: ContinuousPosition): number {
    const deltaX = a.x - b.x;
    const deltaY = a.y - b.y;
    return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
  }

  private distanceToSegment(position: ContinuousPosition, from: ContinuousPosition, to: ContinuousPosition): number {
    const segmentX = to.x - from.x;
    const segmentY = to.y - from.y;
    const lengthSquared = segmentX * segmentX + segmentY * segmentY;
    if (lengthSquared <= 0.000001) {
      return this.distance(position, from);
    }

    const rawT = ((position.x - from.x) * segmentX + (position.y - from.y) * segmentY) / lengthSquared;
    const t = Math.max(0, Math.min(1, rawT));
    return this.distance(position, {
      x: from.x + segmentX * t,
      y: from.y + segmentY * t,
    });
  }

  private trimBrushHistory(): void {
    if (this.brushes.length <= MAX_TERRAIN_DIG_MASK_BRUSHES) {
      return;
    }

    this.brushes.splice(0, this.brushes.length - MAX_TERRAIN_DIG_MASK_BRUSHES);
    this.rebuildStrokes();
  }

  private rebuildStrokes(): void {
    this.strokes.length = 0;
    for (let index = 1; index < this.brushes.length; index += 1) {
      const previous = this.brushes[index - 1];
      const next = this.brushes[index];
      if (this.shouldConnect(previous, next)) {
        this.strokes.push({
          from: { ...previous.center },
          to: { ...next.center },
          radius: Math.max(previous.radius, next.radius),
          softness: Math.max(previous.softness, next.softness),
        });
      }
    }
  }
}
