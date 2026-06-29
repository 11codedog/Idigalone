export type SkillId = 'oreCompression';

export type SkillCategory = 'backpack';

export interface SkillDefinition {
  id: SkillId;
  category: SkillCategory;
  displayName: string;
  description: string;
  unlockCost: number;
}

export interface SkillModifiers {
  oreStackLimit: number;
  oreStackSlotCost: number;
}

export interface SkillState {
  unlocked: SkillId[];
  equipped: SkillId[];
}
