import { Button, Color, Graphics, Label, Node, resources, Sprite, SpriteFrame, UITransform, Vec3 } from 'cc';
import { ScreenLayout, ScreenLayoutMetrics } from './ScreenLayout';

export interface LabelOptions {
  text: string;
  x: number;
  y: number;
  fontSize: number;
  color: Color;
  width?: number;
  height?: number;
  parent?: Node;
  name?: string;
}

export interface RectOptions {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fillColor: Color;
  strokeColor?: Color;
  strokeWidth?: number;
  parent?: Node;
}

export interface ImageOptions {
  name: string;
  path: string;
  x: number;
  y: number;
  width: number;
  height: number;
  parent?: Node;
  color?: Color;
}

export interface ProgressBarOptions {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  ratio: number;
  fillColor: Color;
  trackColor: Color;
  strokeColor?: Color;
  parent?: Node;
}

export interface ButtonOptions {
  text: string;
  x: number;
  y: number;
  onClick: () => void | Promise<void>;
  width?: number;
  height?: number;
}

export class UiFactory {
  private static readonly spriteCache = new Map<string, SpriteFrame>();
  private static readonly pendingSpriteLoads = new Map<string, Sprite[]>();
  private contentRoot: Node | null = null;
  private metrics: ScreenLayoutMetrics = ScreenLayout.getMetrics();

  public constructor(private readonly root: Node) {}

  public ensureRoot(): void {
    ScreenLayout.configureDesignResolution();
    this.metrics = ScreenLayout.applyRoot(this.root);
    this.metrics = ScreenLayout.applyDesignRoot(this.getContentRoot());
  }

  public getLayoutMetrics(): ScreenLayoutMetrics {
    return this.metrics;
  }

  public clear(): void {
    this.ensureRoot();
    this.getContentRoot().removeAllChildren();
  }

  public backdrop(width = 680, height = 900, fillColor: Color = new Color(0, 0, 0, 220)): Node {
    return this.rect({
      name: 'Backdrop',
      x: 0,
      y: 0,
      width,
      height,
      fillColor,
    });
  }

  public label(options: LabelOptions): Label {
    const node = new Node(options.name ?? 'Label');
    node.setParent(options.parent ?? this.getContentRoot());
    node.setPosition(new Vec3(options.x, options.y, 0));

    const transform = node.addComponent(UITransform);
    transform.setContentSize(options.width ?? 680, options.height ?? 100);

    const label = node.addComponent(Label);
    label.string = options.text;
    label.fontSize = options.fontSize;
    label.lineHeight = options.fontSize + 8;
    label.color = options.color;

    return label;
  }

  public button(options: ButtonOptions): Label {
    const width = options.width ?? 180;
    const height = options.height ?? 60;
    const buttonNode = this.rect({
      name: options.text,
      x: options.x,
      y: options.y,
      width,
      height,
      fillColor: new Color(45, 110, 170, 255),
      strokeColor: new Color(95, 170, 230, 255),
      strokeWidth: 2,
    });

    const button = buttonNode.addComponent(Button);
    button.transition = Button.Transition.SCALE;
    button.target = buttonNode;

    const label = this.label({
      text: options.text,
      x: 0,
      y: 0,
      fontSize: height <= 48 ? 18 : 22,
      color: Color.WHITE,
      width: width - 10,
      height: height - 8,
      parent: buttonNode,
      name: 'Text',
    });
    label.lineHeight = height <= 48 ? 24 : 30;

    buttonNode.on(Node.EventType.TOUCH_END, () => {
      void options.onClick();
    });

    return label;
  }

  public rect(options: RectOptions): Node {
    const node = new Node(options.name);
    node.setParent(options.parent ?? this.getContentRoot());
    node.setPosition(new Vec3(options.x, options.y, 0));

    const transform = node.addComponent(UITransform);
    transform.setContentSize(options.width, options.height);

    const graphics = node.addComponent(Graphics);
    graphics.fillColor = options.fillColor;
    graphics.rect(-options.width / 2, -options.height / 2, options.width, options.height);
    graphics.fill();

    if (options.strokeColor && options.strokeWidth) {
      graphics.lineWidth = options.strokeWidth;
      graphics.strokeColor = options.strokeColor;
      graphics.rect(-options.width / 2, -options.height / 2, options.width, options.height);
      graphics.stroke();
    }

    return node;
  }

  public progressBar(options: ProgressBarOptions): Node {
    const bar = this.rect({
      name: options.name,
      x: options.x,
      y: options.y,
      width: options.width,
      height: options.height,
      fillColor: options.trackColor,
      strokeColor: options.strokeColor,
      strokeWidth: options.strokeColor ? 1 : undefined,
      parent: options.parent,
    });
    const fillWidth = Math.max(0, Math.min(1, options.ratio)) * options.width;
    if (fillWidth <= 0) {
      return bar;
    }

    this.rect({
      name: `${options.name}Fill`,
      x: -options.width / 2 + fillWidth / 2,
      y: 0,
      width: fillWidth,
      height: options.height,
      fillColor: options.fillColor,
      parent: bar,
    });
    return bar;
  }

  public image(options: ImageOptions): Node {
    const node = new Node(options.name);
    node.setParent(options.parent ?? this.getContentRoot());
    node.setPosition(new Vec3(options.x, options.y, 0));

    const transform = node.addComponent(UITransform);
    transform.setContentSize(options.width, options.height);

    const sprite = node.addComponent(Sprite);
    sprite.sizeMode = Sprite.SizeMode.CUSTOM;
    sprite.color = options.color ?? Color.WHITE;

    const cached = UiFactory.spriteCache.get(options.path);
    if (cached) {
      sprite.spriteFrame = cached;
      return node;
    }

    this.loadSpriteFrame(options.path, sprite);
    return node;
  }

  private getContentRoot(): Node {
    if (this.contentRoot?.isValid) {
      return this.contentRoot;
    }

    const root = new Node('DesignRoot');
    root.setParent(this.root);
    this.contentRoot = root;
    return root;
  }

  private loadSpriteFrame(path: string, sprite: Sprite): void {
    const pendingSprites = UiFactory.pendingSpriteLoads.get(path);
    if (pendingSprites) {
      pendingSprites.push(sprite);
      return;
    }

    UiFactory.pendingSpriteLoads.set(path, [sprite]);
    resources.load(`${path}/spriteFrame`, SpriteFrame, (error, spriteFrame) => {
      const waitingSprites = UiFactory.pendingSpriteLoads.get(path) ?? [];
      UiFactory.pendingSpriteLoads.delete(path);

      if (error || !spriteFrame) {
        console.warn(`[UiFactory] 贴图加载失败：${path}`);
        return;
      }

      UiFactory.spriteCache.set(path, spriteFrame);
      for (const waitingSprite of waitingSprites) {
        if (waitingSprite.node?.isValid) {
          waitingSprite.spriteFrame = spriteFrame;
        }
      }
    });
  }
}
