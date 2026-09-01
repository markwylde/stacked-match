import {
  CEILING,
  COLUMNS,
  DEFAULT_UNDO_GRANT,
  ENDLESS_ICON_TYPES,
  ENDLESS_START_HEIGHTS,
  RISE_EVERY_TRIPLES,
  TRAY_SLOTS,
  TRIPLE_SCORE,
  chainBonus,
} from './constants.js';
import { dealBoard, makeRow } from './generate.js';
import { seedFrom, shuffle, type RngState } from './rng.js';
import { fromSnapshot, isBoardEmpty, pruneWashed, toSnapshot, topOf } from './state.js';
import type {
  Brick,
  BrickId,
  GameEvent,
  GameState,
  IconId,
  Intent,
  Mode,
  Snapshot,
  StepResult,
  ThemeId,
} from './types.js';

export interface NewGameOptions {
  readonly mode: Mode;
  readonly themeId: ThemeId;
  readonly iconTypes: readonly IconId[];
  readonly heights: readonly number[];
  readonly seed: RngState | string;
  readonly levelId?: string;
  readonly undoGrant?: number;
}

export const createGame = (options: NewGameOptions): GameState => {
  const seed = typeof options.seed === 'string' ? seedFrom(options.seed) : options.seed;
  const dealt = dealBoard(seed, options.heights, options.iconTypes, 1);

  return {
    mode: options.mode,
    levelId: options.levelId ?? null,
    themeId: options.themeId,
    iconTypes: options.iconTypes,
    columns: dealt.columns,
    bricks: dealt.bricks,
    tray: [],
    washed: [],
    chain: 0,
    score: 0,
    status: 'playing',
    lossReason: null,
    triplesCleared: 0,
    triplesSinceRise: 0,
    undosRemaining: options.undoGrant ?? DEFAULT_UNDO_GRANT,
    undoStack: [],
    rng: dealt.rng,
    nextBrickId: dealt.nextBrickId,
  };
};

/**
 * Endless runs open on a fixed silhouette. The theme's icons are shuffled and
 * trimmed to the number the opening board can actually seat, so every declared
 * type is present on screen and each run draws a different selection.
 */
export const createEndlessGame = (
  themeId: ThemeId,
  iconTypes: readonly IconId[],
  seed: RngState | string,
): GameState => {
  const resolved = typeof seed === 'string' ? seedFrom(seed) : seed;
  if (iconTypes.length < ENDLESS_ICON_TYPES) {
    throw new Error(
      `endless needs at least ${ENDLESS_ICON_TYPES} icon types, theme "${themeId}" offers ${iconTypes.length}`,
    );
  }
  const picked = shuffle(resolved, iconTypes);
  return createGame({
    mode: 'endless',
    themeId,
    iconTypes: picked.value.slice(0, ENDLESS_ICON_TYPES),
    heights: ENDLESS_START_HEIGHTS,
    seed: picked.state,
  });
};

/**
 * Keeps bricks of one icon type adjacent, so a pending pair is legible without
 * the player having to scan the tray.
 */
const insertGrouped = (
  tray: readonly BrickId[],
  bricks: Readonly<Record<BrickId, Brick>>,
  brickId: BrickId,
): BrickId[] => {
  const icon = (bricks[brickId] as Brick).icon;
  let lastMatch = -1;
  tray.forEach((id, index) => {
    if ((bricks[id] as Brick).icon === icon) lastMatch = index;
  });
  if (lastMatch === -1) return [...tray, brickId];
  return [...tray.slice(0, lastMatch + 1), brickId, ...tray.slice(lastMatch + 1)];
};

const reject = (
  state: GameState,
  brickId: BrickId,
  reason: 'blocked' | 'not-playing' | 'unknown-brick' | 'tray-full',
): StepResult => ({ state, events: [{ type: 'SelectionRejected', brickId, reason }] });

const select = (state: GameState, brickId: BrickId): StepResult => {
  if (state.status !== 'playing') return reject(state, brickId, 'not-playing');

  const brick = state.bricks[brickId];
  if (brick === undefined) return reject(state, brickId, 'unknown-brick');
  if (topOf(state, brick.column) !== brickId) return reject(state, brickId, 'blocked');

  const events: GameEvent[] = [];
  const snapshot = toSnapshot(state);

  // Take the brick. Gravity is implicit: a column is an array resting on the
  // floor, so removing the last element settles everything beneath it.
  const columns = state.columns.map((stack, column) =>
    column === brick.column ? stack.slice(0, -1) : stack,
  );

  const wasWashed = state.washed.includes(brickId);
  const chain = wasWashed ? state.chain + 1 : 0;
  const bonus = wasWashed ? chainBonus(chain) : 0;

  let next: GameState = {
    ...state,
    columns,
    tray: insertGrouped(state.tray, state.bricks, brickId),
    washed: state.washed.filter((id) => id !== brickId),
    chain,
    score: state.score + bonus,
    undoStack: [...state.undoStack, snapshot],
  };
  events.push({ type: 'BrickTaken', brickId, column: brick.column, chained: wasWashed, chain, bonus });

  // Resolve a completed triple.
  const sameIcon = next.tray.filter((id) => (next.bricks[id] as Brick).icon === brick.icon);
  if (sameIcon.length === 3) {
    const sourceColumns = [...new Set(sameIcon.map((id) => (next.bricks[id] as Brick).column))];
    next = {
      ...next,
      tray: next.tray.filter((id) => !sameIcon.includes(id)),
      score: next.score + TRIPLE_SCORE,
      triplesCleared: next.triplesCleared + 1,
      triplesSinceRise: next.triplesSinceRise + 1,
      // Undo may not reverse a pop, so the whole stack is dropped.
      undoStack: [],
    };
    events.push({ type: 'TriplePopped', icon: brick.icon, brickIds: sameIcon, points: TRIPLE_SCORE });

    // The signature mechanic: wash whatever the pop just exposed.
    const newlyWashed: BrickId[] = [];
    for (const column of sourceColumns) {
      const exposed = topOf(next, column);
      if (exposed !== undefined && !next.washed.includes(exposed) && !newlyWashed.includes(exposed)) {
        newlyWashed.push(exposed);
      }
    }
    if (newlyWashed.length > 0) {
      next = { ...next, washed: [...next.washed, ...newlyWashed] };
      events.push({ type: 'BricksWashed', brickIds: newlyWashed });
    }

    if (next.mode === 'endless' && next.triplesSinceRise >= RISE_EVERY_TRIPLES) {
      const risen = rise(next);
      next = risen.state;
      events.push(...risen.events);
    }
  }

  next = pruneWashed(next);

  if (next.status === 'playing' && next.tray.length >= TRAY_SLOTS) {
    next = { ...next, status: 'lost', lossReason: 'tray' };
    events.push({ type: 'RunLost', reason: 'tray' });
  } else if (next.status === 'playing' && next.mode === 'campaign' && isBoardEmpty(next) && next.tray.length === 0) {
    next = { ...next, status: 'won' };
    events.push({ type: 'LevelWon', score: next.score });
  }

  return { state: next, events };
};

/** Pushes one row up from the floor, or ends the run if it would breach the ceiling. */
const rise = (state: GameState): StepResult => {
  if (state.columns.some((stack) => stack.length + 1 > CEILING)) {
    return {
      state: { ...state, status: 'lost', lossReason: 'ceiling' },
      events: [{ type: 'RunLost', reason: 'ceiling' }],
    };
  }

  const row = makeRow(state.rng, state.iconTypes, COLUMNS, state.nextBrickId);
  const bricks = { ...state.bricks };
  const columns = state.columns.map((stack) => [...stack]);
  for (const brick of row.bricks) {
    bricks[brick.id] = brick;
    (columns[brick.column] as BrickId[]).unshift(brick.id);
  }

  return {
    state: {
      ...state,
      columns,
      bricks,
      rng: row.rng,
      nextBrickId: row.nextBrickId,
      triplesSinceRise: state.triplesSinceRise - RISE_EVERY_TRIPLES,
    },
    events: [{ type: 'RowRose', brickIds: row.bricks.map((brick) => brick.id) }],
  };
};

export const canUndo = (state: GameState): boolean =>
  state.status === 'playing' && state.undoStack.length > 0 && state.undosRemaining > 0;

const undo = (state: GameState): StepResult => {
  if (state.status !== 'playing' || state.undoStack.length === 0) {
    return { state, events: [{ type: 'UndoUnavailable', reason: 'nothing-to-undo' }] };
  }
  if (state.undosRemaining <= 0) {
    return { state, events: [{ type: 'UndoUnavailable', reason: 'exhausted' }] };
  }

  const snapshot = state.undoStack[state.undoStack.length - 1] as Snapshot;
  const restored = fromSnapshot(snapshot, state.undoStack.slice(0, -1));

  // The brick handed back is the one the current tray holds and the restored
  // tray does not. Restoring the whole snapshot also restores the chain, which
  // is why undo cannot leave the chain counter out of step with the board.
  const returned = state.tray.find((id) => !restored.tray.includes(id));

  return {
    state: { ...restored, undosRemaining: snapshot.undosRemaining - 1 },
    events:
      returned === undefined
        ? []
        : [{ type: 'Undone', brickId: returned, column: (state.bricks[returned] as Brick).column }],
  };
};

export const step: (state: GameState, intent: Intent) => StepResult = (state, intent) =>
  intent.type === 'select' ? select(state, intent.brickId) : undo(state);
