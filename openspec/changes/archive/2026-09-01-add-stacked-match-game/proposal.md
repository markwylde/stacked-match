## Why

There is no product here yet — this repository is empty. This change establishes the whole game: a stacked brick-matching puzzle that is vibrant and relaxing to look at, but carries a real strategic squeeze underneath.

The genre it sits in (tray-based triple matching) is popular but widely disliked for two reasons: hidden tiles make deaths feel unfair, and real-time pressure makes play stressful. This design removes both. Every brick is visible at all times, and the board only advances when *you* clear a match — there is no clock. The tension comes from a strategic dilemma rather than from adrenaline, which is what makes it relaxing without being boring.

## What Changes

- **New game, from an empty repository.** Phone-first web game built with TypeScript and Vite, rendering bricks as DOM elements animated with CSS transforms. No engine or UI framework.
- **A columnar board of bricks.** Bricks stack in columns. Only the top brick of a column is selectable. When a brick is removed the column settles downward with a spring. Nothing is ever hidden — the board is fully open information.
- **A fourteen-slot tray with match-three.** Tapping a free brick moves it into the tray, laid out as two rows of seven. Three of a kind in the tray pop and free their slots. Filling every slot ends the run. The tray is deliberately larger than the genre norm because only one brick per column is ever free, so the player cannot hunt across the board for a match.
- **Colour wash chains — the signature mechanic.** When a triple pops, the brick newly exposed at the top of each source column is "washed" into the level's accent hue. Taking a washed brick next awards a chain bonus and washes onward, so the board visibly ripples after every match and rewards reading sequences instead of single taps.
- **Two modes.** *Campaign* uses hand-authored finite boards arranged into shapes (a cat, a wave, an arch); clearing every brick wins the level. *Endless* pushes a new row up from the floor every third triple cleared, so progress and danger are the same action, and the run continues until the tray fills or a column reaches the ceiling.
- **Per-level icon themes.** Each level draws 12–18 colour-filled line icons from a single themed set with a coordinated palette (garden, kitchen, ocean, space, café). The entire screen changes mood as the player progresses — this is where the "vibrant" lives.
- **Progress persists locally.** Campaign completion, best endless run, and settings survive a reload without any account or server.
- **Installable, offline, client-only.** The game ships as a PWA: installable to the home screen, launching standalone in portrait with no browser chrome, and fully playable with no network connection after first load. There is no server component of any kind.

## Capabilities

### New Capabilities
- `board`: Columnar brick stacks, the top-of-column selection rule, gravity settling, and both board generators (hand-authored shaped boards and the endless rising row).
- `matching-tray`: The fourteen-slot tray, brick intake, three-of-a-kind detection and clearing, the tray-full loss condition, and the requirement that authored levels are winnable in practice.
- `colour-wash`: The signature chain mechanic — washing newly exposed bricks after a pop, chain detection, chain scoring, and chain decay.
- `game-modes`: Campaign and endless modes, level progression, win and loss resolution, scoring, and the undo resource.
- `visual-theme`: Themed icon sets, per-level palettes, and the rules binding a level to its icon set and accent hue.
- `play-shell`: Phone-first portrait layout, touch and pointer input, brick and settle animation, and accessibility affordances.
- `installable-app`: Web app manifest and install affordance, offline-first asset caching, standalone launch behaviour, and safe version updating that never interrupts a run.

### Modified Capabilities
_None — this is the first change in the repository._

## Impact

- **Repository:** creates the entire source tree, build configuration, and asset pipeline from nothing.
- **Dependencies:** TypeScript and Vite for build and dev server; a test runner for game-logic unit tests; a build-time service worker and manifest generator. No game engine, no UI framework, no runtime dependencies in the shipped bundle beyond the game itself.
- **Assets:** requires an SVG line-icon library of roughly 60–90 icons grouped into 5 or more themed sets, plus a palette per theme. Icon sourcing and licensing is a real dependency of the campaign.
- **Storage:** browser local storage for progress and settings, plus a service worker cache holding the entire application shell and all icon assets. No backend, no accounts, no runtime network calls.
- **Hosting:** requires static hosting over HTTPS, which is a precondition of service worker registration and installability. No server-side runtime.
- **Assets:** additionally requires app icons at the sizes required for installation, including a maskable variant, and an Apple touch icon.
- **Non-goals for this change:** monetisation, leaderboards, multiplayer, sound design beyond basic feedback cues, app store packaging, push notifications, background sync, and cross-device progress sync.
