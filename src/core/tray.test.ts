import { describe, expect, it } from 'vitest';
import { TRAY_SLOTS } from './constants.js';
import { buildState, takeSequence, takeTop, trayIcons } from './testkit.js';

describe('tray intake', () => {
  it('occupies one slot per brick taken', () => {
    let state = buildState([['a'], ['b'], ['c']]);
    expect(state.tray).toHaveLength(0);
    state = takeTop(state, 0).state;
    expect(state.tray).toHaveLength(1);
    state = takeTop(state, 1).state;
    expect(state.tray).toHaveLength(2);
    expect(TRAY_SLOTS - state.tray.length).toBe(TRAY_SLOTS - 2);
  });

  it('keeps bricks of one icon type adjacent regardless of arrival order', () => {
    // Arrives a, b, a - the two matching bricks must end up side by side.
    const state = takeSequence(buildState([['a'], ['b'], ['a']]), [0, 1, 2]);
    expect(trayIcons(state)).toEqual(['a', 'a', 'b']);
  });

  it('groups three separate types without interleaving them', () => {
    const state = takeSequence(
      buildState([['a'], ['b'], ['c'], ['a'], ['b'], ['c']]),
      [0, 1, 2, 3, 4, 5],
    );
    expect(trayIcons(state)).toEqual(['a', 'a', 'b', 'b', 'c', 'c']);
  });
});

describe('three of a kind', () => {
  it('pops the triple and frees three slots', () => {
    const state = takeSequence(buildState([['a'], ['a'], ['a']]), [0, 1, 2]);
    expect(state.tray).toHaveLength(0);
    expect(state.triplesCleared).toBe(1);
  });

  it('emits a pop event naming the icon and its three bricks', () => {
    let state = buildState([['a'], ['a'], ['a']]);
    state = takeSequence(state, [0, 1]);
    const result = takeTop(state, 2);
    const popped = result.events.find((event) => event.type === 'TriplePopped');
    expect(popped).toMatchObject({ type: 'TriplePopped', icon: 'a' });
    expect((popped as { brickIds: readonly number[] }).brickIds).toHaveLength(3);
  });

  it('leaves a pair in the tray', () => {
    const state = takeSequence(buildState([['a'], ['a'], ['b']]), [0, 1, 2]);
    expect(trayIcons(state)).toEqual(['a', 'a', 'b']);
    expect(state.triplesCleared).toBe(0);
  });

  it('clears only the completed type and leaves the rest untouched', () => {
    const state = takeSequence(
      buildState([['a'], ['b'], ['a'], ['c'], ['a'], ['d']]),
      [0, 1, 2, 3, 4, 5],
    );
    expect(trayIcons(state)).toEqual(['b', 'c', 'd']);
    expect(state.triplesCleared).toBe(1);
  });
});

describe('tray-full loss', () => {
  // Fourteen distinct icons across six columns, so nothing can ever pop.
  const allDistinct = () =>
    buildState([
      ['a', 'b', 'c'],
      ['d', 'e', 'f'],
      ['g', 'h'],
      ['i', 'j'],
      ['k', 'l'],
      ['m', 'n'],
    ]);
  const drainOrder = [0, 0, 0, 1, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5];

  it('ends the run when the last slot fills without a match', () => {
    const state = takeSequence(allDistinct(), drainOrder);
    expect(state.tray).toHaveLength(TRAY_SLOTS);
    expect(state.status).toBe('lost');
    expect(state.lossReason).toBe('tray');
  });

  it('stays alive right up to the final slot', () => {
    const state = takeSequence(allDistinct(), drainOrder.slice(0, TRAY_SLOTS - 1));
    expect(state.tray).toHaveLength(TRAY_SLOTS - 1);
    expect(state.status).toBe('playing');
  });

  it('continues when the last brick completes a triple', () => {
    // Eleven distinct icons, then three 'a' bricks: the fourteenth completes.
    let state = buildState([
      ['b', 'c', 'd'],
      ['e', 'f', 'g'],
      ['h'],
      ['a', 'j', 'k'],
      ['a', 'l'],
      ['a', 'm'],
    ]);
    state = takeSequence(state, [0, 0, 0, 1, 1, 1, 2, 3, 3, 4, 5]);
    expect(state.tray).toHaveLength(TRAY_SLOTS - 3);
    expect(state.status).toBe('playing');

    state = takeSequence(state, [3, 4]);
    expect(state.tray).toHaveLength(TRAY_SLOTS - 1);
    expect(state.status).toBe('playing');

    state = takeTop(state, 5).state;
    expect(state.status).toBe('playing');
    expect(state.triplesCleared).toBe(1);
    expect(state.tray).toHaveLength(TRAY_SLOTS - 3);
  });

  it('refuses further selections once the run is lost', () => {
    // The last column keeps a spare brick so there is still something to tap.
    let state = buildState([
      ['a', 'b', 'c'],
      ['d', 'e', 'f'],
      ['g', 'h'],
      ['i', 'j'],
      ['k', 'l'],
      ['spare', 'm', 'n'],
    ]);
    state = takeSequence(state, drainOrder);
    expect(state.status).toBe('lost');
    const spare = state.columns[5]?.[0] as number;
    const blocked = takeTop(state, 5);
    expect(blocked.events).toEqual([
      { type: 'SelectionRejected', brickId: spare, reason: 'not-playing' },
    ]);
    expect(blocked.state).toBe(state);
  });
});
