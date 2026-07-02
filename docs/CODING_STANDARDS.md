# Cocos Creator TypeScript 代码规范

适用范围：Cocos Creator 3.8.8 + TypeScript，当前项目目标为抖音小游戏。本文是项目可执行规范，优先级低于 `AGENTS.md`，并与 `docs/ENGINEERING_LESSONS.md` 配套使用。

## TypeScript

| 规则 | 级别 | 说明 |
|---|---|---|
| `strict: true` | 必须 | 项目已开启，新增代码必须通过 `npm.cmd run typecheck`。 |
| 禁止 `any` | 必须 | 用 `unknown`、泛型或明确接口替代。 |
| 导出函数显式返回类型 | 必须 | 避免实现变化影响调用方。 |
| `noUnusedLocals` / `noUnusedParameters` | 逐步开启 | Cocos 生命周期、平台占位和原型代码可能暂时需要保留参数，不作为当前铁律。 |
| `readonly` 字段 | 推荐 | 构造后不变的依赖和配置优先标记为 `readonly`。 |
| `?.` / `??` | 推荐 | 用于表达空值语义，避免 `||` 误吞 `0`、空字符串。 |

## 命名

| 类别 | 规范 | 示例 |
|---|---|---|
| 类 / 组件 | `PascalCase` | `ContinuousRunManager`, `MiningDebugPanel` |
| 接口 | 项目已有平台接口保留 `I` 前缀 | `IPlatform` |
| 类型别名 | `PascalCase` | `TerrainMaterial`, `GamePhase` |
| 方法 / 局部变量 | `camelCase` | `startRun()`, `targetPosition` |
| 常量配置 | `SCREAMING_SNAKE_CASE` | `RUN_CONFIG`, `TILE_CONFIG` |
| 文件名 | 与主导出类/模块同名 | `ContinuousRunManager.ts`, `GameConfig.ts` |
| Cocos 组件 | 文件名、类名、`@ccclass` 名保持一致 | `MiningDebugPanel.ts` |

不为了命名规范批量改已有文件名，避免 `.meta` 和场景引用风险。

## 依赖方向

当前项目依赖层级：

```text
ui -> gameplay -> core -> config
ui -> core
gameplay -> config
platform <- business code
```

特殊说明：

- `core/GameTypes.ts` 是底层类型模块，可被 `config`、`core`、`gameplay`、`ui` 引用。
- `config/GameConfig.ts` 可以包含轻量派生函数，例如 `getPlayerStats()`、`getUpgradeCost()`。
- `gameplay` 不依赖 `ui`。
- 业务代码禁止直接调用 `tt.*`，只允许 `DouyinPlatform` 封装平台全局对象。

## 模块职责

| 目录 | 职责 |
|---|---|
| `config/` | 配置表、调参常量、轻量派生函数。 |
| `core/` | 状态、事件、存档、升级、核心类型。 |
| `gameplay/` | 一局流程、连续地形、挖掘、增益、地形效果。 |
| `ui/` | Cocos 组件、页面渲染、HUD 文案、UI 工厂。 |
| `platform/` | 平台接口、Mock、抖音实现、平台管理。 |

## 设计原则

### 低耦合

模块之间的依赖关系是单向的。一个模块改动时，不依赖它的模块不应受影响。

```
// 例：gameplay/ContinuousRunManager 改了挖矿逻辑
// core/GameState 无需修改（不依赖 gameplay）
// ui/MiningDebugPanel 可能需要改（依赖 gameplay）
// 但如果改的是 GameState，所有依赖它的模块都可能受影响——所以要优先保证 core 的稳定
```

实践规则：

- **模块间只能按"依赖方向"图单向引用**。出现反向引用或循环引用视作违规。
- **跨模块通信优先走接口**。`IPlatform` 是标准例子——业务代码不知道也不关心当前是抖音还是 Mock。
- **Component 只做胶水**。Component 可以调用业务类，但业务类不引用 Component 和 `cc` 类型。
- **新增功能先判断属于哪个模块**。不要因为方便就把玩法逻辑写到 UI 文件里，或把配置硬编码在 Manager 中。

### 高复用

同一段逻辑不应该在多个地方出现手写副本。判断标准：改一个需求需要改几处？

```
// 好：cloneRunState 定义在 GameTypes，RunManager 和 GameState 都引用它
// 新增 RunState 字段只需在 cloneRunState 加一行，两处自动生效

// 差：如果在 RunManager 和 GameState 各写一个 cloneRunState
// 加字段时第一处改了第二处忘了，事件订阅者拿到不完整数据
```

实践规则：

- **多处出现的对象克隆逻辑，提取到 `GameTypes.ts` 统一维护。** 当前 `cloneSaveData` 和 `cloneRunState` 是正确做法。
- **UI 中重复出现的页面片段提取为独立 View 类。** 例如 `RunHudView`、`RunFooterView` 被 `MiningScreenView` 调用，而不是在每个 screen 中重复写。
- **配置数据集中在 `config/`**，不散落在各模块。改数值只改一处。
- **超过 2 处出现相同模式的代码，考虑抽函数或抽类。** 但抽之前确认它们是真的相同（而非恰好看起像），避免过早抽象。

### 模块化（单一职责）

一个模块、一个文件、一个类，只做一件事。

```
// ContinuousRunManager：管理一局游戏的流程（start / input / end）
// ContinuousTerrain：管理连续地形（采样 / 挖掘 delta / 查询）
// FloatingJoystickController：管理触摸输入（触点 / 向量 / 复位）
// ------------------------------------------------------------
// MiningDebugPanel 不做挖矿计算，只做"按钮回调 -> 调用 ContinuousRunManager -> 刷新界面"
// FloatingJoystickController 不做游戏逻辑判断，只做"触点 -> 输入向量"的转换
```

实践规则：

- **一个文件 ≤ 300 行。** 超了说明它在做不止一件事，需要评估拆分。
- **一个类只持有自己需要的状态。** `MiningDebugPanel` 不持有地形数据（那是 `ContinuousTerrain` 的事），`ContinuousRunManager` 不持有 UI 节点（那是 View 的事）。
- **Resolver 只计算不修改。** `DigBrushResolver.resolve()` 返回 delta 对象，调用方 `ContinuousRunManager` 负责落地修改。修改入口集中，容易追踪。
- **Manager 持有状态不泄露。** getter 返回 clone，外部无法意外修改内部状态。
- **新增功能先放对目录。** 不知道放哪通常是设计信号——要么模块边界模糊，要么新功能需要拆更细。

### 组合优于继承

Cocos Component 本身就是组合模式。业务类之间同样遵循：用依赖注入（constructor 参数）组合协作者，而不是继承基类获取能力。

```
// ContinuousRunManager 的协作者通过 constructor 传入
constructor(
  state: GameState = gameState,
  terrain = new ContinuousTerrain(),
  buffs = buffManager,
  resolver = new DigBrushResolver(),
)
// 测试时可以传入 mock，生产环境用默认值
```

## Cocos 组件

- Component 只做胶水：生命周期、按钮回调、调用业务、组合 View。
- 业务类不 import `cc`。
- 单个 Component 超过 300 行时优先拆 View / Presenter / Factory。
- 不默认修改 `.scene`、`.prefab`、`.meta`。
- 动态 UI 可以用于原型，但重复页面布局要拆成独立类。

## 文件与函数规模

| 规则 | 说明 |
|---|---|
| 单文件目标 ≤ 300 行 | 超过时必须评估是否拆分，不是机械硬切。 |
| 单函数目标 ≤ 40 行 | 超过时拆私有方法或提取协作者。 |
| 每文件 1 个主导出 | 辅助接口可以同文件。 |
| 命名导出优先 | 不使用 `export default`。 |

## 状态与事件

- 事件 payload 必须自洽，监听方不应依赖读取半更新的全局状态。
- 事件顺序必须在实现中清晰表达，不能简单套用"先更新后发事件"。
- 生命周期事件示例：`runEnded` 需要先携带结束快照发出，再清理当前 run，再发存档/阶段变化。
- 修改状态机时必须查看 `docs/ENGINEERING_LESSONS.md`。

## Resolver / Manager

- Resolver 默认是纯函数或近似纯函数，返回结果/delta。
- 真正修改 `RunState`、`SaveData` 的代码只能放在拥有状态的 Manager / GameState。
- 如果某函数会修改参数，函数名必须体现 mutation，并写注释说明。

## 增益与随机

- 新增增益必须同步检查 `BuffId`、`BUFF_CONFIG`、`SELECTABLE_BUFFS`、`RunBuffModifiers`、消费端和 `docs/GDD.md`。
- 未实现的增益不进入可选池，不写成已完成效果。
- 多个概率叠加后必须保证总和不超过 1；超过时使用独立函数归一化或显式优先级。
- 深度、增益、配置叠加后的极值也要检查。

## 平台与错误处理

- `PlatformManager.init()` 只有成功才能缓存 initialized，失败必须允许重试。
- `PlatformResult.ok` 表示操作是否成功；有 fallback data 不等于成功。
- Mock 可以返回 fallback data，但真实错误必须 `ok: false`。
- `catch` 块不能空置，也不能只 `console.warn` 后伪装成功。

```typescript
// 平台读取失败但提供 fallback：保留错误语义
return { ok: false, error: 'parse failed', data: fallback };
```

## 性能与包体

| 规则 | 级别 | 说明 |
|---|---|---|
| `update()` 中避免分配 | 必须 | 不在热路径里频繁 `new`、建数组、建闭包。 |
| 缓存 `getComponent()` | 必须 | 组件引用在初始化时缓存。 |
| 高频输入不做整屏重建 | 必须 | 摇杆、拖拽、连续挖掘等路径中避免每帧 `clear()`、`destroy()`、`removeAllChildren()` 后重建完整 UI。 |
| 运行时采样尺寸必须可验证 | 必须 | 降低采样分辨率、节点数量或绘制粒度时，要有测试或日志证明参数真实生效。 |
| 有限渲染列表必须有优先级 | 必须 | 同屏 sprite、tile、粒子或日志有上限时，不能按遍历顺序直接 `slice()`；必须按玩家位置、可见重要性或时间优先级截断。 |
| 视觉临时状态不能伪造长期状态 | 必须 | `TerrainDigMask` 这类视觉辅助只能做柔边和过渡，不能替代真实地形、背包、存档或运行状态。 |
| 真机性能不能只看预览 | 必须 | 电脑/Cocos 预览不卡不代表抖音真机不卡；触摸、地形渲染、长时间挖掘必须真机验证。 |
| 图片进包前压缩 | 必须 | 当前 AI 图是原型资源，接提审前要压缩/合图。 |
| 主包 `<4MB` | 必须 | 与项目提审约束一致。 |
| 整体包 `<20MB` | 必须 | 分包和远程资源后续再规划。 |

## Review 检查清单

- [ ] `npm.cmd run typecheck` 通过。
- [ ] 业务层没有 `tt.*` 直连。
- [ ] 状态变化事件 payload 自洽。
- [ ] Resolver 没有偷偷修改外部状态。
- [ ] 新增配置真实参与运行。
- [ ] 随机概率极值不会超过 1。
- [ ] 概率、密度、峰值深度修改后已同步玩法文档，并有测试覆盖极值。
- [ ] 新增 `RunState` / `SaveData` 字段同步更新克隆和存档。
- [ ] UI Component 超过 300 行时已评估拆分。
- [ ] 高频输入路径没有整屏销毁重建或大量临时对象分配。
- [ ] 有上限的渲染列表没有按 top-left / 插入顺序盲目截断。
- [ ] 视觉层没有用临时遮罩或过渡状态替代真实玩法状态。
- [ ] 性能优化参数已通过测试、日志或真机观察证明真实生效。
- [ ] 涉及手机触摸、运行时渲染、采样密度或节点数量时，已说明抖音真机验证状态。
- [ ] 没有无入口的死代码、死配置。
- [ ] 文档与实际规则一致。
