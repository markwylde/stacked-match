Assumption recorded from design.md — Open Questions: the initial campaign ships **10 levels across 5 themes** (2 levels per theme). Sound is out of scope for this change.

## 1. Project Setup

- [x] 1.1 Initialise the TypeScript + Vite project with strict compiler options, and verify `npm run build` and `npm run dev` both succeed on an empty entry point
- [x] 1.2 Add and configure a test runner with a Node (non-DOM) environment for core tests, and verify a trivial placeholder test passes via `npm test`
- [x] 1.3 Create the `core/` and `shell/` directory split with a lint rule or documented boundary forbidding DOM imports inside `core/`, and verify a deliberate DOM import in `core/` is reported
- [x] 1.4 Add the Vite PWA plugin configured to stay disabled in the dev server and active for production builds, and verify `npm run dev` registers no service worker while a production preview does

## 2. Core Primitives

- [x] 2.1 Implement the seeded PRNG and verify unit tests confirm identical sequences from identical seeds and divergence from different seeds
- [x] 2.2 Define the brick record, stable brick id allocation, and the game state shape (columns of ids, brick map, tray, wash set, chain, score, mode), and verify a state-construction test asserts the invariants
- [x] 2.3 Centralise tuning constants (6 columns, ceiling 10, 7 tray slots, rise every 3 triples, 12–18 icon types) in one module, and verify tests read these constants rather than hard-coded numbers
- [x] 2.4 Define the event union (`BrickTaken`, `TriplePopped`, `BricksWashed`, `RowRose`, `RunLost`, `LevelWon`) and the reducer signature, and verify the module type-checks with no DOM references

## 3. Board Capability

- [x] 3.1 Implement column storage with the contiguous-from-floor invariant and verify tests covering the `board` spec's structure scenarios
- [x] 3.2 Implement top-of-column freeness and selection rejection for blocked bricks, and verify tests for taking a free brick, rejecting a blocked brick, and the empty-column case
- [x] 3.3 Implement gravity settling on removal, and verify tests assert remaining bricks occupy the lowest positions and never change column
- [x] 3.4 Implement the triple-multiset generator guaranteeing every icon type appears in multiples of three, and verify a property test over many seeds asserts divisibility
- [x] 3.5 Implement shaped campaign board generation from an authored column-height array, and verify tests confirm per-column counts match the layout exactly and no rows ever rise
- [x] 3.6 Implement the endless rising row (one brick per column, composed of complete triples, inserted at the floor lifting existing bricks), and verify tests for the third-clear trigger, the lift-by-one behaviour, and that idle time triggers nothing
- [x] 3.7 Implement the ceiling loss condition, and verify tests for exceeding the ceiling losing and filling exactly to the ceiling continuing

## 4. Matching Tray Capability

- [x] 4.1 Implement tray intake into the seven slots with grouping by icon type, and verify tests assert matching bricks render adjacently regardless of arrival order
- [x] 4.2 Implement immediate three-of-a-kind detection and clearing, and verify tests for a triple popping, a pair not popping, and other icon types remaining untouched
- [x] 4.3 Implement the tray-full loss condition, and verify tests for the seventh slot filling without a match losing and the seventh slot completing a triple continuing play

## 5. Colour Wash Capability

- [x] 5.1 Implement wash marking of newly exposed top bricks on each source column after a pop, and verify tests for three distinct source columns, an emptied source column, and a repeated source column washing exactly once
- [x] 5.2 Verify by test that washing is cosmetic only — a washed brick still matches its own icon type and two washed bricks of different types do not match
- [x] 5.3 Implement the chain counter with increment on washed selection, reset on unwashed selection, and a bonus that grows with the counter, and verify tests for all three behaviours
- [x] 5.4 Implement wash-state clearing on selection and on burial by a rising row, and verify tests confirm no residual chain effect in either case
- [x] 5.5 Verify by test that the chain counter starts at zero for every new level and run and carries across neither

## 6. Game Modes Capability

- [x] 6.1 Implement campaign level resolution (board empty and tray empty wins; tray full loses) and verify tests for both outcomes
- [x] 6.2 Implement endless run resolution against both loss conditions with final score reporting, and verify tests for continuation and for each ending path
- [x] 6.3 Implement sequential level unlocking with the first level always playable, and verify tests for unlocking on first win, rejecting a locked level, and replaying a won level
- [x] 6.4 Implement the bounded undo snapshot stack, cleared on every pop, and verify tests for restoring the brick and chain, exhausting the grant, the empty-tray no-op, and undo being unavailable after a pop
- [x] 6.5 Implement scoring for triples plus the chain bonus, and verify tests assert a chained pop scores strictly higher than an unchained one
- [x] 6.6 Implement versioned `localStorage` persistence for campaign progress, best endless score, and settings, with all reads and writes guarded, and verify tests for progress surviving a reload, best score updating, and the game staying playable when storage throws

## 7. Visual Theme Capability

- [x] 7.1 Source an open-licence line-icon family and assemble 5 themes of 12–18 icons each into inline SVG sprite sheets, and verify the licence permits redistribution and is recorded in the repository
- [x] 7.2 Define theme records pairing icon ids with a palette and an accent hue, and verify a test asserts every theme has an icon count within 12–18 and a defined accent
- [x] 7.3 Implement accent recolouring of a washed brick via CSS custom properties on the inline symbol, and verify a washed brick is visibly distinct from unwashed bricks on the same board
- [x] 7.4 Audit every theme for shape-only legibility with colour removed and for no two icons differing only by fill, and verify by recording the audit result per theme

## 8. Play Shell

- [x] 8.1 Implement the portrait layout with the board above and the tray anchored at the bottom, and verify the full board and all seven slots are visible without scrolling on a phone-sized viewport and the layout scales up on a desktop viewport
- [x] 8.2 Render bricks as focusable `<button>` elements with inline `<svg>` icons positioned by `translate3d`, keyed by stable brick id, and verify nodes persist across state updates rather than being recreated
- [x] 8.3 Implement tap and click selection with a drag threshold that suppresses selection, and verify tests for tap selecting, drag not selecting, and rapid successive taps resolving in order with none lost or duplicated
- [x] 8.4 Implement FLIP animation driven by core events for take, settle, pop, wash, and rise, reading target positions from state rather than live geometry, and verify in-flight animations are interrupted and re-targeted rather than queued
- [x] 8.6 Implement `prefers-reduced-motion` handling that replaces travel animation with immediate or fade transitions, and verify the game remains fully playable and state changes stay legible
- [x] 8.7 Implement keyboard reachability limited to currently selectable bricks, with assistive descriptions exposing icon type, column, and wash state, and verify keyboard activation matches tap and focus skips blocked bricks
- [x] 8.8 Implement the persistent HUD showing score, remaining undos, and the endless rise countdown, and verify the countdown reads two remaining after one triple since the last rise

## 9. Campaign Content

- [x] 9.1 Author the level data format (id, theme id, six column heights, icon-type count, undo grant) and a validator, and verify the validator rejects a layout whose total brick count is not divisible by three
- [x] 9.2 Author 10 campaign levels across the 5 themes with deliberate silhouettes and a rising difficulty curve, and verify every level passes the validator
- [x] 9.3 Implement the level select screen reflecting locked, unlocked, and won states, and verify it matches persisted progress after a reload

## 10. Installable App

- [x] 10.1 Author the web app manifest with name, short name, standalone display, portrait orientation, theme colour, and background colour, and verify `npm run verify:pwa` confirms every field and icon size installability requires
- [x] 10.2 Produce the app icon set at every size required for installation including a maskable variant and an Apple touch icon, and verify every declared icon is present in the build with the maskable purpose set
- [x] 10.3 Configure precaching of the complete build output — code, styles, all theme sprite sheets, fonts, and level data — and verify the generated precache manifest lists every theme's assets, not only those used by early levels
- [x] 10.6 Expose whether a run is active from the core and implement deferred service worker activation that waits for a run-free menu state, and verify a new version made available mid-run leaves the run undisturbed and activates on return to a menu with a brief confirmation
- [x] 10.8 Implement the install affordance gated on the browser's install signal, hidden in standalone mode, dismissible with the dismissal persisted, and falling back to written guidance where no programmatic signal exists, and verify each of those four behaviours
- [x] 10.9 Implement viewport-fit cover and safe area insets on interactive regions with a full-bleed background, and verify tests assert all four edges are inset, the toast clears the home indicator, and the background stays full-bleed
- [x] 10.10 Implement per-level status bar tinting from the active theme with a default outside levels, and verify the standalone status bar colour changes when entering a level of a different theme
- [x] 10.11 Verify progress written before a full app close is readable on relaunch while offline, and document the iOS browser-versus-installed storage separation in the repository

## 11. Integration and Release

- [x] 11.1 Wire the shell to the core end to end for both modes and verify end-to-end tests drive real clicks on real brick elements to a campaign win, a tray-full loss and an endless run ending
- [x] 11.2 Retune the pacing constants (rise cadence, tray size, icon-type count, undo grant) against a simulated player and verify the tuned values and their measured win rates are recorded in the constants module
