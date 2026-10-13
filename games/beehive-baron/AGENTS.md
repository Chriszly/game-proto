# Beehive Baron: guide for agents

How Beehive Baron is built and where things stand, for agents about to change it. `README.md`
covers how to play and lists the prices. Keep this file up to date with any change to the game, as
the root `AGENTS.md` asks.

## Current state

Beehive Baron is an idle beehive. The player builds comb cells on a 5x4 hex grid, sends foragers
to the meadow for nectar, full cells ripen into capped honey, a tap harvests a capped cell into a
jar, and jars sell for coins. Coins buy more cells, more bees and three upgrades.

Implemented today:

- The full loop: build a cell (the first is free), send every bee at home on a trip, nectar
  delivered into filling cells in slot order (what does not fit is lost and counted as
  `spilled`), a full cell ripening for `RIPEN_MS` and then capped, harvest, sell all jars.
- Purchases: comb cells (price rises per cell built), bees (up to `MAX_BEES`), Pollen Baskets
  (more nectar a trip), Clover Patch (shorter trips) and Waggle Dance (bees set off on their own
  whenever there is room, the idle upgrade).
- One screen (`GameScene`) with a HUD, a hint line for the first jar, bees flying to and from the
  flowers, a shelf of jars, and a "New hive" reset link in the bottom right corner.
- Persistence of the comb, coins, jars, jars sold, bee count and upgrade ranks in `localStorage`.

Missing or rough:

- No title or win screen and no in-game settings (they are on the hub page), no sound, no goal
  beyond buying everything.
- No offline progress: time away from the page does not count, and bees out foraging are home
  again on load with their nectar lost.
- Cells can be built on any empty spot; there is no adjacency rule.
- "New hive" resets at once with no confirmation.
- `spilled` is not saved and only shows as floating text.

## Architecture

File map (`src/`):

- `main.ts`: creates the `Phaser.Game` (960x540, `Scale.FIT`, `pixelArt`) with `BootScene` and
  `GameScene`, calls `setupGame(game)`, and exposes `game` on window in dev builds.
- `game/state.ts`: types (`GameState`, `Cell`, `Bee`, `GameEvent`, `Progress`), the grid and
  balance constants, `freshProgress`, `newHive` (which also checks saved cells), `progressOf`, and
  the formulas `carry`, `cellPrice`, `beePrice` and `room`.
- `game/sim.ts`: the rules as pure functions on `GameState`: `tick`, `build`, `send`, `harvest`,
  `sell`, `buyBee`, `buy`, `tripMs` (trip length with clover and difficulty), plus the private
  `deliver`.
- `game/upgrades.ts`: the `UPGRADES` table (name, blurb, price per rank), `UPGRADE_IDS`,
  `nextPrice`.
- `game/save.ts`: `loadProgress` (checks every number and clamps ranks), `saveProgress`,
  `clearProgress`.
- `scenes/BootScene.ts`: bakes all textures, then starts `Game`.
- `scenes/GameScene.ts`: draws the hive, turns taps into sim calls, animates events, saves, and
  offers `spots()` for the test.
- `scenes/layout.ts`: every screen position (`VIEW`, `COMB`, `HIVE`, `ENTRANCE`, `SHELF`, `BOARD`,
  `SEND_BUTTON`, `SELL_BUTTON`, `SHOP_BUTTONS`), the hex helpers `cellCentre`, `hexPoints` and
  `cellAt`, and `homeSpot` and `flowerSpot`.
- `ui/Button.ts`: a wooden caption button that fires on `pointerdown` and can be disabled.
- `art/palette.ts`: the colours. `art/pixelArt.ts`: `bakePixelArt`, `PixelCanvas` and the `seeded`
  RNG (a copy of Anvilheart's, since games never import each other). `art/scenery.ts`: the
  background (with the button board and jar shelf baked in), the hive box, six flowers and the jar.
  `art/bees.ts`: the bee in two wing frames.

Shared code the game imports (repo root, outside `src/`): `shared/setupGame.ts` (`setupGame`) and
`shared/settings.ts` (`settings`, `byDifficulty`). See "Hub settings" below.

How it runs:

- Boot: `BootScene.create` calls `bakeScenery` and `bakeBees`, which paint pixel grids and
  `generateTexture` them (keys `background`, `hive`, `flower-<0..5>`, `jar`, `bee-0/1`). There are
  no asset files. The comb itself is not a texture: `drawComb` paints the hexagons every frame.
- Tick: `GameScene.update(time)` takes `dt` from the frame timestamp (clamped to `MAX_STEP_MS`,
  250ms), adds it to `clock`, and calls `tick(state, dt)`, which moves the bees on (delivering
  nectar when a trip ends), ripens full cells, and with the Waggle Dance calls `send`. If that
  pushed a `nectar` or `capped` event the scene saves. Then it draws.
- Input: the scene's `pointerdown` calls `tapComb`, which builds on an empty spot or harvests a
  capped cell under the pointer (`cellAt`). The Send, Sell and shop buttons call `send`, `sell`,
  `buyBee` and `buy`. Each successful action saves.
- Rendering: bee sprites (`bees`, keyed by bee id) are placed every frame by `beeSpot`, from how
  far along its trip a bee is (`OUT` of the trip flying out, `AT_FLOWER` at the flower, the rest
  flying home), or at `homeSpot(index)` when home. The `comb` and `hud` graphics and the price
  labels are redrawn every frame; jar sprites are a fixed pool of `SHELF.jars`. Sim functions push
  `GameEvent`s onto `state.events`; `drawEvents` drains them for flashes and floating text.

State model (`src/game/state.ts`):

- `GameState.cells` is `SLOTS` (20) entries, each `null` (no cell built) or a `Cell` with
  `nectar` (0 to `CELL_CAP`), `phase` (`filling`, `ripening`, `capped`) and `ripenMs`. A cell
  leaves `filling` only when full. Harvesting resets it to an empty filling cell.
- `bees` holds one `Bee` per bee owned: `tripMs` (0 while home), `trip` (the whole trip's length)
  and `flower`. Only the count is saved; `newHive` rebuilds them all at home.
- `room` is the nectar the filling cells can still take; `send` refuses when it is 0 or no bee is
  home.
- Only `src/game/sim.ts` changes rules state; the scene replaces `state` wholesale only on load and
  on "New hive".

Persistence: one key of its own, `beehive-baron-progress`, holding `Progress` as JSON (`coins`,
`cells`, `bees`, `jars`, `sold`, `ranks`). Bee trips, `spilled` and events are not saved.

Randomness and timing:

- `Math.random` is only used in `send` in `src/game/sim.ts`: once per bee sent, to pick its
  flower. It only changes where the bee flies, not the rules.
- Art uses `seeded()` from `src/art/pixelArt.ts`, not `Math.random`.
- Game time comes only from the `time` Phaser passes to `update`; tweens use Phaser's clock.

Data tables: balance constants (`CELL_CAP`, `RIPEN_MS`, `TRIP_MS`, `HONEY_PRICE`, `START_BEES`,
`MAX_BEES`, `FLOWERS`) and the cell and bee price formulas in `src/game/state.ts`; upgrade prices
and blurbs in `src/game/upgrades.ts`, with their effects in `carry` (baskets), `tripMs` (clover)
and `tick` (dance).

### Hub settings

- `src/main.ts` calls `setupGame(game)` from `shared/setupGame.ts` right after creating the game.
  It applies the frame cap, the FPS readout and reduced motion (camera shake and flash become
  no-ops; this game uses neither).
- Difficulty scales one number: trip length. `tripMs` in `src/game/sim.ts` multiplies
  `TRIP_MS * 0.8^clover` by `byDifficulty(0.75, 1, 1.3)` (easy, normal, hard) from
  `shared/settings.ts`. `TRIP_MS` in `src/game/state.ts` is unchanged.
- Reduced motion: `GameScene` skips the white flash when a cell is built or capped, holds the
  pulsing outline on capped cells steady, and stops the bees' wing flap, bobbing and circling.
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
- Inputs: mouse clicks only, mapped from the 960x540 view to the scaled canvas.
- The test mirrors these values; change them together: `VIEW` (960x540), `CELL_CAP` (4),
  `START_BEES` (2), `HONEY_PRICE` (15) and the spot it builds on (slot 7). It also expects: the
  first cell free; Send doing nothing with no cell; one trip of two bees bringing 2 drops; each
  trip and the ripening finishing within 10s; nothing spilled; and `coins`, `jars`, `sold` exact
  after the sale. It fails on any page error.
- It seeds `Math.random`, so adding random calls changes which flowers the bees visit but must not
  change the first round.

## Making common changes

- Add an upgrade: add the id to `UpgradeId` and `UPGRADES` in `src/game/upgrades.ts`, its rank 0
  in `freshProgress` in `src/game/state.ts`, and its effect where the rule lives. The shop is a 2x2
  grid (`SHOP_BUTTONS` in `layout.ts`, bee first, then `UPGRADE_IDS`), already full, so a fifth
  button needs another row: there is room above the "New hive" link only if the buttons shrink.
- Retune balance: edit the constants above. Check the test still holds (two bees fill half a cell
  per trip, trips and ripening under 10s, first cell free).
- Change the comb: `GRID` in `state.ts` and `COMB` in `layout.ts`. The comb must stay inside the
  hive box's open front (x 64 to 400, y 96 to 328 with `HIVE` at 48,52).
- Add a flower: raise `FLOWERS`, add a colour to `PETAL` in `src/art/palette.ts` (one per flower)
  and make sure `flowerSpot` still fits the meadow.
- Add an effect for a new rule: push a new `GameEvent` kind from `src/game/sim.ts` and handle it in
  `GameScene.drawEvents`.

## Gotchas

- Flowers are drawn with petals in a ring around a golden middle; keep them that way (and never
  red with four petals), since no game may show a red cross.
- `homeSpot` fits eight bees on the landing board and stacks the rest above it; `MAX_BEES` is 12.
- `cellAt` hits the nearest centre within half a hex width, so taps right on a corner between
  cells may miss.
- The button board and jar shelf are baked into `background`; moving `BOARD` or `SHELF` in
  `layout.ts` also needs `bakeBackground` in `src/art/scenery.ts` changed.
- All browser storage must stay prefixed `beehive-baron-`, since every game shares the hub's
  origin.
