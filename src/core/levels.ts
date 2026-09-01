import { CEILING, COLUMNS, MAX_ICON_TYPES, MIN_ICON_TYPES } from './constants.js';
import type { ThemeId } from './types.js';

/**
 * A campaign level is data, never code: a silhouette expressed as per-column
 * heights, the theme it wears, how many icon types it draws on, and how
 * forgiving it is. New levels need no logic changes.
 */
export interface LevelDefinition {
  readonly id: string;
  readonly name: string;
  readonly themeId: ThemeId;
  /** One height per column, floor upward. */
  readonly heights: readonly number[];
  readonly iconTypeCount: number;
  readonly undoGrant: number;
}

/**
 * Returns the reasons a level is unplayable, empty when it is sound. Levels are
 * authored by hand, so this is what stops a typo reaching a player.
 */
export const validateLevel = (level: LevelDefinition, themeIconCount: number): string[] => {
  const problems: string[] = [];
  const total = level.heights.reduce((sum, height) => sum + height, 0);

  if (level.heights.length !== COLUMNS) {
    problems.push(`${level.id}: expected ${COLUMNS} column heights, found ${level.heights.length}`);
  }
  for (const [column, height] of level.heights.entries()) {
    if (!Number.isInteger(height) || height < 0) {
      problems.push(`${level.id}: column ${column} has a non-integer or negative height`);
    }
    if (height > CEILING) {
      problems.push(`${level.id}: column ${column} is ${height} high, above the ceiling of ${CEILING}`);
    }
  }
  if (total % 3 !== 0) {
    problems.push(`${level.id}: ${total} bricks is not divisible by three, so a brick would be orphaned`);
  }
  if (level.iconTypeCount < MIN_ICON_TYPES || level.iconTypeCount > MAX_ICON_TYPES) {
    problems.push(
      `${level.id}: ${level.iconTypeCount} icon types is outside the ${MIN_ICON_TYPES}-${MAX_ICON_TYPES} range`,
    );
  }
  if (total / 3 < level.iconTypeCount) {
    problems.push(
      `${level.id}: ${total / 3} triples cannot show ${level.iconTypeCount} distinct icon types`,
    );
  }
  if (themeIconCount < level.iconTypeCount) {
    problems.push(
      `${level.id}: theme "${level.themeId}" offers ${themeIconCount} icons, level needs ${level.iconTypeCount}`,
    );
  }
  if (level.undoGrant < 0) problems.push(`${level.id}: undo grant cannot be negative`);

  return problems;
};

/** The first level is always playable; each later one needs its predecessor won. */
export const isLevelUnlocked = (
  levels: readonly LevelDefinition[],
  levelId: string,
  wonLevelIds: readonly string[],
): boolean => {
  const index = levels.findIndex((level) => level.id === levelId);
  if (index <= 0) return index === 0;
  const previous = levels[index - 1] as LevelDefinition;
  return wonLevelIds.includes(previous.id);
};

export const nextLevelAfter = (
  levels: readonly LevelDefinition[],
  levelId: string,
): LevelDefinition | null => {
  const index = levels.findIndex((level) => level.id === levelId);
  if (index === -1 || index + 1 >= levels.length) return null;
  return levels[index + 1] as LevelDefinition;
};
