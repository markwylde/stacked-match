## Context

The repository is empty; there is no existing architecture to fit into. See proposal.md — Why for motivation, and the six capability specs for the behaviour contract.

Three constraints shape everything below:

- **The rules are subtle and the failure modes are silent.** Wash propagation, chain decay, undo reversal, and solvability guarantees are all easy to get quietly wrong and hard to spot by playing. The game logic must be testable without a browser.
- **The board is small.** Six columns by a ten-brick ceiling is at most 60 bricks on screen, plus seven tray slots. That is far below the point where DOM rendering becomes a problem, which makes the cheaper rendering approach the correct one rather than a compromise.
- **Motion is the product.** The settle bounce, the pop, and the wash ripple are what make the game feel good. The animation approach has to be first-class, not an afterthought layered onto a redraw.
- **It ships as an installed app with no server.** Everything the game needs must be cached locally on first load, and the entire asset footprint — code, styles, icon sprites, level data — has to be small enough to precache in one go. This is easy here only because the game genuinely has no backend and no user-generated content.

## Goals / Non-Goals

**Goals:**
- A headless, deterministic game core that can be unit-tested exhaustively with no DOM.
- Board dimensions and pacing constants centralised so difficulty can be tuned without touching logic.
- Reproducible endless runs from a seed, so a bug report can be replayed exactly.
- A rendering layer that reads game state and animates transitions, with no game rules embedded in it.
- Campaign levels authored as plain data, so new levels need no code.
- Complete offline capability from first load, with no runtime network dependency of any kind.
- Version updates that are invisible until they are safe to apply.

**Non-Goals:**
- Generality. This is one game, not an engine. No entity systems, no scene graphs, no plugin points.
- Server-side anything. No build-time level validation service, no telemetry, no score submission.
- Supporting boards large enough to require canvas. If a future mode needs 500 bricks, that is a different design.
- Animation choreography beyond what the specs require to communicate state.
- Runtime caching strategies. There are no dynamic resources to negotiate — everything is known at build time.
- Push notifications, background sync, periodic sync, or any other service worker capability beyond offline caching and update delivery.
- App store packaging. Installation is via the browser's own install flow only.

## Decisions

### Split a headless core from a rendering shell

The game is two layers with a one-way dependency: a pure `core` that owns all rules and state, and a `shell` that renders state and forwards input.

```
  +---------------------------+
  |  shell  (DOM, CSS, input) |
  |   - renders state         |
  |   - runs FLIP animation   |
  |   - forwards intents      |
  +------------+--------------+
               | intents (selectBrick, undo, ...)
               v
  +---------------------------+
  |  core   (pure TypeScript) |
  |   - board, tray, wash     |
  |   - scoring, modes        |
  |   - no DOM, no timers     |
  +---------------------------+
               | state snapshot + event list
               ^
```

The core exposes a reducer-shaped surface: given a state and an intent, produce a new state plus a list of events describing what happened (`BrickTaken`, `TriplePopped`, `BricksWashed`, `RowRose`, `RunLost`). The shell animates from the events and re-renders from the state.

*Why:* every requirement in `board`, `matching-tray`, `colour-wash`, and `game-modes` becomes a plain function test. The scenarios in those specs map almost one-to-one onto test cases. *Alternative considered:* rules living in the view layer alongside rendering, which is faster to start and unmaintainable by the third mechanic — wash and undo interact, and that interaction needs to be testable in isolation.

### Render with DOM elements and CSS transforms, animated with FLIP

Each brick is a `<button>` carrying an inline `<svg>` icon, absolutely positioned via `transform: translate3d(...)`. Position changes are animated with the FLIP technique: measure before, apply the new state, measure after, animate the inverted delta with the Web Animations API and a spring-like easing.

*Why:* at 60 or so bricks the DOM is comfortable, and it hands us hit-testing, focus management, keyboard activation, and assistive-technology semantics for free — all of which `play-shell` requires and all of which would be hand-built work on canvas. Springy settle motion is a one-line easing change rather than a physics loop.

*Alternative considered:* Canvas 2D. Better particle and glow control and it scales past a thousand sprites, but it needs a hand-rolled render loop, hit-testing, an icon atlas pipeline, and an entirely parallel accessibility implementation. The board is too small for that trade to pay.

*Consequence:* the shell must keep a stable DOM node per brick across state updates, so bricks need stable identity.

### Bricks have stable identity

Every brick carries a unique id assigned at creation. State stores columns as arrays of brick ids, with brick records held in a separate map.

*Why:* FLIP needs to know that the node at position A is the same brick now at position B — without identity, a settle looks like a teleport. Identity also makes undo trivially correct (put brick `#47` back on column 3) and makes the assistive descriptions in `play-shell` stable across re-renders.

### Board geometry: 6 columns, ceiling of 10

Six columns divides evenly by three, which matters: a rising row is exactly one brick per column, so a row can be composed of two complete triples and the "counts are multiples of three" invariant in `board` holds per-row rather than only in aggregate. Six columns is also about the widest that keeps bricks thumb-sized in portrait.

*Alternative considered:* seven or eight columns for a wider board. Both break the per-row divisibility property and shrink bricks below comfortable tap size on a small phone.

### Tray size is set by measurement, not by genre convention

The tray holds fourteen bricks, laid out as two rows of seven, rather than the
genre-standard seven.

*Why:* the standard seven-slot tray belongs to layered tile games where dozens
of tiles are free at once and the player can hunt across the whole board for a
match. Here the free set is exactly one brick per column - six candidates at a
time - so a player must gather all copies of an icon type through a narrow
keyhole. A randomised player that always completes a triple when it can, builds
pairs only while the tray has slack, and otherwise favours types with copies
near the surface, cleared boards at these rates:

```
  tray slots:   7      9     10     12     14     16
  12 types:     0%     2%    10%    28%    53%    90%
```

Seven is not merely hard, it is unwinnable. Fourteen is where the game becomes
winnable while a careless line still loses. Sixteen makes it forgiving enough to
stop being a puzzle.

*Alternatives considered:* fewer icon types per level, which works well (six
types clears 52% on a seven-slot tray) but flattens the visual variety the
themes exist to provide. Widening the free set by making the top two bricks of
each column selectable, which also works but dissolves the stacked-column
identity that distinguishes this from the genre it borrows from.

*Consequence:* two tray rows cost vertical space, so bricks are smaller on the
narrowest supported phones. The layout still seats the full ten-row board and
both tray rows without scrolling at 320x568.

### Difficulty is tuned through icon type count

With the tray fixed, the campaign escalates by raising how many icon types a
level draws on: twelve for the opening levels through fifteen for the last. The
same greedy player clears the first level about half the time and the last about
one time in eight, with human judgement and the undo grant on top of that.

*Why:* icon type count is by far the strongest lever on difficulty, and unlike
board size it does not change the layout or the silhouette an author drew.

### Deterministic seeded randomness

All randomness flows through a small seeded PRNG stored in game state. Endless runs record their seed.

*Why:* reproducible runs make balance testing meaningful and bug reports replayable. It also means generation tests are stable rather than flaky.

### Generation guarantees no orphans, not winnability

Board and row generators build from a multiset of complete triples and then place them, so the divisibility invariant holds by construction rather than by post-hoc checking.

Note the honest limit: *no orphans* is weaker than *winnable*. A board can satisfy the invariant and still be unwinnable given a seven-slot tray and the top-of-column rule. Proving winnability requires search over an enormous state space and is not attempted.

*Mitigation:* campaign levels are hand-authored and playtested; endless difficulty is tuned by icon-type count rather than by solvability proofs; the undo resource absorbs the occasional dead end. This is a deliberate trade recorded here so it is not rediscovered as a bug.

### Wash state as a set of brick ids

Washed bricks are tracked as a set of ids on the state, not as a flag on the brick record.

*Why:* the wash lifecycle in `colour-wash` is "topmost and unclaimed" — an ephemeral property of the board configuration, not of the brick. A set makes clearing on selection and on burial a single removal, and makes the "washed exactly once per column" rule automatic through set semantics.

### Undo as a bounded snapshot stack

Each selection pushes a snapshot of the pre-selection state. Undo pops it. The stack is cleared whenever a triple pops, which is what enforces the `game-modes` requirement that undo cannot reverse a pop.

*Why:* snapshots over inverse-command replay. The state is small (tens of ids), snapshots are trivially correct, and inverse commands for a wash cascade would be genuinely fiddly to get right.

### Campaign levels as data

A level is a JSON-shaped record: id, theme id, an array of six column heights, an icon-type count, and an undo grant. No code per level.

*Why:* the `board` spec requires the authored silhouette be honoured exactly; making it data means the silhouette can be edited and playtested without a rebuild of logic, and level data can be validated by a test that checks the total brick count is divisible by three.

### Icons as an inline SVG sprite sheet

All icons for a theme ship as `<symbol>` elements in one inline sprite, referenced by `<use>`. Themes are data records pairing a set of icon ids with a palette and an accent hue.

*Why:* inline symbols inherit CSS custom properties, which is how the accent wash recolours a brick without swapping assets. External SVG files would need a fetch per icon and could not be recoloured as cheaply.

### Persistence: one versioned key, failure is non-fatal

Progress is a single versioned JSON record in `localStorage`. Every read and write is wrapped so that a private window, disabled storage, or a parse failure degrades to an in-memory session.

*Why:* `game-modes` requires the game stay fully playable when storage is unavailable. A version field means a future schema change can discard incompatible old data instead of crashing on it.

### Precache everything; never touch the network at runtime

The service worker precaches the full build output — application code, styles, icon sprite sheets, fonts, and level data — at install time, and serves every request cache-first. There is no runtime caching strategy, no stale-while-revalidate, no network fallback path.

*Why:* the entire asset set is known at build time and is small (a handful of sprite sheets and a single JS bundle). Precaching everything is what makes the `installable-app` requirement "themes are available offline" true for a theme the player has never reached — a lazy or runtime-cached strategy would leave level 9's icons missing for a player who installed at level 1 and then went offline. Cache-first with no network path also makes offline behaviour deterministic rather than dependent on connection state.

*Alternative considered:* caching on demand as levels are reached. Smaller initial download, but it makes offline capability depend on play history, which is exactly the failure the spec forbids.

### Generate the service worker and manifest at build time

Use Vite's PWA plugin (Workbox under the hood) to emit the manifest and a precache manifest with content hashes, rather than hand-writing a service worker.

*Why:* the one genuinely hard part of a hand-written service worker is cache invalidation — knowing which hashed asset filenames belong to which build. A generated precache manifest solves that correctly and for free. This is a build-time dependency only; nothing extra ships in the runtime bundle.

*Alternative considered:* a hand-written service worker, roughly forty lines. Attractive for a dependency-free repository, but it would need its own asset-hash plumbing wired into the Vite build, which is the plugin's whole job.

### Updates are deferred to a safe moment, never auto-applied

The service worker registers with manual update control. A newly installed worker waits rather than activating. The shell tracks whether a run is active; when an update is pending and the player is at a menu with no run in progress, the new worker is activated and the page reloads, showing a brief "updated" confirmation.

*Why:* the specs require that an update never disturb a run, and the failure mode being avoided is severe — a mid-run reload discards an endless run the player may have spent ten minutes on. Deferring to a menu boundary makes the swap invisible.

*Alternative considered:* prompting the player mid-run to update. It interrupts exactly the state that most needs protecting, and a player deep in a run has no useful basis for the decision. *Also considered:* immediate `skipWaiting` on every update, which is the common default and is precisely the mid-run reload being avoided.

*Consequence:* the core must expose whether a run is active. This is already derivable from game state, so no new state is introduced — but it is a real coupling between the shell's update logic and the core's mode state.

### Status bar tinting driven by the active theme

The `theme-color` meta value is updated when a level's theme changes, so in standalone mode the system status bar adopts the level's palette.

*Why:* `visual-theme` makes the whole screen shift mood per level; in standalone mode the status bar is part of the screen, and leaving it a fixed neutral colour breaks the effect at the top edge. It costs one attribute write per level.

### Safe area insets are a layout primitive, not a patch

The layout uses the viewport-fit cover meta setting and applies `env(safe-area-inset-*)` to interactive regions from the start, with the background painting edge to edge beneath.

*Why:* the tray is anchored to the bottom of the screen, which in standalone mode on a device with a home indicator is exactly where the system draws its own furniture. Retrofitting insets after the layout is built tends to mean reworking the tray's positioning, so it belongs in the first layout pass.

## Risks / Trade-offs

- **Icon sourcing is the real schedule risk.** 60–90 icons across five themes, consistent in stroke weight and visual language, all distinguishable by outline alone → source from one coherent open-licence line-icon family rather than mixing sets; verify the shape-only legibility requirement from `visual-theme` per theme before authoring levels against it.
- **Endless boards can be unwinnable.** Discussed above → tune by icon-type count, grant undos, accept that a rare dead end is survivable in a run-based mode.
- **Winnability was assumed rather than measured during planning, and the assumption was wrong.** The first playable build could not clear a single level → a randomised-player harness now runs in the test suite over every authored level, so any future change to board size, tray size or type count that makes a level unwinnable fails the build rather than reaching a player.
- **Chain and undo interact subtly.** Undo must restore the chain counter, not merely decrement it → the snapshot stack makes this correct by construction, and the interaction is covered by explicit tests rather than reasoning.
- **FLIP plus rapid taps can desynchronise.** A tap arriving mid-animation could measure a node in flight → read layout positions from state rather than from live geometry, and let in-flight animations be interrupted and re-targeted rather than queued.
- **DOM ceiling.** At roughly 60 bricks this is comfortable; a future mode with a much larger board would need the rendering layer replaced → the core/shell split means only the shell would change.
- **Difficulty is measured by a naive player, not a human.** The win rates above come from a greedy heuristic with no lookahead and no use of undo → treat them as a floor rather than the real experience, and expect to retune after a human playtest.
- **iOS installed apps may not share storage with the browser.** Progress made in Safari can be invisible to the installed app, so a player who plays in the browser then installs may appear to lose progress → surface the install affordance early, before meaningful progress accumulates, and treat this as a platform limitation to document rather than to work around.
- **iOS provides no programmatic install signal.** There is no `beforeinstallprompt`, so the install affordance cannot be triggered or confirmed the same way → detect standalone mode to hide the affordance once installed, and fall back to brief written guidance rather than rendering a control that does nothing.
- **A stale service worker can pin players to an old build.** If activation is deferred and the player never reaches a run-free menu state, they could stay on an old version indefinitely → the level-select and mode-select screens both qualify as safe moments, and every path out of a run passes through one.
- **Service workers make local development confusing.** A cached shell can mask code changes and produce phantom bugs → disable or bypass the service worker in the dev server configuration and enable it only for production builds and explicit preview runs.
- **HTTPS is now a deployment precondition.** Installability and service worker registration both require a secure context → constrain hosting choices to static HTTPS hosts, which is not a burden but must be settled before release rather than discovered at it.

## Migration Plan

No migration — greenfield repository, no existing users, no data to migrate.

One deployment note that is not migration but behaves like it: once a service worker has been served from an origin, it persists in returning players' browsers. A broken worker is therefore stickier than a broken page. Before the first production deploy, verify the update path works by deploying twice to a staging origin and confirming the second build activates.

## Open Questions

- How many campaign levels ship initially? Affects only how much level data is authored, not the architecture or the specs.
- Whether sound cues are added later. The event list from the core is already the correct hook point, so adding them changes no existing decision.
