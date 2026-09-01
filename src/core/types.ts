import type { RngState } from './rng.js';

export type BrickId = number;
export type IconId = string;
export type ThemeId = string;
export type Mode = 'campaign' | 'endless';
export type RunStatus = 'playing' | 'won' | 'lost';
export type LossReason = 'tray' | 'ceiling';

/**
 * A brick's column never changes: gravity only settles bricks downward within
 * their own column, and a rising row inserts beneath them. Storing the column
 * on the brick is what lets undo return it to where it came from.
 */
export interface Brick {
  readonly id: BrickId;
  readonly icon: IconId;
  readonly column: number;
}

export interface GameState {
  readonly mode: Mode;
  readonly levelId: string | null;
  readonly themeId: ThemeId;
  /** The icon type pool this level draws on. */
  readonly iconTypes: readonly IconId[];
  /** One array per column, index 0 resting on the floor. */
  readonly columns: readonly (readonly BrickId[])[];
  readonly bricks: Readonly<Record<BrickId, Brick>>;
  /** Held bricks, kept grouped by icon type. */
  readonly tray: readonly BrickId[];
  /** Bricks currently washed. Always a subset of the column tops. */
  readonly washed: readonly BrickId[];
  readonly chain: number;
  readonly score: number;
  readonly status: RunStatus;
  readonly lossReason: LossReason | null;
  readonly triplesCleared: number;
  readonly triplesSinceRise: number;
  readonly undosRemaining: number;
  /**
   * Previous states, newest last. Because reducers never mutate, the previous
   * state is itself a correct snapshot; only the nested stack is stripped.
   */
  readonly undoStack: readonly Snapshot[];
  readonly rng: RngState;
  readonly nextBrickId: BrickId;
}

export type Snapshot = Omit<GameState, 'undoStack'>;

export type Intent = { readonly type: 'select'; readonly brickId: BrickId } | { readonly type: 'undo' };

export type GameEvent =
  | {
      readonly type: 'BrickTaken';
      readonly brickId: BrickId;
      readonly column: number;
      readonly chained: boolean;
      readonly chain: number;
      readonly bonus: number;
    }
  | {
      readonly type: 'SelectionRejected';
      readonly brickId: BrickId;
      readonly reason: 'blocked' | 'not-playing' | 'unknown-brick' | 'tray-full';
    }
  | {
      readonly type: 'TriplePopped';
      readonly icon: IconId;
      readonly brickIds: readonly BrickId[];
      readonly points: number;
    }
  | { readonly type: 'BricksWashed'; readonly brickIds: readonly BrickId[] }
  | { readonly type: 'RowRose'; readonly brickIds: readonly BrickId[] }
  | { readonly type: 'RunLost'; readonly reason: LossReason }
  | { readonly type: 'LevelWon'; readonly score: number }
  | { readonly type: 'Undone'; readonly brickId: BrickId; readonly column: number }
  | { readonly type: 'UndoUnavailable'; readonly reason: 'exhausted' | 'nothing-to-undo' };

export interface StepResult {
  readonly state: GameState;
  readonly events: readonly GameEvent[];
}

/** The reducer surface: a state and an intent produce a new state plus events. */
export type Reducer = (state: GameState, intent: Intent) => StepResult;
