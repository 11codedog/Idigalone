import { BuffId, OreType, RunState } from '../core/GameTypes';
import { BuffManager } from './BuffManager';

export interface PendingRewardChoice {
  milestoneId: string;
  reason: string;
  choices: BuffId[];
}

const COLLECTION_REWARD_POOL: BuffId[] = [
  'betterBuyer',
  'biggerBag',
  'fastPickaxe',
  'oxygenSaver',
  'stoneBreaker',
  'deepBonus',
];

export class ContinuousRunRewardTracker {
  private pendingRewardValue: PendingRewardChoice | null = null;
  private readonly grantedRewardMilestones = new Set<string>();

  public get pendingReward(): PendingRewardChoice | null {
    return this.pendingRewardValue
      ? { ...this.pendingRewardValue, choices: [...this.pendingRewardValue.choices] }
      : null;
  }

  public reset(): void {
    this.pendingRewardValue = null;
    this.grantedRewardMilestones.clear();
  }

  public acceptChoice(buffId: BuffId): PendingRewardChoice | null {
    const pendingReward = this.pendingRewardValue;
    if (!pendingReward || pendingReward.choices.indexOf(buffId) < 0) {
      return null;
    }

    this.pendingRewardValue = null;
    return { ...pendingReward, choices: [...pendingReward.choices] };
  }

  public tryCreateCollectionReward(
    collectedOre: OreType | undefined,
    run: RunState,
    activeBuffs: BuffId[],
    buffs: BuffManager,
  ): PendingRewardChoice | null {
    if (!collectedOre || this.pendingRewardValue) {
      return this.pendingReward;
    }

    if (collectedOre === 'copper' && run.inventory.copper >= 50) {
      return this.createRewardChoices('collectCopper50', '铜矿 x50', COLLECTION_REWARD_POOL, activeBuffs, buffs);
    }

    return null;
  }

  private createRewardChoices(
    milestoneId: string,
    reason: string,
    pool: BuffId[],
    activeBuffs: BuffId[],
    buffs: BuffManager,
  ): PendingRewardChoice | null {
    if (this.grantedRewardMilestones.has(milestoneId)) {
      return null;
    }

    const availablePool = pool.filter((buffId) => activeBuffs.indexOf(buffId) < 0);
    const choices = buffs.chooseRandomBuffs(3, Math.random, availablePool);
    if (choices.length === 0) {
      return null;
    }

    this.grantedRewardMilestones.add(milestoneId);
    this.pendingRewardValue = {
      milestoneId,
      reason,
      choices,
    };
    return this.pendingReward;
  }
}
