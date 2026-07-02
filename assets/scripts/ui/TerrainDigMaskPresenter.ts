import type { ContinuousRunActionResult } from '../gameplay/ContinuousRunManager';
import { TerrainDigMask } from './TerrainDigMask';

const VISUAL_DIG_BRUSH_RADIUS = 0.46;
const VISUAL_DIG_BRUSH_SOFTNESS = 0.38;

export class TerrainDigMaskPresenter {
  public readonly mask = new TerrainDigMask();

  public reset(): void {
    this.mask.reset();
  }

  public recordRunAction(result: ContinuousRunActionResult): void {
    if (result.type !== 'dig' || !result.digResult || result.digResult.removedMaterialUnits <= 0) {
      return;
    }

    this.mask.addBrush({
      center: result.position,
      radius: VISUAL_DIG_BRUSH_RADIUS,
      softness: VISUAL_DIG_BRUSH_SOFTNESS,
    });
  }
}
