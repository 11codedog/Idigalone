import { Button, Color, Graphics, Label, Node, UITransform, Vec3 } from 'cc';

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

export interface ButtonOptions {
  text: string;
  x: number;
  y: number;
  onClick: () => void | Promise<void>;
  width?: number;
  height?: number;
}

export class UiFactory {
  public constructor(private readonly root: Node) {}

  public ensureRoot(width = 720, height = 1280): void {
    let transform = this.root.getComponent(UITransform);
    if (!transform) {
      transform = this.root.addComponent(UITransform);
    }

    transform.setContentSize(width, height);
  }

  public clear(): void {
    this.root.removeAllChildren();
  }

  public backdrop(width = 680, height = 900): Node {
    return this.rect({
      name: 'Backdrop',
      x: 0,
      y: 0,
      width,
      height,
      fillColor: new Color(0, 0, 0, 220),
    });
  }

  public label(options: LabelOptions): Label {
    const node = new Node(options.name ?? 'Label');
    node.setParent(options.parent ?? this.root);
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
    node.setParent(options.parent ?? this.root);
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
}
