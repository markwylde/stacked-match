import { describe, expect, it } from 'vitest';
import { CEILING, COLUMNS, TRAY_SLOTS } from './constants.js';
import { createEndlessGame, createGame } from './game.js';
import { bricksRemaining, freeBricks, isRunActive, topOf, validateState } from './state.js';
import { buildState, takeTop } from './testkit.js';

const THEME_ICONS = Array.from({ length: 14 }, (_, index) => `icon-${index}`);

describe('state construction', () => {
  it('builds a valid campaign game from an authored silhouette', () => {
    const state = createGame({
      mode: 'campaign',
      themeId: 'garden',
      iconTypes: THEME_ICONS,
      heights: [7, 8, 8, 8, 8, 6],
      seed: 'level-01',
      levelId: 'level-01',
    });

    expect(validateState(state)).toEqual([]);
    expect(state.columns).toHaveLength(COLUMNS);
    expect(bricksRemaining(state)).toBe(45);
    expect(state.tray).toEqual([]);
    expect(state.washed).toEqual([]);
    expect(state.chain).toBe(0);
    expect(state.status).toBe('playing');
  });

  it('builds a valid endless game', () => {
    const state = createEndlessGame('ocean', THEME_ICONS, 99);
    expect(validateState(state)).toEqual([]);
    expect(state.mode).toBe('endless');
    expect(bricksRemaining(state)).toBe(36);
  });

  it('holds every invariant after a long sequence of selections', () => {
    let state = createEndlessGame('ocean', THEME_ICONS, 4242);
    for (let move = 0; move < 200 && state.status === 'playing'; move += 1) {
      const free = freeBricks(state);
      if (free.length === 0) break;
      const pick = free[move % free.length] as number;
      state = takeTop(state, (state.bricks[pick] as { column: number }).column).state;
      expect(validateState(state)).toEqual([]);
      expect(state.tray.length).toBeLessThanOrEqual(TRAY_SLOTS);
      for (const stack of state.columns) expect(stack.length).toBeLessThanOrEqual(CEILING);
    }
  });

  it('reports the same seed as reproducible', () => {
    const a = createEndlessGame('ocean', THEME_ICONS, 777);
    const b = createEndlessGame('ocean', THEME_ICONS, 777);
    expect(a.columns).toEqual(b.columns);
    expect(a.bricks).toEqual(b.bricks);
  });

  it('detects a state whose washed brick is not a column top', () => {
    const broken = buildState([['a', 'b']], { washed: [1] });
    expect(validateState(broken)).toContain('brick 1 is washed but is not a column top');
  });

  it('reports whether a run is active, which gates service worker updates', () => {
    const state = createEndlessGame('ocean', THEME_ICONS, 1);
    expect(isRunActive(state)).toBe(true);
    expect(isRunActive({ ...state, status: 'lost', lossReason: 'tray' })).toBe(false);
    expect(isRunActive({ ...state, status: 'won' })).toBe(false);
    expect(isRunActive(null)).toBe(false);
  });

  it('exposes the top brick of each column and nothing beneath it', () => {
    const state = buildState([['a', 'b', 'c'], [], ['d']]);
    expect(topOf(state, 0)).toBe(3);
    expect(topOf(state, 1)).toBeUndefined();
    expect(topOf(state, 2)).toBe(4);
    expect(freeBricks(state)).toEqual([3, 4]);
  });
});
