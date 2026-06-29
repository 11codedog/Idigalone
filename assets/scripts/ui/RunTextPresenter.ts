import { Color } from 'cc';
import { RunState, TileType } from '../core/GameTypes';
import { TILE_CONFIG } from '../config/GameConfig';
import { RunBlockReason, RunEndReason } from '../gameplay/RunManager';

export class RunTextPresenter {
  public warningText(run: RunState): string {
    if (this.isOxygenLow(run)) {
      return '氧气紧张，考虑回到地表出售，或用返回绳结算。';
    }

    if (this.isBackpackFull(run)) {
      return '背包已满，回到地表出售后升级背包。';
    }

    return '向上只能走已经挖空的路，不能向上挖。';
  }

  public warningColor(run: RunState): Color {
    if (this.isOxygenLow(run)) {
      return new Color(255, 120, 100, 255);
    }

    if (this.isBackpackFull(run)) {
      return new Color(255, 220, 100, 255);
    }

    return new Color(210, 240, 255, 255);
  }

  public pauseBody(run: RunState): string {
    return [
      `当前深度：${run.depth}m`,
      `氧气：${run.oxygen}/${run.maxOxygen}`,
      `背包：${run.backpackUsed}/${run.backpackCapacity}`,
      '',
      '继续下矿会回到当前矿洞，返回结算会立刻卖出本局矿石。',
    ].join('\n');
  }

  public blockReason(reason: RunBlockReason | undefined): string {
    if (reason === 'upwardDigForbidden') {
      return '不能向上挖，只能向上经过已经挖空的路';
    }

    if (reason === 'backpackFull') {
      return '背包已满';
    }

    if (reason === 'outOfBounds') {
      return '已经到边界';
    }

    if (reason === 'notAtSurface') {
      return '需要先回到 0m 地表';
    }

    return '未知原因';
  }

  public endReason(reason: RunEndReason | undefined): string {
    if (reason === 'oxygenDepleted') {
      return '氧气耗尽';
    }

    if (reason === 'returnRope') {
      return '返回绳结算';
    }

    if (reason === 'surfaceSell') {
      return '地表出售';
    }

    return '未知';
  }

  public tileName(tileType: TileType): string {
    return TILE_CONFIG[tileType].displayName;
  }

  private isOxygenLow(run: RunState): boolean {
    return run.oxygen <= Math.ceil(run.maxOxygen * 0.2);
  }

  private isBackpackFull(run: RunState): boolean {
    return run.backpackUsed >= run.backpackCapacity;
  }
}
