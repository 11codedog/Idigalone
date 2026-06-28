# 资源来源记录

## AI 生成美术资源

本批资源由 Codex 内置 image generation 工具生成，用作当前原型阶段的占位美术。后续若进入正式上线版本，需要再统一检查授权、压缩规格和美术一致性。

| 资源 | 用途 | 路径 | 备注 |
|---|---|---|---|
| 地表矿洞背景 | 首页/地表界面背景 | `assets/resources/art/backgrounds/bg_surface_mine.png` | 竖屏背景图。 |
| 浅层矿洞背景 | 早期矿洞/普通下矿背景 | `assets/resources/art/backgrounds/bg_shallow_mine.png` | 竖屏背景图。 |
| 深层矿洞背景 | 深层矿洞/后期氛围背景 | `assets/resources/art/backgrounds/bg_deep_mine.png` | 竖屏背景图。 |
| 铜矿脉 | 铜矿 tile/sprite | `assets/resources/art/sprites/ore_copper.png` | 已从 chroma-key 源图抠透明。 |
| 银矿脉 | 银矿 tile/sprite | `assets/resources/art/sprites/ore_silver.png` | 已从 chroma-key 源图抠透明。 |
| 矿工主角 | 玩家角色 sprite | `assets/resources/art/sprites/miner_protagonist.png` | 已从 chroma-key 源图抠透明。 |

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
