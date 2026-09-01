import type { Brick } from '../core/types.js';
import type { IconDef } from '../themes/icons.js';
import { colourForIcon, iconById, type Theme } from '../themes/themes.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Cropped to the artwork's real bounds, not its nominal 24x24 canvas. */
export const ICON_VIEWBOX = '2 2 20 20';

const buildIcon = (definition: IconDef): SVGSVGElement => {
  const svg = document.createElementNS(SVG_NS, 'svg');
  // The artwork sits inside roughly 2..22 of its 24-unit canvas. Cropping to
  // the ink rather than the canvas scales every icon up by a fifth for free.
  svg.setAttribute('viewBox', ICON_VIEWBOX);
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  for (const shape of definition.shapes) {
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', shape.d);
    path.setAttribute('class', shape.role === 'fill' ? 'icon-fill' : 'icon-line');
    svg.appendChild(path);
  }
  return svg;
};

/**
 * Bricks are real buttons, so keyboard activation, focus handling and
 * assistive-technology semantics come from the platform rather than being
 * reimplemented.
 */
export const createBrickElement = (theme: Theme, brick: Brick): HTMLButtonElement => {
  const definition = iconById(theme, brick.icon);
  const element = document.createElement('button');
  element.type = 'button';
  element.className = 'brick';
  element.dataset.brickId = String(brick.id);
  element.dataset.icon = brick.icon;
  element.style.setProperty('--icon-colour', colourForIcon(theme, brick.icon));
  element.appendChild(buildIcon(definition));
  return element;
};

export const describeBrick = (
  theme: Theme,
  brick: Brick,
  options: { free: boolean; washed: boolean; inTray: boolean; nominated?: boolean },
): string => {
  const label = iconById(theme, brick.icon).label;
  if (options.inTray) return `${label}, held in tray`;
  const place = `column ${brick.column + 1}`;
  const wash = options.washed ? ', washed' : '';
  // The spotlight is only visual, so the nomination is stated in words too.
  if (options.nominated === true) return `${label}, ${place}${wash}, tap this brick`;
  const state = options.free ? '' : ', blocked';
  return `${label}, ${place}${wash}${state}`;
};
