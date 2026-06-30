import { UPGRADE_CONFIG } from '../config/GameConfig';
import { RunState, SaveData, UpgradeId } from '../core/GameTypes';
import { ContinuousRunActionResult } from '../gameplay/ContinuousRunManager';
import { PlatformResult } from '../platform/IPlatform';
import { SettlementSnapshot } from './MiningScreenTypes';

export class MiningDebugPanelLogPresenter {
  public loadResult(result: PlatformResult<SaveData>, save: SaveData): string {
    return result.ok
      ? `存档已读取：金币 ${save.coins}`
      : `存档读取失败，使用临时进度：${result.error ?? '未知错误'}`;
  }

  public startRun(run: RunState): string {
    return `开始下矿：按住摇杆自由挖掘，完成目标后会触发局内三选一。氧气 ${run.oxygen}，背包 ${run.backpackCapacity}`;
  }

  public runEnded(snapshot: SettlementSnapshot, saveResult: PlatformResult<SaveData>): string {
    return saveResult.ok
      ? `本局结束：${snapshot.reason}，获得 ${snapshot.earnedCoins} 金币`
      : `本局已结算，但存档写入失败：${saveResult.error ?? '未知错误'}`;
  }

  public runAction(result: ContinuousRunActionResult, oreDisplayName: string, canSellAtSurface: boolean): string {
    const oreText = oreDisplayName ? `，获得 ${oreDisplayName}` : '';
    const surfaceText = canSellAtSurface ? '，已回到地表，可出售结算' : '';
    return `${result.type === 'move' ? '移动' : '挖掘'}到 (${result.position.x.toFixed(1)}, ${result.position.y.toFixed(1)})${oreText}${surfaceText}`;
  }

  public upgradeSuccess(upgradeId: UpgradeId, nextLevel: number, cost: number): string {
    return `升级成功：${UPGRADE_CONFIG[upgradeId].displayName} Lv.${nextLevel}，花费 ${cost}`;
  }

  public upgradeFailure(reason: string | undefined, cost: number, error: string | undefined): string {
    if (reason === 'notEnoughCoins') {
      return `金币不足：需要 ${cost}`;
    }

    if (reason === 'saveFailed') {
      return `升级失败：存档写入失败 ${error ?? ''}`;
    }

    return '已经达到最高等级。';
  }
}
