import type { Theme } from '../themes/themes.js';

const DEFAULT_STATUS_BAR = '#1b1630';
const DEFAULT_BACKGROUND = '#12101f';

const setMetaThemeColour = (colour: string): void => {
  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (meta === null) {
    meta = document.createElement('meta');
    meta.name = 'theme-color';
    document.head.appendChild(meta);
  }
  meta.content = colour;
};

/**
 * Paints the whole surface for a level's theme. In standalone mode the status
 * bar is part of the screen, so it is tinted too and the device shifts mood
 * with the level rather than breaking at the top edge.
 */
export const applyTheme = (theme: Theme | null): void => {
  const root = document.documentElement;
  if (theme === null) {
    root.style.setProperty('--bg', DEFAULT_BACKGROUND);
    root.style.removeProperty('--brick');
    root.style.removeProperty('--brick-washed');
    root.style.removeProperty('--accent');
    root.style.removeProperty('--ink');
    setMetaThemeColour(DEFAULT_STATUS_BAR);
    return;
  }

  root.style.setProperty('--bg', theme.background);
  root.style.setProperty('--brick', theme.brick);
  root.style.setProperty('--brick-washed', theme.brickWashed);
  root.style.setProperty('--accent', theme.accent);
  root.style.setProperty('--ink', theme.ink);
  setMetaThemeColour(theme.statusBar);
};
