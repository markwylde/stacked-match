import { describe, expect, it } from 'vitest';
import { nextInt, nextRandom, seedFrom, shuffle } from './rng.js';

const take = (seed: number, count: number): number[] => {
  const values: number[] = [];
  let state = seed;
  for (let index = 0; index < count; index += 1) {
    const draw = nextRandom(state);
    values.push(draw.value);
    state = draw.state;
  }
  return values;
};

describe('seeded prng', () => {
  it('produces an identical sequence from an identical seed', () => {
    expect(take(12345, 50)).toEqual(take(12345, 50));
  });

  it('diverges for different seeds', () => {
    expect(take(12345, 50)).not.toEqual(take(12346, 50));
  });

  it('stays within [0, 1)', () => {
    for (const value of take(99, 500)) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('bounds integers below the requested bound', () => {
    let state = 7;
    for (let index = 0; index < 500; index += 1) {
      const draw = nextInt(state, 6);
      expect(draw.value).toBeGreaterThanOrEqual(0);
      expect(draw.value).toBeLessThan(6);
      state = draw.state;
    }
  });

  it('shuffles deterministically and preserves the multiset', () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8];
    const a = shuffle(4242, input);
    const b = shuffle(4242, input);
    expect(a.value).toEqual(b.value);
    expect([...a.value].sort()).toEqual(input);
    expect(shuffle(4243, input).value).not.toEqual(a.value);
  });

  it('derives stable seeds from strings', () => {
    expect(seedFrom('level-01')).toBe(seedFrom('level-01'));
    expect(seedFrom('level-01')).not.toBe(seedFrom('level-02'));
  });
});
