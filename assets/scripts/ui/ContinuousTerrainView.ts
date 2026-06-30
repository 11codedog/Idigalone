import { Color } from 'cc';
import { ContinuousRunManager } from '../gameplay/ContinuousRunManager';
import { MineGridLayout } from './RunScreenLayout';
import { TerrainVisualSampler } from './TerrainVisualSampler';
import { UiFactory } from './UiFactory';

const WORLD_VIEW_WIDTH = 16;
const WORLD_VIEW_HEIGHT = 20;

export class ContinuousTerrainView {
  private readonly sampler = new TerrainVisualSampler();

  public constructor(private readonly ui: UiFactory) {}

  public render(runManager: ContinuousRunManager, layout: MineGridLayout): void {
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

    const visual = this.sampler.sample({
      terrain: runManager.terrain,
      center: runManager.playerPosition,
      worldWidth: WORLD_VIEW_WIDTH,
      worldHeight: WORLD_VIEW_HEIGHT,
    });
    const pixelWidth = width / visual.width;
    const pixelHeight = height / visual.height;
    for (let row = 0; row < visual.height; row += 1) {
      for (let column = 0; column < visual.width; column += 1) {
        const cell = visual.cells[row * visual.width + column];
        graphics.fillColor = new Color(cell.r, cell.g, cell.b, cell.a);
        graphics.rect(
          -width / 2 + column * pixelWidth,
          height / 2 - (row + 1) * pixelHeight,
          pixelWidth + 0.1,
          pixelHeight + 0.1,
        );
        graphics.fill();
      }
    }

    this.renderPlayer(centerY, layout.cellSize);
  }

  private renderPlayer(centerY: number, cellSize: number): void {
    const iconSize = cellSize * 1.55;
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
    this.ui.image({
      name: 'MinerSprite',
      path: 'art/sprites/miner_protagonist',
      x: 0,
      y: 0,
      width: iconSize,
      height: iconSize,
      parent: playerRoot,
    });
    this.ui.label({
      text: '@',
      x: 0,
      y: 0,
      fontSize: Math.max(22, Math.round(cellSize * 0.58)),
      color: Color.WHITE,
      width: iconSize,
      height: iconSize,
      parent: playerRoot,
      name: 'PlayerFallback',
    });
  }

  private getViewWidth(layout: MineGridLayout): number {
    return layout.cellSize * 9 + layout.gap * 8;
  }

  private getViewHeight(layout: MineGridLayout): number {
    return layout.cellSize * 10 + layout.gap * 9;
  }
}
