import { gameState, GameState } from './GameState';
import { SaveData, UpgradeId } from './GameTypes';
import { getUpgradeCost, UPGRADE_CONFIG } from '../config/GameConfig';
import { saveManager, SaveManager } from './SaveManager';

export interface UpgradeResult {
  ok: boolean;
  upgradeId: UpgradeId;
  cost: number;
  nextLevel: number;
  save: SaveData;
  reason?: 'notEnoughCoins' | 'maxLevel';
}

export class UpgradeManager {
  public constructor(
    private readonly state: GameState = gameState,
    private readonly saves: SaveManager = saveManager,
  ) {}

  public getCost(upgradeId: UpgradeId, save: SaveData = this.state.save): number {
    return getUpgradeCost(upgradeId, save.upgrades[upgradeId]);
  }

  public async buy(upgradeId: UpgradeId): Promise<UpgradeResult> {
    const save = this.state.save;
    const currentLevel = save.upgrades[upgradeId];
    const config = UPGRADE_CONFIG[upgradeId];
    const cost = this.getCost(upgradeId, save);

    if (currentLevel >= config.maxLevel) {
      return {
        ok: false,
        upgradeId,
        cost,
        nextLevel: currentLevel,
        save,
        reason: 'maxLevel',
      };
    }

    if (save.coins < cost) {
      return {
        ok: false,
        upgradeId,
        cost,
        nextLevel: currentLevel + 1,
        save,
        reason: 'notEnoughCoins',
      };
    }

    const nextSave: SaveData = {
      ...save,
      coins: save.coins - cost,
      upgrades: {
        ...save.upgrades,
        [upgradeId]: currentLevel + 1,
      },
    };
    await this.saves.save(nextSave);

    return {
      ok: true,
      upgradeId,
      cost,
      nextLevel: currentLevel + 1,
      save: nextSave,
    };
  }
}

export const upgradeManager = new UpgradeManager();

