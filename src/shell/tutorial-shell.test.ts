// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { CAMPAIGN } from '../content/campaign.js';
import { LESSONS } from '../content/lessons.js';
import { PROGRESS_KEY } from '../core/progress.js';
import { App } from './app.js';
import { BLOCKED_HINT } from './tutorial.js';

const seed = (partial: Record<string, unknown> = {}): void => {
  window.localStorage.setItem(
    PROGRESS_KEY,
    JSON.stringify({
      version: 2,
      wonLevelIds: [],
      bestEndlessScore: 0,
      seenLessonIds: [],
      tutorialDismissed: false,
      settings: { installDismissed: true },
      ...partial,
    }),
  );
};

const mount = (): HTMLElement => {
  document.body.replaceChildren();
  const root = document.createElement('div');
  document.body.appendChild(root);
  new App(root).start();
  return root;
};

const click = (root: HTMLElement, label: string): void => {
  const button = [...root.querySelectorAll('button')].find((b) => b.textContent === label);
  if (button === undefined) throw new Error(`no button labelled "${label}"`);
  button.click();
};

const openCampaignLevel = (root: HTMLElement, index = 0): void => {
  click(root, 'Campaign');
  const cards = [...root.querySelectorAll<HTMLButtonElement>('.level-card')];
  (cards[index] as HTMLButtonElement).click();
};

const coach = (root: HTMLElement): HTMLElement | null => root.querySelector('#coach');
const coachText = (root: HTMLElement): string => coach(root)?.querySelector('#coach-text')?.textContent ?? '';
const nominated = (root: HTMLElement): HTMLButtonElement | null =>
  root.querySelector<HTMLButtonElement>('.brick[data-nominated="true"]');
const bricks = (root: HTMLElement): HTMLButtonElement[] => [
  ...root.querySelectorAll<HTMLButtonElement>('.brick'),
];
const storedProgress = (): Record<string, unknown> =>
  JSON.parse(window.localStorage.getItem(PROGRESS_KEY) ?? '{}') as Record<string, unknown>;

/** Plays whatever lesson is on screen to its end, tapping only what it asks. */
const completeLesson = (root: HTMLElement): void => {
  for (let guard = 0; guard < 40; guard += 1) {
    const target = nominated(root);
    if (target === null) break;
    target.click();
  }
  click(root, 'Continue');
};

beforeEach(() => {
  document.body.replaceChildren();
  window.localStorage.clear();
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: () => ({ matches: false }),
  });
});

describe('lessons are offered when their rule first matters', () => {
  it('teaches the opening lessons before the first campaign level', () => {
    seed();
    const root = mount();
    openCampaignLevel(root);

    expect(coach(root)?.hidden).toBe(false);
    expect(coachText(root)).toBe(LESSONS[0]?.steps[0]?.caption);
    expect(nominated(root)).not.toBeNull();
  });

  it('teaches the wash lessons only on the second level', () => {
    // Level one already cleared and its lessons seen.
    seed({
      wonLevelIds: [CAMPAIGN[0]?.id],
      seenLessonIds: ['the-loop', 'the-tray'],
    });
    const root = mount();
    openCampaignLevel(root, 1);
    expect(coachText(root)).toBe(LESSONS[2]?.steps[0]?.caption);
  });

  it('teaches rising rows on a first endless run', () => {
    seed({ seenLessonIds: ['the-loop', 'the-tray'] });
    const root = mount();
    click(root, 'Endless');
    expect(coachText(root)).toBe(LESSONS[4]?.steps[0]?.caption);
  });

  it('does not teach a player who has seen everything', () => {
    seed({ seenLessonIds: LESSONS.map((lesson) => lesson.id) });
    const root = mount();
    openCampaignLevel(root);
    expect(coach(root)?.hidden).toBe(true);
    expect(nominated(root)).toBeNull();
  });

  it('never starts a lesson partway through a run', () => {
    seed({ seenLessonIds: LESSONS.map((lesson) => lesson.id) });
    const root = mount();
    openCampaignLevel(root);

    for (const brick of bricks(root).slice(0, 6)) brick.click();
    expect(coach(root)?.hidden).toBe(true);
  });
});

describe('a lesson gates on the taught action', () => {
  it('advances only when the nominated brick is tapped', () => {
    seed();
    const root = mount();
    openCampaignLevel(root);

    const first = coachText(root);
    const target = nominated(root) as HTMLButtonElement;
    const wrong = bricks(root).find(
      (brick) => brick !== target && brick.dataset.free === 'true',
    ) as HTMLButtonElement;

    wrong.click();
    expect(coachText(root)).toBe(first);

    target.click();
    expect(coachText(root)).toBe(LESSONS[0]?.steps[1]?.caption);
  });

  it('leaves the board untouched when the wrong brick is tapped', () => {
    seed();
    const root = mount();
    openCampaignLevel(root);

    const before = bricks(root).length;
    const target = nominated(root) as HTMLButtonElement;
    const wrong = bricks(root).find(
      (brick) => brick !== target && brick.dataset.free === 'true',
    ) as HTMLButtonElement;

    wrong.click();
    expect(bricks(root)).toHaveLength(before);
    expect(root.querySelectorAll('.brick[data-nominated="true"]')).toHaveLength(1);
  });

  it('explains why a buried brick cannot be taken', () => {
    seed();
    const root = mount();
    openCampaignLevel(root);

    const buried = bricks(root).find((brick) => brick.dataset.free === 'false');
    expect(buried).toBeDefined();
    (buried as HTMLButtonElement).click();

    expect(coachText(root)).toBe(BLOCKED_HINT);
    expect(coach(root)?.dataset.hint).toBe('true');
    // Still on the same step, board unchanged.
    expect(nominated(root)).not.toBeNull();
  });

  it('reaches an outro and moves on to the next lesson', () => {
    seed();
    const root = mount();
    openCampaignLevel(root);

    for (let guard = 0; guard < 40; guard += 1) {
      const target = nominated(root);
      if (target === null) break;
      target.click();
    }
    expect(coachText(root)).toBe(LESSONS[0]?.outro);

    click(root, 'Continue');
    expect(coachText(root)).toBe(LESSONS[1]?.steps[0]?.caption);
    expect(storedProgress().seenLessonIds).toEqual(['the-loop']);
  });

  it('clears all coaching once the lessons are done and play begins', () => {
    seed();
    const root = mount();
    openCampaignLevel(root);
    completeLesson(root);
    completeLesson(root);

    expect(coach(root)?.hidden).toBe(true);
    expect(nominated(root)).toBeNull();
    expect(root.querySelectorAll('.brick[data-dimmed="true"]')).toHaveLength(0);
    // The real level is now in play, so free bricks are selectable again.
    expect(bricks(root).filter((brick) => brick.tabIndex === 0).length).toBeGreaterThan(1);
  });
});

describe('coaching reaches players who cannot see the spotlight', () => {
  it('names the nominated brick as the one to act on', () => {
    seed();
    const root = mount();
    openCampaignLevel(root);
    expect(nominated(root)?.getAttribute('aria-label')).toContain('tap this brick');
  });

  it('points the nominated brick at the caption', () => {
    seed();
    const root = mount();
    openCampaignLevel(root);
    expect(nominated(root)?.getAttribute('aria-describedby')).toBe('coach-text');
    expect(root.querySelector('#coach-text')).not.toBeNull();
  });

  it('announces caption changes through a live region', () => {
    seed();
    const root = mount();
    openCampaignLevel(root);
    expect(coach(root)?.getAttribute('aria-live')).toBe('polite');
    expect(coach(root)?.getAttribute('role')).toBe('status');
  });

  it('narrows the tab order to the nominated brick alone', () => {
    seed();
    const root = mount();
    openCampaignLevel(root);

    const focusable = bricks(root).filter((brick) => brick.tabIndex === 0);
    expect(focusable).toHaveLength(1);
    expect(focusable[0]).toBe(nominated(root));
  });

  it('completes a whole lesson by keyboard alone', () => {
    seed();
    const root = mount();
    openCampaignLevel(root);

    for (let guard = 0; guard < 40; guard += 1) {
      const focusable = bricks(root).filter((brick) => brick.tabIndex === 0);
      if (focusable.length === 0) break;
      expect(focusable).toHaveLength(1);
      // Activating a focused button is what Enter and Space do.
      (focusable[0] as HTMLButtonElement).click();
    }
    expect(coachText(root)).toBe(LESSONS[0]?.outro);
  });
});

describe('skip and replay', () => {
  it('skips the whole tutorial in one action and starts playing', () => {
    seed();
    const root = mount();
    openCampaignLevel(root);
    click(root, 'Skip tutorial');

    expect(coach(root)?.hidden).toBe(true);
    expect(storedProgress().tutorialDismissed).toBe(true);
    expect(root.querySelector('#hud')?.textContent).toContain('Score');
  });

  it('never offers a lesson again once skipped', () => {
    seed();
    const root = mount();
    openCampaignLevel(root);
    click(root, 'Skip tutorial');
    click(root, 'Quit');
    click(root, 'Back');
    click(root, 'Endless');

    expect(coach(root)?.hidden).toBe(true);
  });

  it('replays every lesson from the menu regardless of what was seen', () => {
    seed({ seenLessonIds: LESSONS.map((lesson) => lesson.id), tutorialDismissed: true });
    const root = mount();
    click(root, 'How to play');

    expect(coachText(root)).toBe(LESSONS[0]?.steps[0]?.caption);
  });

  it('leaves progress untouched when the lessons are replayed', () => {
    seed({
      wonLevelIds: [CAMPAIGN[0]?.id, CAMPAIGN[1]?.id],
      bestEndlessScore: 4200,
      seenLessonIds: LESSONS.map((lesson) => lesson.id),
      tutorialDismissed: true,
    });
    const root = mount();
    click(root, 'How to play');
    click(root, 'Skip tutorial');

    const after = storedProgress();
    expect(after.wonLevelIds).toEqual([CAMPAIGN[0]?.id, CAMPAIGN[1]?.id]);
    expect(after.bestEndlessScore).toBe(4200);
  });

  it('does not repeat a lesson in a later session', () => {
    seed();
    const first = mount();
    openCampaignLevel(first);
    completeLesson(first);
    completeLesson(first);
    expect(storedProgress().seenLessonIds).toEqual(['the-loop', 'the-tray']);

    // A fresh App reading the same stored progress is a later session.
    const second = mount();
    openCampaignLevel(second);
    expect(coach(second)?.hidden).toBe(true);
  });

  it('still teaches an unseen lesson for a mode not yet reached', () => {
    seed({ seenLessonIds: ['the-loop', 'the-tray'] });
    const root = mount();
    click(root, 'Endless');
    expect(coach(root)?.hidden).toBe(false);
    expect(coachText(root)).toBe(LESSONS[4]?.steps[0]?.caption);
  });
});
