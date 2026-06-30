# 代码审查行动计划

## 当前结论

DeepSeek V4 Flash 的审查里，随机生成、输入适配、布局、资源加载去重和文案一致性这些问题值得处理。  
本轮已修确定正确且低风险的项；不强行补不存在的新矿贴图，避免把“纯色占位”改成“加载失败”。

## DeepSeek V4 Flash 逐条处理

| 优先级 | 反馈 | 判断 | 本轮处理 |
|---|---|---|---|
| P0 | 旧网格生成器矿脉判定顺序破坏随机序列 | 旧路径已满足；当前主流程已迁移到 `ContinuousTerrain` | 不改旧路径，记录为当前已满足 |
| P0 | 深层 `richness` 170m 后封顶 | 成立 | 改为 `0.48 + depth / generatedDepth * 0.34` |
| P0 | “返回绳”文案与逻辑不一致 | 成立 | 改为“返回结算”，内部原因改为 `manualSettlement` |
| P1 | PC 触摸屏只能触发一种输入 | 成立 | 键盘和触摸事件同时注册 |
| P1 | 横屏 footer 与 HUD 坐标可能重叠 | 成立 | footer 改为基于屏幕底部计算 |
| P1 | 新矿石没有贴图 | 部分成立；当前资源确实不存在 | 先做程序化矿块占位，正式贴图后续再导入 |
| P1 | 同一路径贴图会并发重复加载 | 成立 | `UiFactory` 增加 pending 队列去重 |
| P2 | 技能 modifiers 暂不支持分矿石类型 | 成立，但不是当前需求 | 暂缓，等出现“只对某矿生效”的技能再扩展 |
| P2 | `0m` 硬编码 | 成立 | 新增 `RUN_CONFIG.surfaceDepth` 并替换主要逻辑判断 |
| P2 | 图例颜色描述偏差 | 成立 | 图例改为与 `UiColors.ts` 一致 |

## 本轮额外整理

| 文件 | 说明 |
|---|---|
| `GameConfig.ts` | 恢复中文显示名，新增 `surfaceDepth` |
| `GDD.md` | 同步“暂停菜单返回结算，不消耗道具”的实际规则 |
| `MiningScreenView.ts` | 恢复中文 UI 文案，修正图例 |
| `RunFooterView.ts` | 恢复中文文案，使用 `RUN_CONFIG.surfaceDepth` |

## 仍然暂缓

### 新矿物贴图

煤矿、锡矿、铁矿、金矿、翡翠、水晶、红宝、黑曜矿还没有对应运行时贴图。当前 `ContinuousTerrainView` 用颜色、矿物碎片和短标识做程序化占位，不新增不存在的资源路径。后续补贴图时再更新：

```text
assets/resources/art/sprites/ore_coal.png
assets/resources/art/sprites/ore_tin.png
assets/resources/art/sprites/ore_iron.png
assets/resources/art/sprites/ore_gold.png
assets/resources/art/sprites/ore_emerald.png
assets/resources/art/sprites/ore_crystal.png
assets/resources/art/sprites/ore_ruby.png
assets/resources/art/sprites/ore_obsidian.png
```

### 分矿石类型技能 modifier

当前只有“矿石压缩”，全矿石统一 5 个一组。等出现“只对铜矿生效”或“稀有矿不同压缩规则”时，再把 `SkillModifiers` 从全局数值扩展成按矿物类型配置。

### 节点池和 DrawCall 合并

这两项仍然正确，但需要和 UI 生命周期、屏幕路由一起做。现在只做了贴图请求去重和颜色常量缓存。

## 验证要求

修改 `core/`、`gameplay/`、`skill/`、输入、布局或资源加载后，必须运行：

```powershell
npm.cmd test
npm.cmd run typecheck
```

涉及平台隔离时额外检查：

```powershell
rg -n "tt\." assets/scripts
```
