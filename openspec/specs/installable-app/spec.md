# installable-app Specification

## Purpose
Defines how the game behaves as an installable, offline-capable application: what makes it installable to a home screen, how it launches standalone, how it stays playable with no network, and how a new version reaches the player without interrupting play.

## Requirements

### Requirement: Installable to the home screen
The application SHALL meet the criteria browsers require to offer installation, and SHALL provide a web app manifest declaring its name, short name, icon set including a maskable icon, standalone display mode, portrait orientation, theme colour, and background colour.

#### Scenario: Browser offers installation
- **WHEN** the game is loaded over HTTPS in a browser that supports installation
- **THEN** the browser recognises the application as installable

#### Scenario: Manifest is complete
- **WHEN** the manifest is inspected
- **THEN** it declares a name, a short name, a standalone display mode, a portrait orientation, a theme colour, a background colour, and icons at every size required for installation including at least one maskable icon

#### Scenario: Home screen icon
- **WHEN** the player installs the game to their home screen
- **THEN** the launcher icon renders the game's own icon, correctly masked on platforms that apply a shape mask, with no browser badge substituted for a missing asset

### Requirement: Standalone launch
When launched from an installed entry point, the application SHALL open in standalone mode filling the viewport with no browser address bar or navigation chrome, in portrait orientation.

#### Scenario: No browser chrome
- **WHEN** the player launches the installed game from their home screen
- **THEN** the game fills the viewport with no address bar or browser navigation visible

#### Scenario: Launch goes straight to the game
- **WHEN** the installed game is launched
- **THEN** it opens on the game's own entry screen rather than on an error or offline page, whether or not a network is available

### Requirement: Fully playable offline
After the first successful load, the application SHALL be completely playable with no network connection. All application code, styles, icon sprite sheets, fonts, and level data SHALL be served from a local cache, and the game SHALL make no runtime network request that play depends on.

#### Scenario: Play with no network
- **WHEN** the player launches the installed game with the device offline
- **THEN** the game loads and both campaign and endless modes are fully playable

#### Scenario: Losing connection mid-run
- **WHEN** the network drops while a run is in progress
- **THEN** play continues uninterrupted with no error surfaced

#### Scenario: No blocking network requests
- **WHEN** the game is played from a cold start while offline
- **THEN** no request required for play is attempted against the network

#### Scenario: Themes are available offline
- **WHEN** the player reaches a level whose theme was not used in any previously played level, while offline
- **THEN** that theme's icons render correctly from cache

### Requirement: Progress persists across launches
Progress stored by the game SHALL survive closing and relaunching the installed application, and SHALL be readable while offline.

#### Scenario: Progress survives relaunch
- **WHEN** the player wins a level, fully closes the installed app, and relaunches it while offline
- **THEN** that level remains marked won and the next level remains unlocked

### Requirement: Updates never interrupt a run
When a new version of the application is available, the game SHALL NOT reload or swap versions while a level or endless run is in progress. The update SHALL be applied at a moment when no run is active, and the player SHALL be informed that an update was applied.

#### Scenario: Update deferred during play
- **WHEN** a new version becomes available while the player is mid-run
- **THEN** the running version continues unchanged and the run is not disturbed

#### Scenario: Update applied between runs
- **WHEN** an update is pending and the player returns to a state with no active run
- **THEN** the new version is activated and the player is shown a brief confirmation that the game was updated

#### Scenario: Cached assets replaced on update
- **WHEN** a new version is activated
- **THEN** stale cached assets from the previous version are discarded and subsequent launches serve the new version

#### Scenario: Update failure is non-fatal
- **WHEN** checking for or retrieving an update fails
- **THEN** the currently installed version remains fully playable and no error blocks play

### Requirement: Install affordance
The application SHALL offer the player a way to install it, shown only when installation is actually possible and not already installed. The affordance SHALL be dismissible and SHALL NOT reappear repeatedly once dismissed.

#### Scenario: Prompt offered when installable
- **WHEN** the browser signals that the application can be installed and it is not already installed
- **THEN** a dismissible install affordance is presented

#### Scenario: Hidden when already installed
- **WHEN** the game is running in standalone mode
- **THEN** no install affordance is shown

#### Scenario: Dismissal respected
- **WHEN** the player dismisses the install affordance
- **THEN** it is not shown again in that session and its dismissal persists across reloads

#### Scenario: Platform without an install signal
- **WHEN** the game runs on a platform that offers no programmatic install signal
- **THEN** the player is still able to reach guidance on how to add the game to their home screen, and no broken or non-functional install control is shown

### Requirement: Status bar reflects the active theme
In standalone mode the application SHALL tint the system status bar area to match the palette of the level currently being played, so the whole device surface shifts mood with the level.

#### Scenario: Theme change tints the status bar
- **WHEN** the player begins a level whose theme differs from the previous level's
- **THEN** the status bar area adopts the new theme's colour

#### Scenario: Default outside a level
- **WHEN** the player is on a menu rather than in a level
- **THEN** the status bar area uses the application's default theme colour
