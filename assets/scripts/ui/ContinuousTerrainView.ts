import { Color, Graphics, Node, Vec3 } from 'cc';
import { OreType } from '../core/GameTypes';
import { ContinuousRunManager } from '../gameplay/ContinuousRunManager';
import { CONTINUOUS_RUN_CONFIG } from '../gameplay/ContinuousRunTypes';
import { ContinuousPosition } from '../gameplay/terrain/TerrainTypes';
import { TERRAIN_CONFIG } from '../gameplay/terrain/TerrainConfig';
import { MineGridLayout } from './RunScreenLayout';
import { TerrainColorPalette } from './TerrainColorPalette';
import { TerrainDigBrush, TerrainDigMask, TerrainDigStroke } from './TerrainDigMask';
import { TerrainVisualSampler } from './TerrainVisualSampler';
import { createTerrainViewportFrame, toTerrainScreen } from './TerrainViewportFrame';
import { UiFactory } from './UiFactory';

const WORLD_VIEW_WIDTH = 16;
const WORLD_VIEW_HEIGHT = 20;
const DIG_MASK_VIEW_MARGIN = 2;
const PLAYER_BODY_WORLD_RADIUS = CONTINUOUS_RUN_CONFIG.digRadius;

const ORE_SPRITE_PATHS: Record<OreType, string> = {
  copper: 'art/sprites/ore_copper',
  coal: 'art/sprites/ore_coal',
  tin: 'art/sprites/ore_tin',
  iron: 'art/sprites/ore_iron',
  silver: 'art/sprites/ore_silver',
  gold: 'art/sprites/ore_gold',
  emerald: 'art/sprites/ore_emerald',
  crystal: 'art/sprites/ore_crystal',
  ruby: 'art/sprites/ore_ruby',
  obsidian: 'art/sprites/ore_obsidian',
};

export class ContinuousTerrainView {
  private readonly sampler = new TerrainVisualSampler();
  private readonly palette = new TerrainColorPalette();

  public constructor(private readonly ui: UiFactory) {}

  public render(runManager: ContinuousRunManager, layout: MineGridLayout, digMask?: TerrainDigMask): void {
    const width = this.getViewWidth(layout);
    const height = this.getViewHeight(layout);
    const centerY = layout.startScreenY - (height - layout.cellSize) / 2;
    const graphics = this.ui.graphicsLayer({
      name: 'ContinuousTerrain',
      x: 0,
      y: centerY,
      width,
      height,
    });
    const frame = createTerrainViewportFrame({
      playerPosition: runManager.playerPosition,
      viewWidth: width,
      viewHeight: height,
      worldWidth: WORLD_VIEW_WIDTH,
      worldHeight: WORLD_VIEW_HEIGHT,
      surfaceY: TERRAIN_CONFIG.surfaceY,
    });
    digMask?.pruneOutsideView(frame.center, WORLD_VIEW_WIDTH, WORLD_VIEW_HEIGHT, DIG_MASK_VIEW_MARGIN);

    const terrainRequest = {
      terrain: runManager.terrain,
      center: frame.center,
      worldWidth: WORLD_VIEW_WIDTH,
      worldHeight: WORLD_VIEW_HEIGHT,
      digMask,
      maxOres: CONTINUOUS_RUN_CONFIG.maxRenderedOreSprites,
      priorityPosition: runManager.playerPosition,
    };
    const soilVisual = this.sampler.sampleSoilTiles(terrainRequest);
    const oreVisual = this.sampler.sampleOreSprites(terrainRequest);
    this.renderTerrainBase(graphics, frame.center, width, height);
    this.renderPersistentSoilLayer(graphics, soilVisual, frame.center, width, height);
    this.renderDigMask(graphics, frame.center, width, height, digMask);
    this.renderOreLayer(graphics.node, oreVisual, frame.center, width, height);

    this.renderPlayer(centerY + frame.playerScreenPosition.y, width, height);
  }

  private renderTerrainBase(
    graphics: Graphics,
    center: ContinuousPosition,
    width: number,
    height: number,
  ): void {
    const cave = this.palette.caveColor(center.y, 0.5);
    graphics.fillColor = new Color(cave.r, cave.g, cave.b, cave.a);
    graphics.rect(-width / 2, -height / 2, width, height);
    graphics.fill();
  }

  private renderPersistentSoilLayer(
    graphics: Graphics,
    visual: ReturnType<TerrainVisualSampler['sampleSoilTiles']>,
    center: ContinuousPosition,
    width: number,
    height: number,
  ): void {
    const tileSize = this.toScreenRadius(TERRAIN_CONFIG.sampleSize, width, height) + 0.6;
    for (const tile of visual.tiles) {
      const point = this.toScreen(tile.position, center, width, height);
      const color = tile.color;
      graphics.fillColor = new Color(color.r, color.g, color.b, color.a);
      graphics.rect(point.x - tileSize / 2, point.y - tileSize / 2, tileSize, tileSize);
      graphics.fill();
    }
  }

  private renderDigMask(
    graphics: Graphics,
    center: ContinuousPosition,
    width: number,
    height: number,
    digMask?: TerrainDigMask,
  ): void {
    if (!digMask) {
      return;
    }

    const cave = this.palette.caveColor(center.y, 0.48);
    const softColor = new Color(cave.r, cave.g, cave.b, 150);
    const hardColor = new Color(cave.r, cave.g, cave.b, 255);
    for (const stroke of digMask.getStrokes()) {
      this.renderStroke(graphics, stroke, center, width, height, softColor, true);
      this.renderStroke(graphics, stroke, center, width, height, hardColor, false);
    }

    for (const brush of digMask.getBrushes()) {
      this.renderBrush(graphics, brush, center, width, height, softColor, true);
      this.renderBrush(graphics, brush, center, width, height, hardColor, false);
    }
  }

  private renderStroke(
    graphics: Graphics,
    stroke: TerrainDigStroke,
    center: ContinuousPosition,
    width: number,
    height: number,
    color: Color,
    isSoftEdge: boolean,
  ): void {
    const from = this.toScreen(stroke.from, center, width, height);
    const to = this.toScreen(stroke.to, center, width, height);
    const radius = this.toScreenRadius(stroke.radius, width, height) * (isSoftEdge ? 1 + stroke.softness : 1 - stroke.softness * 0.22);
    graphics.strokeColor = color;
    graphics.fillColor = color;
    graphics.lineWidth = radius * 2;
    graphics.moveTo(from.x, from.y);
    graphics.lineTo(to.x, to.y);
    graphics.stroke();
    graphics.circle(from.x, from.y, radius);
    graphics.fill();
    graphics.circle(to.x, to.y, radius);
    graphics.fill();
  }

  private renderBrush(
    graphics: Graphics,
    brush: TerrainDigBrush,
    center: ContinuousPosition,
    width: number,
    height: number,
    color: Color,
    isSoftEdge: boolean,
  ): void {
    const point = this.toScreen(brush.center, center, width, height);
    const radius = this.toScreenRadius(brush.radius, width, height) * (isSoftEdge ? 1 + brush.softness : 1 - brush.softness * 0.22);
    graphics.fillColor = color;
    graphics.circle(point.x, point.y, radius);
    graphics.fill();
  }

  private renderOreLayer(
    parent: Node,
    visual: ReturnType<TerrainVisualSampler['sampleOreSprites']>,
    center: ContinuousPosition,
    width: number,
    height: number,
  ): void {
    const spriteSize = this.toScreenRadius(TERRAIN_CONFIG.sampleSize, width, height) * 1.65;
    for (const ore of visual.ores) {
      const point = this.toScreen(ore.position, center, width, height);
      const node = this.ui.image({
        name: `OreSprite_${ore.material}`,
        path: ORE_SPRITE_PATHS[ore.material],
        x: point.x,
        y: point.y,
        width: spriteSize * ore.scale,
        height: spriteSize * ore.scale,
        color: new Color(255, 255, 255, ore.alpha),
        parent,
      });
      node.setRotationFromEuler(new Vec3(0, 0, ore.rotation));
    }
  }

  private renderPlayer(centerY: number, width: number, height: number): void {
    const iconSize = this.toScreenRadius(PLAYER_BODY_WORLD_RADIUS, width, height) * 2;
    const playerRoot = this.ui.layer({
      name: 'ContinuousPlayer',
      x: 0,
      y: centerY,
      width: iconSize,
      height: iconSize,
    });
    this.ui.rect({
      name: 'PlayerGlow',
      x: 0,
      y: 0,
      width: iconSize * 0.9,
      height: iconSize * 0.9,
      fillColor: new Color(80, 180, 255, 86),
      parent: playerRoot,
    });
    this.ui.label({
      text: '@',
      x: 0,
      y: 0,
      fontSize: Math.max(10, Math.round(iconSize * 0.48)),
      color: Color.WHITE,
      width: iconSize,
      height: iconSize,
      parent: playerRoot,
      name: 'PlayerFallback',
    });
    this.ui.image({
      name: 'MinerSprite',
      path: 'art/sprites/miner_protagonist',
      x: 0,
      y: 0,
      width: iconSize,
      height: iconSize,
      parent: playerRoot,
    });
  }

  private getViewWidth(layout: MineGridLayout): number {
    return layout.cellSize * 9 + layout.gap * 8;
  }

  private getViewHeight(layout: MineGridLayout): number {
    return layout.cellSize * 10 + layout.gap * 9;
  }

  private toScreen(position: ContinuousPosition, center: ContinuousPosition, width: number, height: number): ContinuousPosition {
    return toTerrainScreen(position, center, width, height, WORLD_VIEW_WIDTH, WORLD_VIEW_HEIGHT);
  }

  private toScreenRadius(radius: number, width: number, height: number): number {
    return radius * Math.min(width / WORLD_VIEW_WIDTH, height / WORLD_VIEW_HEIGHT);
  }
}
