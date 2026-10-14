# TinctureTinker: guide for agents

How this game is built and where things stand, for agents about to change it. `README.md` covers how
to play and lists the orders. Keep this file up to date with any change to the game, as the root
`AGENTS.md` asks.

## Current state

A match-3 game: an 8x8 board of five ingredient kinds, where swapping two neighbours to line up
three or more gathers them towards a potion order with a move limit. It is drawn as an Art Nouveau
apothecary label (flat muted inks, bold sepia outlines, cream tiles, gold whiplash ornament on
bottle green, serif italics), all painted in code on 2D canvases. It shares no code with Apothecary.

- **Implemented:** tap-tap and drag swaps, invalid swaps sliding back for free, matches in rows and
  columns, gravity and refill, free cascades, Catalyst tiles (a run of four or more leaves one; a
  matched Catalyst clears its whole row), an automatic shuffle when no move is left, an idle hint
  that swells two tiles (held still with reduced motion), an order label with progress bars, two
  bench tools bought with coins mid-order (Stir: +3 moves for 40; Sift: reroll a row for 25), 1-3
  stars per sale by moves left, a saved tinker rank on a ribbon above the board whose ranks unlock
  three more recipes, a caption cartouche under the tray, and a result card ("Next order" or
  "Try again") showing the stars and rank news.
- **Progression:** `order`, `coins`, `sold` and `stars` carry over. Coins buy bench tools; stars
  set the rank (`src/game/ranks.ts`), and each rank's recipe joins the round of orders.
- **Screens:** one scene (`GameScene`) with the rank ribbon and board on the left, the order label
  on the right, a caption under the board and a result card over the board. No title screen, menu,
  in-game settings or sound (the hub's settings apply, see Hub settings).
- **Persistence:** progress is saved when an order sells and whenever a bench tool is bought. The
  board and moves left are not saved, so a reload restarts the current order on a fresh board (with
  the coins already spent gone).
- **Rough edges:** every gathered tile counts in `got`, including kinds the order doesn't need.
  Unlocking a recipe lengthens the round, so the potion for a given order number can shift after a
  rank-up. The hub card shows the cover with the hub's pixelated image style. There are no TODO
  comments in the code.

## Architecture

### File map

- `src/main.ts`: creates the `Phaser.Game` (960x540, FIT scaling, `pixelArt: false`) with
  `BootScene` and `GameScene`, calls `setupGame(game)` and puts `game` on `window` in dev builds.
- `src/game/kinds.ts`: `KINDS`, the `Kind` type, `KIND_NAMES` and `randomKind`.
- `src/game/orders.ts`: `PotionId`, `POTION_NAMES`, the `Order` type, the `ORDERS` table,
  `RANK_RECIPES` (the three unlockable recipes), `MOVE_BONUS`, the per-round growth (`ROUND_NEEDS`,
  `ROUND_PRICE`) and `orderFor(number, unlocked)`, which also adds the difficulty's moves.
- `src/game/ranks.ts`: `STARS_3`, `STARS_2`, `starsFor(movesLeft)`, the `RANKS` table, `rankOf` and
  `unlockedRecipes`.
- `src/game/board.ts`: the `Board`, `Tile` (with optional `catalyst`), `Cell` and `Run` types and
  pure board logic: `swapped`, `findRuns`, `findMatches`, `matchesAt`, `validMoves`, `collapse`,
  `freshBoard`, `shuffle`, `adjacent`, `inBoard`.
- `src/game/state.ts`: `Progress`, `GameState`, `freshProgress`, `startOrder`, `tileMaker`,
  `filled`, `progressOf`.
- `src/game/sim.ts`: `trySwap` (plays a swap out to completion and returns its `Step`s, brewing and
  firing Catalysts in `gather`), `CATALYST_RUN`, the bench tools (`Tool`, `TOOLS`, `STIR_MOVES`,
  `canUse`, `stir`, `sift`) and `nextOrder`.
- `src/game/save.ts`: `loadProgress` and `saveProgress` in `localStorage`.
- `src/scenes/BootScene.ts`: calls `bakeTextures`, then starts `Game`.
- `src/scenes/GameScene.ts`: draws everything, handles input and the tool buttons, animates steps
  and sifts, shows hints, the rank ribbon, the caption and the result card.
- `src/scenes/layout.ts`: `VIEW`, `BOARD`, `TRAY`, `RIBBON`, `PANEL`, `NEEDS`, `TOOL`, `CAPTION`,
  `BUTTON`, `UI_DEPTH`, `SERIF`, `cellX`, `cellY`. It matches the approved mockup at half its
  1920x1080 size.
- `src/art/nouveau.ts`: the painting toolkit: `bake` (paints in art units, twice the view, onto a
  canvas scaled by a half, and adds it with `textures.addCanvas`), the inks (`SEPIA`, `GOLD`,
  `CREAM`, `BOTTLE`...), shape helpers (`poly`, `rrect`, `whip`, `cornerOrn`, `doubleRule`,
  `goldStar`, `coin`) and `ingredient(kind, x, y, s)`, the five ingredient silhouettes.
- `src/art/textures.ts`: `bakeTextures` and the texture keys: `table` (the whole static
  background: wall, tray and cells, ribbon band, order label with its crest and "Bench tools"
  heading), `kind-<kind>`, `catalyst-<kind>` (sunburst halo), `need-<kind>`, `potion-<id>`
  (flask coloured from `BREWS`), `coin`, `star-on`, `star-off`, `tool-<tool>-<on|off|armed>`,
  `button`, `cursor`, `band`, `sun`, `result-card`. Also `kindTexture`, `needTexture`,
  `potionTexture`, `toolTexture`, `POTION_ORIGIN`, `TOOL_PAD`.
- `src/ui/Button.ts`: `makeButton`, the bottle-green cartouche on the result card.
- `shared/setupGame.ts` and `shared/settings.ts` (outside the game folder): the hub's settings,
  imported by `src/main.ts`, `src/game/orders.ts` and `src/scenes/GameScene.ts`.

### How it runs

- **Boot:** `BootScene.create` paints every texture (see the file map). There are no asset files.
- **Start:** `GameScene.create` adds the `table` image and the persistent UI (ribbon texts and bar,
  moves, stars and coins, the tool buttons, the caption, the result card), then
  `begin(startOrder(loadProgress()))`. `begin` replaces `state`, destroys and recreates one image per
  tile (keyed by tile `id` in `sprites`), rebuilds the order label (`buildPanel`) and hides the card.
- **Input:** the scene's `pointerdown` listener skips taps on a game object (a tool button or the
  result button), so the same tap doesn't also pick a tile. `pointerDown` maps the pointer to a cell
  with `cellAt`. While `sifting`, a tap on a cell sifts its row. Otherwise the first tap sets
  `selected`, a tap on a neighbour calls `swap`, a tap on the same tile clears it. `pointerMove`
  swaps once a drag goes half a cell. `swap` clears the drag start, so a held second tap of a
  tap-tap swap that drags after the board settles does not swap again. Input is ignored while
  `busy` or when `state.phase` is not `play`.
- **Rules then animation:** `swap` calls `trySwap`, which mutates `state` right away (board, moves,
  `got`, `brewed`, `fired`, phase, coins, stars). The scene then queues `Anim`s: a slide, the slide
  back if there was no match, or for each `Step` a pop of the cleared tiles (with the fired rows'
  bands blinking and brewed tiles swapping to their Catalyst texture) and a `moveTo` of the new
  board, then `settle`.
- **Catalysts:** `gather` in `sim.ts` takes `findRuns`, adds the whole row of every matched
  Catalyst, then for each run of `CATALYST_RUN` (4) or more keeps one tile on the board as a
  Catalyst: on the swap's own match the moved tile if it is in the run, otherwise the middle of the
  run's free tiles (not a Catalyst, not in a cleared row). Catalysts match by `kind` like any tile.
- **Bench tools:** `useTool` (a button's `pointerdown`) checks `canUse`; Stir calls `stir` and saves;
  Sift toggles `sifting`, and the next board tap calls `siftRow`, which calls `sift` (new tiles for
  the row, Catalysts kept, rerolled until nothing matches and a move is left, else a shuffle), saves
  and animates the row fading out and growing back. Buttons show `on`, `off` (not affordable or not
  playing) or `armed` (Sift waiting for a row).
- **Tick:** `update(time)` takes `dt` from Phaser's frame timestamp, clamped to `MAX_STEP_MS`, and
  feeds `runQueue` (plays queued `Anim`s in order, by game time) and `updateHint`.
- **Rendering:** tile sprites are long-lived and moved by animations, not redrawn. Depths: table 0,
  bands 1.5, cursor 1.8, Catalysts 1.9 (their rays sit under the neighbours), tiles 2, panel 3,
  result card `UI_DEPTH`. `refresh` redraws the need bars (`bars` graphics), moves, live stars and
  rule line, the rank ribbon, the tool looks, the coins, the caption and the cursor, and puts the
  Catalyst row bands back when not busy (`showBands`; they are hidden while tiles move). The bars
  follow `shown`, a copy of `got` that catches up as each pop finishes, so the panel lags `state`
  until `settle`. `settle` clears `busy`, saves on a sale and shows the result card.

### State model

- `Progress` (`order`, `coins`, `sold`, `stars`) is what is saved and carried between orders.
- `GameState` extends it with `current` (the `Order` from `orderFor`), `got` (per-kind counts for
  this order), `moves`, `phase` (`play`, `sold`, `failed`), `earned`, `orderStars` (0 until sold),
  `brewed` and `fired` (Catalysts this order), `board` and `nextId`.
- `Board` is `Tile[][]`, rows from the top. Each `Tile` has a unique `id` from `nextId`, which
  restarts at 1 for every order; the scene relies on ids to track sprites through falls. A brewed
  Catalyst keeps its tile's id and gains `catalyst: true`.
- Only `trySwap`, `stir`, `sift` and `startOrder` / `nextOrder` change the rules state; the scene
  owns only view state (`busy`, `selected`, `sifting`, `shown`, the queue, hints).
- Invariants: a new, shuffled or sifted board has no matches and at least one valid move; `trySwap`
  returns `null` and changes nothing for a swap that makes no match; on a sale `order` already
  points at the next order, `earned = price + moves * MOVE_BONUS`, `orderStars = starsFor(moves)`
  and `stars` includes it. A failed order keeps the same `order`, so "Try again" replays it on a new
  board. The order's recipe list comes from `unlockedRecipes(stars)`, so order 1 with no stars is
  always the Healing Draught.

### Persistence

One key of its own, `tincture-tinker-progress`, holding the JSON `Progress`. `loadProgress` merges
it over `freshProgress()`, puts back the default of any field that is out of range (`order` and
`stars` must be whole numbers, from 1 and 0; `coins` and `sold` finite numbers from 0) and falls
back to a fresh start on any error. Saves from before stars existed load with `stars: 0`. The hub's
settings are stored separately under `hub-settings`.

### Randomness and timing

- `Math.random` is used in `randomKind` (new tiles, the rerolls in `freshBoard` and `sift`) and in
  `shuffle`. The order and number of calls decide the board the seeded test sees; a brewed Catalyst
  means one fewer new tile, and a fired row more.
- Animation and hint timing use only the `time` argument of `update`; the hint swell uses the
  scene's own `clock`. The Stir pulse and the result card's fade are Phaser tweens (game clock).
  Nothing uses `Date` or `setTimeout`. Textures are painted without randomness.
- The hint picks `validMoves(board)[0]`, so it is deterministic.

### Data tables

- Orders, unlockable recipes, prices, move limits, growth per round and `MOVE_BONUS`:
  `src/game/orders.ts`. Ranks and star thresholds: `src/game/ranks.ts`. Tool prices and Stir's
  moves: `TOOLS`, `STIR_MOVES` in `src/game/sim.ts`; Catalyst run length: `CATALYST_RUN`.
- Ingredient kinds and names: `src/game/kinds.ts`. Board size: `ROWS`, `COLS` in
  `src/game/board.ts`.
- Animation and hint timings: `SWAP_MS`, `CLEAR_MS`, `FALL_MS`, `SHUFFLE_MS`, `SIFT_MS`, `HINT_MS`,
  `MAX_STEP_MS` at the top of `src/scenes/GameScene.ts`; captions `CAPTION_TIP`, `CAPTION_SIFT`.
- Positions and sizes: `src/scenes/layout.ts`. Text offsets in the order label, the footer and the
  result card are inline in `GameScene` (`buildPanel`, `createFooter`, `createResult`), taken from
  the mockup at half scale. Potion colours: `BREWS` in `src/art/textures.ts`.

### Hub settings

- `src/main.ts` calls `setupGame(game)` from `shared/setupGame.ts` right after creating the game,
  which applies the frame cap, the FPS readout and reduced motion (camera shake and flash become
  no-ops; this game uses neither).
- Difficulty scales one number: the moves of every order. `orderFor` in `src/game/orders.ts` adds
  `byDifficulty(5, 0, -3)` to the order's `moves`, so Easy gives 5 more, Normal the table's value
  and Hard 3 fewer. `ORDERS` and `RANK_RECIPES` themselves are unchanged.
- `settings.reduceMotion` is read in `GameScene`: the hint tiles hold a fixed larger scale instead
  of swelling, a fired Catalyst's row band holds steady instead of blinking, brewed Catalysts don't
  bounce, Stir doesn't pulse the moves and the result card appears without its fade.
- Keep Normal exactly as designed: the playthrough runs on Normal and expects `ORDER_1.moves`.
- Keep the TinctureTinker row of the difficulty table in the root `README.md` and the difficulty
  sentence in this game's `README.md` in sync with the values.
- The settings live under the `hub-settings` storage key, read once at page load, not in the
  game's own save.

## Testing hooks

- Dev builds expose `window.game`. The test reads `game.scene.getScene('Game')` and copies `state`,
  `busy` and `selected` from it as JSON. Keep those names and their meaning (`sifting` is there too,
  for docs scripts).
- It seeds `Math.random`, owns the clock (64ms frames) and forces the canvas renderer.
- Inputs are mouse clicks on cell centres, computed from its own copy of `VIEW` and `BOARD`
  (`x: 46, y: 46, cell: 56, size: 8`), and one click on the middle of Stir (`STIR`, from `TOOL`).
  It never drags.
- Steps: checks the first order (`ORDER_1`: healingDraught, ember 12 and sage 12, 15 moves, 30
  coins), that the new board has no matches and `got` is all zero; taps a horizontal swap that makes
  no match and checks `selected`, an unchanged board and unchanged moves; taps Stir with 0 coins and
  checks moves and coins are unchanged and no tile is picked; then repeatedly taps its `bestSwap`
  and waits for `busy` to clear, checking one move is spent, at least the first match's tiles are
  gathered less one per run of four or more (the Catalyst it keeps) and, when no Catalyst is in
  that match, `brewed` grew by the number of such runs; finally checks `phase: 'sold'`, `earned`,
  `coins`, `sold: 1`, `order: 2`, `orderStars = starsFor(moves)` and `stars = orderStars`. On the
  seeded board a Catalyst is brewed on swap 4 and fired on swap 6.
- Keep in sync: `ORDER_1` (Normal's moves), `MOVE_BONUS` and `starsFor` with `src/game/orders.ts`
  and `src/game/ranks.ts`; `STIR` with `TOOL` and `TOOLS.stir.cost`; `VIEW` and `BOARD` with
  `src/scenes/layout.ts` and `ROWS`/`COLS`; the `Kind`, `Tile` and `GameState` shapes declared at
  the top of the test; the game's URL path in the test's `page.goto`.
- Bench tools and ranks above Apprentice stay out of the playthrough (purchases are not part of
  the first round).

## Making common changes

- **Add or retune an order:** edit `ORDERS` in `src/game/orders.ts` (its `moves` are Normal's;
  `orderFor` adds the difficulty's). A new potion needs a `PotionId`, a `POTION_NAMES` entry and a
  colour in `BREWS` in `src/art/textures.ts`. Changing the first entry means updating `ORDER_1` in
  the test and the README's table. Keep orders to three needs: the label has room for three rows
  above the bench tools.
- **Add a rank or an unlockable recipe:** add the recipe to `RANK_RECIPES` (and its potion as above)
  and a row to `RANKS` in `src/game/ranks.ts` with its star threshold; update the README's tables.
- **Retune a bench tool:** `TOOLS` / `STIR_MOVES` in `src/game/sim.ts` (the button texture prints
  the price and effect from `TOOLS`), plus `STIR.cost` in the test.
- **Add an ingredient kind:** add it to `KINDS` and `KIND_NAMES` in `src/game/kinds.ts`, its shape
  in `shapes` and colours in `COL` in `src/art/nouveau.ts`, and the `Kind` type in
  the test. More kinds change every seeded board, so rerun the playthrough and check order 1 still
  sells.
- **Add a special tile:** `findRuns` keeps line lengths; decide its effect in `gather` in
  `src/game/sim.ts`, record it in `Step`, paint its texture in `textures.ts` and animate it in
  `GameScene.playStep`.
- **Move or resize the board:** change `BOARD` and `TRAY` in `src/scenes/layout.ts` and the test's
  `BOARD`; the table texture paints from these.

## Gotchas

- `trySwap` finishes the whole swap at once, so `state` is ahead of the screen while the animation
  plays. Wait for `busy` to be false before reading the result, as the test does.
- `moveTo` and the pop animation look sprites up by tile id when they start, because cascades clear
  tiles that only appear in an earlier step. Don't resolve sprites when queueing.
  `moveTo` also destroys sprites whose ids are not on its board, which only happens when `shuffle`
  gives up and returns a fresh board with new ids.
- Any change to how often `Math.random` is called (board generation, refills, shuffle, Catalysts)
  changes the seeded boards. The test plays a greedy `bestSwap`, so a different board might not
  fill order 1 in 15 moves. Rerun the playthrough after such a change.
- The test's `deadSwap` looks only at horizontal neighbours of different kinds, and its `runs` and
  `matched` mirror `findRuns` / `findMatches`. Changing what counts as a match needs both updated.
- Don't rotate tile sprites: in headless Chromium's software WebGL, slightly rotated canvas
  textures render torn, which is why the hint swells instead of wiggling.
- Progress is saved in `settle` (after the sale animation) and in `useTool` / `siftRow`, not in
  `trySwap`.
- `got` counts all gathered kinds, but `filled` and the panel only look at the kinds in `needs`.
