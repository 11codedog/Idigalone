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

## 当前结论

本轮问题不是 TypeScript 能力不足，而是缺少工程契约。以后写代码时要先问：

1. 这个模块是否拥有它正在修改的状态？
2. 这个事件顺序是否被监听方观察到？
3. 这个配置是否真实参与运行？
4. 这个 fallback 是否仍然保留了错误语义？
5. 这个快捷写法是否隐藏了会抛错的前置条件？

只要答案不清楚，就先补契约，再写实现。
