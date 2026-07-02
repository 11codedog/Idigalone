import { isOreType, TILE_CONFIG } from '../../config/GameConfig';
import { OreType } from '../../core/GameTypes';
import { ContinuousTerrain } from './ContinuousTerrain';
import { TERRAIN_CONFIG } from './TerrainConfig';
import {
  ContinuousPosition,
  TerrainDigDelta,
  TerrainMaterial,
  TerrainSampleCoordinate,
} from './TerrainTypes';

export interface DigBrushRequest {
  center: ContinuousPosition;
  radius: number;
  digPower: number;
}

export interface DigBrushResult {
  removedMaterialUnits: number;
  inventoryDelta: Partial<Record<OreType, number>>;
  oxygenCost: number;
  recoveredOxygen: number;
  slowedByHardness: boolean;
  digDelta: TerrainDigDelta;
}

export class DigBrushResolver {
  public resolve(terrain: ContinuousTerrain, request: DigBrushRequest): DigBrushResult {
    const removedSamples = [];
    const inventoryDelta: Partial<Record<OreType, number>> = {};
    let oxygenCost = 0;
    let recoveredOxygen = 0;
    let slowedByHardness = false;

    for (const coordinate of this.getBrushCoordinates(terrain, request.center, request.radius)) {
      const sample = terrain.sampleAtCoordinate(coordinate);
      if (sample.material === 'air') {
        continue;
      }

      if (request.digPower < sample.hardness) {
        slowedByHardness = true;
        continue;
      }

      const units = 1;
      removedSamples.push({
        coordinate,
        material: sample.material,
        units,
      });
      oxygenCost += this.getOxygenCost(sample.material) * units;
      recoveredOxygen += this.getRecoveredOxygen(sample.material) * units;

      if (isOreType(sample.material)) {
        inventoryDelta[sample.material] = (inventoryDelta[sample.material] ?? 0) + units;
      }
    }

    return {
      removedMaterialUnits: removedSamples.reduce((sum, sample) => sum + sample.units, 0),
      inventoryDelta,
      oxygenCost,
      recoveredOxygen,
      slowedByHardness,
      digDelta: {
        removedSamples,
      },
    };
  }

  private getBrushCoordinates(
    terrain: ContinuousTerrain,
    center: ContinuousPosition,
    radius: number,
  ): TerrainSampleCoordinate[] {
    const safeRadius = Math.max(TERRAIN_CONFIG.sampleSize * 0.5, radius);
    const min = terrain.getSampleCoordinate({ x: center.x - safeRadius, y: center.y - safeRadius });
    const max = terrain.getSampleCoordinate({ x: center.x + safeRadius, y: center.y + safeRadius });
    const coordinates: TerrainSampleCoordinate[] = [];

    for (let y = min.y; y <= max.y; y += 1) {
      for (let x = min.x; x <= max.x; x += 1) {
        const coordinate = { x, y };
        const sampleCenter = terrain.getSampleCenter(coordinate);
        if (this.getDistance(center, sampleCenter) <= safeRadius) {
          coordinates.push(coordinate);
        }
      }
    }

    return coordinates;
  }

  private getDistance(a: ContinuousPosition, b: ContinuousPosition): number {
    const deltaX = a.x - b.x;
    const deltaY = a.y - b.y;
    return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
  }

  private getOxygenCost(material: TerrainMaterial): number {
    if (material === 'air') {
      return 0;
    }

    return TILE_CONFIG[material].oxygenCost;
  }

  private getRecoveredOxygen(material: TerrainMaterial): number {
    if (material === 'air') {
      return 0;
    }

    return TILE_CONFIG[material].oxygenRecover;
  }
}
