## Purpose

Defines the game's signature mechanic: after a triple pops, the bricks it newly exposed are washed into the level's accent hue, rewarding players who read the board as sequences rather than isolated taps.

## ADDED Requirements

### Requirement: Popping a triple washes newly exposed bricks
When a triple clears, the board SHALL mark as washed the brick now topmost in each column that one of the three cleared bricks came from, provided that column is still non-empty.

#### Scenario: Three distinct source columns
- **WHEN** a triple pops whose three bricks came from three different non-empty columns
- **THEN** the topmost brick of each of those three columns is marked washed

#### Scenario: Source column is now empty
- **WHEN** a triple pops and one source column has no bricks remaining
- **THEN** no brick is washed for that column and the remaining source columns still wash normally

#### Scenario: Repeated source column
- **WHEN** two of the three cleared bricks came from the same column
- **THEN** that column's new topmost brick is washed exactly once

### Requirement: Washing is cosmetic and does not alter identity
A washed brick SHALL retain its original icon type for all matching purposes. Washing SHALL only change the brick's rendered accent treatment and its chain eligibility.

#### Scenario: Washed brick still matches its own type
- **WHEN** a washed brick is taken into the tray alongside two unwashed bricks of the same icon type
- **THEN** the three bricks form a valid triple and pop

#### Scenario: Washed bricks of different types do not match
- **WHEN** two washed bricks of different icon types are in the tray
- **THEN** they do not match each other

### Requirement: Taking a washed brick extends the chain
Taking a washed brick SHALL increment the run's chain counter and award a chain bonus that grows with the counter. Taking an unwashed brick SHALL reset the chain counter to zero.

#### Scenario: Chain increments
- **WHEN** the player takes a washed brick while the chain counter is at two
- **THEN** the chain counter becomes three and a bonus scaled to that counter is awarded

#### Scenario: Chain breaks
- **WHEN** the player takes an unwashed brick
- **THEN** the chain counter resets to zero and no chain bonus is awarded for that selection

#### Scenario: Chain bonus grows
- **WHEN** two selections of washed bricks occur at different chain counter values
- **THEN** the selection at the higher counter value awards the larger bonus

### Requirement: Wash state clears when the brick leaves the top
A brick's washed state SHALL persist only while it remains the topmost brick of its column and unclaimed. Once a brick is taken, or is covered by a rising row, its washed state SHALL be discarded.

#### Scenario: Wash consumed on selection
- **WHEN** a washed brick is taken into the tray
- **THEN** it carries no washed state in the tray and confers no further chain effect

#### Scenario: Rising row buries a washed brick
- **WHEN** a rising row lifts a column so a washed brick is no longer relevant to the current top
- **THEN** the washed state is discarded and no chain is available from that brick

### Requirement: Chain state is per run
The chain counter SHALL begin at zero at the start of every level or endless run, and SHALL NOT carry across runs or levels.

#### Scenario: New level resets chain
- **WHEN** a new campaign level or endless run begins
- **THEN** the chain counter is zero and no bricks are washed
