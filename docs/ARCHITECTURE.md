# 架构说明

## 目标目录

```text
assets/
  scenes/
  scripts/
    core/
    gameplay/
    ui/
    platform/
    config/
  prefabs/
  resources/
  bundles/

docs/
```

## 模块职责

| 模块 | 职责 |
|---|---|
| `core` | 游戏生命周期、一局状态、事件、存档、经济协调。 |
| `gameplay` | 玩家控制、网格地图、矿块挖掘、矿石拾取、氧气、背包、局内增益。 |
| `ui` | 首页、HUD、暂停、结算、升级界面、增益选择。 |
| `platform` | 平台抽象、Mock 运行时、抖音运行时、存储、分享、广告、震动。 |
| `config` | 矿石、矿块硬度、升级、增益、经济数值、深度调参。 |

## UI 拆分约定

- `MiningDebugPanel` 只负责原型页面状态、玩家操作入口和玩法/存档/平台模块的调度。
- `MiningScreenView` 负责首页、增益选择、运行中、暂停、结算、升级等页面布局组合。
- `UiFactory` 负责用代码创建基础 UI 节点，例如文字、按钮、背景块和色块。
- `MineGridView` 只负责矿洞网格可视化，不处理挖掘、结算或存档逻辑。
- `RunTextPresenter` 负责局内状态、提示、阻挡原因和结算原因文案，避免主面板混入大量文案判断。
- 后续新增背包面板、增益卡片、结算面板时，优先拆成独立 View 类，再由页面组件组合。

## 数据流

```text
配置数据
  -> GameManager / RunManager
  -> 玩法系统 / TileEffectResolver
  -> UI 展示层
  -> SaveManager
  -> PlatformManager 存储
```

## 运行流程

```text
启动
  -> 初始化 PlatformManager
  -> 读取 SaveManager 数据
  -> 进入首页
  -> 开始下矿
  -> 应用本局临时增益
  -> 收集矿石并更新 HUD
  -> 结束本局
  -> 结算金币
  -> 保存进度
```

## 平台隔离

- 玩法和 UI 禁止引用抖音全局对象。
- 只有抖音平台适配器允许访问 `tt.*`。
- `MockPlatform` 必须能覆盖 Cocos 预览所需行为。
- 平台错误必须返回安全默认值，或由 `PlatformManager` 统一处理。

## 配置原则

- MVP 配置可以先使用 TypeScript 对象。
- 不把经济数值硬编码在组件里。
- 矿石价值、矿块硬度、升级费用、氧气消耗、增益数值都要方便调参。
- 只有当编辑器调参真的必要时，再迁移到 JSON 或 Cocos 资源。
