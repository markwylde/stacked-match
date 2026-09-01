import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CEILING, COLUMNS, TRAY_SLOTS, TRAY_ROWS } from '../core/constants.js';
import { boardPlacement, computeLayout, toTransform, trayPlacement } from './layout.js';
import { ICON_VIEWBOX } from './brick-view.js';

/** Chrome the play screen spends before the stage gets what is left. */
const CHROME = 146;

const viewports = [
  { name: 'iPhone SE', width: 320, height: 568 },
  { name: 'iPhone 13 mini', width: 375, height: 812 },
  { name: 'iPhone 15', width: 393, height: 852 },
  { name: 'Pixel 7', width: 412, height: 915 },
  { name: 'iPad portrait', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 },
];

describe('portrait layout', () => {
  for (const viewport of viewports) {
    it(`fits the board and all seven slots on ${viewport.name} without scrolling`, () => {
      // The screen is capped at 520px wide and padded, matching the stylesheet.
      const stageWidth = Math.min(viewport.width, 520) - 24;
      const stageHeight = viewport.height - CHROME;
      const layout = computeLayout(stageWidth, stageHeight);

      expect(layout.stageHeight).toBeLessThanOrEqual(stageHeight);
      expect(layout.brick).toBeGreaterThan(0);

      // The whole ten-row board plus the tray strip must be inside the stage.
      const topRow = boardPlacement(layout, 0, CEILING - 1);
      expect(topRow.y).toBeGreaterThanOrEqual(0);
      const lastSlot = trayPlacement(layout, TRAY_SLOTS - 1);
      expect(lastSlot.y + layout.tray).toBeLessThanOrEqual(stageHeight + layout.brick);
      // The tray occupies more than one row and every row must be inside it.
      expect(TRAY_ROWS).toBeGreaterThan(1);
    });
  }

  it('keeps bricks a usable size on a small phone and scales up on a large one', () => {
    const small = computeLayout(296, 422);
    const large = computeLayout(496, 754);
    expect(small.brick).toBeGreaterThanOrEqual(22);
    expect(large.brick).toBeGreaterThan(small.brick);
  });

  it('keeps every column inside the stage width', () => {
    const layout = computeLayout(366, 698);
    const last = boardPlacement(layout, COLUMNS - 1, 0);
    expect(last.x + layout.brick).toBeLessThanOrEqual(366 + 0.01);
  });

  it('centres the board when the stage is wider than the board needs', () => {
    const layout = computeLayout(1000, 700);
    expect(layout.boardOffsetX).toBeGreaterThan(0);
  });
});

describe('positions come from state, not measurement', () => {
  it('stacks rows upward from the floor', () => {
    const layout = computeLayout(366, 698);
    const floor = boardPlacement(layout, 2, 0);
    const above = boardPlacement(layout, 2, 1);
    expect(above.y).toBeLessThan(floor.y);
    expect(above.x).toBe(floor.x);
  });

  it('spaces tray slots evenly and scales a board brick down to fit one', () => {
    const layout = computeLayout(366, 698);
    const first = trayPlacement(layout, 0);
    const second = trayPlacement(layout, 1);
    expect(second.x - first.x).toBeCloseTo(layout.tray + layout.gap, 5);
    expect(first.scale).toBeLessThan(1);
  });

  it('wraps the tray onto a second row', () => {
    const layout = computeLayout(366, 698);
    const first = trayPlacement(layout, 0);
    const wrapped = trayPlacement(layout, 7);
    expect(wrapped.x).toBeCloseTo(first.x, 5);
    expect(wrapped.y).toBeGreaterThan(first.y);
  });

  it('produces a transform string usable directly as a CSS value', () => {
    const layout = computeLayout(366, 698);
    expect(toTransform(boardPlacement(layout, 1, 2))).toMatch(
      /^translate3d\(-?[\d.]+px, -?[\d.]+px, 0\) scale\([\d.]+\)$/,
    );
  });
});

describe('the board reserves only the rows it can use', () => {
  // A phone-sized stage, matching the stylesheet's cap and padding.
  const stage = { width: Math.min(393, 520) - 24, height: 852 - CHROME };

  it('makes bricks bigger on a board that cannot reach the ceiling', () => {
    const sixRow = computeLayout(stage.width, stage.height, 6);
    const fullHeight = computeLayout(stage.width, stage.height, CEILING);
    expect(sixRow.brick).toBeGreaterThan(fullHeight.brick);
  });

  it('leaves no dead space above a short board', () => {
    const layout = computeLayout(stage.width, stage.height, 6);
    // The top row sits at the top of the reserved area, not ten rows up.
    const topRow = boardPlacement(layout, 0, 5);
    expect(topRow.y).toBeCloseTo(layout.boardTop, 5);
  });

  it('anchors the tray to the bottom so it stays in thumb reach', () => {
    const layout = computeLayout(stage.width, stage.height, 4);
    const lastSlot = trayPlacement(layout, TRAY_SLOTS - 1);
    expect(lastSlot.y + layout.tray).toBeCloseTo(stage.height - (layout.brick - layout.tray) / 2, 1);
  });

  it('centres a short board in the room above the tray rather than stranding it', () => {
    const layout = computeLayout(stage.width, stage.height, 3);
    const above = layout.boardTop;
    const below = layout.trayTop - layout.gap * 3 - (layout.boardTop + layout.boardHeight);
    expect(above).toBeGreaterThan(0);
    expect(above).toBeCloseTo(below, 1);
  });

  it('still fits when the full ceiling is reserved', () => {
    const layout = computeLayout(stage.width, stage.height, CEILING);
    expect(layout.stageHeight).toBeLessThanOrEqual(stage.height);
    // A full-height board leaves essentially no room to centre in.
    expect(layout.boardTop).toBeLessThan(layout.gap * 2);
  });

  it('never reserves more rows than the ceiling or fewer than one', () => {
    expect(computeLayout(stage.width, stage.height, 99).rows).toBe(CEILING);
    expect(computeLayout(stage.width, stage.height, 0).rows).toBe(1);
  });

  it('defaults to the ceiling when no row count is given', () => {
    expect(computeLayout(stage.width, stage.height).rows).toBe(CEILING);
  });
});

describe('icons fill their bricks', () => {
  it('sizes the icon to most of the brick face', () => {
    const css = readFileSync(new URL('./styles.css', import.meta.url), 'utf8');
    const rule = css.slice(css.indexOf('.brick svg {'));
    const width = /width:\s*(\d+)%/.exec(rule.slice(0, 160))?.[1];
    expect(Number(width)).toBeGreaterThanOrEqual(70);
  });

  it('hides the coaching bar when it has nothing to say', () => {
    const css = readFileSync(new URL('./styles.css', import.meta.url), 'utf8');
    // `.coach { display: flex }` would otherwise beat the hidden attribute.
    expect(css).toContain('.coach[hidden]');
    const rule = css.slice(css.indexOf('.coach[hidden]'));
    expect(rule.slice(0, 60)).toContain('display: none');
  });
});

describe('coaching presentation', () => {
  const sheet = (): string => readFileSync(new URL('./styles.css', import.meta.url), 'utf8');

  it('distinguishes the nominated brick without relying on colour', () => {
    const rule = sheet().slice(sheet().indexOf(".brick[data-nominated='true'] {"));
    // An outline is a shape change, so it survives colour being stripped.
    expect(rule.slice(0, 200)).toContain('outline:');
  });

  it('dims every other brick by opacity rather than by hue', () => {
    const rule = sheet().slice(sheet().indexOf(".brick[data-dimmed='true'] {"));
    expect(rule.slice(0, 160)).toContain('opacity:');
  });

  it('composes nomination with the wash instead of replacing it', () => {
    const css = sheet();
    const nominated = css.slice(css.indexOf(".brick[data-nominated='true'] {"), css.indexOf('@keyframes nominate'));
    // The wash paints background and box-shadow; nomination must not touch
    // either, or a washed brick would stop looking washed while nominated.
    expect(nominated).not.toContain('background');
    expect(nominated).not.toContain('box-shadow');
  });

  it('drops the nomination pulse under reduced motion but keeps the outline', () => {
    const css = sheet();
    const block = css.slice(css.lastIndexOf('@media (prefers-reduced-motion: reduce)'));
    expect(block).toContain("[data-nominated='true']");
    expect(block).toContain('animation: none');
    expect(block).toContain('outline-width');
  });

  it('lets a long caption wrap rather than clip or scroll the page', () => {
    const css = sheet();
    const rule = css.slice(css.indexOf('.coach-text {'));
    expect(rule.slice(0, 200)).toContain('overflow-wrap: anywhere');
  });
});

describe('motion preferences', () => {
  it('declares a reduced-motion rule that removes travel animation', () => {
    const css = readFileSync(new URL('./styles.css', import.meta.url), 'utf8');
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
    // Under reduced motion the transition duration collapses and only
    // non-travel properties keep transitioning.
    const block = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'));
    expect(block).toContain('--dur: 1ms');
    expect(block).toContain('transition-property: opacity, background, box-shadow');
  });

  it('animates bricks through transform transitions so motion is interruptible', () => {
    const css = readFileSync(new URL('./styles.css', import.meta.url), 'utf8');
    const brickRule = css.slice(css.indexOf('.brick {'), css.indexOf('.brick:disabled'));
    expect(brickRule).toContain('transition:');
    expect(brickRule).toContain('transform var(--dur)');
  });
});

describe('icon framing', () => {
  it('crops the icon viewBox to the artwork instead of its canvas', () => {
    // Every icon is drawn inside roughly 2..22 of a 24-unit canvas, so a
    // 0 0 24 24 viewBox would waste a fifth of every brick on empty margin.
    expect(ICON_VIEWBOX).toBe('2 2 20 20');
    const [x, y, w, h] = ICON_VIEWBOX.split(' ').map(Number);
    expect(x).toBeGreaterThan(0);
    expect(y).toBeGreaterThan(0);
    expect((x as number) + (w as number)).toBeLessThanOrEqual(24);
    expect((y as number) + (h as number)).toBeLessThanOrEqual(24);
  });
});

describe('safe area insets', () => {
  const css = (): string => readFileSync(new URL('./styles.css', import.meta.url), 'utf8');
  const html = (): string => readFileSync(join(process.cwd(), 'index.html'), 'utf8');

  it('opts the viewport into the display cutout area', () => {
    // Without viewport-fit=cover the insets are always zero and the page is
    // letterboxed instead of running edge to edge.
    expect(html()).toContain('viewport-fit=cover');
  });

  it('insets every interactive edge of the play area', () => {
    const rule = css().slice(css().indexOf('.screen {'), css().indexOf('.hud {'));
    for (const side of ['top', 'right', 'bottom', 'left']) {
      expect(rule, `.screen does not inset its ${side}`).toContain(`env(safe-area-inset-${side}`);
    }
  });

  it('lifts the toast clear of the home indicator', () => {
    const rule = css().slice(css().indexOf('.toast {'));
    expect(rule.slice(0, 400)).toContain('env(safe-area-inset-bottom');
  });

  it('keeps the background full-bleed behind the inset content', () => {
    // Only interactive content is inset; the ground still reaches every edge.
    const rule = css().slice(css().indexOf('body {'), css().indexOf('#app {'));
    expect(rule).toContain('background: var(--bg)');
    expect(rule).toContain('padding: 0');
  });
});
