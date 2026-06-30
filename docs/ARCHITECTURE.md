# 架构说明

## 目标目录

```text
assets/
  scenes/
  scripts/
    core/
    gameplay/
    skill/
    ui/
      screens/
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
| `core` | 游戏生命周期、一局状态、事件、存档、升级和核心类型 |
| `gameplay` | 一局流程、连续地形、挖掘刷、氧气、材料效果和局内增益 |
| `skill` | 长期技能规则、技能 modifiers、背包占用等规则计算 |
| `ui` | Cocos UI 组合、动态节点创建、HUD、页面路由和页面展示 |
| `ui/screens` | 首页、局内奖励选择、运行中、暂停、结算、升级、技能等独立页面 |
| `platform` | 平台抽象、Mock、抖音实现、存储、分享、广告、震动 |
| `config` | 矿石、矿块硬度、升级、增益、经济、深度和技能参数 |

## 依赖方向

```text
ui -> gameplay -> core
ui -> skill
gameplay -> skill
gameplay -> config
skill -> core
skill -> config
platform <- business code
```

规则：

- `gameplay` 可以调用 `skill` 的计算结果，但不能把某个技能特例写进流程。
- `skill` 不依赖 `ui` 或 Cocos `cc` 类型。
- `ui` 只展示技能效果结果，不参与技能规则计算。
- 业务代码不能直接调用 `tt.*`，只能经过 `PlatformManager`。

## 数据流

```text
配置数据
  -> ContinuousRunManager
  -> ContinuousTerrain / DigBrushResolver
  -> SkillManager / InventoryCalculator
  -> RunState
  -> UI 展示
  -> SaveManager
  -> PlatformManager 存储
```

## 技能系统数据流

```text
挖到矿石
  -> DigBrushResolver 返回 terrain delta + inventoryDelta
  -> ContinuousTerrain.applyDigDelta() 写入地形变化
  -> ContinuousRunManager 写入 inventory
  -> InventoryCalculator 重新计算 backpackUsed
  -> HUD / 技能页 / 结算页展示结果
```

第一版默认启用 `矿石压缩`，不进入存档，也不做技能选择 UI。

## UI 拆分约定

- `MiningDebugPanel` 只负责原型页面状态、玩家操作入口和玩法/存档/平台模块调度。
- `MiningScreenTypes` 定义页面状态、页面模型、页面动作和结算快照类型。
- `MiningScreenView` 只负责清屏、背景、页面路由和日志渲染。
- `ui/screens/*ScreenView` 各自负责一个页面，不处理跨页面流程。
- `RunningScreenView` 组合 `RunHudView`、`ContinuousTerrainView`、`RunFooterView`，并使用 `RunScreenLayout` 计算移动端布局。
- `RunHudView` 负责顶部 HUD。
- `RunFooterView` 负责底部操作提示、暂停、地表出售。
- `ContinuousTerrainView` 只负责连续矿洞材质可视化，不处理挖掘、结算或存档。
- `TerrainVisualSampler` 是纯视觉采样器，把 `ContinuousTerrain` 周边区域转换成细颗粒 RGBA 数据；它不能修改地形或一局状态。
- `AnalogJoystickState` 是纯输入状态机，负责 deadzone、强度、角度和指针归属；`FloatingJoystickController` 只把 Cocos 事件转成状态机输入。
- `RunTextPresenter` 负责提示、阻挡原因、结束原因和矿块名称文案。
- `UiFactory` 负责用代码创建基础 UI 节点和资源加载。

## 配置原则

- MVP 配置先使用 TypeScript 对象。
- 不把经济数值硬编码在组件里。
- 矿石价值、矿块硬度、升级费用、氧气消耗、增益和技能参数都要方便调参。
- 只有当编辑器调参真的必要时，再迁移到 JSON 或 Cocos 资源。
