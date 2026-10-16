# Wyrmrail: guide for agents

How Wyrmrail is built and where it stands today, for agents changing it. `README.md` covers how to
play and lists the villages and upgrades. Keep this file up to date with any change to the game, as
the root `AGENTS.md` asks.

## Current state

Wyrmrail is a small railway builder drawn in isometric low-poly. The player lays track on a 12x7
grid from the wyrm's Roost to villages, and sends the wyrm (a dragon pulling two wagons) along it to
carry orders between villages before their time runs out.

- **Implemented:** a new valley every game (`generateValley` in `src/game/map.ts`: a winding
  river, mountains in the east, scattered forest, places for the villages after the first two) of
  grass, forest, river and mountain tiles; laying track by tap or drag next to the line, priced by
  terrain; taking track up for half its cost (Remove track toggle); switches on junctions (track
  with three or four arms), set against one arm and thrown by a tap; routes that follow the
  switches (WR1: a strict BFS that never uses a barred arm, replanned on every tile, falling back
  to the shortest way with a `SWITCH_MS` stop at each junction set against it), drawn as a dotted
  line; up to three orders at once, each with pay and a deadline; the wyrm carrying up to
  `WAGONS` (2) orders, heading for the nearest stop (a drop, or a pickup while a wagon is free);
  the wyrm's belly (WR2), emptied per tile and refilled by a meal at the Roost; workshops (WR3)
  that turn delivered goods into a better order; a second, copper wyrm from round 5 (WR4) that
  shares track and orders and waits at junctions; three hearts lost to late orders, and a game
  over panel whose button restarts the scene; rounds with a delivery goal, a new village joining
  in each round from 2 to 8, then the festival (WR5) at the last village, whose goal wins the
  game; three upgrades (Swift wings, Golden hoard, Second wyrm); village moods (WR6) from round
  2, cheered by deliveries in time and soured by late orders and long gaps, shaping the orders a
  village sends and costing a heart at rock bottom; washouts and rockfalls (WR7) from round 3,
  warned and then taking a bridge's or a mountainside tile's track; plain track and crossings
  (WR8), a Plain toggle that lays track joined only to the piece it continues, and crossings
  without a junction; round charters (WR9) from round 3, one of two picked at each round's start
  while the game waits; passengers (WR10) from round 3, a rare order paying triple on a short
  deadline that fills both wagons.
- **Progression** is only within a game: coins, track, upgrades and the round. There is no meta
  progression.
- **Persistence:** none. The game writes nothing to browser storage; a reload starts a new game.
  It only reads the hub's shared settings (see Hub settings below).
- **Rough edges you can see in the code:**
  - Auto-join (the default) joins every neighbour; the Plain toggle is the way round the junctions
    it makes, but a cut can't be joined later except by taking the track up and laying it again.
  - A crossing is only a crossing while it has four arms; with fewer it becomes a junction.
  - Two wyrms on the same plain track pass through each other; only junctions are shared out.
  - A hungry wyrm only turns home when it picks its next stop, so a long trip can still empty it.
  - The order cards and the upgrade buttons stay tappable behind the game over and festival
    panels (the sim refuses the actions once `phase` is not `play`).

## Architecture

File map (all under `src/` unless it starts with `shared/`):

- `main.ts`: creates the `Phaser.Game` (960x540 from `VIEW`, `Scale.FIT`, `pixelArt: false`) with
  `BootScene` then `GameScene`, calls `setupGame(game)` and `setupScaling(game)` from
  `shared/scaling.ts`; in dev builds puts `game` on `window`.
- `game/map.ts`: `COLS`, `ROWS`, `Terrain`, `TRACK_COST`, `Cargo` (goods and `passengers`),
  `CARGO_NAMES`, `Tile`, `Village`, `Valley`, `ROOST`, `VILLAGE_NAMES`, `WORKSHOPS`,
  `generateValley`, `terrainAt`, and the tile helpers `key`, `sameTile`, `manhattan`, `opposite`,
  `inGrid`, `neighbours`.
- `game/state.ts`: tuning constants (including `WAGONS`, `SWITCH_MS`, the belly's `FOOD_PER_TILE`,
  `HUNGRY`, `EAT_MS`, `STARVING_SLOWDOWN`, `JUNCTION_WAIT_MS`, `WORKSHOP_PAY`, `WORKSHOP_CHANCE`,
  `SECOND_WYRM_ROUND`, `FESTIVAL_ROUND`, `FESTIVAL_GOAL`, the moods' `MOOD_ROUND`, `MOOD_MAX`,
  `MOOD_GAP_MS`, `MOOD_GAP_PER_VILLAGE_MS`, `MOOD_PAY`, `MOOD_RUSH`, the hazards' `HAZARD_ROUND`,
  `HAZARD_EVERY_MS`, `HAZARD_WARN_MS`, `CHARTER_ROUND`, the passengers' `PASSENGER_ROUND`,
  `PASSENGER_CHANCE`, `PASSENGER_PAY`, `PASSENGER_TIME`), the charter table `CHARTERS`,
  `roundGoal`, `isPassengers`, `Charter`, `Hazard`, `Order`, `OrderStatus`, `Job`, `Wyrm`, `Pop`,
  `Upgrade`, `GameState`.
- `game/sim.ts`: all rules. `newGame`, `villages`, `openVillages`, `festivalHost`, `workshopOf`,
  `trackCost`, `canBuild`, `buildTrack` (joined or plain), `isCut`, `isCrossing`, `arms`,
  `canRemove`, `removeTrack`, `throwSwitch`, `route`, `routable`, `dispatch`, `upgradeLocked`,
  `upgradeCost`, `buyUpgrade`, `wyrmSpeed`, `orderPay` (pay with the Golden hoard, shown on the
  cards and paid on delivery), `jobOrder`, `pickCharter`, `moodOf`, `tick`. No Phaser import.
- `scenes/BootScene.ts`: bakes the props and sprites (`bakeProps`, `bakeSprites`), then starts
  `Game`.
- `scenes/GameScene.ts`: bakes this game's `valley` texture (`bakeValley`), draws the valley, the
  props (pines, peaks, Roost, villages, workshop signs, festival bunting), track, switches and
  crossing plates, build hints, the hazard's mark, each wyrm's planned route, cargo markers, the
  villages' mood faces, the wyrms (`WyrmView` each), pops, HUD (with the bellies and the round's
  charter), the orders and upgrades panel (with the Remove and Plain toggles), the banner, the
  charter cards and the game over or festival panel, and wires input to sim functions. Exposes
  `state` and `orderSpots`.
- `scenes/layout.ts`: `VIEW`, `BOARD`, the isometric projection (`ISO`, `iso`, `tileCenter`,
  `tileAt`, `groundDepth`), the panel, order card, button and charter card positions,
  `SEGMENT_GAPS` (where the wyrm's parts ride behind the head) and depths.
- `ui/Button.ts`: `makeButton`, a wooden button with `setCaption`, `setLit` and `setEnabled`.
- `art/palette.ts`: colour constants for the track, the UI and the pixel icons.
- `art/canvas.ts`: `bakeCanvas` (paints a 2D canvas `sharpRes` times the shown size and adds it
  as a texture), `fit` (sizes an image to its texture's shown size) and shape helpers
  (`poly`, `line`, `shadow`, `sphere`, `ellipse`, `mix`, `css`).
- `art/pixelArt.ts`: `bakePixelArt`, `PixelCanvas` (baked through `bakeCanvas`) and the `seeded`
  generator for art noise (a copy of Catacomb's; games don't share code). Only the icons are pixel
  art now.
- `art/valley.ts`: `bakeValley` (the `valley` texture for a `Valley`: sky, the valley's shadow
  and every tile as a block, river tiles `RIVER_DROP` lower) and `bakeProps`, the props, each the
  size of `PROP` with the tile's middle at (`PROP.x`, `PROP.y`): `forest`, `peak`, `roost`,
  `village-<name>` (roofs in `ROOFS`) and `bunting`.
- `art/sprites.ts`: the wyrm in the isometric style, `wyrm-head`, `wyrm-coil-0` to `-2`,
  `wyrm-wings`, the copper second wyrm's `wyrm2-*` (the same drawing through `toCopper`),
  `wagon-u` and `wagon-v` (lengthwise along the columns or the rows), each `PART` sized with its
  ground point at `PART_ORIGIN`; and the pixel icons `cargo-<cargo>` (`cargo-passengers` among
  them), `coin`, `heart`, `heart-empty`, `food`.
- `shared/settings.ts` and `shared/setupGame.ts` (repo root, shared by every game): the hub's
  settings, `byDifficulty` and `setupGame`. `sim.ts` imports `byDifficulty`, `GameScene.ts`
  imports `settings`.

How it runs:

- **Boot:** all art is drawn in code and baked to textures in `BootScene.create`; there are no
  asset files. `GameScene.create` calls `newGame` (which generates the valley), bakes the
  `valley` texture for it and creates every object once; the second wyrm's objects are created
  when it is bought.
- **Time:** `GameScene.update(time)` computes `dt` from the frame timestamp, clamped to
  `MAX_STEP_MS` (250), and calls `tick(state, dt)`. `tick` ages pops and the banner, then does
  nothing more while `charterOffer` is set (the game waits for the pick); otherwise it spawns an
  order every `ORDER_EVERY_MS` (faster under a `Busy season` charter) while there are fewer than
  `MAX_ORDERS`, counts deadlines down (failing late orders, and stopping as soon as the last
  heart is gone), ages the villages' waits (`tickMoods`), runs the hazard (`tickHazard`), and moves each wyrm
  (`moveWyrm`: a switch stop, loading, eating, picking the next stop with `nextStop` once it
  stands on a tile, advancing `progress` by `wyrmSpeed` tiles a second, on each new tile spending
  food and replanning with `planRoute`, stopping on a junction whose switch is set against its
  move, waiting before a junction the other wyrm holds (`waitForOther`), `arrive`).
- **Routes:** `route(s, a, b, from, strict)` is a BFS over (tile, came-from) pairs along `arms`
  (neighbours on the line that are not cut): it goes straight over a crossing (any way from one it
  starts on), and only turns back at a station, a dead end or where it starts. Loose, it is the
  shortest such way. Strict, it also never moves in or out of a junction by its barred arm.
  `planRoute` takes the strict way if there is one, else the loose way (the wyrm then stops to
  throw switches). `routable` and `dispatch` use loose routes, since the wyrm can always throw
  switches itself.
- **Screens:** `setupScaling` draws the canvas at the screen's resolution (`renderScale` canvas
  pixels per game pixel) and zooms the camera, which never scrolls, to match. Every texture is
  baked at `sharpRes` through `bakeCanvas`, so every image showing one is sized with `fit` (a scale
  of its own goes through `fit` too, like the wings' flap and the small cargo icons).
- **Input:** a scene-wide `pointerdown` (and `pointermove` while held) on the board finds the
  tile under `pointer.worldX/Y` with `tileAt` and calls `buildTrack` (plain while the Plain toggle
  is on, continuing from `lastLaid`, the tile track was last laid on), or `removeTrack` while
  Remove is on; a `pointerdown` on a junction calls `throwSwitch` instead. Dragging acts once per
  new tile. Order cards call `dispatch`; the upgrade buttons `buyUpgrade`; the charter cards
  `pickCharter`; Remove and Plain set the scene's `mode` (`auto`, `plain` or `remove`), which
  lives in the scene, not the state. Sim functions check the phase and return false when the
  action is not allowed.
- **Rendering:** the valley is one image, baked for each game; props are images sorted with the wyrm by
  `groundDepth` (screen y of the point they stand on), village cottages a little behind their
  tile so the wyrm passes in front. Pines on a tile with track are hidden. The rails are redrawn
  only when the track, the switches or the round change (`trackKey`), as half rails from each
  tile's middle towards its arms (the sim's `arms`, so a cut draws no rail) in passes (ballast or
  bridge deck, sleepers, rails, then the switches: a striped barrier across the barred arm, dimmed
  rails on it and a lever, and a plate on each crossing); the hazard's tile has an orange bed. The
  build hints (diamonds, blue in plain mode) and the hazard's diamond are drawn every frame, the
  mood faces when `moodKey` (round and moods) changes, the charter cards when `charterKey` changes. Order cards are rebuilt when `cardKey` (hoard rank, ids, statuses,
  routability, wyrm count) changes; their time bars are redrawn every frame. Each wyrm's path is
  drawn as dots on the hints layer with a ring on its stop (`WYRM_COLORS`). A wyrm's head is
  placed between `at` and `path[0]`; the three coils and two wagons follow a trail of the
  head's past screen positions, one point per pixel, at `SEGMENT_GAPS`. A wagon shows `wagon-u`
  or `wagon-v` by the way the trail runs under it, and carries the icon of an order that wyrm
  has loaded.
  The head is drawn in profile facing right; it is flipped to face left while the wyrm moves left
  across the screen.

State model (`src/game/state.ts`):

- `GameState` is plain data: `phase` (`play`, `over` or `won`), `valley` (`terrain` rows and
  `villages` with their places), `coins`, `hearts`, `round`, `delivered` (this round),
  `totalDelivered`, `track` ("c,r" keys), `orders`, `queue` (sent order ids no wyrm has set off to
  fetch yet), `switches` (junction key to the key of the arm its switch is set against), `cuts`
  ("c,r|c,r" pairs of neighbouring line tiles not joined, lower key first), `crossings` (tile
  keys), `moods` and `idleMs` (by village index), `hazard` and `hazardTimerMs`, `charter` and
  `charterOffer`, `wyrms`, `upgrades` (`wings`, `hoard`, `second`), `orderTimerMs`, `banner`,
  `pops`, `nextId`.
- `Order.from` and `.to` index into `valley.villages`. `Order.status` runs `waiting` -> `queued`
  (sent; a wyrm is on its way or will be) -> `loading` -> `carrying` -> removed on delivery. A
  late order is removed in any status. `Order.wyrm` is the index of the wyrm that set off for it
  (null before); `Order.made` marks a workshop's goods.
- `Wyrm` has `at` (last tile), `from` (the tile before it, for switches), `path` (tiles still to
  cross), `progress` (0-1 towards `path[0]`), `job` (the stop it is heading for: order id and
  `pickup` or `drop` leg, or `feed`), `loadMs`, `switchMs`, `food` (0-1), `eatMs` and `waitMs`.
  A wyrm's loaded orders are the ones with status `carrying` and `Order.wyrm` set to its index; there are
  never more than `WAGONS`.
- A switch is kept for every track tile with three or more arms that is not a crossing
  (`syncSwitches`, after building, removing, a hazard and a new round; it first drops cuts whose
  tiles left the line and crossings with fewer than four arms). A loose route's move into or out
  of a junction by the barred arm stops the wyrm there for `SWITCH_MS`, then it sets the switch
  against an arm the move doesn't use.
- Plain track: `buildTrack(s, t, true, from)` joins `t` only to `from` (when that is a neighbour
  on the line, else its first) and the tile `opposite` it, adding a cut to every other neighbour
  on the line; with four neighbours on the line it adds `t` to `crossings` instead and joins all
  four. `arms` leaves cut neighbours out, so every rule and drawing follows it.
- Moods (from `MOOD_ROUND`): `cheer(s, v, by)` moves a village's mood within `±MOOD_MAX`; at
  `-MOOD_MAX` the village costs a heart and is set to `1 - MOOD_MAX`. A delivery cheers `o.to`
  by one; `failOrder` sours `o.to` by one; `tickMoods` sours a village whose `idleMs` passes
  `MOOD_GAP_MS + MOOD_GAP_PER_VILLAGE_MS * open villages` (a pickup or a delivery resets it, and a
  village's joining the line). `addOrder` reads `moodOf(s, from)`: pay times `MOOD_PAY[mood]`
  above zero, time times `MOOD_RUSH` below.
- Hazards (from `HAZARD_ROUND`): every `HAZARD_EVERY_MS` `tickHazard` picks a track tile that is a
  bridge (washout) or beside a mountain (rockfall), if any, and sets `hazard` with
  `HAZARD_WARN_MS`. `strikeHazard` waits while a wyrm is on the tile or moving onto it, then takes
  the track (no refund), cuts each wyrm's `path` short of it and drops its job (`dropJob`: a
  pickup goes back to the front of the queue, cargo stays aboard). Removing the tile first cancels
  the hazard.
- Charters (from `CHARTER_ROUND`): `nextRound` clears `charter` and sets `charterOffer` to two
  distinct entries of `CHARTERS` (`offerCharters`; a `cargo` charter gets a cargo an open village
  sends and its `%c` filled in). `pickCharter` sets `charter`. It scales `addOrder`'s pay
  (`charterPay`, only its cargo when it has one) and time, `trackCost` (`track`), the order timer
  (`orders`) and the belly (`fed`).
- Passengers (from `PASSENGER_ROUND`): `randomOrder` makes an order passengers with
  `PASSENGER_CHANCE`; `addOrder` pays `PASSENGER_PAY` times and allows `PASSENGER_TIME` of the
  time. `nextStop` only fetches passengers for an empty wyrm and fetches nothing while a wyrm
  carries them. Workshops never take them.
- Feeding: each tile crossed costs `FOOD_PER_TILE`; at `HUNGRY` or below, `nextStop` sends the
  wyrm to the Roost (`feed` job), where it eats `EAT_MS` and is full again. At 0 it flies at
  `STARVING_SLOWDOWN` speed.
- Workshops (`WORKSHOPS`, by village name): delivering the cargo a workshop `takes` to it adds a
  `made` order of what it `makes`, from it to another open village (the host in the festival),
  paying `WORKSHOP_PAY` times the usual, unless the board already has more than `MAX_ORDERS`.
  `randomOrder` sends cargo a workshop takes to it with `WORKSHOP_CHANCE`.
- The festival: `FESTIVAL_ROUND` (9) follows round 8. Every new order goes to `festivalHost`
  (the last village) and `roundGoal` is `FESTIVAL_GOAL`; meeting it sets `phase` to `won`.
- Only `src/game/sim.ts` mutates state. The scene only reads it and calls sim functions.
- Invariants: a station (the Roost or an open village) is on the line without track; track can't
  be laid on a station or a locked village's tile; track can't be removed from `wyrm.at` or any
  tile in any wyrm's `path`; a new stop is only picked while a wyrm's `path` is empty and it is
  not loading or eating; `nextId` is shared by orders and pops; `valley.villages[0]` and `[1]`
  are Millbrook (4,1) and Ashford (4,5), and columns 2-4 of rows 1-5 are always grass.

Randomness and timing:

- `Math.random` is used in `generateValley` (the valley, in `newGame`), `randomOrder` (which
  villages a new order joins, and whether it is passengers), `makeGoods` (where a workshop's goods
  go), `tickHazard` (which tile) and `offerCharters` (which two, and the cargo) in `src/game/`. The
  first order is fixed (`addOrder(s, 0, 1)` in `newGame`). The test seeds `Math.random`, so its
  valley is the same every run.
- Art noise uses `seeded` from `src/art/pixelArt.ts`, not `Math.random`.
- All timing is game time from `tick`; there is no `Date.now`, `setTimeout`, tween or Phaser timer
  in the rules. The wing flap and the late-order blink read `this.time.now` for looks only.

Data tables (where to tune):

- Terrain and the map: `generateValley` (river, mountain and forest counts, village spacing),
  `ROOST`, `VILLAGE_LIST` (each village's cargo and round, and the fixed places of the first two)
  and `WORKSHOPS` in `src/game/map.ts`; track prices in `TRACK_COST`.
- Coins, hearts, order count and rate, pay and deadline formulas, load time, speed, the belly,
  junction waits, workshop pay, upgrade effects and prices, the second wyrm's round, the moods,
  the hazards, the charters (`CHARTERS`), the passengers, the festival and `roundGoal`:
  `src/game/state.ts`.
- Screen positions and the isometric projection: `src/scenes/layout.ts`. Wyrm and wagon size:
  `SCALE` and `PART` in `src/art/sprites.ts`.

### Hub settings

- `src/main.ts` calls `setupGame(game)` from `shared/setupGame.ts`, which applies the frame cap, the FPS readout, reduced motion (camera shake and flash, which the game doesn't use) and full screen.
- Difficulty scales one number: each order's time. `addOrder` in `src/game/sim.ts` multiplies it
  by `byDifficulty(1.5, 1, 0.7)`, so Easy 1.5x, Normal 1x, Hard 0.7x.
- `settings.reduceMotion` holds the wyrm's wings still and stops the blink of an order's time bar
  when it is nearly out, in `GameScene`.
- Keep Normal exactly as designed (multiplier 1): the playthrough runs on Normal.
- Keep the Wyrmrail row of the difficulty table in the root `README.md` (and the difficulty line in
  this game's `README.md`) in sync with the multipliers.

## Testing hooks

- `src/main.ts` sets `window.game` in dev builds only. The test reads `game.scene.getScene('Game')`
  and its `state` and `orderSpots` (`OrderSpot` list: order id and the card's centre). It never
  writes state.
- Inputs it drives: taps on order card 1 (before and after laying track), taps on the five track
  tiles (2,3), (3,3), (4,3), (4,2) and (4,4), a tap on (0,6), away from the line, and taps on the
  junction (4,3) while the grain loads, until its switch is set against (3,3).
- Numbers mirrored in `e2e/playthrough.spec.ts` that must change with the game: `ISO` (288, 84,
  76x38 tiles) and the tile centre formula, `ROOST` (1,3), Millbrook (4,1) and Ashford (4,5) as `valley.villages[0]` and `[1]`,
  `START_COINS` (40), the grass track cost (2), three hearts, the first order (id 1, grain,
  Millbrook to Ashford, pay 22) and `roundGoal(1)` being 1. The five tiles must stay grass (they
  are inside the always-grass block of `generateValley`) and (0,6) must stay out of reach of the
  line. The first round's eight tiles must not make the wyrm hungry. The new junction's switch must be set against the
  branch just laid (`{ '4,3': '4,4' }`), and a tap must set it against the next arm in
  `neighbours` order. The test also expects the wyrm to reach Millbrook within 6s of game time
  and Ashford within 6s more without a switch stop.
- Field names the test reads: `phase`, `coins`, `hearts`, `round`, `delivered`, `totalDelivered`,
  `track`, `queue`, `switches`, `orders` (`id`, `cargo`, `from`, `to`, `pay`, `status`) and
  `wyrms[0]` (`at`, `job`, `switchMs`).
- Screenshots are saved as `playthrough-0-valley` through `playthrough-3-delivered` in
  `docs/screenshots/`; refresh them when the look of the first round changes. `round-2.png`,
  `remove-track.png`, `game-over.png`, `new-valley-1.png`, `new-valley-2.png`, `steering.png`,
  `workshops-two-wyrms.png`, `festival.png`, `festival-won.png`, `moods.png`, `washout.png`,
  `plain-track.png`, `charter.png`, `passengers.png` and `cover.png` are not made by
  the test: play the dev build and capture them by hand (a script can set up later rounds through
  the dev server's `/games/wyrmrail/src/game/sim.ts` module, the same instance the game uses).
- Moods, hazards, charters and passengers all start after round 1 (`MOOD_ROUND` 2, the rest 3),
  so the playthrough never meets them; keep them there or give the test a step for them.

## Making common changes

- **Add a village:** add an entry to `VILLAGE_LIST` in `src/game/map.ts` with its `round` (no
  place: `generateValley` finds one; more villages may need a smaller spacing), and give it roof
  colours in `ROOFS` in `src/art/valley.ts` (the texture is `village-<name>`). The last village is
  the festival's host. A new cargo needs a `Cargo` member, a `CARGO_NAMES` entry and an icon in
  `CARGO_ICONS` (typed by `Cargo`, so the build fails until you do). Update the README's village
  table. Keep the first two as Millbrook and Ashford at their places or update the test.
- **Add a workshop:** add the village's name to `WORKSHOPS` with what it `takes` and `makes`
  (a new cargo as above), and its row in the README's village table.
- **Change the valley:** edit `generateValley`; keep the first round's block (`isHome`) grass and
  every village reachable (it retries until they are).
- **Add a terrain:** extend `Terrain` and `TERRAIN_OF`, give it a price in `TRACK_COST` (or block
  it in `trackCost` like mountains), place it in `generateValley`, paint its block in `block` in
  `src/art/valley.ts` (and a prop
  if it has one, placed in `GameScene.createScenery`) and, if track looks different on it, handle
  it in `GameScene.drawTrack` (like `bridge`).
- **Change the view's angle or size:** `ISO` in `src/scenes/layout.ts` (and in the test). Keep
  the whole diamond inside `BOARD`, clear of the panel.
- **Add an upgrade:** add its prices to `UPGRADE_COSTS` and a level to `upgrades` in `newGame`,
  apply it where it matters in `sim.ts`, and add a button in `GameScene.createPanel` and its
  caption in `drawPanel` (and a `BUTTONS` row in layout).
- **Add a charter:** add an entry to `CHARTERS` in `src/game/state.ts` (a new effect needs a field
  on `Charter` and a check where it applies in `sim.ts`) and its line in the README.

## Gotchas

- `pointer.x/y` and `this.scale` are canvas pixels, `renderScale` times the 960x540 view: read
  pointers through `worldX/Y`, and show a new texture with `fit(this.add.image(...))` or it is
  drawn `renderScale` times too big. `e2e/screens.spec.ts` at the root opens the game on five
  screens.

- `ISO` and the tile centre are copied into the test; moving the grid breaks the taps silently
  (the wait then times out or the track check fails).
- `tileAt` ignores the river's lower floor and the props' height: a tap counts for the tile whose
  floor diamond is under it, so a tap on a tall peak or pine may land on the tile behind.
- `orderSpots` is refreshed only when the cards are rebuilt (`cardKey`), which happens whenever an
  order is added, removed or changes status.
- Phaser's scene-wide `pointerdown` also fires for taps on the panel; `onGridPointer` ignores taps
  outside `BOARD`, so keep the panel outside it.
- A late order the wyrm is carrying is dropped where it is: the wyrm finishes the tile it is on and
  waits there for the next order. A hazard that cuts a wyrm's way does the same, but its cargo
  stays aboard.
- `arrive` doesn't check where the wyrm is, so anything that empties a `path` must also clear the
  `job` (as `failOrder`, `strikeHazard` and `dropJob` do).
- `scene.restart()` reruns `create`, which resets the game and bakes a new `valley` texture, but
  `lastFrame` carries over.
- `tileCenter` positions of villages change every game; anything placed by a village (labels,
  workshop signs, bunting) is created in `create` from `state.valley`.
- Never use a red cross in any art (root `AGENTS.md`). The hearts are red hearts, not crosses.
