const assert = require('assert');

const { DEFAULT_SAVE_DATA } = require('../assets/scripts/config/GameConfig');
const { GameState } = require('../assets/scripts/core/GameState');
const { createEmptyInventory } = require('../assets/scripts/core/GameTypes');
const { SaveManager } = require('../assets/scripts/core/SaveManager');
const { MineGrid } = require('../assets/scripts/gameplay/MineGrid');
const { RunManager } = require('../assets/scripts/gameplay/RunManager');
const { InventoryCalculator } = require('../assets/scripts/skill/InventoryCalculator');
const { PlatformManager } = require('../assets/scripts/platform/PlatformManager');
const { MockPlatform } = require('../assets/scripts/platform/MockPlatform');

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
