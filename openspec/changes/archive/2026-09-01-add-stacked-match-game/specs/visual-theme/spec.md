## Purpose

Defines the themed icon sets and coordinated palettes that give each level its own mood, and the legibility rules that keep a densely packed board readable at phone size.

## ADDED Requirements

### Requirement: Themed icon sets
The game SHALL provide multiple named icon themes, each a coherent group of colour-filled line icons around a single subject. A level SHALL draw all of its bricks from exactly one theme.

#### Scenario: Level uses one theme
- **WHEN** a level is generated
- **THEN** every brick on that board carries an icon belonging to that level's single assigned theme

#### Scenario: Themes vary across levels
- **WHEN** the player progresses through consecutive campaign levels
- **THEN** the assigned theme changes so the overall palette of the screen visibly shifts

### Requirement: Icon count per level
Each level SHALL use no fewer than 12 and no more than 18 distinct icon types. Fewer types make matching trivial; more make the board unreadable and matches feel arbitrary.

#### Scenario: Icon count within bounds
- **WHEN** any level is generated
- **THEN** the number of distinct icon types on the board is between 12 and 18 inclusive

### Requirement: Level accent hue
Each theme SHALL define one accent hue used for the colour-wash treatment. The accent SHALL be distinguishable from the theme's ordinary icon colours so a washed brick reads as washed at a glance.

#### Scenario: Washed brick is distinguishable
- **WHEN** a brick is washed on a board of that theme
- **THEN** its rendered treatment is visibly distinct from every unwashed brick on the same board

### Requirement: Icons are distinguishable by shape alone
Every icon within a theme SHALL be identifiable from its outline shape without relying on colour, so that colour-blind players and players in poor lighting can play without disadvantage.

#### Scenario: Shape-only legibility
- **WHEN** a board is rendered with all colour removed
- **THEN** each distinct icon type remains distinguishable from every other icon type in that theme

#### Scenario: No colour-only pairs
- **WHEN** a theme is defined
- **THEN** it contains no two icon types that share an outline and differ only by fill colour

### Requirement: Icon legibility at brick size
Icons SHALL remain identifiable when rendered at the smallest brick size the layout produces on a phone-sized viewport.

#### Scenario: Small brick remains readable
- **WHEN** the board is rendered at its densest supported configuration on the smallest supported viewport
- **THEN** each icon is still identifiable to a player at normal viewing distance
