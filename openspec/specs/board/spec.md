# board Specification

## Purpose
Defines the playfield: bricks arranged into vertical columns, which bricks the player is allowed to take, how the stack settles afterwards, and how boards are produced for each mode.

## Requirements

### Requirement: Columnar board structure
The board SHALL consist of a fixed number of vertical columns, each holding zero or more bricks stacked from a common floor. Every brick SHALL carry exactly one icon type drawn from the level's icon set, and every brick on the board SHALL be visible to the player at all times.

#### Scenario: All bricks are visible
- **WHEN** a board is presented in any mode
- **THEN** every brick's icon type is rendered and identifiable, with no face-down, hidden, or occluded bricks

#### Scenario: Bricks rest on the floor
- **WHEN** a column contains bricks
- **THEN** those bricks occupy contiguous positions starting at the floor with no gaps between them

### Requirement: Only the top brick of a column is selectable
The board SHALL treat the topmost brick of each non-empty column as free, and all bricks beneath it as blocked. Selection of a blocked brick SHALL be rejected without changing board state.

#### Scenario: Taking a free brick
- **WHEN** the player selects the topmost brick of a non-empty column
- **THEN** the brick is removed from the board and handed to the tray

#### Scenario: Rejecting a blocked brick
- **WHEN** the player selects a brick that has at least one brick above it in its column
- **THEN** the selection is rejected, the board is unchanged, and the player is given a non-punitive indication that the brick is blocked

#### Scenario: Empty column
- **WHEN** a column contains no bricks
- **THEN** that column offers no selectable brick and remains available to receive bricks from a rising row

### Requirement: Columns settle under gravity
When a brick is removed from a column, the remaining bricks in that column SHALL settle downward so that they again rest contiguously on the floor. Settling SHALL NOT move bricks between columns.

#### Scenario: Column settles after removal
- **WHEN** the top brick of a column holding four bricks is removed
- **THEN** the remaining three bricks occupy the lowest three positions of that same column

#### Scenario: Settling does not cross columns
- **WHEN** any column settles
- **THEN** no brick changes the column it belongs to

### Requirement: Boards are clearable by construction
Every generated board and every rising row SHALL contain each icon type in a quantity that is a multiple of three, so that no brick is ever orphaned and unable to complete a triple.

#### Scenario: Icon counts are multiples of three
- **WHEN** a campaign board or an endless rising row is generated
- **THEN** the count of bricks of each icon type present is divisible by three

#### Scenario: No orphan at the end of a campaign board
- **WHEN** a campaign board is played to completion without the tray filling
- **THEN** every brick can be removed and matched, leaving the board empty

### Requirement: Shaped campaign boards
Campaign boards SHALL be produced from hand-authored layouts that define, per column, how many bricks that column holds, so that the filled board reads as a deliberate silhouette. Icon types SHALL be distributed across the authored positions.

#### Scenario: Authored silhouette is honoured
- **WHEN** a campaign level defines a column-height layout
- **THEN** the generated board matches that layout's per-column brick counts exactly

#### Scenario: Campaign board is finite
- **WHEN** a campaign board is in play
- **THEN** no new bricks are added to the board for the duration of the level

### Requirement: Endless rising rows
In endless mode the board SHALL push a new row of bricks upward from the floor after every third triple cleared in that run. A rising row SHALL insert one brick at the bottom of every column, lifting that column's existing bricks by one position.

#### Scenario: Row rises on the third clear
- **WHEN** the player clears their third triple since the last rise
- **THEN** exactly one new row is inserted at the floor across all columns and the rise counter resets

#### Scenario: Rise is move-driven, not timed
- **WHEN** the player takes no action for any length of time
- **THEN** no row rises and the board state is unchanged

#### Scenario: Existing bricks lift
- **WHEN** a row rises
- **THEN** every pre-existing brick moves up exactly one position within its own column

### Requirement: Ceiling loss condition
The board SHALL define a ceiling height. If a rising row would push any column beyond the ceiling, the run SHALL end in a loss.

#### Scenario: Column reaches the ceiling
- **WHEN** a rising row would place a brick above the ceiling height in any column
- **THEN** the run ends in a loss and the player is shown the board state that caused it

#### Scenario: Column exactly at the ceiling survives
- **WHEN** a rising row fills a column to exactly the ceiling height without exceeding it
- **THEN** play continues
