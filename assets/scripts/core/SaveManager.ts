import { SaveData, UpgradeId } from './GameTypes';
import { gameState, GameState } from './GameState';
import { DEFAULT_SAVE_DATA, SAVE_VERSION } from '../config/GameConfig';
import { PlatformManager } from '../platform/PlatformManager';
import { PlatformResult } from '../platform/IPlatform';

export class SaveManager {
  public static readonly storageKey = 'save_data';

  public constructor(private readonly state: GameState = gameState) {}

  public async load(): Promise<SaveData> {
    await PlatformManager.init();
    const result = await PlatformManager.platform.getStorage<SaveData>(
      SaveManager.storageKey,
      DEFAULT_SAVE_DATA,
    );
    // 平台读取失败时也可能携带 fallback data；ok 只表达操作成败，不决定数据能否兜底使用。
    const save = this.normalizeSave(result.data ?? DEFAULT_SAVE_DATA);
    this.state.setSave(save);
    return save;
  }

  public async save(save: SaveData = this.state.save): Promise<PlatformResult<SaveData>> {
    await PlatformManager.init();
    const normalized = this.normalizeSave(save);
    const result = await PlatformManager.platform.setStorage(SaveManager.storageKey, normalized);
    if (!result.ok) {
      console.warn(`[SaveManager] 存档写入失败：${result.error ?? '未知错误'}`);
      return {
        ok: false,
        error: result.error ?? 'Save storage failed.',
        data: normalized,
      };
    }

    this.state.setSave(normalized);
    return {
      ok: true,
      data: normalized,
    };
  }

  public async reset(): Promise<SaveData> {
    await PlatformManager.init();
    await PlatformManager.platform.removeStorage(SaveManager.storageKey);
    const save = this.normalizeSave(DEFAULT_SAVE_DATA);
    this.state.setSave(save);
    return save;
  }

  private normalizeSave(save: SaveData): SaveData {
    const upgrades = { ...DEFAULT_SAVE_DATA.upgrades };
    for (const key of Object.keys(upgrades) as UpgradeId[]) {
      upgrades[key] = Math.max(1, Math.floor(save.upgrades?.[key] ?? upgrades[key]));
    }

    return {
      version: SAVE_VERSION,
      coins: Math.max(0, Math.floor(save.coins ?? 0)),
      bestDepth: Math.max(0, Math.floor(save.bestDepth ?? 0)),
      upgrades,
    };
  }
}

export const saveManager = new SaveManager();
