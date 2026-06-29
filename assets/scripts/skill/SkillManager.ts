import {
  DEFAULT_EQUIPPED_SKILLS,
  ORE_COMPRESSION_SLOT_COST,
  ORE_COMPRESSION_STACK_LIMIT,
} from './SkillConfig';
import { SkillId, SkillModifiers } from './SkillTypes';

const DEFAULT_MODIFIERS: SkillModifiers = {
  oreStackLimit: 1,
  oreStackSlotCost: 1,
};

export class SkillManager {
  public getEquippedSkills(): SkillId[] {
    return [...DEFAULT_EQUIPPED_SKILLS];
  }

  public getModifiers(equippedSkills: SkillId[] = this.getEquippedSkills()): SkillModifiers {
    const modifiers: SkillModifiers = { ...DEFAULT_MODIFIERS };

    if (equippedSkills.indexOf('oreCompression') >= 0) {
      modifiers.oreStackLimit = ORE_COMPRESSION_STACK_LIMIT;
      modifiers.oreStackSlotCost = ORE_COMPRESSION_SLOT_COST;
    }

    return modifiers;
  }
}

export const skillManager = new SkillManager();
