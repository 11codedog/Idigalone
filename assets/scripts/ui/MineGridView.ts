import { Color, tween, Vec3 } from 'cc';
import { TileType } from '../core/GameTypes';
import { RunManager } from '../gameplay/RunManager';
import { UiFactory } from './UiFactory';

interface GridPosition {
  x: number;
  y: number;
}

export class MineGridView {
  private readonly visibleRows = 10;
  private readonly cellSize = 30;
  private readonly gap = 4;
  private readonly startScreenY = 218;

  public constructor(private readonly ui: UiFactory) {}

  public render(runManager: RunManager, lastActionPosition: GridPosition | null): void {
    const player = runManager.position;
    const startY = Math.max(0, player.y - 3);
    const gridWidth = runManager.grid.width;
    const startX = -((gridWidth - 1) * (this.cellSize + this.gap)) / 2 + 35;

    for (let row = 0; row < this.visibleRows; row += 1) {
      const y = startY + row;
      const screenY = this.startScreenY - row * (this.cellSize + this.gap);
      this.ui.label({
        text: `${this.formatDepth(y)}m`,
        x: -190,
        y: screenY,
        fontSize: 16,
        color: new Color(210, 240, 255, 255),
        width: 70,
        height: this.cellSize,
      });

      for (let x = 0; x < gridWidth; x += 1) {
        const isPlayer = player.x === x && player.y === y;
        const isRecentAction = Boolean(lastActionPosition?.x === x && lastActionPosition.y === y);
        const tileType = runManager.grid.getTile({ x, y }).type;
        const screenX = startX + x * (this.cellSize + this.gap);
        this.createTileCell(tileType, isPlayer, isRecentAction, screenX, screenY);
      }
    }
  }

  private createTileCell(
    tileType: TileType,
    isPlayer: boolean,
    isRecentAction: boolean,
    x: number,
    y: number,
  ): void {
    const node = this.ui.rect({
      name: 'Tile',
      x,
      y,
      width: this.cellSize,
      height: this.cellSize,
      fillColor: isPlayer ? new Color(80, 180, 255, 255) : this.getTileColor(tileType),
      strokeColor: this.getTileStrokeColor(isPlayer, isRecentAction),
      strokeWidth: isPlayer ? 3 : isRecentAction ? 2 : 1,
    });

    if (!isPlayer) {
      return;
    }

    node.setScale(new Vec3(1, 1, 1));
    tween(node)
      .to(0.08, { scale: new Vec3(1.12, 1.12, 1) })
      .to(0.08, { scale: new Vec3(1, 1, 1) })
      .start();

    this.ui.label({
      text: '@',
      x: 0,
      y: 0,
      fontSize: 16,
      color: Color.WHITE,
      width: this.cellSize,
      height: this.cellSize,
      parent: node,
      name: 'PlayerText',
    });
  }

  private getTileColor(tileType: TileType): Color {
    if (tileType === 'empty') {
      return new Color(30, 38, 45, 255);
    }

    if (tileType === 'dirt') {
      return new Color(120, 78, 40, 255);
    }

    if (tileType === 'stone') {
      return new Color(95, 105, 115, 255);
    }

    if (tileType === 'copper') {
      return new Color(190, 105, 45, 255);
    }

    if (tileType === 'oxygen') {
      return new Color(60, 175, 130, 255);
    }

    return new Color(185, 195, 210, 255);
  }

  private getTileStrokeColor(isPlayer: boolean, isRecentAction: boolean): Color {
    if (isPlayer) {
      return new Color(255, 255, 255, 255);
    }

    if (isRecentAction) {
      return new Color(255, 230, 120, 255);
    }

    return new Color(5, 8, 10, 255);
  }

  private formatDepth(depth: number): string {
    return depth < 10 ? `0${depth}` : `${depth}`;
  }
}
