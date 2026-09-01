import { describe, expect, it } from 'vitest';
import { MAX_ICON_TYPES, MIN_ICON_TYPES } from '../core/constants.js';
import { createGame } from '../core/game.js';
import { validateLevel } from '../core/levels.js';
import { validateState } from '../core/state.js';
import { THEMES, colourForIcon, iconTypesFor, themeById } from '../themes/themes.js';
import { CAMPAIGN } from './campaign.js';

/** Rough perceptual distance, enough to catch two colours that read alike. */
const distance = (a: string, b: string): number => {
  const parse = (hex: string): [number, number, number] => [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
  const [r1, g1, b1] = parse(a);
  const [r2, g2, b2] = parse(b);
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
};

describe('themes', () => {
  it('ships five themes', () => {
    expect(THEMES).toHaveLength(5);
  });

  it('gives every theme an icon count inside the legible range', () => {
    for (const theme of THEMES) {
      expect(theme.icons.length).toBeGreaterThanOrEqual(MIN_ICON_TYPES);
      expect(theme.icons.length).toBeLessThanOrEqual(MAX_ICON_TYPES);
    }
  });

  it('gives every theme a defined accent that is not one of its palette colours', () => {
    for (const theme of THEMES) {
      expect(theme.accent).toMatch(/^#[0-9a-f]{6}$/i);
      expect(theme.palette).not.toContain(theme.accent);
      // The accent must be visibly apart from every fill colour it sits beside.
      for (const colour of theme.palette) {
        expect(distance(theme.accent, colour)).toBeGreaterThan(60);
      }
    }
  });

  it('gives every theme unique icon ids', () => {
    for (const theme of THEMES) {
      const ids = theme.icons.map((definition) => definition.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('has no two icons in a theme that differ only by fill', () => {
    // Colour is assigned per icon, so two icons sharing a silhouette would be
    // distinguishable only by colour. Comparing geometry catches that.
    for (const theme of THEMES) {
      const silhouettes = theme.icons.map((definition) =>
        definition.shapes.map((shape) => shape.d).join('|'),
      );
      expect(new Set(silhouettes).size).toBe(silhouettes.length);
    }
  });

  it('gives every icon at least one shape and a readable label', () => {
    for (const theme of THEMES) {
      for (const definition of theme.icons) {
        expect(definition.shapes.length).toBeGreaterThan(0);
        expect(definition.label.length).toBeGreaterThan(2);
        for (const shape of definition.shapes) expect(shape.d).toMatch(/^M /);
      }
    }
  });

  it('assigns a palette colour to every icon', () => {
    for (const theme of THEMES) {
      for (const definition of theme.icons) {
        expect(theme.palette).toContain(colourForIcon(theme, definition.id));
      }
    }
  });

  it('refuses to hand out more icon types than a theme owns', () => {
    const theme = themeById('garden');
    expect(() => iconTypesFor(theme, theme.icons.length + 1)).toThrow(/needs/);
  });
});

describe('campaign', () => {
  it('ships ten levels across the five themes', () => {
    expect(CAMPAIGN).toHaveLength(10);
    expect(new Set(CAMPAIGN.map((level) => level.themeId)).size).toBe(5);
  });

  it('gives every level a unique id', () => {
    const ids = CAMPAIGN.map((level) => level.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('passes validation for every level', () => {
    for (const level of CAMPAIGN) {
      const theme = themeById(level.themeId);
      expect(validateLevel(level, theme.icons.length)).toEqual([]);
    }
  });

  it('builds a valid board for every level', () => {
    for (const level of CAMPAIGN) {
      const theme = themeById(level.themeId);
      const state = createGame({
        mode: 'campaign',
        themeId: theme.id,
        iconTypes: iconTypesFor(theme, level.iconTypeCount),
        heights: level.heights,
        seed: level.id,
        levelId: level.id,
        undoGrant: level.undoGrant,
      });
      expect(validateState(state)).toEqual([]);
      expect(state.columns.map((stack) => stack.length)).toEqual([...level.heights]);
      const present = new Set(Object.values(state.bricks).map((brick) => brick.icon));
      expect(present.size).toBe(level.iconTypeCount);
    }
  });

  it('rises in difficulty: bricks up, undos down', () => {
    const totals = CAMPAIGN.map((level) => level.heights.reduce((sum, h) => sum + h, 0));
    expect(totals[0]).toBeLessThan(totals[totals.length - 1] as number);
    expect(CAMPAIGN[0]?.undoGrant).toBeGreaterThan(CAMPAIGN[CAMPAIGN.length - 1]?.undoGrant as number);
  });
});
