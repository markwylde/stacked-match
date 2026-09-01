import { describe, expect, it } from 'vitest';
import { buildLessonState, nominatedBrick, runLesson, validateLesson } from '../core/lessons.js';
import { step } from '../core/game.js';
import { isFree, validateState } from '../core/state.js';
import { themeById } from '../themes/themes.js';
import { LESSONS, lessonsFor } from './lessons.js';

const iconsOf = (themeId: string): string[] =>
  themeById(themeId).icons.map((definition) => definition.id);

describe('lesson content', () => {
  it('covers every rule the game has', () => {
    const ids = LESSONS.map((lesson) => lesson.id);
    expect(ids).toEqual([
      'the-loop',
      'the-tray',
      'the-wash',
      'chains',
      'rising-rows',
      'the-ceiling',
    ]);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('passes validation for every lesson', () => {
    for (const lesson of LESSONS) {
      expect(validateLesson(lesson, iconsOf(lesson.themeId)), lesson.id).toEqual([]);
    }
  });

  it('groups lessons under the trigger that offers them', () => {
    expect(lessonsFor('campaign-first').map((l) => l.id)).toEqual(['the-loop', 'the-tray']);
    expect(lessonsFor('campaign-second').map((l) => l.id)).toEqual(['the-wash', 'chains']);
    expect(lessonsFor('endless-first').map((l) => l.id)).toEqual(['rising-rows', 'the-ceiling']);
  });

  it('never teaches a mechanic the lesson mode cannot produce', () => {
    for (const lesson of LESSONS) {
      const expected = lesson.steps.flatMap((lessonStep) => lessonStep.expect);
      const needsEndless = expected.includes('RowRose') || (lesson.startTriplesSinceRise ?? 0) > 0;
      if (needsEndless) expect(lesson.mode, lesson.id).toBe('endless');
      if (lesson.trigger.startsWith('campaign')) expect(lesson.mode, lesson.id).toBe('campaign');
      if (lesson.trigger === 'endless-first') expect(lesson.mode, lesson.id).toBe('endless');
      // A campaign board never rises, so it can never lose on the ceiling.
      if (lesson.mode === 'campaign') expect(expected, lesson.id).not.toContain('RowRose');
    }
  });
});

describe('every lesson is playable exactly as written', () => {
  for (const lesson of LESSONS) {
    it(`${lesson.id}: every step nominates a brick that is free`, () => {
      let state = buildLessonState(lesson);
      for (const [index, lessonStep] of lesson.steps.entries()) {
        const nominated = nominatedBrick(state, lessonStep);
        expect(nominated, `${lesson.id} step ${index + 1} nominates an empty column`).toBeDefined();
        expect(
          isFree(state, nominated as number),
          `${lesson.id} step ${index + 1} nominates a brick that is not free`,
        ).toBe(true);
        state = step(state, { type: 'select', brickId: nominated as number }).state;
      }
    });

    it(`${lesson.id}: every step produces the outcome its caption claims`, () => {
      const run = runLesson(lesson);
      for (const outcome of run.outcomes) {
        const lessonStep = lesson.steps[outcome.index];
        expect(
          outcome.missing,
          `${lesson.id} step ${outcome.index + 1} ("${lessonStep?.caption}") promised ` +
            `${lessonStep?.expect.join(', ')} but produced ${outcome.events.join(', ') || 'nothing'}`,
        ).toEqual([]);
        if (lessonStep?.expectChain !== undefined) {
          expect(
            outcome.chain,
            `${lesson.id} step ${outcome.index + 1} claims a chain of ${lessonStep.expectChain}`,
          ).toBe(lessonStep.expectChain);
        }
      }
    });

    it(`${lesson.id}: holds every game invariant throughout`, () => {
      const run = runLesson(lesson);
      expect(validateState(run.state)).toEqual([]);
    });
  }

  it('produces the same result as the identical selections made outside a lesson', () => {
    for (const lesson of LESSONS) {
      const viaLesson = runLesson(lesson).state;

      // The same board, driven by hand through the ordinary reducer.
      let byHand = buildLessonState(lesson);
      for (const lessonStep of lesson.steps) {
        const brickId = nominatedBrick(byHand, lessonStep);
        if (brickId === undefined) break;
        byHand = step(byHand, { type: 'select', brickId }).state;
      }

      expect(viaLesson.columns, lesson.id).toEqual(byHand.columns);
      expect(viaLesson.tray, lesson.id).toEqual(byHand.tray);
      expect(viaLesson.washed, lesson.id).toEqual(byHand.washed);
      expect(viaLesson.score, lesson.id).toBe(byHand.score);
      expect(viaLesson.chain, lesson.id).toBe(byHand.chain);
      expect(viaLesson.status, lesson.id).toBe(byHand.status);
    }
  });
});

describe('lesson outcomes match what each lesson promises', () => {
  it('the-loop ends with a set cleared', () => {
    const run = runLesson(LESSONS[0]!);
    expect(run.state.triplesCleared).toBe(1);
    expect(run.state.tray).toHaveLength(0);
  });

  it('the-tray shows slots filling and then being handed back', () => {
    const run = runLesson(LESSONS[1]!);
    // Three unmatched bricks were held before the suns cleared.
    expect(run.outcomes[2]?.events).toEqual(['BrickTaken']);
    expect(run.state.tray).toHaveLength(2);
    expect(run.state.triplesCleared).toBe(1);
  });

  it('the-wash leaves exactly the uncovered bricks washed', () => {
    const run = runLesson(LESSONS[2]!);
    expect(run.state.washed).toHaveLength(3);
    const icons = run.state.washed.map((id) => run.state.bricks[id]?.icon).sort();
    expect(icons).toEqual(['butterfly', 'mushroom', 'snail']);
  });

  it('chains builds to three and pays more than an unchained take', () => {
    const run = runLesson(LESSONS[3]!);
    expect(run.state.chain).toBe(3);
    expect(run.state.score).toBeGreaterThan(100);
  });

  it('rising-rows pushes exactly one row up across every column', () => {
    const run = runLesson(LESSONS[4]!);
    const rose = run.outcomes.at(-1)?.events.includes('RowRose');
    expect(rose).toBe(true);
    for (const stack of run.state.columns) expect(stack.length).toBeGreaterThanOrEqual(1);
    expect(run.state.triplesSinceRise).toBe(0);
  });

  it('the-ceiling ends the run on the ceiling, not on the tray', () => {
    const run = runLesson(LESSONS[5]!);
    expect(run.state.status).toBe('lost');
    expect(run.state.lossReason).toBe('ceiling');
  });
});
