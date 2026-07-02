# Continuous Brush Stroke Rendering Implementation Plan

**Goal:** Replace the remaining tiny-rectangle terrain presentation with smooth brush-stroke cave rendering, so digging reads like a doodle/eraser path with round continuous curves.

**Architecture:** Keep gameplay and terrain state unchanged. Store the UI visual dig mask as connected brush strokes, then render soil as a continuous layer and draw cave strokes over it with round caps/circles instead of painting every terrain sample as a rectangle. Ore stays as an independent overlay layer.

**Tech Stack:** Cocos Creator 3.8.8, TypeScript, existing Node test runner, no new npm dependencies, no `.scene` / `.prefab` / `.meta` edits.

---

## Strict Scope

Only modify:
- Soil rendering presentation.
- Digging stroke/mask presentation.
- Ore overlay rendering if needed to stay separate from soil.

Do not modify:
- Player control.
- Gameplay calculations.
- ContinuousRunManager behavior.
- Map size.
- UI flow/layout.
- Pause, camera, oxygen, rewards, economy, platform layer.

## Current Problem

The previous pass still renders terrain by iterating sampled cells and calling `graphics.rect(...)`. Increasing sample resolution only makes the squares smaller; it does not create true continuous brush curves.

## Task 1: Record Connected Brush Strokes

**Files:**
- Modify: `assets/scripts/ui/TerrainDigMask.ts`
- Test: `tests/core-gameplay.test.js`

**Steps:**
1. Add a failing test proving adjacent brush stamps produce a stroke segment.
2. Add a failing test proving far-apart stamps do not create an accidental long tunnel.
3. Implement `getBrushes()` and `getStrokes()` as clone-returning read APIs.
4. Include stroke coverage in `getCoverage()` so mask math and rendering agree.
5. Run `npm.cmd test`.

## Task 2: Replace Cell Rect Terrain Rendering

**Files:**
- Modify: `assets/scripts/ui/ContinuousTerrainView.ts`

**Steps:**
1. Stop painting each visual sample with `graphics.rect(...)`.
2. Draw cave background as one full-view layer.
3. Draw soil as one continuous full-view layer with non-grid circular grain marks.
4. Draw visual dig mask strokes using round brush circles and stroke paths.
5. Keep ore overlay as independent circles.
6. Run `npm.cmd run typecheck`.

## Task 3: Keep Ore Separate But Non-Grid

**Files:**
- Modify: `assets/scripts/ui/ContinuousTerrainView.ts`
- Existing sampler: `assets/scripts/ui/TerrainVisualSampler.ts`

**Steps:**
1. Continue using sampler data only to find ore points.
2. Render ore as circles/clusters, not terrain rectangles.
3. Do not draw soil cells from sampler output.
4. Run `npm.cmd test` and `npm.cmd run typecheck`.

## Task 4: Final Verification

Run:

```powershell
npm.cmd test
npm.cmd run typecheck
rg -n "tt\." assets\scripts --glob "!platform/DouyinPlatform.ts"
git diff --check
```

Manual Cocos preview:
- Start a run.
- Hold input and dig a curve or loop.
- Cave should look like a continuous brush stroke with round joins/caps.
- The view should no longer show tiny rectangular terrain cells.
- Ore should remain independent from soil.
- Player movement, pause, oxygen, rewards, and run flow should be unchanged.

Douyin validation:
- Rebuild to Douyin developer tools and test on phone because rendering draw calls and visual density changed.
