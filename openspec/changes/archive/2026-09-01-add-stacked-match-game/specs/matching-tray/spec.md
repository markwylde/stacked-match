## Purpose

Defines the holding area where selected bricks accumulate, how three-of-a-kind sets resolve, and the commitment pressure that makes careless selection costly.

## ADDED Requirements

### Requirement: Fourteen-slot tray
The tray SHALL provide exactly fourteen slots, presented as two rows of seven so that each slot stays large enough for comfortable thumb use on a phone. Each brick taken from the board SHALL occupy one slot until it is cleared as part of a triple.

The size is set by playability rather than by convention: only one brick per column is ever free, so the player can never hunt across the board for a match, and a smaller tray jams before a triple can form.

#### Scenario: Brick enters the tray
- **WHEN** the player takes a free brick from the board
- **THEN** that brick occupies one previously empty tray slot and the number of free slots decreases by one

#### Scenario: Tray is presented in two rows
- **WHEN** the tray is rendered
- **THEN** its fourteen slots are laid out as two rows of seven

#### Scenario: Selection blocked when tray is full
- **WHEN** all fourteen slots are occupied and no triple is present
- **THEN** the run has already ended in a loss and no further selection is accepted

### Requirement: A level must be winnable in practice
Every authored campaign level SHALL be clearable: there SHALL exist at least one sequence of legal selections that empties the board without the tray filling. The combination of board size, icon type count and tray size SHALL be chosen so that this holds.

#### Scenario: Every campaign level can be cleared
- **WHEN** each authored campaign level is played by a player that completes a triple whenever one is available, builds pairs only while the tray has slack, and otherwise favours icon types with copies near the surface
- **THEN** that player clears the level on at least some deals rather than never

### Requirement: Tray groups bricks by icon type
The tray SHALL display bricks grouped so that all bricks sharing an icon type sit adjacently, making a pending pair immediately legible to the player.

#### Scenario: Matching bricks sit together
- **WHEN** the tray holds two bricks of one icon type separated in arrival order by a brick of another type
- **THEN** the two matching bricks are displayed adjacent to one another

### Requirement: Three of a kind clears
Whenever the tray holds three bricks of the same icon type, those three bricks SHALL be removed from the tray immediately and their slots returned to the free pool.

#### Scenario: Triple pops
- **WHEN** a third brick of an icon type enters the tray
- **THEN** all three bricks of that type are removed from the tray and three slots become free

#### Scenario: Pair does not pop
- **WHEN** the tray holds exactly two bricks of an icon type
- **THEN** those bricks remain in the tray

#### Scenario: Only the completed type clears
- **WHEN** a triple of one icon type pops while other bricks are in the tray
- **THEN** bricks of other icon types remain in the tray untouched

### Requirement: Tray-full loss condition
If a brick enters the tray, no triple completes, and every slot is then occupied, the run SHALL end in a loss.

#### Scenario: Last slot fills with no match
- **WHEN** the final free slot is filled by a brick that does not complete a triple
- **THEN** the run ends in a loss

#### Scenario: Last slot fills but completes a triple
- **WHEN** the final free slot is filled by a brick that completes a triple
- **THEN** the triple pops, three slots become free, and play continues
