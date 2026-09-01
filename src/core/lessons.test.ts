import { describe, expect, it } from 'vitest';
import { CEILING, COLUMNS } from './constants.js';
import { buildLessonState, lessonIconTypes, validateLesson, type LessonDefinition } from './lessons.js';
import {
  emptyProgress,
  loadProgress,
  saveProgress,
  withLessonSeen,
  withLessonsReset,
  withTutorialDismissed,
  type StorageLike,
} from './progress.js';
import { columnIcons, heights } from './testkit.js';
import { validateState } from './state.js';

const lesson = (overrides: Partial<LessonDefinition> = {}): LessonDefinition => ({
  id: 'demo',
  title: 'Demo',
  trigger: 'campaign-first',
  mode: 'campaign',
  themeId: 'garden',
  layout: [['leaf'], ['leaf'], ['leaf'], [], [], []],
  steps: [{ column: 0, caption: 'Tap it', expect: ['BrickTaken'] }],
  outro: 'Done',
  ...overrides,
});

const ICONS = ['leaf', 'flower', 'tree', 'sun', 'bee'];

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
    throw new Error('unavailable');
  }
  setItem(): void {
    throw new Error('unavailable');
  }
}

describe('lesson board builder', () => {
  it('builds the authored layout position for position', () => {
    const state = buildLessonState(
      lesson({ layout: [['leaf', 'sun'], ['tree'], [], ['bee', 'bee', 'flower'], [], []] }),
    );
    expect(heights(state)).toEqual([2, 1, 0, 3, 0, 0]);
    expect(columnIcons(state, 0)).toEqual(['leaf', 'sun']);
    expect(columnIcons(state, 1)).toEqual(['tree']);
    expect(columnIcons(state, 3)).toEqual(['bee', 'bee', 'flower']);
    expect(validateState(state)).toEqual([]);
  });

  it('pads a short layout out to the full board width', () => {
    const state = buildLessonState(lesson({ layout: [['leaf']] }));
    expect(state.columns).toHaveLength(COLUMNS);
  });

  it('starts every lesson board in a clean playing state', () => {
    const state = buildLessonState(lesson());
    expect(state.tray).toEqual([]);
    expect(state.washed).toEqual([]);
    expect(state.chain).toBe(0);
    expect(state.score).toBe(0);
    expect(state.status).toBe('playing');
  });

  it('derives the icon type pool from the authored layout', () => {
    expect(lessonIconTypes(lesson({ layout: [['leaf', 'sun'], ['leaf'], [], [], [], []] }))).toEqual([
      'leaf',
      'sun',
    ]);
  });
});

describe('lesson validation', () => {
  it('accepts a sound lesson', () => {
    expect(validateLesson(lesson(), ICONS)).toEqual([]);
  });

  it('rejects a layout with the wrong column count', () => {
    expect(validateLesson(lesson({ layout: [['leaf'], ['leaf']] }), ICONS)).toContainEqual(
      expect.stringContaining(`expected ${COLUMNS} columns`),
    );
  });

  it('rejects a column above the ceiling', () => {
    const tall = Array.from({ length: CEILING + 1 }, () => 'leaf');
    expect(validateLesson(lesson({ layout: [tall, [], [], [], [], []] }), ICONS)).toContainEqual(
      expect.stringContaining('above the ceiling'),
    );
  });

  it('rejects an icon the theme does not have', () => {
    expect(
      validateLesson(lesson({ layout: [['sprocket'], [], [], [], [], []] }), ICONS),
    ).toContainEqual(expect.stringContaining('is not in theme'));
  });

  it('rejects a lesson with no steps', () => {
    expect(validateLesson(lesson({ steps: [] }), ICONS)).toContainEqual(
      expect.stringContaining('at least one step'),
    );
  });

  it('rejects a step naming a column that does not exist', () => {
    expect(
      validateLesson(lesson({ steps: [{ column: 9, caption: 'x', expect: [] }] }), ICONS),
    ).toContainEqual(expect.stringContaining('does not exist'));
  });

  it('rejects a step with no caption', () => {
    expect(
      validateLesson(lesson({ steps: [{ column: 0, caption: '   ', expect: [] }] }), ICONS),
    ).toContainEqual(expect.stringContaining('no caption'));
  });

  it('rejects an empty outro', () => {
    expect(validateLesson(lesson({ outro: '' }), ICONS)).toContainEqual(
      expect.stringContaining('outro is empty'),
    );
  });
});

describe('seen lessons persist', () => {
  it('records a lesson once and survives a reload', () => {
    const storage = new MemoryStorage();
    const progress = withLessonSeen(withLessonSeen(emptyProgress(), 'top-brick'), 'top-brick');
    expect(progress.seenLessonIds).toEqual(['top-brick']);

    saveProgress(storage, progress);
    expect(loadProgress(storage).seenLessonIds).toEqual(['top-brick']);
  });

  it('records the tutorial being dismissed', () => {
    const storage = new MemoryStorage();
    saveProgress(storage, withTutorialDismissed(emptyProgress()));
    expect(loadProgress(storage).tutorialDismissed).toBe(true);
  });

  it('forgets every lesson when the player asks to replay them', () => {
    const seen = withLessonSeen(withLessonSeen(emptyProgress(), 'a'), 'b');
    const reset = withLessonsReset(seen);
    expect(reset.seenLessonIds).toEqual([]);
    // Replaying must not disturb anything else the player has earned.
    expect(reset.wonLevelIds).toEqual(seen.wonLevelIds);
    expect(reset.bestEndlessScore).toBe(seen.bestEndlessScore);
  });

  it('discards a record written by an older schema version', () => {
    const storage = new MemoryStorage();
    storage.setItem(
      'stacked-match:progress',
      JSON.stringify({ version: 1, wonLevelIds: ['garden-1'], bestEndlessScore: 900, settings: {} }),
    );
    expect(loadProgress(storage)).toEqual(emptyProgress());
  });

  it('treats a record missing the lesson fields as outdated', () => {
    const storage = new MemoryStorage();
    storage.setItem(
      'stacked-match:progress',
      JSON.stringify({ version: 2, wonLevelIds: [], bestEndlessScore: 0, settings: {} }),
    );
    expect(loadProgress(storage).seenLessonIds).toEqual([]);
  });

  it('stays playable when storage throws on read and on write', () => {
    const storage = new ThrowingStorage();
    expect(loadProgress(storage).seenLessonIds).toEqual([]);
    expect(loadProgress(storage).tutorialDismissed).toBe(false);
    expect(saveProgress(storage, withLessonSeen(emptyProgress(), 'a'))).toBe(false);
  });
});
