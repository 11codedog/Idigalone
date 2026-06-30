import { Color, Graphics } from 'cc';
import { TileType } from '../core/GameTypes';
import { isOreType } from '../config/GameConfig';
import { RunManager } from '../gameplay/RunManager';
import { UiColors } from './UiColors';
import { UiFactory } from './UiFactory';

export interface PixelMineViewport {
  columns: number;
  rows: number;
  startWorldX: number;
  startWorldY: number;
  startScreenX: number;
  startScreenY: number;
  cellSize: number;
  gap: number;
}

const PIXELS_PER_TILE = 8;
const MATERIAL_ALPHA = 255;

export class PixelMineMaterialView {
  public constructor(private readonly ui: UiFactory) {}

  public render(runManager: RunManager, viewport: PixelMineViewport): void {
    const pitch = viewport.cellSize + viewport.gap;
    const width = viewport.columns * viewport.cellSize + (viewport.columns - 1) * viewport.gap;
    const height = viewport.rows * viewport.cellSize + (viewport.rows - 1) * viewport.gap;
    const graphics = this.ui.graphicsLayer({
      name: 'PixelMineMaterial',
      x: 0,
      y: viewport.startScreenY - (height - viewport.cellSize) / 2,
      width,
      height,
    });

    graphics.clear();
    this.drawBase(graphics, width, height);

    for (let row = 0; row < viewport.rows; row += 1) {
      const worldY = viewport.startWorldY + row;
      const centerY = (height - viewport.cellSize) / 2 - row * pitch;

      for (let column = 0; column < viewport.columns; column += 1) {
        const worldX = viewport.startWorldX + column;
        const tileType = runManager.grid.getTile({ x: worldX, y: worldY }).type;
        const centerX = -width / 2 + viewport.cellSize / 2 + column * pitch;
        this.drawTileMaterial(graphics, tileType, worldX, worldY, centerX, centerY, viewport.cellSize, pitch);
      }
    }
  }

  private drawBase(graphics: Graphics, width: number, height: number): void {
    graphics.fillColor = new Color(8, 12, 16, MATERIAL_ALPHA);
    graphics.rect(-width / 2, -height / 2, width, height);
    graphics.fill();
  }

  private drawTileMaterial(
    graphics: Graphics,
    tileType: TileType,
    worldX: number,
    worldY: number,
    centerX: number,
    centerY: number,
    cellSize: number,
    pitch: number,
  ): void {
    const left = centerX - pitch / 2;
    const top = centerY + pitch / 2;
    const pixelSize = pitch / PIXELS_PER_TILE;

    for (let py = 0; py < PIXELS_PER_TILE; py += 1) {
      for (let px = 0; px < PIXELS_PER_TILE; px += 1) {
        const shade = this.noise(worldX, worldY, px, py);
        const color = this.getPixelColor(tileType, worldY, shade, px, py);
        graphics.fillColor = color;
        graphics.rect(left + px * pixelSize, top - (py + 1) * pixelSize, pixelSize + 0.35, pixelSize + 0.35);
        graphics.fill();
      }
    }

    if (isOreType(tileType)) {
      this.drawOreGlow(graphics, tileType, centerX, centerY, cellSize, worldX, worldY);
      return;
    }

    if (tileType === 'oxygen') {
      this.drawOxygenGlow(graphics, centerX, centerY, cellSize);
    }
  }

  private getPixelColor(tileType: TileType, depth: number, shade: number, px: number, py: number): Color {
    if (tileType === 'empty') {
      return this.adjust(new Color(12, 18, 24, 235), shade * 18 - 8 - this.getDepthDarkness(depth));
    }

    if (tileType === 'dirt') {
      const strata = py % 3 === 0 ? 14 : 0;
      return this.adjust(UiColors.tileDirt, shade * 30 - 12 + strata - this.getDepthDarkness(depth));
    }

    if (tileType === 'stone') {
      const crack = (px + py) % 5 === 0 ? -22 : 0;
      return this.adjust(UiColors.tileStone, shade * 22 - 10 + crack - this.getDepthDarkness(depth));
    }

    if (tileType === 'oxygen') {
      return this.adjust(UiColors.tileOxygen, shade * 20 - 6 - this.getDepthDarkness(depth) * 0.45);
    }

    if (isOreType(tileType)) {
      const matrix = tileType === 'coal' || tileType === 'obsidian' ? UiColors.tileStone : UiColors.tileDirt;
      const oreNoise = this.isOrePixel(tileType, px, py) ? this.getOreColor(tileType) : matrix;
      return this.adjust(oreNoise, shade * 28 - 9 - this.getDepthDarkness(depth) * 0.55);
    }

    return UiColors.tileFallback;
  }

  private drawOreGlow(
    graphics: Graphics,
    tileType: TileType,
    centerX: number,
    centerY: number,
    cellSize: number,
    worldX: number,
    worldY: number,
  ): void {
    const color = this.getOreColor(tileType);
    const offset = (this.noise(worldX, worldY, 9, 9) - 0.5) * cellSize * 0.18;
    graphics.fillColor = new Color(color.r, color.g, color.b, 72);
    graphics.rect(centerX - cellSize * 0.36 + offset, centerY - cellSize * 0.24, cellSize * 0.72, cellSize * 0.48);
    graphics.fill();
  }

  private drawOxygenGlow(graphics: Graphics, centerX: number, centerY: number, cellSize: number): void {
    graphics.fillColor = new Color(150, 255, 220, 70);
    graphics.rect(centerX - cellSize * 0.28, centerY - cellSize * 0.28, cellSize * 0.56, cellSize * 0.56);
    graphics.fill();
  }

  private getOreColor(tileType: TileType): Color {
    if (tileType === 'coal') {
      return new Color(92, 98, 106, 255);
    }

    if (tileType === 'tin') {
      return new Color(212, 230, 232, 255);
    }

    if (tileType === 'iron') {
      return new Color(166, 116, 88, 255);
    }

    if (tileType === 'silver') {
      return new Color(238, 246, 255, 255);
    }

    if (tileType === 'gold') {
      return new Color(255, 220, 86, 255);
    }

    if (tileType === 'emerald') {
      return new Color(74, 230, 145, 255);
    }

    if (tileType === 'crystal') {
      return new Color(120, 236, 255, 255);
    }

    if (tileType === 'ruby') {
      return new Color(255, 82, 114, 255);
    }

    if (tileType === 'obsidian') {
      return new Color(122, 86, 184, 255);
    }

    return new Color(236, 138, 70, 255);
  }

  private isOrePixel(tileType: TileType, px: number, py: number): boolean {
    if (tileType === 'coal') {
      return (px + py) % 4 === 0;
    }

    if (tileType === 'obsidian') {
      return px === py || px + py === PIXELS_PER_TILE - 1;
    }

    return Math.abs(px - 3.5) + Math.abs(py - 3.5) < 3 || (px + py) % 6 === 0;
  }

  private getDepthDarkness(depth: number): number {
    return Math.min(34, Math.max(0, depth - 20) * 0.22);
  }

  private noise(worldX: number, worldY: number, px: number, py: number): number {
    let value = Math.imul(worldX + 409, 73856093);
    value ^= Math.imul(worldY + 283, 19349663);
    value ^= Math.imul(px + 31, 83492791);
    value ^= Math.imul(py + 17, 2654435761);
    return ((value >>> 0) % 1000) / 1000;
  }

  private adjust(color: Color, amount: number): Color {
    return new Color(
      this.clampColor(color.r + amount),
      this.clampColor(color.g + amount),
      this.clampColor(color.b + amount),
      color.a,
    );
  }

  private clampColor(value: number): number {
    return Math.max(0, Math.min(255, Math.round(value)));
  }
}
