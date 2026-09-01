import { buildLessonState, nominatedBrick, type LessonDefinition, type LessonStep } from '../core/lessons.js';
import { isFree } from '../core/state.js';
import type { BrickId, GameState } from '../core/types.js';

/** Why a selection was refused while a lesson is running. */
export type Refusal = 'blocked' | 'not-nominated';

export type SelectionVerdict = 'accept' | Refusal;

/** Shown when the player taps a buried brick, which is the mistake worth making. */
export const BLOCKED_HINT = 'That brick is buried. Only the top brick of a column can be taken.';

/**
 * Holds which lesson is running and which step it is on, and decides whether a
 * selection is the one being taught.
 *
 * It owns no rules and performs no actions. An accepted selection is dispatched
 * by the caller through the ordinary reducer, so a lesson can never produce an
 * outcome that differs from the same tap made in ordinary play.
 */
export class TutorialSession {
  private index = 0;
  private finished = false;

  constructor(readonly lesson: LessonDefinition) {}

  /** The lesson's own authored board. */
  createState(): GameState {
    return buildLessonState(this.lesson);
  }

  get stepIndex(): number {
    return this.index;
  }

  get stepCount(): number {
    return this.lesson.steps.length;
  }

  get currentStep(): LessonStep | null {
    return this.finished ? null : this.lesson.steps[this.index] ?? null;
  }

  /** The caption for the current step, or the outro once every step is done. */
  get caption(): string | null {
    if (this.finished) return null;
    const step = this.currentStep;
    return step === null ? this.lesson.outro : step.caption;
  }

  /** True once every step is done and only the outro remains to acknowledge. */
  get isAtOutro(): boolean {
    return !this.finished && this.index >= this.lesson.steps.length;
  }

  get isFinished(): boolean {
    return this.finished;
  }

  /** The brick this step is asking for: the current top of the named column. */
  nominated(state: GameState): BrickId | undefined {
    const step = this.currentStep;
    return step === null ? undefined : nominatedBrick(state, step);
  }

  /**
   * Decides a selection without changing anything. The caller dispatches on
   * 'accept' and then calls `advance`; every other verdict leaves the board
   * untouched and the lesson on its current step.
   */
  evaluate(state: GameState, brickId: BrickId): SelectionVerdict {
    if (this.currentStep === null) return 'not-nominated';
    if (brickId === this.nominated(state)) return 'accept';
    return isFree(state, brickId) ? 'not-nominated' : 'blocked';
  }

  /** Moves to the next step. Only ever called after an accepted selection. */
  advance(): void {
    if (this.finished) return;
    this.index += 1;
  }

  /** Acknowledges the outro, ending the lesson. */
  finish(): void {
    this.finished = true;
  }
}
