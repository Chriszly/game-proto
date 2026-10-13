# Apothecary: guide for agents

How Apothecary is built and where things stand, for agents about to change it. README.md covers how
to play and lists the prices and upgrades. Keep this file up to date in the same PR as any change
to the game, as the root AGENTS.md asks.

## Current state

Apothecary is a top-down automation game: a plague doctor walks a U-shaped yard, harvests wheat and
mandrake, refines them at a table, brews potions in a cauldron and sells them to customers at a
counter. Coins buy upgrades, craftsmen, conveyor belts and a mirrored second production line.

- Implemented: the full loop on both lines, auto-harvest with a spinning sickle, floor markers
  (drop, work, pick up, pay), pallets that show station stock, customers served only at the
  counter, a walled shop entered by its front door, station upgrades (5 levels), outfitter and
  guild upgrades, two craftsmen per station, a priority choice per crafting station, six belts
  with one lane per item kind, the expansion,
  a Recipes panel and a Settings panel. Progress autosaves to localStorage.
- There is one scene with no title, win or lose screen, and no audio. A customer who runs out of
  patience just leaves; there is no penalty.
- Leftovers: `bakePixelArt` in `src/art/pixelArt.ts` is never called. `GAME_WIDTH`/`GAME_HEIGHT` in
  `src/main.ts` are only used there.

## Architecture

### File map

- `src/main.ts`: creates the `Phaser.Game` (960x540, FIT scaling, arcade physics with
  `fixedStep: false`, `pixelArt`), registers `BootScene` and `GameScene`, calls `setupGame(game)`
  from `shared/setupGame.ts`, and puts `game` on window in dev.
- `src/game/items.ts`: item ids and defs (`ITEMS`), `GROW_MS`, `REFINE`, `RECIPES`,
  `POTION_PRICE`, the `isPlant`/`isRefined`/`isPotion` guards and the ordered lists `PLANTS`,
  `REFINED`, `POTIONS`.
- `src/game/state.ts`: every state type, `createInitialState`, `LAYOUT` and `FEEDERS_LAYOUT`, the
  upgrade, belt, expansion and pallet tables, and small derived helpers (`carryCapacity`,
  `walkSpeed`, `potionPrice`, `stationBuilt`, `anyFieldBuilt`, `beltBuildable`, ...).
- `src/game/sim.ts`: the rules, free of Phaser. `tick` advances the world; marker actions
  (`dropAtRefiner`, `pickUpFromCauldron`, `stockShelf`, `collectTill`, `payUpgrade`,
  `payCraftsman`, `payBelt`, `payExpansion`, `dropAll`, `cyclePriority`) and `harvest` each change
  state and return `Feedback` lines. Also `shortfall`, `refining` and `doneByHand`.
- `src/game/save.ts`: `loadState`, `saveState`, `clearSave` (key `apothecary-save`), and the
  `ontoOwnRuns` belt migration.
- `src/scenes/BootScene.ts`: bakes all textures and animations, then starts `Game`.
- `src/scenes/GameScene.ts`: builds the world, markers and HUD, reads input, walks the doctor
  around stations and through the shop door, calls the sim each frame and updates views. Also
  `walkTowards` for customer sprites.
- `src/scenes/layout.ts`: every world position (gardens, plots, yards, stations, markers, pallets,
  priority signs, craftsmen, guild, outfitter, shop, its walls and doors, customer spots), plus the belt geometry:
  `BELT_PATHS` (main run first, then feeders; each runs from a station's out pallets to the next
  station's in pallets), `runLength`, `beltSpan`, `BELT_JOIN_MS` and `BELT_BUILD`. It imports no
  Phaser, since `sim.ts` and `save.ts` use it.
- `src/art/`: pixel art painted on `PixelCanvas` (`pixelArt.ts`) with the shared `palette.ts`, baked
  by one `bake*` function per file. `belts.ts` is the exception: `drawBelts` draws the belt network
  into a Graphics object at runtime, and `pointAlong`/`laneOffset` place items on it.
  `signTexture` in `ui.ts` bakes sign widths lazily.
- `src/ui/`: `BackStack` (items piled on the doctor), `IconRow` (customer wants), `Pallet` (crate
  stacks, exposes `item` and `count`), `ProgressBar` (redraws only when its fill changes),
  `RecipeBook` (exposes `lines`), `Settings` (read-only view of the hub's settings, and New game).

### How it runs

- `BootScene.create` calls the `bake*` functions (doctor, items, garden, stations, markers,
  townsfolk, ground, ui); none load asset files. Then `GameScene.create` calls `loadState` and the
  `create*` builders in order.
- `GameScene.update(time, delta)`: sets `frameMs` (delta clamped to `MAX_STEP_MS`, 250), finds
  `workingAt` (the work spot under the feet), calls `tick(state, frameMs, workingAt, atCounter)`,
  then `movePlayer`, `standOnMarkers`, `autoHarvest` and `spinSickle`, copies the sprite position
  into `state.player`, and runs every function in `views`.
- Rendering is retained objects, not redraws: each builder creates its Phaser objects once and
  pushes a closure onto `views` that syncs them from `state` every frame. `once(ready, create)`
  defers creating things that appear when bought (second-line stations, fields, expansion yard).
  The belt network is redrawn only when the set of built belts changes.
- Depths: ground -1000 to -990, signs -910, belts -600, riding goods -550, plots -500, markers
  -400, till -300; standing things sort by y (the doctor by his feet); `WORLD_UI_DEPTH` (9999) for
  bars and feedback, `UI_DEPTH` (10000) for the top bar, `UI_DEPTH + 1` for panels.
- Walking: arcade physics steps once per drawn frame; WASD/arrows set velocity directly, and
  `limitWalkStep` (on `PRE_UPDATE`) caps a step at `MAX_WALK_STEP_PX` (20) so a long frame can't
  carry the feet through a station or wall (static obstacles from `addObstacle` and `SHOP_BLOCKS`).
- Taps: `reachable` moves a tapped spot out of any station or wall area into `pointerTarget`;
  `routeAround` picks a `waypoint`: the front door (`SHOP_DOORWAY`) into or out of the shop,
  otherwise a corner of the nearest `blockedAreas` rectangle (or the whole shop) in the way. Taps
  close an open panel instead of walking; HUD buttons stop propagation.
- Shop walls: `SHOP_WALLS` are drawn, with gaps for `SHOP_DOOR` and `SHOP_BACK_DOOR`.
  `SHOP_BLOCKS` are what the doctor collides with: the front and side walls, and the back wall with
  the street behind it as one block, so only customers use the street door.
- Markers: `addMarker`, `addLevelMarker` and `addBuildMarker` push a `Marker` (44x44 zone, `act`,
  `shown`). `standOnMarkers` runs the first shown marker under the feet once every
  `MARKER_INTERVAL_MS` (200); each call moves one item or pays at most 5 coins (`UPGRADE_STEP`).
  Purple markers (`pays`) take coins only once the doctor's body has stood still for `STILL_MS`
  (400, tracked in `stillSince`), so walking over one buys nothing; their captions show the coins
  still to pay (cost minus `paid`), with no bar.
  A level marker sets `paused` after a level completes until the doctor steps off.
- Belts: each belt starts at the front edge of a station's out pallets (or in the gardens) and ends
  at the edge of the next station's in pallets, which stand side by side across its end, each at the
  end of its kind's lane. The sim still takes from the station's `output` and hands to its tray;
  the pallets are those trays drawn. A built belt hides its pick-up marker, and its drop marker
  unless the doctor carries that kind; the counter's drop stays until `doneByHand` is false for
  both cauldron belts. Goods get on at `beltSpan(id, kind).start` (mandrakes on their patch's
  feeder) and join the main run at `join`. The cauldron belts merge at `BELT_JOIN_MS`
  (`mergingItems`), measured to `CAULDRON_BELTS_MEET`. `payBelt` loads matching goods from the
  doctor's hands, unless `doneByHand` says the other line's twin is still by hand.
- Priority: `addPrioritySign` puts a tappable "First:" sign at `PRIORITY_SIGNS[id]` by each
  table's and cauldron's label; a tap calls `cyclePriority` (none, then each plant or potion in
  `PLANTS`/`POTIONS` order) and stops propagation so the doctor doesn't walk. The sign shows the
  item's icon, or "any".
- Customers: the scene walks each order's sprite from `STREET` to `customerPosition(i)` and adds
  the order to its `atCounter` set once it arrives. `tick` serves, and counts down patience for,
  only orders `atCounter` accepts (default: all). Wants and patience show only once arrived.
- Harvest is automatic: plots within `displayHeight * harvestReach(state)` of the doctor's centre,
  nearest first, one per `HARVEST_INTERVAL_MS` (150).

### State model

`GameState` in `src/game/state.ts` is plain JSON (`version: 3`, `layout`). Key parts: `carrying`
(bottom to top), `player` (starts at 600,520), `plots` (3 per garden, gardens in `GARDENS` order,
two per line), `refiner`/`refiner2` (`queue`, `progress`, `output`), `cauldron`/`cauldron2`
(`contents`, `brewing`, `output`), `counter` (`shelf`, `till`, `serving`), `orders` (each with fixed
per-potion `pay`, and `patience` that counts down only at the counter), `upgrades`, `craftsmen` (an
`Upgrade` whose `level` is the number hired), `belts` (a `Build` plus riding `items`, each `at` ms
along the main run), `priority` (per `CraftingId`, a `PlantId` or `PotionId` to make first, or
null), `expansion` (land, two fields, refiner, cauldron as `Build`s).

- Only `src/game/sim.ts` changes rules state, mutating in place. The scene writes only
  `state.player` and passes `workingAt` and `atCounter`; it never edits stock directly.
- Every tray holds at most `PALLET_SIZE` (40) of each item kind; `palletHasRoom` guards every add.
- Second-line stations and fields exist in state from the start; `stationBuilt` and `gardenBuilt`
  gate them. A station works only with `crew` > 0: its craftsmen, or the doctor on its work spot.
- The refiner moves the plant it works on to the front of `queue`; `refining` keeps a started plant
  there and otherwise picks the priority plant first (`firstToRefine`), also right after finishing
  one, so leftover work goes onto the priority plant. Work past the end of a plant,
  brew or served potion carries over to the next, so slow frame rates lose nothing.
- `startBrew` picks the recipe when work starts: the cauldron's priority potion if its inputs are
  in and its pallet has room, otherwise by `shortfall` (wanted minus on the shelf, carried, brewing,
  on cauldron pallets and riding cauldron belts); ties go in `RECIPES` order. A priority never makes
  a station wait.

### Persistence

- `apothecary-save`: the whole `GameState`, saved every `AUTOSAVE_MS` (3s), on tab hide and on
  `pagehide` (not after "New game" is confirmed). `loadState` discards saves whose `version`
  differs or that lack `plots`, shallow-merges top-level fields, merges `upgrades`, `craftsmen`,
  `belts` and `priority` per key, appends new plots and drops orders without `pay`. A save from before
  `FEEDERS_LAYOUT` (3) gets `ontoOwnRuns`, which moves belt items up to their run's join; a save
  whose `layout` differs from `LAYOUT` (4, since belts end at pallets) gets the fresh `player`
  spot. Belt items keep their `at`; the belts kept their runs and order, so no migration moves them.
- "New game" (`clearSave` + `scene.restart`) removes only `apothecary-save`. The old
  `apothecary-fps` key is no longer used; the frame rate comes from the hub.

### Randomness and timing

- `Math.random` is used only by `tick` (its default `rand`, now the fifth argument): `orderInterval`
  and `newOrder` (one or two potions, which ones, patience). Art noise uses `seeded` from
  `src/art/pixelArt.ts`.
- Sim time and customer walking use `frameMs`, the clamped Phaser `delta`. Marker, harvest and
  feedback pacing use `this.time.now` and `delayedCall`; autosave uses `this.time.addEvent`. The
  sickle spins with the raw `delta`.

### Data tables

- Items, grow, refine and brew times, base prices: `src/game/items.ts`.
- Upgrade caps and costs (`UPGRADES`, `upgradeCost`), craftsmen (`MAX_CRAFTSMEN`,
  `craftsmanCost`), belts (`BELT_COST`, `BELT_MS`, `BELT_LANES`, `BELT_GAP_MS`, `BELT_ENDS`),
  `EXPANSION_COST`, `SERVE_MS`, `MAX_ORDERS`, pallet size, and effect formulas (`speedAt`,
  `growthSpeed`, `beltSpeed`, `potionPrice`, `orderInterval`, `carryCapacity`, `walkSpeed`,
  `harvestReach`): `src/game/state.ts`. Tip, patience and difficulty are in `newOrder` in
  `src/game/sim.ts`.
- Walk speed `SPEED` (160), `MAX_WALK_STEP_PX`, `CUSTOMER_SPEED` and the scene's interval constants:
  top of `src/scenes/GameScene.ts`.

### Hub settings

- `src/main.ts` calls `setupGame(game)` from `shared/setupGame.ts` right after creating the game,
  which applies the hub's frame cap, the FPS readout and reduced motion.
- Difficulty scales one number, customer patience: `newOrder` in `src/game/sim.ts` multiplies
  `maxPatience` by `byDifficulty(1.5, 1, 0.7)` from `shared/settings.ts` (Easy 1.5, Normal 1,
  Hard 0.7). Keep Normal exactly as designed: the playthrough runs on Normal.
- Reduced motion needs nothing beyond `setupGame`: the game has no camera shake, flash or
  blinking, so nothing in the game checks `settings.reduceMotion`.
- The game's Settings panel only shows the difficulty and frame rate ("Change these on the hub
  page") and has "New game". Settings are read once at page load.
- A change to what the difficulty scales updates the Apothecary row of the difficulty table in the
  root README.md and the Settings paragraph in this game's README.md.
- Shared settings live under the `hub-settings` key, not in `apothecary-save`; "New game" keeps
  them.

## Testing hooks

- The dev build sets `window.game`. The test reads the `Game` scene's `state`,
  `player.body.center` (feet), `pointerTarget`, `pallets[id].in/out` (each `Pallet`'s `item` and
  `count`), `recipes.visible` and `recipes.lines`, `customers` (id, x, y, `arrived`) and
  `cameras.main.scrollX/Y`. Several of these are private in TypeScript; renaming them breaks the
  test without a type error.
- Inputs: canvas clicks only (walking, the Recipes button at screen 219,22, a tap to close it). It
  watches the first customer walk in from `STREET`, and walks into the shop by the door routing.
- It seeds `Math.random`, owns `page.clock`, makes `requestAnimationFrame` a 64ms timer and forces
  the canvas renderer. It starts with empty storage, so it expects a fresh state on Normal, with
  every priority left at "any"; its taps must not land on a priority sign, which takes the tap.
- Mirrored in `e2e/playthrough.spec.ts` (update together): every spot in its constants block
  (wheat plot x's and row, mandrake spot, refiner, cauldron and counter markers, `LEAVE_SHOP`,
  `LEAVE_CAULDRONS`, `STREET`, `FIRST_CUSTOMER` = `customerPosition(0)`), `WALK_SPEED`,
  `POTION_PRICE`, the tip formula in `potionPay`, `shortfall`, grow times 8000/14000, the recipe
  line text and order, carry capacity 4, the world size 1200x880 (camera asserts), and which pallets
  each station shows.

## Making common changes

- Tune a number: edit the table in `src/game/items.ts` or `src/game/state.ts`; if it is a grow
  time, price, tip, carry size or recipe, update the matching expectation in the playthrough.
- Add a potion recipe: add the `PotionId`, an `ITEMS` entry, a `RECIPES` entry (order breaks ties),
  `POTION_PRICE`, art in `ITEM_ART` in `src/art/items.ts`, and a counter and cauldron out pallet
  position in `PALLETS` (one per potion, in `POTIONS` order). Belt lanes widen on their own. Update
  the recipe lines in the test.
- Add a plant: `PlantId`, `ITEMS`, `GROW_MS`, `REFINE` (and its refined item), plant art in
  `src/art/garden.ts` (`bakeGarden` and `plantTexture`), item art, a garden in `GARDENS` plus
  `GARDEN_AREAS`, new in and out pallet spots for the tables and cauldrons in `PALLETS`, and a
  feeder run in each garden belt's `BELT_PATHS` (runs follow the line's gardens in order). New
  plots append, so old saves keep working.
- Add an upgrade: an `UpgradeId` and `UPGRADES` entry, add it to `DOCTOR_UPGRADES` or
  `GUILD_UPGRADES` (the guild also needs a spot in `GUILD` in layout), and apply its level in a
  helper in `src/game/state.ts` used by the sim or scene.
- Move a station, marker or wall: edit `src/scenes/layout.ts` (a station's pallets and the belt
  ends at them move with it, and `BELT_MS` stays about 100 pixels a second), bump `LAYOUT` in
  `src/game/state.ts`, update the test's coordinates, and refresh
  `docs/screenshots/playthrough-*.png`. If belt paths change where goods ride, add a migration in
  `loadState` keyed on the saved `layout`, like `ontoOwnRuns`.
- Change the save shape incompatibly: bump `version` in `GameState` and `createInitialState`;
  otherwise make `loadState` fill the new field from `fresh`.

## Gotchas

- `loadState` only merges `upgrades`, `craftsmen`, `belts` and `priority` per key. A new field nested in
  `expansion`, `counter` or a station is missing from old saves unless handled there.
- Marker zones must not overlap: `standOnMarkers` takes the first shown one in creation order.
  Test walks must also avoid stopping on purple markers; the test asserts nothing was bought.
- Pallet positions in `PALLETS` are matched by index to `PLANTS`, `REFINED` and `POTIONS`; a new
  kind without a position gets no pallet.
- `layout.ts` mirrors line two with `mirror`; moving a line-one spot moves its twin. It must stay
  free of Phaser, since the sim and save import it.
- Belt lanes do not mirror (heading south a belt's first lane is on its right, heading north on its
  left), so `mirrorPallets` also swaps each pair to keep every kind at the end of its lane. Line
  one's pallet lists are in kind order but placed by lane, so the first kind's pallet may be the
  right one.
- `BELT_JOIN_MS` is measured on the first cauldron belt to `CAULDRON_BELTS_MEET` and assumes both
  cauldron belts are the same length; keep them mirrored.
- `atCounter` lives only in the scene; `tick` called without it serves every customer at once.
- Garden belt build spots sit outside a maxed sickle's reach on purpose, so hands a new belt empties
  do not refill from the patch.
- `tick` runs before `movePlayer`, so `workingAt` uses last frame's feet position.
- Healing Draught art is red; keep any cross shapes off red (root rule on red crosses).
