import { SKILL_RARITY_MAP } from '@spaceshooter/shared';

/**
 * HTML-based Skill Selection Modal
 * Replaces the Three.js modal with a proper HTML implementation
 */

export class UISkillModal {
  private skillOptions: any[] = [];
  private keyHandler: ((event: KeyboardEvent) => void) | null = null;
  private onSkillSelected: ((skillType: string) => void) | null = null;

  constructor(onSkillSelected?: (skillType: string) => void) {
    this.onSkillSelected = onSkillSelected || null;
  }

  public show(skillOptions: any[], onSkillSelected?: (skillType: string) => void): void {
    this.skillOptions = skillOptions;
    if (onSkillSelected) {
      this.onSkillSelected = onSkillSelected;
    }

    // Get HTML modal elements
    const modal = document.getElementById('skill-modal');
    const container = document.getElementById('skill-options-container');

    if (!modal || !container) {
      console.error('Skill modal HTML elements not found');
      return;
    }


    // Limpar opções anteriores
    container.innerHTML = '';

    // Cores e labels de raridade
    const rarityColors: Record<string, string> = {
      'rara': '#3fa7ff',
      'epica': '#b86cff',
      'lendaria': '#ffd700'
    };
    const rarityLabels: Record<string, string> = {
      'rara': 'Rara',
      'epica': 'Épica',
      'lendaria': 'Lendária'
    };

    // Criar botões de skill
    skillOptions.forEach((skillOption, index) => {
      const skillConfig = skillOption.config;
      const skillName = (skillConfig.icon || '⭐') + ' ' + skillConfig.name;
      const skillDesc = (skillConfig.effects[skillOption.nextLevel] && skillConfig.effects[skillOption.nextLevel].description) || skillConfig.description;
  // Corrigir tipagem para acessar SKILL_RARITY_MAP
  const skillType = skillOption.type as keyof typeof SKILL_RARITY_MAP;
  const rarity = SKILL_RARITY_MAP[skillType] || skillOption.rarity || 'rara';
      const rarityColor = rarityColors[rarity] || '#fff';
      const rarityLabel = rarityLabels[rarity] || '';

      const skillElement = document.createElement('div');
      skillElement.className = 'skill-option';
      skillElement.setAttribute('data-skill-type', skillOption.type);
      skillElement.setAttribute('data-skill-index', index.toString());

      skillElement.innerHTML =
        '<div class="skill-header">' +
          '<div class="skill-name">' + skillName + '</div>' +
          '<div class="skill-key">' + (index + 1) + '</div>' +
        '</div>' +
        '<div class="skill-meta">' +
          '<span class="skill-rarity" style="color:' + rarityColor + ';font-weight:bold;letter-spacing:1px;">' + rarityLabel + '</span>' +
        '</div>' +
        '<div class="skill-description">' + skillDesc + '</div>';

      skillElement.addEventListener('click', () => {
        this.selectSkill(skillOption.type);
      });
      skillElement.addEventListener('touchend', (e) => {
        e.preventDefault();
        this.selectSkill(skillOption.type);
      });
      container.appendChild(skillElement);
    });
    modal.classList.add('show');

    // Keyboard handler for (1, 2, 3 keys)
    this.keyHandler = (event: KeyboardEvent) => {
      const keyIndex = parseInt(event.key) - 1;
      if (keyIndex >= 0 && keyIndex < this.skillOptions.length) {
        const selectedSkill = this.skillOptions[keyIndex];
        this.selectSkill(selectedSkill.type);
      }
    };

    window.addEventListener('keydown', this.keyHandler);
  }

  private selectSkill(skillType: string): void {
    // Call the callback
    if (this.onSkillSelected) {
      this.onSkillSelected(skillType);
    }

    // Close modal
    this.hide();
  }

  public hide(): void {
    // Close HTML modal
    const modal = document.getElementById('skill-modal');
    if (modal) {
      modal.classList.remove('show');
    }

    // Clean up keyboard handler
    if (this.keyHandler) {
      window.removeEventListener('keydown', this.keyHandler);
      this.keyHandler = null;
    }

    this.skillOptions = [];
  }

  public dispose(): void {
    this.hide();
    this.onSkillSelected = null;
  }
}