import { ORE_TYPES } from '../config/GameConfig';
import { OreType } from '../core/GameTypes';
import { TerrainMaterial } from '../gameplay/terrain/TerrainTypes';

export interface TerrainRgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

export class TerrainColorPalette {
  public caveColor(depth: number, grain: number): TerrainRgba {
    return this.adjust(COLORS.air, -Math.max(0, depth - 20) * 0.08 + (grain - 0.5) * 10);
  }

  public soilColor(hostMaterial: TerrainMaterial, depth: number, grain: number, edgeShade: number): TerrainRgba {
    const base = this.getSoilBaseColor(hostMaterial);
    const depthShade = -Math.max(0, depth - 20) * 0.16;
    const grainShade = (grain - 0.5) * this.getGrainStrength(hostMaterial);
    return this.adjust(base, depthShade + grainShade - edgeShade);
  }

  public oreColor(material: TerrainMaterial, depth: number, grain: number): TerrainRgba {
    const base = this.isOreMaterial(material) ? COLORS[material] : COLORS.oxygen;
    return this.adjust(base, -Math.max(0, depth - 40) * 0.08 + (grain - 0.5) * 42);
  }

  public colorFor(material: TerrainMaterial, depth: number, grain: number, edgeShade: number): TerrainRgba {
    const base = this.getBaseColor(material);
    const depthShade = material === 'air' ? 0 : -Math.max(0, depth - 20) * 0.16;
    const grainShade = (grain - 0.5) * this.getGrainStrength(material);
    return this.adjust(base, depthShade + grainShade - edgeShade);
  }

  private getBaseColor(material: TerrainMaterial): TerrainRgba {
    if (material === 'air') {
      return COLORS.air;
    }

    if (material === 'dirt') {
      return COLORS.dirt;
    }

    if (material === 'stone') {
      return COLORS.stone;
    }

    if (material === 'oxygen') {
      return COLORS.oxygen;
    }

    if (this.isOreMaterial(material)) {
      return COLORS[material];
    }

    return COLORS.fallback;
  }

  private getSoilBaseColor(material: TerrainMaterial): TerrainRgba {
    if (material === 'air') {
      return COLORS.air;
    }

    if (material === 'stone') {
      return COLORS.stone;
    }

    return COLORS.dirt;
  }

  private isOreMaterial(material: TerrainMaterial): material is OreType {
    return ORE_TYPES.indexOf(material as OreType) >= 0;
  }

  private getGrainStrength(material: TerrainMaterial): number {
    if (material === 'air') {
      return 12;
    }

    if (material === 'stone') {
      return 30;
    }

    if (material === 'dirt') {
      return 38;
    }

    return 46;
  }

  private adjust(color: TerrainRgba, amount: number): TerrainRgba {
    return {
      r: this.clampColor(color.r + amount),
      g: this.clampColor(color.g + amount),
      b: this.clampColor(color.b + amount),
      a: color.a,
    };
  }

  private clampColor(value: number): number {
    return Math.max(0, Math.min(255, Math.round(value)));
  }
}

const COLORS: Record<TerrainMaterial | 'fallback', TerrainRgba> = {
  air: { r: 8, g: 16, b: 22, a: 255 },
  dirt: { r: 100, g: 66, b: 42, a: 255 },
  stone: { r: 92, g: 94, b: 98, a: 255 },
  oxygen: { r: 75, g: 205, b: 245, a: 255 },
  copper: { r: 206, g: 105, b: 45, a: 255 },
  coal: { r: 42, g: 44, b: 48, a: 255 },
  tin: { r: 174, g: 190, b: 192, a: 255 },
  iron: { r: 155, g: 90, b: 58, a: 255 },
  silver: { r: 210, g: 220, b: 232, a: 255 },
  gold: { r: 245, g: 190, b: 54, a: 255 },
  emerald: { r: 68, g: 210, b: 130, a: 255 },
  crystal: { r: 118, g: 230, b: 248, a: 255 },
  ruby: { r: 230, g: 58, b: 88, a: 255 },
  obsidian: { r: 48, g: 38, b: 76, a: 255 },
  fallback: { r: 240, g: 80, b: 220, a: 255 },
};
