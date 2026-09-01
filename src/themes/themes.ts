import { CAFE_ICONS, GARDEN_ICONS, KITCHEN_ICONS, OCEAN_ICONS, SPACE_ICONS, type IconDef } from './icons.js';

/**
 * A theme is a coherent icon set plus the colours that dress it. Levels wear
 * one theme each, so the whole screen changes mood as the player progresses.
 *
 * `accent` is reserved for the colour wash and is chosen to sit outside the
 * theme's own palette, so a washed brick reads as washed at a glance.
 */
export interface Theme {
  readonly id: string;
  readonly name: string;
  /** Icon fill colours, assigned to icon types in order. */
  readonly palette: readonly string[];
  /** The wash colour. Never appears in `palette`. */
  readonly accent: string;
  /** Line-art colour drawn over the fills. */
  readonly ink: string;
  /** Brick face and its washed variant. */
  readonly brick: string;
  readonly brickWashed: string;
  /** Page background and the colour the status bar adopts. */
  readonly background: string;
  readonly statusBar: string;
  readonly icons: readonly IconDef[];
}

export const THEMES: readonly Theme[] = [
  {
    id: 'garden',
    name: 'Garden',
    palette: ['#5fbf72', '#8ed081', '#f2c14e', '#e8845f', '#5aa9a3', '#b8d06a'],
    accent: '#ff5fa2',
    ink: '#123024',
    brick: '#f7f4e9',
    brickWashed: '#ffe6f1',
    background: '#101f1a',
    statusBar: '#16302a',
    icons: GARDEN_ICONS,
  },
  {
    id: 'kitchen',
    name: 'Kitchen',
    palette: ['#e0913f', '#d4614a', '#eec170', '#b8703f', '#c9a227', '#e5b7a0'],
    accent: '#3fb8b0',
    ink: '#3a1f14',
    brick: '#fdf3e4',
    brickWashed: '#ddf6f4',
    background: '#241610',
    statusBar: '#33201a',
    icons: KITCHEN_ICONS,
  },
  {
    id: 'ocean',
    name: 'Ocean',
    palette: ['#3aa0c4', '#4fd0c2', '#2e6fa8', '#6fd3e8', '#4a7fbd', '#7ee0c0'],
    accent: '#ff9451',
    ink: '#0b2440',
    brick: '#eef7fb',
    brickWashed: '#ffe9dd',
    background: '#0b1c2e',
    statusBar: '#12293f',
    icons: OCEAN_ICONS,
  },
  {
    id: 'space',
    name: 'Space',
    palette: ['#8b6fe8', '#c47ae0', '#6a7de8', '#a75fd0', '#5f8fe8', '#d68ad4'],
    accent: '#d9f24e',
    ink: '#1a1233',
    brick: '#f3effc',
    brickWashed: '#f7fbdc',
    background: '#161129',
    statusBar: '#1f1838',
    icons: SPACE_ICONS,
  },
  {
    id: 'cafe',
    name: 'Cafe',
    palette: ['#b07a52', '#d9a06b', '#e8c39e', '#a35d4a', '#c98d8d', '#8c6239'],
    accent: '#6fd45f',
    ink: '#33200f',
    brick: '#faf1e6',
    brickWashed: '#e6f8e2',
    background: '#20150e',
    statusBar: '#2d1e15',
    icons: CAFE_ICONS,
  },
];

export const themeById = (id: string): Theme => {
  const found = THEMES.find((theme) => theme.id === id);
  if (found === undefined) throw new Error(`unknown theme "${id}"`);
  return found;
};

/** The icon ids a level draws on, taken in order so a level is reproducible. */
export const iconTypesFor = (theme: Theme, count: number): string[] => {
  if (count > theme.icons.length) {
    throw new Error(`theme "${theme.id}" has ${theme.icons.length} icons, level needs ${count}`);
  }
  return theme.icons.slice(0, count).map((definition) => definition.id);
};

/** Every icon type is assigned a palette colour deterministically. */
export const colourForIcon = (theme: Theme, iconId: string): string => {
  const index = theme.icons.findIndex((definition) => definition.id === iconId);
  const palette = theme.palette;
  return palette[(index < 0 ? 0 : index) % palette.length] as string;
};

export const iconById = (theme: Theme, iconId: string): IconDef => {
  const found = theme.icons.find((definition) => definition.id === iconId);
  if (found === undefined) throw new Error(`theme "${theme.id}" has no icon "${iconId}"`);
  return found;
};
