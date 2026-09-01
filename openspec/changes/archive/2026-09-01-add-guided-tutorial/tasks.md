Assumption recorded from design.md — Open Questions: the how-to-play menu entry replays lessons on their scripted boards rather than annotating a live board.

## 1. Lesson Data and Validation

- [x] 1.1 Define the lesson record type (id, trigger, theme, authored per-column icon layout, ordered steps with nominated position, caption and expected events) and verify the module type-checks with no DOM references
- [x] 1.2 Implement a lesson board builder that constructs a board from an authored icon layout rather than the generator, and verify a test asserts the built board matches the layout position for position
- [x] 1.3 Implement `validateLesson` covering column count, every referenced icon existing in the named theme, every step naming a position that exists, and at least one step per lesson, and verify tests for each rejection
- [x] 1.4 Implement the seen-lesson record as an addition to the versioned progress schema with the version bumped, and verify tests for round-tripping, for an outdated record being discarded, and for storage throwing on read and on write

## 2. Lesson Content

- [x] 2.1 Author the opening campaign lessons — only the top brick moves, taken bricks fill tray slots, three of a kind clears — and verify each passes `validateLesson`
- [x] 2.2 Author the tray-cap lesson explaining that slots do not come back until a triple clears, and verify it passes `validateLesson`
- [x] 2.3 Author the colour-wash and chain lessons on a board where a pop demonstrably washes newly exposed bricks, and verify they pass `validateLesson`
- [x] 2.4 Author the endless lessons for rising rows and the ceiling, and verify they pass `validateLesson`
- [x] 2.5 Verify by test that no lesson is authored against a mechanic unreachable in the mode it triggers in

## 3. Lesson Execution Harness

- [x] 3.1 Implement a headless lesson runner that builds a lesson's board and dispatches its steps through the core reducer, and verify it drives a lesson to completion without the DOM
- [x] 3.2 Verify by test that every step of every lesson nominates a brick that is free at that moment
- [x] 3.3 Verify by test that every step produces the events it declares it expects, so a caption cannot claim an outcome the rules do not produce
- [x] 3.4 Verify by test that a lesson's resulting state matches what the identical selections produce outside the tutorial

## 4. Tutorial Session

- [x] 4.1 Implement `TutorialSession` holding the active lesson, current step and nominated brick id, resolved from board position at deal time, and verify tests for advancing, completing and reporting the nominated id
- [x] 4.2 Implement selection gating so only the nominated brick is accepted, and verify tests that a non-nominated selection leaves board, tray and step unchanged
- [x] 4.3 Implement the blocked-brick explanation so selecting a buried brick during a lesson explains the top-of-column rule, and verify the lesson holds its step
- [x] 4.4 Verify by test that a lesson never advances on the passage of time and has no failure state
- [x] 4.5 Verify by test that the session takes no action on the player's behalf — every board change follows a player selection

## 5. Coaching Presentation

- [x] 5.1 Render the nominated brick with a distinguishing state on the brick itself so it follows the brick as it settles and flies, and verify the state persists across re-renders and position changes
- [x] 5.2 Dim non-nominated bricks while a lesson step is active, and verify the treatment composes with a washed brick rather than replacing it
- [x] 5.3 Implement the coaching caption bar positioned near the board with a pointer toward the nominated column, and verify it tracks the nominated column as steps advance
- [x] 5.4 Verify all coaching is cleared when a lesson ends and every legal brick becomes selectable again
- [x] 5.5 Verify the coaching bar wraps long captions without clipping and without the page scrolling sideways on the narrowest supported viewport

## 6. Accessibility

- [x] 6.1 Expose the nominated brick to assistive technology as the brick to act on, and verify the description distinguishes it from other bricks
- [x] 6.2 Make the caption region a live region and verify advancing a step announces the new caption
- [x] 6.3 Narrow the tab order so only the nominated brick is focusable during a lesson, and verify focus skips every other brick
- [x] 6.4 Verify a full lesson can be completed using only the keyboard, driven from the same nominated id as the pointer path
- [x] 6.5 Verify the nominated state remains perceptible with colour removed and under `prefers-reduced-motion`

## 7. Triggering, Skip and Replay

- [x] 7.1 Implement trigger resolution at level and run creation only, matched against the persisted seen-lesson set, and verify tests for each trigger firing once and not again
- [x] 7.2 Verify by test that no lesson begins partway through a level or endless run
- [x] 7.3 Implement skip as a single action available on every step, dismissing all future automatic lessons, and verify ordinary play resumes immediately
- [x] 7.4 Implement the how-to-play menu entry that replays every lesson from the beginning regardless of what was seen or skipped, and verify campaign progress, unlocked levels and best endless score are unchanged afterwards
- [x] 7.5 Verify a completed lesson does not return in a later session while an unseen lesson still appears when its mode is first reached

## 8. Integration and Release

- [x] 8.1 Wire the tutorial into the play screen end to end and verify a new player is taught the opening lessons, reaches the wash lessons on the second level, and reaches the rising-row lessons on a first endless run
- [x] 8.2 Verify the full test suite, the production build, the core boundary check and the PWA output check all pass with the tutorial in place
