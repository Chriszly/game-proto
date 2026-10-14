# Deadline: guide for agents

How Deadline is built and where it stands, for agents about to change it. `README.md` covers how to
play. Keep this file up to date with any change to the game, as the root `AGENTS.md` asks.

## Current state

Deadline is a portrait (540x960) wave defense game: a soldier at the bottom of a road fires volleys
straight up on a timer, and the player only moves them left and right. Zombies walk down and veer
towards the soldier; upgrade crates drift down among them and are shot open for a stat upgrade.

- **Implemented:** endless waves that grow in size and toughness, runners from wave 2, brutes from
  wave 3, a boss at the end of every fifth wave, four crate upgrades (fire rate, damage, companion,
  pierce), a squad of up to eight companions in three staggered rows of three, a HUD, a wave banner, health bars, a boss bar and an "Overrun!" game over screen.
- **Progression** is only the crates: no XP, levels, currency or shop. Stats reset on restart.
- **Screens:** there is no title or menu. `BootScene` bakes textures and starts `GameScene`, which
  begins wave 1 at once. Game over is an overlay in the same scene; a tap calls `scene.restart()`.
- **Persistence:** none. Nothing is saved (no high score either). It only reads the hub's shared
  settings (the `hub-settings` key, see Hub settings below).
- **Rough edges seen in the code:**
  - No audio, no particles, no camera shake; all art is placeholder pixel grids.
  - `GameScene.overlay` collects the game over objects but nothing ever reads it; restart relies on
    the scene shutdown to destroy them.
  - The comment on `liveEnemies` says "for the HUD", but only the test calls it.
  - The boss has no special behaviour beyond stats; it just walks straight down the middle.

## Architecture

### File map

- `src/main.ts`: creates the `Phaser.Game` (size from `VIEW`, `Scale.FIT`, `pixelArt`) with
  `BootScene` and `GameScene`, calls `setupGame(game)`, and exposes `game` on `window` in the dev
  build.
- `src/scenes/BootScene.ts`: scene `'Boot'`; calls `bakeSprites` and starts `'Game'`.
- `src/scenes/GameScene.ts`: scene `'Game'`; all runtime logic: state, input, spawning, firing,
  movement, collisions, waves, HUD, bars, game over.
- `src/game/rules.ts`: pure numbers and rules: `VIEW`, `HERO`, `REACH_Y`, `SQUAD_SLOTS`, `MAX_COMPANIONS`, `ENEMIES`, `UPGRADES`,
  `Stats`, `BASE_STATS`, `applyUpgrade`, `planWave`, `isBossWave`, `waveSize`. No Phaser import;
  its only import is `byDifficulty` from `shared/settings.ts`.
- `src/game/pool.ts`: generic `Pool<T>` with `take`, `release`, `live` and `all`, to reuse sprites.
- `src/art/sprites.ts`: character-grid sprites and palettes, `bake` (adds an outline), `bakeGround`,
  `bakeSprites`, plus exports `HERO_RIFLE_X` and `UPGRADE_COLORS` used by the scene.
- `shared/setupGame.ts` and `shared/settings.ts` (outside the game folder, shared by every game):
  the hub's settings, applied in `src/main.ts`, read for difficulty in `src/game/rules.ts` and for
  reduced motion in `src/scenes/GameScene.ts`.

### How it runs

- **Boot:** `bakeSprites` draws each grid into a `Graphics` and calls `generateTexture`. Texture
  keys: `hero`, `companion` (the hero grid in a tan palette), `grunt`, `runner`, `brute`, `boss`, `bullet`, `crate-<UpgradeKind>`, `sandbag`,
  `splat`, `ground`. Enemy sprites use the `EnemyKind` as the texture key, so the two must match.
- **Tick:** `GameScene.update` clamps `delta` to 100ms and, unless the phase is `'over'`, runs in
  order: scroll ground, `moveHero`, `spawn`, `fire`, `moveBullets`, `moveEnemies`, `movePickups`,
  `hitTargets`, `fadeSplats`, `checkWave`, `drawBars`, `updateHud`. All timing is accumulated `dt`
  in private clocks (`waveClock`, `fireClock`, `breakClock`, splat `age`); no Phaser timers drive
  gameplay. Tweens only fade the banner and the upgrade pop-up text.
- **Waves:** `startWave` sets `plan = planWave(wave)`, a list of `Spawn`s sorted by `at`. `spawn`
  shifts entries off the front once `waveClock` passes their `at`. `checkWave` moves to `'break'`
  when `enemiesToCome()` is 0 and no enemy is live (crates do not count), then after `BREAK_MS`
  calls `startWave(wave + 1)`.
- **Squad:** `stats.companions` companions stand at `SQUAD_SLOTS[1..]`, offsets from the hero
  (`SQUAD_SLOTS[0]`): the front row beside the hero, then two rows behind it, 24px apart, each row
  shifted 20px so all nine rifles are in different columns 20px apart. `collect` calls
  `addCompanions`, which makes the `squad` images; `moveHero` places them every frame and `fire`
  sends one bullet from each slot (from its own row's y). Depth grows with the row, so back rows draw
  on top. `heroRange()` narrows the hero's x range so every squad rifle stays in
  `HERO.minX..HERO.maxX`. Once the squad is full (`MAX_COMPANIONS` = 8), `spawn` turns a companion
  crate into a damage crate, and `collect` does the same for a companion crate that was already
  falling when the squad filled; `applyUpgrade` also caps the count.
- **Input:** `createInput` sets `pointerTarget` (clamped to `heroRange()`) on
  `pointerdown`, and on `pointermove` while held. `moveHero` walks towards it at `HERO.speed` and
  clears it on arrival; it re-clamps `pointerTarget` to `heroRange()` first, since a new companion
  can narrow it. Held A/D or arrow keys move directly and clear `pointerTarget`. A tap in
  the `'over'` phase restarts the scene instead.
- **Rendering:** objects are long-lived and updated in place: pooled images for enemies, crates
  (with two text labels each), bullets and splats are repositioned each frame and hidden on
  release. Only the health bars are redrawn from scratch each frame into one `Graphics` (`bars`).
  Enemy depth is `DEPTH.enemies + y / VIEW.h` so lower zombies draw on top.

### Hub settings

- `src/main.ts` calls `setupGame(game)` from `shared/setupGame.ts` right after creating the game.
  It applies the frame cap, the FPS readout and reduced motion (camera shake and flash become
  no-ops; Deadline uses neither).
- Difficulty scales one number: enemy toughness in `planWave` in `src/game/rules.ts`, multiplied
  by `byDifficulty(0.75, 1, 1.3)` (easy, normal, hard). It applies to every enemy's hp, the boss
  included, but not to crate hp.
- `settings.reduceMotion` also stops the zombies' side-to-side sway in `GameScene.moveEnemies`
  (they still walk and steer). There is no shake, flash or blinking effect; the only tweens fade
  the wave banner and the upgrade pop-up text.
- Normal (multiplier 1) must stay exactly as designed, since the playthrough runs on Normal.
- Keep the Deadline row of the difficulty table in the root `README.md` (and the sentence in this
  game's `README.md`) in sync: zombies have 25% less health on Easy and 30% more on Hard.
- The settings live under the shared `hub-settings` storage key, not in a save of this game, and
  are read once when the page loads (`settings` in `shared/settings.ts`), so `scene.restart()`
  keeps them.

### State model

- `GameState` (exported from `GameScene.ts`, there is no `state.ts`): `wave`, `phase`
  (`'wave' | 'break' | 'over'`), `kills`, `stats` (a `Stats` from `rules.ts`: `damage`,
  `fireInterval`, `companions`, `pierce`) and `collected` (count per `UpgradeKind`). The scene's
  public `squad` holds the companion images, one per `stats.companions`.
- Entities (`Enemy`, `Pickup`, `Bullet`, `Splat`) are private interfaces in `GameScene.ts`, held in
  `Pool`s, not in `GameState`. Each has `alive`; enemies and pickups share the `id` counter `nextId`
  so a bullet's `hit` list can hold both.
- Mutation: the scene mutates everything. The only pure function on state is `applyUpgrade`, which
  returns a new `Stats` (called from `collect`). `planWave` is pure given its `rand`.
- Invariants: `player.x` is always in `heroRange()` (inside `HERO.minX..HERO.maxX`), and it is the rifle's x, not the
  sprite's centre (origin is `HERO_RIFLE_X`). A bullet's `hitsLeft` starts at `1 + pierce` and is
  spent on enemies first, then crates, in the same frame. Wave 1 is all grunts.
- Game over: `moveEnemies` calls `gameOver` as soon as any enemy's `y + radius >= REACH_Y`, and
  returns from the loop; the rest of that frame's update still runs.

### Randomness and timing

- `Math.random` is used only by `planWave` (its default `rand`). The order of `rand()` calls there
  (per enemy: kind roll then x; then per crate: upgrade then x) fixes what the seeded test sees.
- `bakeGround` uses its own fixed-seed LCG, so the road looks the same every run.
- No `Date.now`, `performance.now` or `setTimeout` in `src/`; time is Phaser's `delta` only.
- Enemy sway and spread are derived from `id` and `y`, not random, so they are frame-rate stable.

### Data tables

- All tuning is in `src/game/rules.ts`: hero line and speed (`HERO`), `REACH_Y`, `BULLET`,
  `BREAK_MS`, the squad formation (`SQUAD_SLOTS`, `MAX_COMPANIONS`), enemy hp/speed/steer/radius (`ENEMIES`), crate speed and size (`PICKUP`), starting
  stats (`BASE_STATS`), `MIN_FIRE_INTERVAL`, the upgrade effects (`applyUpgrade`), and wave growth
  in `waveSize` and `planWave` (toughness `1 + 0.3 * (wave - 1)` times the difficulty multiplier,
  spawn gap, kind odds, boss delay, crate count `1 + floor(wave / 3)` and crate hp `10 + 6 * wave`).
- Visual-only constants stay in `GameScene.ts` (`DEPTH`, `TEXT`, `SPLAT_MS`) and colours in
  `src/art/sprites.ts` (`UPGRADE_COLORS` and the palettes).

## Testing hooks

- `src/main.ts` puts `game` on `window` when `import.meta.env.DEV`. The test reads
  `window.game.scene.getScene('Game')` and from it `state` (deep-copied), `player.x`/`player.y`,
  `pointerTarget !== null` (as "moving"), `liveEnemies()` and `livePickups()`.
- Inputs: only mouse clicks on the canvas, converted from game pixels with the canvas bounding box.
  The Playwright project `deadline` uses a 540x960 viewport.
- The test seeds `Math.random`, owns the clock (64ms frames), and forces the canvas renderer.
- Flow: wave 1 starts with `BASE_STATS` and the hero at `VIEW.w / 2`; at least 3 grunts come in; a
  first kill; the first crate comes in; it taps above the crate and waits to open it, checking
  `collected` and `stats`; it then taps above the lowest enemy until the phase is `'break'` with
  12 kills; then waits for wave 2.
- Kept in sync by hand in `e2e/playthrough.spec.ts`: `VIEW`, `HERO_Y = 880`,
  `WAVE_1_ENEMIES = 12` (from `waveSize(1)`), `BASE_STATS`, and `UPGRADED` (each upgrade applied
  once to the base stats, e.g. fire interval 272 or one companion). Changing those, the `GameState` shape, the
  scene key `'Game'`, the public fields above, or `planWave`'s random draws for wave 1 means
  updating the test in the same PR, and refreshing `docs/screenshots/playthrough-*.png`.
- The test runs on Normal difficulty (no `hub-settings` saved), so enemy hp is unscaled.
- Balance matters: the test needs wave 1 to be winnable by its simple aim-at-the-front strategy
  within 60s of game time, so slower firing or tougher wave 1 grunts can turn it red.

## Making common changes

- **Tune a number:** edit `src/game/rules.ts`. If it touches wave 1, `BASE_STATS` or an upgrade's
  effect, update the mirrored constants in the test.
- **Add an enemy kind:** add it to `EnemyKind` and `ENEMIES` in `rules.ts`, add its odds in
  `planWave`, add a grid and palette in `src/art/sprites.ts` and `bake` it under the same key in
  `bakeSprites`. Give it a splat scale in `GameScene.kill` if it is big.
- **Change the squad's shape:** edit `SQUAD_SLOTS` in `rules.ts` (`MAX_COMPANIONS` follows its
  length). Keep every slot's `dx` distinct so no rifle is behind another, and the back row's `dy`
  small enough that its sprite (54px tall, centred) stays above `VIEW.h`.
- **Add an upgrade:** add it to `UpgradeKind` and `UPGRADES`, a case in `applyUpgrade` (and a
  `Stats` field plus use in `GameScene.fire` or `hitTargets` if it is a new stat), a colour in
  `UPGRADE_COLORS` (the crate texture bakes from it), and a line in `updateHud`. Adding a kind
  changes `UPGRADE_KINDS.length`, so the seeded first crate may change: update `UPGRADED` in the
  test and recheck it.
- **Change wave makeup or bosses:** edit `planWave`, `waveSize` and `isBossWave`. Keep the spawn
  list sorted by `at`, since `spawn` only looks at the front.
- **Add a new phase or screen** (title, pause): extend `Phase`, guard `update`, `spawn` and the
  `pointerdown` handler on it, and keep wave 1 starting at once or update the test's opening steps.

## Gotchas

- The hero's x is the rifle, not the sprite centre (`HERO_RIFLE_X` origin). Editing the `HERO`
  grid in `sprites.ts` moves the rifle column; `HERO_RIFLE_X` is derived from column 11 by hand.
- `HERO` exists twice: tuning in `rules.ts` and the sprite grid in `sprites.ts`. Same for `BULLET`.
- The boss bar is drawn under the HUD at the top, as the squad's back rows fill the bottom.
- `REACH_Y` drives both the game over line and the sandbag row, and crates are lost past it.
- Crates do not block wave clear: a wave can end with a crate still falling, and it keeps falling
  into the break.
- Crate hit boxes are squares (`PICKUP.halfSize`), enemy hit boxes are circles (`radius`). Hits are
  swept: `hitTargets` tests each bullet's whole move this frame, from `prevY` up to `y`, so a long
  frame can't carry it through a target, and a piercing bullet hits the nearest enemies first.
- Pools never shrink; `Pool.live()` allocates a new array each call, so avoid it in hot loops.
- The repo forbids red crosses: the favicon's aiming mark is a green crosshair. Keep it non-red.
  The favicon is the hub bear (ears, head, dot eyes, muzzle) with a helmet set between its ears.
