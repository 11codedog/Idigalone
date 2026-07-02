# Project Checklist

Use this checklist for `Idigalone`, a Cocos Creator 3.8.8 TypeScript Douyin mini-game.

## Hard Boundaries

- Gameplay, UI, core logic, and config must not call `tt.*` directly.
- All platform capabilities go through `assets/scripts/platform/`.
- Cocos preview uses Mock platform behavior.
- Douyin implementation must degrade gracefully on platform errors.
- Do not modify `.scene`, `.prefab`, or `.meta` unless the task explicitly requires editor wiring.
- Do not add npm dependencies unless explicitly approved.
- Keep changes scoped; do not perform opportunistic refactors.

## Architecture

Expected direction:

```text
ui -> gameplay -> core
ui -> skill
gameplay -> skill
gameplay -> config
skill -> core
skill -> config
platform <- business code
```

Review violations:

- `gameplay` importing `ui` or Cocos `cc` types.
- UI calculating gameplay outcomes instead of presenting manager results.
- Config values duplicated in managers or views.
- Skill/buff special cases bypassing unified modifiers.

## State And Events

Check:

- Event payloads are self-contained.
- Event order is explicit.
- `RunState` and `SaveData` clone through a single shared entry.
- Public methods do not hide `require...()` calls inside default parameters.
- Resolver returns delta; manager applies delta.
- Mock fallback data does not fake `ok: true` for real errors.

## Continuous Mining

Check:

- Surface depth is `0`; player cannot move above surface.
- `x` is continuous and unbounded.
- `y` increases downward.
- Digging uses circular brush samples and manager-applied terrain delta.
- Dug samples become `air` in real terrain, not only in a visual mask.
- Ore magnet/autocollect only collects ore, respects backpack capacity, and clears collected ore samples.
- Oxygen packs are not treated as ore.
- Underground movement and digging consume oxygen; surface movement should not.

## Terrain / Ore Rendering

Check:

- Real soil layer comes from `ContinuousTerrain` sample state.
- `TerrainDigMask` is only a temporary visual edge/brush effect.
- Ore sprites are rendered in front of soil.
- Ore density stays readable: current intended continuous ore chance starts near `1.5%`, peaks near `20%` around `140m`.
- Sprite/node caps prioritize player vicinity, not top-left traversal order.
- Player sprite size should align with collision/dig volume, not dominate the tunnel.

## Input

Check:

- Joystick supports arbitrary 360-degree vectors, not just four directions.
- Keyboard debug input uses held-key state plus `deltaTime`, not browser key repeat timing.
- Touch/mouse pointer ownership avoids unrelated pointer cancellation.
- Mobile hot paths avoid unnecessary full UI rebuilds.

## Required Verification

- `npm.cmd run typecheck`
- `npm.cmd test`
- `rg -n "tt\." assets\scripts --glob "!platform/DouyinPlatform.ts"`

Mention if Douyin developer-tool build or real-device validation was not performed.
