# Tiny Kingdom: guide for agents

How Tiny Kingdom is built and where things stand, for agents changing it. README.md covers how to
play, the scoring table and the rounds. Keep this file up to date with any change to the game, per
the root AGENTS.md.

## Current state

Tiny Kingdom is a turn-based tile-placing puzzle on a fixed 10x7 island. The player picks a farm,
house or tower from a pouch and places it on grass; each building scores from its neighbours and
the score is always the whole board's. Reaching the round's goal refills the pouch and raises the
goal.

Implemented today:

- One screen (`GameScene`): the board, a side panel with round, score, goal bar, three tile
  buttons and the best score, a hover preview with a ghost tile and "+N", floating score popups
  for every building whose worth changed, a "Round N" banner, and a game-over overlay with a
  "New kingdom" button.
- Rounds with goals from `goalFor` and pouch refills from `ROUND_POUCH`, without end.
- The game ends when the pouch is empty or no grass is left. Only the best final score persists.

Missing or rough:

- No title screen, menu, sound, undo, or randomness: the island is always `MAP` in
  `src/game/tiles.ts`, so every kingdom is the same puzzle.
- `src/art/pixelArt.ts` is a general helper; `bakePixelArt`, `padRows`, `PixelCanvas.ellipse`,
  `line` and `outline` are unused here.
- The comment at the top of `src/art/tiles.ts` mentions a small icon per building, but none is
  baked; the tile buttons reuse the `tile-<kind>` texture scaled to 0.875.
- Picking a building does not redraw the hover until the pointer moves again.
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
- `scenes/layout.ts`: `VIEW`, `GRID`, `PANEL`, `GOAL_BAR`, `TILE_BUTTONS`, `BUTTON`, `UI_DEPTH`,
  `FONT` and `cellCentre`.
- `game/tiles.ts`: `BUILDINGS`, the `Building`, `Terrain` and `Cell` types, `INFO` (name and rule
  text for each button), `isBuilding`, the island `MAP` and `startingGrid`.
- `game/state.ts`: `GameState`, `FIRST_POUCH`, `ROUND_POUCH`, `goalFor`, `newGame`, `cellScore`,
  `boardScore`, `canPlace`, `previewScore`, `select` and `place`. No Phaser; `goalFor` reads
  `byDifficulty` from `shared/settings.ts`.
- `game/save.ts`: `loadBest` and `saveBest`.
- `art/tiles.ts`: draws grass, lake, forest, farm, house and tower on 32x32 `PixelCanvas`es and
  bakes them at 2x as `tile-<cell>` textures (64px, one cell).
- `art/pixelArt.ts`: `PixelCanvas` (paint, then `bake` into a texture) and `seeded`, a xorshift
  generator for grass speckle.
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
  texture is swapped on placement or restart, and `refresh` rewrites the panel texts, goal bar
  and button highlights after each change.

State model (`GameState` in `src/game/state.ts`):

- `grid` is `Cell[][]`, indexed `grid[row][col]`; cells are terrain or a building.
- `pouch` counts tiles left per building; `selected` is the building the next tap places.
- `score` is always `boardScore(grid)`, recomputed after each placement. It can fall: a tower
  next to another tower is worth 0, so a placement's gain or preview can be negative.
- `round`, `goal`, `placed`, `phase` (`'playing'` or `'over'`) and `best`.
- The pure functions in `state.ts` mutate it (`select`, `place`); the scene only replaces it
  with `newGame` on create and restart and calls `saveBest` when `phase` turns `'over'`.
- `place` order matters: it scores, then loops rounds while `score >= goal` (one placement can
  jump several rounds), refills the pouch, reselects the first building left if the placed kind
  ran out, and only then checks for the end. So a placement that empties the pouch but reaches
  the goal carries on.
- Buildings only go on `'grass'`; `canPlace` also requires `phase === 'playing'`.

Persistence: one `localStorage` key, `tiny-kingdom-best`, holding the best final score. It is
written only at game over. Board and round are never saved. The hub's settings are read from the
shared `hub-settings` key, not from this game's save.

Randomness and timing: the game calls no `Math.random`, `Date.now` or `performance.now`. Art uses
`seeded`, so textures are identical every load. Only Phaser tweens use time.

Data tables:

- Scoring rules: the cases in `cellScore`, with `SIDES` and `AROUND` for the neighbourhoods.
- Button rule text: `INFO` in `src/game/tiles.ts` (keep it matching `cellScore`).
- Pouches and goals: `FIRST_POUCH`, `ROUND_POUCH` and `goalFor` in `src/game/state.ts`
  (`goalFor` scales by difficulty; see Hub settings).
- The island: `MAP` in `src/game/tiles.ts` ('.' grass, '~' lake, 'T' forest).
- Popup and banner timings: `POPUP_MS` and `BANNER_MS` in `src/scenes/GameScene.ts`.
- Positions and sizes: `src/scenes/layout.ts`. Colours: `C` in `src/art/tiles.ts`, and inline
  hex values in `GameScene.ts`.

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
  gained }` or null) and `tileButtons` (`{ kind, x, y, w, h }` per button, in view pixels).
- Inputs: it clicks tile buttons at the centres from `tileButtons`, moves the mouse over a cell
  to check `preview`, and clicks cell centres, scaling view pixels by the canvas bounding box.
- The test mirrors these, so change them together: the `GameState` shape, `GRID` (as its own
  `GRID` constant), `VIEW`, `FIRST_POUCH`, `ROUND_POUCH`, the goals 20 and 45 (`GOALS`), the
  scene key `'Game'` and its public fields `state`, `preview` and `tileButtons`.
- `PLAN` in the test is seven placements on `MAP` with the exact points each adds under
  `cellScore`, ending with the tower that reaches the goal of 20 and starts round 2. Editing
  `MAP`, a scoring rule, `FIRST_POUCH` or `goalFor(1)` needs `PLAN` re-derived. The test also taps
  cell (3, 2) expecting a lake.
- It saves `playthrough-0-start`, `-1-preview` and `-2-round-2` screenshots; copy them into
  `docs/screenshots/` when the look changes.

## Making common changes

- **Change a building's rule**: edit its case in `cellScore`, its `rule` in `INFO`, the README
  scoring table, then recompute the `gained` values (and maybe cells) in the test's `PLAN`.
- **Add a building**: add it to `BUILDINGS`, `INFO`, `cellScore` and `FIRST_POUCH` /
  `ROUND_POUCH`; draw it in `src/art/tiles.ts` and add it to `TILE_ART`; add a y to
  `TILE_BUTTONS.ys` (the panel fits three buttons now, so shrink `h` or move things); update the
  test's `Building` type, pouches and plan.
- **Add a terrain**: extend `Terrain`, the `TERRAIN` character map and `MAP` in
  `src/game/tiles.ts`, add art to `TILE_ART`, and decide which `cellScore` rules count it.
- **Retune rounds**: `FIRST_POUCH`, `ROUND_POUCH` and `goalFor` (keep its `byDifficulty` factor
  and the README difficulty rows in step); the round banner text reads `ROUND_POUCH` itself.
  Update the test's constants and check the plan still reaches goal 1.
- **Change the board size or island**: `GRID` in `src/scenes/layout.ts` must match `MAP`'s
  dimensions, and `PANEL` sits right of the board; mirror `GRID` in the test.

## Gotchas

- `GRID.cols` and `GRID.rows` must equal `MAP`'s width and height; nothing checks it, and
  `cellAt` uses `GRID` while the scene builds cell images from `state.grid`.
- `TILE_BUTTONS.ys` is indexed in `BUILDINGS` order.
- Texture keys are `tile-${cell}`, so every `Cell` value needs a `TILE_ART` entry or the image
  shows Phaser's missing texture.
- `state.best` is updated in `place` but only written to storage by the scene in `tapAt`;
  `restart` reloads it from storage.
- `previewScore` returns null when the pouch for that kind is empty, so the hover outline shows
  but no ghost.
