import { CEILING, RISE_EVERY_TRIPLES } from '../core/constants.js';
import { canUndo, createEndlessGame, createGame, step } from '../core/game.js';
import { isLevelUnlocked, nextLevelAfter, type LevelDefinition } from '../core/levels.js';
import { isRunActive } from '../core/state.js';
import type { GameEvent, GameState } from '../core/types.js';
import {
  loadProgress,
  saveProgress,
  withEndlessScore,
  withLessonSeen,
  withLessonsReset,
  withLevelWon,
  withSettings,
  withTutorialDismissed,
  type Progress,
  type StorageLike,
} from '../core/progress.js';
import { CAMPAIGN } from '../content/campaign.js';
import { LESSONS, lessonsFor } from '../content/lessons.js';
import type { LessonDefinition, LessonTrigger } from '../core/lessons.js';
import { BLOCKED_HINT, TutorialSession } from './tutorial.js';
import { iconTypesFor, themeById } from '../themes/themes.js';
import { InstallController } from './install.js';
import { Stage } from './stage.js';
import { applyTheme } from './theme.js';
import { UpdateController } from './updates.js';

type Screen = 'home' | 'levels' | 'play';

const safeStorage = (): StorageLike | null => {
  try {
    const probe = '__stacked_match_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    return null;
  }
};

export class App {
  private screen: Screen = 'home';
  private game: GameState | null = null;
  private level: LevelDefinition | null = null;
  private progress: Progress;
  private readonly storage: StorageLike | null;
  private readonly install: InstallController;
  private readonly updates: UpdateController;
  private stage: Stage | null = null;
  private stageRoot: HTMLElement | null = null;
  private toastTimer = 0;
  private boardRows = CEILING;
  private session: TutorialSession | null = null;
  private queue: LessonDefinition[] = [];
  private afterLessons: (() => void) | null = null;
  private hint: string | null = null;

  constructor(private readonly root: HTMLElement) {
    this.storage = safeStorage();
    this.progress = loadProgress(this.storage);
    this.install = new InstallController(() => this.render(), this.progress.settings.installDismissed);
    this.updates = new UpdateController(() => this.considerUpdate());
    void this.updates.register();
    window.addEventListener('resize', () => this.stage?.render(this.game as GameState));
  }

  start(): void {
    this.render();
  }

  private persist(next: Progress): void {
    this.progress = next;
    saveProgress(this.storage, next);
  }

  /** Applies a pending version update the moment no run is in progress. */
  private considerUpdate(): void {
    if (this.updates.applyIfSafe(isRunActive(this.game))) {
      this.toast('Updating to the latest version...');
    }
  }

  private toast(message: string): void {
    let toast = document.querySelector<HTMLElement>('.toast');
    if (toast === null) {
      toast = document.createElement('div');
      toast.className = 'toast';
      toast.setAttribute('role', 'status');
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.dataset.visible = 'true';
    window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => {
      if (toast !== null) toast.dataset.visible = 'false';
    }, 3200);
  }

  // -------------------------------------------------------------- navigation

  private go(screen: Screen): void {
    this.screen = screen;
    if (screen !== 'play') {
      this.game = null;
      this.level = null;
      applyTheme(null);
      // Leaving a run is exactly the safe moment to swap versions.
      this.considerUpdate();
    }
    this.render();
  }

  /** Lessons for a trigger the player has neither seen nor dismissed. */
  private pendingFor(trigger: LessonTrigger): LessonDefinition[] {
    if (this.progress.tutorialDismissed) return [];
    return lessonsFor(trigger).filter((lesson) => !this.progress.seenLessonIds.includes(lesson.id));
  }

  /**
   * Runs any pending lessons, then does the thing the player actually asked
   * for. Triggers are resolved here and nowhere else, which is what keeps a
   * lesson from ever starting partway through a run.
   */
  private withLessons(trigger: LessonTrigger, then: () => void): void {
    const pending = this.pendingFor(trigger);
    if (pending.length === 0) {
      then();
      return;
    }
    this.queue = pending;
    this.afterLessons = then;
    this.startNextLesson();
  }

  private startNextLesson(): void {
    const lesson = this.queue.shift();
    if (lesson === undefined) {
      const done = this.afterLessons;
      this.afterLessons = null;
      this.session = null;
      if (done !== null) done();
      return;
    }
    this.session = new TutorialSession(lesson);
    this.game = this.session.createState();
    this.boardRows = this.rowsFor(this.game);
    this.level = null;
    this.hint = null;
    this.screen = 'play';
    this.stageRoot = null;
    applyTheme(themeById(lesson.themeId));
    this.render();
  }

  private completeLesson(): void {
    const lesson = this.session?.lesson;
    if (lesson !== undefined) this.persist(withLessonSeen(this.progress, lesson.id));
    this.session = null;
    this.startNextLesson();
  }

  /** Skip is one action from any step and ends the tutorial for good. */
  private skipTutorial(): void {
    let next = withTutorialDismissed(this.progress);
    const skipped = [this.session?.lesson, ...this.queue];
    for (const lesson of skipped) {
      if (lesson !== undefined) next = withLessonSeen(next, lesson.id);
    }
    this.persist(next);

    this.queue = [];
    this.session = null;
    const done = this.afterLessons;
    this.afterLessons = null;
    if (done !== null) done();
    else this.go('home');
  }

  /** Replays every lesson on demand, without disturbing anything earned. */
  private replayTutorial(): void {
    this.persist(withLessonsReset(this.progress));
    this.queue = [...LESSONS];
    this.afterLessons = () => this.go('home');
    this.startNextLesson();
  }

  /** Entry point for playing a level: teaches first if a lesson is pending. */
  private startLevel(level: LevelDefinition): void {
    const index = CAMPAIGN.findIndex((candidate) => candidate.id === level.id);
    const trigger: LessonTrigger | null =
      index === 0 ? 'campaign-first' : index === 1 ? 'campaign-second' : null;
    if (trigger === null) {
      this.beginLevel(level);
      return;
    }
    this.withLessons(trigger, () => this.beginLevel(level));
  }

  private beginLevel(level: LevelDefinition): void {
    this.session = null;
    this.stageRoot = null;
    const theme = themeById(level.themeId);
    this.level = level;
    this.game = createGame({
      mode: 'campaign',
      themeId: theme.id,
      iconTypes: iconTypesFor(theme, level.iconTypeCount),
      heights: level.heights,
      seed: `${level.id}:${Date.now()}`,
      levelId: level.id,
      undoGrant: level.undoGrant,
    });
    this.boardRows = this.rowsFor(this.game);
    this.screen = 'play';
    applyTheme(theme);
    this.render();
  }

  private startEndless(): void {
    this.withLessons('endless-first', () => this.beginEndless());
  }

  private beginEndless(): void {
    this.session = null;
    this.stageRoot = null;
    const theme = themeById(CAMPAIGN[0]?.themeId ?? 'garden');
    const rotation = themeById(
      ['garden', 'kitchen', 'ocean', 'space', 'cafe'][Math.floor(Math.random() * 5)] ?? theme.id,
    );
    this.level = null;
    this.game = createEndlessGame(
      rotation.id,
      rotation.icons.map((definition) => definition.id),
      Date.now(),
    );
    this.boardRows = this.rowsFor(this.game);
    this.screen = 'play';
    applyTheme(rotation);
    this.render();
  }

  // ------------------------------------------------------------------ intents

  private dispatch(event: 'select' | 'undo', brickId?: number): void {
    const game = this.game;
    if (game === null) return;

    // While a lesson runs, only the brick being taught is accepted. Everything
    // else leaves the board and the lesson exactly where they were.
    const session = this.session;
    if (session !== null) {
      if (event === 'undo') return;
      const verdict = session.evaluate(game, brickId as number);
      if (verdict !== 'accept') {
        this.hint = verdict === 'blocked' ? BLOCKED_HINT : null;
        this.stage?.nudge(brickId as number);
        this.render();
        return;
      }
      this.hint = null;
      const taught = step(game, { type: 'select', brickId: brickId as number });
      this.game = taught.state;
      session.advance();
      this.render();
      return;
    }

    const result =
      event === 'undo' ? step(game, { type: 'undo' }) : step(game, { type: 'select', brickId: brickId as number });

    this.game = result.state;
    this.handleEvents(result.events);
    this.render();
  }

  private handleEvents(events: readonly GameEvent[]): void {
    for (const event of events) {
      if (event.type === 'SelectionRejected' && event.reason === 'blocked') {
        this.stage?.nudge(event.brickId);
      }
      if (event.type === 'LevelWon' && this.level !== null) {
        this.persist(withLevelWon(this.progress, this.level.id));
      }
      if (event.type === 'RunLost' && this.game?.mode === 'endless') {
        this.persist(withEndlessScore(this.progress, this.game.score));
      }
    }
  }

  // ------------------------------------------------------------------ rendering

  /**
   * Rows of board to reserve. A board that can rise reserves the ceiling; one
   * that only shrinks reserves its tallest column, so its bricks are as large
   * as the screen allows.
   */
  private rowsFor(state: GameState): number {
    const tallest = state.columns.reduce((max, stack) => Math.max(max, stack.length), 0);
    if (this.session !== null) {
      const rises = this.session.lesson.steps.some((lessonStep) =>
        lessonStep.expect.includes('RowRose'),
      );
      return Math.min(CEILING, Math.max(3, tallest + (rises ? 1 : 0)));
    }
    if (state.mode === 'endless') return CEILING;
    return Math.max(3, tallest);
  }

  private render(): void {
    if (this.screen === 'play' && this.game !== null) this.renderPlay(this.game);
    else if (this.screen === 'levels') this.renderLevels();
    else this.renderHome();
  }

  private frame(): HTMLElement {
    this.root.replaceChildren();
    this.stage = null;
    this.stageRoot = null;
    const screen = document.createElement('div');
    screen.className = 'screen';
    this.root.appendChild(screen);
    return screen;
  }

  private button(label: string, onClick: () => void, variant = ''): HTMLButtonElement {
    const element = document.createElement('button');
    element.type = 'button';
    element.className = `btn ${variant}`.trim();
    element.textContent = label;
    element.addEventListener('click', onClick);
    return element;
  }

  private renderInstallBar(parent: HTMLElement): void {
    const mode = this.install.mode();
    if (mode === 'hidden') return;

    const bar = document.createElement('div');
    bar.className = 'install-bar';
    const text = document.createElement('span');
    text.style.flex = '1';
    text.textContent =
      mode === 'prompt'
        ? 'Add Stacked Match to your home screen.'
        : 'Add to Home Screen: tap Share, then "Add to Home Screen".';
    bar.appendChild(text);

    if (mode === 'prompt') {
      bar.appendChild(this.button('Install', () => void this.install.promptInstall(), 'btn-primary'));
    }
    bar.appendChild(
      this.button('Not now', () => {
        this.persist(withSettings(this.progress, { installDismissed: true }));
        this.install.setDismissed(true);
      }),
    );
    parent.appendChild(bar);
  }

  private renderHome(): void {
    const screen = this.frame();
    this.renderInstallBar(screen);

    const title = document.createElement('h1');
    title.className = 'title';
    title.textContent = 'Stacked Match';
    const subtitle = document.createElement('p');
    subtitle.className = 'subtitle';
    subtitle.textContent = 'Take the top brick. Match three. Never fill the tray.';
    screen.append(title, subtitle);

    const menu = document.createElement('div');
    menu.className = 'menu';
    menu.appendChild(this.button('Campaign', () => this.go('levels'), 'btn-primary'));
    menu.appendChild(this.button('Endless', () => this.startEndless()));
    menu.appendChild(this.button('How to play', () => this.replayTutorial()));

    if (this.progress.bestEndlessScore > 0) {
      const best = document.createElement('p');
      best.className = 'subtitle';
      best.style.margin = '6px 0 0';
      best.textContent = `Best endless run: ${this.progress.bestEndlessScore}`;
      menu.appendChild(best);
    }
    screen.appendChild(menu);
  }

  private renderLevels(): void {
    const screen = this.frame();
    const title = document.createElement('h1');
    title.className = 'title';
    title.textContent = 'Campaign';
    screen.appendChild(title);

    const grid = document.createElement('div');
    grid.className = 'level-grid';

    for (const level of CAMPAIGN) {
      const unlocked = isLevelUnlocked(CAMPAIGN, level.id, this.progress.wonLevelIds);
      const won = this.progress.wonLevelIds.includes(level.id);
      const theme = themeById(level.themeId);

      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'level-card';
      card.dataset.locked = String(!unlocked);
      card.disabled = !unlocked;
      card.style.borderColor = unlocked ? theme.accent : '';

      const name = document.createElement('span');
      name.className = 'level-card-name';
      name.textContent = unlocked ? level.name : 'Locked';

      const meta = document.createElement('span');
      meta.className = 'level-card-meta';
      meta.textContent = `${theme.name} · ${level.heights.reduce((a, b) => a + b, 0)} bricks`;

      card.append(name, meta);
      if (won) {
        const badge = document.createElement('span');
        badge.className = 'level-card-won';
        badge.textContent = 'Cleared';
        card.appendChild(badge);
      }
      card.setAttribute(
        'aria-label',
        unlocked ? `${level.name}, ${theme.name}${won ? ', cleared' : ''}` : `${level.name}, locked`,
      );
      if (unlocked) card.addEventListener('click', () => this.startLevel(level));
      grid.appendChild(card);
    }

    screen.appendChild(grid);
    const controls = document.createElement('div');
    controls.className = 'controls';
    controls.appendChild(this.button('Back', () => this.go('home')));
    screen.appendChild(controls);
  }

  private renderPlay(state: GameState): void {
    const rebuild = this.stageRoot === null;
    if (rebuild) {
      const screen = this.frame();

      const hud = document.createElement('div');
      hud.className = 'hud';
      hud.id = 'hud';
      screen.appendChild(hud);

      const coach = document.createElement('div');
      coach.className = 'coach';
      coach.id = 'coach';
      coach.hidden = true;
      screen.appendChild(coach);

      const stageRoot = document.createElement('div');
      stageRoot.className = 'stage';
      stageRoot.setAttribute('role', 'group');
      stageRoot.setAttribute('aria-label', 'Game board and tray');
      screen.appendChild(stageRoot);
      this.stageRoot = stageRoot;
      this.stage = new Stage(stageRoot, (brickId) => this.dispatch('select', brickId));

      const controls = document.createElement('div');
      controls.className = 'controls';
      controls.id = 'controls';
      screen.appendChild(controls);
    }

    this.stage?.setTheme(themeById(state.themeId));
    this.stage?.setRows(this.boardRows);
    this.renderCoach(state);
    this.renderHud(state);
    this.renderControls(state);
    this.stage?.render(state);
    // A lesson owns its own ending, including the ceiling lesson's loss.
    if (this.session === null) this.renderResult(state);
  }

  /** The coaching bar: what to do, and a pointer at the column to do it in. */
  private renderCoach(state: GameState): void {
    const coach = document.querySelector<HTMLElement>('#coach');
    if (coach === null) return;

    const session = this.session;
    if (session === null) {
      coach.hidden = true;
      coach.replaceChildren();
      this.stage?.setCoaching(null);
      return;
    }

    const nominated = session.nominated(state) ?? null;
    coach.hidden = false;
    coach.dataset.hint = String(this.hint !== null);
    coach.dataset.pointer = String(nominated !== null);
    coach.setAttribute('role', 'status');
    coach.setAttribute('aria-live', 'polite');
    coach.replaceChildren();

    const step = document.createElement('span');
    step.className = 'coach-step';
    step.textContent = session.isAtOutro
      ? session.lesson.title
      : `${session.lesson.title} · ${session.stepIndex + 1} of ${session.stepCount}`;

    const text = document.createElement('p');
    text.className = 'coach-text';
    text.id = 'coach-text';
    text.textContent = this.hint ?? session.caption ?? '';
    coach.append(step, text);

    const column = session.currentStep?.column;
    if (column !== undefined && this.stage !== null) {
      coach.style.setProperty('--coach-x', `${this.stage.columnCentre(column)}px`);
    }

    this.stage?.setCoaching({ nominated, describedBy: 'coach-text' });
  }

  private renderHud(state: GameState): void {
    const hud = document.querySelector<HTMLElement>('#hud');
    if (hud === null) return;
    hud.replaceChildren();

    if (this.session !== null) {
      const title = document.createElement('span');
      title.className = 'stat-value';
      title.textContent = 'How to play';
      hud.appendChild(title);
      return;
    }

    const stat = (label: string, value: string): HTMLElement => {
      const wrap = document.createElement('div');
      wrap.className = 'stat';
      const l = document.createElement('span');
      l.className = 'stat-label';
      l.textContent = label;
      const v = document.createElement('span');
      v.className = 'stat-value';
      v.textContent = value;
      wrap.append(l, v);
      return wrap;
    };

    const left = document.createElement('div');
    left.className = 'hud-group';
    left.appendChild(stat('Score', String(state.score)));
    left.appendChild(stat('Undos', String(state.undosRemaining)));
    if (state.mode === 'endless') {
      const untilRise = RISE_EVERY_TRIPLES - state.triplesSinceRise;
      left.appendChild(stat('Next row', `${untilRise}`));
    }

    const right = document.createElement('div');
    right.className = 'hud-group';
    const chain = document.createElement('span');
    chain.className = 'chain-badge';
    chain.dataset.active = String(state.chain > 0);
    chain.textContent = `Chain x${state.chain}`;
    right.appendChild(chain);

    hud.append(left, right);
  }

  private renderControls(state: GameState): void {
    const controls = document.querySelector<HTMLElement>('#controls');
    if (controls === null) return;
    controls.replaceChildren();

    const session = this.session;
    if (session !== null) {
      if (session.isAtOutro) {
        controls.appendChild(
          this.button('Continue', () => {
            session.finish();
            this.completeLesson();
          }, 'btn-primary'),
        );
      }
      controls.appendChild(this.button('Skip tutorial', () => this.skipTutorial()));
      return;
    }

    const undoButton = this.button(`Undo (${state.undosRemaining})`, () => this.dispatch('undo'));
    undoButton.disabled = !canUndo(state);
    controls.appendChild(undoButton);
    controls.appendChild(this.button('Quit', () => this.go(this.level === null ? 'home' : 'levels')));
  }

  private renderResult(state: GameState): void {
    document.querySelector('.overlay')?.remove();
    if (state.status === 'playing') return;

    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    const panel = document.createElement('div');
    panel.className = 'panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');

    const heading = document.createElement('h2');
    const body = document.createElement('p');

    if (state.status === 'won') {
      heading.textContent = 'Level cleared';
      body.textContent = `Score ${state.score}. Every brick matched.`;
    } else {
      heading.textContent = state.lossReason === 'ceiling' ? 'The stack reached the top' : 'The tray filled up';
      body.textContent =
        state.lossReason === 'ceiling'
          ? `Score ${state.score}. Clear faster to keep the board low.`
          : `Score ${state.score}. Seven held bricks with no match left.`;
    }
    panel.append(heading, body);

    const next = this.level === null ? null : nextLevelAfter(CAMPAIGN, this.level.id);
    if (state.status === 'won' && next !== null) {
      panel.appendChild(this.button('Next level', () => this.startLevel(next), 'btn-primary'));
    }
    if (this.level !== null) {
      panel.appendChild(this.button('Retry', () => this.startLevel(this.level as LevelDefinition)));
    } else {
      panel.appendChild(this.button('Play again', () => this.startEndless(), 'btn-primary'));
    }
    panel.appendChild(this.button('Menu', () => this.go(this.level === null ? 'home' : 'levels')));

    overlay.appendChild(panel);
    document.body.appendChild(overlay);
  }
}
