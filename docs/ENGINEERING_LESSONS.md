# 工程复盘：本轮代码审查问题

这份文档记录本轮代码审查暴露的问题、深层原因和后续防复发规则。目的不是追溯某个单点失误，而是把容易反复出现的工程坏味道变成固定检查项。

## 总结

这轮错误的共同根因是：原型开发中为了快速闭环，很多代码按“当前调用路径能跑”来判断正确性，没有把模块契约写清楚。结果在平台初始化、事件顺序、可变状态、概率配置、增益修饰器、克隆逻辑这些地方，出现了类型检查抓不到、但后续扩展会放大的隐患。

## 深层原因

| 问题类型 | 表面错误 | 深层原因 | 防复发规则 |
|---|---|---|---|
| 平台初始化 | `init()` 失败后仍标记已初始化 | 把“尝试过初始化”和“初始化成功”混成一个布尔值 | 只缓存成功状态；失败必须允许重试，调用方通过 `ok` 判断降级 |
| 事件顺序 | 结束本局时事件监听者可能读到不一致状态 | 没有定义状态机事件顺序契约 | 生命周期事件必须先准备 payload，再按明确顺序更新状态和发事件 |
| 隐式 mutation | `TileEffectResolver.apply()` 直接改传入对象 | Resolver 和 Mutator 职责混在一起 | Resolver 默认纯函数，返回 delta；真正修改状态只能由拥有状态的 Manager 执行 |
| 增益系统 | `stoneBreaker` 绕过 `RunBuffModifiers` | 为了快速实现特例，破坏统一修饰器入口 | 所有增益效果必须进入统一 modifiers，再由系统消费 |
| 概率生成 | 多个概率上限相加超过 1.0 | 把独立概率 cap 当成最终分布，没有归一化 | 所有累计概率必须保证总和 `<= 1`；超过时归一化或显式优先级 |
| 数据克隆 | `cloneRunState` 和 `cloneRun` 重复 | 缺少共享数据工具，靠复制粘贴维持结构一致 | 状态对象只能有一个克隆函数入口，字段新增时只改一处 |
| 默认参数 | `calculateCoins(run = requireRun())` 可能在结束后抛错 | 便利 API 隐藏了运行期前置条件 | 公共方法不要在默认参数里调用会抛错的状态读取；需要 run 就显式传入 |
| Mock 语义 | 解析失败返回 `ok: true` | 把“有 fallback 可用”和“操作成功”混淆 | 发生真实错误时 `ok` 必须为 false，可同时携带 fallback data |
| 手机性能优化 | 电脑预览不卡但手机挖掘停顿 | 把逻辑连续性、渲染成本、真机帧时间混在一起判断；优化参数未被测试证明真实生效 | 手机性能问题先定位热路径，再验证优化真实生效；Cocos 预览不能替代抖音真机 |

## 后续硬性检查清单

### 修改状态机或事件时

- 明确事件 payload 是否足够完整，监听方不应被迫读取全局状态补数据。
- 明确事件发出顺序：例如 `runEnded`、`saveChanged`、`phaseChanged` 哪个先发生。
- 如果中间态可能被监听方观察到，必须调整顺序或拆分事件。
- 改完后搜索相关事件名，确认所有监听方假设仍成立。

### 修改平台层时

- `init()` 只有成功才能缓存 initialized。
- 失败必须能重试，不能永久吞掉错误。
- `ok: true` 只代表操作成功，不代表“已经用 fallback 兜住”。
- 平台错误可以降级，但错误语义不能伪装成成功。

### 修改玩法 Resolver / Manager 时

- Resolver 默认不修改传入对象。
- 如果函数会修改参数，函数名必须体现 mutation，例如 `applyToMutableRun`，并在注释中说明。
- 推荐流程：`resolve()` 返回 delta，`Manager` 统一应用 delta。
- 状态所有权只放在 Manager / GameState，不让工具类偷偷改状态。

### 修改增益系统时

- 新增增益必须同时检查：
  - `BuffId`
  - `BUFF_CONFIG`
  - `SELECTABLE_BUFFS`
  - `RunBuffModifiers`
  - 消费 modifiers 的系统
  - `docs/GDD.md`
- 如果某个增益还没实现，不要放入可选池，也不要写成已完成效果。

### 修改随机生成时

- 每个概率分支必须能解释最终分布。
- 多个概率相加时，必须检查总和是否可能超过 1。
- 深度、增益、配置叠加后也要检查极值。
- 如果使用归一化，要写成独立函数，避免概率分支里散落数学逻辑。

### 修改状态数据结构时

- `RunState` / `SaveData` 新增字段后，必须检查：
  - `cloneRunState` / `cloneSaveData`
  - `GameState`
  - `SaveManager.normalizeSave`
  - UI Presenter
  - 文档
- 不允许在不同模块重复手写同一个状态克隆逻辑。

### 修改公共方法签名时

- 公共方法不要用隐藏前置条件的默认参数。
- 如果方法要求当前有 run，方法名或参数应表达出来。
- 需要无 run 安全调用时，提供 `try...` 或返回 `null` / `PlatformResult` 风格结果。

### 修改手机热路径 / 运行时渲染时

- 先区分是玩法逻辑卡顿还是渲染/节点生命周期卡顿，不要把两类问题混在一个修复里。
- 如果电脑预览不卡但手机卡，优先检查每帧 `clear()`、`destroy()`、整屏重建、像素级采样、大量临时对象分配。
- 优化参数必须有测试或日志证明真实生效；例如显式传入的运行时采样尺寸不能被内部 `Math.max` 夹回默认质量。
- 高频输入路径不要每次都全量刷新日志、HUD、地形和按钮；需要评估拆分增量刷新或降低刷新频率。
- 视觉连续性优化要同时评估手机 CPU/GPU 成本，不能只在 Cocos 预览里看效果。
- 影响触摸输入、地形渲染、节点数量或采样密度时，必须重新构建到抖音开发者工具并真机验证。

## 必跑验证

每次修改核心逻辑后至少执行：

```powershell
npm.cmd run typecheck
rg -n "tt\." assets\scripts --glob "!platform/DouyinPlatform.ts"
```

涉及本复盘问题时，额外执行：

```powershell
rg -n "cloneRun\(|cloneRunState|cloneSaveData" assets\scripts
rg -n "initialized = true|init\(\)" assets\scripts\platform
rg -n "resolve\(|apply\(" assets\scripts\gameplay
rg -n "stoneBreaker|RunBuffModifiers|SELECTABLE_BUFFS" assets\scripts docs
```

涉及手机性能、触摸输入或运行时渲染优化时，额外检查：

```powershell
rg -n "clear\(|destroy\(|removeAllChildren|graphicsLayer|sample\(" assets\scripts\ui assets\scripts\gameplay
rg -n "Math.max\(.*DEFAULT|RUNTIME_SAMPLE|sampleOreLayer|width:|height:" assets\scripts\ui tests
```

并必须在回复中说明：是否已重新构建到抖音开发者工具、是否已做手机真机验证；如果没有，必须明确标记为待验证。

## 当前结论

本轮问题不是 TypeScript 能力不足，而是缺少工程契约。以后写代码时要先问：

1. 这个模块是否拥有它正在修改的状态？
2. 这个事件顺序是否被监听方观察到？
3. 这个配置是否真实参与运行？
4. 这个 fallback 是否仍然保留了错误语义？
5. 这个快捷写法是否隐藏了会抛错的前置条件？
6. 这个优化是否真的减少了热路径工作量，还是只是在代码表面“看起来优化”？
7. Cocos 预览结果是否足以证明手机真机表现？如果不足，是否已经安排真机验证？

只要答案不清楚，就先补契约，再写实现。

## 2026-07-01 连续挖掘渲染复盘

| 问题 | 根因 | 后续规则 |
|---|---|---|
| 挖过的洞一段时间后像是复原 | 视觉层曾经用整块土层 + 临时 `TerrainDigMask` 盖洞；遮罩被裁剪后，真实地形空洞没有参与土层绘制 | 土层必须来自 `ContinuousTerrain` 的真实采样状态；`TerrainDigMask` 只能做当前挖掘柔边，不能作为地形存在性的唯一来源 |
| 人物下方矿石到一定深度后才刷新 | 同屏矿石 sprite 有上限时按采样遍历顺序截断，天然偏向视口上沿 | 任何有限渲染列表都必须定义优先级；矿石 sprite 截断按玩家/关注点附近优先，不能按 top-left 遍历顺序 |
| 手机或浏览器输入表现断续 | 键盘调试输入依赖浏览器重复 `keydown` 节奏；容器节流时会断续 | 长按输入必须记录按住状态，并在 `update(deltaTime)` 连续应用；摇杆、键盘、触摸都按同一时间推进语义 |
| 矿石过密造成视觉噪声和渲染压力 | 峰值概率过高，同时 sprite 上限又会隐藏下半屏信息 | 矿石概率要先满足短局可读性和手机渲染压力；当前基础概率 1.5%，140m 峰值 20% |

### 连续地形/矿石渲染检查

- 修改土层、矿石、洞口、玩家尺寸时，先判断数据源是玩法状态还是临时视觉状态。
- 真实地形修改只能由 Manager 应用 resolver delta；UI 只能读取，不得伪造长期地形状态。
- 同屏节点或 sprite 需要上限时，必须说明排序/优先级，并用测试覆盖“不会偏向视口上沿或遍历顺序”。
- 降低采样、降低概率、限制节点数量后，必须跑 `npm.cmd test` 和 `npm.cmd run typecheck`，并提醒重新构建到抖音开发者工具做手机验证。
