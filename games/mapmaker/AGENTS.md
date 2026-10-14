# Mapmaker: guide for agents

How this game is built and where it stands, for agents about to change it. `README.md` covers how
to play, the tile values and the upgrades. Per the root `AGENTS.md`, keep this file up to date in
the same PR as any change to the game.

## Current state

A fog-of-war charting game on a 15x11 tile island. Each voyage the player has a number
of supplies; tapping a fogged tile next to a charted land tile surveys it for one supply. Hills and
peaks reveal tiles around them for free. When the supplies run out, or the player taps Return to
port, the voyage's revealed tiles become a chart that sells for coins at the port, plus a
commission bonus. The harbor sells four upgrades, then Set sail starts the next voyage; once
nothing more can be surveyed, the next voyage goes to a new island.

- Implemented: island generation, surveying with a walking surveyor, lookouts (hills and peaks),
  sea as a dead end, charts with per-terrain rows, commissions, the harbor with four upgrades,
  new islands, a full save after every action.
- One scene does everything: no title screen, pause, audio or menu. The hub's shared settings
  apply; see Hub settings below.
- No TODOs or FIXMEs in the code. `bakePixelArt` and `padRows` in `src/art/pixelArt.ts` (copied
  from Hotfoot) are unused.

## Architecture

### File map

- `src/main.ts`: creates the `Phaser.Game` (960x540, `Scale.FIT`, `pixelArt`) with `BootScene`
  then `GameScene`, calls `setupGame(game)`, and puts `game` on `window` in dev builds.
- `src/game/state.ts`: `GameState`, `Tile`, `Commission`, `Chart`, `Phase`, `Point`; `GRID`,
  `BASE_SUPPLIES`, `PROVISIONS_STEP`, `INK_STEP`; helpers `rankOf`, `maxSupplies`, `inkBonus`,
  `indexOf`, `inGrid`, `tileAt`, `neighbours`.
- `src/game/terrain.ts`: `Terrain`, the `TERRAIN` table (name, plural, value, sight, shape),
  `CHART_ORDER`, `isLandmark`.
- `src/game/upgrades.ts`: `UpgradeId`, the `UPGRADES` table (name, text, costs), `UPGRADE_IDS`,
  `nextCost`.
- `src/game/island.ts`: `makeIsland(number)` rolls an island (value noise for height, relief and
  woods), keeps the biggest landmass, rings it with beach, places the port and the landmarks.
- `src/game/sim.ts`: the rules. `newGame`, `canSurvey`, `frontier`, `sightOf`, `survey`,
  `returnToPort`, `chartOf`, `sellChart`, `buy`, `islandCharted`, `setSail`, and the private
  `rollCommission` with its `COMMISSIONS` table.
- `src/game/save.ts`: `loadGame` and `saveGame`.
- `src/scenes/BootScene.ts`: bakes every texture, then starts `Game`.
- `src/scenes/GameScene.ts`: owns the `GameState`, takes taps, draws the map, glow, surveyor,
  popups, side panel and the chart and harbor overlays; exposes `spots`.
- `src/scenes/layout.ts`: screen constants (`VIEW`, `MAP`, `PANEL`, `RETURN_BUTTON`, `OVERLAY`,
  `OVERLAY_BUTTON`, `SHOP`, `BUTTON`, `SMALL_BUTTON`, `UI_DEPTH`, `FONT`) and `tileCentre`.
- `src/ui/Button.ts`: `makeButton`, with an optional size and a disabled look.
- `src/art/pixelArt.ts`: `PixelCanvas` and `seeded` (a copy of Hotfoot's; games don't share code).
- `src/art/tiles.ts`: `tile-<terrain>`, `tile-sea-1` (the second sea frame), `fog-0..3` and
  `landmark-hint`, all 40px.
- `src/art/surveyor.ts`: `surveyor` and `surveyor-step`, the bear in an explorer's hat;
  `SURVEYOR_FEET`.
- `src/art/icons.ts`: `icon-coin`, `icon-supplies`, `icon-chart` and one `icon-<upgrade>` each.
- `src/art/palette.ts`: colour ramps.
- `shared/setupGame.ts` and `shared/settings.ts` (outside the game folder): the hub's settings.
  `main.ts` imports `setupGame`; `state.ts` imports `byDifficulty`; `GameScene` reads
  `settings.reduceMotion`.

### How it runs

- Boot: `BootScene.create` calls `bakeTiles`, `bakeSurveyor` and `bakeIcons`. No asset files.
- `GameScene.create` loads the save or calls `newGame`, makes one image per tile, the glow
  graphics, the surveyor and the side panel.
- Input: a `pointerdown` with nothing interactive under it is turned into a tile and passed to
  `survey`; buttons call `returnToPort`, `sellChart`, `buy` and `setSail`. Every successful action
  calls `saveGame`. The overlay's full-screen dim is interactive, so it swallows taps on the map.
- `update(time)` computes `dt` from the frame time (clamped to 100 ms) and only animates:
  `syncTiles` swaps textures when tiles are revealed (fading them in and floating their value),
  adds or removes compass stars; `moveSurveyor` walks the sprite toward `state.surveyor` at 260 px/s
  (snapping when more than 6 tiles away; Set sail also snaps it to the port); `drawGlow` outlines `frontier`;
  `updatePanel` refreshes the texts; `syncOverlay` rebuilds the chart or harbor overlay when its
  key (phase, coins, ranks) changes.
- The rules never depend on time: everything happens on taps.

### State model

- `phase`: `'survey'` (on the island), `'chart'` (at port, `chart` set, not sold), `'harbor'`
  (sold; buying and setting sail).
- `tiles` is row-major, `GRID.w` x `GRID.h`; each has `terrain` and `revealed`. The port starts
  revealed. A tile is surveyable when fogged and next to (four-way) a revealed non-sea tile.
- `surveyor` is a tile: the surveyed tile, or for sea the revealed shore beside it nearest the
  surveyor. It returns to `port` on `setSail`.
- `surveyed` lists the tiles revealed this voyage (lookout reveals included); `chartOf` counts them.
  `sellChart` clears it.
- `survey` ends the voyage (`returnToPort`) as soon as supplies hit 0 or `frontier` is empty.
- `ranks` maps upgrade ids to ranks; `maxSupplies`, `inkBonus` and `sightOf` derive their effects.
  The compass is read by `GameScene` only.
- `commission` is rolled on `newGame` and `setSail` from terrains the fog still hides enough of
  (for sea, only fogged sea beside land, since open sea can't be surveyed); it can be null.
- All mutation is in `src/game/sim.ts`. `GameScene` only calls those functions.

### Persistence

`localStorage` key `mapmaker-save` holds the whole `GameState` as JSON, written after every
successful action and read once in `GameScene.create`. A save whose tile count doesn't match
`GRID` is ignored, and saved supplies are clamped to `maxSupplies` (a save from an easier
difficulty can hold more). The hub's settings live under the shared `hub-settings` key.

### Randomness and timing

- `Math.random` is used only in `src/game/island.ts` (noise lattices and landmark spots) and in
  `rollCommission`. The art uses `seeded()`.
- Animation time comes only from the `time` argument of `GameScene.update`. No timers or tweens.

### Data tables

- `src/game/terrain.ts`: tile values, lookout sight and shape.
- `src/game/upgrades.ts`: upgrade costs and texts.
- `src/game/state.ts`: `GRID`, `BASE_SUPPLIES`, `PROVISIONS_STEP`, `INK_STEP`.
- `src/game/island.ts`: `MIN_LAND`, `SHORE`, `HILLS_AT`, `PEAK_AT`, landmark counts per island.
- `src/game/sim.ts`: `COMMISSIONS`.

### Hub settings

- `src/main.ts` calls `setupGame(game)` right after creating the game (frame cap, FPS readout,
  reduced motion; Mapmaker uses no camera shake or flash).
- Difficulty scales one number: `BASE_SUPPLIES` in `src/game/state.ts` is `byDifficulty(16, 12, 9)`,
  read at module load. Normal must stay 12: the playthrough expects it.
- With `settings.reduceMotion` on, the frontier glow holds still and the sea doesn't swap frames.
- Keep the README's difficulty line and the root README's difficulty row in sync.

## Testing hooks

- `src/main.ts` sets `window.game` in dev builds only.
- `e2e/playthrough.spec.ts` reads `game.scene.getScene('Game')`: its `state` (JSON-copied) and
  `spots` (button centres by name: `return`, `sell`, `sail`, `buy-<upgrade>`).
- It seeds `Math.random`, owns the clock with 64 ms frames, and blocks WebGL so Phaser uses canvas.
- It taps tile centres (from `MAP` 24,64 and 40px tiles) of `frontier` tiles nearest the surveyor
  until supplies run out, then taps `sell` and `sail`. It buys nothing.
- Values the test copies and that must stay in sync: `VIEW`, `GRID` 15x11, `MAP`, `SUPPLIES` 12, the
  tile values in `VALUE`, and the surveyable rule in its `frontier`. It asserts that only hills and
  peaks reveal more than the tapped tile, that a chart's rows and commission add up, and that the
  second voyage keeps the charted tiles and refills the supplies.

## Making common changes

- Add a terrain: add it to `Terrain` and `TERRAIN` in `terrain.ts` (and `CHART_ORDER`), paint it in
  `bakeTiles` in `src/art/tiles.ts` (the `Record` forces this), place it in `island.ts`, and add it
  to the test's `VALUE` and the README table.
- Add an upgrade: add it to `UpgradeId` and `UPGRADES`, draw `icon-<id>` in `icons.ts`, apply it
  where it acts (`state.ts` helpers or `sim.ts`). Four rows fill the harbor overlay; a fifth needs
  `SHOP` and `OVERLAY` in `layout.ts` adjusted.
- Change supplies or values: `state.ts` and `terrain.ts`, then the test's `SUPPLIES` and `VALUE`.
- Move the map: `MAP` in `layout.ts`, then the test's `MAP`.

## Gotchas

- The island shape depends on the number of `Math.random` calls in `makeIsland`; changing them
  changes the seeded island the playthrough plays (it reads the state, so it adapts, but its
  screenshots change).
- `makeIsland` loops until an island has `MIN_LAND` land tiles; keep `MIN_LAND` reachable.
- Landmarks fall back to any meadow, forest or beach tile when no tile fits their rule.
- The compass star and the frontier glow are gold, not red; never draw a red cross (root
  `AGENTS.md`).
