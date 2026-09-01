## Purpose

Teaches the rules of the game by having the player perform them: short scripted lessons on purpose-built boards that spotlight one brick, explain what it is about to teach, and wait until the player does it.

## ADDED Requirements

### Requirement: Lessons are hands-on and gated
A lesson SHALL nominate exactly one legal action and SHALL NOT advance until the player performs it. While a lesson is active, only the nominated brick SHALL be selectable, and the lesson SHALL wait indefinitely with no timer and no failure state.

#### Scenario: Lesson advances only on the taught action
- **WHEN** a lesson nominates a brick and the player selects that brick
- **THEN** the action resolves normally and the lesson advances to its next step

#### Scenario: Other bricks are inert during a lesson
- **WHEN** a lesson is active and the player selects a brick other than the nominated one
- **THEN** no brick is taken, the board is unchanged, and the lesson remains on its current step

#### Scenario: A lesson never times out
- **WHEN** a lesson is active and the player takes no action for any length of time
- **THEN** the lesson remains on its current step and nothing advances, expires, or fails

#### Scenario: Selecting a blocked brick explains why
- **WHEN** the player selects a brick that has another brick above it while a lesson is active
- **THEN** the game explains that only the top brick of a column can be taken, and the lesson remains on its current step

### Requirement: Coaching is shown at the point of action
While a lesson step is active, the game SHALL visually distinguish the nominated brick from the rest of the board and SHALL display a short caption describing the action being taught, positioned near the nominated brick rather than detached from it.

#### Scenario: The nominated brick is distinguished
- **WHEN** a lesson step is active
- **THEN** the nominated brick is rendered so as to stand out from every other brick on the board

#### Scenario: A caption accompanies each step
- **WHEN** a lesson step is active
- **THEN** a caption is displayed stating what the player should do and why it matters

#### Scenario: Coaching clears when the lesson ends
- **WHEN** the final step of a lesson completes
- **THEN** no brick remains distinguished, no caption remains displayed, and every legal brick becomes selectable again

### Requirement: Coaching is not conveyed by appearance alone
Coaching SHALL be available to players who cannot perceive the visual spotlight. The nominated brick SHALL be exposed to assistive technology as the one to act on, the caption SHALL be announced when it changes, and the nominated brick SHALL be reachable and activatable by keyboard.

#### Scenario: The nominated brick is announced
- **WHEN** assistive technology inspects the board during a lesson step
- **THEN** the nominated brick is identified as the brick to act on

#### Scenario: Caption changes are announced
- **WHEN** a lesson advances to a step with a new caption
- **THEN** that caption is announced to assistive technology

#### Scenario: Lessons are completable by keyboard
- **WHEN** the player uses only a keyboard during a lesson
- **THEN** focus reaches the nominated brick and activating it advances the lesson

### Requirement: Lessons teach every rule, in the order each becomes relevant
The tutorial SHALL cover the top-of-column rule, the tray and its cap, clearing three of a kind, the colour wash, chains, rising rows, and the ceiling. Each lesson SHALL be presented no earlier than the point at which the mechanic it teaches can first occur in play.

#### Scenario: Opening lessons precede the first campaign level
- **WHEN** a player begins their first campaign level
- **THEN** they are first taught that only the top brick of a column can be taken, that taken bricks occupy tray slots, and that three of a kind clears

#### Scenario: Wash and chains are taught when they can first be earned
- **WHEN** a player reaches the point where the colour wash first applies
- **THEN** they are taught that a pop washes newly exposed bricks and that taking washed bricks in succession builds a chain

#### Scenario: Rising rows are taught in endless mode
- **WHEN** a player begins their first endless run
- **THEN** they are taught that clearing triples pushes a new row up from the floor and that a column reaching the ceiling ends the run

#### Scenario: No lesson precedes its mechanic
- **WHEN** any lesson is presented
- **THEN** the mechanic it teaches is reachable in the mode the player is currently in

### Requirement: Lessons run on the real game
Lessons SHALL be played on the game's own board using its own rules, dispatching the same intents an ordinary selection dispatches. The tutorial SHALL NOT introduce rules, outcomes, or animations that do not occur in ordinary play.

#### Scenario: A taught action behaves exactly as in play
- **WHEN** the player performs the action a lesson nominates
- **THEN** the resulting board, tray, score, and wash state are identical to what the same action would produce outside the tutorial

#### Scenario: Lessons cannot demonstrate impossible behaviour
- **WHEN** a lesson's scripted board and step sequence are checked against the game's rules
- **THEN** every nominated action is legal and every outcome the lesson describes is one the rules actually produce

### Requirement: The tutorial is skippable and replayable
The player SHALL be able to dismiss the tutorial in a single action from any lesson, after which no lesson is presented automatically again. The full set of lessons SHALL remain available to replay on demand from the main menu.

#### Scenario: Skipping dismisses all future lessons
- **WHEN** the player skips a lesson
- **THEN** that lesson ends immediately, ordinary play resumes, and no further lesson is presented automatically

#### Scenario: Lessons can be replayed deliberately
- **WHEN** the player chooses the how-to-play option from the menu
- **THEN** the lessons are presented again from the beginning, whether or not they were previously seen or skipped

#### Scenario: Replay does not disturb progress
- **WHEN** the player replays the lessons
- **THEN** campaign progress, unlocked levels, and the best endless score are unchanged

### Requirement: Seen lessons are remembered
The game SHALL record which lessons the player has completed or skipped, and SHALL persist that record so lessons are not repeated in a later session.

#### Scenario: A completed lesson does not return
- **WHEN** the player completes a lesson, closes the game, and returns later to the same mode
- **THEN** that lesson is not presented again

#### Scenario: Unseen lessons still appear
- **WHEN** the player has completed the opening lessons but never reached endless mode, and then starts an endless run
- **THEN** the lessons for rising rows and the ceiling are presented

#### Scenario: Storage unavailable
- **WHEN** the record of seen lessons cannot be read or written
- **THEN** the game remains fully playable and lessons are presented as they would be for a new player, without any error blocking play

### Requirement: The tutorial never interrupts a run in progress
A lesson SHALL only begin at the start of a level or run, never partway through one, and SHALL never take a brick, alter the tray, or change the score on the player's behalf.

#### Scenario: No lesson mid-run
- **WHEN** a player is partway through a level or endless run
- **THEN** no lesson begins, regardless of what mechanic occurs

#### Scenario: The tutorial makes no moves
- **WHEN** any lesson is active
- **THEN** every change to the board results from an action the player performed
