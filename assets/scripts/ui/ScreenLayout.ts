import { Node, ResolutionPolicy, Size, UITransform, Vec3, view } from 'cc';

export interface ScreenLayoutMetrics {
  designWidth: number;
  designHeight: number;
  visibleWidth: number;
  visibleHeight: number;
  backgroundWidth: number;
  backgroundHeight: number;
}

export class ScreenLayout {
  public static readonly designWidth = 720;
  public static readonly designHeight = 1280;

  public static configureDesignResolution(): void {
    view.setDesignResolutionSize(
      ScreenLayout.designWidth,
      ScreenLayout.designHeight,
      ResolutionPolicy.FIXED_WIDTH,
    );
  }

  public static getMetrics(): ScreenLayoutMetrics {
    const safeVisibleSize = ScreenLayout.normalizeVisibleSize(view.getVisibleSize());

    return {
      designWidth: ScreenLayout.designWidth,
      designHeight: ScreenLayout.designHeight,
      visibleWidth: safeVisibleSize.width,
      visibleHeight: safeVisibleSize.height,
      backgroundWidth: safeVisibleSize.width,
      backgroundHeight: safeVisibleSize.height,
    };
  }

  public static applyRoot(root: Node): ScreenLayoutMetrics {
    const metrics = ScreenLayout.getMetrics();
    let transform = root.getComponent(UITransform);
    if (!transform) {
      transform = root.addComponent(UITransform);
    }

    transform.setContentSize(metrics.visibleWidth, metrics.visibleHeight);
    root.setPosition(new Vec3(0, 0, 0));
    root.setScale(new Vec3(1, 1, 1));
    return metrics;
  }

  public static applyDesignRoot(root: Node): ScreenLayoutMetrics {
    const metrics = ScreenLayout.getMetrics();
    let transform = root.getComponent(UITransform);
    if (!transform) {
      transform = root.addComponent(UITransform);
    }

    transform.setContentSize(ScreenLayout.designWidth, ScreenLayout.designHeight);
    root.setPosition(new Vec3(0, 0, 0));
    root.setScale(new Vec3(1, 1, 1));
    return metrics;
  }

  private static normalizeVisibleSize(size: Size): Size {
    return new Size(Math.max(1, size.width), Math.max(1, size.height));
  }

}
