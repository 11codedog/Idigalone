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
