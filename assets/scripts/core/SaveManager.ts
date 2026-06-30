import { SaveData, UpgradeId } from './GameTypes';
import { gameState, GameState } from './GameState';
import { DEFAULT_SAVE_DATA, SAVE_VERSION } from '../config/GameConfig';
import { PlatformManager } from '../platform/PlatformManager';
import { PlatformResult } from '../platform/IPlatform';

export class SaveManager {
  public static readonly storageKey = 'save_data';

  private lastLoadFailed = false;

  public constructor(private readonly state: GameState = gameState) {}

  public async load(): Promise<PlatformResult<SaveData>> {
    await PlatformManager.init();
    const result = await PlatformManager.platform.getStorage<SaveData>(
      SaveManager.storageKey,
      DEFAULT_SAVE_DATA,
    );
    const save = this.normalizeSave(result.data ?? DEFAULT_SAVE_DATA);
    if (!result.ok) {
      this.lastLoadFailed = true;
      console.warn(`[SaveManager] 存档读取失败：${result.error ?? '未知错误'}`);
      return {
        ok: false,
        error: result.error ?? 'Save load failed.',
        data: save,
      };
    }

    this.lastLoadFailed = false;
    this.state.setSave(save);
    return {
      ok: true,
      data: save,
    };
  }

  public async save(save: SaveData = this.state.save): Promise<PlatformResult<SaveData>> {
    await PlatformManager.init();
    const normalized = this.normalizeSave(save);
    if (this.lastLoadFailed) {
      return {
        ok: false,
        error: 'Save load failed earlier; refusing to overwrite storage with fallback data.',
        data: normalized,
      };
    }

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
    this.lastLoadFailed = false;
    this.state.setSave(save);
    return save;
  }

  private normalizeSave(save: SaveData): SaveData {
    const upgrades = { ...DEFAULT_SAVE_DATA.upgrades };
    for (const key of Object.keys(upgrades) as UpgradeId[]) {
      upgrades[key] = this.toSafeInteger(save.upgrades?.[key], upgrades[key], 1);
    }

    return {
      version: SAVE_VERSION,
      coins: this.toSafeInteger(save.coins, DEFAULT_SAVE_DATA.coins, 0),
      bestDepth: this.toSafeInteger(save.bestDepth, DEFAULT_SAVE_DATA.bestDepth, 0),
      upgrades,
    };
  }

  private toSafeInteger(value: unknown, fallback: number, min: number): number {
    const numberValue = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(numberValue)) {
      return Math.max(min, Math.floor(fallback));
    }

    return Math.max(min, Math.floor(numberValue));
  }
}

export const saveManager = new SaveManager();
