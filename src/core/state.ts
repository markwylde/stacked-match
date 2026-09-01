import { CEILING, COLUMNS, TRAY_SLOTS } from './constants.js';
import type { BrickId, GameState, Snapshot } from './types.js';

/** The topmost brick of a column, or undefined when the column is empty. */
export const topOf = (state: GameState, column: number): BrickId | undefined => {
  const stack = state.columns[column];
  return stack === undefined ? undefined : stack[stack.length - 1];
};

/** Every currently selectable brick, one per non-empty column. */
export const freeBricks = (state: GameState): BrickId[] => {
  const result: BrickId[] = [];
  for (let column = 0; column < state.columns.length; column += 1) {
    const top = topOf(state, column);
    if (top !== undefined) result.push(top);
  }
  return result;
};

export const isFree = (state: GameState, brickId: BrickId): boolean => {
  const brick = state.bricks[brickId];
  if (brick === undefined) return false;
  return topOf(state, brick.column) === brickId;
};

export const isWashed = (state: GameState, brickId: BrickId): boolean =>
  state.washed.includes(brickId);

export const bricksRemaining = (state: GameState): number =>
  state.columns.reduce((total, stack) => total + stack.length, 0);

export const isBoardEmpty = (state: GameState): boolean => bricksRemaining(state) === 0;

/** True while a level or endless run is in progress, used to gate SW updates. */
export const isRunActive = (state: GameState | null): boolean =>
  state !== null && state.status === 'playing';

/** Strips the nested undo stack so a state can be pushed as a snapshot. */
export const toSnapshot = (state: GameState): Snapshot => {
  const { undoStack: _ignored, ...rest } = state;
  return rest;
};

export const fromSnapshot = (
  snapshot: Snapshot,
  undoStack: readonly Snapshot[],
): GameState => ({ ...snapshot, undoStack });

/**
 * Structural invariants that must hold after every transition. Returns the
 * list of violations so tests can assert emptiness and report usefully.
 */
export const validateState = (state: GameState): string[] => {
  const problems: string[] = [];
  const seen = new Set<BrickId>();

  if (state.columns.length !== COLUMNS) {
    problems.push(`expected ${COLUMNS} columns, found ${state.columns.length}`);
  }

  state.columns.forEach((stack, column) => {
    if (stack.length > CEILING) {
      problems.push(`column ${column} holds ${stack.length} bricks, above the ceiling of ${CEILING}`);
    }
    for (const id of stack) {
      if (seen.has(id)) problems.push(`brick ${id} appears more than once`);
      seen.add(id);
      const brick = state.bricks[id];
      if (brick === undefined) problems.push(`brick ${id} is on the board but has no record`);
      else if (brick.column !== column) {
        problems.push(`brick ${id} sits in column ${column} but records column ${brick.column}`);
      }
    }
  });

  for (const id of state.tray) {
    if (seen.has(id)) problems.push(`brick ${id} appears more than once`);
    seen.add(id);
    if (state.bricks[id] === undefined) problems.push(`brick ${id} is in the tray but has no record`);
  }

  if (state.tray.length > TRAY_SLOTS) {
    problems.push(`tray holds ${state.tray.length} bricks, above ${TRAY_SLOTS} slots`);
  }

  const tops = new Set(freeBricks(state));
  for (const id of state.washed) {
    if (!tops.has(id)) problems.push(`brick ${id} is washed but is not a column top`);
  }
  if (new Set(state.washed).size !== state.washed.length) {
    problems.push('washed set contains duplicates');
  }

  if (state.chain < 0) problems.push(`chain is negative (${state.chain})`);
  if (state.score < 0) problems.push(`score is negative (${state.score})`);
  if (state.undosRemaining < 0) problems.push(`undos remaining is negative (${state.undosRemaining})`);

  return problems;
};

/**
 * The wash set is defined as "washed and currently topmost". Re-deriving it
 * after every transition makes that invariant true by construction rather
 * than by remembering to clear it at each call site.
 */
export const pruneWashed = (state: GameState): GameState => {
  const tops = new Set(freeBricks(state));
  const kept = state.washed.filter((id) => tops.has(id));
  return kept.length === state.washed.length ? state : { ...state, washed: kept };
};
