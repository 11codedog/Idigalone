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

test('矿石压缩按同类 5 个一组计算背包占用', () => {
  const inventory = createEmptyInventory();
  inventory.copper = 6;
  inventory.silver = 5;

  const usage = new InventoryCalculator().calculateUsage(inventory);

  assert.strictEqual(usage.ores.copper.usedSlots, 2);
  assert.strictEqual(usage.ores.silver.usedSlots, 1);
  assert.strictEqual(usage.usedSlots, 3);
  assert.strictEqual(usage.savedSlots, 8);
});

test('RunManager 采集同类矿石后使用压缩后的背包占用', () => {
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

test('SaveManager 在平台写入失败时返回失败并保留当前状态', async () => {
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
