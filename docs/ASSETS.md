# Assets and licensing

## Icons

All 75 game icons are **original artwork authored for this project**, defined as
SVG path data in `src/themes/icons.ts` and built from the shared helpers in
`src/themes/geometry.ts`.

They are not derived from, traced from, or copied from any third-party icon set.
There is therefore no upstream licence to honour and no attribution requirement,
and the icons may be redistributed with the game freely.

> **Deviation from plan.** The task list called for sourcing an open-licence
> line-icon family. Authoring the set instead removes the licence-compatibility
> risk entirely and guarantees a single consistent stroke weight and canvas
> across all five themes, which the shape-only legibility requirement depends on.

Every icon is drawn on a 24x24 canvas and composed of two kinds of shape:

- `fill` shapes take the icon's assigned palette colour
- `line` shapes are stroked in the theme's ink colour on top

This is what produces the colour-filled line-icon look, and it is why a washed
brick can be recoloured through a CSS custom property without swapping assets.

## Shape-only legibility audit

The `visual-theme` capability requires that every icon in a theme be
identifiable from its outline alone, so that colour-blind players and players in
poor lighting are not disadvantaged.

Two parts to this, one automated and one visual:

**Automated (enforced by `src/content/content.test.ts`).** No two icons within a
theme may share a silhouette. The test compares the concatenated geometry of
every icon in a set and fails if any two match, which is precisely the
"differ only by fill" case the spec forbids.

**Per-theme review.** Each set was authored so that no two members share a
dominant form. Where two icons occupy a similar footprint they are separated by
outline, not by colour:

| Theme   | Icons | Closest pair                | How they are separated                          |
| ------- | ----- | --------------------------- | ----------------------------------------------- |
| Garden  | 15    | `sun` / `flower`            | radial rays vs. four discrete round petals       |
| Kitchen | 15    | `plate` / `bowl`            | full circle with inner ring vs. half-round on a rim |
| Ocean   | 15    | `bubble` / `pearl`          | offset highlight vs. seated in a shell arc       |
| Space   | 15    | `star` / `solar`            | five points vs. disc with twelve short rays      |
| Cafe    | 15    | `cookie` / `donut`          | scattered dots vs. centred hole                  |

**Still outstanding:** legibility at the smallest rendered brick size on a real
phone is a visual check that cannot be made programmatically. That is tracked
separately as task 7.5 and needs a human looking at a device.

## App icons

App and launcher icons in `public/icons/` are generated from the game's own
mark by `scripts/generate-app-icons.mjs`. They are original artwork on the same
terms as the game icons.

## Platform note: iOS storage separation

On iOS, a web app installed to the home screen may not share browser storage
with Safari. A player who progresses through several levels in Safari and *then*
installs can find the installed app starts from scratch.

There is no reliable way to migrate that data. The game handles it by:

- surfacing the install affordance early, before meaningful progress
  accumulates, rather than after a long session
- treating a missing progress record as a fresh start rather than an error, so
  the game is always playable either way

This is a platform limitation, documented here so it is recognised rather than
investigated as a bug.
