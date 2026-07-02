import { ContinuousTerrain } from '../gameplay/terrain/ContinuousTerrain';
import { ORE_TYPES } from '../config/GameConfig';
import { OreType } from '../core/GameTypes';
import { ContinuousPosition, TerrainMaterial, TerrainSampleCoordinate } from '../gameplay/terrain/TerrainTypes';
import { TerrainColorPalette, TerrainRgba } from './TerrainColorPalette';
import { TerrainDigMask } from './TerrainDigMask';

export interface TerrainVisualSampleRequest {
  terrain: ContinuousTerrain;
  center: ContinuousPosition;
  worldWidth: number;
  worldHeight: number;
  digMask?: TerrainDigMask;
  maxOres?: number;
  priorityPosition?: ContinuousPosition;
}

export interface TerrainLayerColor extends TerrainRgba {
  material: TerrainMaterial;
}

export interface TerrainOreSprite {
  material: OreType;
  position: ContinuousPosition;
  alpha: number;
  scale: number;
  rotation: number;
}

export interface TerrainOreSpriteSample {
  ores: TerrainOreSprite[];
}

export interface TerrainSoilTile {
  coordinate: TerrainSampleCoordinate;
  position: ContinuousPosition;
  color: TerrainLayerColor;
}

export interface TerrainSoilTileSample {
  tiles: TerrainSoilTile[];
}

export class TerrainVisualSampler {
  public constructor(private readonly palette = new TerrainColorPalette()) {}

  public sampleOreSprites(request: TerrainVisualSampleRequest): TerrainOreSpriteSample {
    const bounds = this.getVisibleSampleBounds(request);
    const ores: TerrainOreSprite[] = [];

    for (let y = bounds.min.y; y <= bounds.max.y; y += 1) {
      for (let x = bounds.min.x; x <= bounds.max.x; x += 1) {
        const coordinate = { x, y };
        const sample = request.terrain.sampleAtCoordinate(coordinate);
        if (!this.isOreMaterial(sample.material)) {
          continue;
        }

        const position = request.terrain.getSampleCenter(coordinate);
        const coverage = request.digMask ? request.digMask.getCoverage(position) : 1;
        if (coverage <= 0.08) {
          continue;
        }

        const grain = this.noise(position.x, position.y, x, y);
        ores.push({
          material: sample.material,
          position,
          alpha: Math.max(150, Math.min(245, Math.round((0.72 + (1 - coverage) * 0.2) * 255))),
          scale: 0.82 + grain * 0.22,
          rotation: (grain - 0.5) * 10,
        });
      }
    }

    return {
      ores: this.limitOreSprites(ores, request),
    };
  }

  private limitOreSprites(
    ores: TerrainOreSprite[],
    request: TerrainVisualSampleRequest,
  ): TerrainOreSprite[] {
    const maxOres = Math.floor(request.maxOres ?? ores.length);
    if (ores.length <= maxOres) {
      return ores;
    }

    const priority = request.priorityPosition ?? request.center;
    return [...ores]
      .sort((a, b) => (
        this.getSquaredDistance(a.position, priority) - this.getSquaredDistance(b.position, priority) ||
        a.position.y - b.position.y ||
        a.position.x - b.position.x
      ))
      .slice(0, Math.max(0, maxOres));
  }

  public sampleSoilTiles(request: TerrainVisualSampleRequest): TerrainSoilTileSample {
    const bounds = this.getVisibleSampleBounds(request);
    const tiles: TerrainSoilTile[] = [];

    for (let y = bounds.min.y; y <= bounds.max.y; y += 1) {
      for (let x = bounds.min.x; x <= bounds.max.x; x += 1) {
        const coordinate = { x, y };
        const sample = request.terrain.sampleAtCoordinate(coordinate);
        if (sample.material === 'air') {
          continue;
        }

        const position = request.terrain.getSampleCenter(coordinate);
        const coverage = request.digMask ? request.digMask.getCoverage(position) : 1;
        if (coverage <= 0.03) {
          continue;
        }

        const grain = this.noise(position.x, position.y, x, y);
        const hostMaterial = this.getHostMaterial(sample.material, position.y, grain);
        const edgeShade = coverage < 1
          ? 34 * (1 - coverage)
          : this.getCoordinateEdgeShade(request.terrain, coordinate);
        tiles.push({
          coordinate,
          position,
          color: {
            ...this.palette.soilColor(hostMaterial, position.y, grain, edgeShade),
            a: Math.round(coverage * 255),
            material: hostMaterial,
          },
        });
      }
    }

    return { tiles };
  }

  private getVisibleSampleBounds(request: TerrainVisualSampleRequest): {
    min: TerrainSampleCoordinate;
    max: TerrainSampleCoordinate;
  } {
    const topLeft = {
      x: request.center.x - request.worldWidth / 2,
      y: request.center.y - request.worldHeight / 2,
    };
    const bottomRight = {
      x: request.center.x + request.worldWidth / 2,
      y: request.center.y + request.worldHeight / 2,
    };
    return {
      min: request.terrain.getSampleCoordinate(topLeft),
      max: request.terrain.getSampleCoordinate(bottomRight),
    };
  }

  private getCoordinateEdgeShade(terrain: ContinuousTerrain, coordinate: TerrainSampleCoordinate): number {
    const neighbors = [
      terrain.sampleAtCoordinate({ x: coordinate.x + 1, y: coordinate.y }).material,
      terrain.sampleAtCoordinate({ x: coordinate.x - 1, y: coordinate.y }).material,
      terrain.sampleAtCoordinate({ x: coordinate.x, y: coordinate.y + 1 }).material,
      terrain.sampleAtCoordinate({ x: coordinate.x, y: coordinate.y - 1 }).material,
    ];
    return neighbors.some((neighbor) => neighbor === 'air') ? 32 : 0;
  }

  private getHostMaterial(material: TerrainMaterial, depth: number, grain: number): TerrainMaterial {
    if (material === 'air') {
      return 'air';
    }

    if (material === 'stone') {
      return 'stone';
    }

    if (depth > 70 && grain > 0.68) {
      return 'stone';
    }

    return 'dirt';
  }

  private isOreMaterial(material: TerrainMaterial): material is OreType {
    return ORE_TYPES.indexOf(material as OreType) >= 0;
  }

  private getSquaredDistance(a: ContinuousPosition, b: ContinuousPosition): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return dx * dx + dy * dy;
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
