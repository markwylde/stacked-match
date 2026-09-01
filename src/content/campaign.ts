import type { LevelDefinition } from '../core/levels.js';

/**
 * The campaign, authored as data. Difficulty rises on three levers at once:
 * more bricks, more icon types competing for the same seven tray slots, and a
 * smaller undo grant. Each silhouette is deliberate - a block, a meadow, an
 * arch, a valley - so a filled board reads as a shape rather than a heap.
 *
 * Every entry must satisfy validateLevel: six columns, no column above the
 * ceiling, a total divisible by three, and enough triples to seat every
 * declared icon type.
 */
export const CAMPAIGN: readonly LevelDefinition[] = [
  {
    id: 'garden-1',
    name: 'First Light',
    themeId: 'garden',
    heights: [6, 6, 6, 6, 6, 6],
    iconTypeCount: 12,
    undoGrant: 5,
  },
  {
    id: 'garden-2',
    name: 'Meadow',
    themeId: 'garden',
    heights: [4, 7, 8, 8, 7, 5],
    iconTypeCount: 12,
    undoGrant: 4,
  },
  {
    id: 'kitchen-1',
    name: 'Kettle On',
    themeId: 'kitchen',
    heights: [6, 8, 9, 9, 8, 5],
    iconTypeCount: 12,
    undoGrant: 4,
  },
  {
    id: 'kitchen-2',
    name: 'The Pantry',
    themeId: 'kitchen',
    heights: [3, 6, 9, 9, 6, 3],
    iconTypeCount: 12,
    undoGrant: 3,
  },
  {
    id: 'ocean-1',
    name: 'Shallows',
    themeId: 'ocean',
    heights: [7, 7, 7, 7, 7, 7],
    iconTypeCount: 13,
    undoGrant: 3,
  },
  {
    id: 'ocean-2',
    name: 'The Deep',
    themeId: 'ocean',
    heights: [4, 6, 8, 10, 8, 6],
    iconTypeCount: 13,
    undoGrant: 3,
  },
  {
    id: 'space-1',
    name: 'Orbit',
    themeId: 'space',
    heights: [10, 7, 4, 4, 7, 10],
    iconTypeCount: 13,
    undoGrant: 3,
  },
  {
    id: 'space-2',
    name: 'Far Side',
    themeId: 'space',
    heights: [5, 8, 10, 10, 8, 4],
    iconTypeCount: 14,
    undoGrant: 2,
  },
  {
    id: 'cafe-1',
    name: 'Afternoon',
    themeId: 'cafe',
    heights: [8, 8, 8, 8, 8, 8],
    iconTypeCount: 14,
    undoGrant: 2,
  },
  {
    id: 'cafe-2',
    name: 'Last Orders',
    themeId: 'cafe',
    heights: [6, 9, 10, 10, 9, 4],
    iconTypeCount: 15,
    undoGrant: 1,
  },
];
