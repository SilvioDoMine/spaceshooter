import { EventBus } from '../core/EventBus';

/**
 * UIManager - Centralized UI update management
 * 
 * Listens to game entity events and updates UI accordingly.
 * Separates business logic from UI concerns.
 */
export class UIManager {
  private eventBus: EventBus;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    // Listen to player stat changes
    this.eventBus.on('player:health-changed', (data: { current: number; max: number }) => {
      this.eventBus.emit('ui:update-health', {
        current: data.current,
        max: data.max
      });
    });

    this.eventBus.on('player:ammo-changed', (data: { current: number; max: number }) => {
      this.eventBus.emit('ui:update-ammo', {
        current: data.current,
        max: data.max
      });
    });

    this.eventBus.on('player:score-changed', (data: { score: number }) => {
      this.eventBus.emit('ui:update-score', {
        score: data.score
      });
    });

    this.eventBus.on('player:level-changed', (data: { level: number; currentXP: number; xpToNext: number; progress: number }) => {
      this.eventBus.emit('ui:update-level', {
        level: data.level,
        currentXP: data.currentXP,
        xpToNext: data.xpToNext,
        progress: data.progress
      });
    });

    this.eventBus.on('player:level-up', (data: { oldLevel: number; newLevel: number; currentXP: number; skillOptions: any[] }) => {
      this.eventBus.emit('ui:level-up-effect', {
        oldLevel: data.oldLevel,
        newLevel: data.newLevel,
        currentXP: data.currentXP
      });
      
      // Show skill selection if there are options available
      if (data.skillOptions && data.skillOptions.length > 0) {
        this.eventBus.emit('ui:show-skill-selection', {
          skillOptions: data.skillOptions
        });
      }
    });

    this.eventBus.on('ui:skill-selected', (data: { skillType: string }) => {
      this.eventBus.emit('player:skill-selected', {
        skillType: data.skillType
      });
    });

    // Listen to game state changes for UI updates
    this.eventBus.on('game:started', () => {
      // Reset UI to initial state
      this.eventBus.emit('ui:reset', {});
    });

    this.eventBus.on('game:over', (data) => {
      // Update final score display
      this.eventBus.emit('ui:game-over', {
        finalScore: data.finalScore,
        stats: data.stats
      });
    });
  }

  public dispose(): void {
    // Event cleanup is handled by EventBus automatically
  }
}