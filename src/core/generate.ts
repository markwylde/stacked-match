import { shuffle, type RngState } from './rng.js';
import type { Brick, BrickId, IconId } from './types.js';

export interface DealtBoard {
  readonly columns: BrickId[][];
  readonly bricks: Record<BrickId, Brick>;
  readonly rng: RngState;
  readonly nextBrickId: BrickId;
}

/**
 * Builds a flat list of icons made only of complete triples, with every
 * supplied icon type present at least once. Because the list is assembled from
 * triples rather than filtered afterwards, the "counts are multiples of three"
 * invariant holds by construction and no brick can ever be orphaned.
 */
export const buildIconPool = (
  rng: RngState,
  iconTypes: readonly IconId[],
  tripleCount: number,
): { value: IconId[]; state: RngState } => {
  if (iconTypes.length === 0) throw new Error('cannot build a pool with no icon types');
  if (tripleCount < iconTypes.length) {
    throw new Error(
      `need at least ${iconTypes.length} triples to show ${iconTypes.length} icon types, got ${tripleCount}`,
    );
  }
  const flat: IconId[] = [];
  for (let index = 0; index < tripleCount; index += 1) {
    const icon = iconTypes[index % iconTypes.length] as IconId;
    flat.push(icon, icon, icon);
  }
  return shuffle(rng, flat);
};

/** Fills an authored column-height silhouette with a triple-complete pool. */
export const dealBoard = (
  rng: RngState,
  heights: readonly number[],
  iconTypes: readonly IconId[],
  startBrickId: BrickId,
): DealtBoard => {
  const total = heights.reduce((sum, height) => sum + height, 0);
  if (total % 3 !== 0) {
    throw new Error(`board of ${total} bricks is not divisible by three`);
  }
  const pool = buildIconPool(rng, iconTypes, total / 3);

  const columns: BrickId[][] = [];
  const bricks: Record<BrickId, Brick> = {};
  let nextBrickId = startBrickId;
  let cursor = 0;

  heights.forEach((height, column) => {
    const stack: BrickId[] = [];
    for (let index = 0; index < height; index += 1) {
      const icon = pool.value[cursor] as IconId;
      cursor += 1;
      bricks[nextBrickId] = { id: nextBrickId, icon, column };
      stack.push(nextBrickId);
      nextBrickId += 1;
    }
    columns.push(stack);
  });

  return { columns, bricks, rng: pool.state, nextBrickId };
};

/**
 * Builds one rising row: exactly one brick per column, composed of complete
 * triples. This is why the column count must divide by three.
 */
export const makeRow = (
  rng: RngState,
  iconTypes: readonly IconId[],
  columnCount: number,
  startBrickId: BrickId,
): { bricks: Brick[]; rng: RngState; nextBrickId: BrickId } => {
  if (columnCount % 3 !== 0) {
    throw new Error(`a rising row of ${columnCount} columns cannot be made of whole triples`);
  }
  const picked = shuffle(rng, iconTypes);
  const chosen = picked.value.slice(0, columnCount / 3);
  const flat = chosen.flatMap((icon) => [icon, icon, icon]);
  const spread = shuffle(picked.state, flat);

  const bricks: Brick[] = [];
  let nextBrickId = startBrickId;
  for (let column = 0; column < columnCount; column += 1) {
    bricks.push({ id: nextBrickId, icon: spread.value[column] as IconId, column });
    nextBrickId += 1;
  }
  return { bricks, rng: spread.state, nextBrickId };
};
