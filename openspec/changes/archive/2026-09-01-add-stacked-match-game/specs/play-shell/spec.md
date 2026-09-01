## Purpose

Defines how the game presents and responds on a phone: the portrait layout, touch input, the motion that makes the board feel alive, and the accessibility affordances that keep it playable for everyone.

## ADDED Requirements

### Requirement: Phone-first portrait layout
The game SHALL lay out in portrait orientation with the board occupying the upper region and the tray fixed at the bottom within comfortable thumb reach. The layout SHALL adapt up to larger viewports without requiring a separate build, and SHALL respect the device's safe area insets so that no interactive element is obscured by a notch, a rounded corner, or a home indicator.

#### Scenario: Portrait phone layout
- **WHEN** the game is opened on a phone-sized portrait viewport
- **THEN** the whole board and all seven tray slots are visible simultaneously with no scrolling

#### Scenario: Larger viewport
- **WHEN** the game is opened on a desktop-sized viewport
- **THEN** the same layout scales up and remains centred and playable

#### Scenario: Tray reachability
- **WHEN** the game is rendered on a phone-sized viewport
- **THEN** the tray is anchored to the lower portion of the screen

#### Scenario: Safe area respected in standalone
- **WHEN** the game runs in standalone mode on a device with a home indicator or a notch
- **THEN** the tray sits above the bottom safe area inset and no brick or control is obscured by system furniture

#### Scenario: Full-bleed background
- **WHEN** safe area insets are applied
- **THEN** the background still extends edge to edge, with only interactive content inset

### Requirement: Touch and pointer selection
The player SHALL select a brick by a single tap or click on it. Touch targets SHALL be large enough for reliable thumb use, and an accidental drag across the board SHALL NOT select bricks.

#### Scenario: Tap selects
- **WHEN** the player taps a free brick
- **THEN** that brick is selected and moves to the tray

#### Scenario: Drag does not select
- **WHEN** the player presses down on a brick and moves beyond a small threshold before releasing
- **THEN** no brick is selected

#### Scenario: Rapid taps are handled in order
- **WHEN** the player taps several free bricks in quick succession
- **THEN** each tap resolves in the order it was made and no selection is lost or duplicated

### Requirement: Motion communicates state
Bricks SHALL animate when taken, when a column settles, when a triple pops, when a brick is washed, and when a row rises, so that every state change is legible without reading text. Animation SHALL NOT block the player from making the next selection.

#### Scenario: Settle is animated
- **WHEN** a brick is taken from a column
- **THEN** the remaining bricks animate downward into their new positions

#### Scenario: Input stays responsive during animation
- **WHEN** the player selects a brick while a previous animation is still running
- **THEN** the new selection is accepted and resolved

#### Scenario: Wash is announced visually
- **WHEN** bricks are washed after a pop
- **THEN** those bricks visibly transition into the accent treatment

### Requirement: Reduced motion support
When the player's system indicates a preference for reduced motion, the game SHALL replace movement-based animation with immediate or fade transitions while preserving all state legibility.

#### Scenario: Reduced motion honoured
- **WHEN** the player's system requests reduced motion
- **THEN** bricks change position without sustained travel animation and the game remains fully playable

### Requirement: Keyboard and assistive access
The game SHALL be playable without a pointing device. Every selectable brick SHALL be reachable and activatable by keyboard, and SHALL expose its icon type, its column, and whether it is washed to assistive technology.

#### Scenario: Keyboard selection
- **WHEN** the player focuses a free brick using the keyboard and activates it
- **THEN** that brick is selected exactly as it would be by tap

#### Scenario: Blocked bricks are not focus targets
- **WHEN** the player moves keyboard focus across the board
- **THEN** focus stops only on bricks that are currently selectable

#### Scenario: Assistive description
- **WHEN** assistive technology inspects a selectable brick
- **THEN** it reports the brick's icon type, its column, and whether the brick is washed

### Requirement: Run state is legible at all times
The game SHALL continuously display the current score, the remaining undos, and — in endless mode — how many triples remain before the next row rises.

#### Scenario: Rise countdown visible
- **WHEN** the player has cleared one triple since the last rise in endless mode
- **THEN** the display indicates that two triples remain until the next rise

#### Scenario: Undo count visible
- **WHEN** the player has undos remaining
- **THEN** the remaining count is displayed
