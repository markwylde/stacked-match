import { describe, expect, it } from 'vitest';
import { CHAIN_BONUS_STEP, TRIPLE_SCORE, chainBonus } from './constants.js';
import { createEndlessGame, createGame } from './game.js';
import { freeBricks, isWashed, validateState } from './state.js';
import { buildState, columnIcons, takeSequence, takeTop, trayIcons } from './testkit.js';
import type { IconId } from './types.js';

const POOL = Array.from({ length: 14 }, (_, index) => `icon-${index}`);

/** Three columns each capped with 'a' over a distinct brick beneath. */
const threeSources = () =>
  buildState([
    ['x', 'a'],
    ['y', 'a'],
    ['z', 'a'],
  ]);

const washedIcons = (state: ReturnType<typeof buildState>): IconId[] =>
  state.washed.map((id) => state.bricks[id]?.icon as IconId).sort();

describe('washing on a pop', () => {
  it('washes the newly exposed top of each of three distinct source columns', () => {
    const state = takeSequence(threeSources(), [0, 1, 2]);
    expect(state.triplesCleared).toBe(1);
    expect(washedIcons(state)).toEqual(['x', 'y', 'z']);
    expect(validateState(state)).toEqual([]);
  });

  it('washes nothing for a source column left empty', () => {
    const state = takeSequence(
      buildState([
        ['a'],
        ['y', 'a'],
        ['z', 'a'],
      ]),
      [0, 1, 2],
    );
    expect(state.columns[0]).toEqual([]);
    expect(washedIcons(state)).toEqual(['y', 'z']);
  });

  it('washes a repeated source column exactly once', () => {
    const state = takeSequence(
      buildState([
        ['x', 'a', 'a'],
        ['y', 'a'],
      ]),
      [0, 0, 1],
    );
    expect(state.washed).toHaveLength(2);
    expect(washedIcons(state)).toEqual(['x', 'y']);
  });

  it('emits the wash event listing exactly the bricks washed', () => {
    let state = threeSources();
    state = takeSequence(state, [0, 1]);
    const result = takeTop(state, 2);
    const washEvent = result.events.find((event) => event.type === 'BricksWashed');
    expect((washEvent as { brickIds: readonly number[] }).brickIds).toHaveLength(3);
  });
});

describe('washing is cosmetic', () => {
  it('lets a washed brick still match its own icon type', () => {
    // After the pop, 'x' is washed. It must still form a triple with two
    // ordinary 'x' bricks.
    let state = takeSequence(
      buildState([
        ['x', 'a'],
        ['y', 'a'],
        ['z', 'a'],
        ['x'],
        ['x'],
      ]),
      [0, 1, 2],
    );
    expect(washedIcons(state)).toContain('x');

    state = takeSequence(state, [0, 3, 4]);
    expect(state.triplesCleared).toBe(2);
    expect(state.tray).toHaveLength(0);
  });

  it('does not match two washed bricks of different types', () => {
    let state = takeSequence(threeSources(), [0, 1, 2]);
    state = takeSequence(state, [0, 1]);
    expect(trayIcons(state).sort()).toEqual(['x', 'y']);
    expect(state.triplesCleared).toBe(1);
  });
});

describe('chains', () => {
  it('increments the chain and pays a bonus when a washed brick is taken', () => {
    let state = takeSequence(threeSources(), [0, 1, 2]);
    expect(state.chain).toBe(0);

    const first = takeTop(state, 0);
    expect(first.state.chain).toBe(1);
    expect(first.events[0]).toMatchObject({ type: 'BrickTaken', chained: true, chain: 1, bonus: CHAIN_BONUS_STEP });

    const second = takeTop(first.state, 1);
    expect(second.state.chain).toBe(2);
    expect(second.events[0]).toMatchObject({ chained: true, chain: 2, bonus: CHAIN_BONUS_STEP * 2 });
  });

  it('pays a strictly larger bonus at a higher chain', () => {
    expect(chainBonus(2)).toBeGreaterThan(chainBonus(1));
    expect(chainBonus(3)).toBeGreaterThan(chainBonus(2));
    expect(chainBonus(0)).toBe(0);
  });

  it('resets the chain to zero when an unwashed brick is taken', () => {
    let state = takeSequence(
      buildState([
        ['x', 'a'],
        ['y', 'a'],
        ['z', 'a'],
        ['q'],
      ]),
      [0, 1, 2],
    );
    state = takeTop(state, 0).state;
    expect(state.chain).toBe(1);

    const unwashed = takeTop(state, 3);
    expect(unwashed.state.chain).toBe(0);
    expect(unwashed.events[0]).toMatchObject({ chained: false, chain: 0, bonus: 0 });
  });
});

describe('wash lifecycle', () => {
  it('consumes the wash when the brick is taken', () => {
    let state = takeSequence(threeSources(), [0, 1, 2]);
    const washedId = state.washed[0] as number;
    state = takeTop(state, 0).state;
    expect(isWashed(state, washedId)).toBe(false);
    expect(state.tray).toContain(washedId);
  });

  it('never leaves a washed brick that is not a column top', () => {
    // Floor insertion means a rising row lifts a column without covering its
    // top, so a washed brick is not buried. The invariant is enforced anyway,
    // so the wash set can never drift out of step with the board.
    let state = buildState(
      [
        ['x', 'a', 'a'],
        ['y', 'a'],
        ['b', 'b', 'b'],
        ['c', 'c', 'c'],
        [],
        [],
      ],
      { mode: 'endless', iconTypes: ['a', 'b', 'c', 'x', 'y', 'q'] },
    );
    state = takeSequence(state, [0, 0, 1]);
    expect(state.washed).toHaveLength(2);

    state = takeSequence(state, [2, 2, 2, 3, 3, 3]);
    expect(state.triplesCleared).toBe(3);
    const tops = new Set(freeBricks(state));
    for (const id of state.washed) expect(tops.has(id)).toBe(true);
    expect(validateState(state)).toEqual([]);
  });

  it('keeps a washed top washed across a rising row that lifts beneath it', () => {
    let state = buildState(
      [
        ['x', 'a', 'a'],
        ['y', 'a'],
        ['b', 'b', 'b'],
        ['c', 'c', 'c'],
        [],
        [],
      ],
      { mode: 'endless', iconTypes: ['a', 'b', 'c', 'x', 'y', 'q'] },
    );
    state = takeSequence(state, [0, 0, 1]);
    const washedBefore = [...state.washed].sort();
    state = takeSequence(state, [2, 2, 2, 3, 3, 3]);
    expect(columnIcons(state, 0)).toHaveLength(2);
    expect([...state.washed].sort()).toEqual(expect.arrayContaining(washedBefore));
  });
});

describe('chain is per run', () => {
  it('starts every campaign level at zero chain with nothing washed', () => {
    const state = createGame({
      mode: 'campaign',
      themeId: 'garden',
      iconTypes: POOL,
      heights: [7, 8, 8, 8, 8, 6],
      seed: 'fresh',
    });
    expect(state.chain).toBe(0);
    expect(state.washed).toEqual([]);
  });

  it('starts every endless run at zero chain with nothing washed', () => {
    const state = createEndlessGame('ocean', POOL, 12);
    expect(state.chain).toBe(0);
    expect(state.washed).toEqual([]);
  });

  it('adds the chain bonus on top of the triple score', () => {
    let state = takeSequence(threeSources(), [0, 1, 2]);
    const unchained = state.score;
    expect(unchained).toBe(TRIPLE_SCORE);
    state = takeSequence(state, [0, 1]);
    expect(state.score).toBe(TRIPLE_SCORE + chainBonus(1) + chainBonus(2));
  });
});
