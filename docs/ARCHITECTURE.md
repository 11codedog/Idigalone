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
    skill/
  prefabs/
  resources/
  bundles/

docs/
```

## 模块职责

| 模块 | 职责 |
|---|---|
| `core` | 游戏生命周期、一局状态、事件、存档、升级和核心类型 |
| `gameplay` | 一局流程、矿洞地图、挖掘、氧气、矿块效果和局内增益 |
| `skill` | 长期技能规则、技能 modifiers、背包占用等规则计算 |
| `ui` | 首页、HUD、暂停、结算、升级、增益选择和动态 UI 节点 |
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
  -> RunManager
  -> MineGrid / TileEffectResolver
  -> SkillManager / InventoryCalculator
  -> RunState
  -> UI 展示
  -> SaveManager
  -> PlatformManager 存储
```

## 技能系统数据流

```text
挖到矿石
  -> TileEffectResolver 返回 inventoryDelta
  -> RunManager 使用 InventoryCalculator 判断背包容量
  -> RunManager 写入 inventory
  -> InventoryCalculator 重新计算 backpackUsed
  -> HUD / 结算页展示结果
```

第一版默认启用 `矿石压缩`，不进入存档，也不做技能选择 UI。

## UI 拆分约定

- `MiningDebugPanel` 只负责原型页面状态、玩家操作入口和玩法/存档/平台模块调度。
- `MiningScreenView` 负责首页、增益选择、运行中、暂停、结算、升级等页面组合。
- `RunHudView` 负责顶部 HUD。
- `RunFooterView` 负责底部操作提示、暂停、地表出售。
- `MineGridView` 只负责矿洞网格可视化，不处理挖掘、结算或存档。
- `RunTextPresenter` 负责提示、阻挡原因、结束原因和矿块名称文案。
- `UiFactory` 负责用代码创建基础 UI 节点。

## 配置原则

- MVP 配置先使用 TypeScript 对象。
- 不把经济数值硬编码在组件里。
- 矿石价值、矿块硬度、升级费用、氧气消耗、增益和技能参数都要方便调参。
- 只有当编辑器调参真的必要时，再迁移到 JSON 或 Cocos 资源。
