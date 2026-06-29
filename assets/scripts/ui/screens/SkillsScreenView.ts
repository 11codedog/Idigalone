import { Color } from 'cc';
import { SKILL_CONFIG } from '../../skill/SkillConfig';
import { skillManager } from '../../skill/SkillManager';
import type { SkillCategory, SkillId } from '../../skill/SkillTypes';
import type { MiningScreenActions } from '../MiningScreenTypes';
import { UiFactory } from '../UiFactory';
import { ScreenTextView } from './ScreenTextView';

export class SkillsScreenView {
  private readonly textView: ScreenTextView;

  public constructor(private readonly ui: UiFactory) {
    this.textView = new ScreenTextView(ui);
  }

  public render(actions: MiningScreenActions): void {
    const equippedSkills = skillManager.getEquippedSkills();
    const modifiers = skillManager.getModifiers(equippedSkills);

    this.textView.renderTitle('技能');
    this.ui.label({
      text: '技能会改变挖矿规则。第一版默认启用，后续再做解锁、升级和携带选择。',
      x: 0,
      y: 260,
      fontSize: 18,
      color: new Color(210, 240, 255, 255),
      width: 660,
      height: 44,
    });

    this.renderSkillList(equippedSkills);
    this.renderEffectSummary(modifiers.oreStackLimit, modifiers.oreStackSlotCost);

    this.ui.button({ text: '返回首页', x: -120, y: -250, onClick: actions.showHome, width: 160, height: 52 });
    this.ui.button({ text: '开始下矿', x: 120, y: -250, onClick: actions.showBuffSelect, width: 160, height: 52 });
  }

  private renderSkillList(equippedSkills: SkillId[]): void {
    this.ui.rect({
      name: 'EquippedSkillPanel',
      x: 0,
      y: 115,
      width: 620,
      height: 220,
      fillColor: new Color(0, 10, 14, 205),
      strokeColor: new Color(55, 105, 125, 180),
      strokeWidth: 2,
    });
    this.ui.label({
      text: '当前启用',
      x: -230,
      y: 198,
      fontSize: 18,
      color: new Color(255, 230, 150, 255),
      width: 130,
      height: 30,
    });

    if (equippedSkills.length === 0) {
      this.ui.label({
        text: '暂无已启用技能。',
        x: 0,
        y: 100,
        fontSize: 22,
        color: new Color(210, 240, 255, 255),
        width: 560,
        height: 60,
      });
      return;
    }

    const skillLines = equippedSkills.map((skillId) => {
      const config = SKILL_CONFIG[skillId];
      return [
        `${config.displayName}    已启用    ${this.categoryLabel(config.category)}`,
        config.description,
      ].join('\n');
    });

    this.ui.label({
      text: skillLines.join('\n\n'),
      x: 0,
      y: 112,
      fontSize: 20,
      color: Color.WHITE,
      width: 560,
      height: 150,
    });
  }

  private renderEffectSummary(stackLimit: number, slotCost: number): void {
    this.ui.rect({
      name: 'SkillEffectPanel',
      x: 0,
      y: -95,
      width: 620,
      height: 150,
      fillColor: new Color(10, 22, 18, 205),
      strokeColor: new Color(80, 145, 115, 170),
      strokeWidth: 2,
    });

    this.ui.label({
      text: '背包收益',
      x: -230,
      y: -45,
      fontSize: 18,
      color: new Color(155, 245, 190, 255),
      width: 130,
      height: 30,
    });
    this.ui.label({
      text: [
        `当前效果：同类矿石每 ${stackLimit} 个占 ${slotCost} 格背包。`,
        '示例：铜矿 x5 占 1 格，铜矿 x6 占 2 格，铜矿 x13 占 3 格。',
        '这会让玩家在同样背包容量下挖得更深，但不会直接提高单个矿石售价。',
      ].join('\n'),
      x: 0,
      y: -105,
      fontSize: 18,
      color: new Color(230, 245, 255, 255),
      width: 560,
      height: 100,
    });
  }

  private categoryLabel(category: SkillCategory): string {
    if (category === 'backpack') {
      return '背包类';
    }

    return '通用类';
  }
}
