# Riftblade: guide for agents

How this game is built and where it stands, for agents about to change it. `README.md` covers how
to play and the upgrade tables. Per the root `AGENTS.md`, keep this file up to date in the same PR
as any change to the game.

## Current state

A survivor-style auto-attack roguelike, landscape 960x540. First version: one planet (the Dune
world), a five-minute run ending in a boss.

- Implemented: a hero select screen with three soldiers (Captain Rook, Legionary TR-9, Corporal
  Bram-17), each with an auto-firing weapon, a signature move (Space or the round button) and three
  five-tier paths; the shared Blaster pool (8 skills) and Gear deck (8 pieces), the 5-ability and
  4-gear limits, level-ups with three cards (at least one of the hero's own paths while any are
  left, the Field Ration as filler), all nine capstones and four crossovers; Clankers,
  Rollerbombs, gold-ringed elites with chests, ring waves at 1:30, 3:00 and 4:15, the Grinder
  Crawler at 5:00 (shell fans, adds, enrage below half, catches up when far), victory and defeat
  screens with "Run again", saved longest run and wins per hero.
- The field is endless: the camera follows the hero, droids spawn on a ring just off screen and
  ones left far behind are brought round ahead again.
- Not built yet: the other planets, the other heroes of the concept, audio, Watch AI.
- No TODOs or FIXMEs in the code.

## Architecture

### File map

- `src/main.ts`: creates the `Phaser.Game` (960x540, `Scale.FIT`) with `BootScene` then
  `GameScene`, calls `setupGame(game, { howToPlay })` and `setupScaling(game)`, and puts `game` on
  `window` in dev builds.
- `src/howToPlay.ts`: the How to play text; update it when controls or the first round change.
- `src/game/heroes.ts`: `HeroId`, `HEROES` (weapon numbers, aim mode, signature, paths, blurb) and
  each hero's `schemes` (`HeroScheme`: `name`, `body`, `accent`, optional `mark`, `bolt`);
  `schemeOf` returns the scheme in use (the first). All hero colours come from here.
- `src/game/upgrades.ts`: `UPGRADES` (every path, pool skill and gear piece, with five tier lines),
  `MAX_TIER`, `MAX_ABILITIES`, `MAX_GEAR`, `FILLER`, `CAPSTONES`, `CROSSOVERS`, `capstonesOf`,
  `crossoversOf`, `crossoverFor` and `capstoneFor` (card hints), `at` (per-tier tables),
  `canOffer` and `rollChoices`.
- `src/game/state.ts`: `GameState` and its parts (`Hero`, `Enemy`, `Bullet`, `Shard`, `Blast`,
  `Bomb`, `Fire`, `Ally`, `Pickup`, `Pop`), the balance numbers (`RUN_MS`, `MAX_ENEMIES`,
  `MAX_SHARDS`, `ENEMY`, `ELITE`, `ROLLER`, `BOSS`, `SPAWN_RING`, `LEASH`, `PICKUP_R`, `HERO_R`),
  `DIFF` (difficulty), `freshState`, `xpFor`, `statsOf` (the hero's numbers from upgrades),
  `refreshUnlocks` and `clock`.
- `src/game/sim.ts`: the rules. `startRun`, `choose`, `tick` (splits a frame into steps of at most
  16 ms), and per step: the droid grid (`near`, `nearest`, `swarmSpot`), the hero (`moveHero`,
  `hurtHero` with `HURT_GRACE_MS`, `signature`), weapons (`bolt`, `volley`, `primary`), every
  upgrade (`abilities`, `syncAllies`, `moveAllies`), droids (`director` with `spawnRate`,
  `moveEnemies`, `bossAttacks`, `detonate`), damage (`damage`, `kill`, `explode`), bolts, bombs,
  fire and pickups (`gainXp`, `openChest`). Exports `suppressorLength`, `suppressorHalf`,
  `shieldHalf`, `phalanxSpots` and `angleDiff` for drawing.
- `src/game/save.ts`: `SAVE_KEY`, `loadProgress`, `saveProgress`, `recordRun`.
- `src/art/glow.ts`: `C` (palette), `hex`, `shade`, `paint` (a canvas texture at `sharpRes`),
  `glow`, `shape`, `beam`, `outline`.
- `src/art/sprites.ts`: `bakeSprites` paints every texture (keys start `rb-`): the heroes
  (`heroKey`, `portraitKey`, drawn by `drawHero` from the scheme), `rb-trooper`, `rb-brother`,
  the droids (`rb-clanker`, `rb-clanker-elite`, `rb-roller`, `-armed`, `-elite`, `rb-boss`), bolts
  (`rb-bolt-<HeroId>`, `-drone`, `-heavy`, `-rocket`, `-shell`), shards, `rb-medkit` (a green
  cross), `rb-chest`, `rb-sentry`, `rb-drone`, `rb-charge`, `rb-grenade`, `rb-crate`, `rb-shadow`.
- `src/scenes/layout.ts`: `VIEW`, `CENTER`, HUD places (`XP_BAR`, `HP_BAR`, `KIT`, `TIMER`,
  `LEVEL`, `BOSS_BAR`, `SIG_BUTTON`, `STICK`), card rectangles (`heroCardRect`, `levelCardRect`, `AGAIN`),
  `DEPTH`, `inside`.
- `src/scenes/GameScene.ts`: owns `state`, reads input, ticks the sim, follows the hero with the
  camera and draws: the ground (grid and dune ridges from a hash, so the rules' `Math.random` is
  untouched), graphics layers under and over the sprites, image pools per layer (bolts and droids
  drawn with additive blending), floating texts and the HUD. `splitHudCamera` keeps the HUD fixed.
- `src/ui/panels.ts`: `Panel` (HUD objects plus tappable `spots`) and `heroSelect`, `levelUp`,
  `endScreen`.

### Flow

`state.phase` is `select` (hero cards), `run`, `levelup` (sim stopped, cards shown), `won` or
`lost` (end screen). `GameScene.update` ticks the sim only in `run` and rebuilds the panel whenever
the phase or `choices` change. Run again resets to a fresh `select` state.

### Input

Keys WASD / arrows walk; a mouse held on the field walks toward
`cameras.main.getWorldPoint(pointer)` (full speed from 40 px out). A touch on the field (`pointer.wasTouch`)
instead opens the floating stick, `GameScene.stick`: its base sits where the finger went down, the
knob follows that pointer id (`dragStick`, dragging the base along past the rim) and `moveInput`
walks the way of knob minus base, full speed at `STICK.r`, nothing inside `STICK.dead`; `drawHud`
draws it. A second touch pointer (`addPointer(1)`) lets the other thumb tap the signature. A pointerdown inside
`SIG_BUTTON` (or Space) queues the signature. Panel cards are hit-tested with `viewPoint` against
`panel.spots`; 1/2/3 pick, Enter runs again.

### Save keys

- `riftblade-progress`: `{ bestMs, wins: { [heroId]: count } }`.

### Difficulty and reduced motion

`DIFF.hp` (0.75 / 1 / 1.35) scales droid health, `DIFF.spawn` (0.75 / 1 / 1.25) the spawn rate.
With `settings.reduceMotion`, the walk bob, the rush spin, the hit swell and the rising of floating
text are off. There is no camera shake or flash.

## Testing hooks

- `window.game.scene.getScene('Game').state`: the `GameState`.
- `.panel.spots`: the cards of the panel showing (`id` is a `HeroId`, an upgrade id or `again`),
  in game pixels.
- The hero is always at `CENTER` (480, 270) on screen; `SIG_BUTTON` is at (890, 470).
- The playthrough (`e2e/playthrough.spec.ts`) picks Rook, walks a circle by holding the mouse at a
  point turning once every 25 s, takes the first card at each level-up, fires Rally Order and plays
  to 60 s. It depends on: the hero card order, Rook's health and Rally Order length, the layout
  above, and Rook surviving a minute of that walk on Normal.

## Making common changes

- **A new hero colour scheme**: add it to the hero's `schemes` in `heroes.ts`; the art reads
  `schemeOf`. To use another scheme, change `schemeOf` (and bake per scheme if both are needed).
- **A new upgrade**: add it to `UPGRADES` (five tier lines), implement it in `statsOf` (a passive
  number) or `abilities` (something with a cooldown) in `sim.ts`, and add allies in `syncAllies`.
- **A capstone or crossover**: add to `CAPSTONES` / `CROSSOVERS`; check `s.capstones.includes(id)`
  / `s.crossovers.includes(id)` where it acts.
- **Balance**: spawn rate `spawnRate`, droid stats `ENEMY`, `ELITE`, `ROLLER`, `BOSS`, XP curve
  `xpFor`. Rerun the playthrough; it must still survive the first minute on Normal.
- **A new droid**: add an `EnemyKind` and `ENEMY` entry, its movement in `moveEnemies`, its texture
  in `sprites.ts` and its key in `GameScene.drawRun`.

## Gotchas

- Painted textures with a glow halo darken whatever is under them in WebGL; bolts and droids use
  `BlendModes.ADD` for that reason. Don't draw filled ellipses in the shared graphics layers (they
  drew stray wedges in WebGL); the hero's shadow is a sprite.
- The sim uses `Math.random` only for rules; the ground decoration uses its own hash, so drawing
  never shifts the seeded sequence the test relies on.
