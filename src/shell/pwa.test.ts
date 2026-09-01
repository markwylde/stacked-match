// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InstallController } from './install.js';
import { UpdateController } from './updates.js';

// Under the jsdom environment import.meta.url is not a file URL, so the
// stylesheet is read relative to the project root instead.
const css = (): string => readFileSync(join(process.cwd(), 'src/shell/styles.css'), 'utf8');

const setStandalone = (standalone: boolean): void => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: (query: string) => ({ matches: standalone && query.includes('standalone') }),
  });
};

const setUserAgent = (agent: string): void => {
  Object.defineProperty(window.navigator, 'userAgent', { configurable: true, value: agent });
};

const fireInstallPrompt = (): { prompt: ReturnType<typeof vi.fn> } => {
  const prompt = vi.fn().mockResolvedValue(undefined);
  const event = new Event('beforeinstallprompt') as Event & {
    prompt: unknown;
    userChoice: unknown;
  };
  event.prompt = prompt;
  event.userChoice = Promise.resolve({ outcome: 'accepted' });
  window.dispatchEvent(event);
  return { prompt };
};

beforeEach(() => {
  setStandalone(false);
  setUserAgent('Mozilla/5.0 (Linux; Android 13) Chrome/120');
});

describe('washed brick recolouring', () => {
  it('recolours a washed brick through the accent custom property', () => {
    const sheet = css();
    // The wash must be driven by a custom property so a theme change repaints
    // washed bricks without swapping any asset.
    expect(sheet).toContain("--icon-colour");
    const washedRule = sheet.slice(sheet.indexOf(".brick[data-washed='true'] .icon-fill"));
    expect(washedRule.slice(0, 120)).toContain('fill: var(--accent)');

    const faceRule = sheet.slice(sheet.indexOf(".brick[data-washed='true'] {"));
    expect(faceRule.slice(0, 260)).toContain('var(--brick-washed)');
    expect(faceRule.slice(0, 260)).toContain('var(--accent)');
  });

  it('paints an unwashed icon from its own palette colour', () => {
    const sheet = css();
    const fillRule = sheet.slice(sheet.indexOf('.brick .icon-fill'));
    expect(fillRule.slice(0, 120)).toContain('fill: var(--icon-colour)');
  });
});

describe('install affordance', () => {
  it('stays hidden until the browser says installation is possible', () => {
    const controller = new InstallController(() => {}, false);
    expect(controller.mode()).toBe('hidden');
  });

  it('offers a prompt once the browser signals installability', () => {
    const controller = new InstallController(() => {}, false);
    fireInstallPrompt();
    expect(controller.mode()).toBe('prompt');
  });

  it('stays hidden when already running standalone', () => {
    setStandalone(true);
    const controller = new InstallController(() => {}, false);
    fireInstallPrompt();
    expect(controller.mode()).toBe('hidden');
  });

  it('stays hidden once dismissed, and the dismissal persists', () => {
    const controller = new InstallController(() => {}, false);
    fireInstallPrompt();
    expect(controller.mode()).toBe('prompt');
    controller.setDismissed(true);
    expect(controller.mode()).toBe('hidden');

    // A controller rebuilt from stored settings stays hidden across reloads.
    const reloaded = new InstallController(() => {}, true);
    fireInstallPrompt();
    expect(reloaded.mode()).toBe('hidden');
  });

  it('falls back to written guidance where there is no install signal', () => {
    setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari');
    const controller = new InstallController(() => {}, false);
    // iOS never fires beforeinstallprompt, so no dead button is offered.
    expect(controller.mode()).toBe('manual');
  });

  it('consumes the deferred prompt when the player installs', async () => {
    const controller = new InstallController(() => {}, false);
    const { prompt } = fireInstallPrompt();
    await controller.promptInstall();
    expect(prompt).toHaveBeenCalledOnce();
    expect(controller.mode()).toBe('hidden');
  });
});

describe('deferred version updates', () => {
  it('reports nothing pending before an update arrives', () => {
    const controller = new UpdateController(() => {});
    expect(controller.hasPendingUpdate).toBe(false);
    expect(controller.applyIfSafe(false)).toBe(false);
  });

  it('never activates while a run is in progress', () => {
    const controller = new UpdateController(() => {});
    const waiting = { postMessage: vi.fn() };
    (controller as unknown as { waiting: unknown }).waiting = waiting;

    expect(controller.applyIfSafe(true)).toBe(false);
    expect(waiting.postMessage).not.toHaveBeenCalled();
    expect(controller.hasPendingUpdate).toBe(true);
  });

  it('activates once no run is in progress', () => {
    const controller = new UpdateController(() => {});
    const waiting = { postMessage: vi.fn() };
    (controller as unknown as { waiting: unknown }).waiting = waiting;

    expect(controller.applyIfSafe(false)).toBe(true);
    expect(waiting.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
    // The pending update is consumed, so a second call does nothing.
    expect(controller.applyIfSafe(false)).toBe(false);
  });

  it('registers no service worker outside a production build', async () => {
    const register = vi.fn();
    Object.defineProperty(window.navigator, 'serviceWorker', {
      configurable: true,
      value: { register, addEventListener: vi.fn(), controller: null },
    });
    await new UpdateController(() => {}).register();
    expect(register).not.toHaveBeenCalled();
  });
});
