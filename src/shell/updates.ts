/**
 * Service worker registration and deferred activation.
 *
 * A waiting worker is never activated while a level or endless run is in
 * progress: swapping versions mid-run would reload the page and discard a run
 * the player may have spent a long time on. The swap happens at a menu instead,
 * where it costs nothing.
 */
export class UpdateController {
  private waiting: ServiceWorker | null = null;
  private reloading = false;

  constructor(private readonly onPending: () => void) {}

  get hasPendingUpdate(): boolean {
    return this.waiting !== null;
  }

  async register(): Promise<void> {
    // The dev server serves no worker; registering there would cache a shell
    // that masks code changes.
    if (!import.meta.env.PROD) return;
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (this.reloading) return;
      this.reloading = true;
      window.location.reload();
    });

    try {
      const base = import.meta.env.BASE_URL;
      const registration = await navigator.serviceWorker.register(`${base}sw.js`, {
        scope: base,
      });

      if (registration.waiting !== null && navigator.serviceWorker.controller !== null) {
        this.waiting = registration.waiting;
        this.onPending();
      }

      registration.addEventListener('updatefound', () => {
        const installing = registration.installing;
        if (installing === null) return;
        installing.addEventListener('statechange', () => {
          if (installing.state === 'installed' && navigator.serviceWorker.controller !== null) {
            this.waiting = installing;
            this.onPending();
          }
        });
      });
    } catch {
      // A failed registration must never block play. The player simply keeps
      // running the version they already have.
    }
  }

  /**
   * Activates a pending update only when no run is in progress. Returns whether
   * the swap was started, so the caller can tell the player what happened.
   */
  applyIfSafe(runActive: boolean): boolean {
    if (this.waiting === null || runActive) return false;
    const waiting = this.waiting;
    this.waiting = null;
    waiting.postMessage({ type: 'SKIP_WAITING' });
    return true;
  }
}
