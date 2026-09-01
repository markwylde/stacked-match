/**
 * Every tuning value the game balances on lives here so that difficulty can be
 * retuned without touching a rule. Nothing outside this file should hard-code
 * a board dimension, a pacing threshold, or a score value.
 */

/** Six divides by three, so a rising row is exactly two complete triples. */
export const COLUMNS = 6;

/** Maximum bricks a column may hold. A rise past this ends the run. */
export const CEILING = 10;

/**
 * Hard cap on bricks the player may hold uncommitted.
 *
 * Sized by measurement, not by genre convention. Only one brick per column is
 * ever free, so the player sees six candidates at a time and cannot hunt across
 * the board for a match the way a layered tile game allows. A seven-slot tray
 * jams before a triple can form: a randomised careful player cleared 0% of
 * boards at seven slots, 10% at ten, and 53% at fourteen. Fourteen is where the
 * game becomes winnable while still punishing loose play.
 */
export const TRAY_SLOTS = 14;

/** The tray is laid out as two rows, keeping each slot thumb-sized on a phone. */
export const TRAY_COLUMNS = 7;
export const TRAY_ROWS = TRAY_SLOTS / TRAY_COLUMNS;

/** Triples cleared between rising rows in endless mode. */
export const RISE_EVERY_TRIPLES = 3;

/** Distinct icon types a level may draw on. */
export const MIN_ICON_TYPES = 12;
export const MAX_ICON_TYPES = 18;

/** Points for clearing a triple, before any chain bonus. */
export const TRIPLE_SCORE = 100;

/** Points added per step of an active chain. */
export const CHAIN_BONUS_STEP = 25;

/** Undos granted when a level or run begins, unless a level overrides it. */
export const DEFAULT_UNDO_GRANT = 3;

/** Endless mode starts on this silhouette: 36 bricks, twelve complete triples. */
export const ENDLESS_START_HEIGHTS: readonly number[] = [5, 6, 7, 7, 6, 5];

/**
 * Icon types an endless run draws on. The opening board is twelve triples, so
 * it can seat exactly twelve types with each appearing once; asking for more
 * would leave a declared type absent from the board. Twelve is also the
 * minimum the visual theme requires, so this sits exactly on that floor.
 */
export const ENDLESS_ICON_TYPES = 12;

/**
 * A chain of length `chain` awards this bonus. Strictly increasing, so a
 * longer chain always pays more than a shorter one.
 */
export const chainBonus = (chain: number): number =>
  chain <= 0 ? 0 : CHAIN_BONUS_STEP * chain;
