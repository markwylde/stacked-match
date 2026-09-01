# Release checklist

Everything here is implemented and covered by automated tests as far as a test
can go. What remains is looking at it on real hardware, which no test can do.

These are **not** open work items — they were removed from the change task lists
so the changes could be archived. They belong to shipping, not to building.

## Before the first production deploy

- [ ] Serve over HTTPS. Service worker registration and installability both
      require a secure context, so this is a precondition, not a preference.
- [ ] Deploy twice to a staging origin and confirm the second build activates.
      A service worker persists in returning browsers, so a broken one is
      stickier than a broken page.

## On a real phone

- [ ] Icons are identifiable at the smallest brick size the layout produces.
      `npm run sheet` writes `docs/icon-sheet.html` for exactly this: open it on
      the device and use its colour toggle to check shape-only legibility.
- [ ] Taking a brick mid-animation resolves the selection. There is nothing in
      the code that blocks input during a transition, but only a real browser
      has real transitions.
- [ ] The tray sits above the home indicator and no control is obscured.
- [ ] A sustained endless run holds smooth animation.

## Installed app

- [ ] The launcher icon renders correctly masked on both Android and iOS, with
      no browser badge substituted for a missing asset.
- [ ] Cold start in airplane mode: the game loads and both modes are playable.
- [ ] Reach a level whose theme was never played before, offline, and confirm
      its icons render. The precache manifest is asserted to contain every
      theme's artwork, so this confirms the cache is actually being served.
- [ ] Progress written before a full app close is readable on relaunch.
- [ ] A version update discards stale cached assets, and a failed update check
      leaves the installed version fully playable.

## With a person

- [ ] Watch someone who has never seen the game play it with the tutorial, and
      note whether they can state the three core rules afterwards: only the top
      brick moves, three of a kind clears, the tray never empties on its own.
- [ ] Playtest the pacing. The constants were tuned against a simulated player
      with no lookahead and no undo, so the recorded win rates are a floor on
      the real experience rather than a forecast of it.
