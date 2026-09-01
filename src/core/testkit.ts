import { COLUMNS, DEFAULT_UNDO_GRANT } from './constants.js';
import { step } from './game.js';
import { topOf } from './state.js';
import type { Brick, BrickId, GameState, IconId, StepResult } from './types.js';

/**
 * Builds an exact board from icon names, bottom of each column first, so a
 * scenario can be stated literally rather than searched for in a random deal.
 */
export const buildState = (
  columnIcons: readonly (readonly IconId[])[],
  overrides: Partial<GameState> = {},
): GameState => {
  const padded = [...columnIcons.map((icons) => [...icons])];
  while (padded.length < COLUMNS) padded.push([]);

  const bricks: Record<BrickId, Brick> = {};
  const columns: BrickId[][] = [];
  let nextBrickId = 1;

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
    mode: 'campaign',
    levelId: null,
    themeId: 'test',
    iconTypes: [...new Set(padded.flat())],
    columns,
    bricks,
    tray: [],
    washed: [],
    chain: 0,
    score: 0,
    status: 'playing',
    lossReason: null,
    triplesCleared: 0,
    triplesSinceRise: 0,
    undosRemaining: DEFAULT_UNDO_GRANT,
    undoStack: [],
    rng: 1,
    nextBrickId,
    ...overrides,
  };
};

/** Selects the top brick of a column. */
export const takeTop = (state: GameState, column: number): StepResult => {
  const brickId = topOf(state, column);
  if (brickId === undefined) throw new Error(`column ${column} is empty`);
  return step(state, { type: 'select', brickId });
};

/** Selects the top of each column in turn, threading state through. */
export const takeSequence = (state: GameState, columns: readonly number[]): GameState =>
  columns.reduce((current, column) => takeTop(current, column).state, state);

export const trayIcons = (state: GameState): IconId[] =>
  state.tray.map((id) => (state.bricks[id] as Brick).icon);

export const columnIcons = (state: GameState, column: number): IconId[] =>
  (state.columns[column] ?? []).map((id) => (state.bricks[id] as Brick).icon);

export const heights = (state: GameState): number[] => state.columns.map((stack) => stack.length);
