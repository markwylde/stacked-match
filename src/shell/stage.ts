import { CEILING, TRAY_SLOTS } from '../core/constants.js';
import { isWashed, topOf } from '../core/state.js';
import type { Brick, BrickId, GameState } from '../core/types.js';
import type { Theme } from '../themes/themes.js';
import { createBrickElement, describeBrick } from './brick-view.js';
import { boardPlacement, computeLayout, toTransform, trayPlacement, type Layout } from './layout.js';

/** What the running lesson wants highlighted, if any. */
export interface Coaching {
  readonly nominated: BrickId | null;
  readonly describedBy?: string | undefined;
}

const DRAG_THRESHOLD_PX = 10;
const POP_REMOVE_MS = 320;

/**
 * Owns the single absolutely-positioned layer that holds every brick. Because
 * board and tray share one coordinate space, a brick moving from the board into
 * the tray is one transform change rather than a move between containers.
 *
 * Positions come from game state; nothing is measured from a node that may be
 * mid-flight. Transitions are declared in CSS, so the browser re-targets an
 * interrupted animation from wherever the brick currently is instead of
 * queueing a second one.
 */
export class Stage {
  private readonly elements = new Map<BrickId, HTMLButtonElement>();
  private readonly slots: HTMLElement[] = [];
  private theme: Theme | null = null;
  private layout: Layout;
  private coaching: Coaching | null = null;
  private rows = CEILING;
  private pointerStart: { x: number; y: number } | null = null;
  private dragged = false;

  constructor(
    private readonly root: HTMLElement,
    private readonly onSelect: (brickId: BrickId) => void,
  ) {
    this.layout = computeLayout(320, 480, this.rows);
    for (let index = 0; index < TRAY_SLOTS; index += 1) {
      const slot = document.createElement('div');
      slot.className = 'slot';
      this.slots.push(slot);
      this.root.appendChild(slot);
    }
    this.bindInput();
  }

  setTheme(theme: Theme): void {
    this.theme = theme;
  }

  /** How many board rows to reserve height for. See computeLayout. */
  setRows(rows: number): void {
    this.rows = rows;
  }

  /**
   * Nomination is a property of the brick, not a layer above it. The brick
   * moves - it settles, it flies to the tray - and anything positioned
   * separately would have to chase it.
   */
  setCoaching(coaching: Coaching | null): void {
    this.coaching = coaching;
  }

  /** Horizontal centre of a column, so the coach bar can point at it. */
  columnCentre(column: number): number {
    return boardPlacement(this.layout, column, 0).x + this.layout.brick / 2;
  }

  private bindInput(): void {
    // A tap selects; a drag across the board must not. The click listener does
    // the activating, so keyboard Enter and Space work through the same path.
    this.root.addEventListener('pointerdown', (event) => {
      this.pointerStart = { x: event.clientX, y: event.clientY };
      this.dragged = false;
    });

    this.root.addEventListener('pointermove', (event) => {
      if (this.pointerStart === null) return;
      const dx = event.clientX - this.pointerStart.x;
      const dy = event.clientY - this.pointerStart.y;
      if (Math.hypot(dx, dy) > DRAG_THRESHOLD_PX) this.dragged = true;
    });

    this.root.addEventListener('pointercancel', () => {
      this.pointerStart = null;
      this.dragged = true;
    });

    this.root.addEventListener('click', (event) => {
      const wasDragged = this.dragged;
      this.pointerStart = null;
      this.dragged = false;
      if (wasDragged) return;

      const target = (event.target as HTMLElement | null)?.closest<HTMLButtonElement>('.brick');
      if (target === null || target === undefined) return;
      const brickId = Number(target.dataset.brickId);
      if (Number.isNaN(brickId)) return;
      this.onSelect(brickId);
    });
  }

  /** A brick that cannot be taken shakes rather than doing nothing at all. */
  nudge(brickId: BrickId): void {
    const element = this.elements.get(brickId);
    if (element === undefined) return;
    element.dataset.nudge = 'true';
    window.setTimeout(() => delete element.dataset.nudge, 320);
  }

  measure(): void {
    const width = this.root.clientWidth;
    const height = this.root.clientHeight;
    if (width > 0 && height > 0) this.layout = computeLayout(width, height, this.rows);
    this.root.style.setProperty('--brick-size', `${this.layout.brick}px`);
    this.root.style.setProperty('--tray-size', `${this.layout.tray}px`);
    this.slots.forEach((slot, index) => {
      const placement = trayPlacement(this.layout, index);
      const inset = (this.layout.brick - this.layout.tray) / 2;
      slot.style.transform = `translate3d(${(placement.x + inset).toFixed(2)}px, ${(placement.y + inset).toFixed(2)}px, 0)`;
    });
  }

  render(state: GameState): void {
    const theme = this.theme;
    if (theme === null) return;
    this.measure();

    const visible = new Set<BrickId>();

    state.columns.forEach((stack, column) => {
      const top = topOf(state, column);
      stack.forEach((brickId, row) => {
        visible.add(brickId);
        const brick = state.bricks[brickId] as Brick;
        const element = this.ensureElement(theme, brick);
        const free = top === brickId;
        const washed = isWashed(state, brickId);
        const nominated = this.coaching !== null && this.coaching.nominated === brickId;
        const coached = this.coaching !== null && this.coaching.nominated !== null;

        element.style.transform = toTransform(boardPlacement(this.layout, column, row));
        element.style.zIndex = String(nominated ? 200 : 10 + row);
        element.dataset.free = String(free);
        element.dataset.washed = String(washed);
        element.dataset.nominated = String(nominated);
        element.dataset.dimmed = String(coached && !nominated);

        // While a lesson is running, the tab order narrows to the one brick
        // being taught, so the keyboard path is gated exactly like the pointer.
        const focusable = coached ? nominated : free && state.status === 'playing';
        element.tabIndex = focusable ? 0 : -1;
        element.setAttribute('aria-disabled', String(!focusable));
        element.setAttribute(
          'aria-label',
          describeBrick(theme, brick, { free, washed, inTray: false, nominated }),
        );
        if (nominated && this.coaching?.describedBy !== undefined) {
          element.setAttribute('aria-describedby', this.coaching.describedBy);
        } else {
          element.removeAttribute('aria-describedby');
        }
      });
    });

    state.tray.forEach((brickId, index) => {
      visible.add(brickId);
      const brick = state.bricks[brickId] as Brick;
      const element = this.ensureElement(theme, brick);
      element.style.transform = toTransform(trayPlacement(this.layout, index));
      element.style.zIndex = '100';
      element.dataset.free = 'false';
      element.dataset.washed = 'false';
      element.dataset.nominated = 'false';
      element.dataset.dimmed = 'false';
      element.tabIndex = -1;
      element.setAttribute('aria-disabled', 'true');
      element.setAttribute('aria-label', describeBrick(theme, brick, { free: false, washed: false, inTray: true }));
    });

    // Anything no longer on the board or in the tray has just popped.
    for (const [brickId, element] of this.elements) {
      if (visible.has(brickId)) continue;
      this.elements.delete(brickId);
      element.dataset.popping = 'true';
      element.style.transform = `${element.style.transform} scale(1.25)`;
      element.tabIndex = -1;
      window.setTimeout(() => element.remove(), POP_REMOVE_MS);
    }

    const danger = state.tray.length >= TRAY_SLOTS - 1;
    this.slots.forEach((slot, index) => {
      slot.dataset.danger = String(danger && index >= state.tray.length);
    });
  }

  private ensureElement(theme: Theme, brick: Brick): HTMLButtonElement {
    const existing = this.elements.get(brick.id);
    if (existing !== undefined) return existing;

    const element = createBrickElement(theme, brick);
    // New bricks enter from below, which reads as the row pushing up.
    element.dataset.entering = 'true';
    element.style.transform = toTransform({
      ...boardPlacement(this.layout, brick.column, 0),
      y: this.layout.boardHeight + this.layout.brick,
      scale: 1,
    });
    this.root.appendChild(element);
    this.elements.set(brick.id, element);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => delete element.dataset.entering);
    });
    return element;
  }

  clear(): void {
    for (const element of this.elements.values()) element.remove();
    this.elements.clear();
  }
}
