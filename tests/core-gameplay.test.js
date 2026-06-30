const assert = require('assert');

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

test('TerrainVisualSampler creates deterministic fine-grain natural terrain colors', () => {
  const { ContinuousTerrain } = require('../assets/scripts/gameplay/terrain/ContinuousTerrain');
  const { TerrainVisualSampler } = require('../assets/scripts/ui/TerrainVisualSampler');
  const terrain = new ContinuousTerrain({ seed: 112233 });
  const sampler = new TerrainVisualSampler();

  const first = sampler.sample({
    terrain,
    center: { x: 0, y: 24 },
    worldWidth: 16,
    worldHeight: 20,
  });
  const second = sampler.sample({
    terrain,
    center: { x: 0, y: 24 },
    worldWidth: 16,
    worldHeight: 20,
  });

  assert.ok(first.width >= 160);
  assert.ok(first.height >= 220);
  assert.strictEqual(first.cells.length, first.width * first.height);
  assert.deepStrictEqual(second.cells, first.cells);

  const uniqueColors = new Set(first.cells.slice(0, 1200).map((cell) => `${cell.r},${cell.g},${cell.b},${cell.a}`));
  assert.ok(uniqueColors.size >= 12);
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

  const shortRunManager = new ContinuousRunManager();
  shortRunManager.start(DEFAULT_SAVE_DATA);
  shortRunManager.applyInput({ x: 1, y: 0, strength: 1 }, 0.25);

  const longRunManager = new ContinuousRunManager();
  longRunManager.start(DEFAULT_SAVE_DATA);
  longRunManager.applyInput({ x: 1, y: 0, strength: 1 }, 1);

  assert.ok(longRunManager.playerPosition.x > shortRunManager.playerPosition.x * 2);

  const horizontalRunManager = new ContinuousRunManager();
  horizontalRunManager.start(DEFAULT_SAVE_DATA);
  horizontalRunManager.applyInput({ x: 1, y: 0, strength: 1 }, 1);

  const diagonalRunManager = new ContinuousRunManager();
  diagonalRunManager.start(DEFAULT_SAVE_DATA);
  diagonalRunManager.applyInput({ x: 1, y: -1, strength: 1 }, 1);

  const horizontalDistance = Math.sqrt(
    horizontalRunManager.playerPosition.x * horizontalRunManager.playerPosition.x +
    horizontalRunManager.playerPosition.y * horizontalRunManager.playerPosition.y,
  );
  const diagonalDistance = Math.sqrt(
    diagonalRunManager.playerPosition.x * diagonalRunManager.playerPosition.x +
    diagonalRunManager.playerPosition.y * diagonalRunManager.playerPosition.y,
  );

  assert.ok(Math.abs(horizontalDistance - diagonalDistance) < 0.00001);
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
