## Purpose

Defines the two ways the game is played — a finite hand-authored campaign and an endless rising run — along with scoring, the undo resource, win and loss resolution, and what persists between sessions.

## ADDED Requirements

### Requirement: Campaign mode
Campaign mode SHALL present hand-authored finite levels in a fixed order. A level is won when every brick has been removed from the board and the tray is empty.

#### Scenario: Level won
- **WHEN** the last brick on a campaign board is cleared as part of a triple and the tray is empty
- **THEN** the level is marked won and the player is offered the next level

#### Scenario: Level lost
- **WHEN** the tray fills with no triple completing during a campaign level
- **THEN** the level ends in a loss and the player is offered to retry that same level

#### Scenario: No rising rows in campaign
- **WHEN** any number of triples are cleared during a campaign level
- **THEN** no rows rise and the board only ever shrinks

### Requirement: Endless mode
Endless mode SHALL generate a starting board and continue indefinitely, rising a row every third triple cleared, until the tray fills or a column exceeds the ceiling.

#### Scenario: Run continues
- **WHEN** the player clears a triple in endless mode and neither loss condition is met
- **THEN** the run continues and the score updates

#### Scenario: Run ends
- **WHEN** either the tray fills without a match or a rising row exceeds the ceiling
- **THEN** the run ends, the final score is shown, and it is compared against the stored best

### Requirement: Level progression
Campaign levels SHALL unlock in sequence: a level is playable only once the preceding level has been won. The first level SHALL always be playable.

#### Scenario: Next level unlocks
- **WHEN** the player wins a campaign level for the first time
- **THEN** the following level becomes playable

#### Scenario: Locked level rejected
- **WHEN** the player selects a level whose predecessor has not been won
- **THEN** the level does not start and is shown as locked

#### Scenario: Won level replayable
- **WHEN** the player selects a level they have already won
- **THEN** the level starts normally

### Requirement: Undo resource
Each level or run SHALL grant a limited number of undos. An undo SHALL return the most recently taken brick from the tray to the top of the column it came from, reversing any chain change that selection caused.

#### Scenario: Undo returns the brick
- **WHEN** the player uses an undo after taking a brick
- **THEN** that brick returns to the top of its original column, its tray slot is freed, and the chain counter returns to its prior value

#### Scenario: Undo exhausted
- **WHEN** the player has used all granted undos
- **THEN** the undo control is unavailable for the remainder of that level or run

#### Scenario: Nothing to undo
- **WHEN** the player uses an undo with an empty tray and no prior selection
- **THEN** no state changes and no undo is consumed

#### Scenario: Undo cannot reverse a pop
- **WHEN** the most recent selection completed a triple that popped
- **THEN** undo is unavailable for that selection

### Requirement: Scoring
The game SHALL award points for each triple cleared, plus the chain bonus defined by the colour-wash capability. Endless runs SHALL track a score for the run; campaign levels SHALL track a score for the level.

#### Scenario: Triple scores
- **WHEN** a triple pops
- **THEN** the run or level score increases by at least the base triple value

#### Scenario: Chain adds to score
- **WHEN** a triple pops during an active chain
- **THEN** the score increase exceeds the base triple value

### Requirement: Local progress persistence
The game SHALL store campaign progress, the best endless score, and player settings in the browser so they survive a reload. No account or network service SHALL be required.

#### Scenario: Progress survives reload
- **WHEN** the player wins a level and then reloads the game
- **THEN** that level remains marked won and the next level remains unlocked

#### Scenario: Best score retained
- **WHEN** an endless run ends with a score above the stored best
- **THEN** the stored best is updated and shown on subsequent visits

#### Scenario: Storage unavailable
- **WHEN** browser storage cannot be read or written
- **THEN** the game remains fully playable for the session and does not present an error that blocks play
