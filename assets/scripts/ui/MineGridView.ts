import { Color, Node, tween, Vec3 } from 'cc';
import { TileType } from '../core/GameTypes';
import { isOreType } from '../config/GameConfig';
import { RunManager } from '../gameplay/RunManager';
import { PixelMineMaterialView, PixelMineViewport } from './PixelMineMaterialView';
import { MineGridLayout } from './RunScreenLayout';
import { UiColors } from './UiColors';
import { UiFactory } from './UiFactory';

interface GridPosition {
  x: number;
  y: number;
}

const ORE_SYMBOLS: Partial<Record<TileType, string>> = {
  copper: 'Cu',
  coal: 'C',
  tin: 'Sn',
  iron: 'Fe',
  silver: 'Ag',
  gold: 'Au',
  emerald: 'Em',
  crystal: 'Cr',
  ruby: 'Rb',
  obsidian: 'Ob',
};

const ORE_ICON_COLORS: Partial<Record<TileType, Color>> = {
  copper: UiColors.tileCopper,
  coal: UiColors.tileCoal,
  tin: UiColors.tileTin,
  iron: UiColors.tileIron,
  silver: UiColors.tileSilver,
  gold: UiColors.tileGold,
  emerald: UiColors.tileEmerald,
  crystal: UiColors.tileCrystal,
  ruby: UiColors.tileRuby,
  obsidian: UiColors.tileObsidian,
};

export class MineGridView {
  private readonly visibleRows = 10;
  private readonly materialView: PixelMineMaterialView;

  public constructor(private readonly ui: UiFactory) {
    this.materialView = new PixelMineMaterialView(ui);
  }

  public render(
    runManager: RunManager,
    lastActionPosition: GridPosition | null,
    layout: MineGridLayout,
  ): void {
    const viewport = this.createViewport(runManager, layout);
    this.materialView.render(runManager, viewport);
    this.renderOverlays(runManager, lastActionPosition, viewport);
  }

  private createViewport(runManager: RunManager, layout: MineGridLayout): PixelMineViewport {
    const player = runManager.position;
    const columns = runManager.grid.width;
    const centerColumn = Math.floor(columns / 2);
    return {
      columns,
      rows: this.visibleRows,
      startWorldX: player.x - centerColumn,
      startWorldY: Math.max(0, player.y - 3),
      startScreenX: -((columns - 1) * (layout.cellSize + layout.gap)) / 2,
      startScreenY: layout.startScreenY,
      cellSize: layout.cellSize,
      gap: layout.gap,
    };
  }

  private renderOverlays(
    runManager: RunManager,
    lastActionPosition: GridPosition | null,
    viewport: PixelMineViewport,
  ): void {
    const player = runManager.position;
    for (let row = 0; row < viewport.rows; row += 1) {
      const y = viewport.startWorldY + row;
      const screenY = viewport.startScreenY - row * (viewport.cellSize + viewport.gap);

      for (let column = 0; column < viewport.columns; column += 1) {
        const x = viewport.startWorldX + column;
        const screenX = viewport.startScreenX + column * (viewport.cellSize + viewport.gap);
        const tileType = runManager.grid.getTile({ x, y }).type;
        const isPlayer = player.x === x && player.y === y;
        const isRecentAction = Boolean(lastActionPosition?.x === x && lastActionPosition.y === y);
        this.renderTileOverlay(tileType, isPlayer, isRecentAction, screenX, screenY, viewport.cellSize);
      }
    }
  }

  private renderTileOverlay(
    tileType: TileType,
    isPlayer: boolean,
    isRecentAction: boolean,
    x: number,
    y: number,
    cellSize: number,
  ): void {
    if (isRecentAction && !isPlayer) {
      this.renderRecentActionFlash(x, y, cellSize);
    }

    if (isOreType(tileType)) {
      this.renderOreIcon(tileType, x, y, cellSize);
    } else if (tileType === 'oxygen') {
      this.renderOxygenIcon(x, y, cellSize);
    }

    if (isPlayer) {
      this.renderPlayer(x, y, cellSize);
    }
  }

  private renderRecentActionFlash(x: number, y: number, cellSize: number): void {
    const node = this.ui.rect({
      name: 'DigFlash',
      x,
      y,
      width: cellSize * 1.04,
      height: cellSize * 1.04,
      fillColor: new Color(255, 226, 132, 70),
    });
    tween(node)
      .to(0.1, { scale: new Vec3(1.18, 1.18, 1) })
      .to(0.1, { scale: new Vec3(1, 1, 1) })
      .start();
  }

  private renderOreIcon(tileType: TileType, x: number, y: number, cellSize: number): void {
    const path = this.getTileArtPath(tileType);
    const iconSize = cellSize * 0.9;
    const glowSize = cellSize * 0.78;
    const color = ORE_ICON_COLORS[tileType] ?? UiColors.tileCopper;
    const iconRoot = this.ui.layer({
      name: 'OreIcon',
      x,
      y,
      width: iconSize,
      height: iconSize,
    });

    this.ui.rect({
      name: 'OreGlow',
      x: 0,
      y: 0,
      width: glowSize,
      height: glowSize,
      fillColor: new Color(color.r, color.g, color.b, 95),
      parent: iconRoot,
    });

    if (path) {
      this.ui.image({
        name: 'OreSprite',
        path,
        x: 0,
        y: 0,
        width: iconSize,
        height: iconSize,
        parent: iconRoot,
      });
    }

    this.ui.label({
      text: ORE_SYMBOLS[tileType] ?? 'Ore',
      x: 0,
      y: 0,
      fontSize: Math.max(13, Math.round(cellSize * 0.26)),
      color: Color.WHITE,
      width: iconSize,
      height: iconSize,
      parent: iconRoot,
      name: 'OreSymbol',
    });
  }

  private renderOxygenIcon(x: number, y: number, cellSize: number): void {
    const iconRoot = this.ui.layer({
      name: 'OxygenIcon',
      x,
      y,
      width: cellSize,
      height: cellSize,
    });
    this.ui.rect({
      name: 'OxygenGlow',
      x: 0,
      y: 0,
      width: cellSize * 0.84,
      height: cellSize * 0.84,
      fillColor: new Color(110, 255, 210, 95),
      parent: iconRoot,
    });
    this.ui.label({
      text: 'O2',
      x: 0,
      y: 0,
      fontSize: Math.max(14, Math.round(cellSize * 0.3)),
      color: Color.WHITE,
      width: cellSize,
      height: cellSize,
      parent: iconRoot,
      name: 'OxygenText',
    });
  }

  private renderPlayer(x: number, y: number, cellSize: number): void {
    const playerRoot = this.ui.layer({
      name: 'PlayerOverlay',
      x,
      y,
      width: cellSize * 1.45,
      height: cellSize * 1.45,
    });
    playerRoot.setScale(new Vec3(1, 1, 1));
    tween(playerRoot)
      .to(0.08, { scale: new Vec3(1.08, 1.08, 1) })
      .to(0.08, { scale: new Vec3(1, 1, 1) })
      .start();

    this.ui.rect({
      name: 'PlayerGlow',
      x: 0,
      y: 0,
      width: cellSize * 1.22,
      height: cellSize * 1.22,
      fillColor: new Color(80, 180, 255, 82),
      parent: playerRoot,
    });
    this.ui.image({
      name: 'MinerSprite',
      path: 'art/sprites/miner_protagonist',
      x: 0,
      y: 0,
      width: cellSize * 1.35,
      height: cellSize * 1.35,
      parent: playerRoot,
    });
    this.renderMinerFallback(playerRoot, cellSize);
  }

  private renderMinerFallback(parent: Node, cellSize: number): void {
    this.ui.label({
      text: '@',
      x: 0,
      y: 0,
      fontSize: Math.max(18, Math.round(cellSize * 0.5)),
      color: Color.WHITE,
      width: cellSize,
      height: cellSize,
      parent,
      name: 'PlayerText',
    });
    this.ui.rect({
      name: 'MinerLamp',
      x: cellSize * 0.24,
      y: cellSize * 0.28,
      width: cellSize * 0.28,
      height: cellSize * 0.12,
      fillColor: new Color(255, 231, 126, 210),
      parent,
    });
  }

  private getTileArtPath(tileType: TileType): string | null {
    if (tileType === 'copper') {
      return 'art/sprites/ore_copper';
    }

    if (tileType === 'silver') {
      return 'art/sprites/ore_silver';
    }

    return null;
  }
}
