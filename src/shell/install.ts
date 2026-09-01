/**
 * The install affordance. Shown only when installation is genuinely possible
 * and the game is not already installed, dismissible, and with a written
 * fallback on platforms that expose no programmatic install signal.
 */

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export type InstallMode = 'hidden' | 'prompt' | 'manual';

export class InstallController {
  private deferred: BeforeInstallPromptEvent | null = null;

  constructor(
    private readonly onChange: () => void,
    private dismissed: boolean,
  ) {
    window.addEventListener('beforeinstallprompt', (event) => {
      // Keep the browser's own banner suppressed; the game offers its own.
      event.preventDefault();
      this.deferred = event as BeforeInstallPromptEvent;
      this.onChange();
    });
    window.addEventListener('appinstalled', () => {
      this.deferred = null;
      this.onChange();
    });
  }

  /** True when the game is running as an installed app rather than in a tab. */
  isStandalone(): boolean {
    const iosStandalone = (window.navigator as { standalone?: boolean }).standalone === true;
    const displayMode =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(display-mode: standalone)').matches;
    return displayMode || iosStandalone;
  }

  private isIos(): boolean {
    return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
  }

  mode(): InstallMode {
    if (this.isStandalone() || this.dismissed) return 'hidden';
    if (this.deferred !== null) return 'prompt';
    // iOS offers no beforeinstallprompt, so guidance replaces a dead button.
    return this.isIos() ? 'manual' : 'hidden';
  }

  async promptInstall(): Promise<void> {
    const deferred = this.deferred;
    if (deferred === null) return;
    this.deferred = null;
    await deferred.prompt();
    await deferred.userChoice;
    this.onChange();
  }

  setDismissed(dismissed: boolean): void {
    this.dismissed = dismissed;
    this.onChange();
  }
}
