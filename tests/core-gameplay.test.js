const assert = require('assert');
const fs = require('fs');
const path = require('path');

const {
  DEFAULT_SAVE_DATA,
  ORE_TYPES,
  TILE_CONFIG,
  getAvailableOreTypes,
} = require('../assets/scripts/config/GameConfig');
const { GameState } = require('../assets/scripts/core/GameState');
const { createEmptyInventory } = require('../assets/scripts/core/GameTypes');
const { SaveManager } = require('../assets/scripts/core/SaveManager');
const { MineGrid } = require('../assets/scripts/gameplay/MineGrid');
const { RunManager } = require('../assets/scripts/gameplay/RunManager');
const { InventoryCalculator } = require('../assets/scripts/skill/InventoryCalculator');
const { PlatformManager } = require('../assets/scripts/platform/PlatformManager');
const { MockPlatform } = require('../assets/scripts/platform/MockPlatform');

test('VectorMath normalizes zero, clamps length, supports angles and deadzone', () => {
  const vectorMath = require('../assets/scripts/gameplay/terrain/VectorMath');

  assert.deepStrictEqual(vectorMath.normalizeVector({ x: 0, y: 0 }), { x: 0, y: 0 });

  const clamped = vectorMath.normalizeVector({ x: 3, y: 4 });
  assert.strictEqual(clamped.x, 0.6);
  assert.strictEqual(clamped.y, 0.8);

  const diagonal = vectorMath.vectorFromAngle(Math.PI / 4);
  assert.ok(Math.abs(diagonal.x - Math.SQRT1_2) < 0.00001);
  assert.ok(Math.abs(diagonal.y - Math.SQRT1_2) < 0.00001);

  assert.deepStrictEqual(vectorMath.createInputVector({ x: 2, y: 0 }, 3), { x: 0, y: 0, strength: 0 });
  assert.deepStrictEqual(vectorMath.createInputVector({ x: 6, y: 8 }, 3), { x: 0.6, y: 0.8, strength: 1 });
});

test('AnalogJoystickState preserves arbitrary analog angles', () => {
  const { AnalogJoystickState } = require('../assets/scripts/ui/AnalogJoystickState');
  const joystick = new AnalogJoystickState({ deadZone: 6, maxRadius: 60 });

  joystick.begin(1, { x: 0, y: 0 });
  joystick.move(1, { x: 30, y: 30 });
  const diagonal = joystick.getInput();
  assert.ok(Math.abs(diagonal.x - Math.SQRT1_2) < 0.02);
  assert.ok(Math.abs(diagonal.y - Math.SQRT1_2) < 0.02);

  joystick.move(1, anglePoint(123, 50));
  const angled = joystick.getInput();
  assert.ok(Math.abs(angled.x - Math.cos(123 * Math.PI / 180)) < 0.02);
  assert.ok(Math.abs(angled.y - Math.sin(123 * Math.PI / 180)) < 0.02);
  assert.notStrictEqual(Math.abs(angled.x), 1);
  assert.notStrictEqual(Math.abs(angled.y), 1);
});

test('AnalogJoystickState clamps strength and ignores unrelated pointers', () => {
  const { AnalogJoystickState } = require('../assets/scripts/ui/AnalogJoystickState');
  const joystick = new AnalogJoystickState({ deadZone: 10, maxRadius: 50 });

  joystick.begin(7, { x: 100, y: 100 });
  joystick.move(8, { x: 200, y: 200 });
  assert.deepStrictEqual(joystick.getInput(), { x: 0, y: 0, strength: 0 });

  joystick.move(7, { x: 105, y: 105 });
  assert.deepStrictEqual(joystick.getInput(), { x: 0, y: 0, strength: 0 });

  joystick.move(7, { x: 250, y: 100 });
  assert.deepStrictEqual(joystick.getInput(), { x: 1, y: 0, strength: 1 });
  assert.deepStrictEqual(joystick.getKnobOffset(), { x: 50, y: 0 });

  joystick.end(8);
  assert.strictEqual(joystick.isActive, true);
  joystick.end(7);
  assert.strictEqual(joystick.isActive, false);
});

test('AnalogJoystickState keeps the first active pointer during browser mouse touch overlap', () => {
  const { AnalogJoystickState } = require('../assets/scripts/ui/AnalogJoystickState');
  const joystick = new AnalogJoystickState({ deadZone: 6, maxRadius: 60 });

  joystick.begin(2, { x: 0, y: 0 });
  joystick.begin(1, { x: 100, y: 100 });
  joystick.move(2, { x: 40, y: 0 });

  assert.deepStrictEqual(joystick.getInput(), { x: 1, y: 0, strength: 40 / 60 });
  joystick.end(1);
  assert.strictEqual(joystick.isActive, true);
});

test('ContinuousRenderScheduler coalesces held-input render requests', () => {
  const { ContinuousRenderScheduler } = require('../assets/scripts/ui/ContinuousRenderScheduler');
  const scheduler = new ContinuousRenderScheduler(0.1);

  scheduler.request();
  assert.strictEqual(scheduler.update(1 / 60), true);

  scheduler.request();
  assert.strictEqual(scheduler.update(1 / 60), false);
  scheduler.request();
  assert.strictEqual(scheduler.update(1 / 60), false);
  scheduler.request();
  assert.strictEqual(scheduler.update(0.08), true);
  assert.strictEqual(scheduler.update(0.2), false);
});

test('TerrainViewportFrame keeps surface air visible when a run starts', () => {
  const { createTerrainViewportFrame } = require('../assets/scripts/ui/TerrainViewportFrame');

  const frame = createTerrainViewportFrame({
    playerPosition: { x: 0, y: 0 },
    viewWidth: 360,
    viewHeight: 520,
    worldWidth: 16,
    worldHeight: 20,
    surfaceY: 0,
  });

  assert.ok(frame.center.y > 0);
  assert.ok(frame.playerScreenPosition.y > 0);
  assert.ok(frame.soilRect.height > 0);
  assert.ok(frame.soilRect.height < 520);
});

test('TerrainViewportFrame fills soil once the surface is above the viewport', () => {
  const { createTerrainViewportFrame } = require('../assets/scripts/ui/TerrainViewportFrame');

  const frame = createTerrainViewportFrame({
    playerPosition: { x: 0, y: 35 },
    viewWidth: 360,
    viewHeight: 520,
    worldWidth: 16,
    worldHeight: 20,
    surfaceY: 0,
  });

  assert.strictEqual(frame.playerScreenPosition.y, 0);
  assert.strictEqual(frame.soilRect.height, 520);
});

function anglePoint(degrees, radius) {
  const radians = degrees * Math.PI / 180;
  return {
    x: Math.cos(radians) * radius,
    y: Math.sin(radians) * radius,
  };
}

test('ContinuousTerrain samples air at surface and mostly dirt in shallow ground', () => {
  const { ContinuousTerrain } = require('../assets/scripts/gameplay/terrain/ContinuousTerrain');
  const terrain = new ContinuousTerrain({ seed: 12345 });

  assert.strictEqual(terrain.sample({ x: 0.25, y: 0 }).material, 'air');
  assert.strictEqual(terrain.sample({ x: -12.8, y: -3.4 }).material, 'air');
  assert.notStrictEqual(terrain.sample({ x: 0.25, y: 0.25 }).material, 'air');

  let dirtCount = 0;
  let sampleCount = 0;
  for (let x = -4; x <= 4; x += 1) {
    for (let y = 2; y <= 8; y += 1) {
      if (terrain.sample({ x: x + 0.37, y: y + 0.19 }).material === 'dirt') {
        dirtCount += 1;
      }
      sampleCount += 1;
    }
  }

  assert.ok(dirtCount > sampleCount * 0.55);
});

test('ContinuousTerrain is deterministic and produces varied mid-depth materials', () => {
  const { ContinuousTerrain } = require('../assets/scripts/gameplay/terrain/ContinuousTerrain');
  const firstTerrain = new ContinuousTerrain({ seed: 2468 });
  const secondTerrain = new ContinuousTerrain({ seed: 2468 });
  const positions = [
    { x: -8.35, y: 46.2 },
    { x: 0.5, y: 52.75 },
    { x: 9.125, y: 61.5 },
    { x: 17.875, y: 72.25 },
  ];

  const firstMaterials = positions.map((position) => firstTerrain.sample(position).material);
  positions.slice().reverse().forEach((position) => secondTerrain.sample(position));
  const secondMaterials = positions.map((position) => secondTerrain.sample(position).material);

  assert.deepStrictEqual(secondMaterials, firstMaterials);

  const materials = new Set();
  for (let x = -14; x <= 14; x += 1) {
    for (let y = 45; y <= 76; y += 1) {
      materials.add(firstTerrain.sample({ x: x + 0.41, y: y + 0.27 }).material);
    }
  }

  assert.ok(materials.size >= 3);
  assert.ok([...materials].some((material) => ORE_TYPES.includes(material)));
});

test('ContinuousTerrain ore chance starts sparse and eases into a capped peak', () => {
  const { getContinuousOreChance } = require('../assets/scripts/gameplay/terrain/ContinuousTerrain');

  const surfaceChance = getContinuousOreChance(0);
  const midChance = getContinuousOreChance(70);
  const peakChance = getContinuousOreChance(140);
  const deeperChance = getContinuousOreChance(220);

  assert.ok(surfaceChance < midChance);
  assert.ok(midChance < peakChance);
  assert.strictEqual(peakChance, deeperChance);
  assert.ok(surfaceChance <= 0.018);
  assert.ok(peakChance <= 0.2);
});

test('TerrainVisualSampler creates sprite-ready ore samples without oxygen packs', () => {
  const { ContinuousTerrain } = require('../assets/scripts/gameplay/terrain/ContinuousTerrain');
  const { TerrainVisualSampler } = require('../assets/scripts/ui/TerrainVisualSampler');
  const terrain = new ContinuousTerrain({ seed: 112233 });
  const orePosition = findAnyContinuousOre(terrain, 8, 90);

  const sample = new TerrainVisualSampler().sampleOreSprites({
    terrain,
    center: orePosition,
    worldWidth: 4,
    worldHeight: 4,
  });

  assert.ok(sample.ores.length > 0);
  assert.ok(sample.ores.every((ore) => ORE_TYPES.includes(ore.material)));
  assert.ok(sample.ores.every((ore) => ore.alpha >= 150));
});

test('TerrainVisualSampler caps ore sprites around priority position instead of viewport top edge', () => {
  const { TerrainVisualSampler } = require('../assets/scripts/ui/TerrainVisualSampler');
  const terrain = new DenseCopperTerrain();

  const sample = new TerrainVisualSampler().sampleOreSprites({
    terrain,
    center: { x: 0, y: 10 },
    worldWidth: 4,
    worldHeight: 20,
    maxOres: 1,
    priorityPosition: { x: 0, y: 15 },
  });

  assert.strictEqual(sample.ores.length, 1);
  assert.ok(sample.ores[0].position.y >= 14.5);
});

test('TerrainVisualSampler soil tile samples keep dug air after visual mask is gone', () => {
  const { ContinuousTerrain } = require('../assets/scripts/gameplay/terrain/ContinuousTerrain');
  const { DigBrushResolver } = require('../assets/scripts/gameplay/terrain/DigBrushResolver');
  const { TerrainVisualSampler } = require('../assets/scripts/ui/TerrainVisualSampler');
  const terrain = new ContinuousTerrain({ seed: 334455 });
  const sampler = new TerrainVisualSampler();
  const dirtPosition = findContinuousMaterial(terrain, 'dirt', 6, 18);
  const coordinate = terrain.getSampleCoordinate(dirtPosition);

  const before = sampler.sampleSoilTiles({
    terrain,
    center: dirtPosition,
    worldWidth: 3,
    worldHeight: 3,
  });
  assert.ok(before.tiles.some((tile) => tile.coordinate.x === coordinate.x && tile.coordinate.y === coordinate.y));

  const result = new DigBrushResolver().resolve(terrain, {
    center: dirtPosition,
    radius: 0.35,
    digPower: 4,
  });
  terrain.applyDigDelta(result.digDelta);

  const after = sampler.sampleSoilTiles({
    terrain,
    center: dirtPosition,
    worldWidth: 3,
    worldHeight: 3,
  });
  assert.ok(!after.tiles.some((tile) => tile.coordinate.x === coordinate.x && tile.coordinate.y === coordinate.y));
});

test('TerrainDigMask creates soft circular brush coverage', () => {
  const { TerrainDigMask } = require('../assets/scripts/ui/TerrainDigMask');
  const mask = new TerrainDigMask();

  mask.addBrush({ center: { x: 4, y: 6 }, radius: 1, softness: 0.3 });

  assert.strictEqual(mask.getCoverage({ x: 4, y: 6 }), 0);
  assert.strictEqual(mask.getCoverage({ x: 6, y: 6 }), 1);
  const edgeCoverage = mask.getCoverage({ x: 4.8, y: 6 });
  assert.ok(edgeCoverage > 0 && edgeCoverage < 1);
});

test('TerrainDigMask connects multiple brush stamps into a continuous tunnel', () => {
  const { TerrainDigMask } = require('../assets/scripts/ui/TerrainDigMask');
  const mask = new TerrainDigMask();

  mask.addBrush({ center: { x: 0, y: 0 }, radius: 0.8, softness: 0.2 });
  mask.addBrush({ center: { x: 0.6, y: 0 }, radius: 0.8, softness: 0.2 });
  mask.addBrush({ center: { x: 1.2, y: 0 }, radius: 0.8, softness: 0.2 });

  assert.strictEqual(mask.getCoverage({ x: 0.3, y: 0 }), 0);
  assert.strictEqual(mask.getCoverage({ x: 0.9, y: 0 }), 0);
  assert.ok(mask.getCoverage({ x: 0.6, y: 0.72 }) > 0 && mask.getCoverage({ x: 0.6, y: 0.72 }) < 1);
});

test('TerrainDigMask exposes connected brush strokes for smooth rendering', () => {
  const { TerrainDigMask } = require('../assets/scripts/ui/TerrainDigMask');
  const mask = new TerrainDigMask();

  mask.addBrush({ center: { x: 0, y: 0 }, radius: 0.5, softness: 0.2 });
  mask.addBrush({ center: { x: 0.7, y: 0.1 }, radius: 0.5, softness: 0.2 });

  const strokes = mask.getStrokes();
  assert.strictEqual(strokes.length, 1);
  assert.deepStrictEqual(strokes[0].from, { x: 0, y: 0 });
  assert.deepStrictEqual(strokes[0].to, { x: 0.7, y: 0.1 });
  assert.strictEqual(strokes[0].radius, 0.5);
});

test('TerrainDigMask does not connect distant brush stamps into accidental tunnels', () => {
  const { TerrainDigMask } = require('../assets/scripts/ui/TerrainDigMask');
  const mask = new TerrainDigMask();

  mask.addBrush({ center: { x: 0, y: 0 }, radius: 0.5, softness: 0.2 });
  mask.addBrush({ center: { x: 8, y: 0 }, radius: 0.5, softness: 0.2 });

  assert.strictEqual(mask.getStrokes().length, 0);
  assert.strictEqual(mask.getCoverage({ x: 4, y: 0 }), 1);
});

test('TerrainDigMask bounds retained brushes for mobile rendering cost', () => {
  const { MAX_TERRAIN_DIG_MASK_BRUSHES, TerrainDigMask } = require('../assets/scripts/ui/TerrainDigMask');
  const mask = new TerrainDigMask();

  for (let index = 0; index < MAX_TERRAIN_DIG_MASK_BRUSHES + 20; index += 1) {
    mask.addBrush({ center: { x: index, y: 0 }, radius: 0.5, softness: 0.2 });
  }

  assert.ok(mask.getBrushes().length <= MAX_TERRAIN_DIG_MASK_BRUSHES);
  assert.strictEqual(mask.getCoverage({ x: 0, y: 0 }), 1);
  assert.strictEqual(mask.getCoverage({ x: MAX_TERRAIN_DIG_MASK_BRUSHES + 19, y: 0 }), 0);
});

test('TerrainDigMask prunes brush history outside the current viewport', () => {
  const { TerrainDigMask } = require('../assets/scripts/ui/TerrainDigMask');
  const mask = new TerrainDigMask();

  mask.addBrush({ center: { x: 0, y: 0 }, radius: 0.5, softness: 0.2 });
  mask.addBrush({ center: { x: 1, y: 0 }, radius: 0.5, softness: 0.2 });
  mask.addBrush({ center: { x: 20, y: 20 }, radius: 0.5, softness: 0.2 });

  mask.pruneOutsideView({ x: 0, y: 0 }, 4, 4, 1);

  assert.strictEqual(mask.getBrushes().length, 2);
  assert.strictEqual(mask.getCoverage({ x: 20, y: 20 }), 1);
  assert.strictEqual(mask.getCoverage({ x: 0, y: 0 }), 0);
});

test('TerrainVisualSampler applies dig mask to runtime soil tiles', () => {
  const { ContinuousTerrain } = require('../assets/scripts/gameplay/terrain/ContinuousTerrain');
  const { TerrainDigMask } = require('../assets/scripts/ui/TerrainDigMask');
  const { TerrainVisualSampler } = require('../assets/scripts/ui/TerrainVisualSampler');
  const terrain = new ContinuousTerrain({ seed: 778899 });
  const dirtPosition = findContinuousMaterial(terrain, 'dirt', 8, 16);
  const coordinate = terrain.getSampleCoordinate(dirtPosition);
  const digMask = new TerrainDigMask();
  digMask.addBrush({ center: dirtPosition, radius: 0.9, softness: 0.35 });

  const sample = new TerrainVisualSampler().sampleSoilTiles({
    terrain,
    center: dirtPosition,
    worldWidth: 3,
    worldHeight: 3,
    digMask,
  });

  assert.ok(!sample.tiles.some((tile) => tile.coordinate.x === coordinate.x && tile.coordinate.y === coordinate.y));
  assert.ok(sample.tiles.some((tile) => tile.color.a > 0 && tile.color.a < 255));
  assert.ok(sample.tiles.some((tile) => tile.color.a === 255));
});

test('DigBrushResolver clears dirt without inventory and does not mutate until applied', () => {
  const { ContinuousTerrain } = require('../assets/scripts/gameplay/terrain/ContinuousTerrain');
  const { DigBrushResolver } = require('../assets/scripts/gameplay/terrain/DigBrushResolver');
  const terrain = new ContinuousTerrain({ seed: 13579 });
  const resolver = new DigBrushResolver();
  const dirtPosition = findContinuousMaterial(terrain, 'dirt', 2, 10);

  const result = resolver.resolve(terrain, {
    center: dirtPosition,
    radius: 0.35,
    digPower: 3,
  });

  assert.ok(result.removedMaterialUnits > 0);
  assert.deepStrictEqual(result.inventoryDelta, {});
  assert.strictEqual(terrain.sample(dirtPosition).material, 'dirt');

  terrain.applyDigDelta(result.digDelta);

  assert.strictEqual(terrain.sample(dirtPosition).material, 'air');
});

test('DigBrushResolver collects ore units and respects material hardness', () => {
  const { ContinuousTerrain } = require('../assets/scripts/gameplay/terrain/ContinuousTerrain');
  const { DigBrushResolver } = require('../assets/scripts/gameplay/terrain/DigBrushResolver');
  const terrain = new ContinuousTerrain({ seed: 97531 });
  const resolver = new DigBrushResolver();
  const copperPosition = findContinuousMaterial(terrain, 'copper', 1, 42);
  const stonePosition = findContinuousMaterial(terrain, 'stone', 20, 70);

  const copperResult = resolver.resolve(terrain, {
    center: copperPosition,
    radius: 0.35,
    digPower: 3,
  });
  assert.ok(copperResult.inventoryDelta.copper > 0);
  assert.ok(copperResult.oxygenCost > 0);

  const weakStoneResult = resolver.resolve(terrain, {
    center: stonePosition,
    radius: 0.35,
    digPower: 1,
  });
  assert.strictEqual(weakStoneResult.removedMaterialUnits, 0);
  assert.strictEqual(weakStoneResult.slowedByHardness, true);

  const strongStoneResult = resolver.resolve(terrain, {
    center: stonePosition,
    radius: 0.35,
    digPower: 3,
  });
  assert.ok(strongStoneResult.removedMaterialUnits > 0);
});

test('ContinuousRunManager moves by elapsed time and normalizes diagonal speed', () => {
  const { ContinuousRunManager } = require('../assets/scripts/gameplay/ContinuousRunManager');

  const shortRunManager = new ContinuousRunManager(new GameState(), new FixedContinuousTerrain('air'));
  shortRunManager.start(DEFAULT_SAVE_DATA, [], { x: 0, y: 5 });
  shortRunManager.applyInput({ x: 1, y: 0, strength: 1 }, 0.02);

  const longRunManager = new ContinuousRunManager(new GameState(), new FixedContinuousTerrain('air'));
  longRunManager.start(DEFAULT_SAVE_DATA, [], { x: 0, y: 5 });
  longRunManager.applyInput({ x: 1, y: 0, strength: 1 }, 0.05);

  assert.ok(longRunManager.playerPosition.x > shortRunManager.playerPosition.x * 2);

  const horizontalRunManager = new ContinuousRunManager(new GameState(), new FixedContinuousTerrain('air'));
  const horizontalStart = horizontalRunManager.start(DEFAULT_SAVE_DATA, [], { x: 0, y: 5 });
  horizontalRunManager.applyInput({ x: 1, y: 0, strength: 1 }, 1);

  const diagonalRunManager = new ContinuousRunManager(new GameState(), new FixedContinuousTerrain('air'));
  const diagonalStart = diagonalRunManager.start(DEFAULT_SAVE_DATA, [], { x: 0, y: 5 });
  diagonalRunManager.applyInput({ x: 1, y: 1, strength: 1 }, 1);

  const horizontalDistance = Math.sqrt(
    horizontalRunManager.playerPosition.x * horizontalRunManager.playerPosition.x +
    (horizontalRunManager.playerPosition.y - horizontalStart.depth) *
      (horizontalRunManager.playerPosition.y - horizontalStart.depth),
  );
  const diagonalDistance = Math.sqrt(
    diagonalRunManager.playerPosition.x * diagonalRunManager.playerPosition.x +
    (diagonalRunManager.playerPosition.y - diagonalStart.depth) *
      (diagonalRunManager.playerPosition.y - diagonalStart.depth),
  );

  assert.ok(Math.abs(horizontalDistance - diagonalDistance) < 0.00001);
});

test('ContinuousRunManager clamps mobile frame spikes instead of teleporting', () => {
  const { ContinuousRunManager } = require('../assets/scripts/gameplay/ContinuousRunManager');
  const { CONTINUOUS_RUN_CONFIG } = require('../assets/scripts/gameplay/ContinuousRunTypes');
  const runManager = new ContinuousRunManager(new GameState(), new FixedContinuousTerrain('air'));

  runManager.start(DEFAULT_SAVE_DATA, [], { x: 0, y: 5 });
  runManager.applyInput({ x: 1, y: 0, strength: 1 }, 0.5);

  const maxFrameDistance = CONTINUOUS_RUN_CONFIG.moveSpeedPerSecond * CONTINUOUS_RUN_CONFIG.maxInputDeltaTime;
  assert.ok(runManager.playerPosition.x <= maxFrameDistance + 0.000001);
});

test('ContinuousRunManager substeps joystick input so mobile digging stays continuous', () => {
  const { ContinuousRunManager } = require('../assets/scripts/gameplay/ContinuousRunManager');
  const { CONTINUOUS_RUN_CONFIG } = require('../assets/scripts/gameplay/ContinuousRunTypes');
  const resolver = new RecordingDigResolver();
  const runManager = new ContinuousRunManager(
    new GameState(),
    new FixedContinuousTerrain('dirt'),
    undefined,
    resolver,
  );

  runManager.start(DEFAULT_SAVE_DATA, [], { x: 0, y: 5 });
  const result = runManager.applyInput({ x: 1, y: 0, strength: 1 }, CONTINUOUS_RUN_CONFIG.maxInputDeltaTime);

  assert.strictEqual(result.type, 'dig');
  assert.ok(resolver.centers.length > 1);
  assert.strictEqual(result.digResult.removedMaterialUnits, resolver.centers.length);
});

test('ContinuousRunManager allows upward digging and consumes oxygen underground', () => {
  const { ContinuousRunManager } = require('../assets/scripts/gameplay/ContinuousRunManager');
  const runManager = new ContinuousRunManager();
  const run = runManager.start(DEFAULT_SAVE_DATA, [], { x: 0, y: 4 });
  const startY = runManager.playerPosition.y;

  const result = runManager.applyInput({ x: 0, y: -1, strength: 1 }, 1);

  assert.ok(result.position.y < startY);
  assert.ok(result.run.oxygen < run.maxOxygen);
  assert.ok(result.run.depth >= 4);
});

test('ContinuousRunManager keeps the player from moving above the surface', () => {
  const { ContinuousRunManager } = require('../assets/scripts/gameplay/ContinuousRunManager');
  const runManager = new ContinuousRunManager();

  runManager.start(DEFAULT_SAVE_DATA, [], { x: 0, y: 0 });
  const result = runManager.applyInput({ x: 0, y: -1, strength: 1 }, 1);

  assert.strictEqual(result.position.y, 0);
  assert.strictEqual(runManager.playerPosition.y, 0);
});

test('DigBrushResolver can remove the first soil layer below surface air', () => {
  const { ContinuousTerrain } = require('../assets/scripts/gameplay/terrain/ContinuousTerrain');
  const { DigBrushResolver } = require('../assets/scripts/gameplay/terrain/DigBrushResolver');
  const terrain = new ContinuousTerrain({ seed: 12345 });
  const resolver = new DigBrushResolver();
  const position = { x: 0.25, y: 0.25 };

  const result = resolver.resolve(terrain, {
    center: position,
    radius: 0.35,
    digPower: 4,
  });

  assert.ok(result.removedMaterialUnits > 0);
  terrain.applyDigDelta(result.digDelta);
  assert.strictEqual(terrain.sample(position).material, 'air');
});

test('ContinuousRunManager refuses ore dig deltas that would overflow backpack', () => {
  const { ContinuousRunManager } = require('../assets/scripts/gameplay/ContinuousRunManager');
  const runManager = new ContinuousRunManager(new GameState(), new FixedContinuousTerrain('copper'));

  runManager.start(DEFAULT_SAVE_DATA, [], { x: 0, y: 1 });
  for (let index = 0; index < 30; index += 1) {
    runManager.applyInput({ x: 1, y: 0, strength: 1 }, 1);
  }

  const run = runManager.run;
  assert.ok(run.backpackUsed <= run.backpackCapacity);
  assert.ok(run.inventory.copper <= run.backpackCapacity * 5);
});

test('ContinuousRunManager applies oxygen pack recovery after dig oxygen cost', () => {
  const { ContinuousRunManager } = require('../assets/scripts/gameplay/ContinuousRunManager');
  const runManager = new ContinuousRunManager(new GameState(), new FixedContinuousTerrain('oxygen'));
  const startRun = runManager.start(DEFAULT_SAVE_DATA, [], { x: 0, y: 5 });

  const result = runManager.applyInput({ x: 1, y: 0, strength: 1 }, 1);

  assert.ok(result.digResult.recoveredOxygen > 0);
  assert.strictEqual(result.run.oxygen, startRun.maxOxygen);
});

test('OreMagnetResolver returns only nearby ore candidates sorted by distance', () => {
  const { OreMagnetResolver } = require('../assets/scripts/gameplay/terrain/OreMagnetResolver');
  const terrain = new SparseContinuousTerrain([
    { coordinate: { x: 2, y: 10 }, material: 'copper' },
    { coordinate: { x: 3, y: 10 }, material: 'stone' },
    { coordinate: { x: 4, y: 10 }, material: 'silver' },
    { coordinate: { x: 12, y: 10 }, material: 'gold' },
  ]);

  const candidates = new OreMagnetResolver().resolve(terrain, {
    center: { x: 1.2, y: 5.25 },
    radius: 1.2,
  });

  assert.deepStrictEqual(candidates.map((candidate) => candidate.material), ['copper', 'silver']);
  assert.ok(candidates[0].distanceSquared <= candidates[1].distanceSquared);
});

test('ContinuousRunManager magnet collects nearby ore without digging or oxygen cost', () => {
  const { ContinuousRunManager } = require('../assets/scripts/gameplay/ContinuousRunManager');
  const terrain = new SparseContinuousTerrain([
    { coordinate: { x: 2, y: 10 }, material: 'copper' },
    { coordinate: { x: 3, y: 10 }, material: 'oxygen' },
  ]);
  const runManager = new ContinuousRunManager(new GameState(), terrain);
  const run = runManager.start(DEFAULT_SAVE_DATA, [], { x: 0.55, y: 5.25 });
  const copperCenter = terrain.getSampleCenter({ x: 2, y: 10 });
  const oxygenCenter = terrain.getSampleCenter({ x: 3, y: 10 });

  const result = runManager.applyInput({ x: 1, y: 0, strength: 1 }, 0.02);

  assert.strictEqual(result.type, 'move');
  assert.strictEqual(result.collectedOre, 'copper');
  assert.strictEqual(result.run.inventory.copper, 1);
  assert.ok(result.run.oxygen < run.maxOxygen);
  assert.ok(result.run.oxygen > run.maxOxygen - 0.01);
  assert.strictEqual(terrain.sample(copperCenter).material, 'air');
  assert.strictEqual(terrain.sample(oxygenCenter).material, 'oxygen');
});

test('ContinuousTerrain rich vein generation option increases ore samples within capped probability', () => {
  const { ContinuousTerrain } = require('../assets/scripts/gameplay/terrain/ContinuousTerrain');
  const normalTerrain = new ContinuousTerrain({ seed: 24680 });
  const richTerrain = new ContinuousTerrain({ seed: 24680, rareOreBonus: 0.12 });

  const normalOreCount = countContinuousOreSamples(normalTerrain, 6, 18);
  const richOreCount = countContinuousOreSamples(richTerrain, 6, 18);

  assert.ok(richOreCount > normalOreCount);
});

test('BuffManager keeps fractional oxygen costs for continuous movement', () => {
  const { BuffManager } = require('../assets/scripts/gameplay/BuffManager');
  const buffs = new BuffManager();

  assert.ok(buffs.getOxygenCost(1 / 60, []) < 0.05);
  assert.ok(buffs.getOxygenCost(0.5, ['oxygenSaver']) < 0.5);
});

test('Continuous oxygen economy supports short runs instead of frame-rate drain', () => {
  const { getContinuousActionOxygenCost } = require('../assets/scripts/gameplay/ContinuousRunActionResolver');

  const oneSecondMoveCost = getContinuousActionOxygenCost(4, 1, undefined);
  const heavyDigCost = getContinuousActionOxygenCost(24, 1, {
    removedMaterialUnits: 4,
    inventoryDelta: {},
    oxygenCost: 10,
    slowedByHardness: false,
    digDelta: {
      removedSamples: [],
    },
  });

  assert.ok(oneSecondMoveCost > 0);
  assert.ok(oneSecondMoveCost <= 0.3);
  assert.ok(heavyDigCost < 1.2);
});

class FixedContinuousTerrain {
  constructor(material) {
    this.material = material;
  }

  sample() {
    return { material: this.material, hardness: 1 };
  }

  sampleAtCoordinate() {
    return { material: this.material, hardness: 1 };
  }

  getSampleCoordinate(position) {
    return {
      x: Math.floor(position.x / 0.5),
      y: Math.floor(position.y / 0.5),
    };
  }

  getSampleCenter(coordinate) {
    return {
      x: (coordinate.x + 0.5) * 0.5,
      y: (coordinate.y + 0.5) * 0.5,
    };
  }

  applyDigDelta() {}

  setGenerationOptions() {}
}

class DenseCopperTerrain {
  sample(position) {
    return position.y <= 0
      ? { material: 'air', hardness: 0 }
      : { material: 'copper', hardness: 1 };
  }

  sampleAtCoordinate(coordinate) {
    return this.sample(this.getSampleCenter(coordinate));
  }

  getSampleCoordinate(position) {
    return {
      x: Math.floor(position.x / 0.5),
      y: Math.floor(position.y / 0.5),
    };
  }

  getSampleCenter(coordinate) {
    return {
      x: (coordinate.x + 0.5) * 0.5,
      y: (coordinate.y + 0.5) * 0.5,
    };
  }
}

class SparseContinuousTerrain {
  constructor(entries) {
    this.materialByKey = new Map(entries.map((entry) => [this.getKey(entry.coordinate), entry.material]));
  }

  sample(position) {
    if (position.y <= 0) {
      return { material: 'air', hardness: 0 };
    }

    return this.sampleAtCoordinate(this.getSampleCoordinate(position));
  }

  sampleAtCoordinate(coordinate) {
    const material = this.materialByKey.get(this.getKey(coordinate)) ?? 'air';
    return {
      material,
      hardness: material === 'air' ? 0 : 1,
    };
  }

  getSampleCoordinate(position) {
    return {
      x: Math.floor(position.x / 0.5),
      y: Math.floor(position.y / 0.5),
    };
  }

  getSampleCenter(coordinate) {
    return {
      x: (coordinate.x + 0.5) * 0.5,
      y: (coordinate.y + 0.5) * 0.5,
    };
  }

  applyDigDelta(delta) {
    for (const sample of delta.removedSamples) {
      this.materialByKey.set(this.getKey(sample.coordinate), 'air');
    }
  }

  setGenerationOptions() {}

  getKey(coordinate) {
    return `${coordinate.x}:${coordinate.y}`;
  }
}

class RecordingDigResolver {
  constructor() {
    this.centers = [];
  }

  resolve(terrain, request) {
    this.centers.push({ ...request.center });
    return {
      removedMaterialUnits: 1,
      inventoryDelta: {},
      oxygenCost: 0,
      recoveredOxygen: 0,
      slowedByHardness: false,
      digDelta: {
        removedSamples: [
          {
            coordinate: terrain.getSampleCoordinate(request.center),
            material: 'dirt',
            units: 1,
          },
        ],
      },
    };
  }
}

function findContinuousMaterial(terrain, material, minDepth, maxDepth) {
  for (let y = minDepth; y <= maxDepth; y += 0.5) {
    for (let x = -40; x <= 40; x += 0.5) {
      const position = { x: x + 0.25, y: y + 0.25 };
      if (terrain.sample(position).material === material) {
        return position;
      }
    }
  }

  throw new Error(`Could not find continuous material ${material}`);
}

function findAnyContinuousOre(terrain, minDepth, maxDepth) {
  for (let y = minDepth; y <= maxDepth; y += 0.5) {
    for (let x = -40; x <= 40; x += 0.5) {
      const position = { x: x + 0.25, y: y + 0.25 };
      const material = terrain.sample(position).material;
      if (ORE_TYPES.includes(material)) {
        return position;
      }
    }
  }

  throw new Error('Could not find continuous ore');
}

function countContinuousOreSamples(terrain, minDepth, maxDepth) {
  let oreCount = 0;
  for (let y = minDepth; y <= maxDepth; y += 0.5) {
    for (let x = -30; x <= 30; x += 0.5) {
      const material = terrain.sample({ x: x + 0.25, y: y + 0.25 }).material;
      if (ORE_TYPES.includes(material)) {
        oreCount += 1;
      }
    }
  }

  return oreCount;
}

test('MineGrid allows horizontal expansion while keeping vertical bounds', () => {
  const grid = new MineGrid(9, 20, () => 0.5);

  assert.strictEqual(grid.centerX, 0);
  assert.strictEqual(grid.isInBounds({ x: -1000, y: 1 }), true);
  assert.strictEqual(grid.isInBounds({ x: 1000, y: 1 }), true);
  assert.strictEqual(grid.isInBounds({ x: 0, y: -1 }), false);
  assert.strictEqual(grid.isInBounds({ x: 0, y: 21 }), false);

  grid.setTile({ x: -12, y: 1 }, 'copper');
  assert.strictEqual(grid.getTile({ x: -12, y: 1 }).type, 'copper');
});

test('MineGrid coordinate generation is independent from query order', () => {
  const positions = [
    { x: -8, y: 5 },
    { x: 0, y: 12 },
    { x: 13, y: 24 },
    { x: -21, y: 37 },
  ];
  const firstGrid = new MineGrid(9, 80, () => 0.25);
  const secondGrid = new MineGrid(9, 80, () => 0.25);

  const firstTypes = positions.map((position) => firstGrid.getTile(position).type);
  positions.slice().reverse().forEach((position) => secondGrid.getTile(position));
  const secondTypes = positions.map((position) => secondGrid.getTile(position).type);

  assert.deepStrictEqual(secondTypes, firstTypes);
});

test('MineGrid slanted vein area remains deterministic across query orders', () => {
  const rowFirstGrid = new MineGrid(9, 120, () => 0.42);
  const columnFirstGrid = new MineGrid(9, 120, () => 0.42);
  const positions = [];

  for (let y = 20; y <= 45; y += 1) {
    for (let x = -24; x <= 24; x += 1) {
      positions.push({ x, y });
    }
  }

  const rowFirstTypes = positions.map((position) => rowFirstGrid.getTile(position).type);
  for (let x = -24; x <= 24; x += 1) {
    for (let y = 45; y >= 20; y -= 1) {
      columnFirstGrid.getTile({ x, y });
    }
  }
  const columnFirstTypes = positions.map((position) => columnFirstGrid.getTile(position).type);

  assert.deepStrictEqual(columnFirstTypes, rowFirstTypes);
});

test('MineGrid does not cache every naturally generated tile', () => {
  const grid = new MineGrid(9, 80, () => 0.25);

  for (let index = 0; index < 20000; index += 1) {
    grid.getTile({ x: index - 10000, y: (index % 70) + 1 });
  }

  const stats = grid.getCacheStats();
  assert.strictEqual(stats.tiles, 0);
  assert.ok(stats.veins <= stats.maxVeins);
});

test('MineGrid trims modified tile cache when horizontal exploration is extreme', () => {
  const grid = new MineGrid(9, 80, () => 0.25);

  for (let index = 0; index < 20000; index += 1) {
    grid.setTile({ x: index - 10000, y: (index % 70) + 1 }, 'empty');
  }

  const stats = grid.getCacheStats();
  assert.ok(stats.tiles <= stats.maxTiles);
});

test('MineGrid hash produces varied tiles across negative and positive coordinates', () => {
  const grid = new MineGrid(9, 120, () => 0.42);
  const negativeTypes = new Set();
  const positiveTypes = new Set();

  for (let x = -100; x < 0; x += 1) {
    negativeTypes.add(grid.getTile({ x, y: 45 }).type);
  }

  for (let x = 1; x <= 100; x += 1) {
    positiveTypes.add(grid.getTile({ x, y: 45 }).type);
  }

  assert.ok(negativeTypes.size >= 3);
  assert.ok(positiveTypes.size >= 3);
});

test('InventoryCalculator compresses same ore into stacks of five', () => {
  const inventory = createEmptyInventory();
  inventory.copper = 6;
  inventory.silver = 5;

  const usage = new InventoryCalculator().calculateUsage(inventory);

  assert.strictEqual(usage.ores.copper.usedSlots, 2);
  assert.strictEqual(usage.ores.silver.usedSlots, 1);
  assert.strictEqual(usage.usedSlots, 3);
  assert.strictEqual(usage.savedSlots, 8);
});

test('Ore config exposes early and rare ore variety through inventory and rewards', () => {
  const inventory = createEmptyInventory();

  assert.ok(getAvailableOreTypes(8).includes('coal'));
  assert.ok(getAvailableOreTypes(16).includes('tin'));
  assert.ok(getAvailableOreTypes(82).includes('emerald'));
  assert.ok(getAvailableOreTypes(135).includes('ruby'));

  for (const oreType of ORE_TYPES) {
    assert.strictEqual(typeof inventory[oreType], 'number');
    assert.ok(TILE_CONFIG[oreType].oreValue > 0);
    assert.ok(TILE_CONFIG[oreType].backpackSize > 0);
  }
});

test('Every configured ore has a sprite resource png', () => {
  for (const oreType of ORE_TYPES) {
    const spritePath = path.join(__dirname, '..', 'assets', 'resources', 'art', 'sprites', `ore_${oreType}.png`);
    assert.ok(fs.existsSync(spritePath), `missing sprite for ${oreType}`);
  }
});

test('RunManager uses compressed backpack usage after collecting same ore', () => {
  const state = new GameState();
  const grid = new MineGrid();
  const runManager = new RunManager(state, grid);

  runManager.start(DEFAULT_SAVE_DATA, []);
  [
    { x: grid.centerX, y: 1 },
    { x: grid.centerX + 1, y: 1 },
    { x: grid.centerX + 2, y: 1 },
    { x: grid.centerX + 3, y: 1 },
    { x: grid.centerX + 4, y: 1 },
    { x: grid.centerX + 4, y: 2 },
  ].forEach((position) => grid.setTile(position, 'copper'));

  runManager.move('down');
  runManager.move('right');
  runManager.move('right');
  runManager.move('right');
  runManager.move('right');
  const result = runManager.move('down');

  assert.strictEqual(result.run.inventory.copper, 6);
  assert.strictEqual(result.run.backpackUsed, 2);
});

test('RunManager coin breakdown matches earned coins with value buffs', () => {
  const state = new GameState();
  const grid = new MineGrid();
  const runManager = new RunManager(state, grid);

  runManager.start(DEFAULT_SAVE_DATA, ['betterBuyer']);
  grid.setTile({ x: grid.centerX, y: 1 }, 'copper');
  runManager.move('down');
  const result = runManager.returnToSurface();

  assert.strictEqual(result.earnedCoins, 6);
  assert.strictEqual(result.coinBreakdown.total, result.earnedCoins);
  assert.strictEqual(result.coinBreakdown.oreValue, 5);
  assert.strictEqual(result.coinBreakdown.oreValueMultiplier, 1.2);
  assert.strictEqual(result.coinBreakdown.multipliedValue, 6);
});

test('RunManager starts without buffs and offers choices after collecting 50 copper', () => {
  const state = new GameState();
  const grid = new MineGrid();
  const runManager = new RunManager(state, grid);

  const run = runManager.start(DEFAULT_SAVE_DATA);
  assert.deepStrictEqual(run.activeBuffs, []);

  for (let x = grid.centerX; x < grid.centerX + 50; x += 1) {
    grid.setTile({ x, y: 1 }, 'copper');
  }

  let result = runManager.move('down');
  for (let step = 1; step < 50; step += 1) {
    result = runManager.move('right');
  }

  assert.strictEqual(result.run.inventory.copper, 50);
  assert.strictEqual(result.rewardReason, '铜矿 x50');
  assert.strictEqual(result.rewardChoices.length, 3);
  assert.deepStrictEqual(result.run.activeBuffs, []);
});

test('RunManager start resets modified mine tiles for a fresh run', () => {
  const state = new GameState();
  const grid = new MineGrid();
  const runManager = new RunManager(state, grid);

  runManager.start(DEFAULT_SAVE_DATA);
  grid.setTile({ x: grid.centerX, y: 1 }, 'empty');
  assert.strictEqual(grid.getTile({ x: grid.centerX, y: 1 }).type, 'empty');

  runManager.start(DEFAULT_SAVE_DATA);

  assert.notStrictEqual(grid.getTile({ x: grid.centerX, y: 1 }).type, 'empty');
});

test('RunManager applies a collection reward once selected and does not repeat the same milestone', () => {
  const state = new GameState();
  const grid = new MineGrid();
  const runManager = new RunManager(state, grid);

  runManager.start({
    ...DEFAULT_SAVE_DATA,
    upgrades: {
      ...DEFAULT_SAVE_DATA.upgrades,
      backpack: 2,
    },
  });
  for (let x = grid.centerX; x < grid.centerX + 51; x += 1) {
    grid.setTile({ x, y: 1 }, 'copper');
  }

  runManager.move('down');
  let result = runManager.move('right');
  for (let step = 2; step < 50; step += 1) {
    result = runManager.move('right');
  }

  const chosenBuff = result.rewardChoices[0];
  const updatedRun = runManager.chooseRewardBuff(chosenBuff);
  assert.ok(updatedRun.activeBuffs.includes(chosenBuff));

  result = runManager.move('right');
  assert.strictEqual(result.run.inventory.copper, 51);
  assert.strictEqual(result.rewardChoices, undefined);
  assert.strictEqual(result.rewardReason, undefined);
});

test('RunManager ignores reward selection when no collection reward is pending', () => {
  const state = new GameState();
  const runManager = new RunManager(state, new MineGrid());

  runManager.start(DEFAULT_SAVE_DATA);

  assert.strictEqual(runManager.chooseRewardBuff('betterBuyer'), null);
  assert.deepStrictEqual(runManager.run.activeBuffs, []);
});

test('RunManager abandon clears both manager and GameState run state', () => {
  const state = new GameState();
  const runManager = new RunManager(state, new MineGrid());

  runManager.start(DEFAULT_SAVE_DATA, []);
  assert.ok(state.run);

  runManager.abandonRun();

  assert.strictEqual(runManager.run, null);
  assert.strictEqual(state.run, null);
  assert.strictEqual(state.phase, 'home');
});

test('SaveManager reports load failure and refuses to overwrite fallback data', async () => {
  const state = new GameState();
  const saves = new SaveManager(state);
  let writeCount = 0;
  PlatformManager.use({
    name: 'mock',
    init: async () => ({ ok: true }),
    getStorage: async (_key, fallback) => ({ ok: false, error: 'read failed', data: { ...fallback, coins: 77 } }),
    setStorage: async () => {
      writeCount += 1;
      return { ok: true };
    },
    removeStorage: async () => ({ ok: true }),
    login: async () => ({ ok: true, data: { anonymous: true } }),
    share: async () => ({ ok: true }),
    showRewardedVideo: async () => ({ ok: true, data: { completed: true } }),
    vibrateShort: async () => ({ ok: true }),
    getSystemInfo: async () => ({
      ok: true,
      data: {
        platform: 'test',
        model: 'test',
        system: 'test',
        safeAreaTop: 0,
        safeAreaBottom: 0,
      },
    }),
  });

  const loadResult = await saves.load();
  const saveResult = await saves.save({ ...DEFAULT_SAVE_DATA, coins: 10 });

  assert.strictEqual(loadResult.ok, false);
  assert.strictEqual(loadResult.data.coins, 77);
  assert.strictEqual(state.save.coins, DEFAULT_SAVE_DATA.coins);
  assert.strictEqual(saveResult.ok, false);
  assert.strictEqual(writeCount, 0);

  PlatformManager.use(new MockPlatform());
});

test('SaveManager normalizes malformed numeric save fields to finite integers', async () => {
  const state = new GameState();
  const saves = new SaveManager(state);
  PlatformManager.use({
    name: 'mock',
    init: async () => ({ ok: true }),
    getStorage: async () => ({
      ok: true,
      data: {
        version: 1,
        coins: 'bad',
        bestDepth: Number.POSITIVE_INFINITY,
        upgrades: {
          pickaxe: 'oops',
          oxygenTank: -5,
          backpack: 2.9,
          oreValue: null,
        },
      },
    }),
    setStorage: async () => ({ ok: true }),
    removeStorage: async () => ({ ok: true }),
    login: async () => ({ ok: true, data: { anonymous: true } }),
    share: async () => ({ ok: true }),
    showRewardedVideo: async () => ({ ok: true, data: { completed: true } }),
    vibrateShort: async () => ({ ok: true }),
    getSystemInfo: async () => ({
      ok: true,
      data: {
        platform: 'test',
        model: 'test',
        system: 'test',
        safeAreaTop: 0,
        safeAreaBottom: 0,
      },
    }),
  });

  const loadResult = await saves.load();

  assert.strictEqual(loadResult.ok, true);
  assert.strictEqual(loadResult.data.coins, 0);
  assert.strictEqual(loadResult.data.bestDepth, 0);
  assert.strictEqual(loadResult.data.upgrades.pickaxe, 1);
  assert.strictEqual(loadResult.data.upgrades.oxygenTank, 1);
  assert.strictEqual(loadResult.data.upgrades.backpack, 2);
  assert.strictEqual(loadResult.data.upgrades.oreValue, 1);

  PlatformManager.use(new MockPlatform());
});

test('SaveManager returns failure and keeps current state when platform write fails', async () => {
  const state = new GameState();
  const saves = new SaveManager(state);
  PlatformManager.use({
    name: 'mock',
    init: async () => ({ ok: true }),
    getStorage: async (_key, fallback) => ({ ok: true, data: fallback }),
    setStorage: async () => ({ ok: false, error: 'write failed' }),
    removeStorage: async () => ({ ok: true }),
    login: async () => ({ ok: true, data: { anonymous: true } }),
    share: async () => ({ ok: true }),
    showRewardedVideo: async () => ({ ok: true, data: { completed: true } }),
    vibrateShort: async () => ({ ok: true }),
    getSystemInfo: async () => ({
      ok: true,
      data: {
        platform: 'test',
        model: 'test',
        system: 'test',
        safeAreaTop: 0,
        safeAreaBottom: 0,
      },
    }),
  });

  const result = await saves.save({
    ...DEFAULT_SAVE_DATA,
    coins: 99,
  });

  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.data.coins, 99);
  assert.strictEqual(state.save.coins, DEFAULT_SAVE_DATA.coins);

  PlatformManager.use(new MockPlatform());
});
