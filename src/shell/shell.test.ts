// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RISE_EVERY_TRIPLES, TRAY_SLOTS } from '../core/constants.js';
import { themeById } from '../themes/themes.js';
import { buildState, takeSequence } from '../core/testkit.js';
import type { BrickId } from '../core/types.js';
import { App } from './app.js';
import { Stage } from './stage.js';
import { applyTheme } from './theme.js';

const GARDEN = themeById('garden');
const ICONS = GARDEN.icons.map((definition) => definition.id);

/** Seeds stored progress, e.g. a returning player who has seen the tutorial. */
const seedProgress = (partial: Record<string, unknown>): void => {
  window.localStorage.setItem(
    'stacked-match:progress',
    JSON.stringify({
      version: 2,
      wonLevelIds: [],
      bestEndlessScore: 0,
      seenLessonIds: [],
      tutorialDismissed: true,
      settings: { installDismissed: true },
      ...partial,
    }),
  );
};

const mount = (): HTMLElement => {
  document.body.replaceChildren();
  const root = document.createElement('div');
  document.body.appendChild(root);
  return root;
};

const stageWith = (onSelect: (id: BrickId) => void = () => {}) => {
  const root = mount();
  const stage = new Stage(root, onSelect);
  stage.setTheme(GARDEN);
  return { root, stage };
};

const bricksIn = (root: HTMLElement): HTMLButtonElement[] =>
  [...root.querySelectorAll<HTMLButtonElement>('.brick')];

const brickFor = (root: HTMLElement, id: number): HTMLButtonElement => {
  const found = root.querySelector<HTMLButtonElement>(`.brick[data-brick-id="${id}"]`);
  if (found === null) throw new Error(`no element for brick ${id}`);
  return found;
};

const pointer = (element: Element, type: string, x: number, y: number): void => {
  element.dispatchEvent(
    new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y }),
  );
};

beforeEach(() => {
  document.body.replaceChildren();
  document.documentElement.removeAttribute('style');
  window.localStorage.clear();
});

describe('brick rendering', () => {
  it('renders one focusable button per brick with its icon', () => {
    const { root, stage } = stageWith();
    const state = buildState([[ICONS[0] as string, ICONS[1] as string], [ICONS[2] as string]]);
    stage.render(state);

    expect(bricksIn(root)).toHaveLength(3);
    for (const element of bricksIn(root)) {
      expect(element.tagName).toBe('BUTTON');
      expect(element.querySelector('svg')).not.toBeNull();
      expect(element.querySelector('.icon-fill, .icon-line')).not.toBeNull();
    }
  });

  it('keeps the same DOM node for a brick across state updates', () => {
    const { root, stage } = stageWith();
    let state = buildState([[ICONS[0] as string, ICONS[1] as string], [ICONS[2] as string]]);
    stage.render(state);
    const before = brickFor(root, 1);

    state = takeSequence(state, [0]);
    stage.render(state);
    expect(brickFor(root, 1)).toBe(before);

    stage.render(state);
    expect(brickFor(root, 1)).toBe(before);
  });

  it('marks only the top brick of each column as free and focusable', () => {
    const { root, stage } = stageWith();
    stage.render(buildState([[ICONS[0] as string, ICONS[1] as string], [ICONS[2] as string]]));

    expect(brickFor(root, 1).dataset.free).toBe('false');
    expect(brickFor(root, 1).tabIndex).toBe(-1);
    expect(brickFor(root, 2).dataset.free).toBe('true');
    expect(brickFor(root, 2).tabIndex).toBe(0);
    expect(brickFor(root, 3).tabIndex).toBe(0);
  });

  it('describes a brick to assistive technology by icon, column and wash', () => {
    const { root, stage } = stageWith();
    const state = buildState([[ICONS[0] as string, ICONS[1] as string]], { washed: [2] });
    stage.render(state);

    const label = brickFor(root, 2).getAttribute('aria-label') ?? '';
    expect(label).toContain(GARDEN.icons[1]?.label as string);
    expect(label).toContain('column 1');
    expect(label).toContain('washed');

    const blocked = brickFor(root, 1).getAttribute('aria-label') ?? '';
    expect(blocked).toContain('blocked');
  });

  it('shows the wash state on the element so it is visible, not just announced', () => {
    const { root, stage } = stageWith();
    stage.render(buildState([[ICONS[0] as string, ICONS[1] as string]], { washed: [2] }));
    expect(brickFor(root, 2).dataset.washed).toBe('true');
    expect(brickFor(root, 1).dataset.washed).toBe('false');
  });

  it('renders a slot for every tray position', () => {
    const { root } = stageWith();
    expect(root.querySelectorAll('.slot')).toHaveLength(TRAY_SLOTS);
  });
});

describe('selection input', () => {
  it('selects on a tap', () => {
    const onSelect = vi.fn();
    const { root, stage } = stageWith(onSelect);
    stage.render(buildState([[ICONS[0] as string]]));

    const brick = brickFor(root, 1);
    pointer(brick, 'pointerdown', 100, 100);
    pointer(brick, 'click', 100, 100);
    expect(onSelect).toHaveBeenCalledWith(1);
  });

  it('does not select when the pointer is dragged past the threshold', () => {
    const onSelect = vi.fn();
    const { root, stage } = stageWith(onSelect);
    stage.render(buildState([[ICONS[0] as string]]));

    const brick = brickFor(root, 1);
    pointer(brick, 'pointerdown', 100, 100);
    pointer(brick, 'pointermove', 140, 100);
    pointer(brick, 'click', 140, 100);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('still selects when the pointer moves only a hair', () => {
    const onSelect = vi.fn();
    const { root, stage } = stageWith(onSelect);
    stage.render(buildState([[ICONS[0] as string]]));

    const brick = brickFor(root, 1);
    pointer(brick, 'pointerdown', 100, 100);
    pointer(brick, 'pointermove', 103, 101);
    pointer(brick, 'click', 103, 101);
    expect(onSelect).toHaveBeenCalledWith(1);
  });

  it('resolves rapid successive taps in order, losing none', () => {
    const seen: number[] = [];
    const { root, stage } = stageWith((id) => seen.push(id));
    stage.render(buildState([[ICONS[0] as string], [ICONS[1] as string], [ICONS[2] as string]]));

    for (const id of [1, 2, 3, 2, 1]) {
      const brick = brickFor(root, id);
      pointer(brick, 'pointerdown', 10, 10);
      pointer(brick, 'click', 10, 10);
    }
    expect(seen).toEqual([1, 2, 3, 2, 1]);
  });

  it('activates by keyboard exactly as by tap', () => {
    const onSelect = vi.fn();
    const { root, stage } = stageWith(onSelect);
    stage.render(buildState([[ICONS[0] as string]]));

    // A keyboard Enter on a button dispatches click with no pointer sequence.
    brickFor(root, 1).click();
    expect(onSelect).toHaveBeenCalledWith(1);
  });

  it('nudges a brick that cannot be taken instead of doing nothing', () => {
    const { root, stage } = stageWith();
    stage.render(buildState([[ICONS[0] as string, ICONS[1] as string]]));
    stage.nudge(1);
    expect(brickFor(root, 1).dataset.nudge).toBe('true');
  });
});

describe('theme application', () => {
  it('paints theme tokens and tints the status bar', () => {
    applyTheme(GARDEN);
    const root = document.documentElement;
    expect(root.style.getPropertyValue('--accent')).toBe(GARDEN.accent);
    expect(root.style.getPropertyValue('--bg')).toBe(GARDEN.background);
    expect(document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.content).toBe(
      GARDEN.statusBar,
    );
  });

  it('changes the status bar when the theme changes', () => {
    applyTheme(GARDEN);
    const first = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.content;
    applyTheme(themeById('ocean'));
    const second = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.content;
    expect(second).not.toBe(first);
    expect(second).toBe(themeById('ocean').statusBar);
  });

  it('returns to the default tint outside a level', () => {
    applyTheme(GARDEN);
    applyTheme(null);
    expect(document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.content).toBe('#1b1630');
  });
});

describe('app shell', () => {
  it('opens on the home screen with both modes offered', () => {
    const root = mount();
    new App(root).start();
    const labels = [...root.querySelectorAll('button')].map((button) => button.textContent);
    expect(labels).toContain('Campaign');
    expect(labels).toContain('Endless');
  });

  it('shows the campaign with only the first level unlocked', () => {
    const root = mount();
    new App(root).start();
    [...root.querySelectorAll('button')].find((b) => b.textContent === 'Campaign')?.click();

    const cards = [...root.querySelectorAll<HTMLButtonElement>('.level-card')];
    expect(cards).toHaveLength(10);
    expect(cards[0]?.disabled).toBe(false);
    expect(cards[1]?.disabled).toBe(true);
    expect(cards[1]?.dataset.locked).toBe('true');
  });

  it('starts a level and shows the score, undo count and no rise counter', () => {
    seedProgress({});
    const root = mount();
    new App(root).start();
    [...root.querySelectorAll('button')].find((b) => b.textContent === 'Campaign')?.click();
    root.querySelector<HTMLButtonElement>('.level-card')?.click();

    const hud = root.querySelector('#hud')?.textContent ?? '';
    expect(hud).toContain('Score');
    expect(hud).toContain('Undos');
    // Campaign boards never rise, so no countdown is shown.
    expect(hud).not.toContain('Next row');
    expect(root.querySelectorAll('.brick').length).toBeGreaterThan(30);
  });

  it('counts down to the next rising row in endless mode', () => {
    seedProgress({});
    const root = mount();
    new App(root).start();
    [...root.querySelectorAll('button')].find((b) => b.textContent === 'Endless')?.click();
    const hud = root.querySelector('#hud')?.textContent ?? '';
    expect(hud).toContain('Next row');
    expect(hud).toContain(String(RISE_EVERY_TRIPLES));
  });

  it('disables undo until a brick has been taken', () => {
    seedProgress({});
    const root = mount();
    new App(root).start();
    [...root.querySelectorAll('button')].find((b) => b.textContent === 'Endless')?.click();
    const undo = [...root.querySelectorAll<HTMLButtonElement>('#controls .btn')].find((b) =>
      b.textContent?.startsWith('Undo'),
    );
    expect(undo?.disabled).toBe(true);
  });

  it('keeps playing when browser storage is unavailable', () => {
    const throwing = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
      removeItem: () => {
        throw new Error('blocked');
      },
    };
    Object.defineProperty(window, 'localStorage', { value: throwing, configurable: true });

    const root = mount();
    expect(() => new App(root).start()).not.toThrow();
    expect(root.querySelector('.title')?.textContent).toBe('Stacked Match');
  });
});
