import { CEILING, COLUMNS, DEFAULT_UNDO_GRANT, RISE_EVERY_TRIPLES } from './constants.js';
import { step } from './game.js';
import { topOf } from './state.js';
import type {
  Brick,
  BrickId,
  GameEvent,
  GameState,
  IconId,
  Mode,
  ThemeId,
} from './types.js';

export type GameEventType = GameEvent['type'];

/** When a lesson is offered. Checked once, at level or run creation. */
export type LessonTrigger = 'campaign-first' | 'campaign-second' | 'endless-first';

/**
 * One taught action.
 *
 * A step nominates a column rather than an individual brick: the only legal
 * action in the game is taking a column's top, so the column fully identifies
 * the action, and it stays correct as bricks are removed and rows rise.
 *
 * `expect` is the contract that stops a caption from lying. Whatever outcome
 * the caption claims must be named here, and the lesson harness asserts the
 * rules actually produced it.
 */
export interface LessonStep {
  readonly column: number;
  readonly caption: string;
  readonly expect: readonly GameEventType[];
  /**
   * Chain length this step must produce. Event types alone cannot express a
   * chain, so a caption that claims one declares it here instead.
   */
  readonly expectChain?: number | undefined;
}

/**
 * A lesson is data. Its board is authored brick by brick rather than generated,
 * because a lesson must demonstrate exactly what its captions describe and that
 * cannot be left to a deal.
 */
export interface LessonDefinition {
  readonly id: string;
  readonly title: string;
  readonly trigger: LessonTrigger;
  readonly mode: Mode;
  readonly themeId: ThemeId;
  /** One array per column, floor first. */
  readonly layout: readonly (readonly IconId[])[];
  readonly steps: readonly LessonStep[];
  /**
   * Triples already cleared toward the next rising row. A run genuinely reaches
   * this state, and seeding it lets a lesson show the rise without nine taps of
   * preamble first.
   */
  readonly startTriplesSinceRise?: number | undefined;
  /** Shown once every step is done, before ordinary play resumes. */
  readonly outro: string;
}

/** The icon types a lesson's board uses, in first-seen order. */
export const lessonIconTypes = (lesson: LessonDefinition): IconId[] => [
  ...new Set(lesson.layout.flat()),
];

/**
 * Builds a lesson's board from its authored layout, bypassing the generator.
 * Position for position, the board is what the author wrote.
 */
export const buildLessonState = (lesson: LessonDefinition): GameState => {
  const bricks: Record<BrickId, Brick> = {};
  const columns: BrickId[][] = [];
  let nextBrickId = 1;

  const padded = lesson.layout.map((icons) => [...icons]);
  while (padded.length < COLUMNS) padded.push([]);

  padded.forEach((icons, column) => {
    const stack: BrickId[] = [];
    for (const icon of icons) {
      bricks[nextBrickId] = { id: nextBrickId, icon, column };
      stack.push(nextBrickId);
      nextBrickId += 1;
    }
    columns.push(stack);
  });

  return {
    mode: lesson.mode,
    levelId: null,
    themeId: lesson.themeId,
    iconTypes: lessonIconTypes(lesson),
    columns,
    bricks,
    tray: [],
    washed: [],
    chain: 0,
    score: 0,
    status: 'playing',
    lossReason: null,
    triplesCleared: 0,
    triplesSinceRise: lesson.startTriplesSinceRise ?? 0,
    undosRemaining: DEFAULT_UNDO_GRANT,
    undoStack: [],
    rng: 1,
    nextBrickId,
  };
};

/**
 * Structural checks on an authored lesson. Lesson boards bypass the generator's
 * invariants, so these stand in for them; step legality is checked separately by
 * actually running the lesson.
 */
export const validateLesson = (
  lesson: LessonDefinition,
  availableIcons: readonly IconId[],
): string[] => {
  const problems: string[] = [];
  const known = new Set(availableIcons);

  if (lesson.layout.length !== COLUMNS) {
    problems.push(`${lesson.id}: expected ${COLUMNS} columns, found ${lesson.layout.length}`);
  }
  lesson.layout.forEach((icons, column) => {
    if (icons.length > CEILING) {
      problems.push(`${lesson.id}: column ${column} holds ${icons.length} bricks, above the ceiling of ${CEILING}`);
    }
    for (const icon of icons) {
      if (!known.has(icon)) {
        problems.push(`${lesson.id}: icon "${icon}" is not in theme "${lesson.themeId}"`);
      }
    }
  });

  if (lesson.steps.length === 0) {
    problems.push(`${lesson.id}: a lesson must have at least one step`);
  }
  lesson.steps.forEach((lessonStep, index) => {
    if (!Number.isInteger(lessonStep.column) || lessonStep.column < 0 || lessonStep.column >= COLUMNS) {
      problems.push(`${lesson.id}: step ${index + 1} names column ${lessonStep.column}, which does not exist`);
    }
    if (lessonStep.caption.trim().length === 0) {
      problems.push(`${lesson.id}: step ${index + 1} has no caption`);
    }
  });

  const seeded = lesson.startTriplesSinceRise ?? 0;
  if (!Number.isInteger(seeded) || seeded < 0 || seeded >= RISE_EVERY_TRIPLES) {
    problems.push(
      `${lesson.id}: startTriplesSinceRise of ${seeded} is not a state a run reaches (0 to ${RISE_EVERY_TRIPLES - 1})`,
    );
  }
  if (seeded > 0 && lesson.mode !== 'endless') {
    problems.push(`${lesson.id}: only an endless run accumulates triples toward a rising row`);
  }

  if (lesson.outro.trim().length === 0) problems.push(`${lesson.id}: outro is empty`);

  return problems;
};

export interface LessonStepOutcome {
  readonly index: number;
  readonly column: number;
  /** The brick the step nominated: the column's top at that moment. */
  readonly nominated: BrickId | undefined;
  readonly events: readonly GameEventType[];
  readonly missing: readonly GameEventType[];
  readonly chain: number;
}

export interface LessonRun {
  readonly state: GameState;
  readonly outcomes: readonly LessonStepOutcome[];
}

/** The brick a step nominates: the current top of the column it names. */
export const nominatedBrick = (state: GameState, lessonStep: LessonStep): BrickId | undefined =>
  topOf(state, lessonStep.column);

/**
 * Plays a lesson through the real reducer, with no DOM and no tutorial-specific
 * rules. This is what keeps a lesson honest: if a step nominates a brick that is
 * not free, or an outcome a caption claims never occurs, it shows up here.
 */
export const runLesson = (lesson: LessonDefinition): LessonRun => {
  let state = buildLessonState(lesson);
  const outcomes: LessonStepOutcome[] = [];

  lesson.steps.forEach((lessonStep, index) => {
    const nominated = nominatedBrick(state, lessonStep);
    if (nominated === undefined) {
      outcomes.push({
        index,
        column: lessonStep.column,
        nominated: undefined,
        events: [],
        missing: [...lessonStep.expect],
        chain: state.chain,
      });
      return;
    }

    const result = step(state, { type: 'select', brickId: nominated });
    const events = result.events.map((event) => event.type);
    outcomes.push({
      index,
      column: lessonStep.column,
      nominated,
      events,
      missing: lessonStep.expect.filter((expected) => !events.includes(expected)),
      chain: result.state.chain,
    });
    state = result.state;
  });

  return { state, outcomes };
};
