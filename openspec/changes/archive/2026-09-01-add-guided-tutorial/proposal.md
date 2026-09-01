## Why

Nothing on screen explains how the game works, and the rules are not guessable from looking at it. A player sees a stack of colourful bricks and a row of empty slots. Three things they cannot know are the three things that matter: that only the top brick of each column can be taken, that three of a kind clears rather than two, and that the tray is a hard cap with no way to put a brick back.

This is not a hypothetical risk. The person who commissioned the game, having seen it built, could not describe how to play it. If the brief's author cannot, a first-time player certainly cannot.

The problem is worse here than in the genre this borrows from. A player arriving from a tile-matching game brings expectations that are actively wrong: they expect many tiles to be selectable at once, they expect pairs, and they have never seen the colour wash or a board that grows when they succeed. Prior experience misleads rather than helps.

## What Changes

- **A guided hands-on tutorial.** Short scripted lessons on purpose-built boards. The game highlights exactly one brick, explains what it is about to teach, and waits. Nothing advances until the player performs the action themselves.
- **Lessons arrive when each rule first matters**, not all at once before the first level. The opening teaches the top-of-column rule, the tray, and matching three. Colour wash and chains are taught on the second campaign level. Rising rows and the ceiling are taught on the first endless run. No lesson appears before the mechanic it describes is reachable.
- **Coaching is spatial, not textual.** The brick to tap is spotlit and the rest of the board dims. A short caption sits near the action rather than in a wall of text. There is no timer and no penalty: a lesson waits indefinitely.
- **Wrong taps teach rather than fail.** Tapping a buried brick during a lesson explains why it cannot move instead of silently refusing.
- **Every lesson is skippable and replayable.** A player who already understands can dismiss the tutorial permanently in one action, and any player can replay the full set from a "How to play" entry in the menu.
- **The tutorial drives the real game.** Lessons play on the actual board with the actual rules, through the same core the campaign uses. Nothing is faked or re-implemented, so a lesson can never teach behaviour the game does not have.
- **Seen lessons persist**, so the tutorial never repeats itself across sessions and never interrupts a returning player.

## Capabilities

### New Capabilities
- `tutorial`: Lesson definitions and their scripted boards, the coaching overlay and its spotlight, the gating that holds a lesson until the taught action is performed, when each lesson triggers, and the skip and replay affordances.

### Modified Capabilities
_None. The capabilities introduced by `add-stacked-match-game` have not been archived into `openspec/specs/`, so there is no main spec to delta against. This change is additive: it consumes the existing board, tray, colour-wash and game-mode behaviour without altering any of it._

## Impact

- **Depends on** the `add-stacked-match-game` change. The tutorial reads game state and dispatches the same intents the player does; if the underlying rules change, lessons must be re-checked against them.
- **Affected code:** a new lesson content module alongside the campaign data; a coaching overlay in the shell; a hook in the play screen to gate selection while a lesson is active; an addition to the stored progress record for lessons already seen.
- **Explicitly unaffected:** the game core. The tutorial introduces no new rules and no new state in the reducer, so no existing behaviour or test changes.
- **Accessibility:** the spotlight cannot be the only signal, since it is purely visual. Coaching must also be announced to assistive technology and reachable by keyboard, consistent with how the board already works.
- **Non-goals for this change:** video or animated cutscenes, voiceover, translated copy, a searchable rules reference, difficulty adjustment for new players, and any change to scoring or level progression.
