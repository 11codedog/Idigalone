import { SkillDefinition, SkillId } from './SkillTypes';

export const DEFAULT_EQUIPPED_SKILLS: SkillId[] = ['oreCompression'];

export const SKILL_CONFIG: Record<SkillId, SkillDefinition> = {
  oreCompression: {
    id: 'oreCompression',
    category: 'backpack',
    displayName: '矿石压缩',
    description: '同类矿石最多 5 个压缩成 1 组，每组占 1 格背包。',
    unlockCost: 0,
  },
};

export const ORE_COMPRESSION_STACK_LIMIT = 5;
export const ORE_COMPRESSION_SLOT_COST = 1;
