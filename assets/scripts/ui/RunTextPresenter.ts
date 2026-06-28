import { Color } from 'cc';
import { BuffId, RunState, TileType } from '../core/GameTypes';
import { BUFF_CONFIG } from '../config/GameConfig';
import { RunBlockReason, RunEndReason } from '../gameplay/RunManager';

export class RunTextPresenter {
  public statusText(run: RunState, selectedBuff: BuffId | null): string {
    const buffText = selectedBuff ? BUFF_CONFIG[selectedBuff].displayName : '无';
    return [
      `增益：${buffText}`,
      `深度：${run.depth}m`,
      `氧气：${run.oxygen}/${run.maxOxygen}`,
      `背包：${run.backpackUsed}/${run.backpackCapacity}`,
      `铜矿：${run.inventory.copper}`,
      `银矿：${run.inventory.silver}`,
      `金币预估：${run.coinsPreview}`,
    ].join('   ');
  }

  public statusColor(run: RunState): Color {
    if (this.isOxygenLow(run)) {
      return new Color(255, 110, 100, 255);
    }

    if (this.isBackpackFull(run)) {
      return new Color(255, 210, 90, 255);
    }

    return Color.WHITE;
  }

  public warningText(run: RunState): string {
    if (this.isOxygenLow(run)) {
      return '氧气紧张，考虑返回结算或继续贪一把。';
    }

    if (this.isBackpackFull(run)) {
      return '背包已满，返回结算或升级背包。';
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

    return '未知原因';
  }

  public endReason(reason: RunEndReason | undefined): string {
    if (reason === 'oxygenDepleted') {
      return '氧气耗尽';
    }

    if (reason === 'manualReturn') {
      return '主动返回';
    }

    return '未知';
  }

  public tileName(tileType: TileType): string {
    if (tileType === 'copper') {
      return '铜矿';
    }

    if (tileType === 'silver') {
      return '银矿';
    }

    if (tileType === 'oxygen') {
      return '氧气包';
    }

    return tileType;
  }

  private isOxygenLow(run: RunState): boolean {
    return run.oxygen <= Math.ceil(run.maxOxygen * 0.2);
  }

  private isBackpackFull(run: RunState): boolean {
    return run.backpackUsed >= run.backpackCapacity;
  }
}
