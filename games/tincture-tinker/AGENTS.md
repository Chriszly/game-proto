# TinctureTinker: guide for agents

How this game is built and where things stand, for agents about to change it. `README.md` covers how
to play and lists the orders. Keep this file up to date with any change to the game, as the root
`AGENTS.md` asks.

## Current state

A match-3 prototype: an 8x8 board of five ingredient kinds, where swapping two neighbours to line up
three or more gathers them towards a potion order with a move limit. It reuses Apothecary's palette
and some of its pixel art, but shares no code with it (the art is copied).

- **Implemented:** tap-tap and drag swaps, invalid swaps sliding back for free, matches in rows and
  columns, gravity and refill, free cascades, an automatic shuffle when no move is left, an idle
  hint that wiggles two tiles (or tilts them, with reduced motion), an order panel with progress bars, a result overlay ("Next order" or
  "Try again"), and five orders that repeat with growing needs and prices.
- **Progression:** only `order`, `coins` and `sold` carry over. Coins have nothing to spend them on.
- **Screens:** one scene (`GameScene`) with the board on the left, the order panel on the right and
  a result overlay over the board. No title screen, menu, in-game settings or sound (the
  hub's settings apply, see Hub settings).
- **Persistence:** progress is saved only when an order sells. The board and the moves left are not
  saved, so a reload restarts the current order on a fresh board.
- **Rough edges:** there are no special tiles (no bonus for matches of four or five), no score
  beyond coins, and every gathered tile counts in `got`, including kinds the order doesn't need.
  `bakePixelArt` and `seeded` in `src/art/pixelArt.ts` are unused leftovers from the shared art
  helpers. There are no TODO comments in the code.

## Architecture

### File map

- `src/main.ts`: creates the `Phaser.Game` (960x540, FIT scaling, `pixelArt: true`) with
  `BootScene` and `GameScene`, calls `setupGame(game)` and puts `game` on `window` in dev builds.
- `src/game/kinds.ts`: `KINDS`, the `Kind` type, `KIND_NAMES` and `randomKind`.
- `src/game/orders.ts`: `PotionId`, `POTION_NAMES`, the `Order` type, the `ORDERS` table,
  `MOVE_BONUS`, the per-round growth (`ROUND_NEEDS`, `ROUND_PRICE`) and `orderFor(number)`, which
  also adds the difficulty's moves.
- `src/game/board.ts`: the `Board`, `Tile` and `Cell` types and pure board logic: `swapped`,
  `findMatches`, `validMoves`, `collapse`, `freshBoard`, `shuffle`, `adjacent`, `inBoard`.
- `src/game/state.ts`: `Progress`, `GameState`, `startOrder`, `tileMaker`, `filled`, `progressOf`.
- `src/game/sim.ts`: `trySwap`, which plays a swap out to completion and returns its `Step`s, and
  `nextOrder`.
- `src/game/save.ts`: `loadProgress` and `saveProgress` in `localStorage`.
- `src/scenes/BootScene.ts`: calls `bakeItems`, then starts `Game`.
- `src/scenes/GameScene.ts`: draws everything, handles input, animates steps, shows hints and the
  result overlay.
- `src/scenes/layout.ts`: `VIEW`, `BOARD`, `PANEL`, `NEEDS`, `BUTTON`, `UI_DEPTH`, `cellX`, `cellY`.
- `src/art/items.ts`: ingredient, potion and coin pixel grids, `bakeItems`, `kindTexture`,
  `potionTexture`, `TILE_SCALE`.
- `src/art/pixelArt.ts`: `PixelCanvas`, which paints grids and bakes them into textures.
- `src/art/palette.ts`: colour constants, including `TABLE` and `PARCHMENT` for the board and panel.
- `src/ui/Button.ts`: `makeButton`, the wooden button used on the result overlay.
- `shared/setupGame.ts` and `shared/settings.ts` (outside the game folder): the hub's settings,
  imported by `src/main.ts`, `src/game/orders.ts` and `src/scenes/GameScene.ts`.

### How it runs

- **Boot:** `BootScene.create` bakes every texture in code (`kind-<kind>`, `potion-<id>`, `coin`;
  16x16 or 12x12 art with an ink outline), then starts `GameScene`. There are no asset files.
- **Start:** `GameScene.create` draws the static table, then `begin(startOrder(loadProgress()))`.
  `begin` replaces `state`, destroys and recreates one image per tile (keyed by tile `id` in
  `sprites`), rebuilds the order panel and hides the overlay.
- **Input:** the scene's `pointerdown` listener skips taps on a game object (the result button,
  whose tap calls `begin`), so the same tap doesn't also pick a tile. `pointerDown` maps the pointer
  to a cell with `cellAt`. The first tap sets `selected`,
  a tap on a neighbour calls `swap`, a tap on the same tile clears it. `pointerMove` swaps once a
  drag goes half a cell. Input is ignored while `busy` or when `state.phase` is not `play`.
- **Rules then animation:** `swap` calls `trySwap`, which mutates `state` right away (board, moves,
  `got`, phase, coins). The scene then queues `Anim`s: a slide, the slide back if there was no
  match, or for each `Step` a pop of the cleared tiles and a `moveTo` of the new board, then
  `settle`.
- **Tick:** `update(time)` takes `dt` from Phaser's frame timestamp, clamped to `MAX_STEP_MS`, and
  feeds `runQueue` (plays queued `Anim`s in order, by game time) and `updateHint`.
- **Rendering:** tile sprites are long-lived and moved by animations, not redrawn. The panel text
  and progress bars (`bars` graphics) are redrawn by `refresh`, `refreshNeeds` and `refreshMoves`.
  The bars follow `shown`, a copy of `got` that catches up as each pop finishes, so the panel lags
  `state` until `settle`. `settle` clears `busy`, saves on a sale and shows the overlay.

### State model

- `Progress` (`order`, `coins`, `sold`) is what is saved and carried between orders.
- `GameState` extends it with `current` (the `Order` from `orderFor`), `got` (per-kind counts for
  this order), `moves`, `phase` (`play`, `sold`, `failed`), `earned`, `board` and `nextId`.
- `Board` is `Tile[][]`, rows from the top. Each `Tile` has a unique `id` from `nextId`, which
  restarts at 1 for every order; the scene relies on ids to track sprites through falls.
- Only `trySwap` and `startOrder` / `nextOrder` change the rules state; the scene owns only view
  state (`busy`, `selected`, `shown`, the queue, hints).
- Invariants: a new or shuffled board has no matches and at least one valid move; `trySwap`
  returns `null` and changes nothing for a swap that makes no match; on a sale `order` already
  points at the next order and `earned = price + moves * MOVE_BONUS`. A failed order keeps the
  same `order`, so "Try again" replays it on a new board.

### Persistence

One key of its own, `tincture-tinker-progress`, holding the JSON `Progress`. `loadProgress` merges
it over `freshProgress()`, puts back the default of any field that is out of range (`order` must be
a whole number from 1, `coins` and `sold` finite numbers from 0) and falls back to a fresh start on
any error. The hub's settings are
stored separately under `hub-settings`.

### Randomness and timing

- `Math.random` is used in `randomKind` (new tiles and the rerolls in `freshBoard`) and in
  `shuffle`. The order and number of calls decide the board the seeded test sees.
- Animation and hint timing use only the `time` argument of `update`; the hint wobble uses the
  scene's own `clock`. Nothing uses `Date` or `setTimeout`.
- The hint picks `validMoves(board)[0]`, so it is deterministic.

### Data tables

- Orders, prices, move limits, growth per round and `MOVE_BONUS`: `src/game/orders.ts`.
- Ingredient kinds and names: `src/game/kinds.ts`. Board size: `ROWS`, `COLS` in
  `src/game/board.ts`.
- Animation and hint timings: `SWAP_MS`, `CLEAR_MS`, `FALL_MS`, `SHUFFLE_MS`, `HINT_MS`,
  `MAX_STEP_MS` at the top of `src/scenes/GameScene.ts`.
- Positions and sizes: `src/scenes/layout.ts`. Text offsets inside the panel are inline in
  `GameScene.buildPanel`.

### Hub settings

- `src/main.ts` calls `setupGame(game)` from `shared/setupGame.ts` right after creating the game,
  which applies the frame cap, the FPS readout and reduced motion (camera shake and flash become
  no-ops; this game uses neither).
- Difficulty scales one number: the moves of every order. `orderFor` in `src/game/orders.ts` adds
  `byDifficulty(5, 0, -3)` to the order's `moves`, so Easy gives 5 more, Normal the table's value
  and Hard 3 fewer. `ORDERS` itself is unchanged.
- `settings.reduceMotion` is also read by `updateHint` in `GameScene`: the two hint tiles hold a
  fixed tilt instead of wiggling.
- Keep Normal exactly as designed: the playthrough runs on Normal and expects `ORDER_1.moves`.
- Keep the TinctureTinker row of the difficulty table in the root `README.md` and the difficulty
  sentence in this game's `README.md` in sync with the values.
- The settings live under the `hub-settings` storage key, read once at page load, not in the
  game's own save.

## Testing hooks

- Dev builds expose `window.game`. The test reads `game.scene.getScene('Game')` and copies `state`,
  `busy` and `selected` from it as JSON. Keep those names and their meaning.
- It seeds `Math.random`, owns the clock (64ms frames) and forces the canvas renderer.
- Inputs are mouse clicks on cell centres, computed from its own copy of `VIEW` and `BOARD`
  (`x: 46, y: 46, cell: 56, size: 8`). It never drags.
- Steps: checks the first order (`ORDER_1`: healingDraught, ember 12 and sage 12, 15 moves, 30
  coins), that the new board has no matches and `got` is all zero; taps a horizontal swap that makes
  no match and checks `selected`, an unchanged board and unchanged moves; then repeatedly taps its
  `bestSwap` and waits for `busy` to clear, checking one move is spent and at least the first
  match's tiles are gathered; finally checks `phase: 'sold'`, `earned`, `coins`, `sold: 1` and
  `order: 2`.
- Keep in sync: `ORDER_1` (Normal's moves) and `MOVE_BONUS` with `src/game/orders.ts`; `VIEW` and
  `BOARD` with `src/scenes/layout.ts` and `ROWS`/`COLS`; the `Kind` and `GameState` shapes declared
  at the top of the test; the game's URL path in the test's `page.goto`.

## Making common changes

- **Add or retune an order:** edit `ORDERS` in `src/game/orders.ts` (its `moves` are Normal's;
  `orderFor` adds the difficulty's). A new potion needs a
  `PotionId`, a `POTION_NAMES` entry and a `POTION_ART` entry in `src/art/items.ts` (use `flask`
  with a palette colour). Changing the first entry means updating `ORDER_1` in the test and the
  README's table.
- **Add an ingredient kind:** add it to `KINDS` and `KIND_NAMES` in `src/game/kinds.ts`, a 16x16
  grid in `KIND_ART` in `src/art/items.ts`, and the `Kind` type in the test. More kinds change every
  seeded board, so rerun the playthrough and check order 1 still sells.
- **Add special tiles or scoring:** `findMatches` only returns cells, so line lengths and shapes are
  lost. Extend it (or add a sibling) in `src/game/board.ts`, record the effect in `Step` in
  `src/game/sim.ts`, and animate it in `GameScene.playStep`.
- **Spend coins:** add fields to `Progress` in `src/game/state.ts` (they save automatically through
  `progressOf` and merge over defaults in `loadProgress`; add a range check there too), plus UI in `GameScene`. Keep purchases
  out of the playthrough.
- **Move or resize the board:** change `BOARD` in `src/scenes/layout.ts` and the test's `BOARD`; the
  panel is placed by `PANEL` and `NEEDS` independently.

## Gotchas

- `trySwap` finishes the whole swap at once, so `state` is ahead of the screen while the animation
  plays. Wait for `busy` to be false before reading the result, as the test does.
- `moveTo` and the pop animation look sprites up by tile id when they start, because cascades clear
  tiles that only appear in an earlier step. Don't resolve sprites when queueing.
  `moveTo` also destroys sprites whose ids are not on its board, which only happens when `shuffle`
  gives up and returns a fresh board with new ids.
- Any change to how often `Math.random` is called (board generation, refills, shuffle) changes the
  seeded boards. The test plays a greedy `bestSwap`, so a different board might not fill order 1
  in 15 moves. Rerun the playthrough after such a change.
- The test's `deadSwap` looks only at horizontal neighbours of different kinds, and its `matched`
  mirrors `findMatches`. Changing what counts as a match needs both updated.
- Progress is saved in `settle`, after the sale animation, not in `trySwap`.
- `got` counts all gathered kinds, but `filled` and the panel only look at the kinds in `needs`.
