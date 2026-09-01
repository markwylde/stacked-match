/**
 * Persisted player progress. Storage is injected rather than reached for, so
 * the core stays DOM-free and the failure paths are directly testable.
 *
 * Every read and write is guarded: a private window, disabled storage, a quota
 * error, or corrupt JSON must all degrade to an in-memory session rather than
 * blocking play.
 */

export const PROGRESS_KEY = 'stacked-match:progress';
export const PROGRESS_VERSION = 2;

export interface Settings {
  readonly installDismissed: boolean;
}

export interface Progress {
  readonly version: number;
  readonly wonLevelIds: readonly string[];
  readonly bestEndlessScore: number;
  /** Lessons already completed or skipped, so they are never repeated. */
  readonly seenLessonIds: readonly string[];
  /** Set when the player dismisses the tutorial; no lesson auto-starts after. */
  readonly tutorialDismissed: boolean;
  readonly settings: Settings;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const emptyProgress = (): Progress => ({
  version: PROGRESS_VERSION,
  wonLevelIds: [],
  bestEndlessScore: 0,
  seenLessonIds: [],
  tutorialDismissed: false,
  settings: { installDismissed: false },
});

const isProgress = (value: unknown): value is Progress => {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<Progress>;
  return (
    candidate.version === PROGRESS_VERSION &&
    Array.isArray(candidate.wonLevelIds) &&
    candidate.wonLevelIds.every((id) => typeof id === 'string') &&
    typeof candidate.bestEndlessScore === 'number' &&
    Array.isArray(candidate.seenLessonIds) &&
    candidate.seenLessonIds.every((id) => typeof id === 'string') &&
    typeof candidate.tutorialDismissed === 'boolean' &&
    typeof candidate.settings === 'object' &&
    candidate.settings !== null
  );
};

/** Never throws. Unreadable, corrupt, or outdated data yields a fresh record. */
export const loadProgress = (storage: StorageLike | null): Progress => {
  if (storage === null) return emptyProgress();
  try {
    const raw = storage.getItem(PROGRESS_KEY);
    if (raw === null) return emptyProgress();
    const parsed: unknown = JSON.parse(raw);
    if (!isProgress(parsed)) return emptyProgress();
    return {
      ...emptyProgress(),
      ...parsed,
      settings: { ...emptyProgress().settings, ...parsed.settings },
    };
  } catch {
    return emptyProgress();
  }
};

/** Never throws. Returns whether the write actually landed. */
export const saveProgress = (storage: StorageLike | null, progress: Progress): boolean => {
  if (storage === null) return false;
  try {
    storage.setItem(PROGRESS_KEY, JSON.stringify(progress));
    return true;
  } catch {
    return false;
  }
};

export const withLevelWon = (progress: Progress, levelId: string): Progress =>
  progress.wonLevelIds.includes(levelId)
    ? progress
    : { ...progress, wonLevelIds: [...progress.wonLevelIds, levelId] };

export const withEndlessScore = (progress: Progress, score: number): Progress =>
  score > progress.bestEndlessScore ? { ...progress, bestEndlessScore: score } : progress;

export const withSettings = (progress: Progress, settings: Partial<Settings>): Progress => ({
  ...progress,
  settings: { ...progress.settings, ...settings },
});

export const withLessonSeen = (progress: Progress, lessonId: string): Progress =>
  progress.seenLessonIds.includes(lessonId)
    ? progress
    : { ...progress, seenLessonIds: [...progress.seenLessonIds, lessonId] };

export const withTutorialDismissed = (progress: Progress): Progress =>
  progress.tutorialDismissed ? progress : { ...progress, tutorialDismissed: true };

/** Forgets every lesson, so the how-to-play replay starts from the beginning. */
export const withLessonsReset = (progress: Progress): Progress => ({
  ...progress,
  seenLessonIds: [],
});
