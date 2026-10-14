# Tiny Kingdom: guide for agents

How Tiny Kingdom is built and where things stand, for agents changing it. README.md covers how to
play, the scoring table and the rounds. Keep this file up to date with any change to the game, per
the root AGENTS.md.

## Current state

Tiny Kingdom is a turn-based tile-placing puzzle on a random 10x7 island. The player picks a farm,
house or tower from a pouch and places it on grass; each building scores from its neighbours and
the score is always the whole board's. Reaching the round's goal refills the pouch and raises the
goal.

Implemented today:

- Random islands: each kingdom (the first and every "New kingdom") draws an island number from
  1 to `ISLANDS` (9999) with `Math.random`, and `islandMap` lays it out from that number with its
  own seeded generator: two or three lakes of 2 to 4 cells, then two or three woods of 1 to 3,
  each grown from a random grass cell. The same number always gives the same island.
- One screen (`GameScene`): the board, a side panel with round, island number, score, goal bar, three tile
  buttons and the best score, a hover preview with a ghost tile and "+N", floating score popups
  for every building whose worth changed, a "Round N" banner, and a game-over overlay with a
  "New kingdom" button.
- Rounds with goals from `goalFor` and pouch refills from `ROUND_POUCH`, without end.
- One undo per round: the "Undo last tile" button under the tile buttons takes back the last
  placement. `state.undo` holds a snapshot taken in `place` before it changes anything; `undo`
  restores it and records the round in `undoneIn`, so a second undo in the same round is refused.
  A placement that starts a new round clears the snapshot, so it cannot be undone. Undo is only
  offered while `phase` is `'playing'`.
- Art: every cell is a low-poly slab (a lit top split into two facets, a shaded front edge and a
  soft drop shadow), and each building is a few flat faces (lit and shaded sides, roofs, a
  battlemented keep, pines), drawn with Phaser Graphics and baked to a 64px texture.
- The game ends when the pouch is empty or no grass is left. Only the best final score persists.

Missing or rough:

- No title screen, menu or sound. There is no way to type, read or share an island number; the
  panel only shows it.
- Islands are not checked for winnability. A beam search over 271 island numbers spread over the
  range found the first pouch reaching at least 28 on each (the first goal is 20), but nothing
  enforces it if `islandMap` changes.
- The tile buttons reuse the `tile-<kind>` texture scaled to 0.875; no separate icon is drawn.
- `restart` does not clear running popups or the round banner tween.
- `docs/screenshots/game-over.png` is not produced by the test; refresh it by hand if the overlay
  changes.

## Architecture

File map (`src/`):

- `main.ts`: creates the `Phaser.Game` (960x540, `Phaser.Scale.FIT`, `pixelArt: true`) with
  `BootScene` and `GameScene`, calls `setupGame(game)` from `shared/setupGame.ts`, and in dev
  builds puts `game` on `window`.
- `scenes/BootScene.ts`: calls `bakeTiles`, then starts `Game`.
- `scenes/GameScene.ts`: builds the board, panel, banner and game-over overlay; turns pointer
  events into `select` and `place` calls; draws popups, hover and panel.
- `scenes/layout.ts`: `VIEW`, `GRID`, `PANEL`, `GOAL_BAR`, `TILE_BUTTONS`, `UNDO_BUTTON`,
  `BUTTON`, `UI_DEPTH`, `FONT` and `cellCentre`.
- `game/tiles.ts`: `BUILDINGS`, the `Building`, `Terrain` and `Cell` types, `INFO` (name and rule
  text for each button), `isBuilding`, `MAP_SIZE`, `ISLANDS`, `islandMap` (an island number to
  its rows, with a private mulberry32 `seeded`), `randomIsland` and `startingGrid(island)`.
- `game/state.ts`: `GameState`, `Snapshot`, `FIRST_POUCH`, `ROUND_POUCH`, `goalFor`, `newGame`,
  `cellScore`, `boardScore`, `canPlace`, `previewScore`, `select`, `place`, `canUndo` and `undo`. No Phaser; `goalFor` reads
  `byDifficulty` from `shared/settings.ts`.
- `game/save.ts`: `loadBest` and `saveBest`.
- `art/tiles.ts`: draws grass, lake, forest, farm, house and tower as flat low-poly faces with
  Phaser Graphics (the `Art` helper: `poly`, `rect`, `ellipse`, then `bake`) and bakes each as a
  `tile-<cell>` texture (64px, one cell). `shade` lightens or darkens a colour for the faces.
- `ui/Button.ts`: `makeButton`, the wooden captioned button used by the game-over overlay.

Shared code it imports (outside the game folder): `shared/setupGame.ts` (`setupGame`) and
`shared/settings.ts` (`byDifficulty`).

How it runs:

- Boot: `BootScene.create` bakes every texture in `TILE_ART`, then `GameScene.create` calls
  `newGame(loadBest())` and builds all objects once.
- There is no `update` method and no tick. The game is event driven: state only changes on a
  tap. Phaser's tweens animate the popups (`POPUP_MS`) and the round banner (`BANNER_MS`), so the
  only time-dependent part is cosmetic.
- Input: one interactive zone covers the board. `pointermove` calls `hoverAt`, which sets
  `preview` from `previewScore` and redraws the hover; `pointerdown` calls `tapAt`, which maps the
  point to a cell with `cellAt` and calls `place`. Each tile button's background calls `select`.
  The game-over dim rectangle is interactive so it swallows taps to the board below.
- Rendering is diffed objects, not a per-frame redraw: `cells` holds one image per cell whose
  texture is swapped on placement, undo or restart (`redrawCells`), and `refresh` rewrites the
  panel texts, goal bar, button highlights and the undo button after each change.

State model (`GameState` in `src/game/state.ts`):

- `grid` is `Cell[][]`, indexed `grid[row][col]`; cells are terrain or a building.
- `pouch` counts tiles left per building; `selected` is the building the next tap places.
- `score` is always `boardScore(grid)`, recomputed after each placement. It can fall: a tower
  next to another tower is worth 0, so a placement's gain or preview can be negative.
- `island` is the island number the grid was laid out from.
- `round`, `goal`, `placed`, `phase` (`'playing'` or `'over'`) and `best`.
- `undo` (the `Snapshot` of grid, pouch, score, selected and placed before the last placement, or
  null) and `undoneIn` (the round the undo was last used in, 0 for none).
- The pure functions in `state.ts` mutate it (`select`, `place`); the scene only replaces it
  with `newGame` (a new random island) on create and restart and calls `saveBest` when `phase` turns `'over'`.
- `place` order matters: it takes its snapshot first, scores, then loops rounds while
  `score >= goal` (one placement can jump several rounds), refills the pouch, keeps the snapshot
  only if no round began, reselects the first building left if the placed kind ran out, and only
  then checks for the end. So a placement that empties the pouch but reaches
  the goal carries on.
- Buildings only go on `'grass'`; `canPlace` also requires `phase === 'playing'`.

Persistence: one `localStorage` key, `tiny-kingdom-best`, holding the best final score. It is
written only at game over. Board and round are never saved. The hub's settings are read from the
shared `hub-settings` key, not from this game's save.

Randomness and timing: `randomIsland` makes the game's only `Math.random` call, once per kingdom;
everything else about the island follows from that number. The game calls no `Date.now` or
`performance.now`. The art is drawn from fixed coordinates, so textures are identical every load.
Only Phaser tweens use time.

Data tables:

- Scoring rules: the cases in `cellScore`, with `SIDES` and `AROUND` for the neighbourhoods.
- Button rule text: `INFO` in `src/game/tiles.ts` (keep it matching `cellScore`).
- Pouches and goals: `FIRST_POUCH`, `ROUND_POUCH` and `goalFor` in `src/game/state.ts`
  (`goalFor` scales by difficulty; see Hub settings).
- The islands: `islandMap` in `src/game/tiles.ts` (lake and wood counts and sizes), `MAP_SIZE`
  and `ISLANDS`.
- Popup and banner timings: `POPUP_MS` and `BANNER_MS` in `src/scenes/GameScene.ts`.
- Positions and sizes: `src/scenes/layout.ts`. Colours: `C` in `src/art/tiles.ts`, the face
  shades `SIDE` and `FACET` there, and inline hex values in `GameScene.ts`.

### Hub settings

- `src/main.ts` calls `setupGame(game)` from `shared/setupGame.ts` right after creating the game,
  which applies the frame cap, the FPS readout and reduced motion (camera shake and flash become
  no-ops; this game uses neither).
- Difficulty scales one number: the round goals. `goalFor` in `src/game/state.ts` multiplies the
  base goal by `byDifficulty(0.8, 1, 1.2)` (Easy, Normal, Hard) and rounds it, so the goals are
  16, 36, 60, 88, ... on Easy, 20, 45, 75, 110, ... on Normal and 24, 54, 90, 132, ... on Hard.
  Pouches and scoring do not change.
- `settings.reduceMotion` is not read anywhere else: the only motion is the score popups and the
  round banner tweens, which are left as they are.
- Keep Normal exactly as designed: the playthrough runs on Normal and expects goals 20 and 45.
- Keep the Tiny Kingdom row of the difficulty table in the root README (and the line under the
  game-over screenshot in this game's README) in sync with the `byDifficulty` values.
- The settings live under the `hub-settings` storage key, not in this game's save.

## Testing hooks

- `src/main.ts` exposes `window.game` in dev builds. The test reads
  `game.scene.getScene('Game')` and its `state` (copied through JSON), `preview` (`{ col, row,
  gained }` or null), `tileButtons` (`{ kind, x, y, w, h }` per button, in view pixels) and
  `undoButton` (`{ x, y, w, h }`).
- Inputs: it clicks tile buttons at the centres from `tileButtons`, clicks the undo button at its
  centre from `undoButton`, moves the mouse over a cell to check `preview`, and clicks cell
  centres, scaling view pixels by the canvas bounding box.
- The test mirrors these, so change them together: the `GameState` shape, `GRID` (as its own
  `GRID` constant), `VIEW`, `islandMap` (as `ISLAND` and `MAP`), `FIRST_POUCH`, `ROUND_POUCH`, the goals 20 and 45 (`GOALS`), the
  scene key `'Game'` and its public fields `state`, `preview` and `tileButtons`.
- The test seeds `Math.random`, so the game always picks island 1990; the test checks
  `state.island` is `ISLAND` and the grid matches its `MAP`. Changing `islandMap`, `ISLANDS`,
  `randomIsland`, or anything that calls `Math.random` before `GameScene.create` (Phaser itself
  draws some at boot) changes the island: take the new number and rows from the failure message
  and re-derive `PLAN`.
- `PLAN` in the test is six placements on `MAP` with the exact points each adds under
  `cellScore`, ending with the tower that reaches the goal of 20 and starts round 2. Editing the
  island, a scoring rule, `FIRST_POUCH` or `goalFor(1)` needs `PLAN` re-derived. The test also
  taps cell (0, 2) expecting a lake. After the second farm it tests undo: the undo takes that farm
  back, a second undo does nothing, and the farm is placed again.
- It saves `0-start`, `1-preview` and `2-round-2` screenshots (under `test-results/`); copy them
  into `docs/screenshots/` as `playthrough-*.png` when the look changes.

## Making common changes

- **Change a building's rule**: edit its case in `cellScore`, its `rule` in `INFO`, the README
  scoring table, then recompute the `gained` values (and maybe cells) in the test's `PLAN`.
- **Add a building**: add it to `BUILDINGS`, `INFO`, `cellScore` and `FIRST_POUCH` /
  `ROUND_POUCH`; draw it in `src/art/tiles.ts` and add it to `TILE_ART`; add a y to
  `TILE_BUTTONS.ys` (the panel fits three buttons now, so shrink `h` or move things); update the
  test's `Building` type, pouches and plan.
- **Add a terrain**: extend `Terrain`, the `TERRAIN` character map and `islandMap` in
  `src/game/tiles.ts`, add art to `TILE_ART`, and decide which `cellScore` rules count it.
- **Retune rounds**: `FIRST_POUCH`, `ROUND_POUCH` and `goalFor` (keep its `byDifficulty` factor
  and the README difficulty rows in step); the round banner text reads `ROUND_POUCH` itself.
  Update the test's constants and check the plan still reaches goal 1.
- **Change the art**: edit the faces in `src/art/tiles.ts`; a building's footprint sits on the
  slab's top face (x 2 to 62, y 2 to 54), so keep its parts inside that box.
- **Change the board size or islands**: `GRID` in `src/scenes/layout.ts` must match
  `MAP_SIZE`, and `PANEL` sits right of the board; mirror `GRID` in the test.

## Gotchas

- `GRID.cols` and `GRID.rows` must equal `MAP_SIZE`; nothing checks it, and
  `cellAt` uses `GRID` while the scene builds cell images from `state.grid`.
- `TILE_BUTTONS.ys` is indexed in `BUILDINGS` order.
- Texture keys are `tile-${cell}`, so every `Cell` value needs a `TILE_ART` entry or the image
  shows Phaser's missing texture.
- `undo` restores the snapshot with `Object.assign`, so any field added to `GameState` must be
  added to `Snapshot` too if it changes with a placement.
- `state.best` is updated in `place` but only written to storage by the scene in `tapAt`;
  `restart` keeps the higher of the stored best and the current one, so it survives blocked storage.
- `previewScore` returns null when the pouch for that kind is empty, so the hover outline shows
  but no ghost.
