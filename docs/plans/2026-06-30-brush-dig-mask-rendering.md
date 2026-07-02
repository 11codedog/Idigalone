# 连续土层刷子挖掘渲染计划

> 本计划用于先约束范围，再按任务执行连续土层、刷子挖掘和矿石独立层改造。

**Goal:** Make underground digging look like image-editor eraser/brush painting on a continuous soil mask, producing round/soft cave edges instead of rectangular tile edges.

**Architecture:** Keep gameplay, player control, map size, camera, UI flow, oxygen, reward, and collection logic unchanged. Add a UI-only visual dig mask that records circular brush stamps from existing dig action results. `TerrainVisualSampler` uses `ContinuousTerrain` for material lookup and `TerrainDigMask` for visual coverage, so visual holes become continuous brush shapes while gameplay still owns state mutation.

**Tech Stack:** Cocos Creator 3.8.8, TypeScript, existing Node test runner, no new npm dependencies, no `.scene` / `.prefab` edits.

---

## Strict Scope

Only modify these areas:
- Soil rendering.
- Digging process rendering.
- Ore layer separation from soil.

Do not modify:
- Player control.
- Gameplay calculations.
- Map dimensions.
- UI flow/layout.
- Pause button.
- Camera.
- Numeric balance.
- Run lifecycle.
- Character logic.
- Platform layer.

## Task 1: UI-Only Brush Mask

**Files:**
- Create: `assets/scripts/ui/TerrainDigMask.ts`
- Test: `tests/core-gameplay.test.js`

**Steps:**
1. Add failing tests for circular brush coverage:
   - center coverage is `0`
   - far outside coverage is `1`
   - soft edge coverage is between `0` and `1`
   - multiple brush stamps connect into a continuous tunnel
2. Implement `TerrainDigMask` as a pure UI helper.
3. Keep it independent from `ContinuousTerrain`, `RunState`, and Cocos `cc`.
4. Run `npm.cmd test` and confirm the new tests pass.

## Task 2: Sampler Uses Brush Mask Coverage

**Files:**
- Modify: `assets/scripts/ui/TerrainVisualSampler.ts`
- Test: `tests/core-gameplay.test.js`

**Steps:**
1. Add failing tests proving sampler uses `digMask` to produce partial `soil.a` around brush edges.
2. Update `TerrainVisualSampleRequest` with optional `digMask`.
3. Replace visual coverage based only on `terrain.sample()` neighbors with mask coverage when a mask is provided.
4. Preserve existing fallback behavior when no mask is provided.
5. Run `npm.cmd test`.

## Task 3: Feed Dig Results Into Visual Mask

**Files:**
- Modify: `assets/scripts/ui/MiningScreenTypes.ts`
- Modify: `assets/scripts/ui/MiningDebugPanel.ts`
- Modify: `assets/scripts/ui/screens/RunningScreenView.ts`
- Modify: `assets/scripts/ui/ContinuousTerrainView.ts`

**Steps:**
1. Add a UI-only `TerrainDigMask` instance to the mining screen model.
2. Reset the mask when a run starts or returns home.
3. On `ContinuousRunActionResult` with `type === 'dig'` and removed material, stamp the mask at `result.position` using the same visual radius as the dig brush.
4. Pass the mask into `ContinuousTerrainView.render()`.
5. Do not alter `ContinuousRunManager`, player input, or gameplay state.
6. Run `npm.cmd test` and `npm.cmd run typecheck`.

## Task 4: Layered Rendering

**Files:**
- Modify: `assets/scripts/ui/TerrainVisualSampler.ts`
- Modify: `assets/scripts/ui/TerrainColorPalette.ts`
- Modify: `assets/scripts/ui/ContinuousTerrainView.ts`
- Test: `tests/core-gameplay.test.js`

**Steps:**
1. Keep sampler output separated into `cave`, `soil`, and optional `ore`.
2. Ensure ore cells keep `soil.a > 0` before digging and become more visible as soil coverage drops.
3. Render cave/soil first, then draw ore overlay dots/crystals separately.
4. Do not render ore as a full rectangular soil color.
5. Run tests.

## Task 5: Final Verification

Run:

```powershell
npm.cmd test
npm.cmd run typecheck
rg -n "tt\." assets\scripts --glob "!platform/DouyinPlatform.ts"
git diff --check
```

Manual Cocos preview:
- Start a run.
- Dig in a curve or diagonal.
- Cave boundary should look like a continuous round brush path, not rectangular steps.
- Ore should appear as independent dots/clusters embedded in soil.
- Player control, pause, run flow, oxygen, and rewards should behave unchanged.

Douyin validation:
- Rebuild to Douyin developer tools and test on phone, because this changes runtime rendering and may affect frame rate.
