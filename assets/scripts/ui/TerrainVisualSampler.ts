import { ContinuousTerrain } from '../gameplay/terrain/ContinuousTerrain';
import { ContinuousPosition, TerrainMaterial } from '../gameplay/terrain/TerrainTypes';
import { TerrainColorPalette, TerrainRgba } from './TerrainColorPalette';

export interface TerrainVisualSampleRequest {
  terrain: ContinuousTerrain;
  center: ContinuousPosition;
  worldWidth: number;
  worldHeight: number;
  width?: number;
  height?: number;
}

export interface TerrainVisualCell extends TerrainRgba {
  material: TerrainMaterial;
}

export interface TerrainVisualSample {
  width: number;
  height: number;
  cells: TerrainVisualCell[];
}

const DEFAULT_WIDTH = 160;
const DEFAULT_HEIGHT = 220;

export class TerrainVisualSampler {
  public constructor(private readonly palette = new TerrainColorPalette()) {}

  public sample(request: TerrainVisualSampleRequest): TerrainVisualSample {
    const width = Math.max(160, Math.floor(request.width ?? DEFAULT_WIDTH));
    const height = Math.max(220, Math.floor(request.height ?? DEFAULT_HEIGHT));
    const cells: TerrainVisualCell[] = [];

    for (let row = 0; row < height; row += 1) {
      for (let column = 0; column < width; column += 1) {
        const world = this.toWorld(request, width, height, column, row);
        const material = request.terrain.sample(world).material;
        const grain = this.noise(world.x, world.y, column, row);
        const edgeShade = this.getEdgeShade(request.terrain, world, material, request.worldWidth / width);
        cells.push({
          ...this.palette.colorFor(material, world.y, grain, edgeShade),
          material,
        });
      }
    }

    return {
      width,
      height,
      cells,
    };
  }

  private toWorld(
    request: TerrainVisualSampleRequest,
    width: number,
    height: number,
    column: number,
    row: number,
  ): ContinuousPosition {
    return {
      x: request.center.x + (column / width - 0.5) * request.worldWidth,
      y: request.center.y + (row / height - 0.5) * request.worldHeight,
    };
  }

  private getEdgeShade(
    terrain: ContinuousTerrain,
    world: ContinuousPosition,
    material: TerrainMaterial,
    step: number,
  ): number {
    if (material === 'air') {
      return 0;
    }

    const neighbors = [
      terrain.sample({ x: world.x + step, y: world.y }).material,
      terrain.sample({ x: world.x - step, y: world.y }).material,
      terrain.sample({ x: world.x, y: world.y + step }).material,
      terrain.sample({ x: world.x, y: world.y - step }).material,
    ];
    return neighbors.some((neighbor) => neighbor === 'air') ? 32 : 0;
  }

  private noise(x: number, y: number, column: number, row: number): number {
    const xi = Math.floor(x * 19);
    const yi = Math.floor(y * 19);
    let value = Math.imul(xi + 374761393, 668265263) ^ Math.imul(yi + 1442695041, 2246822519);
    value ^= Math.imul(column + 31, 3266489917) ^ Math.imul(row + 17, 668265263);
    value ^= value >>> 13;
    value = Math.imul(value, 1274126177);
    return ((value >>> 0) % 1000) / 1000;
  }
}
