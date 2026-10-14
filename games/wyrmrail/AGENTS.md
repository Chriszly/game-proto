# Wyrmrail: guide for agents

How Wyrmrail is built and where it stands today, for agents changing it. `README.md` covers how to
play and lists the villages and upgrades. Keep this file up to date with any change to the game, as
the root `AGENTS.md` asks.

## Current state

Wyrmrail is a small railway builder drawn in isometric low-poly. The player lays track on a 12x7
grid from the wyrm's Roost to villages, and sends the wyrm (a dragon pulling two wagons) along it to
carry orders between villages before their time runs out.

- **Implemented:** one hand-made valley (`TERRAIN_ROWS` in `src/game/map.ts`) of grass, forest,
  river and mountain tiles; laying track by tap or drag next to the line, priced by terrain;
  taking track up for half its cost (Remove track toggle); shortest routes along the line (BFS);
  switches on junctions (track with three or four arms), set against one arm, thrown by a tap or
  by the wyrm stopping `SWITCH_MS`; up to three orders at once, each with pay and a deadline; the
  wyrm carrying up to `WAGONS` (2) orders, always heading for the nearest stop (a drop, or a
  pickup while a wagon is free); three hearts lost to late orders, and a game over panel whose
  button restarts the scene; rounds with a delivery goal, a new village joining in each round from
  2 to 8; two upgrades (Swift wings, Golden hoard).
- **Progression** is only within a game: coins, track, upgrades and the round. There is no meta
  progression.
- **Persistence:** none. The game writes nothing to browser storage; a reload starts a new game.
  It only reads the hub's shared settings (see Hub settings below).
- **Rough edges you can see in the code:**
  - There is one wyrm. Track auto-joins every neighbour; switches only cost time, they never
    change the route (routes are still the shortest way, BFS).
  - After the last village (round 8) the rounds go on with rising goals but nothing new.
  - The order cards and the upgrade buttons stay tappable behind the game over panel (the sim
    refuses the actions once `phase` is `over`).

## Architecture

File map (all under `src/` unless it starts with `shared/`):

- `main.ts`: creates the `Phaser.Game` (960x540 from `VIEW`, `Scale.FIT`, `pixelArt: false`) with
  `BootScene` then `GameScene`, calls `setupGame(game)`; in dev builds puts `game` on `window`.
- `game/map.ts`: `COLS`, `ROWS`, `Terrain`, `terrainAt`, `TRACK_COST`, `Cargo`, `CARGO_NAMES`,
  `Tile`, `Village`, `ROOST`, `VILLAGES`, and the tile helpers `key`, `sameTile`, `manhattan`,
  `inGrid`, `neighbours`.
- `game/state.ts`: tuning constants (including `WAGONS` and `SWITCH_MS`), `roundGoal`, `Order`,
  `OrderStatus`, `Wyrm`, `Pop`, `Upgrade`, `GameState`.
- `game/sim.ts`: all rules. `newGame`, `openVillages`, `trackCost`, `canBuild`, `buildTrack`,
  `canRemove`, `removeTrack`, `throwSwitch`, `route`, `routable`, `dispatch`, `upgradeCost`, `buyUpgrade`,
  `wyrmSpeed`, `orderPay` (pay with the Golden hoard, shown on the cards and paid on delivery),
  `tick`. No Phaser import.
- `scenes/BootScene.ts`: bakes every texture (`bakeValley`, `bakeSprites`), then starts `Game`.
- `scenes/GameScene.ts`: draws the valley, the props (pines, peaks, Roost, villages), track,
  switches, build hints, cargo markers, the wyrm, pops, HUD, the orders and upgrades panel, the
  banner and the game over panel, and wires input to sim functions. Exposes `state` and
  `orderSpots`.
- `scenes/layout.ts`: `VIEW`, `BOARD`, the isometric projection (`ISO`, `iso`, `tileCenter`,
  `tileAt`, `groundDepth`), the panel, order card and button positions, `SEGMENT_GAPS` (where the
  wyrm's parts ride behind the head) and depths.
- `ui/Button.ts`: `makeButton`, a wooden button with `setCaption`, `setLit` and `setEnabled`.
- `art/palette.ts`: colour constants for the track, the UI and the pixel icons.
- `art/canvas.ts`: `bakeCanvas` (paints a 2D canvas and adds it as a texture) and shape helpers
  (`poly`, `line`, `shadow`, `sphere`, `ellipse`, `mix`, `css`).
- `art/pixelArt.ts`: `bakePixelArt`, `PixelCanvas` and the `seeded` generator for art noise (a copy
  of Catacomb's; games don't share code). Only the icons are pixel art now.
- `art/valley.ts`: the `valley` texture (sky, the valley's shadow and every tile as a block, river
  tiles `RIVER_DROP` lower), and the props, each the size of `PROP` with the tile's middle at
  (`PROP.x`, `PROP.y`): `forest`, `peak`, `roost` and `village-<name>` (roofs in `ROOFS`).
- `art/sprites.ts`: the wyrm in the isometric style, `wyrm-head`, `wyrm-coil-0` to `-2`,
  `wyrm-wings`, `wagon-u` and `wagon-v` (lengthwise along the columns or the rows), each `PART`
  sized with its ground point at `PART_ORIGIN`; and the pixel icons `cargo-<cargo>`, `coin`,
  `heart`, `heart-empty`.
- `shared/settings.ts` and `shared/setupGame.ts` (repo root, shared by every game): the hub's
  settings, `byDifficulty` and `setupGame`. `sim.ts` imports `byDifficulty`, `GameScene.ts`
  imports `settings`.

How it runs:

- **Boot:** all art is drawn in code and baked to textures in `BootScene.create`; there are no
  asset files. `GameScene.create` calls `newGame` and creates every object once.
- **Time:** `GameScene.update(time)` computes `dt` from the frame timestamp, clamped to
  `MAX_STEP_MS` (250), and calls `tick(state, dt)`. `tick` ages pops and the banner, spawns an
  order every `ORDER_EVERY_MS` while there are fewer than `MAX_ORDERS`, counts deadlines down
  (failing late orders, and stopping as soon as the last heart is gone), and moves the wyrm
  (`moveWyrm`: a switch stop, loading, picking the next stop with `nextStop` once it stands on a
  tile, advancing `progress` by `wyrmSpeed` tiles a second, stopping on a junction whose switch is
  set against its move, `arrive`).
- **Input:** a scene-wide `pointerdown` (and `pointermove` while held) on the board finds the
  tile with `tileAt` and calls `buildTrack`, or `removeTrack` while `removeMode` is on; a
  `pointerdown` on a junction calls `throwSwitch` instead. Dragging acts once per new tile. Order
  cards call `dispatch`; the upgrade buttons `buyUpgrade`; Remove track flips `removeMode`, which
  lives in the scene, not the state. Sim functions check the phase and return false when the action
  is not allowed.
- **Rendering:** the valley is one image; props are images sorted with the wyrm by
  `groundDepth` (screen y of the point they stand on), village cottages a little behind their
  tile so the wyrm passes in front. Pines on a tile with track are hidden. The rails are redrawn
  only when the track, the switches or the round change (`trackKey`), as half rails from each
  tile's middle towards its arms in passes (ballast or bridge deck, sleepers, rails, then the
  switches: a striped barrier across the barred arm, dimmed rails on it and a lever); the build
  hints (diamonds) every frame. Order cards are rebuilt when `cardKey` (hoard rank, ids, statuses,
  routability) changes; their time bars are redrawn every frame. The wyrm's head is placed
  between `wyrm.at` and `wyrm.path[0]`; the three coils and two wagons follow a trail of the
  head's past screen positions, one point per pixel, at `SEGMENT_GAPS`. A wagon shows `wagon-u`
  or `wagon-v` by the way the trail runs under it, and carries the icon of a loaded order.

State model (`src/game/state.ts`):

- `GameState` is plain data: `phase` (`play` or `over`), `coins`, `hearts`, `round`, `delivered`
  (this round), `totalDelivered`, `track` ("c,r" keys), `orders`, `queue` (sent order ids the wyrm
  has not set off to fetch yet), `switches` (junction key to the key of the arm its switch is set
  against), `wyrm`, `upgrades`, `orderTimerMs`, `banner`, `pops`, `nextId`.
- `Order.status` runs `waiting` -> `queued` (sent; the wyrm is on its way or will be) -> `loading`
  -> `carrying` -> removed on delivery. A late order is removed in any status.
- `Wyrm` has `at` (last tile), `from` (the tile before it, for switches), `path` (tiles still to
  cross), `progress` (0-1 towards `path[0]`), `job` (the stop it is heading for: order id and
  `pickup` or `drop` leg), `loadMs` and `switchMs`. Loaded orders are the ones with status
  `carrying`; there are never more than `WAGONS`.
- A switch is kept for every track tile with three or more arms (`syncSwitches`, after building,
  removing and a new round). A move into or out of a junction by the barred arm stops the wyrm
  there for `SWITCH_MS`, then it sets the switch against an arm the move doesn't use.
- Only `src/game/sim.ts` mutates state. The scene only reads it and calls sim functions.
- Invariants: a station (the Roost or an open village) is on the line without track; track can't
  be laid on a station or a locked village's tile; track can't be removed from `wyrm.at` or any
  tile in `wyrm.path`; a new stop is only picked while `wyrm.path` is empty and nothing is
  loading; `nextId` is shared by orders and pops.

Randomness and timing:

- `Math.random` is used only in `randomOrder` in `src/game/sim.ts` (which villages a new order
  joins). The first order is fixed (`addOrder(s, 0, 1)` in `newGame`). The test seeds
  `Math.random`.
- Art noise uses `seeded` from `src/art/pixelArt.ts`, not `Math.random`.
- All timing is game time from `tick`; there is no `Date.now`, `setTimeout`, tween or Phaser timer
  in the rules. The wing flap and the late-order blink read `this.time.now` for looks only.

Data tables (where to tune):

- Terrain and the map: `TERRAIN_ROWS`, `ROOST` and `VILLAGES` (with each one's cargo and round) in
  `src/game/map.ts`; track prices in `TRACK_COST`.
- Coins, hearts, order count and rate, pay and deadline formulas, load time, speed, upgrade
  effects and prices, `roundGoal`: `src/game/state.ts`.
- Screen positions and the isometric projection: `src/scenes/layout.ts`. Wyrm and wagon size:
  `SCALE` and `PART` in `src/art/sprites.ts`.

### Hub settings

- `src/main.ts` calls `setupGame(game)` from `shared/setupGame.ts`, which applies the frame cap,
  the FPS readout and reduced motion for camera shake and flash (the game uses neither).
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
  76x38 tiles) and the tile centre formula, `ROOST` (1,3), Millbrook (4,1) and Ashford (4,5) as `VILLAGES[0]` and `[1]`,
  `START_COINS` (40), the grass track cost (2), three hearts, the first order (id 1, grain,
  Millbrook to Ashford, pay 22) and `roundGoal(1)` being 1. The five tiles must stay grass and
  (0,6) must stay out of reach of the line. The new junction's switch must be set against the
  branch just laid (`{ '4,3': '4,4' }`), and a tap must set it against the next arm in
  `neighbours` order. The test also expects the wyrm to reach Millbrook within 6s of game time
  and Ashford within 6s more without a switch stop.
- Field names the test reads: `phase`, `coins`, `hearts`, `round`, `delivered`, `totalDelivered`,
  `track`, `queue`, `switches`, `orders` (`id`, `cargo`, `from`, `to`, `pay`, `status`) and `wyrm`
  (`at`, `job`, `switchMs`).
- Screenshots are saved as `playthrough-0-valley` through `playthrough-3-delivered` in
  `docs/screenshots/`; refresh them when the look of the first round changes. `round-2.png`,
  `remove-track.png`, `game-over.png` and `cover.png` are not made by the test: play the dev build
  (round 2 with track over the river to Fernhollow) and capture them by hand.

## Making common changes

- **Add a village:** add an entry to `VILLAGES` in `src/game/map.ts` on a tile that is not a
  mountain, with its `round`, and give it roof colours in `ROOFS` in `src/art/valley.ts` (the
  texture is `village-<name>`). A new cargo needs a `Cargo` member, a `CARGO_NAMES` entry and an
  icon in `CARGO_ICONS` (typed by `Cargo`, so the build fails until you do). Update the README's
  village table. Keep `VILLAGES[0]` and `[1]` as Millbrook and Ashford or update the test.
- **Change the map:** edit `TERRAIN_ROWS`; keep 12 characters a row and 7 rows (or change `COLS`,
  `ROWS` and the panel layout). Keep the test's five tiles grass.
- **Add a terrain:** extend `Terrain` and `TERRAIN_OF`, give it a price in `TRACK_COST` (or block
  it in `trackCost` like mountains), paint its block in `block` in `src/art/valley.ts` (and a prop
  if it has one, placed in `GameScene.createScenery`) and, if track looks different on it, handle
  it in `GameScene.drawTrack` (like `bridge`).
- **Change the view's angle or size:** `ISO` in `src/scenes/layout.ts` (and in the test). Keep
  the whole diamond inside `BOARD`, clear of the panel.
- **Add an upgrade:** add its prices to `UPGRADE_COSTS` and a level to `upgrades` in `newGame`,
  apply it where it matters in `sim.ts`, and add a button in `GameScene.createPanel` and its
  caption in `drawPanel` (and a `BUTTONS` row in layout).

## Gotchas

- `ISO` and the tile centre are copied into the test; moving the grid breaks the taps silently
  (the wait then times out or the track check fails).
- `tileAt` ignores the river's lower floor and the props' height: a tap counts for the tile whose
  floor diamond is under it, so a tap on a tall peak or pine may land on the tile behind.
- `orderSpots` is refreshed only when the cards are rebuilt (`cardKey`), which happens whenever an
  order is added, removed or changes status.
- Phaser's scene-wide `pointerdown` also fires for taps on the panel; `onGridPointer` ignores taps
  outside `BOARD`, so keep the panel outside it.
- A late order the wyrm is carrying is dropped where it is: the wyrm finishes the tile it is on and
  waits there for the next order.
- `scene.restart()` reruns `create`, which resets the game, but `lastFrame` carries over.
- Never use a red cross in any art (root `AGENTS.md`). The hearts are red hearts, not crosses.
