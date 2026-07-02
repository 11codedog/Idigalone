# 资源来源记录

## AI 生成美术资源

本批资源由 Codex 内置 image generation 工具生成，用作当前原型阶段的占位美术。后续若进入正式上线版本，需要再统一检查授权、压缩规格和美术一致性。

> 注意：当前 `assets/resources/art/sprites/*.png` 仍是未压缩原型资源，总体积约 16MB。提审前必须压缩、合图或分包评估，不能按当前体积直接进入抖音小游戏主包。

| 资源 | 用途 | 路径 | 备注 |
|---|---|---|---|
| 地表矿洞背景 | 首页/地表界面背景 | `assets/resources/art/backgrounds/bg_surface_mine.png` | 竖屏背景图。 |
| 浅层矿洞背景 | 早期矿洞/普通下矿背景 | `assets/resources/art/backgrounds/bg_shallow_mine.png` | 竖屏背景图。 |
| 深层矿洞背景 | 深层矿洞/后期氛围背景 | `assets/resources/art/backgrounds/bg_deep_mine.png` | 竖屏背景图。 |
| 铜矿脉 | 铜矿 tile/sprite | `assets/resources/art/sprites/ore_copper.png` | 已从 chroma-key 源图抠透明。 |
| 煤矿脉 | 煤矿 tile/sprite | `assets/resources/art/sprites/ore_coal.png` | 已从 chroma-key 源图抠透明。 |
| 锡矿脉 | 锡矿 tile/sprite | `assets/resources/art/sprites/ore_tin.png` | 已从 chroma-key 源图抠透明。 |
| 铁矿脉 | 铁矿 tile/sprite | `assets/resources/art/sprites/ore_iron.png` | 已从 chroma-key 源图抠透明。 |
| 银矿脉 | 银矿 tile/sprite | `assets/resources/art/sprites/ore_silver.png` | 已从 chroma-key 源图抠透明。 |
| 金矿脉 | 金矿 tile/sprite | `assets/resources/art/sprites/ore_gold.png` | 已从 chroma-key 源图抠透明。 |
| 翡翠矿脉 | 翡翠矿 tile/sprite | `assets/resources/art/sprites/ore_emerald.png` | 已从 chroma-key 源图抠透明。 |
| 水晶矿脉 | 水晶 tile/sprite | `assets/resources/art/sprites/ore_crystal.png` | 已从 chroma-key 源图抠透明。 |
| 红宝矿脉 | 红宝矿 tile/sprite | `assets/resources/art/sprites/ore_ruby.png` | 已从 chroma-key 源图抠透明。 |
| 黑曜矿脉 | 黑曜矿 tile/sprite | `assets/resources/art/sprites/ore_obsidian.png` | 已从 chroma-key 源图抠透明。 |
| 矿工主角 | 玩家角色 sprite | `assets/resources/art/sprites/miner_protagonist.png` | 已从 chroma-key 源图抠透明。 |

## 程序化占位美术

| 资源 | 用途 | 落点 | 备注 |
|---|---|---|---|
| 程序化地形纹理 | 连续地形的土层、洞口遮罩和矿点运行时表现 | `assets/scripts/ui/ContinuousTerrainView.ts` | 正式 PNG 矿石资源已补齐；当前运行时仍使用程序化绘制矿点。 |

## 源图

透明资源的 chroma-key 源图保留在：

```text
docs/asset_sources/
```

这些源图用于后续重新抠图、裁切或对比，不在 `assets/resources/` 下，避免误进运行包体。

## 生成提示摘要

- 风格：手绘感、适合移动端的 2D stylized game art。
- 主题：挖矿、矿洞、Roguelite 原型。
- 限制：无文字、无 logo、无水印。
- 透明资源流程：先生成纯绿色 chroma-key 背景，再本地转为透明 PNG。
