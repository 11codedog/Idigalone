# 代码审查行动计划

## 结论

DeepSeek 的评价大方向成立：当前代码作为原型/MVP 质量较好，主要风险不在架构分层，而在测试、性能、品质门禁和平台错误可见性。  
本轮不做大规模重构，先补“提审和长期迭代会立即受益”的基础设施。

## 逐条判断

| 反馈 | 判断 | 本轮处理 |
|---|---|---|
| 没有测试 | 正确，且是最大短板 | 已新增轻量测试 runner 和 3 条核心测试 |
| 渲染层频繁创建对象 | 正确，尤其是网格热路径 | 已提取 Tile 颜色常量；节点池/DrawCall 合并暂缓 |
| 单 Component 路由仍是瓶颈 | 正确，但不是当前最紧急 | 暂缓，列入下一阶段重构 |
| 缺少构建期品质门禁 | 正确 | 已新增 `npm test`；ESLint/pre-commit/包体报警暂缓 |
| 平台错误处理还不够 | 正确 | 已让 `SaveManager.save()` 返回写入结果，并在 UI 日志显示保存失败 |

## 本轮已落地

| 能力 | 文件 | 说明 |
|---|---|---|
| 核心测试入口 | `tools/run-tests.js` | 无新增 npm 依赖，用现有 TypeScript 编译器运行逻辑测试 |
| 测试脚本 | `package.json` | 新增 `npm test` |
| 核心测试用例 | `tests/core-gameplay.test.js` | 覆盖矿石压缩、RunManager 采集路径、存档写失败语义 |
| 存档失败返回 | `SaveManager.ts` | `save()` 返回 `PlatformResult<SaveData>`，失败不静默吞掉 |
| 升级失败透传 | `UpgradeManager.ts` | 保存失败时返回 `saveFailed` |
| 用户可见提示 | `MiningDebugPanel.ts` | 结算/升级存档失败会显示日志 |
| 颜色常量缓存 | `UiColors.ts`、`MineGridView.ts` | 降低矿洞网格每次 render 的 `Color` 分配 |

## 新增测试覆盖

```text
npm test
```

当前测试：
- 同类矿石 5 个压缩成 1 组。
- `RunManager.move()` 采集 6 个铜矿后背包占用为 2。
- 平台写存档失败时，`SaveManager.save()` 返回失败，且不把传入的新存档写进 `GameState`。

后续优先补充：
- 氧气耗尽结算。
- 地表 0m 左右移动不耗氧。
- 向上只能走空路，不能向上挖。
- `BuffManager` 多增益叠加。
- `MineGrid` 深度矿物池边界。

## 暂缓项

### 节点池

当前 `UiFactory.clear()` 仍会清空并重建节点。这个问题真实存在，但节点池要配合 View 生命周期一起做，否则容易出现旧事件监听、旧节点状态残留。建议和屏幕路由拆分一起处理。

### DrawCall 合并

矿洞网格目前仍是独立 Graphics。正式优化方向是把 Tile 网格改成单个绘制器或合批 Sprite，但这会影响资源策略和交互高亮，先不在本轮做。

### 屏幕路由

`MiningDebugPanel` 仍是页面状态调度中心。下一步可以拆：

```text
ui/screens/
  HomeScreen.ts
  BuffSelectScreen.ts
  RunningScreen.ts
  PauseScreen.ts
  SettlementScreen.ts
  UpgradeScreen.ts
```

目标是让 `MiningDebugPanel` 只保留当前 screen、共享 model 和 screen 切换。

### ESLint / pre-commit / 包体报警

这些都合理，但会引入工具链和配置。等测试入口稳定后再加，避免一次性改变太多开发流程。

## 后续优先级

| 优先级 | 事项 | 验收 |
|---|---|---|
| P0 | 补齐 gameplay/core 10 条左右单元测试 | `npm test` 覆盖主要失败路径 |
| P0 | UiFactory 图片加载失败重试 | 弱网或首次失败后能重新尝试 |
| P1 | 屏幕路由拆分 | 新增屏幕不再修改 `MiningDebugPanel` 主体 |
| P1 | 节点池或局部刷新 | 玩家移动时不重建整棵 UI 树 |
| P1 | 构建后包体检查脚本 | 主包超过 4MB 时报警 |
| P2 | DrawCall 合并 | 矿洞网格渲染成本下降 |
| P2 | 平台错误上报 | 真机问题能定位到错误类型 |

## 新规则

- 修改 `core/`、`gameplay/`、`skill/` 后必须跑 `npm test` 和 `npm run typecheck`。
- 修改存档、平台、结算时，必须检查失败结果是否能被 UI 或日志观察到。
- 性能优化先处理高频热路径，再做结构性重构。
