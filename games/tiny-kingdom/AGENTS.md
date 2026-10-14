# Tiny Kingdom: guide for agents

How Tiny Kingdom is built and where things stand, for agents changing it. README.md covers how to
play, the scoring table, decrees, gifts and the rounds. Keep this file up to date with any change
to the game, per the root AGENTS.md.

## Current state

Tiny Kingdom is a turn-based tile-placing puzzle on a random 10x7 island. The player picks a farm,
house or tower (and, once won, a windmill) from a pouch and places it on grass; each building
scores from its neighbours and the score is the whole board's plus decree bonuses. Each round has a
royal decree (a side goal paying +8 and a crown). Reaching the round's goal refills the pouch,
raises the goal and offers a choice of two gifts.

Implemented today:

- Random islands: each kingdom (the first and every "New kingdom") draws an island number from
  1 to `ISLANDS` (9999) with `Math.random`, and `islandMap` lays it out from that number with its
  own seeded generator: two or three lakes of 2 to 4 cells, then two or three woods of 1 to 3,
  each grown from a random grass cell. The same number always gives the same island.
- One screen (`GameScene`): the decree banner above the board, the board in a walnut tray, a side
  panel (title plaque, round, island number, score, goal bar, the gift row, three or four tile
  buttons, undo, best score), a hover preview (ghost building, neighbour links and a "+N" bubble),
  floating score popups for every building whose worth changed, a gift card over the board, a
  "Round N" banner and a game-over overlay with a "New kingdom" button.
- Royal decrees (`src/game/decree.ts`): one per round, from `decreeFor`. Three kinds: `shore`
  (farms beside a named lake), `wood` (houses beside a named wood) and `watch` (one tower with 3
  houses around it). `need` is what the board already has plus `ASK` (3 farms, 2 houses; 3 for
  watch), so a decree never starts fulfilled. Round 1 always asks for 3 more farms on the lake with
  the most open shore; later rounds draw a kind and a place from a generator seeded by island and
  round, never repeating the last round's kind and place. Lakes and woods are named by
  `namedPlaces` from where their centre lies (North, South, East, West or Mid, plus mere / pool /
  tarn / water or wood / grove / holt / shaw for repeats). Progress (`decreeMarks`) is always
  counted from the board. Fulfilling it pays `DECREE_BONUS` (8) into `state.bonus` and a crown
  (`state.crowns`, saved). An unfulfilled decree lapses when the round ends. The board outlines the
  lake or wood (or the best tower's 3x3) with a yellow dashed line, shows the name on a navy pill,
  ticks counted buildings and marks open grass spots with a dashed box holding a small farm or
  house.
- Royal gifts (`src/game/gifts.ts`): `state.gifts` is the pair on offer for reaching `goal`, shown
  in the panel's gift row as blue chips ("Gift at 20:"). `giftsFor` gives round 1 +2 Towers or
  Windmill, then the Windmill plus one of +2 Towers / +3 Houses / +3 Farms until the windmill is
  won, then two of +2 Towers / +3 Houses / +3 Farms / +2 Windmills (seeded by island and round).
  Reaching the goal sets `phase` to `'gift'` and counts `giftsDue` (one per goal; one placement
  can reach several); `chooseGift` adds the gift's tiles, sets `hasWindmill` for windmill gifts,
  offers the next pair and goes back to `'playing'` when none are due. The card's buttons and the
  panel's chips both choose.
- The windmill: a fourth building, `+1 per farm around it, and +1 to each farm beside it`. Its tile
  button only shows once `hasWindmill` is set; the panel then switches from three 84px buttons to
  four 64px ones (`TILE_BUTTONS.three` / `.four`).
- Neighbour links: `previewPlacement` returns the gain, the new building's own `base` (1 for a
  farm) and one `Share` per neighbour (its part of the new building's points plus what it gains
  itself); the shares plus `base` always equal `gained`, because `cellParts` splits each
  building's score into a base and per-neighbour parts and `cellScore` is their sum. The scene
  draws each as a dotted curve from a yellow "+N" pill (coral for a negative share) on the
  neighbour to the ghost, and the total in a bubble over it.
- Rounds with goals from `goalFor` and pouch refills from `ROUND_POUCH`, without end.
- One undo per round: `state.undo` holds a snapshot taken in `place`; `undo` restores it and
  records the round in `undoneIn`. A placement that fulfils a decree or starts a new round clears
  the snapshot, so it cannot be undone. Undo is only offered while `phase` is `'playing'`.
- Art: a wooden toy set painted on 2D canvases at boot (`src/art/`), in art units twice the view
  (the approved mockup's scale, `.../next5/tiny-kingdom/style-wooden-toy.png` and its `woodtoy.js`),
  baked at view size. Fonts are the system sans stack (`FONT`), weights 700 to 900.
- The game ends when the pouch is empty or no grass is left (a reached goal first gets its gift,
  unless the island is full). The best final score and the crowns persist.

Missing or rough:

- No title screen, menu or sound. There is no way to type, read or share an island number.
- Islands are not checked for winnability; decrees are only checked for enough open spots, not
  for enough tiles in the pouch.
- The decree outline is drawn cell edge by cell edge (dashed, square corners), not as one rounded
  shape like the mockup.
- `restart` does not clear running popups or the round banner tween.
- The cover, `island-324.png`, `island-7409.png`, `windmill.png` and `game-over.png` are not
  made by the test: they were taken with a scratch Playwright script against the dev server (the
  cover and game-over set `state` fields through `window.game` to the mockup's round-3 board, then
  placed a tile by tapping; the islands called `newGame(0, 0, island)` from
  `/games/tiny-kingdom/src/game/state.ts` imported in the page). Refresh them the same way.
- `docs/screenshots/readable-panel*.png` and `favicon.png` are older shots no README links.

## Architecture

File map (`src/`):

- `main.ts`: creates the `Phaser.Game` (960x540, `Phaser.Scale.FIT`, `pixelArt: false`) with
  `BootScene` and `GameScene`, calls `setupGame(game)` from `shared/setupGame.ts`, and in dev
  builds puts `game` on `window`.
- `scenes/BootScene.ts`: calls `bakeTextures`, then starts `Game`.
- `scenes/GameScene.ts`: builds the board (tile and prop images per cell), the decree banner, the
  panel, the gift card, the round banner and the game-over overlay; turns pointer events into
  `select`, `place`, `undo` and `chooseGift`; draws the hover (ghost, links, bubble), the decree
  marks, popups and panel in `refresh`.
- `scenes/layout.ts`: `VIEW`, `GRID`, `TRAY`, `DECREE`, `PANEL`, `TITLE`, `GOAL_BAR`, `GIFT_ROW`,
  `TILE_BUTTONS` (`three` and `four` layouts), `UNDO_BUTTON`, `GIFT_CARD`, `BUTTON`, `UI_DEPTH`,
  `FONT` and `cellCentre`.
- `game/tiles.ts`: `BUILDINGS` (farm, house, tower, windmill), the `Building`, `Terrain` and
  `Cell` types, `INFO` (name and rule text for each button), `isBuilding`, `MAP_SIZE`, `ISLANDS`,
  `SIDES`, `AROUND`, `islandMap`, `seeded` (mulberry32), `randomIsland` and `startingGrid`.
- `game/state.ts`: `GameState`, `Snapshot`, `Share`, `Preview`, `Placed`, `FIRST_POUCH`,
  `ROUND_POUCH`, `goalFor`, `newGame(best, crowns, island?)`, `cellParts`, `cellScore`,
  `boardScore`, `canPlace`, `previewPlacement`, `previewScore`, `select`, `place`, `canUndo`,
  `undo` and `chooseGift`. No Phaser; `goalFor` reads `byDifficulty` from `shared/settings.ts`.
- `game/decree.ts`: `DECREE_BONUS`, `Decree`, `DecreeMarks`, `At`, `regions`, `namedPlaces`,
  `decreeMarks` and `decreeFor`.
- `game/gifts.ts`: `GIFTS`, `Gift`, `GIFT_INFO` (label, icon, line, tiles) and `giftsFor`.
- `game/save.ts`: `loadBest`, `saveBest`, `loadCrowns` and `saveCrowns`.
- `art/wood.ts`: the toolkit: `bake` (a view-sized canvas painted in art units, added with
  `textures.addCanvas`), `shadow` (canvas shadows halved to canvas pixels), `rrect`, `poly`,
  `circle`, `grain`, `tile` (a painted block), `walnut`, `shadowBlob`, `ball`, the palette `T`, the
  seeded `rnd` / `reseed`, and the painters `peg`, `house`, `tower`, `windmill`, `stripes` and
  `crown`, ported from the mockup's `woodtoy.js`.
- `art/textures.ts`: `bakeTextures` (every texture, listed at the top of the file), `PROP` and
  `PROP_ORIGIN` (where a prop's cell centre sits), `tileKey(cell, col, row)` (grass picks one of
  `GRASS_VARIANTS` flower variants by position; buildings and woods stand on `tile-plain`) and
  `propKey(cell)`. The table, the decree sign, the tray, the panel and the title plaque are the one
  `bg` texture.
- `ui/Button.ts`: `makeButton`, the beech plaque button used by the game-over overlay.

Shared code it imports (outside the game folder): `shared/setupGame.ts` (`setupGame`) and
`shared/settings.ts` (`byDifficulty`, `settings`).

How it runs:

- Boot: `BootScene.create` paints every texture, then `GameScene.create` calls
  `newGame(loadBest(), loadCrowns())` and builds all objects once.
- There is no `update` method and no tick. The game is event driven: state only changes on a
  tap. Phaser's tweens animate the popups (`POPUP_MS`), the decree's "+8" and the round banner
  (`BANNER_MS`), so the only time-dependent part is cosmetic.
- Input: one interactive zone covers the board. `pointermove` calls `hoverAt`, which sets
  `preview` from `previewPlacement` and redraws the hover; `pointerdown` calls `tapAt`, which maps
  the point to a cell with `cellAt` and calls `place`. Each tile button's plaque calls `select`;
  the gift card's plaques and the panel's chips (enabled only while a gift is due) call
  `takeGift`. The gift card's dim rectangle over the tray and the game-over dim rectangle swallow
  taps to the board below.
- Rendering is diffed objects, not a per-frame redraw: each cell has a tile image and a prop image
  (depth by row, so roofs and flags overlap the row above) whose textures are swapped by
  `redrawCells`; `refresh` rewrites the panel, rebuilds the tile buttons when the shown kinds
  change, redraws the goal bar, the decree banner and marks (`refreshDecree`) and the gift row and
  card (`refreshGifts`).

State model (`GameState` in `src/game/state.ts`):

- `grid` is `Cell[][]`, indexed `grid[row][col]`; cells are terrain or a building.
- `pouch` counts tiles left per building (`windmill` 0 until a windmill gift); `selected` is the
  building the next tap places.
- `score` is `boardScore(grid) + bonus`, recomputed after each placement. It can fall: a tower
  next to another tower is worth 0, so a placement's gain or preview can be negative.
- `bonus` (decree points won this kingdom), `crowns` (all kingdoms; loaded and saved), `decree`
  (`Decree | null`, with `done`), `gifts` (the pair on offer), `giftsDue`, `hasWindmill`.
- `island`, `round`, `goal`, `placed`, `phase` (`'playing'`, `'gift'` or `'over'`) and `best`.
- `undo` (the `Snapshot` of grid, pouch, score, selected and placed before the last placement, or
  null) and `undoneIn` (the round the undo was last used in, 0 for none).
- `place` order matters: snapshot, place and score, then the decree (pays once, the first time
  `decreeMarks(...).have >= need`), then loop rounds while `score >= goal` (each adds
  `ROUND_POUCH` and a gift due), then a new decree on the board as it stands and `phase = 'gift'`,
  keep the snapshot only if no round began and no decree paid, reselect if the placed kind ran
  out, and check for the end only while playing (a gift due waits unless the island is full).
- Buildings only go on `'grass'`; `canPlace` also requires `phase === 'playing'`.

Persistence: `tiny-kingdom-best` (the best final score, written at game over) and
`tiny-kingdom-crowns` (crowns won, written whenever a decree pays). Board and round are never
saved. The hub's settings are read from the shared `hub-settings` key.

Randomness and timing: `randomIsland` makes the game's only `Math.random` call, once per kingdom;
the island, its decrees and its gifts all follow from that number (`seeded`). The game calls no
`Date.now` or `performance.now`. The art uses its own seeded `rnd`, so textures are identical
every load. Only Phaser tweens use time.

Data tables:

- Scoring rules: the cases in `cellParts`, with `SIDES` and `AROUND` for the neighbourhoods.
- Button rule text: `INFO` in `src/game/tiles.ts` (keep it matching `cellParts`).
- Pouches and goals: `FIRST_POUCH`, `ROUND_POUCH` and `goalFor` in `src/game/state.ts`.
- Decrees: `DECREE_BONUS`, `ASK` and the kinds in `decreeFor` / `makeDecree`; names in
  `namedPlaces`.
- Gifts: `GIFT_INFO` and `giftsFor` in `src/game/gifts.ts`.
- Popup and banner timings: `POPUP_MS` and `BANNER_MS` in `src/scenes/GameScene.ts`.
- Positions and sizes: `src/scenes/layout.ts`. Colours: `T` in `src/art/wood.ts`, and the text
  and Graphics colours at the top of `GameScene.ts`.

### Hub settings

- `src/main.ts` calls `setupGame(game)` from `shared/setupGame.ts` right after creating the game,
  which applies the frame cap, the FPS readout, reduced motion and full screen (camera shake and flash become
  no-ops; this game uses neither).
- Difficulty scales one number: the round goals. `goalFor` in `src/game/state.ts` multiplies the
  base goal by `byDifficulty(0.8, 1, 1.2)` (Easy, Normal, Hard) and rounds it, so the goals are
  16, 36, 60, 88, ... on Easy, 20, 45, 75, 110, ... on Normal and 24, 54, 90, 132, ... on Hard.
  Pouches, scoring, decrees and gifts do not change.
- `settings.reduceMotion`: the score popups and the decree's "+8" only fade in place (no rise or
  fall), and the crown count does not bump. The round banner only fades. Nothing blinks.
- Keep Normal exactly as designed: the playthrough runs on Normal and expects goals 20 and 45.
- Keep the Tiny Kingdom row of the difficulty table in the root README (and the line under the
  screenshots in this game's README) in sync with the `byDifficulty` values.

## Testing hooks

- `src/main.ts` exposes `window.game` in dev builds. The test reads
  `game.scene.getScene('Game')` and its `state` (copied through JSON), `preview` (`{ col, row,
  gained, base, links }` or null), `tileButtons` (`{ kind, x, y, w, h }` per shown button),
  `undoButton` (`{ x, y, w, h }`) and `giftButtons` (`{ gift, x, y, w, h }` while a gift is due),
  all in view pixels.
- Inputs: it clicks tile buttons, the undo button and a gift button at their centres, moves the
  mouse over cells to check `preview`, and clicks cell centres, scaling view pixels by the canvas
  bounding box. It reads `localStorage['tiny-kingdom-crowns']` to check the crown is saved.
- The test mirrors these, so change them together: the `GameState` shape, `GRID`, `VIEW`,
  `islandMap` (as `ISLAND` and `MAP`), `FIRST_POUCH`, `ROUND_POUCH`, the goals 20 and 45
  (`GOALS`), `DECREE_BONUS`, round 1's decree (`FIRST_DECREE`: 3 farms on the shore of Eastmere),
  round 1's gifts (`FIRST_GIFTS`) and the windmill gift's tiles (`WINDMILLS`), the scene key
  `'Game'` and its public fields.
- The test seeds `Math.random`, so the game always picks island 1990. Changing `islandMap`,
  `ISLANDS`, `randomIsland`, or anything that calls `Math.random` before `GameScene.create`
  changes the island: take the new number and rows from the failure message and re-derive `PLAN`.
- `PLAN` is five placements on `MAP`: farms at (5,5), (4,4) and (7,5) (the third fulfils the
  decree: 10 points + 8), a tower at (2,4) (+0) and a house at (3,4) (+4, reaching 22 >= 20).
  Before the house it hovers (3,4) and expects links +2 from the farm (4,4) and +2 from the tower
  (2,4) (`LINKED`). The first hover, a farm at (5,5), expects a base of 1 and three lake links of
  +1. After the second farm it tests undo. After the goal it checks the gift card, that a tap on
  grass places nothing, takes the Windmill and checks the pouch, the fourth tile button and the
  new decree. Editing the island, a scoring rule, the decree choice for round 1, `FIRST_POUCH`,
  `goalFor(1)` or round 1's gifts needs `PLAN` re-derived.
- It saves `0-start`, `1-preview`, `2-decree`, `3-links`, `4-gift` and `5-round-2` screenshots
  (under `test-results/`); copy them into `docs/screenshots/` as `playthrough-*.png` when the look
  changes.

## Making common changes

- **Change a building's rule**: edit its case in `cellParts`, its `rule` in `INFO`, the README
  scoring table, then recompute the `gained` values (and links) in the test's `PLAN`.
- **Add a building**: add it to `BUILDINGS`, `INFO`, `cellParts`, `FIRST_POUCH` / `ROUND_POUCH`;
  paint it in `src/art/wood.ts`, bake a `prop-<kind>` (and `icon-<kind>`) in `textures.ts` and
  add it to `propKey`; the panel fits four buttons (`TILE_BUTTONS.four`), so a fifth needs a new
  layout. Update the test's `Building` type, pouches and plan.
- **Add a decree kind**: add it to `DecreeKind`, `ASK`, `decreeMarks` (what counts and the open
  spots), `makeDecree` (its text and when it can be offered) and the shuffle in `decreeFor`; pick
  its spot texture in `refreshDecree`.
- **Add a gift**: add it to `GIFTS` and `GIFT_INFO` and to a pool in `giftsFor`; a gift that is not
  a tile pack also needs handling in `chooseGift`.
- **Retune rounds**: `FIRST_POUCH`, `ROUND_POUCH` and `goalFor` (keep its `byDifficulty` factor
  and the README difficulty rows in step); the round banner reads `ROUND_POUCH` itself. Update the
  test's constants and check the plan still reaches goal 1.
- **Change the art**: painters in `src/art/wood.ts`, textures and the static `bg` in
  `textures.ts`. A prop's texture is `PROP` (80x100) with the cell centre at `PROP_ORIGIN`; keep a
  building inside it. Tile buttons draw the cell's tile and prop in a scaled container.
- **Change the board size or islands**: `GRID` in `src/scenes/layout.ts` must match `MAP_SIZE`,
  `TRAY` frames it and `DECREE` sits above it; mirror `GRID` in the test.

## Gotchas

- `GRID.cols` and `GRID.rows` must equal `MAP_SIZE`; nothing checks it.
- `TILE_BUTTONS.three.ys` / `.four.ys` are indexed in the order of the shown kinds (`BUILDINGS`
  without the windmill until it is won). `buildButtons` destroys and recreates them, so
  `tileButtons` changes when the windmill arrives.
- Canvas shadows ignore the canvas transform: use `shadow()` in `wood.ts`, which halves art units.
- `undo` restores the snapshot with `Object.assign`, so any field added to `GameState` must be
  added to `Snapshot` too if an undoable placement changes it. Decree payouts are never undoable
  for that reason (`bonus` and `crowns` are not in the snapshot).
- `state.best` is updated when the game ends but only written to storage by the scene;
  `restart` keeps the higher of the stored and current best and crowns, so they survive blocked
  storage.
- `previewPlacement` returns null when the pouch for that kind is empty, so the hover outline shows
  but no ghost.
- In the `'gift'` phase `round` and `goal` already show the next round; the card's title uses
  `round - giftsDue` for the round whose goal was reached.
