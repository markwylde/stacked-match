import { CEILING, COLUMNS, TRAY_COLUMNS, TRAY_ROWS } from '../core/constants.js';

/**
 * All brick positions are computed from game state and these dimensions, never
 * measured from live geometry. That is what lets an animation be interrupted
 * and re-targeted mid-flight without ever reading a node that is still moving.
 */
export interface Layout {
  readonly gap: number;
  readonly brick: number;
  readonly tray: number;
  /** Rows of board the layout reserves. */
  readonly rows: number;
  readonly boardHeight: number;
  readonly boardOffsetX: number;
  readonly trayOffsetX: number;
  /** Top of the board, centred in the space above the tray. */
  readonly boardTop: number;
  /** Top of the tray, anchored to the bottom of the stage. */
  readonly trayTop: number;
  readonly stageHeight: number;
}

export interface Placement {
  readonly x: number;
  readonly y: number;
  readonly scale: number;
}

const GAP = 6;

/**
 * `rows` is how many rows of board to reserve height for. Reserving the full
 * ceiling on a board that can never reach it wastes the vertical budget twice
 * over: it leaves dead space above the bricks, and it shrinks every brick to
 * fit rows that will never hold anything. A campaign board only ever shrinks,
 * so it reserves its tallest column; only a board that can rise reserves the
 * ceiling.
 */
export const computeLayout = (width: number, height: number, rows = CEILING): Layout => {
  const gap = GAP;
  const reserved = Math.max(1, Math.min(CEILING, Math.ceil(rows)));
  const tray = Math.max(24, (width - gap * (TRAY_COLUMNS - 1)) / TRAY_COLUMNS);

  const fromWidth = (width - gap * (COLUMNS - 1)) / COLUMNS;
  // Board rows plus every tray row and the space between them must fit.
  const trayBlock = tray * TRAY_ROWS + gap * (TRAY_ROWS - 1);
  const available = height - trayBlock - gap * 3;
  const fromHeight = available / reserved - gap;
  const brick = Math.max(24, Math.min(fromWidth, fromHeight));

  const boardWidth = brick * COLUMNS + gap * (COLUMNS - 1);
  const boardHeight = brick * reserved + gap * (reserved - 1);
  const trayWidth = tray * TRAY_COLUMNS + gap * (TRAY_COLUMNS - 1);

  // The tray keeps its place at the bottom so it stays under the thumb, and
  // the board centres in whatever room is left. A short board - a lesson, or a
  // level with low columns - then sits in the middle of the play area instead
  // of stranded at the bottom under an empty screen.
  const trayTop = Math.max(0, height - trayBlock);
  const boardRegion = Math.max(boardHeight, trayTop - gap * 3);

  return {
    gap,
    brick,
    tray,
    rows: reserved,
    boardHeight,
    boardOffsetX: Math.max(0, (width - boardWidth) / 2),
    trayOffsetX: Math.max(0, (width - trayWidth) / 2),
    boardTop: Math.max(0, (boardRegion - boardHeight) / 2),
    trayTop,
    stageHeight: boardHeight + gap * 3 + trayBlock,
  };
};

/** Where a brick sitting at `row` of `column` belongs. */
export const boardPlacement = (layout: Layout, column: number, row: number): Placement => {
  const pitch = layout.brick + layout.gap;
  return {
    x: layout.boardOffsetX + column * pitch,
    y: layout.boardTop + layout.boardHeight - layout.brick - row * pitch,
    scale: 1,
  };
};

/** Where the brick in tray slot `index` belongs, across the tray's rows. */
export const trayPlacement = (layout: Layout, index: number): Placement => {
  const pitch = layout.tray + layout.gap;
  // Bricks are sized for the board, so a tray brick is the same node scaled.
  const scale = layout.tray / layout.brick;
  const inset = (layout.brick - layout.tray) / 2;
  const row = Math.floor(index / TRAY_COLUMNS);
  const column = index % TRAY_COLUMNS;
  return {
    x: layout.trayOffsetX + column * pitch - inset,
    y: layout.trayTop + row * pitch - inset,
    scale,
  };
};

export const toTransform = (placement: Placement): string =>
  `translate3d(${placement.x.toFixed(2)}px, ${placement.y.toFixed(2)}px, 0) scale(${placement.scale.toFixed(4)})`;
