import { describe, expect, it } from 'vitest';
import { CEILING, DEFAULT_UNDO_GRANT, TRIPLE_SCORE, chainBonus } from './constants.js';
import { canUndo, createEndlessGame, step } from './game.js';
import { isLevelUnlocked, nextLevelAfter, validateLevel, type LevelDefinition } from './levels.js';
import {
  emptyProgress,
  loadProgress,
  saveProgress,
  withEndlessScore,
  withLevelWon,
  type Progress,
  type StorageLike,
} from './progress.js';
import { buildState, takeSequence, takeTop, trayIcons } from './testkit.js';

const POOL = Array.from({ length: 14 }, (_, index) => `icon-${index}`);

const level = (id: string, overrides: Partial<LevelDefinition> = {}): LevelDefinition => ({
  id,
  name: id,
  themeId: 'garden',
  heights: [7, 8, 8, 8, 8, 6],
  iconTypeCount: 14,
  undoGrant: 3,
  ...overrides,
});

class MemoryStorage implements StorageLike {
  private readonly map = new Map<string, string>();
  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
}

class ThrowingStorage implements StorageLike {
  getItem(): string | null {
    throw new Error('storage unavailable');
  }
  setItem(): void {
    throw new Error('quota exceeded');
  }
}

describe('campaign resolution', () => {
  it('wins when the board and the tray are both empty', () => {
    const state = takeSequence(
      buildState([['a'], ['a'], ['a'], ['b'], ['b'], ['b']]),
      [0, 1, 2, 3, 4, 5],
    );
    expect(state.status).toBe('won');
    expect(state.columns.every((stack) => stack.length === 0)).toBe(true);
    expect(state.tray).toEqual([]);
  });

  it('emits a win event carrying the final score', () => {
    let state = buildState([['a'], ['a'], ['a']]);
    state = takeSequence(state, [0, 1]);
    const result = takeTop(state, 2);
    expect(result.events).toContainEqual({ type: 'LevelWon', score: TRIPLE_SCORE });
  });

  it('does not win while a brick is still held in the tray', () => {
    const state = takeSequence(buildState([['a'], ['a'], ['a'], ['q']]), [0, 1, 2, 3]);
    expect(state.status).toBe('playing');
    expect(trayIcons(state)).toEqual(['q']);
  });

  it('loses when the tray fills during a campaign level', () => {
    const state = takeSequence(
      buildState([
        ['a', 'b', 'c'],
        ['d', 'e', 'f'],
        ['g', 'h'],
        ['i', 'j'],
        ['k', 'l'],
        ['m', 'n'],
      ]),
      [0, 0, 0, 1, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5],
    );
    expect(state.status).toBe('lost');
    expect(state.lossReason).toBe('tray');
  });
});

describe('endless resolution', () => {
  it('continues and scores while neither loss condition is met', () => {
    const state = takeSequence(
      buildState([['a'], ['a'], ['a']], { mode: 'endless', iconTypes: ['a', 'b', 'c'] }),
      [0, 1, 2],
    );
    expect(state.status).toBe('playing');
    expect(state.score).toBe(TRIPLE_SCORE);
  });

  it('never wins, only ends', () => {
    let state = createEndlessGame('ocean', POOL, 909);
    for (let move = 0; move < 400 && state.status === 'playing'; move += 1) {
      const columns = state.columns
        .map((stack, column) => (stack.length > 0 ? column : -1))
        .filter((column) => column >= 0);
      if (columns.length === 0) break;
      state = takeTop(state, columns[move % columns.length] as number).state;
    }
    expect(state.status).not.toBe('won');
  });

  it('ends on the ceiling and reports the reason', () => {
    const state = takeSequence(
      buildState(
        [
          ['a', 'a', 'a'],
          ['b', 'b', 'b'],
          ['c', 'c', 'c'],
          Array.from({ length: CEILING }, () => 'z'),
        ],
        { mode: 'endless', iconTypes: ['a', 'b', 'c', 'z', 'y', 'x'] },
      ),
      [0, 0, 0, 1, 1, 1, 2, 2, 2],
    );
    expect(state.status).toBe('lost');
    expect(state.lossReason).toBe('ceiling');
  });
});

describe('level progression', () => {
  const levels = [level('l1'), level('l2'), level('l3')];

  it('always allows the first level', () => {
    expect(isLevelUnlocked(levels, 'l1', [])).toBe(true);
  });

  it('unlocks the following level on a first win', () => {
    expect(isLevelUnlocked(levels, 'l2', [])).toBe(false);
    expect(isLevelUnlocked(levels, 'l2', ['l1'])).toBe(true);
  });

  it('keeps a level locked while its predecessor is unwon', () => {
    expect(isLevelUnlocked(levels, 'l3', ['l1'])).toBe(false);
  });

  it('allows replaying a level already won', () => {
    expect(isLevelUnlocked(levels, 'l1', ['l1', 'l2'])).toBe(true);
    expect(isLevelUnlocked(levels, 'l2', ['l1', 'l2'])).toBe(true);
  });

  it('knows what follows a level, and where the campaign ends', () => {
    expect(nextLevelAfter(levels, 'l1')?.id).toBe('l2');
    expect(nextLevelAfter(levels, 'l3')).toBeNull();
  });
});

describe('level validation', () => {
  it('accepts a sound level', () => {
    expect(validateLevel(level('ok'), 15)).toEqual([]);
  });

  it('rejects a silhouette not divisible by three', () => {
    expect(validateLevel(level('bad', { heights: [7, 8, 8, 8, 8, 7] }), 15)).toContainEqual(
      expect.stringContaining('not divisible by three'),
    );
  });

  it('rejects a column above the ceiling', () => {
    expect(validateLevel(level('tall', { heights: [12, 8, 8, 8, 8, 5] }), 15)).toContainEqual(
      expect.stringContaining('above the ceiling'),
    );
  });

  it('rejects an icon type count outside the legible range', () => {
    expect(validateLevel(level('few', { iconTypeCount: 8 }), 15)).toContainEqual(
      expect.stringContaining('outside the 12-18 range'),
    );
  });

  it('rejects a board too small to show its declared icon types', () => {
    expect(
      validateLevel(level('small', { heights: [6, 6, 6, 6, 6, 6], iconTypeCount: 14 }), 15),
    ).toContainEqual(expect.stringContaining('cannot show 14 distinct icon types'));
  });

  it('rejects a level asking for more icons than its theme owns', () => {
    expect(validateLevel(level('greedy'), 12)).toContainEqual(
      expect.stringContaining('offers 12 icons'),
    );
  });
});

describe('undo', () => {
  it('returns the brick to the top of its column and restores the chain', () => {
    let state = takeSequence(
      buildState([
        ['x', 'a'],
        ['y', 'a'],
        ['z', 'a'],
      ]),
      [0, 1, 2],
    );
    const washedBefore = [...state.washed].sort();

    state = takeTop(state, 0).state;
    expect(state.chain).toBe(1);
    expect(state.tray).toHaveLength(1);

    const undone = step(state, { type: 'undo' });
    expect(undone.state.tray).toHaveLength(0);
    expect(undone.state.chain).toBe(0);
    expect([...undone.state.washed].sort()).toEqual(washedBefore);
    expect(undone.state.undosRemaining).toBe(DEFAULT_UNDO_GRANT - 1);
    expect(undone.events[0]).toMatchObject({ type: 'Undone', column: 0 });
  });

  it('is unavailable after a pop', () => {
    const state = takeSequence(buildState([['a'], ['a'], ['a'], ['q']]), [0, 1, 2]);
    expect(state.triplesCleared).toBe(1);
    expect(canUndo(state)).toBe(false);
    expect(step(state, { type: 'undo' }).events[0]).toMatchObject({
      type: 'UndoUnavailable',
      reason: 'nothing-to-undo',
    });
  });

  it('does nothing and consumes nothing when there is nothing to undo', () => {
    const state = buildState([['a'], ['b']]);
    const result = step(state, { type: 'undo' });
    expect(result.state).toBe(state);
    expect(result.state.undosRemaining).toBe(DEFAULT_UNDO_GRANT);
    expect(result.events[0]).toMatchObject({ reason: 'nothing-to-undo' });
  });

  it('becomes unavailable once the grant is exhausted', () => {
    let state = buildState([['a', 'b', 'c', 'd']], { undosRemaining: 1 });
    state = takeSequence(state, [0, 0]);
    state = step(state, { type: 'undo' }).state;
    expect(state.undosRemaining).toBe(0);

    expect(canUndo(state)).toBe(false);
    const exhausted = step(state, { type: 'undo' });
    expect(exhausted.events[0]).toMatchObject({ type: 'UndoUnavailable', reason: 'exhausted' });
    expect(exhausted.state).toBe(state);
  });
});

describe('scoring', () => {
  it('awards the base value for an unchained triple', () => {
    const state = takeSequence(buildState([['a'], ['a'], ['a']]), [0, 1, 2]);
    expect(state.score).toBe(TRIPLE_SCORE);
  });

  it('scores a chained pop strictly higher than an unchained one', () => {
    // First pop: unchained, exposes washed bricks beneath.
    let state = takeSequence(
      buildState([
        ['a', 'a'],
        ['a', 'a'],
        ['a', 'a'],
      ]),
      [0, 1, 2],
    );
    const unchainedGain = state.score;
    expect(unchainedGain).toBe(TRIPLE_SCORE);

    // Second pop: every brick taken was washed, so each pays a chain bonus.
    state = takeSequence(state, [0, 1, 2]);
    const chainedGain = state.score - unchainedGain;
    expect(chainedGain).toBe(TRIPLE_SCORE + chainBonus(1) + chainBonus(2) + chainBonus(3));
    expect(chainedGain).toBeGreaterThan(TRIPLE_SCORE);
  });
});

describe('progress persistence', () => {
  it('survives a reload', () => {
    const storage = new MemoryStorage();
    expect(saveProgress(storage, withLevelWon(emptyProgress(), 'l1'))).toBe(true);
    const reloaded = loadProgress(storage);
    expect(reloaded.wonLevelIds).toEqual(['l1']);
    expect(isLevelUnlocked([level('l1'), level('l2')], 'l2', reloaded.wonLevelIds)).toBe(true);
  });

  it('records a new best endless score and ignores a worse one', () => {
    let progress = withEndlessScore(emptyProgress(), 1200);
    expect(progress.bestEndlessScore).toBe(1200);
    progress = withEndlessScore(progress, 900);
    expect(progress.bestEndlessScore).toBe(1200);
    progress = withEndlessScore(progress, 1500);
    expect(progress.bestEndlessScore).toBe(1500);
  });

  it('does not duplicate a level already won', () => {
    const progress = withLevelWon(withLevelWon(emptyProgress(), 'l1'), 'l1');
    expect(progress.wonLevelIds).toEqual(['l1']);
  });

  it('stays playable when storage throws on read and on write', () => {
    const storage = new ThrowingStorage();
    expect(() => loadProgress(storage)).not.toThrow();
    expect(loadProgress(storage)).toEqual(emptyProgress());
    expect(saveProgress(storage, emptyProgress())).toBe(false);
  });

  it('stays playable when there is no storage at all', () => {
    expect(loadProgress(null)).toEqual(emptyProgress());
    expect(saveProgress(null, emptyProgress())).toBe(false);
  });

  it('discards corrupt or outdated stored data', () => {
    const storage = new MemoryStorage();
    storage.setItem('stacked-match:progress', 'not json at all');
    expect(loadProgress(storage)).toEqual(emptyProgress());

    storage.setItem('stacked-match:progress', JSON.stringify({ version: 0, wonLevelIds: ['x'] }));
    expect(loadProgress(storage)).toEqual(emptyProgress());
  });

  it('round-trips settings', () => {
    const storage = new MemoryStorage();
    const progress: Progress = {
      ...emptyProgress(),
      settings: { installDismissed: true },
    };
    saveProgress(storage, progress);
    expect(loadProgress(storage).settings.installDismissed).toBe(true);
  });
});
