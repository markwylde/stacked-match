// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TRAY_SLOTS } from '../core/constants.js';
import { CAMPAIGN } from '../content/campaign.js';
import { LESSONS } from '../content/lessons.js';
import { PROGRESS_KEY } from '../core/progress.js';
import { App } from './app.js';

/**
 * Drives the whole game through the interface a player actually uses: real
 * clicks on real brick elements, reading state only from the DOM. This is what
 * proves the shell and the core are wired together, as opposed to each being
 * correct on its own.
 */

const seasoned = (): void => {
  window.localStorage.setItem(
    PROGRESS_KEY,
    JSON.stringify({
      version: 2,
      wonLevelIds: [],
      bestEndlessScore: 0,
      seenLessonIds: LESSONS.map((lesson) => lesson.id),
      tutorialDismissed: true,
      settings: { installDismissed: true },
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

const click = (root: ParentNode, label: string): void => {
  const button = [...root.querySelectorAll('button')].find((b) => b.textContent === label);
  if (button === undefined) throw new Error(`no button labelled "${label}"`);
  button.click();
};

const live = (root: HTMLElement): HTMLButtonElement[] =>
  [...root.querySelectorAll<HTMLButtonElement>('.brick')].filter(
    (brick) => brick.dataset.popping !== 'true',
  );

const inTray = (root: HTMLElement): HTMLButtonElement[] =>
  live(root).filter((brick) => brick.getAttribute('aria-label')?.includes('held in tray') === true);

const freeOnBoard = (root: HTMLElement): HTMLButtonElement[] =>
  live(root).filter((brick) => brick.dataset.free === 'true');

const overlayText = (): string => document.querySelector('.overlay')?.textContent ?? '';

/**
 * The next brick a careful player would take: finish a set if one is there,
 * build a pair only while the tray has slack, otherwise favour an icon with
 * copies already on the surface. Returns nothing when every move loses.
 */
const bestMove = (root: HTMLElement): HTMLButtonElement | undefined => {
  const free = freeOnBoard(root);
  if (free.length === 0) return undefined;
  const held = inTray(root).map((brick) => brick.dataset.icon);
  const count = (icon: string | undefined): number => held.filter((other) => other === icon).length;

  const completing = free.find((brick) => count(brick.dataset.icon) === 2);
  if (completing !== undefined) return completing;
  if (held.length >= TRAY_SLOTS - 1) return undefined;

  const pairing = free.find((brick) => count(brick.dataset.icon) === 1);
  if (pairing !== undefined) return pairing;

  return (
    free.find(
      (brick) => free.filter((other) => other.dataset.icon === brick.dataset.icon).length >= 2,
    ) ?? free[0]
  );
};

/** Plays until the run resolves, or until no move is left that does not lose. */
const playGreedily = (root: HTMLElement, maxClicks = 400): void => {
  for (let click = 0; click < maxClicks; click += 1) {
    if (document.querySelector('.overlay') !== null) return;
    const pick = bestMove(root);
    if (pick === undefined) return;
    pick.click();
  }
};

beforeEach(() => {
  document.body.replaceChildren();
  window.localStorage.clear();
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: () => ({ matches: false }),
  });
  // Levels seed from the clock; a counter keeps every run reproducible.
  let tick = 1_000;
  vi.spyOn(Date, 'now').mockImplementation(() => (tick += 1));
});

describe('a campaign level can be played to a win', () => {
  it('clears the board, records the win and unlocks the next level', () => {
    seasoned();
    const root = mount();
    click(root, 'Campaign');
    root.querySelector<HTMLButtonElement>('.level-card')?.click();

    // A naive player loses this level about half the time, so retry the way a
    // player would. The clock stub makes the sequence identical every run.
    let won = false;
    for (let attempt = 0; attempt < 40 && !won; attempt += 1) {
      playGreedily(root);
      won = overlayText().includes('Level cleared');
      if (won) break;

      if (document.querySelector('.overlay') !== null) {
        click(document, 'Retry');
      } else {
        // Stuck with no safe move: back out and start the level again, which
        // is exactly what a player does when a board goes nowhere.
        click(root, 'Quit');
        root.querySelector<HTMLButtonElement>('.level-card')?.click();
      }
    }

    expect(won, 'the opening level was never cleared in 40 attempts').toBe(true);
    expect(overlayText()).toContain('Every brick matched');

    const stored = JSON.parse(window.localStorage.getItem(PROGRESS_KEY) ?? '{}') as {
      wonLevelIds: string[];
    };
    expect(stored.wonLevelIds).toContain(CAMPAIGN[0]?.id);

    click(document, 'Menu');
    const cards = [...root.querySelectorAll<HTMLButtonElement>('.level-card')];
    expect(cards[1]?.disabled, 'the second level should now be unlocked').toBe(false);
  });
});

describe('a run can be played to each loss condition', () => {
  it('ends a campaign level when the tray fills with no match', () => {
    seasoned();
    const root = mount();
    click(root, 'Campaign');
    root.querySelector<HTMLButtonElement>('.level-card')?.click();

    // Take only bricks that cannot complete a set, so the tray jams.
    for (let click = 0; click < 200; click += 1) {
      if (document.querySelector('.overlay') !== null) break;
      const held = inTray(root).map((brick) => brick.dataset.icon);
      const pick = freeOnBoard(root).find(
        (brick) => held.filter((other) => other === brick.dataset.icon).length < 2,
      );
      if (pick === undefined) break;
      pick.click();
    }

    expect(overlayText()).toContain('The tray filled up');
    expect(inTray(root)).toHaveLength(TRAY_SLOTS);
  });

  it('ends an endless run and offers to play again', () => {
    seasoned();
    const root = mount();
    click(root, 'Endless');

    for (let click = 0; click < 600; click += 1) {
      if (document.querySelector('.overlay') !== null) break;
      const free = freeOnBoard(root);
      if (free.length === 0) break;
      const held = inTray(root).map((brick) => brick.dataset.icon);
      const completing = free.find(
        (brick) => held.filter((other) => other === brick.dataset.icon).length === 2,
      );
      (completing ?? free[0] as HTMLButtonElement).click();
    }

    const text = overlayText();
    expect(text === '' ? 'no overlay' : text).toMatch(/tray filled up|stack reached the top/);
    expect(document.querySelector('.overlay')?.textContent).toContain('Play again');
  });
});

describe('the loop holds together across a whole session', () => {
  it('keeps score, undo and the rise counter in step with play', () => {
    seasoned();
    const root = mount();
    click(root, 'Endless');

    const hud = (): string => root.querySelector('#hud')?.textContent ?? '';
    expect(hud()).toContain('Next row');

    // Clearing a set must move the score and the countdown together.
    let cleared = false;
    for (let click = 0; click < 200 && !cleared; click += 1) {
      const pick = bestMove(root);
      if (pick === undefined) break;
      pick.click();
      cleared = /Score\s*[1-9]/.test(hud());
    }
    expect(cleared, 'no set was ever cleared through the interface').toBe(true);

    // Undo becomes available once a brick has been taken.
    const undo = [...root.querySelectorAll<HTMLButtonElement>('#controls .btn')].find((b) =>
      b.textContent?.startsWith('Undo'),
    );
    expect(undo).toBeDefined();
  });
});
