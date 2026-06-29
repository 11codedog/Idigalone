import { Color, Node, tween, Vec3 } from 'cc';
import { TileType } from '../core/GameTypes';
import { RunManager } from '../gameplay/RunManager';
import { MineGridLayout } from './RunScreenLayout';
import { UiColors } from './UiColors';
import { UiFactory } from './UiFactory';

interface GridPosition {
  x: number;
  y: number;
}

export class MineGridView {
  private readonly visibleRows = 10;

  public constructor(private readonly ui: UiFactory) {}

  public render(
    runManager: RunManager,
    lastActionPosition: GridPosition | null,
    layout: MineGridLayout,
  ): void {
    const player = runManager.position;
    const startY = Math.max(0, player.y - 3);
    const visibleColumns = runManager.grid.width;
    const centerColumn = Math.floor(visibleColumns / 2);
    const startWorldX = player.x - centerColumn;
    const startScreenX = -((visibleColumns - 1) * (layout.cellSize + layout.gap)) / 2;

    for (let row = 0; row < this.visibleRows; row += 1) {
      const y = startY + row;
      const screenY = layout.startScreenY - row * (layout.cellSize + layout.gap);

      for (let column = 0; column < visibleColumns; column += 1) {
        const x = startWorldX + column;
        const isPlayer = player.x === x && player.y === y;
        const isRecentAction = Boolean(lastActionPosition?.x === x && lastActionPosition.y === y);
        const tileType = runManager.grid.getTile({ x, y }).type;
        const screenX = startScreenX + column * (layout.cellSize + layout.gap);
        this.createTileCell(tileType, isPlayer, isRecentAction, screenX, screenY, layout.cellSize);
      }
    }
  }

  private createTileCell(
    tileType: TileType,
    isPlayer: boolean,
    isRecentAction: boolean,
    x: number,
    y: number,
    cellSize: number,
  ): void {
    const node = this.ui.rect({
      name: 'Tile',
      x,
      y,
      width: cellSize,
      height: cellSize,
      fillColor: isPlayer ? UiColors.tilePlayer : this.getTileColor(tileType),
      strokeColor: this.getTileStrokeColor(isPlayer, isRecentAction),
      strokeWidth: isPlayer ? 3 : isRecentAction ? 2 : 1,
    });

    this.renderTileArt(tileType, isPlayer, node, cellSize);

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
      fontSize: Math.max(13, Math.round(cellSize * 0.55)),
      color: Color.WHITE,
      width: cellSize,
      height: cellSize,
      parent: node,
      name: 'PlayerText',
    });
  }

  private renderTileArt(tileType: TileType, isPlayer: boolean, parent: Node, cellSize: number): void {
    const path = this.getTileArtPath(tileType, isPlayer);
    if (!path) {
      return;
    }

    this.ui.image({
      name: isPlayer ? 'MinerSprite' : 'OreSprite',
      path,
      x: 0,
      y: 0,
      width: cellSize - 4,
      height: cellSize - 4,
      parent,
    });
  }

  private getTileArtPath(tileType: TileType, isPlayer: boolean): string | null {
    if (isPlayer) {
      return 'art/sprites/miner_protagonist';
    }

    if (tileType === 'copper') {
      return 'art/sprites/ore_copper';
    }

    if (tileType === 'silver') {
      return 'art/sprites/ore_silver';
    }

    return null;
  }

  private getTileColor(tileType: TileType): Color {
    if (tileType === 'empty') {
      return UiColors.tileEmpty;
    }

    if (tileType === 'dirt') {
      return UiColors.tileDirt;
    }

    if (tileType === 'stone') {
      return UiColors.tileStone;
    }

    if (tileType === 'copper') {
      return UiColors.tileCopper;
    }

    if (tileType === 'iron') {
      return UiColors.tileIron;
    }

    if (tileType === 'silver') {
      return UiColors.tileSilver;
    }

    if (tileType === 'gold') {
      return UiColors.tileGold;
    }

    if (tileType === 'crystal') {
      return UiColors.tileCrystal;
    }

    if (tileType === 'obsidian') {
      return UiColors.tileObsidian;
    }

    if (tileType === 'oxygen') {
      return UiColors.tileOxygen;
    }

    return UiColors.tileFallback;
  }

  private getTileStrokeColor(isPlayer: boolean, isRecentAction: boolean): Color {
    if (isPlayer) {
      return UiColors.tilePlayerStroke;
    }

    if (isRecentAction) {
      return UiColors.tileRecentStroke;
    }

    return UiColors.tileNormalStroke;
  }

}
