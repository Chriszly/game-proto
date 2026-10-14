# Beehive Baron: guide for agents

How Beehive Baron is built and where things stand, for agents about to change it. `README.md`
covers how to play and lists the prices. Keep this file up to date with any change to the game, as
the root `AGENTS.md` asks.

## Current state

Beehive Baron is an idle beehive drawn in cut paper. The player builds comb cells on a 5x4 hex
grid, sends foragers to the meadow for nectar, full cells ripen into capped honey, a tap harvests a
capped cell into a jar, and jars sell for coins. Coins buy more cells, more bees and three upgrades.

Implemented today:

- The full loop: build a cell (the first is free), send every bee at home on a trip, nectar
  delivered into filling cells in slot order (what does not fit is lost and counted as
  `spilled`), a full cell ripening for `ripenTime` and then capped, harvest, sell all jars at
  `jarPrice`.
- Comb bonus: every edge two built cells share adds 1 coin to each jar sold (`combBonus`). Shared
  edges glow gold, the roof plaque shows "Comb bonus +Nc a jar", a "+N touching" tag pops over a
  cell built next to others, and pointing at an empty spot shows a green build preview with its
  price, "+N touching" and the would-be edges lit green. A tap on an empty spot still builds at
  once (touch screens have no hover).
- Goals unlock meadows: `MEADOWS` in `src/game/meadows.ts` is a chain of three goals of jars sold
  (10, 30, 80) unlocking Lavender Field (+1 nectar a trip), Sunflower Ridge (+5 coins a jar) and
  Heather Moor (ripening twice as fast). A goal card shows the next goal, its meadow and benefit,
  and a progress bar; the next locked meadow shows faded on the far hill with a padlock tag, and
  open meadows show in full colour with blooms.
- Capped offline nectar: on load, `gatherAway` adds one drop per bee per `AWAY_MS_PER_DROP` (30s)
  since the saved `seen` time, capped at `AWAY_CAP` (20) and at the comb's room, into the filling
  cells. A chip under the hive says "While you were away: +N nectar" with "cap 20" and a bar; it
  fades after 12s of game time or when tapped.
- Purchases: comb cells (price rises per cell built), bees (up to `MAX_BEES`), Pollen Baskets
  (more nectar a trip), Clover Patch (shorter trips) and Waggle Dance (bees set off on their own
  whenever there is room, the idle upgrade).
- One screen (`GameScene`) with a scalloped HUD strip, the goal card, a hint line for the first
  jar, bees flying to and from the flowers with dotted trails, a shelf of jars, and a "New hive"
  reset link in the bottom right corner.
- Persistence of the comb, coins, jars, jars sold, bee count, upgrade ranks, unlocked meadows and
  the last-seen time in `localStorage`.

Missing or rough:

- No title or win screen and no in-game settings (they are on the hub page), no sound.
- Bees out foraging are home again on load with their nectar lost (the away nectar stands in).
- The build preview needs a pointer that hovers; on a phone a tap builds without one.
- "New hive" resets at once with no confirmation.
- `spilled` is not saved and only shows as floating text.

## Architecture

File map (`src/`):

- `main.ts`: creates the `Phaser.Game` (960x540, `Scale.FIT`, `pixelArt: false` since the art is
  smooth) with `BootScene` and `GameScene`, calls `setupGame(game)`, and exposes `game` on window
  in dev builds.
- `game/state.ts`: types (`GameState`, `Cell`, `Bee`, `GameEvent`, `Progress`), the grid and
  balance constants, `freshProgress`, `newHive` (which also checks saved cells), `progressOf`
  (stamps `seen` with `Date.now()`), and the formulas `carry`, `ripenTime`, `cellPrice`,
  `beePrice`, `room`, `neighbours`, `touching`, `sharedEdges`, `combBonus` and `jarPrice`.
- `game/sim.ts`: the rules as pure functions on `GameState`: `tick`, `build`, `send`, `harvest`,
  `sell` (which also unlocks meadows), `buyBee`, `buy`, `gatherAway`, `tripMs` (trip length with
  clover and difficulty), plus the private `deliver`.
- `game/meadows.ts`: the `MEADOWS` goal chain (name, jars sold needed, benefit blurb) and
  `SUNFLOWER_COINS`.
- `game/upgrades.ts`: the `UPGRADES` table (name, blurb, price per rank), `UPGRADE_IDS`,
  `nextPrice`.
- `game/save.ts`: `loadProgress` (checks every number, clamps ranks and meadows), `saveProgress`,
  `clearProgress`.
- `scenes/BootScene.ts`: bakes all textures, then starts `Game`.
- `scenes/GameScene.ts`: draws the hive, turns taps and hovers into sim calls and the build
  preview, animates events, saves, shows the away chip, and offers `spots()` for the test.
- `scenes/layout.ts`: every screen position (`VIEW`, `COMB`, `HIVE`, `PLAQUE`, `ENTRANCE`,
  `FLOWER_GROUND`, `GOAL`, `MEADOW_SPOTS`, `MEADOW_TAG`, `AWAY`, `HINT`, `SHELF`, `BOARD`,
  `SEND_BUTTON`, `SELL_BUTTON`, `SHOP_BUTTONS`), the hex helpers `cellCentre`, `hexPoints` and
  `cellAt`, `homeSpot`, `flowerSpot`, and `FONT` (a system font stack).
- `ui/Button.ts`: a paper card button (cream, golden "hot" for Send and Sell, flat when disabled)
  with a bold first line and a lighter second line; it bakes its card textures on first use.
- `art/paper.ts`: the cut-paper toolkit: `cut` (a card shape with a hand-cut wobble, drop shadow,
  multiplied grain and a light rim), shape helpers (`rect`, `rr`, `circ`, `hex`, `smooth`),
  `outline`, `sketch`, `addTexture` and the `seeded` RNG.
- `art/palette.ts`: card colours (`CARD`, `PETALS`, `MEADOW_CARD`) and the numbers the scene draws
  with each frame (`LIVE`).
- `art/scenery.ts`: `bakeScenery` and the texture layouts it exports (`FLOWER_TEX`, `JAR_TEX`,
  `CELL_TEX`, `CARD_PAD`, `meadowOrigin`). `art/bees.ts`: the bee in two wing frames (`BEE_TEX`).

Shared code the game imports (repo root, outside `src/`): `shared/setupGame.ts` (`setupGame`) and
`shared/settings.ts` (`settings`, `byDifficulty`). See "Hub settings" below.

How it runs:

- Boot: `BootScene.create` calls `bakeScenery` and `bakeBees`, which paint 2D canvases and add
  them with `textures.addCanvas`. Keys: `bg-back` (sky, sun, clouds, far hill), `meadow-<i>` and
  `meadow-<i>-blooms`, `bg-front` (near hills, the button board and the jar shelf), `hive`,
  `flower-<0..5>`, `jar`, `cell-empty`, `cell-fill-<0..4>`, `cell-ripe`, `cell-capped`,
  `cell-preview`, `hud`, `coin`, `honey-icon`, `goal-card`, `meadow-icon-<i>`, `lock`,
  `meadow-tag`, `away-chip`, `tag-build`, `tag-touching`, `bee-0/1`, and the buttons'
  `button-<w>x<h>-<look>`. There are no asset files.
- Load: `create` loads the progress, builds the state, calls `gatherAway(state, Date.now() -
  seen)` when a `seen` time was saved, shows the chip if any nectar came in, and saves at once so a
  reload does not count the same time twice.
- Tick: `GameScene.update(time)` takes `dt` from the frame timestamp (clamped to `MAX_STEP_MS`,
  250ms), adds it to `clock`, and calls `tick(state, dt)`, which moves the bees on (delivering
  nectar when a trip ends), ripens full cells, and with the Waggle Dance calls `send`. The scene
  saves if that pushed a `nectar` or `capped` event, and at least every `SAVE_EVERY_MS` (5s) so
  `seen` stays fresh; it also saves on `pagehide` and when the tab is hidden. Then it draws.
- Input: the scene's `pointerdown` calls `tapComb`, which builds on an empty spot or harvests a
  capped cell under the pointer (`cellAt`). `pointermove` sets `hover`, which drives the build
  preview; `gameout` clears it. The Send, Sell and shop buttons call `send`, `sell`, `buyBee` and
  `buy`. Each successful action saves.
- Rendering: one image per comb spot takes its state's cell texture each frame; the `comb`
  graphics draws the gold shared edges, the green preview edges, the ripening arcs and the capped
  cells' pulsing rim. Bee sprites (`bees`, keyed by bee id) are placed every frame by `tripSpot`,
  from how far along its trip a bee is (`OUT` of the trip flying out, `AT_FLOWER` at the flower,
  the rest flying home), with a dotted trail in `trails`, or at `homeSpot(index)` when home. Jar
  sprites are a fixed pool of `SHELF.jars`. `drawGoal` updates the goal card and the meadows'
  visibility. Sim functions push `GameEvent`s onto `state.events`; `drawEvents` drains them for
  flashes, the "+N touching" pop, the unlock message and floating text.

State model (`src/game/state.ts`):

- `GameState.cells` is `SLOTS` (20) entries, each `null` (no cell built) or a `Cell` with
  `nectar` (0 to `CELL_CAP`), `phase` (`filling`, `ripening`, `capped`) and `ripenMs`. A cell
  leaves `filling` only when full. Harvesting resets it to an empty filling cell.
- Neighbours: odd rows sit half a cell right, so spot `(col,row)` touches `col±1` on its row and,
  on the rows above and below, `col-1,col` (even rows) or `col,col+1` (odd rows). `sharedEdges`
  lists each touching pair of built cells once; `combBonus` is their count.
- `meadows` counts the unlocked entries of `MEADOWS`, in order. `sell` unlocks every meadow whose
  `need` the new `sold` reaches and pushes an `unlocked` event for each.
- `bees` holds one `Bee` per bee owned: `tripMs` (0 while home), `trip` (the whole trip's length)
  and `flower`. Only the count is saved; `newHive` rebuilds them all at home.
- `room` is the nectar the filling cells can still take; `send` refuses when it is 0 or no bee is
  home, and `gatherAway` never adds more than it.
- Only `src/game/sim.ts` changes rules state; the scene replaces `state` wholesale only on load and
  on "New hive".

Persistence: one key of its own, `beehive-baron-progress`, holding `Progress` as JSON (`coins`,
`cells`, `bees`, `jars`, `sold`, `ranks`, `meadows`, `seen`). `seen` is the `Date.now()` of the
last save, 0 for a hive never saved (no away nectar then). Bee trips, `spilled` and events are not
saved.

Randomness and timing:

- `Math.random` is only used in `send` in `src/game/sim.ts`: once per bee sent, to pick its
  flower. It only changes where the bee flies, not the rules.
- Art uses `seeded()` from `src/art/paper.ts`, not `Math.random`.
- Game time comes only from the `time` Phaser passes to `update`; tweens use Phaser's clock.
  `Date.now()` is read only to stamp `seen` and to measure the time away on load.

Data tables: balance constants (`CELL_CAP`, `RIPEN_MS`, `TRIP_MS`, `HONEY_PRICE`, `START_BEES`,
`MAX_BEES`, `FLOWERS`, `AWAY_MS_PER_DROP`, `AWAY_CAP`) and the price formulas in
`src/game/state.ts`; the goal chain in `src/game/meadows.ts`, with its benefits in `carry`
(Lavender), `jarPrice` (Sunflower) and `ripenTime` (Heather); upgrade prices and blurbs in
`src/game/upgrades.ts`, with their effects in `carry` (baskets), `tripMs` (clover) and `tick`
(dance).

### Hub settings

- `src/main.ts` calls `setupGame(game)` from `shared/setupGame.ts` right after creating the game.
  It applies the frame cap, the FPS readout, reduced motion and full screen (camera shake and flash become
  no-ops; this game uses neither).
- Difficulty scales one number: trip length. `tripMs` in `src/game/sim.ts` multiplies
  `TRIP_MS * 0.8^clover` by `byDifficulty(0.75, 1, 1.3)` (easy, normal, hard) from
  `shared/settings.ts`. `TRIP_MS` in `src/game/state.ts` is unchanged.
- Reduced motion: `GameScene` skips the white flash when a cell is built or capped and the blooms'
  fade-in on unlock, holds the pulsing rim on capped cells steady, keeps floating text and the
  "+N touching" tag from drifting (they only fade), and stops the bees' wing flap, bobbing and
  circling.
- Normal must stay exactly as designed, since the playthrough runs on Normal.
- Keep the README's difficulty line in sync ("foraging trips take 25% less time on Easy and 30%
  more on Hard"), and the game's row in the root README's difficulty table.
- The settings are read once at load from the `hub-settings` storage key, which the hub owns. They
  are not part of `beehive-baron-progress`, and "New hive" does not touch them.

## Testing hooks

- `src/main.ts` puts `game` (the `Phaser.Game`) on window in dev builds only.
- `e2e/playthrough.spec.ts` reads `game.scene.getScene('Game')`: its `state` (copied without
  `events`) and `spots()`, which returns the Send and Sell button centres, each cell's centre
  (`cellCentre`) and each shop button's centre. Positions therefore follow `layout.ts`.
- Inputs: mouse clicks only, mapped from the 960x540 view to the scaled canvas. The click on slot 7
  moves the mouse there first, so the build preview shows for a moment before the cell is built.
- The test mirrors these values; change them together: `VIEW` (960x540), `CELL_CAP` (4),
  `START_BEES` (2), `HONEY_PRICE` (15) and the spot it builds on (slot 7). It also expects: the
  first cell free; Send doing nothing with no cell; one trip of two bees bringing 2 drops; each
  trip and the ripening finishing within 10s; nothing spilled; `meadows` 0 at the start and after
  the sale (the first goal is 10 jars); and `coins` (15: a lone cell has no comb bonus), `jars`,
  `sold` exact after the sale. It fails on any page error.
- The test starts with empty storage, so `seen` is 0 and no away nectar is added. It owns the
  clock (`page.clock`), so `Date.now()` is controlled too.
- It seeds `Math.random`, so adding random calls changes which flowers the bees visit but must not
  change the first round.

## Making common changes

- Add an upgrade: add the id to `UpgradeId` and `UPGRADES` in `src/game/upgrades.ts`, its rank 0
  in `freshProgress` in `src/game/state.ts`, and its effect where the rule lives. The shop is a 2x2
  grid (`SHOP_BUTTONS` in `layout.ts`, bee first, then `UPGRADE_IDS`), already full, so a fifth
  button needs another row: there is room above the "New hive" link only if the buttons shrink.
- Add or retune a goal: edit `MEADOWS` in `src/game/meadows.ts` (keep the first goal above 1 jar
  so the playthrough's sale unlocks nothing), give its benefit a rule in `state.ts`, and add a
  `MEADOW_SPOTS` entry in `layout.ts` (a stretch of the far ridge and its tag spot) and a
  `MEADOW_CARD` entry in `src/art/palette.ts`; `bakeMeadow` and the goal icon in
  `src/art/scenery.ts` draw a bloom shape per index. Update the README's goal table.
- Retune the comb bonus: `combBonus` and `jarPrice` in `state.ts`. Keep a lone cell at 0 bonus or
  update the test's sale price.
- Retune away nectar: `AWAY_MS_PER_DROP` and `AWAY_CAP` in `state.ts` (the chip reads the cap).
- Retune balance: edit the constants above. Check the test still holds (two bees fill half a cell
  per trip, trips and ripening under 10s, first cell free).
- Change the comb: `GRID` in `state.ts` and `COMB` in `layout.ts`. The comb must stay inside the
  hive's recess (x 70 to 397, y 102 to 324), and the cell textures are cut for `COMB.r`.
- Add a flower: raise `FLOWERS`, add a colour to `PETALS` in `src/art/palette.ts` (one per flower)
  and make sure `flowerSpot` still fits the meadow.
- Add an effect for a new rule: push a new `GameEvent` kind from `src/game/sim.ts` and handle it in
  `GameScene.drawEvents`.

## Gotchas

- Flowers are cut with six petals in a ring around a golden middle; keep them that way (and never
  red with four petals), since no game may show a red cross.
- Depths: `bg-back` 0, meadows 0.01 to 0.02, `bg-front` 0.05, flowers about 0.1, hive 1, cells 2,
  comb graphics 2.5, goal card 20, buttons 30, bees 50, HUD and chip near `UI_DEPTH`. Anything new
  on the board or meadow must sit above `bg-front`.
- `homeSpot` fits eight bees on the landing board and stacks the rest above it; `MAX_BEES` is 12.
- `cellAt` hits the nearest centre within half a hex width, so taps right on a corner between
  cells may miss.
- The button board and jar shelf are baked into `bg-front`; moving `BOARD` or `SHELF` in
  `layout.ts` also needs `bakeFrontBackground` in `src/art/scenery.ts` changed. The hive texture
  is drawn in screen coordinates inside `HIVE`.
- The scene saves on `pagehide`, so a script that writes `beehive-baron-progress` and then reloads
  the page sees its write overwritten; set the save from an init script on a fresh page instead.
- All browser storage must stay prefixed `beehive-baron-`, since every game shares the hub's
  origin.
