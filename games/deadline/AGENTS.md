# Deadline: guide for agents

How Deadline is built and where it stands, for agents about to change it. `README.md` covers how to
play. Keep this file up to date with any change to the game, as the root `AGENTS.md` asks.

## Current state

Deadline is a portrait (540x960) wave defense game: a soldier at the bottom of a road fires volleys
straight up on a timer, and the player only moves them left and right. Zombies walk down and veer
towards the soldier; upgrade crates drift down among them and are shot open for a stat upgrade, and
fuel drums roll down and blow up the zombies round them when shot.

- **Implemented:** endless waves that grow in size and toughness, runners from wave 2, brutes from
  wave 3, a boss at the end of every fifth wave, four crate upgrades (fire rate, damage, companion,
  pierce), a squad of up to eight companions in three staggered rows of three, fuel drums with a
  blast ring that previews how many zombies they would catch, a frenzy streak (12 quick kills
  double the fire rate for 5s), damage numbers on hits, a wave progress strip with a boss warning,
  a saved best wave, a HUD, a wave banner, health bars, a boss bar and a game over screen.
- **Two art styles**, switched live in game: a pulp horror comic (default) and a night-vision
  overwatch feed. All art is painted on 2D canvases in code (`src/art/`); there are no image files.
  On screens wider than the game, a canvas behind it fills the sides with comic panels or an
  overwatch console.
- **Progression** is only the crates: no XP, levels, currency or shop. Stats reset on restart.
- **Screens:** there is no title or menu. `BootScene` only starts `GameScene`, which bakes the
  textures it needs and begins wave 1 at once. Game over is an overlay in the same scene; a tap calls
  `scene.restart()`.
- **Persistence:** the best wave reached and the art style (see Save keys). It also reads the hub's
  shared settings (the `hub-settings` key, see Hub settings below).
- **Rough edges seen in the code:**
  - No audio, no camera shake.
  - The boss has no special behaviour beyond stats; it just walks straight down the middle.
  - Night-vision textures are baked the first time that style is shown, a hitch of about 0.4s
    (measured in headless Chromium) on that first switch; later switches take a frame or so.
  - Drums are not blocked by anything and can overlap crates; their labels then overlap too.

## Architecture

### File map

- `src/main.ts`: creates the `Phaser.Game` (size from `VIEW`, `Scale.FIT`, `pixelArt: false`) with
  `BootScene` and `GameScene`, calls `setupGame(game)`, and exposes `game` on `window` in the dev
  build.
- `index.html`: the page; `#game` sits above the backdrop canvas (`z-index: 1`).
- `src/scenes/BootScene.ts`: scene `'Boot'`; starts `'Game'`.
- `src/scenes/GameScene.ts`: scene `'Game'`; all runtime logic: state, input, spawning, firing,
  movement, collisions, drums and blasts, the frenzy, effects, waves, style switching, bars, game
  over.
- `src/scenes/Hud.ts`: `Hud` (top bar, style switch, progress strip, frenzy meter, drawn per style
  into one Graphics plus Text objects, redrawn only when its data changes), and the layout
  constants `STYLE_SWITCH`, `PROGRESS`, `FRENZY_PANEL`, `HUD_DEPTH`.
- `src/game/rules.ts`: pure numbers and rules: `VIEW`, `HERO`, `REACH_Y`, `SQUAD_SLOTS`,
  `MAX_COMPANIONS`, `ENEMIES`, `UPGRADES`, `PICKUP`, `DRUM`, `blastDamage`, `FRENZY`, `Stats`,
  `BASE_STATS`, `applyUpgrade`, `planWave`, `isBossWave`, `waveSize`, `waveTotal`, `drumCount`. No
  Phaser import; its only import is `byDifficulty` from `shared/settings.ts`.
- `src/game/save.ts`: `loadBest`/`saveBest`, `loadStyle`/`saveStyle`, the `ArtStyle` type
  (`'comic' | 'nv'`) and the key names.
- `src/game/pool.ts`: generic `Pool<T>` with `take`, `release`, `live` and `all`, to reuse sprites.
- `src/art/paint.ts`: shared canvas tools (`bake`, `rng`, `circle`, `path`, colour helpers), `HI`
  (textures are painted at 2x and shown at half scale), `FULL_SCREEN` (layers painted at 1x), `GEOM`
  (every sprite's box and origin, the same in both styles) and `tex(style, name)` (texture keys).
- `src/art/comic.ts`: `bakeComic` and the comic pen (`ink`: flat fill + halftone + ink outline,
  `dots`, `burst`, `letter`), reused by `backdrop.ts`.
- `src/art/nightvision.ts`: `bakeNightVision`; sprites are painted in greys, then `phosphor` maps
  them to green and blooms the brightest pixels; chemlights and amber brackets are painted after.
- `src/art/theme.ts`: `UPGRADE_COLORS` and the per-style `Theme` (fonts, text colours, accent,
  warning, hp bar) in `THEMES`. System font stacks only.
- `src/art/backdrop.ts`: `Backdrop`, the page canvas behind the game (comic panels or the overwatch
  console), and `BackdropInfo`, what the scene feeds it. Its canvas carries `data-backdrop` (and
  `aria-hidden`), which the hub test uses to tell it from the game's canvas.
- `shared/setupGame.ts` and `shared/settings.ts` (outside the game folder, shared by every game):
  the hub's settings, applied in `src/main.ts`, read for difficulty in `src/game/rules.ts` and for
  reduced motion in `src/scenes/GameScene.ts`.

### How it runs

- **Textures:** keys are `<style>-<name>` (`tex`), e.g. `comic-grunt`, `nv-crate-rate`. Names:
  `ground`, `sandbags`, `hero`, `companion`, `grunt`, `runner`, `brute`, `boss`, `crate-<kind>`,
  `label-<kind>` (the crate's caption), `drum`, `ring` (the drum's blast ring), `bullet`, `muzzle`,
  `splat`, `blast`, `streak`, `hudbar`, plus `sfx-blam`, `sfx-splut`, `sfx-boom` (comic only) and
  `scan`, `grain` (night vision only). Enemy sprites use the `EnemyKind` as the name. `create`
  bakes the saved style; `switchStyle` bakes the other one the first time.
- **Skins:** `GameScene.skin(img, name)` sets an image's texture for the current style, its origin
  from `GEOM` (by the name's first part: `crate-rate` uses `GEOM.crate`) and its scale from the
  texture's size, and records the image in `skins`. `applyStyle` re-textures every recorded image,
  restyles Text objects, moves the drum rings and marks between their comic and night-vision depths,
  shows or hides the night-vision overlay (`scan` image and `grain` tile sprite), clears effects,
  rebuilds the game over overlay if it is up, and tells the `Hud` and `Backdrop`.
- **Tick:** `GameScene.update` clamps `delta` to 100ms, runs `animateFeed` (grain and flicker),
  and unless the phase is `'over'` runs in order: `moveHero`, `spawn`, `fire`, `moveBullets`,
  `moveEnemies` (stops the frame on game over), `movePickups`, `moveDrums`, `hitTargets`,
  `tickFrenzy`, `ageEffects`, `checkWave`, `drawBars`, `updateHud`, and once per game second
  `refreshBackdrop`. All timing is accumulated `dt` in private clocks (`waveClock`, `fireClock`,
  `breakClock`, `sinceKill`, `runMs`, effect and splat ages); no Phaser timers drive gameplay.
  Tweens only fade the banner and the upgrade pop-up text.
- **Waves:** `startWave` sets `plan = planWave(wave)`, a list of `Spawn`s (enemy, pickup or drum)
  sorted by `at`, resets `fallen` and `waveTotal` (`waveTotal(wave)`: its zombies plus its boss),
  and saves a new best. `spawn` shifts entries off the front once `waveClock` passes their `at`.
  `checkWave` moves to `'break'` when `enemiesToCome()` is 0 and no enemy is live (crates and drums
  do not count), then after `BREAK_MS` calls `startWave(wave + 1)`.
- **Drums:** `moveDrums` rolls each drum down at `DRUM.speed`, counts the zombies within
  `DRUM.blastRadius` (`caught`, and flags them `inBlast` for the marks drawn in `drawBars`), and
  updates its ring and label. In `hitTargets`, a bullet that still has hits left after the enemies
  tests drums and then crates (square boxes); a drum at 0 hp calls `explode`, which runs `hurt`
  with `blastDamage(wave)` on every zombie in the ring and records `lastBlast`. A drum past the
  sandbags is lost.
- **Frenzy:** `kill` adds to `streak` when the last kill was within `FRENZY.gapMs` (or a frenzy is
  running), else starts it at 1. At `FRENZY.kills` it sets `frenzyMs = FRENZY.ms`; `fire` divides
  the fire interval by `FRENZY.rate` while it runs. `tickFrenzy` counts it down (the streak resets
  when it ends) and breaks the streak after `gapMs` without a kill. Every third streak kill pops a
  `streak` burst; every hit pops a `-N` number (`hurt`).
- **Effects:** one `fx` pool of image + text pairs (`effect`, aged in `ageEffects`): muzzle flashes,
  blasts, lettered sounds (comic only: BLAM! every `BLAM_EVERY` volleys, SPLUT! every `SPLUT_EVERY`
  kills, KA-BOOM! on a blast), streak bursts and hit numbers. No `Math.random` in any of them.
- **Squad:** `stats.companions` companions stand at `SQUAD_SLOTS[1..]`, offsets from the hero
  (`SQUAD_SLOTS[0]`): the front row beside the hero, then two rows behind it, 24px apart, each row
  shifted 20px so all nine rifles are in different columns 20px apart. `collect` calls
  `addCompanions`, which makes the `squad` images; `moveHero` places them every frame and `fire`
  sends one bullet from each slot (from its own row's y). Depth grows with the row, so back rows draw
  on top. `heroRange()` narrows the hero's x range so every squad rifle stays in
  `HERO.minX..HERO.maxX`. Once the squad is full (`MAX_COMPANIONS` = 8), `spawn` turns a companion
  crate into a damage crate, and `collect` does the same for a companion crate that was already
  falling when the squad filled; `applyUpgrade` also caps the count.
- **Input:** a `pointerdown` inside `Hud.onSwitch` (the `STYLE_SWITCH` box, padded 6px) calls
  `switchStyle` and nothing else; the V key does the same. Otherwise `createInput` sets
  `pointerTarget` (clamped to `heroRange()`) on `pointerdown`, and on `pointermove` while held
  (unless the press began on the switch). `moveHero` walks towards it at `HERO.speed` and clears it
  on arrival; it re-clamps `pointerTarget` to `heroRange()` first, since a new companion can narrow
  it. Held A/D or arrow keys move directly and clear `pointerTarget`. A tap in the `'over'` phase
  restarts the scene instead.
- **Rendering:** objects are long-lived and updated in place: pooled images for enemies, crates
  (with a label image and an hp Text), drums (with a ring image and a label Text), bullets, splats
  and effects are repositioned each frame and hidden on release. `bars` (health bars, drum label
  balloons or tags, the boss bar) and `marks` (marks on zombies in a blast ring) are Graphics
  redrawn every frame; in the comic `marks` sit on the road under the horde, in night vision both
  are part of the overlay above the scanlines (`DEPTH.labels`). Enemy depth is
  `DEPTH.enemies + y / VIEW.h` so lower zombies draw on top.
- **Backdrop:** `GameScene.backdrop` is one `Backdrop` for the page's lifetime (static, so restarts
  keep it). It finds the game's frame from `game.canvas`, paints each side in a 656x1080 design box
  scaled to fit, caches the still parts per style and size, and repaints its live parts (captions,
  REC clock, horde count, roster, supply drops, stats) on `refresh`. Sides narrower than 140px
  are left plain, so at the test's 540x960 nothing shows.

### Save keys

- `deadline-best`: the highest wave any run has reached, a number. Written by `startWave` when the
  wave beats `state.best`. A broken value loads as 0.
- `deadline-style`: `'comic'` or `'nv'`. Written by `switchStyle`; anything else loads as the
  comic.
- Both are read and written through `src/game/save.ts`, wrapped in try/catch.

### Hub settings

- `src/main.ts` calls `setupGame(game)` from `shared/setupGame.ts` right after creating the game.
  It applies the frame cap, the FPS readout and reduced motion (camera shake and flash become
  no-ops; Deadline uses neither).
- Difficulty scales one number: enemy toughness in `planWave` in `src/game/rules.ts`, multiplied
  by `byDifficulty(0.75, 1, 1.3)` (easy, normal, hard). It applies to every enemy's hp, the boss
  included, but not to crate hp, drum hp or blast damage.
- `settings.reduceMotion` stops the zombies' side-to-side sway in `GameScene.moveEnemies` (they
  still walk and steer), holds the night-vision grain, scanline and flicker still (`animateFeed`
  does nothing), and makes a drum's blast show at full size instead of swelling. There is no shake,
  screen flash or blinking effect.
- Normal (multiplier 1) must stay exactly as designed, since the playthrough runs on Normal.
- Keep the Deadline row of the difficulty table in the root `README.md` (and the sentence in this
  game's `README.md`) in sync: zombies have 25% less health on Easy and 30% more on Hard.
- The settings live under the shared `hub-settings` storage key, not in a save of this game, and
  are read once when the page loads (`settings` in `shared/settings.ts`), so `scene.restart()`
  keeps them.

### State model

- `GameState` (exported from `GameScene.ts`): `wave`, `phase` (`'wave' | 'break' | 'over'`),
  `kills`, `stats` (a `Stats` from `rules.ts`: `damage`, `fireInterval`, `companions`, `pierce`),
  `collected` (count per `UpgradeKind`), `best`, `fallen` and `waveTotal` (the progress strip),
  `streak`, `frenzyMs` and `frenzies`, `drumsBlown` and `lastBlast` (`{ caught, killed }` of the
  last drum). The scene's public `squad` holds the companion images, one per `stats.companions`,
  and `style` the current `ArtStyle`.
- Entities (`Enemy`, `Pickup`, `Drum`, `Bullet`, `Splat`, `Fx`) are private interfaces in
  `GameScene.ts`, held in `Pool`s, not in `GameState`. Each has `alive`; enemies, pickups and drums
  share the `id` counter `nextId` so a bullet's `hit` list can hold all three.
- Mutation: the scene mutates everything. The only pure function on state is `applyUpgrade`, which
  returns a new `Stats` (called from `collect`). `planWave` is pure given its `rand`.
- Invariants: `player.x` is always in `heroRange()` (inside `HERO.minX..HERO.maxX`), and it is the
  rifle's x, not the sprite's centre (the soldier's `GEOM` origin is the rifle). A bullet's
  `hitsLeft` starts at `1 + pierce` and is spent on enemies first, then drums, then crates, in the
  same frame. `fallen` counts every kill of the wave, drum kills included, so it equals `kills`
  during wave 1. Wave 1 is all grunts.
- Game over: `moveEnemies` calls `gameOver` as soon as any enemy's `y + radius >= REACH_Y`, and
  the rest of that frame is skipped.

### Randomness and timing

- `Math.random` is used only by `planWave` (its default `rand`). The order of `rand()` calls there
  (per enemy: kind roll then x; then per crate: upgrade then x; then per drum: x) fixes what the
  seeded test sees. Drum draws come last so they don't change a wave's enemies or crates.
- The art uses its own seeded `rng` (`paint.ts`), so it looks the same every run. Effects, the
  BLAM! placement and the night-vision flicker come from counters and the frame number.
- No `Date.now`, `performance.now` or `setTimeout` in `src/`; game time is Phaser's `delta` only.
  The backdrop repaints on window resize through `requestAnimationFrame`, which touches no game
  state.
- Enemy sway and spread are derived from `id` and `y`, not random, so they are frame-rate stable.

### Data tables

- All tuning is in `src/game/rules.ts`: hero line and speed (`HERO`), `REACH_Y`, `BULLET`,
  `BREAK_MS`, the squad formation (`SQUAD_SLOTS`, `MAX_COMPANIONS`), enemy hp/speed/steer/radius
  (`ENEMIES`), crate speed and size (`PICKUP`), drum speed, size, blast radius and hp (`DRUM`:
  30px/s, 88px, one hit), `blastDamage` (`6 + 3 * wave`), the frenzy (`FRENZY`: 1500ms gap, 12
  kills, 5000ms, 2x), starting stats (`BASE_STATS`), `MIN_FIRE_INTERVAL`, the upgrade effects
  (`applyUpgrade`), and wave growth in `waveSize` and `planWave` (toughness `1 + 0.3 * (wave - 1)`
  times the difficulty multiplier, spawn gap, kind odds, boss delay, crate count
  `1 + floor(wave / 3)`, crate hp `10 + 6 * wave`, drum count `1 + floor(wave / 4)` from 2000ms).
- Visual-only constants stay in `GameScene.ts` (`DEPTH`, `SPLAT_MS`, `BLAM_EVERY`,
  `SPLUT_EVERY`), `Hud.ts` (layout) and `src/art/` (colours, `GEOM`).

## Testing hooks

- `src/main.ts` puts `game` on `window` when `import.meta.env.DEV`. The test reads
  `window.game.scene.getScene('Game')` and from it `state` (deep-copied), `player.x`/`player.y`,
  `pointerTarget !== null` (as "moving"), `style`, `liveEnemies()`, `livePickups()` and
  `liveDrums()` (`id`, `hp`, `maxHp`, `x`, `y`, `caught`), and `localStorage` (`deadline-best`,
  `deadline-style`).
- Inputs: only mouse clicks on the game's canvas (`#game canvas`; the page has a second canvas
  behind it), converted from game pixels with its bounding box. The Playwright project `deadline`
  uses a 540x960 viewport.
- The test seeds `Math.random`, owns the clock (64ms frames), and forces the canvas renderer.
- Flow: wave 1 starts with `BASE_STATS`, best 1 (saved), the hero at `VIEW.w / 2` and the comic
  style; it taps the switch's NV half (style `nv`, saved, hero not moving, screenshot
  `0-night-vision`) and its COMIC half (back to `comic`); at least 3 grunts come in; a first kill
  (`fallen` equals `kills`, a streak started); the wave's drum comes in, and it plays on aiming at
  the front zombie until the drum's ring has caught a zombie while the front is above
  `FRONT_SAFE_Y`, then taps below the drum and waits for `drumsBlown` 1 (the blast caught some,
  killed all it caught, `fallen` equals `kills`, the streak counts the blast's kills); then the
  first crate: it taps above it and waits to open it, checking `collected` and `stats`; it taps
  above the lowest enemy until the phase is `'break'` with 12 kills and `fallen` 12 of 12; then wave
  2 starts with best 2 saved and `fallen` 0, and the streak breaks.
- Kept in sync by hand in `e2e/playthrough.spec.ts`: `VIEW`, `HERO_Y = 880`,
  `WAVE_1_ENEMIES = 12` (from `waveSize(1)`), `BASE_STATS`, `UPGRADED` (each upgrade applied once
  to the base stats, e.g. fire interval 272 or one companion), `SWITCH` (the two halves of
  `STYLE_SWITCH`), `STREAK_GAP_MS` (`FRENZY.gapMs`) and `FRONT_SAFE_Y`. Changing those, the
  `GameState` shape, the scene key `'Game'`, the public fields above, `planWave`'s random draws
  for wave 1, the drum's timing, speed, radius or one-hit hp, or the wave-1 blast damage means
  updating the test in the same PR, and refreshing `docs/screenshots/playthrough-*.png`.
- The test runs on Normal difficulty (no `hub-settings` saved), so enemy hp is unscaled.
- Balance matters: the test needs wave 1 to be winnable by its simple strategy within the game time
  it allows, and the wave-1 drum to catch a zombie while the front is far enough away; slower
  firing, tougher wave 1 grunts or a later drum can turn it red.

## Making common changes

- **Tune a number:** edit `src/game/rules.ts`. If it touches wave 1, `BASE_STATS`, an upgrade's
  effect, drums or the frenzy gap, update the mirrored constants in the test.
- **Add an enemy kind:** add it to `EnemyKind` and `ENEMIES` in `rules.ts`, add its odds in
  `planWave`, a box in `GEOM` (`paint.ts`), and paint it in both `bakeComic` and
  `bakeNightVision` under the same name. Give it a splat scale in `GameScene.kill` if it is big.
- **Add a sprite:** give it a `GEOM` entry and bake it in both styles (or guard its use on the
  style, like the comic's `sfx-*`; `effect` skips a texture that doesn't exist). Show it through
  `skin` so a style switch swaps it.
- **Change the art of one style:** edit `comic.ts` or `nightvision.ts`; keep each sprite inside its
  `GEOM` box with the origin where the entity's x, y is (the soldier's is the rifle).
- **Change the squad's shape:** edit `SQUAD_SLOTS` in `rules.ts` (`MAX_COMPANIONS` follows its
  length). Keep every slot's `dx` distinct so no rifle is behind another, and the back row's `dy`
  small enough that its sprite stays above `VIEW.h`.
- **Add an upgrade:** add it to `UpgradeKind` and `UPGRADES`, a case in `applyUpgrade` (and a
  `Stats` field plus use in `GameScene.fire` or `hitTargets` if it is a new stat), a colour in
  `UPGRADE_COLORS` (`theme.ts`; both crate textures and labels bake from it), a stat in
  `Hud.stats` and a row in the backdrop's supply list. Adding a kind changes
  `UPGRADE_KINDS.length`, so the seeded first crate may change: update `UPGRADED` in the test and
  recheck it.
- **Change wave makeup or bosses:** edit `planWave`, `waveSize` and `isBossWave`. Keep the spawn
  list sorted by `at`, since `spawn` only looks at the front.
- **Add a HUD item:** add it to `HudData` and draw it in both `drawComic` and `drawNv` in
  `Hud.ts`; keep clear of `STYLE_SWITCH`, or move the switch and the test's `SWITCH`.
- **Add a new phase or screen** (title, pause): extend `Phase`, guard `update`, `spawn` and the
  `pointerdown` handler on it, and keep wave 1 starting at once or update the test's opening steps.

## Gotchas

- The hero's x is the rifle, not the sprite centre: `GEOM.hero.ox` is the rifle's column, and both
  styles paint the rifle at x 0.
- `HERO` and `DRUM` are tuning in `rules.ts`; `GEOM` in `paint.ts` is only the drawing box.
- The boss bar is drawn under the progress strip at the top, as the squad's back rows fill the
  bottom.
- `REACH_Y` drives the game over line, the sandbag row and the gap in the lane dashes, and crates
  and drums are lost past it.
- Crates and drums do not block wave clear: a wave can end with one still on the road, and it
  keeps moving into the break.
- Crate and drum hit boxes are squares (`PICKUP.halfSize`, `DRUM.halfSize`), enemy hit boxes are
  circles (`radius`). Hits are swept: `hitTargets` tests each bullet's whole move this frame, from
  `prevY` up to `y`, so a long frame can't carry it through a target, and a piercing bullet hits
  the nearest enemies first. Zombies in the drum's column shield it, which is why drums are one hit.
- Full-screen textures (`FULL_SCREEN` in `paint.ts`) are painted at 1x so the canvas renderer draws
  them unscaled; everything else is 2x. `skin` reads the scale from the texture, so don't set a
  sprite's scale before `skin`; set extra scale (splats, effects) after it, as `1 / HI` times the
  factor.
- `effect` re-skins its pooled image each time, so `skins` holds the last sprite each one showed;
  `applyStyle` releases all effects so none show a missing texture.
- Pools never shrink; `Pool.live()` allocates a new array each call, so avoid it in hot loops.
- The repo forbids red crosses: the favicon's aiming mark is a green crosshair, and the damage crate
  shows only an orange band (no plus). Keep both non-red-cross.
  The favicon is the hub bear (ears, head, dot eyes, muzzle) with a helmet set between its ears.
