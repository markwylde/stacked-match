import { describe, expect, it } from 'vitest';
import { step } from '../core/game.js';
import { topOf } from '../core/state.js';
import { LESSONS } from '../content/lessons.js';
import type { LessonDefinition } from '../core/lessons.js';
import { BLOCKED_HINT, TutorialSession } from './tutorial.js';

const theLoop = LESSONS[0] as LessonDefinition;

/** Plays a session the way the shell does: evaluate, dispatch, advance. */
const playAccepted = (session: TutorialSession, state = session.createState()) => {
  let current = state;
  while (session.currentStep !== null) {
    const nominated = session.nominated(current) as number;
    expect(session.evaluate(current, nominated)).toBe('accept');
    current = step(current, { type: 'select', brickId: nominated }).state;
    session.advance();
  }
  return current;
};

describe('tutorial session', () => {
  it('starts on the first step with that step’s caption', () => {
    const session = new TutorialSession(theLoop);
    expect(session.stepIndex).toBe(0);
    expect(session.stepCount).toBe(theLoop.steps.length);
    expect(session.caption).toBe(theLoop.steps[0]?.caption);
    expect(session.isFinished).toBe(false);
  });

  it('nominates the top brick of the column its step names', () => {
    const session = new TutorialSession(theLoop);
    const state = session.createState();
    expect(session.nominated(state)).toBe(topOf(state, theLoop.steps[0]?.column as number));
  });

  it('advances one step per accepted selection and ends on the outro', () => {
    const session = new TutorialSession(theLoop);
    playAccepted(session);
    expect(session.isAtOutro).toBe(true);
    expect(session.caption).toBe(theLoop.outro);
    session.finish();
    expect(session.isFinished).toBe(true);
    expect(session.caption).toBeNull();
  });

  it('accepts only the nominated brick', () => {
    const session = new TutorialSession(theLoop);
    const state = session.createState();
    const nominated = session.nominated(state) as number;

    // Another column's top is legal in the game, but not what is being taught.
    const other = topOf(state, 1) as number;
    expect(other).not.toBe(nominated);
    expect(session.evaluate(state, other)).toBe('not-nominated');
    expect(session.evaluate(state, nominated)).toBe('accept');
  });

  it('leaves the board and the step untouched when a selection is refused', () => {
    const session = new TutorialSession(theLoop);
    const state = session.createState();
    const other = topOf(state, 1) as number;

    expect(session.evaluate(state, other)).toBe('not-nominated');
    // Evaluating decides nothing on its own: no dispatch, so no change at all.
    expect(state.tray).toEqual([]);
    expect(session.stepIndex).toBe(0);
    expect(session.caption).toBe(theLoop.steps[0]?.caption);
  });

  it('tells a buried brick apart from a merely wrong one', () => {
    const session = new TutorialSession(theLoop);
    const state = session.createState();
    // Column 0 is ['tree', 'leaf']; the tree underneath cannot be taken at all.
    const buried = state.columns[0]?.[0] as number;
    expect(session.evaluate(state, buried)).toBe('blocked');
    expect(BLOCKED_HINT).toContain('top brick');
  });

  it('never advances on its own', () => {
    const session = new TutorialSession(theLoop);
    const state = session.createState();
    // No dispatch, no advance: nothing about the session moves.
    for (let tick = 0; tick < 100; tick += 1) {
      expect(session.stepIndex).toBe(0);
      expect(session.isAtOutro).toBe(false);
      expect(session.isFinished).toBe(false);
      expect(session.nominated(state)).toBeDefined();
    }
  });

  it('takes no action on the player’s behalf', () => {
    const session = new TutorialSession(theLoop);
    const before = session.createState();
    // Everything the session offers is read-only until the caller dispatches.
    session.nominated(before);
    session.evaluate(before, topOf(before, 0) as number);
    expect(before.tray).toEqual([]);
    expect(before.score).toBe(0);
    expect(before.triplesCleared).toBe(0);
  });

  it('produces the same final state as the same taps outside a lesson', () => {
    for (const lesson of LESSONS) {
      const session = new TutorialSession(lesson);
      const viaSession = playAccepted(session);

      let byHand = session.createState();
      for (const lessonStep of lesson.steps) {
        const brickId = topOf(byHand, lessonStep.column);
        if (brickId === undefined) break;
        byHand = step(byHand, { type: 'select', brickId }).state;
      }
      expect(viaSession.columns, lesson.id).toEqual(byHand.columns);
      expect(viaSession.score, lesson.id).toBe(byHand.score);
      expect(viaSession.status, lesson.id).toBe(byHand.status);
    }
  });

  it('runs every authored lesson to its outro', () => {
    for (const lesson of LESSONS) {
      const session = new TutorialSession(lesson);
      playAccepted(session);
      expect(session.isAtOutro, lesson.id).toBe(true);
    }
  });
});
