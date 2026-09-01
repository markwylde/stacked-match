import { describe, expect, it } from 'vitest';
import { TRAY_SLOTS } from './constants.js';
import { createEndlessGame, createGame, step } from './game.js';
import { nextInt } from './rng.js';
import { freeBricks, validateState } from './state.js';
import { iconTypesFor, themeById } from '../themes/themes.js';
import { CAMPAIGN } from '../content/campaign.js';
import type { Brick, GameState } from './types.js';

/**
 * A careful but unsophisticated player: complete a triple whenever one is
 * available, build a pair only while the tray has slack, and otherwise favour
 * an icon type with copies near the surface. No lookahead, no undo.
 *
 * This exists to hold the line on winnability. The first playable build could
 * not clear a single level, and nothing in the type system or the structural
 * invariants caught it - only actually playing the boards did. Any future
 * change to board size, tray size or icon type count that makes a level
 * unwinnable now fails here instead of reaching a player.
 */
const play = (start: GameState, seed: number, maxMoves = 4000): GameState => {
  let state = start;
  let rng = seed;

  for (let move = 0; move < maxMoves && state.status === 'playing'; move += 1) {
    const free = freeBricks(state);
    if (free.length === 0) break;

    const iconOf = (id: number): string => (state.bricks[id] as Brick).icon;
    const inTray = (icon: string): number => state.tray.filter((id) => iconOf(id) === icon).length;

    let candidates = free.filter((id) => inTray(iconOf(id)) === 2);
    if (candidates.length === 0) {
      // One slot from full, only a completing move is survivable.
      if (state.tray.length >= TRAY_SLOTS - 1) break;
      candidates = free.filter((id) => inTray(iconOf(id)) === 1);
    }
    if (candidates.length === 0) {
      const clustered = free.filter(
        (id) => free.filter((other) => iconOf(other) === iconOf(id)).length >= 2,
      );
      candidates = clustered.length > 0 ? clustered : free;
    }

    const draw = nextInt(rng, candidates.length);
    rng = draw.state;
    state = step(state, { type: 'select', brickId: candidates[draw.value] as number }).state;
  }
  return state;
};

const startLevel = (level: (typeof CAMPAIGN)[number], seed: number | string): GameState => {
  const theme = themeById(level.themeId);
  return createGame({
    mode: 'campaign',
    themeId: theme.id,
    iconTypes: iconTypesFor(theme, level.iconTypeCount),
    heights: level.heights,
    seed,
    levelId: level.id,
    undoGrant: level.undoGrant,
  });
};

const winRate = (level: (typeof CAMPAIGN)[number], attempts: number): number => {
  let wins = 0;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (play(startLevel(level, `${level.id}:${attempt}`), attempt * 7919 + 13).status === 'won') {
      wins += 1;
    }
  }
  return wins / attempts;
};

describe('every campaign level is winnable', () => {
  for (const level of CAMPAIGN) {
    it(`${level.id} can be cleared`, () => {
      // A naive player with no lookahead and no undo. A human has both, so
      // this rate is a floor on the real experience, not a forecast of it.
      const rate = winRate(level, 60);
      expect(rate, `${level.id} was never cleared in 60 attempts`).toBeGreaterThan(0);
    });
  }

  it('holds every invariant throughout a full playthrough', () => {
    const state = play(startLevel(CAMPAIGN[0] as (typeof CAMPAIGN)[number], 'invariants'), 99);
    expect(validateState(state)).toEqual([]);
  });

  it('gets easier boards early and harder boards late', () => {
    const first = winRate(CAMPAIGN[0] as (typeof CAMPAIGN)[number], 60);
    const last = winRate(CAMPAIGN[CAMPAIGN.length - 1] as (typeof CAMPAIGN)[number], 60);
    expect(first).toBeGreaterThan(last);
  });
});

describe('endless runs end cleanly', () => {
  it('always terminates in a loss with a reason and a score', () => {
    for (let seed = 0; seed < 12; seed += 1) {
      const state = play(
        createEndlessGame('ocean', themeById('ocean').icons.map((definition) => definition.id), seed),
        seed * 31 + 5,
      );
      expect(validateState(state)).toEqual([]);
      if (state.status === 'lost') {
        expect(state.lossReason === 'tray' || state.lossReason === 'ceiling').toBe(true);
      }
      expect(state.status).not.toBe('won');
    }
  });

  it('sustains long runs across many seeds', () => {
    // The harness stops rather than making a knowingly losing move, so a run
    // that ends still 'playing' is the player giving up, not the game jamming.
    // Judged in aggregate: a naive player should often get a long way.
    const icons = themeById('space').icons.map((definition) => definition.id);
    const runs = Array.from({ length: 20 }, (_, seed) =>
      play(createEndlessGame('space', icons, seed), seed * 977 + 3),
    );

    const productive = runs.filter((state) => state.triplesCleared > 0);
    expect(productive.length).toBeGreaterThanOrEqual(runs.length / 2);

    const best = runs.reduce((a, b) => (a.triplesCleared >= b.triplesCleared ? a : b));
    expect(best.triplesCleared).toBeGreaterThanOrEqual(10);
    expect(best.score).toBeGreaterThanOrEqual(best.triplesCleared * 100);

    for (const state of runs) expect(validateState(state)).toEqual([]);
  });
});
