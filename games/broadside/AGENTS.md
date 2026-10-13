# Broadside: guide for agents

This file explains how this game is built and where it stands, for agents about to change it.
`README.md` covers how to play, the enemy ships and the upgrades. Keep this file up to date with
any change to the game, as the root `AGENTS.md` asks.

## Current state

A wave-based naval battle. The player's ship always sails forward and the only control is the
helm (turn left, turn right, or let go). The cannons fire on their own whenever an enemy is in range
off either side. Sunk enemies drop loot barrels, and gold buys upgrades at a harbor between waves.

- **Implemented:** endless waves (sloops from wave 1, brigs from wave 3, galleons from wave 5) with
  enemy hull scaling per wave. Enemy AI closes in, turns to bring a broadside to bear and bears
  away rather than ram. Broadsides lead their target, and enemy aim has a random spread. Loot
  drifts toward the player and expires. There is a harbor shop with five upgrades plus a paid
  repair, a game-over panel with "Sail again", and off-screen arrows pointing to enemies and loot.
- **Screens:** there is only `GameScene`. The wave banner, the harbor panel and the game-over panel
  are overlays drawn on top of it. There is no title screen, pause or in-game settings; the shared
  settings (difficulty, frame cap, FPS readout, reduced motion) are set on the hub page.
- **Persistence:** only the best wave beaten is saved. Each run starts fresh at wave 1.
- **Rough or unused:** there is no sound. The `coin` texture baked in `src/art/art.ts` is never
  used. `ShipType.name` in `src/game/ships.ts` is never shown. Islands are scenery only, with no
  collision. Ships only stay inside `WORLD` because `steer` clamps them to `EDGE`. There are no
  TODO comments in the code.

## Architecture

File map (all under `src/`, plus the shared files it imports):

- `main.ts`: creates the `Phaser.Game` (960x540, `Scale.FIT`, `pixelArt`) with `BootScene` and
  `GameScene`, calls `setupGame(game)` and exposes `window.game` in dev builds.
- `scenes/BootScene.ts`: calls `bakeAll` and starts `Game`.
- `scenes/GameScene.ts`: owns the run's `state`, reads input, calls `tick` each frame and draws
  everything (HUD, helm buttons, wakes, effects, arcs, harbor and game-over overlays).
- `scenes/layout.ts`: `VIEW`, `HUD_HEIGHT`, the `HELM` button centres, the `HARBOR` panel and row
  geometry, `BUTTON`, `UI_DEPTH` and `FONT`.
- `game/state.ts`: types, the world and timing constants, the base `PLAYER` stats, `stats()` (the
  player's stats after upgrades), `newShip`, `newRun` and `radiusOf`.
- `game/sim.ts`: all rules. `tick` handles steering, spawning, enemy AI, separation, firing, balls,
  sinking, loot and reaching the harbor. `buy`, `repair` and `setSail` are the harbor actions.
- `game/ships.ts`: the `ENEMIES` table (hp, radius, speed, turn, guns, damage, reload, range, loot).
- `game/upgrades.ts`: the `UPGRADES` table, `UPGRADE_IDS`, `costOf` and `REPAIR_COST`.
- `game/waves.ts`: `waveShips(wave)` (which ships come, in order) and `hpScale(wave)`.
- `game/save.ts`: `loadBestWave` and `saveBestWave`.
- `art/art.ts`: `SHIP_LOOKS` (size and colours for each ship kind) and the bake functions for the
  `ship-<kind>`, `water`, `island-0..2`, `ball`, `loot` and `coin` textures.
- `ui/Harbor.ts`: the harbor panel. Its rows are built from `UPGRADE_IDS` plus `repair`, followed
  by a "Set sail" button. It also records each button's screen rectangle in `buttons`.
- `ui/Button.ts`: `makeButton`, a wooden caption button.
- `ui/screen.ts`: `pinToScreen`, which sets scroll factor 0 on a container and every child.
- `shared/setupGame.ts` (imported by `main.ts`) and `shared/settings.ts` (`byDifficulty`, imported
  by `game/sim.ts`): the hub's settings, shared by every game. See "Hub settings" below.

How it runs:

- **Boot:** `BootScene.create` bakes every texture from Graphics (there are no asset files), then
  starts `GameScene`. `GameScene.create` builds a fresh `newRun(loadBestWave())`, the HUD, the helm
  buttons, the `Harbor` and the game-over container. "Sail again" calls `scene.restart()`, which
  runs `create` again and clears the sprite maps.
- **Time:** `GameScene.update(time)` computes `dt` from the frame timestamp, not from Phaser's
  smoothed delta, and clamps it to `MAX_STEP_MS` (250). It then calls `tick(state, dt)` once.
  The sim works in milliseconds. Speeds are in pixels per second and turn rates in radians per
  second.
- **Phases:** `GameState.phase` is one of `break` (wave banner for `BREAK_MS`; the player can sail
  but nothing spawns or fires), `fighting`, `harbor` or `over`. `tick` returns early in `harbor`
  and `over`, after ageing effects. The harbor opens once `toSpawn`, `enemies` and `loot` are all
  empty. The game is over when the player's hp reaches 0 or below.
- **Input:** each frame the scene sets `state.helm` to -1, 0 or 1. Keys (Left/A, Right/D) win over
  the pointer. Pressing on a helm circle sets `pointerHelm`, and any `pointerup` or `gameout`
  clears it. Harbor rows and the "Set sail" button call `buy`, `repair` or `setSail` through
  `GameScene.harborAction`. There is no other input.
- **Rendering:** ships, balls, loot, sinking hulks and the "+N gold" floaters are sprites kept in
  maps keyed by entity or effect id. They are created on first sight, moved each frame and
  destroyed when the id disappears from state. Wakes, smoke, splashes, hits, the range arcs, HP
  bars, the HUD and the edge pointers are Graphics, cleared and redrawn every frame. The camera
  follows the player's sprite inside `WORLD` (1920x1200). The HUD, helm and overlays use scroll
  factor 0.

State model (`src/game/state.ts`):

- `GameState` holds the phase, wave, timers (`breakMs`, `spawnMs`), the `toSpawn` queue, `player`,
  `helm`, `enemies`, `balls`, `loot`, `effects`, `gold`, `plundered`, `sunk`, `ranks` (upgrade
  ranks, absent means 0), `bestWave` and `nextId`.
- `Ship` has a heading in radians (0 is east, positive is clockwise on screen), `hp`/`maxHp`,
  per-side `reload` timers and `hitMs`. The player is always id 1 with kind `player`.
- `Ball` carries its velocity, remaining `ms`, `damage` and `fromPlayer`. `Loot` has `gold` and
  `ms` to live. An `Effect` is visual only (`splash`, `smoke`, `hit`, `sink`, `coins`).
- Only `sim.ts` functions mutate state, plus the scene writing `helm` each frame. The player's
  derived stats always come from `stats(s)`. The only stored derived value is `player.maxHp`,
  which `buy('hull')` updates.
- Invariant: every entity and effect id comes from `s.nextId++`, because the scene keys its sprite
  maps by id.

Persistence: `localStorage` key `broadside-best-wave` stores one number. The scene saves it when
the phase changes to `harbor` or `over`. Reads and writes are wrapped in try/catch.

Randomness and timing: `Math.random` is used in `spawn` (the angle at which an enemy appears) and
in `fire` (one call per gun, even for the player, whose spread is 0). Adding guns or shots
therefore shifts the random sequence the test relies on. All timing comes from `update`'s `time`.
There is no `Date` or `setTimeout` in the game.

Data tables, where to tune:

- Player base stats: `PLAYER` in `state.ts`. Upgrade effects: `stats()` in `state.ts`.
- World, `BREAK_MS`, `LOOT_MS`, `LOOT_PULL`, `ARC` (broadside half-angle) and `BALL_SPEED`: in
  `state.ts`.
- `SPAWN_MS`, `SPAWN_DISTANCE`, `EDGE`, `LOOT_DRIFT`, `ENEMY_SPREAD` and `HARBOR_PATCH`: at the top
  of `sim.ts`. The loot formula (`loot + 2 * (wave - 1)`) is in `sink`, and the +30 hp on a hull
  purchase is in `buy`.
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
- The game does not read `settings.reduceMotion` itself. The only flash is the orange hit tint
  while `hitMs > 0` in `GameScene`, which stays on with reduced motion.
- Normal must stay exactly as designed: the playthrough runs on Normal and relies on wave 1 sloop
  hp. Keep the Broadside row of the difficulty table in the root `README.md` (and the sentence in
  this game's `README.md`) in sync with the multipliers.
- The settings live under the shared `hub-settings` storage key and are read once at page load.
  They are not part of this game's save, and "Sail again" does not reset them.

## Testing hooks

- `src/main.ts` puts `game` on `window` in dev builds. The test reads
  `game.scene.getScene('Game').state` (deep-copied through JSON) and `.harbor.buttons`.
- `e2e/playthrough.spec.ts` seeds `Math.random` and drives 64ms frames. It presses the mouse down on
  the helm button centres to steer: first to check a turn each way and that the ship holds its
  heading with the helm released, then to close on each sloop to within `CLOSE_IN` and turn
  side-on. It sinks both sloops, picks up the loot, and at the harbor taps the `shot` row and then
  `sail`.
- Keep in sync with the test: `HELM` centres (copied into the test), `VIEW`, wave 1 being
  `['sloop', 'sloop']`, sloop loot 10 (plus the per-wave bonus, which is 0 on wave 1), the player
  hull of 120, Heavy Shot's first cost of 15, and `CLOSE_IN` (220) staying under `PLAYER.range`.
  The test also relies on: the `break` phase allowing steering, the first enemy appearing within
  5s, `GameState` field names, harbor button ids matching `UpgradeId` / `'sail'`, `bestWave`
  becoming 1 on reaching the harbor, and wave 2 having more ships than wave 1.

## Making common changes

- **Add an upgrade:** add an id to `UpgradeId` and an entry to `UPGRADES` in `upgrades.ts`, then
  apply it in `stats()` in `state.ts`. The harbor adds a row automatically, but `HARBOR` in
  `layout.ts` only fits about six rows plus "Set sail", so adjust `h`, `firstRowY` or `rowGap`.
- **Add an enemy ship:** add a kind to `EnemyKind` and `ENEMIES` in `ships.ts`, a look in
  `SHIP_LOOKS` in `art/art.ts` (its texture is baked automatically), and place it in `waveShips`.
- **Rebalance:** edit the tables listed above. If a wave 1 number changes (sloop stats, player
  stats, Heavy Shot cost), update the constants at the top of the playthrough test in the same PR.
- **Change controls or the HUD:** the helm is in `createHelm` and `update` in `GameScene.ts`, and
  its positions are `HELM` in `layout.ts`. Update the test's `HELM` copy whenever `HELM` moves.
- **New visual effect:** add a kind to `Effect['kind']`, emit it with `effect()` in `sim.ts`, and
  draw it in `GameScene.drawEffects`.

## Gotchas

- The harbor dims rows that cannot be afforded, but every row stays clickable. `buy` and `repair`
  enforce the rules and quietly return false.
- `ENEMIES[e.kind as keyof typeof ENEMIES]` casts appear throughout `sim.ts`. Never pass the player
  ship to code that looks up `ENEMIES`.
- When aiming at the player, enemies lead using `stats(s).speed`. The player's own broadside leads
  using the target type's base speed.
- Balls are cleared on reaching the harbor and loot is cleared by `setSail`. HP, reload timers and
  position carry over between waves.
- Everything that is fixed on screen must be scroll factor 0, and containers need `pinToScreen`,
  not a plain `setScrollFactor`. Otherwise taps land in the wrong place once the camera moves.
- `drawPointers` draws into the same `hud` Graphics as the top bar, so it must run after
  `hud.clear()` in `drawHud`.
