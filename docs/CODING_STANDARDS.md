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
| 类 / 组件 | `PascalCase` | `RunManager`, `MiningDebugPanel` |
| 接口 | 项目已有平台接口保留 `I` 前缀 | `IPlatform` |
| 类型别名 | `PascalCase` | `TileType`, `GamePhase` |
| 方法 / 局部变量 | `camelCase` | `startRun()`, `targetTile` |
| 常量配置 | `SCREAMING_SNAKE_CASE` | `RUN_CONFIG`, `TILE_CONFIG` |
| 文件名 | 与主导出类/模块同名 | `RunManager.ts`, `GameConfig.ts` |
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
| `gameplay/` | 一局流程、地图、挖掘、增益、tile 效果。 |
| `ui/` | Cocos 组件、页面渲染、HUD 文案、UI 工厂。 |
| `platform/` | 平台接口、Mock、抖音实现、平台管理。 |

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
- 事件顺序必须在实现中清晰表达，不能简单套用“先更新后发事件”。
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
- [ ] 新增 `RunState` / `SaveData` 字段同步更新克隆和存档。
- [ ] UI Component 超过 300 行时已评估拆分。
- [ ] 没有无入口的死代码、死配置。
- [ ] 文档与实际规则一致。
