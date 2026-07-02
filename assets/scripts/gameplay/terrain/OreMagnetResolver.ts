import { ORE_TYPES } from '../../config/GameConfig';
import { OreType } from '../../core/GameTypes';
import { ContinuousTerrain } from './ContinuousTerrain';
import { TERRAIN_CONFIG } from './TerrainConfig';
import { ContinuousPosition, TerrainSampleCoordinate } from './TerrainTypes';

export interface OreMagnetRequest {
  center: ContinuousPosition;
  radius: number;
}

export interface OreMagnetCandidate {
  coordinate: TerrainSampleCoordinate;
  material: OreType;
  distanceSquared: number;
}

export class OreMagnetResolver {
  public resolve(terrain: ContinuousTerrain, request: OreMagnetRequest): OreMagnetCandidate[] {
    const safeRadius = Math.max(TERRAIN_CONFIG.sampleSize * 0.5, request.radius);
    const maxDistanceSquared = safeRadius * safeRadius;
    const min = terrain.getSampleCoordinate({ x: request.center.x - safeRadius, y: request.center.y - safeRadius });
    const max = terrain.getSampleCoordinate({ x: request.center.x + safeRadius, y: request.center.y + safeRadius });
    const candidates: OreMagnetCandidate[] = [];

    for (let y = min.y; y <= max.y; y += 1) {
      for (let x = min.x; x <= max.x; x += 1) {
        const coordinate = { x, y };
        const sample = terrain.sampleAtCoordinate(coordinate);
        const material = sample.material as OreType;
        if (ORE_TYPES.indexOf(material) < 0) {
          continue;
        }

        const sampleCenter = terrain.getSampleCenter(coordinate);
        const distanceSquared = this.getDistanceSquared(request.center, sampleCenter);
        if (distanceSquared <= maxDistanceSquared) {
          candidates.push({
            coordinate,
            material,
            distanceSquared,
          });
        }
      }
    }

    return candidates.sort((a, b) => (
      a.distanceSquared - b.distanceSquared ||
      a.coordinate.y - b.coordinate.y ||
      a.coordinate.x - b.coordinate.x
    ));
  }

  private getDistanceSquared(a: ContinuousPosition, b: ContinuousPosition): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return dx * dx + dy * dy;
  }
}
