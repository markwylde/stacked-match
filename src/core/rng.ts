/**
 * A small deterministic PRNG (mulberry32). All randomness in the game flows
 * through this so that a run can be reproduced exactly from its seed, which
 * makes generation tests stable and bug reports replayable.
 *
 * Every function is pure: it takes a state and returns the next one.
 */

export type RngState = number;

export interface RngDraw {
  readonly value: number;
  readonly state: RngState;
}

/** Derives a stable numeric seed from a string, so level ids can seed runs. */
export const seedFrom = (text: string): RngState => {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
};

/** Returns a value in [0, 1) and the advanced generator state. */
export const nextRandom = (state: RngState): RngDraw => {
  const advanced = (state + 0x6d2b79f5) | 0;
  let mixed = advanced;
  mixed = Math.imul(mixed ^ (mixed >>> 15), 1 | mixed);
  mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
  const value = ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  return { value, state: advanced };
};

/** Returns an integer in [0, bound) and the advanced generator state. */
export const nextInt = (state: RngState, bound: number): { value: number; state: RngState } => {
  const draw = nextRandom(state);
  return { value: Math.floor(draw.value * bound), state: draw.state };
};

/** Fisher-Yates, returning a new array and the advanced generator state. */
export const shuffle = <T>(
  state: RngState,
  items: readonly T[],
): { value: T[]; state: RngState } => {
  const result = [...items];
  let cursor = state;
  for (let index = result.length - 1; index > 0; index -= 1) {
    const draw = nextInt(cursor, index + 1);
    cursor = draw.state;
    const swap = result[draw.value] as T;
    result[draw.value] = result[index] as T;
    result[index] = swap;
  }
  return { value: result, state: cursor };
};
