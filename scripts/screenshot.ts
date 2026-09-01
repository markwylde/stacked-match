/**
 * Captures the README screenshot from the real built app, at a phone viewport,
 * driving it the way a player would. Uses the locally installed Chrome rather
 * than downloading a browser.
 *
 * Run with: npm run shot   (expects `npm run build` and a preview server)
 */
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright-core';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const URL_BASE = process.env.SHOT_URL ?? 'http://localhost:4173/';
const OUT = join(process.cwd(), 'docs', 'screenshots');

const PROGRESS = {
  version: 2,
  // Far enough in to reach a level whose board fills the screen.
  wonLevelIds: ['garden-1', 'garden-2', 'kitchen-1', 'kitchen-2', 'ocean-1'],
  bestEndlessScore: 0,
  seenLessonIds: ['the-loop', 'the-tray', 'the-wash', 'chains', 'rising-rows', 'the-ceiling'],
  tutorialDismissed: true,
  settings: { installDismissed: true },
};

const main = async (): Promise<void> => {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: CHROME });
  const context = await browser.newContext({
    viewport: { width: 393, height: 852 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    colorScheme: 'dark',
  });
  const page = await context.newPage();

  const clickText = async (text: string): Promise<void> => {
    await page.locator('button', { hasText: new RegExp(`^${text}$`) }).first().click();
    await page.waitForTimeout(320);
  };

  // --- gameplay, mid-level -------------------------------------------------
  await page.goto(URL_BASE);
  await page.evaluate((progress) => {
    window.localStorage.setItem('stacked-match:progress', JSON.stringify(progress));
  }, PROGRESS);
  await page.reload();

  await clickText('Campaign');
  // A mid-campaign level fills the board and wears the ocean palette.
  await page.locator('.level-card').nth(5).click();
  await page.waitForTimeout(400);

  /** Plays the way a careful player does, so the shot shows a real position. */
  const takeBestBrick = async (): Promise<boolean> => {
    const held = await page.$$eval('.brick', (nodes) =>
      nodes
        .filter((n) => (n as HTMLElement).getAttribute('aria-label')?.includes('held in tray'))
        .map((n) => (n as HTMLElement).dataset.icon ?? ''),
    );
    const free = await page.$$('.brick[data-free="true"]');
    if (free.length === 0) return false;

    const icons = await Promise.all(free.map((brick) => brick.getAttribute('data-icon')));
    const count = (icon: string | null): number => held.filter((h) => h === icon).length;

    let index = icons.findIndex((icon) => count(icon) === 2);
    if (index === -1) index = icons.findIndex((icon) => count(icon) === 1);
    if (index === -1) {
      index = icons.findIndex(
        (icon, i) => icons.some((other, j) => other === icon && j !== i),
      );
    }
    await free[index === -1 ? 0 : index]?.click();
    await page.waitForTimeout(170);
    return true;
  };

  // Play until a set has cleared, so the shot shows washed bricks - the
  // mechanic the game is built around - alongside a populated tray.
  for (let move = 0; move < 26; move += 1) {
    const washed = await page.$$('.brick[data-washed="true"]');
    const held = await page.$$('.brick[aria-label*="held in tray"]');
    if (washed.length > 0 && held.length >= 4) break;
    if (!(await takeBestBrick())) break;
  }
  await page.waitForTimeout(700);
  await page.screenshot({ path: join(OUT, 'gameplay.png') });

  // --- the tutorial coaching a step ---------------------------------------
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await clickText('Campaign');
  await page.locator('.level-card').first().click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: join(OUT, 'tutorial.png') });

  // --- level select --------------------------------------------------------
  await page.evaluate((progress) => {
    window.localStorage.setItem(
      'stacked-match:progress',
      JSON.stringify({ ...progress, wonLevelIds: ['garden-1', 'garden-2', 'kitchen-1'] }),
    );
  }, PROGRESS);
  await page.reload();
  await clickText('Campaign');
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(OUT, 'levels.png') });

  await browser.close();
  console.log(`wrote gameplay.png, tutorial.png and levels.png to ${OUT}`);
};

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
