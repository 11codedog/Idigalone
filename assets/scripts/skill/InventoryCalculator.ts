import { OreType, RunInventory } from '../core/GameTypes';
import { ORE_TYPES, TILE_CONFIG } from '../config/GameConfig';
import { skillManager, SkillManager } from './SkillManager';
import { SkillModifiers } from './SkillTypes';

export type InventoryDelta = Partial<Record<OreType, number>>;

export interface OreInventoryUsage {
  count: number;
  rawSlots: number;
  usedSlots: number;
}

export interface InventoryUsage {
  usedSlots: number;
  rawSlots: number;
  savedSlots: number;
  ores: Record<OreType, OreInventoryUsage>;
}

export class InventoryCalculator {
  public constructor(private readonly skills: SkillManager = skillManager) {}

  public canApplyDelta(inventory: RunInventory, delta: InventoryDelta, capacity: number): boolean {
    const nextInventory = this.applyDelta(inventory, delta);
    return this.calculateUsage(nextInventory).usedSlots <= capacity;
  }

  public calculateUsage(
    inventory: RunInventory,
    modifiers: SkillModifiers = this.skills.getModifiers(),
  ): InventoryUsage {
    const ores = {} as Record<OreType, OreInventoryUsage>;
    let usedSlots = 0;
    let rawSlots = 0;

    for (const oreType of ORE_TYPES) {
      const count = inventory[oreType];
      const rawOreSlots = count * TILE_CONFIG[oreType].backpackSize;
      const usedOreSlots = this.calculateOreSlots(count, modifiers);
      ores[oreType] = {
        count,
        rawSlots: rawOreSlots,
        usedSlots: usedOreSlots,
      };
      rawSlots += rawOreSlots;
      usedSlots += usedOreSlots;
    }

    return {
      usedSlots,
      rawSlots,
      savedSlots: Math.max(0, rawSlots - usedSlots),
      ores,
    };
  }

  private calculateOreSlots(count: number, modifiers: SkillModifiers): number {
    if (count <= 0) {
      return 0;
    }

    const stackLimit = Math.max(1, modifiers.oreStackLimit);
    return Math.ceil(count / stackLimit) * modifiers.oreStackSlotCost;
  }

  private applyDelta(inventory: RunInventory, delta: InventoryDelta): RunInventory {
    const nextInventory = { ...inventory };

    for (const oreType of ORE_TYPES) {
      nextInventory[oreType] = Math.max(0, nextInventory[oreType] + (delta[oreType] ?? 0));
    }

    return nextInventory;
  }
}

export const inventoryCalculator = new InventoryCalculator();
