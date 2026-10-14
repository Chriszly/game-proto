# Mapmaker: guide for agents

How this game is built and where it stands, for agents about to change it. `README.md` covers how
to play, the tile values and the upgrades. Per the root `AGENTS.md`, keep this file up to date in
the same PR as any change to the game.

## Current state

A fog-of-war charting game on a 15x11 tile island, drawn as a modern topographic survey sheet.
Each voyage the player has a number of supplies; tapping a blank tile next to a charted land tile
surveys it for one supply. Hills and peaks reveal tiles around them for free, with a viewshed
animation that tallies their values. When the supplies run out, or the player taps Return to port,
the voyage's revealed tiles become a chart that sells for coins at the port, plus a commission
bonus, plus 3 coins for each unused supply (capped at the tiles' value), plus any isle milestones
reached (50%: +20, 75%: +40, 100%: an atlas page). The harbor sells four upgrades, then Set sail
starts the next voyage; once nothing more can be surveyed, the next voyage goes to a new island.

- Implemented: island generation, surveying with a walking surveyor, lookouts (hills and peaks)
  with the viewshed tally, sea as a dead end, charts with per-terrain rows, commissions, sell-back
  of unused supplies, the isle completion goal with milestones and the atlas, the harbor with four
  upgrades, new islands, a full save after every action.
- Art style: a survey sheet on a drafting table. Charted ground has hypsometric tints, contour
  lines, hillshade, black map symbols and italic place names; uncharted ground is blank gridded
  paper with a dashed survey limit; survey stations, values and the viewshed are magenta; the sheet
  has a header with a scale bar and north arrow; the panel is a crisp white card. All painted in
  code (`src/art/`), `pixelArt: false`.
- One scene does everything: no title screen, pause, audio or menu. The hub's shared settings
  apply; see Hub settings below.
- No TODOs or FIXMEs in the code.

## Architecture

### File map

- `src/main.ts`: creates the `Phaser.Game` (960x540, `Scale.FIT`, smooth art) with `BootScene`
  then `GameScene`, calls `setupGame(game)`, and puts `game` on `window` in dev builds.
- `src/game/state.ts`: `GameState`, `Tile`, `Commission`, `Chart`, `Milestone`, `AtlasPage`,
  `Phase`, `Point`; `GRID`, `BASE_SUPPLIES`, `PROVISIONS_STEP`, `INK_STEP`, `SELL_BACK`,
  `MILESTONES`; helpers `rankOf`, `maxSupplies`, `inkBonus`, `indexOf`, `inGrid`, `tileAt`,
  `neighbours`.
- `src/game/terrain.ts`: `Terrain`, the `TERRAIN` table (name, plural, value, sight, shape),
  `CHART_ORDER`, `isLandmark`.
- `src/game/upgrades.ts`: `UpgradeId`, the `UPGRADES` table (name, text, costs), `UPGRADE_IDS`,
  `nextCost`.
- `src/game/island.ts`: `makeIsland(number)` rolls an island (value noise for height, relief and
  woods), keeps the biggest landmass (four-way connected), rings it with beach, places the port and
  the landmarks.
- `src/game/sim.ts`: the rules. `newGame`, `canSurvey`, `frontier`, `sightOf`, `survey`,
  `valueOf`, `returnToPort`, `chartOf`, `sellBackOf`, `chartable`, `isleProgress`,
  `milestonesDue`, `sellChart`, `buy`, `islandCharted`, `setSail`, and the private
  `rollCommission` with its `COMMISSIONS` table.
- `src/game/save.ts`: `loadGame` (fills the new fields on older saves) and `saveGame`.
- `src/scenes/BootScene.ts`: bakes the surveyor and the icons, then starts `Game`.
- `src/scenes/GameScene.ts`: owns the `GameState`, takes taps, paints the island into two canvas
  textures, draws the sheet, survey stations, surveyor, value chips, the viewshed, the side panel
  and the chart and harbor overlays; exposes `spots`.
- `src/scenes/layout.ts`: screen constants (`VIEW`, `MAP`, `PANEL`, `RETURN_BUTTON`, `OVERLAY`,
  `OVERLAY_BUTTON`, `SHOP`, `BUTTON`, `SMALL_BUTTON`, `UI_DEPTH`, `FONT`) and `tileCentre`.
- `src/ui/Button.ts`: `makeButton`, a flat ink button with an optional size, disabled look and
  left-aligned caption (the Return to port button, which carries the sell-back tag).
- `src/art/paint.ts`: the palette (`INK`, `MAGENTA`, `BLUE`, `SHEET`, `VELLUM`...), `HI` (textures
  are painted at 2x and shown at half size), `bake` (paint a canvas and add it as a texture),
  `rng`, `hex` and drawing helpers.
- `src/art/map.ts`: `paintTerrain` (tints, hillshade, contours by marching squares, coastline and
  symbols for the whole island), `paintFog` (blank paper over uncharted tiles, UNSURVEYED lettering
  and the dashed survey limit), `placeNames` (village, ruin, wood, bay and harbour names and peak
  heights, picked from the island number and tile spots), `TINT` (a flat colour per terrain for the
  live chart and swatches), `CANVAS` and `TS` (80 px tiles on the canvases).
- `src/art/surveyor.ts`: `surveyor` and `surveyor-step`, the bear in a pith helmet behind a
  theodolite; `SURVEYOR_ORIGIN`.
- `src/art/icons.ts`: `icon-<upgrade>`, `swatch-<terrain>`, `landmark-hint` (the compass rose),
  `logo`, `atlas` and `atlas-empty`.
- `shared/setupGame.ts` and `shared/settings.ts` (outside the game folder): the hub's settings.
  `main.ts` imports `setupGame`; `state.ts` imports `byDifficulty`; `GameScene` reads
  `settings.reduceMotion`.

### How it runs

- Boot: `BootScene.create` calls `bakeSurveyor` and `bakeIcons`. No asset files.
- `GameScene.create` loads the save or calls `newGame`, draws the sheet (table, header, scale bar,
  north arrow, grid labels), creates the `island-terrain` and `island-fog` canvas textures (1200x880,
  shown at half size over `MAP`), the station graphics, the viewshed graphics, the surveyor and the
  side panel.
- Input: a `pointerdown` with nothing interactive under it is turned into a tile and passed to
  `survey`; the scene slices `state.surveyed` before and after to know which tiles the survey
  charted and calls `announce`. Buttons call `returnToPort`, `sellChart`, `buy` and `setSail`. Every
  successful action calls `saveGame`. The overlay's full-screen dim is interactive, so it swallows
  taps on the map.
- `update(time)` computes `dt` from the frame time (clamped to 100 ms) and only animates:
  - `syncIsland` repaints the terrain and place names when `state.tiles` is a new array (a load or
    a new isle), repaints the fog when tiles are charted (laying a `vellum` tile over each that
    fades out, and marking it fresh for the live chart), and adds or removes compass roses.
  - `moveSurveyor` walks the sprite toward `state.surveyor` at 260 px/s (snapping when more than 6
    tiles away; Set sail also snaps it to the port).
  - `drawGlow` draws a magenta survey station on every `frontier` tile (dashed square, triangle;
    the one under the pointer is solid with a "−1 supply" pill).
  - `agePopups` floats the value chips of ordinary surveys.
  - `ageSweep` plays a lookout's viewshed: the dotted ring grows over `RING_MS`, a chip appears on
    each tile as the ring passes, from `GATHER_AT` the chips fly into the magenta tally ("VIEWSHED
    n tiles +v") which counts up, and everything fades after `HOLD_MS`.
  - `updatePanel` refreshes the texts and redraws the panel graphics: supply pips with the unused
    bracket, the live chart (15x11 at 3 px, fresh tiles magenta for `FRESH_MS`), the commission
    progress, the isle goal bar with its milestone marks, and the Return to port tag.
  - `syncOverlay` rebuilds the chart or harbor overlay when its key (phase, coins, ranks) changes.
- The rules never depend on time: everything happens on taps.

### State model

- `phase`: `'survey'` (on the island), `'chart'` (at port, `chart` set, not sold), `'harbor'`
  (sold; buying and setting sail).
- `tiles` is row-major, `GRID.w` x `GRID.h`; each has `terrain` and `revealed`. The port starts
  revealed. A tile is surveyable when unrevealed and next to (four-way) a revealed non-sea tile.
- `surveyor` is a tile: the surveyed tile, or for sea the revealed shore beside it nearest the
  surveyor. It returns to `port` on `setSail`.
- `surveyed` lists the tiles revealed this voyage (lookout reveals included); `chartOf` counts them.
  `sellChart` clears it.
- `survey` ends the voyage (`returnToPort`) as soon as supplies hit 0 or `frontier` is empty.
- `chart` (set by `returnToPort`): `counts`, `base`, `ink`, `bonus`, `unused` and `sellBack`
  (`min(unused * SELL_BACK, base)`, so turning back at once earns nothing), `milestones` and
  `milestoneCoins` (the `MILESTONES` reached and not yet paid), `atlas` (100% reached), `total`.
  Supplies are left as they are until `setSail` refills them.
- The isle goal: `chartable` is every land tile plus every sea tile beside land (the land is one
  four-way patch, so all of it can be reached). `isleProgress` gives the share revealed as a whole
  percent, 100 only when all are. `milestones` counts the `MILESTONES` already paid on this isle;
  `sellChart` adds the chart's, and on `atlas` pushes an `AtlasPage` (island, voyages it took,
  tiles) onto `atlas`. `isleStart` is the voyage the isle began on. `setSail` to a new isle resets
  `milestones` and sets `isleStart`.
- `ranks` maps upgrade ids to ranks; `maxSupplies`, `inkBonus` and `sightOf` derive their effects.
  The compass is read by `GameScene` only.
- `commission` is rolled on `newGame` and `setSail` from terrains the fog still hides enough of
  (for sea, only unrevealed sea beside land, since open sea can't be surveyed); it can be null.
- All mutation is in `src/game/sim.ts`. `GameScene` only calls those functions.

### Persistence

`localStorage` key `mapmaker-save` holds the whole `GameState` as JSON (the atlas included),
written after every successful action and read once in `GameScene.create`. A save whose tile count
doesn't match `GRID` is ignored, saved supplies are clamped to `maxSupplies` (a save from an easier
difficulty can hold more), and saves from before the isle goal get `milestones: 0`,
`isleStart: voyage`, `atlas: []` and zeroed new chart fields. The hub's settings live under the
shared `hub-settings` key.

### Randomness and timing

- `Math.random` is used only in `src/game/island.ts` (noise lattices and landmark spots) and in
  `rollCommission`. The art uses `rng()` and a sine hash; place names come from the island number
  and tile spots.
- Animation time comes only from the `time` argument of `GameScene.update`. No timers or tweens.

### Data tables

- `src/game/terrain.ts`: tile values, lookout sight and shape.
- `src/game/upgrades.ts`: upgrade costs and texts.
- `src/game/state.ts`: `GRID`, `BASE_SUPPLIES`, `PROVISIONS_STEP`, `INK_STEP`, `SELL_BACK`,
  `MILESTONES`.
- `src/game/island.ts`: `MIN_LAND`, `SHORE`, `HILLS_AT`, `PEAK_AT`, landmark counts per island.
- `src/game/sim.ts`: `COMMISSIONS`.
- `src/art/map.ts`: terrain heights (`ELEV`), tint bands (`BANDS`), name lists.

### Hub settings

- `src/main.ts` calls `setupGame(game)` right after creating the game (frame cap, FPS readout, reduced motion and full screen; Mapmaker uses no camera shake or flash).
- Difficulty scales one number: `BASE_SUPPLIES` in `src/game/state.ts` is `byDifficulty(16, 12, 9)`,
  read at module load. Normal must stay 12: the playthrough expects it.
- With `settings.reduceMotion` on, the survey stations stop pulsing, value chips don't float, and
  the viewshed shows its full ring, chips and total at once without the sweep or the gathering.
- Keep the README's difficulty line and the root README's difficulty row in sync.

## Testing hooks

- `src/main.ts` sets `window.game` in dev builds only.
- `e2e/playthrough.spec.ts` reads `game.scene.getScene('Game')`: its `state` (JSON-copied) and
  `spots` (button centres by name: `return`, `sell`, `sail`, `buy-<upgrade>`).
- It seeds `Math.random`, owns the clock with 64 ms frames, and blocks WebGL so Phaser uses canvas.
- It taps tile centres (from `MAP` 24,64 and 40px tiles) of `frontier` tiles nearest the surveyor
  until supplies run out, then taps `sell` and `sail`. It buys nothing and never turns back early.
- Values the test copies and that must stay in sync: `VIEW`, `GRID` 15x11, `MAP`, `SUPPLIES` 12, the
  tile values in `VALUE`, `MILESTONES`, the surveyable rule in its `frontier` and the chartable rule
  in its `islePercent`. It asserts that only hills and peaks reveal more than the tapped tile, that
  a chart's rows, commission, sell-back (0) and milestones add up, that selling records the
  milestones, and that the second voyage keeps the charted tiles and refills the supplies.

## Making common changes

- Add a terrain: add it to `Terrain` and `TERRAIN` in `terrain.ts` (and `CHART_ORDER`), give it a
  height in `ELEV` and a colour in `TINT` in `src/art/map.ts` (the `Record`s force this) and a
  symbol in `paintTerrain` and `swatch` (`icons.ts`), place it in `island.ts`, and add it to the
  test's `VALUE` and the README table.
- Add an upgrade: add it to `UpgradeId` and `UPGRADES`, draw `icon-<id>` in `UPGRADE_ICONS` in
  `icons.ts`, apply it where it acts (`state.ts` helpers or `sim.ts`). Four rows fill the harbor
  overlay; a fifth needs `SHOP` and `OVERLAY` in `layout.ts` adjusted.
- Change supplies or values: `state.ts` and `terrain.ts`, then the test's `SUPPLIES` and `VALUE`.
- Change the sell-back or the milestones: `SELL_BACK` and `MILESTONES` in `state.ts`, then the
  test's `MILESTONES` and the README. The panel lays out up to three milestone marks.
- Move the map: `MAP` in `layout.ts`, then the test's `MAP`.

## Gotchas

- The island shape depends on the number of `Math.random` calls in `makeIsland`; changing them
  changes the seeded island the playthrough plays (it reads the state, so it adapts, but its
  screenshots change).
- `makeIsland` loops until an island has `MIN_LAND` land tiles; keep `MIN_LAND` reachable.
- Landmarks fall back to any meadow, forest or beach tile when no tile fits their rule.
- The island art is painted once per isle (about a million pixels); keep per-frame work in
  `update` to graphics and texts, and repaint the fog canvas only when tiles are charted.
- The compass rose is gold, and the survey overprint is magenta triangles and dashed squares, never
  a cross; never draw a red cross (root `AGENTS.md`).
