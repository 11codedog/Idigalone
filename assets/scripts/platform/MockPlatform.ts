import {
  IPlatform,
  PlatformResult,
  RewardedVideoOptions,
  ShareOptions,
  SystemInfo,
} from './IPlatform';

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export class MockPlatform implements IPlatform {
  public readonly name = 'mock';

  private readonly storage = new Map<string, unknown>();
  private readonly storagePrefix = 'idigalone_mock_';

  public async init(): Promise<PlatformResult> {
    return this.success();
  }

  public async login(): Promise<PlatformResult<{ code?: string; anonymous: boolean }>> {
    return this.success({ anonymous: true });
  }

  public async getStorage<T>(key: string, fallback: T): Promise<PlatformResult<T>> {
    const storage = this.getLocalStorage();
    if (storage) {
      const value = storage.getItem(this.getStorageKey(key));
      if (value === null) {
        return this.success(fallback);
      }

      try {
        return this.success(JSON.parse(value) as T);
      } catch (error) {
        console.warn(`[MockPlatform] 本地存储解析失败：${String(error)}`);
        // Mock 可以给出 fallback 数据帮助预览继续运行，但解析错误本身仍要暴露给上层。
        return this.failure(`Mock getStorage parse failed: ${String(error)}`, fallback);
      }
    }

    if (!this.storage.has(key)) {
      return this.success(fallback);
    }

    return this.success(this.storage.get(key) as T);
  }

  public async setStorage<T>(key: string, value: T): Promise<PlatformResult> {
    const storage = this.getLocalStorage();
    if (storage) {
      storage.setItem(this.getStorageKey(key), JSON.stringify(value));
      return this.success();
    }

    this.storage.set(key, value);
    return this.success();
  }

  public async removeStorage(key: string): Promise<PlatformResult> {
    const storage = this.getLocalStorage();
    if (storage) {
      storage.removeItem(this.getStorageKey(key));
      return this.success();
    }

    this.storage.delete(key);
    return this.success();
  }

  public async share(_options: ShareOptions): Promise<PlatformResult> {
    return this.success();
  }

  public async showRewardedVideo(
    _options: RewardedVideoOptions,
  ): Promise<PlatformResult<{ completed: boolean }>> {
    return this.success({ completed: true });
  }

  public async vibrateShort(): Promise<PlatformResult> {
    return this.success();
  }

  public async getSystemInfo(): Promise<PlatformResult<SystemInfo>> {
    return this.success({
      platform: 'preview',
      model: 'Cocos Preview',
      system: 'Mock',
      safeAreaTop: 0,
      safeAreaBottom: 0,
    });
  }

  private success<T = void>(data?: T): PlatformResult<T> {
    return { ok: true, data };
  }

  private failure<T = void>(error: string, data?: T): PlatformResult<T> {
    return { ok: false, error, data };
  }

  private getLocalStorage(): StorageLike | null {
    const globalValue = globalThis as unknown as { localStorage?: StorageLike };
    return globalValue.localStorage ?? null;
  }

  private getStorageKey(key: string): string {
    return `${this.storagePrefix}${key}`;
  }
}
