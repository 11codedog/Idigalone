import { IPlatform } from './IPlatform';
import { DouyinPlatform } from './DouyinPlatform';
import { MockPlatform } from './MockPlatform';

export class PlatformManager {
  private static current: IPlatform = PlatformManager.createDefaultPlatform();
  private static initialized = false;

  public static get platform(): IPlatform {
    return this.current;
  }

  public static use(platform: IPlatform): void {
    this.current = platform;
    this.initialized = false;
  }

  public static async init(): Promise<void> {
    if (this.initialized) {
      return;
    }

    const result = await this.current.init();
    if (!result.ok) {
      console.warn(`[PlatformManager] 平台初始化失败：${result.error ?? '未知错误'}`);
      return;
    }

    // 只有平台 init 真正成功才缓存状态；失败保持 false，后续存档/登录仍可再次重试。
    this.initialized = true;
  }

  public static resetToMock(): void {
    this.use(new MockPlatform());
  }

  private static createDefaultPlatform(): IPlatform {
    return DouyinPlatform.isAvailable() ? new DouyinPlatform() : new MockPlatform();
  }
}
