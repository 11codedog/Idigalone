import { ScreenLayoutMetrics } from './ScreenLayout';

export interface MineGridLayout {
  cellSize: number;
  gap: number;
  startScreenY: number;
}

export interface RunHudLayout {
  panelWidth: number;
  panelHeight: number;
  panelY: number;
  summaryY: number;
  oreY: number;
  meterX: number;
  oxygenY: number;
  backpackY: number;
  warningY: number;
}

export interface RunFooterLayout {
  y: number;
  pauseX: number;
  hintX: number;
  hintWidth: number;
  surfaceTextY: number;
  surfaceTextX: number;
  surfaceTextWidth: number;
  sellButtonX: number;
  shortcutX: number;
}

export interface RunScreenLayout {
  isLandscape: boolean;
  legendY: number;
  legendWidth: number;
  logY: number;
  logWidth: number;
  hud: RunHudLayout;
  grid: MineGridLayout;
  footer: RunFooterLayout;
}

export function createRunScreenLayout(metrics: ScreenLayoutMetrics): RunScreenLayout {
  return createSharedLayout(metrics);
}

function createSharedLayout(metrics: ScreenLayoutMetrics): RunScreenLayout {
  const isLandscape = metrics.visibleWidth > metrics.visibleHeight;
  const horizontalMargin = isLandscape ? 56 : 24;
  const topMargin = isLandscape ? 10 : 14;
  const bottomMargin = isLandscape ? 16 : 24;
  const topUiHeight = metrics.visibleHeight * 0.2;
  const screenTop = metrics.visibleHeight / 2;
  const screenBottom = -metrics.visibleHeight / 2;
  const uiTop = screenTop - topMargin;
  const uiBottom = screenTop - topUiHeight;
  const gridTop = uiBottom - (isLandscape ? 12 : 18);
  const gridBottom = screenBottom + bottomMargin;
  const gridHeight = Math.max(160, gridTop - gridBottom);
  const contentWidth = metrics.visibleWidth - horizontalMargin;
  const gap = isLandscape ? 3 : 4;
  const maxCellByHeight = (gridHeight - gap * 9) / 10;
  const maxCellByWidth = (contentWidth - gap * 8) / 9;
  const cellSize = clamp(Math.min(maxCellByHeight, maxCellByWidth), isLandscape ? 28 : 42, isLandscape ? 72 : 90);
  const gridTotalHeight = cellSize * 10 + gap * 9;
  const hudHeight = Math.max(96, topUiHeight - topMargin - 6);

  return {
    isLandscape,
    legendY: uiBottom + (isLandscape ? 20 : 28),
    legendWidth: contentWidth,
    logY: uiBottom + (isLandscape ? 4 : 8),
    logWidth: contentWidth,
    hud: {
      panelWidth: contentWidth,
      panelHeight: hudHeight,
      panelY: uiTop - hudHeight / 2,
      summaryY: uiTop - 28,
      oreY: uiTop - (isLandscape ? 58 : 70),
      meterX: -contentWidth / 2 + (isLandscape ? 220 : 250),
      oxygenY: uiTop - (isLandscape ? 56 : 74),
      backpackY: uiTop - (isLandscape ? 80 : 108),
      warningY: uiBottom + (isLandscape ? 42 : 54),
    },
    grid: {
      cellSize,
      gap,
      startScreenY: gridTop - (gridHeight - gridTotalHeight) / 2 - cellSize / 2,
    },
    footer: {
      y: uiTop - (isLandscape ? 58 : 72),
      pauseX: contentWidth / 2 - 80,
      hintX: contentWidth / 2 - (isLandscape ? 270 : 300),
      hintWidth: isLandscape ? 300 : 340,
      surfaceTextY: uiBottom + (isLandscape ? 8 : 14),
      surfaceTextX: 90,
      surfaceTextWidth: contentWidth - 260,
      sellButtonX: contentWidth / 2 - 250,
      shortcutX: contentWidth / 2 - 120,
    },
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
