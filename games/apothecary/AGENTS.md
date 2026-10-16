# Apothecary: guide for agents

How Apothecary is built and where things stand, for agents about to change it. README.md covers how
to play and lists the prices and upgrades. Keep this file up to date in the same PR as any change
to the game, as the root AGENTS.md asks.

## Current state

Apothecary is a top-down automation game: a plague doctor walks a yard laid out in two rows either
side of the shop, harvests wheat, mandrake and (once a shade garden is planted) nightshade, refines
them at a table, brews potions in a cauldron and sells them to customers from shelves along the
shop's walls. Coins buy upgrades, craftsmen,
pixies that carry goods between stations (the sim and code still call them belts), recipes at the
study, shade gardens and a mirrored second production line.

- Implemented: the full loop on both lines, auto-harvest with a spinning sickle, floor markers
  (dashed rings: drop, work, pick up, and purple pay markers with an icon for each kind of thing
  bought), pallets that show station stock (only for items available yet), storage that starts
  small and grows with the guild's Storage upgrade, customers served only at the counter, a walled
  shop in the middle that faces the street at the bottom and that the doctor enters by a north door, station upgrades (5 levels), outfitter and
  guild upgrades, two craftsmen per station (the second opens a second pipe at a table or
  cauldron; craftsmen rock to and fro while their pipe works), a priority choice per crafting
  station, six pixie routes (belts) with one lane per item kind, six potions of which two are
  known from the start and four are learned at the study, one shop shelf per potion learned, the
  expansion, a row of order cards always on screen, weather drawn over the yard,
  a Recipes panel and a Settings panel, a daily contract card, tips that shrink while a customer
  waits (a coin ring on each order bubble), and an autopilot that plays the time away (up to 2h)
  on load and shows a "While you were away" chip. Progress autosaves to localStorage.
- Round two: a price sign on each shelf (Cheap, Fair, Dear), blight on the beds from day 3 and the
  guild's herbalist against it, replanting a garden from its sign, a rival shop across the street
  from day 4 that undercuts one potion a day and closes after ten days outsold, and the plague
  from day 5, three stages on a card under the town card, ending in the Panacea: brewing it cures
  the town and wins the game, with "Keep trading" after. The game's first ending.
- Gardens have nine beds each, three by three edge to edge (`PLOTS_PER_GARDEN`, `plotPosition`).
  Two shade gardens grow nightshade for the Shadow Elixir, Moonlight Salve and Witch's Brew. A brew's last quarter
  is its fine window: picked up then by hand, it becomes a Fine potion (its own item kind) worth
  `FINE_BONUS` times as much. Customers can come back as regulars, the street keeps a reputation,
  each day has almanac weather, and every fourth day is a market day with a crowd at midday. The
  town card right of the contract shows the weather, reputation and the market day.
- Look: an ink-and-watercolour herbalist's almanac. Every texture is painted on a canvas at load
  (`textures.addCanvas`), with no image files; `pixelArt` is off; all text is serif (`SERIF`).
  The palette is kept dark and muted (deep greens, dark earth and floor boards, aged-paper cards
  under dark ink): keep new ground, card and surface colours in that range, and only items, markers
  and the brew bright.
- There is one scene with no title or lose screen, and no audio; the only win screen is the cure's
  panel (`showWin`). A customer who runs out of patience leaves and lowers the reputation.
- Leftovers: `GAME_WIDTH`/`GAME_HEIGHT` in `src/main.ts` are only used there. `DOCTOR_W`/`DOCTOR_H`
  in `src/art/doctor.ts` are exported but unused.

## Architecture

### File map

- `src/main.ts`: creates the `Phaser.Game` (960x540, FIT scaling, arcade physics with
  `fixedStep: false`, `pixelArt: false`, aged-paper background `PAPER`), registers `BootScene` and `GameScene`, calls `setupGame(game)`
  from `shared/setupGame.ts` and `setupScaling(game)` from `shared/scaling.ts`, and puts `game` on window in dev.
- `src/game/items.ts`: item ids and defs (`ITEMS`), `GROW_MS`, `REFINE`, `RECIPES`,
  `POTION_PRICE`, the `isPlant`/`isRefined`/`isPotion`/`isFine`/`isSellable` guards, the ordered
  lists `PLANTS`, `REFINED`, `POTIONS`, and the fine potions (`FineId`, `FINE`, `plainOf`; a
  `SellableId` is a plain or fine potion).
- `src/game/state.ts`: every state type, `createInitialState`, the layout versions (`LAYOUT`,
  `FEEDERS_LAYOUT`, `COLUMNS_LAYOUT`, `HEART_LAYOUT`), the
  upgrade, belt (`BELT_MS`, and `COLUMNS_BELT_MS` and `U_BELT_MS` from older layouts), expansion and pallet tables (`PALLET_SIZE`, and `storage`, what a pallet
  or shelf holds now: `STORAGE_START` 10 plus `STORAGE_STEP` 10 a Storage level), and small derived helpers (`carryCapacity`,
  `walkSpeed`, `potionPrice`, `stationBuilt`, `anyFieldBuilt`, `beltBuildable`, ...). Also the tip
  rules (`TIP_SHARE`, `maxTip`, `tipLeft`, `tipNow`) and the contract (`Contract`, `DAY_MS`,
  `MAX_CONTRACT`, `contractFor`). Also the gardens (`GARDENS`, `GARDEN_LINE`, `SHADE_GARDEN`,
  `SHADE_COST`, `gardenBuilt`, `shadeGrown`, `orderable`), the study (`KNOWN_RECIPES`,
  `RESEARCH_ORDER`, `researched`; its level is the `research` upgrade), the fine window (`FINE_SHARE`,
  `FINE_BONUS`, `inFineWindow`), reputation and regulars (`START_REPUTATION`,
  `REPUTATION_SERVED`, `REPUTATION_WALKED_OFF`, `reputationFactor`, `nudgeReputation`,
  `REGULAR_TIP_LEFT`, `MAX_REGULARS`, `REGULAR_CHANCE`, `REGULAR_BONUS`), the weather (`Weather`,
  `WEATHER`, `weatherFor`) and market days (`MARKET_EVERY`, `isMarketDay`, `RUSH_SIZE`,
  `RUSH_BONUS`, `RUSH_EXTRA`). Also the plague (`Plague`, `PLAGUE_DAY`, `PLAGUE_STAGES`,
  `PLAGUE_STAGE_MS`, `PLAGUE_RELAPSE_EXTRA`, `PLAGUE_RELAPSE_REPUTATION`, `MAX_PLAGUE_NEED`,
  `plagueStage`, `panaceaUnlocked`, `plagueAt`), the price signs (`PriceSign`, `PRICE_SIGNS`,
  `SIGN_NAMES`, `SIGN_PAY`, `SIGN_DEMAND`, `SIGN_REPUTATION`, `SIGN_PATIENCE`, `signOf`,
  `patienceRate`), the blight (`BLIGHT_DAY`, `BLIGHT_EVERY_MS`, `BLIGHT_SPREAD_MS`, `blightImmune`,
  `plotNeighbours`), the rival (`Rival`, `RIVAL_DAY`, `RIVAL_CUT`, `RIVAL_SALES`,
  `RIVAL_MONTH_DAYS`, `rivalUndercuts`, `rivalPotionFor`) and replanting (`GARDEN_RUN`,
  `LINE_GARDENS`, `GARDEN_NAMES`, `gardenPlant`, `plantChoices`). `items.ts` also holds the
  Panacea (`PANACEA`, `PANACEA_RECIPE`, `BrewOut`: what a brew can be, a potion or the Panacea).
- `src/game/sim.ts`: the rules, free of Phaser. `tick` advances the world; marker actions
  (`dropAtRefiner`, `pickUpFromCauldron`, `stockShelf`, `collectTill`, `payUpgrade`,
  `payCraftsman`, `payBelt`, `payExpansion`, `payShade`, `joinGuild`, `dropAll`, `cyclePriority`,
  `cycleSign`, `replantGarden`, `clearBlight`) and `harvest` each change
  state and return `Feedback` lines. Also `refining`, `hasRoom`, `doneByHand` and `isBlighted`.
- `src/game/save.ts`: `loadState`, `saveState` (stamps `lastSeen` with `Date.now()`), `clearSave`
  (key `apothecary-save`), and the `ontoOwnRuns`, `ontoColumns` and `ontoHeart` belt migrations.
- `src/game/away.ts`: the autopilot. `catchUp(state, now, rand)` plays the time since `lastSeen`
  (capped at `AWAY_CAP_MS`, 2h; nothing under `AWAY_MIN_MS`, 60s) through `tick` in 500ms steps
  with nobody on a work spot and every customer at the counter, and returns an `AwaySummary`
  (`ms`, `coins`, `potions`) or null. `hasAutomation`: any craftsman hired or belt built.
- `src/scenes/BootScene.ts`: bakes all textures and animations, then starts `Game`.
- `src/scenes/GameScene.ts`: builds the world, markers and HUD, reads input, walks the doctor
  around stations and through the shop door, calls the sim each frame and updates views. Also
  `walkTowards` for customer sprites.
- `src/scenes/layout.ts`: every world position (gardens, plots, yards, stations, markers, pallets,
  priority signs, craftsmen, guild, outfitter, shop, its walls and doors, customer spots), plus the belt geometry:
  `BELT_PATHS` (main run first, then feeders; each runs from a station's out pallets to the next
  station's in pallets), `runLength`, `beltSpan` and `BELT_BUILD`. It imports no Phaser, since
  `sim.ts` and `save.ts` use it.
- `src/art/`: canvas-painted art, one `bake*` function per file. `paint.ts` holds the shared kit:
  the ink and paper colours (`INK`, `PAPER`, `WASH`, `ITEM_COL`), `SERIF`, the seeded art random
  (`seeded`, `reseed`, `rr`, `chance`), `paint(scene, key, w, h, draw, res)` which paints a texture at
  `res` times its size, `fit(image, scale)` which shows it at its logical size, and the brushes
  (`wash`, `ink`, `hatch`, `wob`, `both`, `shadow`, `paper`, `itemIcon`, `coinIcon`). `ground.ts`
  paints the whole world as one `ground-world` texture (grass, with each of `YARDS` as compressed
  earth, `WASH.dirt`), plus the expansion yard, the shop's walls
  (`ground-walls`, laid above the expansion yard so its edge doesn't cover the right wall), each garden and
  the scattered trees and bushes (`sceneryLayout`). `ui.ts` paints parchment cards on demand
  (`cardTexture(scene, kind, w, h)`: bar, button, contract, town, chip, bubble, sign, small, panel) and
  `signTexture`, plus the `weather-<kind>` icons, the regular's `regular` star (`sparkle` in
  `paint.ts`, also on fine potions' icons), the plague card's `bell` and the `rival-stall`. `pixies.ts` paints the pixie (`PIXIE_FRAMES`, two wing
  beats) and the built routes' fairy-dust trails as one image (`drawFairyPaths`, re-painted when the
  set of built belts changes), and `pointAlong`/`laneOffset` place pixies on them. `stations.ts`
  also paints the study's desk (`study`) and the shop shelf (`shelf`); `TABLE_TOP` and
  `PALLET_DECK` are the light woods of the refining table and the pallets. `markers.ts` paints the
  floor markers (`pad-in`, `pad-out`, `pad-work`, `pad-up`) and one purple marker per
  `UPGRADE_ICONS` entry (`upgradePad(icon)`, `pad-up-<icon>`).
- `src/ui/`: `BackStack` (items piled on the doctor), `IconRow` (customer wants), `Pallet` (crate
  stacks, exposes `item` and `count`, `setVisible`), `Shelf` (a shop shelf of one potion, up to six bottles, fine
  ones first; exposes `item` and `count`), `ProgressBar` (redraws only when its fill changes;
  `setZone` marks a golden end zone, used for the cauldron's fine window),
  `RecipeBook` (exposes `lines`), `Settings` (read-only view of the hub's settings, and New game).

### How it runs

- `BootScene.create` calls the `bake*` functions (doctor, items, garden, stations, markers,
  pixies, townsfolk, ground, ui); none load asset files. Then `GameScene.create` calls `loadState` and the
  `create*` builders in order.
- `GameScene.update(time, delta)`: sets `frameMs` (delta clamped to `MAX_STEP_MS`, 250), finds
  `workingAt` (the work spot under the feet), calls `tick(state, frameMs, workingAt, atCounter)`,
  then `movePlayer`, `standOnMarkers`, `autoHarvest` and `spinSickle`, copies the sprite position
  into `state.player`, and runs every function in `views`.
- Rendering is retained objects, not redraws: each builder creates its Phaser objects once and
  pushes a closure onto `views` that syncs them from `state` every frame. `once(ready, create)`
  defers creating things that appear when bought (second-line stations, fields, expansion yard).
  The belt network is redrawn only when the set of built belts changes.
- Depths: ground -1000 to -990 (scenery sorts by y like standing things), signs -910, belts -600, riding goods -550, plots -500, markers
  -400, till -300; standing things sort by y (the doctor by his feet); `WORLD_UI_DEPTH` (9999) for
  bars, order bubbles and feedback, `UI_DEPTH` (10000) for the top bar, the contract card, the town
  card (`TOWN_CARD`, `createTown`) and the away chip (below the town card), `UI_DEPTH + 1` for panels.
- Walking: arcade physics steps once per drawn frame; WASD/arrows set velocity directly, and
  `limitWalkStep` (on `PRE_UPDATE`) caps a step at `MAX_WALK_STEP_PX` (20) so a long frame can't
  carry the feet through a station or wall (static obstacles from `addObstacle` and `SHOP_BLOCKS`).
- Taps: `reachable` moves a tapped spot out of any station or wall area into `pointerTarget`;
  `routeAround` picks a `waypoint`: the back door (`SHOP_DOORWAY`) into or out of the shop,
  otherwise a corner of the nearest `blockedAreas` rectangle (or the whole shop) in the way. Taps
  close an open panel instead of walking; HUD buttons, the top bar itself and the Recipes and
  Settings panels' backgrounds stop propagation (Phaser falls through to the main camera when
  nothing under the tap on the UI camera is interactive, which would reach a priority sign), and
  a tap on the Recipes panel closes it. A priority sign tapped while a panel is open only closes
  the panel. The tapped spot comes from
  `cameras.main.getWorldPoint`, since the pointer's own `worldX/Y` may be the UI camera's.
- Zoom: two cameras. The main camera follows the doctor and zooms (`MIN_ZOOM` 0.62 to `MAX_ZOOM`
  2, by the mouse wheel, + and - keys, or a two-finger pinch on `pointer1`/`pointer2`, which also
  cancels the walk when the second finger lands on the map, the top bar, a top-bar button or a
  priority sign; `pinching` checks it, so that finger doesn't change the sign or press the button.
  The open Recipes and Settings panels stop taps without this check). The camera's own zoom is
  the player's zoom times `renderScale` (the `zoom` getter reads the player's part back), and
  `followPlayer` gives it back Phaser's middle origin with `scrollingCamera`. `uiCamera`
  never moves or zooms beyond `renderScale` and draws everything from `UI_DEPTH` up: `splitCameras` sets each object's
  `cameraFilter` by its depth every frame, so later objects sort themselves. `setZoom` clamps,
  never zooming out past the world's width (so no paper shows at the sides), and stores the zoom
  under `apothecary-zoom`.
- Map (`WORLD` 1680x900): two rows of production either side of the shop (line one on the left,
  line two mirrored on the right with `mirror`), each running east along `LINE_Y` from its gardens
  (wheat, mandrake and shade stacked at the far edge) through `REFINER` and `CAULDRON` into the
  shop's side wall. A station's drop and pick-up markers stand north of it either side (`IN_X`,
  `OUT_X`, at `HANDS_Y`), its work spot just above it (`WORK_Y`), its label, priority sign and
  upgrade, craftsman and belt markers in a row below it (`SIGN_Y`, `PRIORITY_Y`, `COINS_Y`,
  `COINS_GAP` apart). Its in pallets are left of it and its out pallets right of it (`acrossRoute`).
  The market below holds `OUTFITTER`, `STUDY` (left) and `GUILD` (right), with `EXPANSION_LAND`
  beside the shop. The shop (`SHOP`) stands in the middle, facing the street (`STREET`) along the
  bottom edge of the world; outside its north door are the counter's drop-off and Lv and Hire
  markers. `YARDS` are the earth patches the ground paints.
- Shop walls: `SHOP_WALLS` are drawn, with gaps for `SHOP_DOOR` (the back door in the top wall,
  the doctor's), `SHOP_STREET_DOOR` (in the bottom wall, the customers') and the belt holes in the
  side walls at `LINE_Y`. `SHOP_BLOCKS` are what the doctor collides with: the top wall pieces,
  the side walls, and the bottom wall with the street below it as one block, so only customers use
  the street door. `measureShop` and `inShop` read the shop's bounds from them.
- Markers: `addMarker`, `addLevelMarker` and `addBuildMarker` push a `Marker` (44x44 zone, `act`,
  `shown`). `standOnMarkers` runs the first shown marker under the feet once every
  `MARKER_INTERVAL_MS` (200); each call moves one item or pays at most 5 coins (`UPGRADE_STEP`).
  Purple markers (`pays`) take coins only once the doctor's body has stood still for `STILL_MS`
  (400, tracked in `stillSince`), so walking over one buys nothing; their captions show the coins
  still to pay (cost minus `paid`), with no bar.
  A level marker sets `paused` after a level completes until the doctor steps off, and is hidden
  (marker and caption) once its last level is bought. Each purple marker gets the `UpgradeIcon` of
  what it buys (`upgradeIcon(id)` for an upgrade: the station's own icon for a station's level),
  passed to `addLevelMarker` and `addBuildMarker`.
- Unlocks: every purchase has an `Unlock` key (`level-<upgrade>`, `hire-<station>`,
  `belt-<belt>`, `guild`, `land`). `UNLOCKED_BY` in `src/game/state.ts` names what must be bought
  first (its first level or build): one chain at the start, then branches from the garden belt.
  `unlocked` also holds once the thing itself has a level or coins paid in, so old saves keep what
  they started. The pay functions in the sim refuse a locked thing, and the scene's purple markers
  are shown only while it is unlocked. Entry to the guild is `state.guild` (a `Build`, `GUILD_COST`
  50), paid by `joinGuild` at a marker on `GUILD.join`, which shows until the customers
  upgrade can.
- Belts, shown as pixies: each route starts below a station's out pallets (or in the gardens) and
  ends above the next station's in pallets, or above the shop's shelves. The sim still takes from
  the station's `output` and hands to its tray; the pallets are those trays drawn. `createBelts`
  draws a pixie and the item's icon for each riding item, a lane's `laneOffset` to the side of the
  route; in its last `PIXIE_APPROACH_MS` the pixie flies over to `dropSpot` (its kind's pallet at
  `BELT_TARGET`, or its shelf). Wings beat and pixies bob on `this.time.now`, still with reduced
  motion. Pixies are drawn at `PIXIE_DEPTH`, above everything standing. A built belt hides its pick-up marker, and its drop marker
  unless the doctor carries that kind; the counter's drop stays until `doneByHand` is false for
  both cauldron belts. Goods get on at `beltSpan(id, kind).start` (mandrakes on their patch's
  feeder) and join the main run at `join`. Each cauldron belt runs on its own into its side of the
  shop. `payBelt` loads matching goods from the
  doctor's hands, unless `doneByHand` says the other line's twin is still by hand.
- Priority: `addPrioritySign` puts a tappable "First:" sign at `PRIORITY_SIGNS[id]` by each
  table's and cauldron's label; a tap calls `cyclePriority` (none, then each plant, or each
  researched potion, in `PLANTS`/`POTIONS` order) and stops propagation so the doctor doesn't walk. The sign shows the
  item's icon, or "any".
- Stock pricing: `serveFromShelf` pays `stockedPay(order.pay[want], others)`, where `others` is
  how many of that potion (plain or fine) stay on the shelf after the one sold; `stockFactor` (2.5%
  off each, at least half) is in `src/game/state.ts`. A fine one of the wanted potion goes first and
  pays `stockedPay(round(pay * FINE_BONUS), others)`. The scene shows the next sale's cut under
  each shelf.
- Shelves: `createShopfront` builds a `Shelf` per potion at `shelfPosition(i)`, three on each side
  wall, each in its fixed spot, and shows those `researched`. They are not obstacles.
  `pallets.counter.in` holds the shelves standing, in `POTIONS` order, for the test. The shelf
  holds `storage(state)` of each potion, plain and fine together (`hasRoom`). The counter's drop
  marker is outside the north door; its work spot is right behind the counter, the coins beside it.
- Pallets: `addPallets` builds a `Pallet` for every kind with a spot in `PALLETS` but shows only
  those `available`: plants (nightshade once `shadeGrown`), a refined good once its plant is
  available, a potion once `researched`. `this.pallets[id]` holds only the standing ones, which is
  what the test reads.
- Study: `createStudy` puts the desk (an obstacle) under its sign at `STUDY` and a level marker for
  the `research` upgrade, captioned with the next recipe in `RESEARCH_ORDER`; it unlocks with the
  garden belt. `payUpgrade` says "Learned <potion>!". `startBrew` skips recipes not `researched`,
  `orderable` leaves them out of orders, and `RecipeBook` fades them with "Study" for a price.
- Orders: `createOrderStrip` shows a `chip` card per order (`ORDER_STRIP`, up to
  `MAX_ORDER_SLOTS`) under the top bar on the left, with the wants still owed and, once at the
  counter, a patience bar.
- Weather: `createWeather` lays a world-sized tint rectangle and a `Graphics` at `WEATHER_DEPTH`
  (under the bubbles and bars) and, each frame, draws `RAIN_STREAKS` rain streaks or `HEAT_WAVES`
  heat waves across `cameras.main.worldView`, placed by a fixed `scatter` so it never calls
  `Math.random`. Mild days draw nothing; reduced motion keeps only the tint.
- Fine window: `inFineWindow(brew)` holds from `1 - FINE_SHARE` (75%) of a brew to its end.
  `pickUpFromCauldron` takes such a brew (`brewing` first, then `brewing2`) out as its `FINE` potion before anything on the out
  pallets. A brew only moves while worked, so stepping off the work spot holds it in the window.
  The brewing bar's zone (`setZone`) and fill turn gold there. Each station has a second bar
  8px below the first for its second pipe, shown only while that pipe works.
- Reputation and regulars: `tick` lowers `reputation` by `REPUTATION_WALKED_OFF` for each order
  whose patience runs out (and marks a running rush lost); `orderFilled` raises it by
  `REPUTATION_SERVED`, and a customer filled with `tipLeft` at least `REGULAR_TIP_LEFT` joins
  `regulars` (oldest dropped past `MAX_REGULARS`). `newOrder` rolls `REGULAR_CHANCE` only while
  there are regulars, so a new game's first orders use the same randomness as before. A regular's
  order has their `face`, `regular: true`, their old `asked` potions and `REGULAR_BONUS` more pay
  each. `orderInterval` is scaled by `reputationFactor` (1 at 50).
- Weather and market days follow `contract.day` (which also rolls when a contract is kept):
  `weatherFor(day)` is mild on day 1 and then cycles `FORECAST`; `growthSpeed` and
  `orderInterval` apply it. On a market day, once `dayLeft` is under half, `tick` calls
  `startRush` once (`rush.day`): up to `RUSH_SIZE` orders flagged `rush`, filling the counter's
  places and `RUSH_EXTRA` more (`MAX_ORDER_SLOTS` includes them). Filling all of them with none
  lost pays `RUSH_BONUS` each into `coins`.
- Customers: the scene walks each order's sprite (`customerTexture(order.face ?? order.id)`) from `STREET` to `customerPosition(i)` and adds
  the order to its `atCounter` set once it arrives. `tick` serves, and counts down patience for,
  only orders `atCounter` accepts (default: all). Wants and patience show only once arrived.
- Harvest is automatic: plots within `displayHeight * harvestReach(state)` of the doctor's centre,
  nearest first, one per `HARVEST_INTERVAL_MS` (150). Blighted plots in reach are cleared first
  (`clearBlight`, hands full or not), and the sickle spins for them too.
- Price signs: `addPriceSign` puts a tappable small sign beside each shelf at `shelfSignPosition(i)`,
  shown with the shelf; a tap calls `cycleSign` and stops propagation. `serveFromShelf` scales a
  potion's pay by `SIGN_PAY`, adds `SIGN_REPUTATION` and takes the rival's `RIVAL_CUT` off a plain
  one the rival undercuts (a fine one beats it); `tick` drains patience by `patienceRate` (dear
  wants); `newOrder` draws from a hat with each potion in it `SIGN_DEMAND` times (all signs Fair
  leaves the draw as it was, so the playthrough's orders repeat). The cut text under a shelf shows
  the combined factor: stock, sign and rival.
- Blight: `spreadBlight` in `tick` rolls `rand` only when the blight can strike (from `BLIGHT_DAY`
  on a rainy day, not immune) or a blighted bed can spread, so day 1 uses the same randomness as
  before. A blighted plot (`blighted`, `blightMs`) doesn't grow and `isRipe` is false, so the
  sickle and the pixies leave it; its plant is tinted `BLIGHT_TINT` and its bar hidden. The
  herbalist clears every bed at once. The town card's note names the garden struck.
- Replanting: `addGardenSign` makes each garden's sign tappable (`GARDEN_SIGN_W`, the plant's
  name from `GARDEN_NAMES` and its icon); a tap calls `replantGarden`, which changes every plot
  of the garden in place (the scene's plot closures keep their plot objects). Goods picked by a
  garden belt carry `run` (`GARDEN_RUN` of their garden) so pixies fly them from the garden they
  came from: `beltSpan(id, kind, run)` and `takeForBelt` return it.
- Rival: `tick` calls `rivalNewDay` whenever `rival.day` falls behind `contract.day`: yesterday's
  `sold` against `RIVAL_SALES` moves `streak` on or resets it, `RIVAL_MONTH_DAYS` closes the
  rival, and `rivalPotionFor(day)` picks today's potion (none before `RIVAL_DAY`). `createRival`
  draws the stall at `RIVAL` once there is anything to say, boarded (faded) when closed.
- Plague: `tick` starts it at `PLAGUE_DAY` (`plagueAt(0)`), counts the stage's `left` down and
  calls `relapse` at 0. `serveFromShelf` calls `deliverForPlague` for every potion sold; enough
  moves to the next stage, and past the last `panaceaUnlocked` holds. `startBrew` then brews the
  Panacea first whenever `PANACEA_RECIPE.inputs` are in; `brew` sets `plague.cured` instead of
  putting it out, and `pickUpFromCauldron` never takes it out fine. `createPlague` draws the card
  at `PLAGUE_CARD` (under the town card, clear of the shelves when the doctor is at the counter)
  with notes for each change, and `showWin` opens the cure's panel, closed like the others by
  `closePanels` (any tap).

### State model

`GameState` in `src/game/state.ts` is plain JSON (`version: 3`, `layout`). Key parts: `carrying`
(bottom to top), `player` (starts at 630,620, in the market), `plots` (3 per garden, gardens in `GARDENS` order,
two per line), `refiner`/`refiner2` (`queue`, `progress`, `output`, and `second`: the second
pipe's plant and progress, or null), `cauldron`/`cauldron2` (`contents`, `brewing`, `brewing2`,
the second pipe's brew, and `output`), `counter` (`shelf`, `till`, `serving`), `orders` (each with fixed
per-potion `pay`, and `patience` that counts down only at the counter), `upgrades`, `craftsmen` (an
`Upgrade` whose `level` is the number hired), `belts` (a `Build` plus riding `items`, each `at` ms
along the main run), `priority` (per `CraftingId`, a `PlantId` or `PotionId` to make first, or
null), `guild` (a `Build`: entry to the guild), `expansion` (land, two fields, refiner, cauldron as
`Build`s), `shade` (the two shade gardens as `Build`s), `contract` (`day`, `potion`, `need`, `made`, `reward`, `dayLeft`, `kept`), `sold` (potions
handed over at the counter, ever), `tips` (tip coins ever), `lastSeen` (wall-clock ms of the last
save or load, 0 in a new game), `reputation` (0 to 100), `regulars` (`face`, `wants`), `rush`
(`day`, `size`, `served`, `lost`, `paid`, or null), `plague` (`stage`, `need`, `made`, `left`,
`relapses`, `cured`, or null before day 5), `signs` (a `PriceSign` per potion, Fair when missing)
and `rival` (`open`, `day`, `potion`, `sold`, `streak`). Each order also has `tip`, its full tip (`maxTip`
of its size), and may have `asked`, `face`, `regular` and `rush`. `counter.shelf` and `carrying`
can hold fine potions. A plot may be `blighted` with `blightMs`; a belt item may carry `run`; a
brew's `out` may be `PANACEA`.

- Tips: when an order's last potion is handed over, `serveFromShelf` adds `tipNow(order)` to the
  till and `state.tips`: `tip` scaled by `tipLeft`, which falls from 1 at the counter to 0 once
  `TIP_SHARE` (60%) of its patience is gone. `pay` (price plus the counter bonus, `2 * (counter
  level + 1)`) is unchanged and paid per potion as before.
- Contract: `tick` counts `contract.dayLeft` down by `dt` and at 0 rolls to `contractFor(day + 1,
  kept)`. Each potion of `contract.potion` handed over calls `deliverForContract`, which at `need`
  pays `reward` into `coins` and rolls to `contractFor(day + 1, kept + 1)` at once. Odd days ask for
  Sleeping Tonics, even days Healing Draughts; `need` is `3 + kept` up to 12; `reward` is 45% of
  what they sell for, rounded to 5. The scene's card notes "Contract kept!" or "Dusk: contract
  missed" when `contract.day` changes under it.
- Only `src/game/sim.ts` changes rules state, mutating in place. The scene writes only
  `state.player` and passes `workingAt` and `atCounter`; it never edits stock directly.
- Every tray holds at most `storage(state)` of each item kind (10, plus 10 a level of the guild's
  Storage upgrade, up to `PALLET_SIZE` 40); `palletHasRoom(state, tray, item)` guards every add,
  and `hasRoom` counts a shelf's plain and fine potions together.
- Second-line stations and fields exist in state from the start; `stationBuilt` and `gardenBuilt`
  gate them. A station works only with `crew` > 0: its craftsmen, or the doctor on its work spot.
- Second pipe: with two craftsmen (`secondPipe`) a table or cauldron works two things at once, each
  at the speed one pair of hands works, rather than one twice as fast. A table's first pipe works
  the front of `queue` as before; `refineSecond` takes the next plant to start on from behind it
  (same priority rules) into `second`, and a finished one waits there while its pallet is full. A
  cauldron runs `brew` on `brewing`, then on `brewing2`. `second` and `brewing2` are optional, so
  old saves load with both empty.
- The refiner moves the plant it works on to the front of `queue`; `refining` keeps a started plant
  there and otherwise picks the priority plant first (`firstToRefine`), also right after finishing
  one, so leftover work goes onto the priority plant; without one, the plant whose good has the
  fewest on the output pallets (`onPallet`), ties to the front of the queue. Work past the end of a plant,
  brew or served potion carries over to the next, so slow frame rates lose nothing.
- `startBrew` (called by `brew` for either pipe) picks the recipe when work starts: the cauldron's priority potion if its inputs are
  in and its pallet has room, otherwise the potion with the fewest on the cauldron's output pallets
  (a fine one counts as its plain potion); ties go in `RECIPES` order. A priority never makes
  a station wait.
- Picking up (`pickUpOne`, for both pick-up markers) takes a mix: each time the kind the doctor
  carries fewest of, then the kind with the most waiting, then the first.

### Persistence

- `apothecary-save`: the whole `GameState` (with `lastSeen` stamped by `saveState`), saved every `AUTOSAVE_MS` (3s), on tab hide and on
  `pagehide` (not after "New game" is confirmed). `loadState` discards saves whose `version`
  differs or that lack `plots`, shallow-merges top-level fields, merges `upgrades`, `craftsmen`,
  `belts` and `priority` per key, appends new plots (or, when a saved plot's plant doesn't match
  its garden, as in saves from three beds a garden, starts every plot fresh: `keepsPlots`) and
  drops orders without `pay`. `keepsPlots` now asks that every bed of a garden grows the same
  plant (a replanted garden switches all nine), not that it grows `GARDENS`' plant. A save without
  `guild` counts as having joined if it bought or paid into any guild upgrade. A save from before
  `COLUMNS_LAYOUT` (5) first gets `ontoColumns`, which scales each belt item's `at` by its belt's
  new `BELT_MS` over the old `U_BELT_MS`, so it keeps its place along the shorter run; then a save
  from before `FEEDERS_LAYOUT` (3) gets `ontoOwnRuns`, which moves belt items up to their run's
  join on today's belts. A save from before `HEART_LAYOUT` (6) first of all gets `ontoHeart`, which
  scales each belt item's `at` by `BELT_MS` over `COLUMNS_BELT_MS` for the rows. A save
  whose `layout` differs from `LAYOUT` (6, the rows) gets the fresh `player` spot.
- Away: `GameScene.create` calls `catchUp(state, Date.now())` right after `loadState` and keeps the
  result in the public `away` field; `createAwayChip` shows it (top right, `AWAY_CHIP`) until tapped.
  The new fields (`contract`, `sold`, `tips`, `lastSeen`, `shade`, `reputation`, `regulars`,
  `rush`, `plague`, `signs`, `rival`) come from `fresh` through the shallow merge, so `version` was
  not bumped; old orders without `tip` tip nothing, and an old save's rival picks its potion on
  the next tick.
- `apothecary-zoom`: the main camera's zoom, a view preference that "New game" keeps.
- "New game" (`clearSave` + `scene.restart`) removes only `apothecary-save`. The old
  `apothecary-fps` key is no longer used; the frame rate comes from the hub.

### Randomness and timing

- `Math.random` is used only by `tick` (its default `rand`, now the fifth argument): `orderInterval`,
  `newOrder` (a returning regular, only once there are any; one or two potions, which ones,
  patience), `startRush` and `spreadBlight` (only from day 3 in the rain, or while a bed is
  blighted), also when `catchUp` plays time away. The weather, the rival's potion and the plague
  are not random: they come from the day.
  Art noise uses `seeded`/`reseed` from `src/art/paint.ts`, reseeded per texture, so painting never
  touches `Math.random`.
- `Date.now()` is used only for `lastSeen` and `catchUp`; the test starts with empty storage, so
  `catchUp` returns null before using any randomness.
- Sim time and customer walking use `frameMs`, the clamped Phaser `delta`. Marker, harvest and
  feedback pacing use `this.time.now` and `delayedCall`; autosave uses `this.time.addEvent`. The
  sickle spins with the raw `delta`.

### Data tables

- Items, grow, refine and brew times, base prices: `src/game/items.ts`.
- Upgrade caps and costs (`UPGRADES`, `upgradeCost`), craftsmen (`MAX_CRAFTSMEN`,
  `craftsmanCost`), belts (`BELT_COST`, `BELT_MS`, `BELT_LANES`, `BELT_GAP_MS`, `BELT_ENDS`),
  `EXPANSION_COST`, `SERVE_MS`, `MAX_ORDERS`, pallet size, and effect formulas (`speedAt`,
  `growthSpeed`, `beltSpeed`, `potionPrice`, `orderInterval`, `carryCapacity`, `walkSpeed`,
  `harvestReach`): `src/game/state.ts`. Order size, tip, patience and difficulty are in
  `newOrder` in `src/game/sim.ts`; the customers level raises the two-potion chance and divides
  patience by `1 + 0.5 * level`, alongside `orderInterval`.
- Walk speed `SPEED` (160), `MAX_WALK_STEP_PX`, `CUSTOMER_SPEED` and the scene's interval constants:
  top of `src/scenes/GameScene.ts`.

### Hub settings

- `src/main.ts` calls `setupGame(game)` from `shared/setupGame.ts` right after creating the game,
  which applies the hub's frame cap, the FPS readout, reduced motion and full screen, and then
  `setupScaling(game)` from `shared/scaling.ts`, which draws the canvas at the screen's resolution
  (`renderScale` canvas pixels per game pixel, zooming every camera to match) and asks to turn a
  phone held upright. `paint` multiplies each texture's `res` through `sharpRes`, so art stays
  crisp on big screens. The top bar and panels lay out with `viewSize(scene)`, not `scene.scale`,
  which is in canvas pixels. `e2e/screens.spec.ts` at the root checks the game on five screens.
- Difficulty scales one number, customer patience: `newOrder` in `src/game/sim.ts` multiplies
  `maxPatience` by `byDifficulty(1.5, 1, 0.7)` from `shared/settings.ts` (Easy 1.5, Normal 1,
  Hard 0.7). Keep Normal exactly as designed: the playthrough runs on Normal.
- Reduced motion: the game has no camera shake or flash. `addCauldron` reads
  `settings.reduceMotion` (imported as `hubSettings`, since the scene has its own `settings`
  panel) and leaves the cauldron on its still frame instead of playing the `cauldron-boil` flicker.
- The game's Settings panel only shows the difficulty and frame rate ("Change these on the hub
  page") and has "New game". Settings are read once at page load.
- A change to what the difficulty scales updates the Apothecary row of the difficulty table in the
  root README.md and the Settings paragraph in this game's README.md.
- Shared settings live under the `hub-settings` key, not in `apothecary-save`; "New game" keeps
  them.

## Testing hooks

- The dev build sets `window.game`. The test reads the `Game` scene's `state`,
  `player.body.center` (feet), `pointerTarget`, `away` (null on a fresh game), `pallets[id].in/out` (each `Pallet`'s `item` and
  `count`), `recipes.visible` and `recipes.lines`, `customers` (id, x, y, `arrived`) and
  `cameras.main.worldView.x/y` (not `scrollX/Y`, which differ once `renderScale` zooms the
  camera). Several of these are private in TypeScript; renaming them breaks the
  test without a type error.
- Inputs: canvas clicks only (walking, the Recipes button at screen 219,22, a tap on the panel to
  close it). It
  watches the first customer walk in from `STREET`, and walks into the shop by the door routing.
  Its taps must not land on a garden sign or a shelf's price sign either, which take the tap like
  a priority sign. Day 1 has no blight, rival or plague, and every sign is Fair, so none of them
  changes the first round.
- It seeds `Math.random`, owns `page.clock`, makes `requestAnimationFrame` a 64ms timer and forces
  the canvas renderer. It starts with empty storage, so it expects a fresh state on Normal, with
  every priority left at "any"; its taps must not land on a priority sign, which takes the tap.
- Mirrored in `e2e/playthrough.spec.ts` (update together): every spot in its constants block
  (refiner, cauldron and counter markers, `LEAVE_SHOP`, `STREET`, `FIRST_CUSTOMER` =
  `customerPosition(0)`, the counter's drop outside the north door), `WALK_SPEED`,
  `POTION_PRICE`, the counter bonus in `potionPay` (it assumes one of each potion on the shelf, so
  no stock cut, and asserts it), grow times 24000/42000, the bed layout
  (`BESIDE_GARDENS`, `BETWEEN_GARDENS`, `WHEAT_CUT`, `MANDRAKE_CUT`: walking left along the line
  between the wheat field and the mandrake patch below it, the sickle's 72px reach from the
  doctor's middle takes the right-hand and middle beds of the rows either side, two wheat and two
  mandrakes), the first brew (both cauldron pallets empty, so Sleeping Tonic on the tie), the mixed
  pick-up (a flour and a seed first), the recipe
  line text and order (all six, learned or not), the recipes known from the start (Healing Draught
  and Sleeping Tonic: two flour and two seeds make one of each), the tip rules (`maxTip`, `TIP_SHARE`, `tipNow`), the fine window
  (`FINE_SHARE`, `FINE_BONUS`, `FINE`), the reputation numbers, `DAY_MS` and the first
  contract (`FIRST_CONTRACT`: 3 Sleeping Tonics for 20), carry capacity 4, the camera scrolling along the row, and which pallets
  each station shows (only what is available: wheat and mandrake in and flour and seeds out at
  the table, flour and seeds in and the two known potions out at the cauldron, and a shelf for
  each of the two potions known at the start).
- The first round takes the first brew out in its fine window: it waits for 75% of the brew, walks
  to the pick-up marker and expects the fine potion; the second brew finishes plain. Day 1 is
  mild, so the weather changes nothing in it, and it ends long before a market day.

## Making common changes

- Tune a number: edit the table in `src/game/items.ts` or `src/game/state.ts`; if it is a grow
  time, price, tip, carry size or recipe, update the matching expectation in the playthrough.
- Add a potion recipe: add the `PotionId`, an `ITEMS` entry, a `RECIPES` entry (order breaks ties),
  `POTION_PRICE`, its colour in `ITEM_COL` and a flask shape in `itemIcon` (`POTION_SHAPES`) in
  `src/art/paint.ts`, a cauldron out pallet position in `PALLETS` (one per potion, in `POTIONS`
  order), and either `KNOWN_RECIPES` or a place in `RESEARCH_ORDER` (raising the `research`
  upgrade's `max`), plus `NEEDS_NIGHTSHADE` if it does. Shelves and pixie lanes follow on their own.
  Update the recipe lines in the test.
- Add a plant: `PlantId`, `ITEMS`, `GROW_MS`, `REFINE` (and its refined item), plant art in
  `src/art/garden.ts` (`bakeGarden` and `plantTexture`), item art in `itemIcon`, gardens appended
  to `GARDENS` and `GARDEN_LINE` plus `GARDEN_AREAS` and `gardenBuilt`, new in and out pallet spots
  for the tables and cauldrons in `PALLETS` (`acrossBelt`), and a feeder run in each garden belt's
  `BELT_PATHS` with the plant in `GARDEN_RUNS` (runs follow that list). New plots append, so old
  saves keep working.
- Add a potion: also give it a `FineId` in `FINE` and `ITEMS` (kind `fine`); `itemIcon` draws a
  fine potion as its plain one with a sparkle.
- Add an upgrade: an `UpgradeId` and `UPGRADES` entry, add it to `DOCTOR_UPGRADES` or
  `GUILD_UPGRADES` (the guild also needs a spot in `GUILD` in layout), an icon in `UPGRADE_ICONS`
  and `ICONS` in `src/art/markers.ts` (and in `upgradeIcon` if it isn't its id), give it a row in
  `UNLOCKED_BY` unless it is for sale from the start, and apply its level in a helper in
  `src/game/state.ts` used by the sim or scene (the herbalist: `blightImmune`).
- Add a plague stage: a row in `PLAGUE_STAGES` (name, potion or null for any, need); the card and
  the counting follow. The Panacea's recipe is `PANACEA_RECIPE` in `src/game/items.ts`; it is not
  in `RECIPES` or the Recipes panel, whose `lines` the test checks.
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
- Belt lanes do not mirror (heading east a belt's first lane is on its north side, heading west on
  its south), so `mirrorPallets` flips each pallet column around `LINE_Y` (`flipColumn`) to keep
  every kind at the end of its lane.
- `atCounter` lives only in the scene; `tick` called without it serves every customer at once.
- Garden belt build spots sit outside a maxed sickle's reach on purpose, so hands a new belt empties
  do not refill from the patch.
- Anything at `UI_DEPTH` or above is drawn by the unzoomed `uiCamera` at screen positions, so world
  objects must stay below it (`WORLD_UI_DEPTH` is the highest).
- `tick` runs before `movePlayer`, so `workingAt` uses last frame's feet position.
- Healing Draught art is red; keep any cross shapes off red (root rule on red crosses).
- `replantGarden` must change plots in place: `createPlots` keeps each plot object in a closure.
- New randomness in `tick` must stay behind a condition that is false on day 1 (like the blight's),
  or the playthrough's seeded orders change.
- `rival.open` starts true and `rival.day` 0, so the rival exists in every save; it only does
  anything from `RIVAL_DAY`. `rival.potion` is null until then and once closed.
- Fine potions are not in `POTIONS`, so they have no pallets, shelves, belt lanes or orders of their
  own. Anything that counts potions on the shelf or in hands goes through `plainOf` (`hasRoom`,
  `startBrew`, `canFill`, stock cuts, the shelves).
- Belt lanes each run at half the belt's speed (`LANE_SHARE` in `runBelt`), however many there are.
- Lay out the top bar, panels and anything else on screen with `viewSize(this)` or `GAME_WIDTH`,
  never `this.scale.width`: with `renderScale` above 1 that is the canvas size, and the button
  lands off screen. `pointer.x/y` are canvas pixels too; go through `getWorldPoint`.
- Textures are painted at `res` times their logical size, `res` raised by `sharpRes` on big screens (the `RES` map in `paint.ts`, per key), so
  show them with `fit(image, scale)` rather than `setScale`, and give arcade bodies on them
  (`setSize`/`setOffset`, in texture pixels) sizes multiplied by `resOf(key)`.
- `cardTexture` keys cards by kind and size; a card of a new size paints a new texture, so build
  cards once rather than every frame. The away chip widens to the left to fit its text.
