export type PlatformName = 'mock' | 'douyin';

export interface PlatformResult<T = void> {
  ok: boolean;
  data?: T;
  error?: string;
}

export interface ShareOptions {
  title: string;
  imageUrl?: string;
  query?: string;
}

export interface RewardedVideoOptions {
  placement: string;
}

export interface SystemInfo {
  platform: string;
  model: string;
  system: string;
  safeAreaTop: number;
  safeAreaBottom: number;
}

export interface IPlatform {
  readonly name: PlatformName;

  init(): Promise<PlatformResult>;
  login(): Promise<PlatformResult<{ code?: string; anonymous: boolean }>>;
  getStorage<T>(key: string, fallback: T): Promise<PlatformResult<T>>;
  setStorage<T>(key: string, value: T): Promise<PlatformResult>;
  removeStorage(key: string): Promise<PlatformResult>;
  share(options: ShareOptions): Promise<PlatformResult>;
  showRewardedVideo(options: RewardedVideoOptions): Promise<PlatformResult<{ completed: boolean }>>;
  vibrateShort(): Promise<PlatformResult>;
  getSystemInfo(): Promise<PlatformResult<SystemInfo>>;
}

