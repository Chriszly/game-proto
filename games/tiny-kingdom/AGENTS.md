# Tiny Kingdom: guide for agents

How Tiny Kingdom is built and where things stand, for agents changing it. README.md covers how to
play, the scoring table, decrees, gifts and the rounds. Keep this file up to date with any change
to the game, per the root AGENTS.md.

## Current state

Tiny Kingdom is a turn-based tile-placing puzzle on a 10x7 island. The player picks a farm, house
or tower (and, once won as gifts, a windmill, market, harbor and lumber camp) from a pouch and
places it on grass; each building scores from its neighbours and the score is the whole board's
plus bonuses (decrees and seasons). Two houses side by side can merge into a manor. Each round has a
royal decree (a side goal paying +8 and a crown) and a season. Reaching the round's goal refills
the pouch, raises the goal and offers a choice of two gifts. The island is random, typed in by its
number, the island of the day, or one of eight campaign levels scored with stars.

Implemented today:

- Random islands: each kingdom (the first and every "New kingdom") draws an island number from
  1 to `ISLANDS` (9999) with `Math.random`, and `islandMap` lays it out from that number with its
  own seeded generator: two or three lakes of 2 to 4 cells, then two or three woods of 1 to 3,
  each grown from a random grass cell. The same number always gives the same island.
- Islands card (`src/game/islands.ts`, `createIslandsCard` in the scene): opened by the island
  button on the panel's round line (`ISLAND_BUTTON`) or the game-over "Islands" button. It has
  the campaign's eight level plaques with their best stars (locked ones dimmed), a line with the
  hovered level's island and star scores, the island of the day (with today's best), a random
  island, and a keypad (plus keyboard digits, Backspace, Enter and Escape) for an island number
  from 1 to `ISLANDS`. Each starts a new kingdom through `start(island, kingdom)`, which passes a
  `Kingdom` (`mode` `'random'`, `'code'`, `'daily'` or `'campaign'`, with `level` or `day`) to
  `newGame`. The island button reads "Island N", "Daily N" or "Level N"; the panel's bottom line
  shows the best score, today's best or the level's star scores.
- Island of the day: `dailyIsland(today())` hashes the local date (YYYY-MM-DD, from `new Date()`)
  to an island number, the same for every player that day. Its best is saved per day.
- Campaign: `LEVELS` (eight islands, each with three star scores set from a greedy bot's final
  score on Normal at 0.75, 0.9 and 1.05 of it). `starsFor(level, score)` counts the stars;
  `levelOpen` needs a star on the level before. The best stars per level are saved at game over.
- New buildings: the market (+1 per different kind of building around it, credited to the first
  one of each kind in `AROUND` order), the harbor (`canPlace` only allows it on grass with a lake
  beside; +2 per lake, +1 per house or manor beside) and the lumber camp (only beside a forest; +2
  per forest beside, and houses count it as +1). They are `SPECIALS` with the windmill:
  `state.unlocked` lists the ones won, in order, and `shownKinds` gives the tile buttons (the first
  three, then `unlocked`).
- Manors: `merge(s, from, to)` turns the house at `to` into a `'manor'` and the house at `from`
  (beside it) back into grass. A manor is a `Structure` but not a `Building` (it is never in the
  pouch). It scores 4, +3 per farm, +1 per house, manor or forest beside it; towers, houses,
  harbors and decrees count it as a house (`isHome`). In the scene, a tap on a `mergeable` house
  sets `mergeFrom` (teal outline), a tap on the house beside it merges, any other tap cancels; the
  hover shows "Tap to merge", and over the second house a manor ghost with `previewMerge`'s gain.
  A merge goes through `settle` like a placement: decree, rounds, undo snapshot and end check.
- Seasons (`src/game/seasons.ts`): `seasonFor(round)` cycles spring, summer, autumn, winter from
  round 1. Each doubles some buildings (`SEASON_INFO[...].double`): when one is placed,
  `seasonBonus` adds its worth again to `state.bonus`, so the board score never changes with the
  season. `Preview.season` and `Placed.season` carry it; the preview draws an "x2" pill by the
  bubble; the panel's season strip (`SEASON`) and the round banner show the season.
- One screen (`GameScene`): the decree banner above the board, the board in a walnut tray, a side
  panel (title plaque, round, island button, score, goal bar, the gift row, the season strip,
  three, four or a grid of tile buttons, undo, best score or star scores), a hover preview (ghost
  building, neighbour links, a "+N" bubble and a season "x2"), floating score popups for every
  building whose worth changed, a gift card over the board, the islands card, a "Round N" banner
  and a game-over overlay with "Islands" and "New kingdom" buttons.
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
  Windmill, then the next special not won yet (in `SPECIALS` order) plus one of +2 Towers / +3
  Houses / +3 Farms, then, once all four are won, two of the tile packs and +2 of each special
  (seeded by island and round).
  Reaching the goal sets `phase` to `'gift'` and counts `giftsDue` (one per goal; one placement
  can reach several); `chooseGift` adds the gift's tiles, adds a new special to `unlocked`,
  offers the next pair and goes back to `'playing'` when none are due. The card's buttons and the
  panel's chips both choose.
- The windmill: a fourth building, `+1 per farm around it, and +1 to each farm beside it`. Its tile
  button only shows once it is in `unlocked`; the panel then switches from three 80px buttons to
  four 60px ones (`TILE_BUTTONS.three` / `.four`), and from five kinds on to two columns of slim
  110x50 buttons (`TILE_BUTTONS.grid`, `buildGrid`) with the picked building's rule under them.
- Neighbour links: `previewPlacement` returns the gain, the new building's own `base` (1 for a
  farm) and one `Share` per neighbour (its part of the new building's points plus what it gains
  itself); the shares plus `base` and `season` always equal `gained`, because `cellParts` splits each
  building's score into a base and per-neighbour parts and `cellScore` is their sum. The scene
  draws each as a dotted curve from a yellow "+N" pill (coral for a negative share) on the
  neighbour to the ghost, and the total in a bubble over it.
- Rounds with goals from `goalFor` and pouch refills from `ROUND_POUCH`, without end.
- One undo per round: `state.undo` holds a snapshot taken in `place` or `merge`; `undo` restores it and
  records the round in `undoneIn`. A placement that fulfils a decree or starts a new round clears
  the snapshot, so it cannot be undone. Undo is only offered while `phase` is `'playing'`.
- Art: a wooden toy set painted on 2D canvases at boot (`src/art/`), in art units twice the view
  (the approved mockup's scale, `.../next5/tiny-kingdom/style-wooden-toy.png` and its `woodtoy.js`),
  baked at view size. Fonts are the system sans stack (`FONT`), weights 700 to 900.
- The game ends when the pouch is empty, or when no tile has room (`anyPlace`) and no two houses
  could merge. When only a merge is left, the undo button reads "No room: merge houses or finish"
  and calls `finish`. A reached goal first gets its gift, unless the island is full. The best
  final score, the crowns, the daily best and the campaign stars persist (`gameEnded`).

Missing or rough:

- No title screen, menu or sound.
- The campaign's star scores come from a greedy bot (`previewScore` for every kind and cell,
  merging when it gains), not from human play; retune `LEVELS` if they feel off.
- Islands are not checked for winnability; decrees are only checked for enough open spots, not
  for enough tiles in the pouch.
- The decree outline is drawn cell edge by cell edge (dashed, square corners), not as one rounded
  shape like the mockup.
- `restart` does not clear running popups or the round banner tween.
- The cover, `island-324.png`, `island-7409.png`, `windmill.png` and `game-over.png` are not
  made by the test: they were taken with a scratch Playwright script against the dev server (the
  cover and game-over set `state` fields through `window.game` to the mockup's round-3 board, then
  placed a tile by tapping; the islands called `newGame(0, 0, island)` from
  `/games/tiny-kingdom/src/game/state.ts` imported in the page). Refresh them the same way. The
  same goes for `new-buildings`, `season-harbor`, `season-lumber`, `merge-preview`, `manor`,
  `islands-card`, `no-room` and `campaign-over`: boards set up with `state.ts` imported in the
  page (greedy moves or hand-placed tiles), then real hovers, taps and keys.
- `docs/screenshots/readable-panel*.png` and `favicon.png` are older shots no README links.

## Architecture

File map (`src/`):

- `main.ts`: creates the `Phaser.Game` (960x540, `Phaser.Scale.FIT`, `pixelArt: false`) with
  `BootScene` and `GameScene`, calls `setupGame(game)` from `shared/setupGame.ts`, and in dev
  builds puts `game` on `window`.
- `scenes/BootScene.ts`: calls `bakeTextures`, then starts `Game`.
- `scenes/GameScene.ts`: builds the board (tile and prop images per cell), the decree banner, the
  panel (island button, season strip), the gift card, the islands card, the round banner and the
  game-over overlay; turns pointer events into `select`, `place`, `merge`, `undo`, `finish`,
  `chooseGift` and new kingdoms (`start`); draws the hover (ghost, links, bubble, season pill,
  merge hints), the decree marks, popups and panel in `refresh`; saves at game over (`gameEnded`).
- `scenes/layout.ts`: `VIEW`, `GRID`, `TRAY`, `DECREE`, `PANEL`, `TITLE`, `ISLAND_BUTTON`,
  `GOAL_BAR`, `GIFT_ROW`, `SEASON`, `TILE_BUTTONS` (`three`, `four` and `grid` layouts),
  `UNDO_BUTTON`, `GIFT_CARD`, `BUTTON`, `ISLANDS_CARD`, `UI_DEPTH`, `FONT` and `cellCentre`.
- `game/tiles.ts`: `BUILDINGS` (farm, house, tower, windmill, market, harbor, lumber), `SPECIALS`
  (the four gift buildings), the `Building`, `Special`, `Structure` (a building or `'manor'`),
  `Terrain` and `Cell` types, `INFO` (name, short name and rule text for each), `isBuilding`,
  `isHome`, `MAP_SIZE`, `ISLANDS`, `SIDES`, `AROUND`, `islandMap`, `seeded` (mulberry32),
  `randomIsland` and `startingGrid`.
- `game/state.ts`: `GameState`, `Snapshot`, `Share`, `Preview`, `Placed`, `FIRST_POUCH`,
  `ROUND_POUCH`, `goalFor`, `season`, `newGame(best, crowns, island?, kingdom?)`, `cellParts`,
  `cellScore`, `boardScore`, `canPlace(s, col, row, kind?)`, `previewPlacement`, `previewScore`,
  `select`, `place`, `canMerge`, `mergeable`, `previewMerge`, `merge`, `anyPlace`, `finish`,
  `canUndo`, `undo`, `chooseGift` and `shownKinds`; `settle` is the shared tail of `place` and
  `merge`. No Phaser; `goalFor` reads `byDifficulty` from `shared/settings.ts`.
- `game/seasons.ts`: `SEASONS`, `Season`, `SEASON_INFO` (name, rule, short rule, doubled
  buildings, colour), `seasonFor` and `seasonBonus`.
- `game/islands.ts`: `Mode`, `Kingdom`, `Level`, `LEVELS`, `starsFor`, `levelOpen`, `today`,
  `dailyIsland` and `parseIsland`.
- `game/decree.ts`: `DECREE_BONUS`, `Decree`, `DecreeMarks`, `At`, `regions`, `namedPlaces`,
  `decreeMarks` and `decreeFor`.
- `game/gifts.ts`: `GIFTS`, `Gift`, `GIFT_INFO` (label, icon, line, tiles), `giftsFor` and
  `newSpecial`.
- `game/save.ts`: `loadBest`, `saveBest`, `loadCrowns`, `saveCrowns`, `loadDailyBest`,
  `saveDailyBest`, `loadStars` and `saveStars`.
- `art/wood.ts`: the toolkit: `bake` (a view-sized canvas painted in art units, added with
  `textures.addCanvas`), `shadow` (canvas shadows halved to canvas pixels), `rrect`, `poly`,
  `circle`, `grain`, `tile` (a painted block), `walnut`, `shadowBlob`, `ball`, the palette `T`, the
  seeded `rnd` / `reseed`, and the painters `peg`, `house`, `tower`, `windmill`, `stripes` and
  `crown`, ported from the mockup's `woodtoy.js`, plus `manor`, `market`, `harbor` and `lumber`
  in the same style.
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
  `newGame(loadBest(), loadCrowns())` (a random island) and builds all objects once.
- There is no `update` method and no tick. The game is event driven: state only changes on a
  tap. Phaser's tweens animate the popups (`POPUP_MS`), the decree's "+8" and the round banner
  (`BANNER_MS`), so the only time-dependent part is cosmetic.
- Input: one interactive zone covers the board. `pointermove` calls `hoverAt`, which sets
  `preview` from `previewPlacement` and redraws the hover; `pointerdown` calls `tapAt`, which maps
  the point to a cell with `cellAt` and calls `merge` (second tap of a merge), picks a house to
  merge, or calls `place`. Each tile button's plaque calls `select`;
  the gift card's plaques and the panel's chips (enabled only while a gift is due) call
  `takeGift`. The gift card's dim rectangle over the tray, the game-over and the islands card's
  dim rectangles swallow taps to the board below. The islands card listens to `keydown` only while
  it is visible.
- Rendering is diffed objects, not a per-frame redraw: each cell has a tile image and a prop image
  (depth by row, so roofs and flags overlap the row above) whose textures are swapped by
  `redrawCells`; `refresh` rewrites the panel, rebuilds the tile buttons when the shown kinds
  change, redraws the goal bar, the decree banner and marks (`refreshDecree`) and the gift row and
  card (`refreshGifts`).

State model (`GameState` in `src/game/state.ts`):

- `grid` is `Cell[][]`, indexed `grid[row][col]`; cells are terrain or a building.
- `grid` cells can also be `'manor'`, which is never in the pouch.
- `pouch` counts tiles left per building (the specials 0 until their gift); `selected` is the
  building the next tap places.
- `score` is `boardScore(grid) + bonus`, recomputed after each placement. It can fall: a tower
  next to another tower is worth 0, so a placement's gain or preview can be negative.
- `bonus` (decree and season points won this kingdom), `crowns` (all kingdoms; loaded and saved),
  `decree` (`Decree | null`, with `done`), `gifts` (the pair on offer), `giftsDue`, `unlocked`
  (the specials won, in order).
- `island`, `mode`, `level` (0 outside the campaign), `day` ('' unless daily), `round`, `goal`,
  `placed`, `phase` (`'playing'`, `'gift'` or `'over'`) and `best`. The season is not stored:
  `season(s)` derives it from `round`.
- `undo` (the `Snapshot` of grid, pouch, score, bonus, selected and placed before the last
  placement or merge, or null) and `undoneIn` (the round the undo was last used in, 0 for none).
- `place` and `merge` both end in `settle`; order matters: snapshot, change the grid, add the
  season's bonus, then the decree (pays once, the first time
  `decreeMarks(...).have >= need`), then loop rounds while `score >= goal` (each adds
  `ROUND_POUCH` and a gift due), then a new decree on the board as it stands and `phase = 'gift'`,
  keep the snapshot only if no round began and no decree paid, reselect if the picked kind ran
  out, and check for the end only while playing (a gift due waits unless the island is full).
- Buildings only go on `'grass'`; `canPlace` also requires `phase === 'playing'`, and for a harbor
  a lake beside, for a lumber camp a forest beside.

Persistence: `tiny-kingdom-best` (the best final score, written at game over),
`tiny-kingdom-crowns` (crowns won, written whenever a decree pays), `tiny-kingdom-daily`
(`{ day, best }`, the island of the day's best, replaced when a new day's game ends) and
`tiny-kingdom-stars` (a JSON array of the best stars per campaign level, 0 to 3). Board and round
are never saved. The hub's settings are read from the shared `hub-settings` key.

Randomness and timing: `randomIsland` makes the game's only `Math.random` call, once per random
kingdom; the island, its decrees and its gifts all follow from that number (`seeded`). The only
date read is `today()` (`new Date()`) when the islands card opens or the daily island starts. The
game calls no `Date.now` or `performance.now`. The art uses its own seeded `rnd`, so textures are
identical every load. Only Phaser tweens use time.

Data tables:

- Scoring rules: the cases in `cellParts`, with `SIDES` and `AROUND` for the neighbourhoods.
- Button rule text: `INFO` in `src/game/tiles.ts` (keep it matching `cellParts`).
- Pouches and goals: `FIRST_POUCH`, `ROUND_POUCH` and `goalFor` in `src/game/state.ts`.
- Seasons: `SEASON_INFO` in `src/game/seasons.ts`. Campaign: `LEVELS` in `src/game/islands.ts`.
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
  Pouches, scoring, decrees, gifts, seasons and the campaign's star scores do not change (so stars
  come easier on Easy, where goals and their refills come sooner).
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
  all in view pixels. `mergeFrom` and `islandButton` are public too but the test does not use them.
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
  Round 1 is Spring fair, which doubles only markets and harbors, so no step gets a season bonus
  (the links check adds `season`, which is 0). No two houses stand side by side, so no tap picks a
  house to merge.
  Before the house it hovers (3,4) and expects links +2 from the farm (4,4) and +2 from the tower
  (2,4) (`LINKED`). The first hover, a farm at (5,5), expects a base of 1 and three lake links of
  +1. After the second farm it tests undo. After the goal it checks the gift card, that a tap on
  grass places nothing, takes the Windmill and checks the pouch, the fourth tile button and the
  new decree. Editing the island, a scoring rule, the decree choice for round 1, round 1's
  season, `FIRST_POUCH`, `goalFor(1)` or round 1's gifts needs `PLAN` re-derived.
- It saves `0-start`, `1-preview`, `2-decree`, `3-links`, `4-gift` and `5-round-2` screenshots
  (under `test-results/`); copy them into `docs/screenshots/` as `playthrough-*.png` when the look
  changes.

## Making common changes

- **Change a building's rule**: edit its case in `cellParts`, its `rule` in `INFO`, the README
  scoring table, then recompute the `gained` values (and links) in the test's `PLAN`.
- **Add a building**: add it to `BUILDINGS`, `INFO`, `cellParts`, `FIRST_POUCH` / `ROUND_POUCH`
  (and to `SPECIALS` plus a new and a more gift in `gifts.ts` if it is won as a gift); paint it in
  `src/art/wood.ts`, add it to `PROPS` and `ICONS` in `textures.ts`. The grid layout fits eight
  buttons (`TILE_BUTTONS.grid.ys` has four rows). Update the test's `Building` type and pouches.
- **Add a season or change one**: `SEASONS` and `SEASON_INFO`; round 1's season must not double
  anything the playthrough places, or its `PLAN` changes.
- **Add a campaign level**: append to `LEVELS` (the card's row fits about eight plaques at
  `ISLANDS_CARD.level`); set its star scores from a greedy run.
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
- `TILE_BUTTONS.three.ys` / `.four.ys` / `.grid` are indexed in the order of `shownKinds`
  (farm, house, tower, then the specials in the order won). `buildButtons` destroys and recreates
  them, so `tileButtons` changes when a special arrives.
- Season bonuses are banked into `bonus` at placement, so they are in the undo `Snapshot`; a
  manor's merge never gets one.
- `checkEnd` counts a possible merge as a reason to go on; `finish` is the way out then.
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
