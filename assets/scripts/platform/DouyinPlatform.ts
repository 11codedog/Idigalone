import {
  IPlatform,
  PlatformResult,
  RewardedVideoOptions,
  ShareOptions,
  SystemInfo,
} from './IPlatform';

interface DouyinApi {
  login?: (options: {
    success?: (result: { code?: string }) => void;
    fail?: (error: unknown) => void;
  }) => void;
  getStorageSync?: (key: string) => unknown;
  setStorageSync?: (key: string, value: unknown) => void;
  removeStorageSync?: (key: string) => void;
  shareAppMessage?: (options: {
    title: string;
    imageUrl?: string;
    query?: string;
    success?: () => void;
    fail?: (error: unknown) => void;
  }) => void;
  createRewardedVideoAd?: (options: { adUnitId: string }) => DouyinRewardedVideoAd;
  vibrateShort?: (options?: {
    success?: () => void;
    fail?: (error: unknown) => void;
  }) => void;
  getSystemInfoSync?: () => {
    platform?: string;
    model?: string;
    system?: string;
    safeArea?: {
      top?: number;
      bottom?: number;
    };
  };
}

interface DouyinRewardedVideoAd {
  load?: () => Promise<void>;
  show?: () => Promise<void>;
  onClose?: (callback: (result?: { isEnded?: boolean }) => void) => void;
  offClose?: (callback: (result?: { isEnded?: boolean }) => void) => void;
  onError?: (callback: (error: unknown) => void) => void;
  offError?: (callback: (error: unknown) => void) => void;
}

type GlobalWithDouyin = typeof globalThis & {
  tt?: DouyinApi;
};

export class DouyinPlatform implements IPlatform {
  public readonly name = 'douyin';

  private readonly storagePrefix = 'idigalone_';

  public static isAvailable(): boolean {
    return Boolean((globalThis as GlobalWithDouyin).tt);
  }

  public async init(): Promise<PlatformResult> {
    return this.getApi() ? this.success() : this.failure('Douyin tt API is unavailable.');
  }

  public async login(): Promise<PlatformResult<{ code?: string; anonymous: boolean }>> {
    const api = this.getApi();
    if (!api?.login) {
      return this.success({ anonymous: true });
    }

    return new Promise((resolve) => {
      api.login?.({
        success: (result) => resolve(this.success({ code: result.code, anonymous: false })),
        fail: (error) => resolve(this.failure(`Douyin login failed: ${this.formatError(error)}`)),
      });
    });
  }

  public async getStorage<T>(key: string, fallback: T): Promise<PlatformResult<T>> {
    const api = this.getApi();
    if (!api?.getStorageSync) {
      // 抖音环境缺少存储能力是真实错误：带 fallback 继续降级，但 ok 必须保持 false。
      return this.failure('Douyin getStorageSync is unavailable.', fallback);
    }

    try {
      const value = api.getStorageSync(this.getStorageKey(key));
      return this.success(value === undefined || value === null ? fallback : (value as T));
    } catch (error) {
      return this.failure(`Douyin getStorage failed: ${this.formatError(error)}`, fallback);
    }
  }

  public async setStorage<T>(key: string, value: T): Promise<PlatformResult> {
    const api = this.getApi();
    if (!api?.setStorageSync) {
      return this.failure('Douyin setStorageSync is unavailable.');
    }

    try {
      api.setStorageSync(this.getStorageKey(key), value);
      return this.success();
    } catch (error) {
      return this.failure(`Douyin setStorage failed: ${this.formatError(error)}`);
    }
  }

  public async removeStorage(key: string): Promise<PlatformResult> {
    const api = this.getApi();
    if (!api?.removeStorageSync) {
      return this.failure('Douyin removeStorageSync is unavailable.');
    }

    try {
      api.removeStorageSync(this.getStorageKey(key));
      return this.success();
    } catch (error) {
      return this.failure(`Douyin removeStorage failed: ${this.formatError(error)}`);
    }
  }

  public async share(options: ShareOptions): Promise<PlatformResult> {
    const api = this.getApi();
    if (!api?.shareAppMessage) {
      return this.failure('Douyin shareAppMessage is unavailable.');
    }

    return new Promise((resolve) => {
      api.shareAppMessage?.({
        title: options.title,
        imageUrl: options.imageUrl,
        query: options.query,
        success: () => resolve(this.success()),
        fail: (error) => resolve(this.failure(`Douyin share failed: ${this.formatError(error)}`)),
      });
    });
  }

  public async showRewardedVideo(
    options: RewardedVideoOptions,
  ): Promise<PlatformResult<{ completed: boolean }>> {
    const api = this.getApi();
    if (!api?.createRewardedVideoAd) {
      return this.failure('Douyin rewarded video is unavailable.');
    }

    const ad = api.createRewardedVideoAd({ adUnitId: options.placement });
    return new Promise((resolve) => {
      let settled = false;

      const settle = (result: PlatformResult<{ completed: boolean }>): void => {
        if (settled) {
          return;
        }

        settled = true;
        ad.offClose?.(handleClose);
        ad.offError?.(handleError);
        resolve(result);
      };

      const handleClose = (result?: { isEnded?: boolean }): void => {
        settle(this.success({ completed: result?.isEnded !== false }));
      };

      const handleError = (error: unknown): void => {
        settle(this.failure(`Douyin rewarded video failed: ${this.formatError(error)}`));
      };

      ad.onClose?.(handleClose);
      ad.onError?.(handleError);

      const show = async (): Promise<void> => {
        try {
          await ad.load?.();
          await ad.show?.();
        } catch (error) {
          settle(this.failure(`Douyin rewarded video show failed: ${this.formatError(error)}`));
        }
      };

      void show();
    });
  }

  public async vibrateShort(): Promise<PlatformResult> {
    const api = this.getApi();
    if (!api?.vibrateShort) {
      return this.success();
    }

    return new Promise((resolve) => {
      api.vibrateShort?.({
        success: () => resolve(this.success()),
        fail: (error) => resolve(this.failure(`Douyin vibrate failed: ${this.formatError(error)}`)),
      });
    });
  }

  public async getSystemInfo(): Promise<PlatformResult<SystemInfo>> {
    const api = this.getApi();
    if (!api?.getSystemInfoSync) {
      return this.success(this.getFallbackSystemInfo());
    }

    try {
      const info = api.getSystemInfoSync();
      return this.success({
        platform: info.platform ?? 'douyin',
        model: info.model ?? 'unknown',
        system: info.system ?? 'unknown',
        safeAreaTop: info.safeArea?.top ?? 0,
        safeAreaBottom: info.safeArea?.bottom ?? 0,
      });
    } catch (error) {
      return this.failure(`Douyin getSystemInfo failed: ${this.formatError(error)}`);
    }
  }

  private getApi(): DouyinApi | undefined {
    return (globalThis as GlobalWithDouyin).tt;
  }

  private getStorageKey(key: string): string {
    return `${this.storagePrefix}${key}`;
  }

  private getFallbackSystemInfo(): SystemInfo {
    return {
      platform: 'douyin',
      model: 'unknown',
      system: 'unknown',
      safeAreaTop: 0,
      safeAreaBottom: 0,
    };
  }

  private success<T = void>(data?: T): PlatformResult<T> {
    return { ok: true, data };
  }

  private failure<T = void>(error: string, data?: T): PlatformResult<T> {
    return { ok: false, error, data };
  }

  private formatError(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    if (typeof error === 'string') {
      return error;
    }

    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }
}
