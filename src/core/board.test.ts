import { describe, expect, it } from 'vitest';
import { CEILING, COLUMNS, ENDLESS_START_HEIGHTS, RISE_EVERY_TRIPLES } from './constants.js';
import { buildIconPool, dealBoard, makeRow } from './generate.js';
import { createEndlessGame, createGame, step } from './game.js';
import { bricksRemaining, freeBricks, topOf, validateState } from './state.js';
import { buildState, columnIcons, heights, takeSequence, takeTop } from './testkit.js';
import type { Brick, IconId } from './types.js';

const POOL = Array.from({ length: 14 }, (_, index) => `icon-${index}`);

const counts = (icons: readonly IconId[]): Map<IconId, number> => {
  const map = new Map<IconId, number>();
  for (const icon of icons) map.set(icon, (map.get(icon) ?? 0) + 1);
  return map;
};

describe('board structure', () => {
  it('rests bricks contiguously on the floor with no gaps', () => {
    const state = buildState([['a', 'b', 'c'], ['d'], []]);
    expect(state.columns[0]).toEqual([1, 2, 3]);
    expect(state.columns[1]).toEqual([4]);
    expect(state.columns[2]).toEqual([]);
    expect(validateState(state)).toEqual([]);
  });

  it('records every brick so all of them can be rendered', () => {
    const state = createGame({
      mode: 'campaign',
      themeId: 'garden',
      iconTypes: POOL,
      heights: [7, 8, 8, 8, 8, 6],
      seed: 'visible',
    });
    for (const stack of state.columns) {
      for (const id of stack) expect(state.bricks[id]).toBeDefined();
    }
  });
});

describe('selection legality', () => {
  it('takes the topmost brick of a column', () => {
    const state = buildState([['a', 'b']]);
    const result = takeTop(state, 0);
    expect(result.events[0]).toMatchObject({ type: 'BrickTaken', brickId: 2 });
    expect(result.state.columns[0]).toEqual([1]);
    expect(result.state.tray).toEqual([2]);
  });

  it('rejects a blocked brick and leaves the board unchanged', () => {
    const state = buildState([['a', 'b']]);
    const result = step(state, { type: 'select', brickId: 1 });
    expect(result.events).toEqual([{ type: 'SelectionRejected', brickId: 1, reason: 'blocked' }]);
    expect(result.state).toBe(state);
  });

  it('offers no selectable brick in an empty column', () => {
    const state = buildState([[], ['a']]);
    expect(topOf(state, 0)).toBeUndefined();
    expect(freeBricks(state)).toEqual([1]);
  });
});

describe('gravity', () => {
  it('settles remaining bricks onto the lowest positions', () => {
    const state = buildState([['a', 'b', 'c', 'd']]);
    const after = takeTop(state, 0).state;
    expect(after.columns[0]).toEqual([1, 2, 3]);
    expect(columnIcons(after, 0)).toEqual(['a', 'b', 'c']);
  });

  it('never moves a brick between columns', () => {
    let state = createEndlessGame('ocean', POOL, 31337);
    const origin = new Map<number, number>();
    for (const [column, stack] of state.columns.entries()) {
      for (const id of stack) origin.set(id, column);
    }
    for (let move = 0; move < 40 && state.status === 'playing'; move += 1) {
      state = takeTop(state, move % COLUMNS).state;
      for (const [column, stack] of state.columns.entries()) {
        for (const id of stack) {
          const known = origin.get(id);
          if (known !== undefined) expect(known).toBe(column);
          else origin.set(id, column);
        }
      }
    }
  });
});

describe('generation guarantees', () => {
  it('produces pools whose every icon count is a multiple of three', () => {
    for (let seed = 0; seed < 200; seed += 1) {
      const pool = buildIconPool(seed, POOL, 15);
      expect(pool.value).toHaveLength(45);
      for (const [, count] of counts(pool.value)) expect(count % 3).toBe(0);
      expect(counts(pool.value).size).toBe(POOL.length);
    }
  });

  it('deals boards whose every icon count is a multiple of three', () => {
    for (let seed = 0; seed < 100; seed += 1) {
      const dealt = dealBoard(seed, [7, 8, 8, 8, 8, 6], POOL, 1);
      const icons = Object.values(dealt.bricks).map((brick) => (brick as Brick).icon);
      for (const [, count] of counts(icons)) expect(count % 3).toBe(0);
    }
  });

  it('refuses a silhouette that is not divisible by three', () => {
    expect(() => dealBoard(1, [7, 8, 8, 8, 8, 7], POOL, 1)).toThrow(/not divisible by three/);
  });

  it('refuses a pool too small to show every declared icon type', () => {
    expect(() => buildIconPool(1, POOL, 12)).toThrow(/at least 14 triples/);
  });

  it('builds rising rows from complete triples only', () => {
    for (let seed = 0; seed < 100; seed += 1) {
      const row = makeRow(seed, POOL, COLUMNS, 1);
      expect(row.bricks).toHaveLength(COLUMNS);
      for (const [, count] of counts(row.bricks.map((brick) => brick.icon))) {
        expect(count).toBe(3);
      }
    }
  });
});

describe('shaped campaign boards', () => {
  it('honours the authored per-column heights exactly', () => {
    const shape = [4, 7, 9, 9, 7, 6];
    const state = createGame({
      mode: 'campaign',
      themeId: 'garden',
      iconTypes: POOL,
      heights: shape,
      seed: 'cat',
    });
    expect(heights(state)).toEqual(shape);
    expect(bricksRemaining(state)).toBe(42);
  });

  it('never rises a row during a campaign level', () => {
    let state = buildState([['a'], ['a'], ['a'], ['b'], ['b'], ['b']]);
    state = takeSequence(state, [0, 1, 2, 3, 4, 5]);
    expect(state.triplesCleared).toBe(2);
    expect(bricksRemaining(state)).toBe(0);
  });
});

describe('endless rising rows', () => {
  const endless = (columnIconsList: readonly (readonly IconId[])[]) =>
    buildState(columnIconsList, { mode: 'endless', iconTypes: ['a', 'b', 'c', 'd', 'e', 'f'] });

  it('rises exactly one row on the third triple cleared', () => {
    let state = endless([
      ['a', 'a', 'a'],
      ['b', 'b', 'b'],
      ['c', 'c', 'c'],
      [],
      [],
      [],
    ]);
    const before = heights(state);
    state = takeSequence(state, [0, 0, 0, 1, 1, 1]);
    expect(state.triplesCleared).toBe(2);
    expect(heights(state)).toEqual([0, 0, 3, 0, 0, 0]);

    state = takeSequence(state, [2, 2, 2]);
    expect(state.triplesCleared).toBe(3);
    expect(state.triplesSinceRise).toBe(0);
    // Every column gained exactly one brick from the floor.
    expect(heights(state)).toEqual([1, 1, 1, 1, 1, 1]);
    expect(before).toEqual([3, 3, 3, 0, 0, 0]);
  });

  it('lifts every pre-existing brick by exactly one position', () => {
    let state = endless([
      ['a', 'a', 'a'],
      ['b', 'b', 'b'],
      ['c', 'c', 'c'],
      ['d'],
      [],
      [],
    ]);
    const keeper = state.columns[3]?.[0] as number;
    state = takeSequence(state, [0, 0, 0, 1, 1, 1, 2, 2, 2]);
    expect(state.columns[3]).toHaveLength(2);
    expect(state.columns[3]?.[1]).toBe(keeper);
  });

  it('does not rise from the passage of time, only from clearing', () => {
    const state = endless([['a', 'a', 'a'], ['b'], ['c'], [], [], []]);
    const idle = step(state, { type: 'undo' }).state;
    expect(heights(idle)).toEqual(heights(state));
    expect(idle.triplesSinceRise).toBe(0);
  });

  it('opens endless on the configured silhouette', () => {
    const state = createEndlessGame('ocean', POOL, 5);
    expect(heights(state)).toEqual([...ENDLESS_START_HEIGHTS]);
    expect(new Set(Object.values(state.bricks).map((brick) => (brick as Brick).icon)).size).toBe(12);
  });
});

describe('ceiling', () => {
  const tall = (height: number): IconId[] => Array.from({ length: height }, () => 'z');

  it('ends the run when a rising row would breach the ceiling', () => {
    let state = buildState(
      [
        ['a', 'a', 'a'],
        ['b', 'b', 'b'],
        ['c', 'c', 'c'],
        tall(CEILING),
        [],
        [],
      ],
      { mode: 'endless', iconTypes: ['a', 'b', 'c', 'd', 'e', 'f'] },
    );
    state = takeSequence(state, [0, 0, 0, 1, 1, 1, 2, 2, 2]);
    expect(state.status).toBe('lost');
    expect(state.lossReason).toBe('ceiling');
  });

  it('continues when a rising row fills a column to exactly the ceiling', () => {
    let state = buildState(
      [
        ['a', 'a', 'a'],
        ['b', 'b', 'b'],
        ['c', 'c', 'c'],
        tall(CEILING - 1),
        [],
        [],
      ],
      { mode: 'endless', iconTypes: ['a', 'b', 'c', 'd', 'e', 'f'] },
    );
    state = takeSequence(state, [0, 0, 0, 1, 1, 1, 2, 2, 2]);
    expect(state.status).toBe('playing');
    expect(state.columns[3]).toHaveLength(CEILING);
  });

  it('counts a rise every RISE_EVERY_TRIPLES clears', () => {
    expect(RISE_EVERY_TRIPLES).toBe(3);
  });
});
