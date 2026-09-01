## Context

See proposal.md — Why for motivation, and `specs/tutorial/spec.md` for the behaviour contract.

The relevant existing shape, from `add-stacked-match-game`:

- A pure core in `src/core` owns every rule. It exposes a reducer: state plus intent produces a new state and a list of events. It has no DOM access, enforced by a lint script.
- A shell in `src/shell` renders state and forwards input. `Stage` owns one absolutely-positioned layer holding every brick, keyed by stable brick id, positioned from state rather than measured.
- Boards are generated from an authored array of six column heights plus an icon type count. Campaign levels are plain data validated by `validateLevel`.
- Progress is a single versioned record read through an injected storage adapter, with every read and write guarded.

Two constraints follow from that shape and drive everything below. The tutorial must not add rules to the core, because the core's value is that it is exhaustively testable and every rule lives in one place. And a lesson must not be able to describe an outcome the game does not produce, because a tutorial that lies is worse than no tutorial.

## Goals / Non-Goals

**Goals:**
- Lessons authored as data, so a lesson can be added or reworded without touching logic.
- Every lesson verified against the real rules in the test suite, so a rules change that invalidates a lesson fails the build.
- Coaching that is legible without colour or sight, not a spotlight with a caption bolted on afterwards.
- Zero additions to the core reducer's state or events.

**Non-Goals:**
- A general-purpose tour or onboarding framework. This teaches one game.
- Branching lessons, or adapting to how the player is doing.
- Teaching strategy. Lessons cover the rules; how to play well is the player's to discover.
- Any change to scoring, level data, or progression.

## Decisions

### The tutorial is a shell-side gate over the real reducer

A lesson never dispatches on the player's behalf and never computes an outcome. The shell holds a small `TutorialSession` beside the game state; while a session is active, `Stage` renders one brick as nominated and the play screen refuses any selection that is not the nominated brick. An accepted selection goes through the same `step(state, {type:'select'})` call an ordinary tap makes.

```
   player tap
       |
       v
  +-------------------+   not nominated -> ignored, lesson holds
  | TutorialSession   |
  |  - current step   |
  |  - nominated id   |
  +---------+---------+
            | nominated
            v
      step(state, intent)      <- unchanged core
            |
            v
      state + events -> render, then advance the lesson step
```

*Why:* the specs require that a taught action produce exactly what the same action produces in ordinary play. Routing through the same reducer makes that true by construction rather than by keeping two implementations in agreement. It also keeps the core boundary lint clean and adds no new reducer state to test.

*Alternative considered:* a tutorial mode inside the core, with lesson state in `GameState`. It would make lessons replayable from a seed, but it puts presentation concerns into the rules layer and grows the state every core test has to reason about, for a feature that never changes an outcome.

### Lessons are data, and their boards are authored, not generated

A lesson is a record: an id, the mode and moment it triggers on, an authored board (per-column icon ids, floor upward), and an ordered list of steps. A step names the brick to nominate — by board position, not by id, since ids are allocated at deal time — plus its caption and the event it expects to result.

*Why:* the opening lessons need a board where the first three taps produce a triple, and that cannot be left to a generator. Authoring the exact icon layout is the only way to guarantee the lesson demonstrates what its caption claims. Keeping lessons as data matches how campaign levels already work, and means a wording change is a content edit.

*Consequence:* lesson boards bypass `dealBoard`'s triple-completeness invariant, since they are written brick by brick. A validator has to enforce the equivalent for them.

### Every lesson is executed in the test suite

A test walks each lesson: build its board, and for each step, assert the nominated position is currently free, dispatch it, and assert the events the step declares it expects actually occurred.

*Why:* this is the mechanism that keeps a lesson from teaching a lie. The `add-stacked-match-game` change learned this the expensive way — planning assumed the levels were winnable, nothing checked, and the first playable build could not clear a single one. A lesson that quietly stops matching the rules is the same class of failure, and the same kind of harness catches it. It also means a future rules change surfaces as a failing lesson rather than as confused players.

### Nomination is a rendering state, not a separate overlay

Rather than draw a spotlight layer above the board, the nominated brick takes a `data-nominated` attribute and every other brick dims. `Stage` already sets per-brick data attributes each render and already owns the only layer bricks live in.

*Why:* an overlay would have to track the brick's position independently, and the brick moves — it settles, it flies to the tray. Anything positioned separately has to chase it, which is exactly the coupling the layout design avoided by computing positions from state. Making nomination a property of the brick means it follows the brick for free.

*Consequence:* the caption cannot live on the brick, since a brick is 56px. It sits in a fixed coaching bar near the board with a pointer toward the nominated column.

### Accessibility is part of nomination, not a later pass

Nominating a brick sets three things together: the visual state, `aria-describedby` pointing at the caption, and the tab order — the nominated brick keeps `tabindex="0"` while every other brick drops to `-1`. The caption region is a live region, so advancing a step announces the new caption.

*Why:* the spotlight is purely visual, and the specs forbid coaching that is conveyed by appearance alone. Bricks are already real buttons with labels, so the honest implementation is to narrow the existing focus order rather than build a parallel mechanism. Doing it in the same place that sets the visual state is what stops the two drifting apart.

### Triggers are checked at level start only

Each lesson declares what it triggers on: first campaign level, second campaign level, first endless run. The check runs once when a level or run is created, against the persisted set of seen lesson ids.

*Why:* the specs forbid a lesson interrupting a run. Checking at one moment, on one code path, makes that structurally true rather than a rule to remember at each call site.

### Seen lessons extend the existing progress record

Lesson ids are added to the versioned progress record already in `localStorage`, behind the same guarded reads and writes, with the schema version bumped.

*Why:* a second storage key would need its own failure handling and its own version. The existing record already degrades to an in-memory session when storage is unavailable, which is exactly the behaviour the specs require here.

## Risks / Trade-offs

- **A tutorial gate makes the game feel locked.** Refusing every tap but one is the mechanism, and it can read as broken rather than instructive → a rejected tap must respond visibly, reusing the existing nudge, and skip must be reachable in one action from every step.
- **Lessons drift from the rules.** Captions are prose and prose does not typecheck → the per-step expected-event assertion is what catches drift; a step whose caption claims an outcome must declare that outcome as an expected event so the test can hold it.
- **The first-run experience becomes a wall.** Three lessons before the first level is already a delay before play → keep each lesson to a handful of steps, teach the rest later, and let a returning player who skips never see them again.
- **Authored lesson boards can go stale.** They bypass board generation, so a change to column count or the icon set could invalidate them silently → validate lesson boards the way `validateLevel` validates levels, including that every referenced icon exists in the named theme.
- **Nomination fights the wash.** A nominated brick and a washed brick both want to stand out, and the wash lesson has bricks that are both → give nomination a treatment that composes with the wash rather than replacing it, and check that pairing explicitly.
- **Keyboard and pointer paths can diverge.** Narrowing the tab order is a second gate beside the pointer gate → drive both from the same nominated id, and cover the keyboard path in tests rather than assuming it follows.

## Migration Plan

Not applicable. Additive feature, no stored data to migrate beyond a progress schema version bump, and an unreadable or outdated record already degrades to a fresh one.

## Open Questions

- Whether the how-to-play menu entry replays lessons on their scripted boards or annotates a live board. Scripted is assumed; changing it would not affect the lesson data or the gating.
