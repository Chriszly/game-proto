# Broadside: guide for agents

This file explains how this game is built and where it stands, for agents about to change it.
`README.md` covers how to play, the captain's orders, the enemy ships and the upgrades. Keep this
file up to date with any change to the game, as the root `AGENTS.md` asks.

## Current state

A wave-based naval battle drawn as an old hand-tinted sea chart. The player's ship always sails
forward. The player steers with the helm (turn left, turn right, or let go) and fires each
broadside by hand: holding a side's fire control charges it, letting go fires it, and a longer
charge reaches further and hits harder. Each wave has one captain's order (a bonus for the wave).
Sunk enemies drop loot barrels, and gold buys upgrades at a harbor between waves.

- **Implemented:** endless waves (sloops from wave 1, brigs from wave 3, galleons from wave 5) with
  enemy hull scaling per wave. Hold-to-aim broadsides for the player (`aim` and `charge` in the
  state, `aimBroadsides` and `firePlayer` in `sim.ts`); enemy broadsides still fire on their own.
  Captain's orders (`src/game/orders.ts`): the first wave is always chain shot (`FIRST_ORDER`),
  later waves draw a different one from the last in `setSail`; the order changes the player's
  stats in `stats()`, the player's shot (`Ball.shot`), and with chain shot slows ships hit
  (`Ship.slowMs`). Enemy AI closes in, turns to bring a broadside to bear and bears away rather
  than ram; while closing in it plans a course round an island in the way (`Ship.detour`, drawn
  as a dotted line), and a lookout bears off any beach ahead and shortens sail to come about in
  time. Broadsides lead their target, and enemy aim has a random spread. Loot drifts toward the
  player and expires; when a wave's last enemy sinks, every barrel still afloat is hauled in at
  once. There is a harbor shop with five upgrades plus a paid repair, a game-over panel with "Sail
  again", and off-screen arrows pointing to enemies and loot. The sea wraps around at every edge
  like a globe: sailing off the north edge comes back in at the south, and off the west edge in at
  the east. Ships, balls and loot all wrap, and every distance and bearing takes the shortest way
  round. Islands have collision: any ship, player or enemy, that sails onto an island's beach is
  pushed off, glances away and takes `AGROUND_DAMAGE`.
- **Screens:** there is only `GameScene`. The wave banner, the captain's order card, the harbor
  panel and the game-over panel are overlays drawn on top of it. There is no title screen, pause
  or in-game settings; the shared settings (difficulty, frame cap, FPS readout, reduced motion)
  are set on the hub page.
- **Persistence:** only the best wave beaten is saved. Each run starts fresh at wave 1.
- **Rough or unused:** there is no sound. Enemy captains still run aground now and then (pushed by
  another ship or the player, or cornered at close range), far less often than before the
  steering: a long scripted fight of wave-6 fleets saw 3 groundings where plain chasing saw 41.
  Detours are planned round one island at a time (the nearest blocking one). There are no TODO
  comments in the code.

## Architecture

File map (all under `src/`, plus the shared files it imports):

- `main.ts`: creates the `Phaser.Game` (960x540, `Scale.FIT`, `pixelArt: false`, three active
  pointers for two-thumb play) with `BootScene` and `GameScene`, calls `setupGame(game)` and
  exposes `window.game` in dev builds.
- `scenes/BootScene.ts`: calls `bakeAll` and starts `Game`.
- `scenes/GameScene.ts`: owns the run's `state`, reads input (`readInput`), calls `tick` each
  frame and draws everything (HUD, order card, helm wheels and fire controls with their charge
  rings, wakes, detour courses, effects, firing arcs, harbor and game-over overlays).
- `scenes/layout.ts`: `VIEW`, `HUD_HEIGHT`, the `HELM` wheel centres, the `FIRE` control centres,
  `ORDER_CARD`, the `HARBOR` panel and row geometry, `BUTTON`, `UI_DEPTH` and `FONT` (a Georgia
  serif stack, no web fonts).
- `game/state.ts`: types, the world and timing constants (including `CHARGE_MS`, `REACH_MIN` and
  `CHARGE_DAMAGE`), the base `PLAYER` stats, `stats()` (the player's stats after upgrades and the
  wave's order), `reachOf`, `newShip`, `newRun`, `FIRST_ORDER`, `radiusOf` and `ISLANDS`, plus
  the wrapping helpers `wrapCoord`, `wrapPoint` and `offset` (the shortest `dx`, `dy` between two
  points on the sea).
- `game/orders.ts`: the `ORDERS` table (title, description, stat multipliers, `slow`, `pellets`
  and `pellet`, and the `shot` look), `ORDER_IDS`, `SLOW_MS`, `PELLET_FAN` and `drawOrder`.
- `game/sim.ts`: all rules. `tick` handles steering, spawning (never on an island), enemy AI
  (`sailEnemy`, with `planDetour`, `roundIsland`, `blocked`, `fend` and `shoalAhead`), separation,
  running aground on islands (`runAground`), the player's broadsides (`aimBroadsides`,
  `firePlayer`), enemy broadsides (`enemyBroadsides`), `fire`, balls (chain shot sets `slowMs`),
  sinking, loot (`haulIn`) and reaching the harbor. `detourCourse` and `speedOf` are exported for
  the scene. `buy`, `repair` and `setSail` are the harbor actions.
- `game/ships.ts`: the `ENEMIES` table (name, hp, radius, speed, turn, guns, damage, reload,
  range, loot). `name` labels a detour course.
- `game/upgrades.ts`: the `UPGRADES` table, `UPGRADE_IDS`, `costOf` and `REPAIR_COST`.
- `game/waves.ts`: `waveShips(wave)` (which ships come, in order) and `hpScale(wave)`.
- `game/save.ts`: `loadBestWave` and `saveBestWave`.
- `art/art.ts`: the chart style. `SHIP_LOOKS` (size, masts, guns, sail and pennant colours for
  each ship kind), `ROSES`, the ink and ochre colours, and the bake functions, which paint 2D
  canvases and add them with `textures.addCanvas`: `sea` (the whole 1920x1200 sea as one chart:
  parchment, rhumb lines, hatching, islands with names, soundings and the compass rose, drawn so
  it repeats seamlessly), `frame` (screen vignette and neatline), `ship-<kind>`, `shot-round`,
  `shot-chain`, `shot-grape`, `shot-powder`, `loot`, `helm-<side>[-held]`, `fire-<side>[-held]`,
  `seal-<order>`, `order-card`, `hud-bar`, `panel-harbor` and `panel-over`. Small textures are
  painted at `HI` (2x) and shown at `1 / HI` scale.
- `ui/Harbor.ts`: the harbor panel, a ledger on parchment. Its rows are built from `UPGRADE_IDS`
  plus `repair`, followed by a "Set sail" button. It also records each button's screen rectangle
  in `buttons`.
- `ui/Button.ts`: `makeButton`, a cream chart-label button ruled in ink.
- `ui/screen.ts`: `pinToScreen`, which sets scroll factor 0 on a container and every child.
- `shared/setupGame.ts` (imported by `main.ts`) and `shared/settings.ts` (`byDifficulty`, imported
  by `game/sim.ts`, and `settings`, read by `scenes/GameScene.ts` for reduce motion): the hub's
  settings, shared by every game. See "Hub settings" below.

How it runs:

- **Boot:** `BootScene.create` paints every texture (there are no asset files), then starts
  `GameScene`. `GameScene.create` builds a fresh `newRun(loadBestWave())`, the HUD, the order
  card, the controls, the `Harbor` and the game-over container. "Sail again" calls
  `scene.restart()`, which runs `create` again and clears the sprite maps and held pointers.
- **Time:** `GameScene.update(time)` computes `dt` from the frame timestamp, not from Phaser's
  smoothed delta, and clamps it to `MAX_STEP_MS` (250). It then calls `tick(state, dt)` once.
  The sim works in milliseconds. Speeds are in pixels per second and turn rates in radians per
  second.
- **Phases:** `GameState.phase` is one of `break` (wave banner for `BREAK_MS`; the player can sail
  but nothing spawns or fires, and `charge` is held at null), `fighting`, `harbor` or `over`.
  `tick` returns early in `harbor` and `over`, after ageing effects. The harbor opens once
  `toSpawn` and `enemies` are both empty; on that tick every barrel left in `loot` goes through
  `haulIn` (gold, `plundered` and a `coins` effect), `loot` is emptied and `charge`/`aim` reset.
  The game is over when the player's hp reaches 0 or below.
- **Input:** `readInput` sets `state.helm` to -1, 0 or 1 and `state.aim.port`/`.starboard` each
  frame. Keys win over the pointer for the helm (Left/A, Right/D); Q and E hold the port and
  starboard fire controls. Each pointer that presses a control is remembered in `held` (pointer
  id to control), and its own `pointerup` releases only that control (`gameout` releases all), so
  one thumb can steer while the other fires. A fire control pressed and released within one frame
  still counts as held for that frame (`tapped`), so a quick tap fires an uncharged broadside.
  Harbor rows and the "Set sail" button call `buy`, `repair` or `setSail` through
  `GameScene.harborAction`.
- **Broadsides:** in `aimBroadsides`, a held side whose reload has run out adds `dt / CHARGE_MS`
  to `charge[side]` (from null to 0..1). On the first tick it is not held, a non-null charge
  fires: `firePlayer` works out the reach (`reachOf`: `REACH_MIN` of the range at 0, all of it at
  1) and damage (`1 + CHARGE_DAMAGE * charge` times the base), picks the nearest enemy within
  reach and within `ARC + TRAIN_SLACK` of straight out, and calls `fire` with the order's shot,
  pellets and pellet share. The shot's lifetime is `reach / BALL_SPEED`. Then the side reloads.
- **Rendering:** ships, balls, loot (barrel plus a "Plunder" label), sinking hulks and the "+N
  gold" floaters are sprites kept in maps keyed by entity or effect id. They are created on first
  sight, moved each frame and destroyed when the id disappears from state. Wakes, detour courses,
  smoke (ink-outlined clouds), splashes, hits, the firing arcs and their aim label, HP bars, the
  slowed ring, the HUD bars, the control rings and the edge pointers are Graphics, cleared and
  redrawn every frame. The HUD, order card, controls, frame and overlays use scroll factor 0.
- **Wrapping sea:** `WORLD` (1920x1200) wraps on both axes. In the sim, every move ends in
  `wrapPoint`, and `bearing` and `distance` in `sim.ts` go through `offset`, so ships chase, aim,
  separate, plan detours and pull in loot across an edge. The scene keeps `view`, the player's
  position without wrapping (moved each frame by the `offset` from `lastPlayer`), and
  `followPlayer` centres the camera on it with `setScroll`, so the camera never jumps at an edge
  and there are no camera bounds. Everything else is drawn at `place(p)`: its nearest copy around
  the player, which works because the sea is more than twice the view on each axis. The chart is
  a screen-sized tile sprite of the `sea` texture at scroll factor 0 whose tile position is the
  camera's scroll; the islands are painted into that texture, so they need no sprites.
- **Islands:** `runAground` in `sim.ts` treats each island's beach as an ellipse grown by part of
  the ship's radius. A ship inside it is moved out to its edge along the line from the centre,
  its heading is mirrored in the ellipse's normal if it was sailing in, and, unless `agroundMs`
  is still running, it loses `AGROUND_DAMAGE` hp, flashes and leaves a `hit` effect. It runs for
  every ship after `separate` while fighting, and for the player alone in `break`, so an island
  can end the run in either phase (`playerSunk`).
- **Enemy steering round islands:** an island's no-go zone for a ship is its beach grown by 0.6
  of the ship's radius plus `SEA_ROOM` (`zoneOf`). While closing in (further than 0.9 of its
  range), a captain checks whether the straight line to the player crosses a zone (`blocked`); if
  so, `roundIsland` works out both ways round in the zone's unit-circle space (tangent point,
  sweep round the coast, rough length) and `planDetour` picks the shorter, keeping to the side it
  already chose unless the other is a quarter shorter. The ship steers for a point 0.35 rad
  further round the coast than the tangent, so it follows the shore. `e.detour` holds the island
  and side for the scene, which draws `detourCourse` dotted with an arrow and labels the first
  one. In every mode `fend` turns a wanted heading that would reach a beach within the lookout
  (`shoalAhead`: radius + `LOOKOUT` + the turning circle `speed / turn`) to run along the coast,
  and a ship with a beach ahead on its present heading sails at `SHORTEN_SAIL` of its speed.

State model (`src/game/state.ts`):

- `GameState` holds the phase, wave, timers (`breakMs`, `spawnMs`), the `toSpawn` queue, `player`,
  `helm`, `aim` (which fire controls are held, written by the scene), `charge` (each side's charge
  0..1, or null when not aiming), `order` (the wave's `OrderId`), `enemies`, `balls`, `loot`,
  `effects`, `gold`, `plundered`, `sunk`, `ranks` (upgrade ranks, absent means 0), `bestWave` and
  `nextId`.
- `Ship` has a heading in radians (0 is east, positive is clockwise on screen), `hp`/`maxHp`,
  per-side `reload` timers, `hitMs`, `agroundMs` (the cooldown before an island can damage it
  again) and `slowMs` (chain shot), which `tick` counts down for every ship in every phase, so a
  ship hit just before the game ends doesn't stay tinted behind the panel; and `detour` (enemies
  only). The player is always id 1 with kind `player`.
- `Ball` carries its velocity, remaining `ms`, `damage`, `fromPlayer` and `shot` (`round`,
  `chain`, `grape` or `powder`; enemy shot is always `round`). `Loot` has `gold` and `ms` to live.
  An `Effect` is visual only (`splash`, `smoke` with the side's `heading`, `hit`, `sink`,
  `coins`).
- Only `sim.ts` functions mutate state, plus the scene writing `helm` and `aim` each frame. The
  player's derived stats always come from `stats(s)`. The only stored derived value is
  `player.maxHp`, which `buy('hull')` updates.
- Invariant: every entity and effect id comes from `s.nextId++`, because the scene keys its sprite
  maps by id.

Persistence: `localStorage` key `broadside-best-wave` stores one number. The scene saves it when
the phase changes to `harbor` or `over`. Reads and writes are wrapped in try/catch, and a stored
value that is not a finite positive number loads as 0 (rounded down otherwise).

Randomness and timing: `Math.random` is used in `spawn` (the angle at which an enemy appears), in
`fire` (one call per shot, even for the player, whose spread is 0; grapeshot makes three per gun)
and in `drawOrder` (once per `setSail`, never before wave 1 is beaten, which is why the first
order is fixed). Adding guns or shots therefore shifts the random sequence the test relies on.
The art uses its own seeded generator (`rng` in `art.ts`), never `Math.random`. All timing comes
from `update`'s `time`. There is no `Date` or `setTimeout` in the game.

Data tables, where to tune:

- Player base stats: `PLAYER` in `state.ts`. Upgrade and order effects: `stats()` in `state.ts`.
- Charging: `CHARGE_MS` (1000), `REACH_MIN` (0.65) and `CHARGE_DAMAGE` (0.5) in `state.ts`;
  `TRAIN_SLACK` (12 degrees) at the top of `sim.ts`.
- Captain's orders: `ORDERS`, `SLOW_MS` (4000) and `PELLET_FAN` in `orders.ts`; `FIRST_ORDER` in
  `state.ts`.
- `ISLANDS` (name on the chart, centre, and `rx`/`ry`, the beach's half-widths, from which
  `bakeSea` in `art/art.ts` draws each coast), `AGROUND_DAMAGE` (8) and `AGROUND_MS` (800): in
  `state.ts`. In `runAground` the beach grows by 0.6 of the ship's radius.
- World, `BREAK_MS`, `LOOT_MS`, `LOOT_PULL`, `ARC` (broadside half-angle) and `BALL_SPEED`: in
  `state.ts`.
- `SPAWN_MS`, `SPAWN_DISTANCE`, `LOOT_DRIFT`, `ENEMY_SPREAD`, `HARBOR_PATCH`, `SEA_ROOM`,
  `LOOKOUT` and `SHORTEN_SAIL`: at the top of `sim.ts`. The loot formula
  (`loot + 2 * (wave - 1)`) is in `sink`, and the +30 hp on a hull purchase is in `buy`.
- Enemy stats: `ENEMIES` in `ships.ts`. Wave makeup and hp scaling: `waves.ts`. The difficulty
  multiplier on enemy hp is in `spawn` in `sim.ts`. Upgrade costs and
  ranks: `UPGRADES` and `REPAIR_COST` in `upgrades.ts`.

### Hub settings

- `src/main.ts` calls `setupGame(game)` from `shared/setupGame.ts` right after creating the game.
  It applies the frame cap, the FPS readout and reduced motion (camera shake and flash become
  no-ops; this game uses neither).
- Difficulty scales one number: enemy hp. `spawn` in `game/sim.ts` multiplies
  `ENEMIES[kind].hp * hpScale(wave)` by `byDifficulty(0.75, 1, 1.3)` (Easy 0.75, Normal 1, Hard
  1.3) from `shared/settings.ts`, before rounding. The player's stats are not scaled.
- `GameScene` reads `settings.reduceMotion` itself: with it on, a ship is not tinted while
  `hitMs > 0` (from a cannonball or running aground) and does not roll on the swell, loot holds
  still and, in its last 4s, faded at alpha 0.4 instead of blinking, chain shot does not tumble,
  and the dotted ring round a slowed ship does not turn.
- Normal must stay exactly as designed: the playthrough runs on Normal and relies on wave 1 sloop
  hp. Keep the Broadside row of the difficulty table in the root `README.md` (and the sentence in
  this game's `README.md`) in sync with the multipliers.
- The settings live under the shared `hub-settings` storage key and are read once at page load.
  They are not part of this game's save, and "Sail again" does not reset them.

## Testing hooks

- `src/main.ts` puts `game` on `window` in dev builds. State positions are always inside `WORLD`;
  the scene's drawn positions are not (see "Wrapping sea"). The test reads
  `game.scene.getScene('Game').state` (deep-copied through JSON) and `.harbor.buttons`.
- `e2e/playthrough.spec.ts` seeds `Math.random` and drives 64ms frames. It presses the mouse down
  on the helm wheel centres to steer: first to check a turn each way and that the ship holds its
  heading with the helm released, and it checks the first order is `chain`. Then it closes on a
  sloop to within `CLOSE_IN` and turns side-on until a sloop is within `FIRE_WITHIN` and `AIM_ARC`
  of straight out from one side. It holds that side's `FIRE` control, checks `aim` and a growing
  `charge` with no player shot in flight (screenshot `0-aim`), lets go once the charge reaches the
  sloop (`chargeNeeded`), and checks that the charge is null, the side reloads and two `chain`
  balls flew (`1-broadside`), then that the first sloop hit has `slowMs > 0`. It fights on the
  same way (`fight`: hold a loaded side's fire control while a sloop is off it, let go when
  charged enough or the sloop leaves the arc, otherwise steer) until both sloops are sunk, checks
  that the first leaves loot (afloat or already sailed over, `2-loot`) and that the harbor opens
  with both sloops' gold aboard (`3-harbor`), then taps the `shot` row and `sail`.
- Keep in sync with the test: `HELM` and `FIRE` centres (copied into the test), `VIEW`, wave 1
  being `['sloop', 'sloop']`, `FIRST_ORDER` (`chain`) and chain shot's look (`shot: 'chain'`),
  sloop loot 10 (plus the per-wave bonus, which is 0 on wave 1), the player hull of 120, two guns
  a side, `PLAYER.range` (260) with `REACH_MIN` (0.65), `ARC` (the test uses 28 degrees, inside
  32), Heavy Shot's first cost of 15, `CLOSE_IN` (220) staying under `PLAYER.range`, and `WORLD`
  (copied into the test, which measures bearings and distances the shortest way round). The test
  also relies on: the `break` phase allowing steering, the first enemy appearing within 5s,
  `GameState` field names, harbor button ids matching `UpgradeId` / `'sail'`, `bestWave` becoming
  1 on reaching the harbor, and wave 2 having more ships than wave 1.

## Making common changes

- **Add an upgrade:** add an id to `UpgradeId` and an entry to `UPGRADES` in `upgrades.ts`, then
  apply it in `stats()` in `state.ts`. The harbor adds a row automatically, but `HARBOR` in
  `layout.ts` only fits about six rows plus "Set sail", so adjust `h`, `firstRowY` or `rowGap`.
- **Add a captain's order:** add an id to `OrderId` and an entry to `ORDERS` in `orders.ts`. Stat
  multipliers (`damage`, `range`, `reload`, `sails`) apply through `stats()`; anything else needs
  rules in `sim.ts`. Draw its emblem in `bakeSeal` in `art/art.ts` (the texture `seal-<id>` is
  baked for every id). A new shot look needs a `Ball['shot']` value and a `shot-<look>` texture
  in `bakeShot`. Keep the title and description short enough for the card (about 300px).
- **Add an enemy ship:** add a kind to `EnemyKind` and `ENEMIES` in `ships.ts`, a look in
  `SHIP_LOOKS` in `art/art.ts` (its texture is baked automatically), and place it in `waveShips`.
- **Rebalance:** edit the tables listed above. If a wave 1 number changes (sloop stats, player
  stats, charge numbers, the first order, Heavy Shot cost), update the constants at the top of
  the playthrough test in the same PR.
- **Change controls or the HUD:** the helm wheels and fire controls are built in `createControls`
  and drawn in `drawControls`, input is read in `readInput` (all in `GameScene.ts`), and their
  positions are `HELM` and `FIRE` in `layout.ts`. Update the test's `HELM` and `FIRE` copies
  whenever they move, and keep the fire controls clear of the wheels for two-thumb play.
- **Move or add an island:** edit `ISLANDS` in `state.ts`; the chart repaints it at boot and the
  steering and collision follow. Keep islands far enough apart that one detour doesn't lead onto
  another.
- **New visual effect:** add a kind to `Effect['kind']`, emit it with `effect()` in `sim.ts`, and
  draw it in `GameScene.drawEffects`.

## Gotchas

- The harbor dims rows that cannot be afforded, but every row stays clickable. `buy` and `repair`
  enforce the rules and quietly return false.
- `ENEMIES[e.kind as keyof typeof ENEMIES]` casts appear throughout `sim.ts`. Never pass the player
  ship to code that looks up `ENEMIES` (`speedOf`, `fend`, `shoalAhead` included).
- When aiming at the player, enemies lead using `stats(s).speed`. The player's own broadside leads
  using `speedOf(target)` (slowed by chain shot, not by shortened sail).
- Balls are cleared on reaching the harbor and loot is cleared by `setSail`. HP, reload timers and
  position carry over between waves.
- Everything that is fixed on screen must be scroll factor 0, and containers need `pinToScreen`,
  not a plain `setScrollFactor`. Otherwise taps land in the wrong place once the camera moves.
- Don't rotate an image inside a pinned container: in WebGL a rotated child of the order card
  drew with a torn corner, so the card's slant is painted into its texture instead.
- Never draw at a state position directly or compare positions with a plain subtraction: use
  `place` in the scene and `offset` (or `bearing` and `distance`) in the sim, or things near an
  edge show up a whole sea away. Anything new that moves must end its move with `wrapPoint`.
  `detourCourse` returns points near the ship, unwrapped; the scene shifts them by `place(e)`.
- Anything painted into the `sea` texture that can cross its edge must be painted again one sea
  over (`copies` in `bakeSea`, and `parchment(..., wrap)` for the stains), or a seam shows.
- `WORLD` must stay more than twice `VIEW` on each axis, or two copies of one thing could be on
  screen while only the nearest is drawn.
- `drawPointers` draws into the same `hud` Graphics as the hull bar, so it must run after
  `hud.clear()` in `drawHud`.
