# Riftblade: guide for agents

How this game is built and where it stands, for agents about to change it. `README.md` covers how
to play and the upgrade tables. Per the root `AGENTS.md`, keep this file up to date in the same PR
as any change to the game.

## Current state

A survivor-style auto-attack roguelike, landscape 960x540. A run is the Rift Crusade: four planets
(Dune, Swamp, Ice, Lava) of five minutes each, every one ending in its boss, with a star map
between them.

- Implemented: a hero select screen with three soldiers (Captain Rook, Legionary TR-9, Corporal
  Bram-17), each with an auto-firing weapon, a signature move (Space or the round button) and three
  five-tier paths; the shared Blaster pool (8 skills) and Gear deck (8 pieces), the 5-ability and
  4-gear limits, level-ups with three cards (at least one of the hero's own paths while any are
  left, the Field Ration as filler), all nine capstones and four crossovers; gold-ringed elites
  with chests and credits, ring waves at 1:30, 3:00 and 4:15 on every planet.
- Four factions: Scrap droids (Clankers, Rollerbombs; the Grinder Crawler), wild beasts (mire rat
  packs, spitter toads with slowing globs; the Bog Mother with globs, young and bog pools), the
  Iron Dominion (line trooper squads firing volleys, walker gunners; the Siege Walker with volleys,
  artillery barrages behind ground warnings and stomps) and the Hollow cult (ash acolytes that
  burst into embers, fallen knights with a frontal shield and dashes; the Hollow Champion with
  marked blade dashes and, below half health, rings of fire with gaps), plus lava vents.
- Between planets: collecting what is left, credits, the star map with 2-3 nodes (trader, elite
  arena, rest, event; four events), free arena picks, the escort droid. The hero, level, kit and
  allies carry over; the clock resets per planet. Victory after the Lava boss; the end screen
  names the planet reached. Saved longest run, wins and furthest planet per hero.
- The field is endless: the camera follows the hero, foes spawn on a ring just off screen and
  ones left far behind are brought round ahead again.
- Not built yet: the other heroes of the concept, audio, Watch AI.
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
- `src/game/planets.ts`: `PLANETS` (per planet: name, faction, `hp` / `spawn` / `dmg`
  multipliers, ring-wave kind, elite kinds, boss, ground colours), `BOSSES` (name, size, health,
  credits), the bosses' attack numbers (`BOG`, `SIEGE`, `CHAMPION`), `VENT`, `CREDITS`, `ARENA_MS`,
  `arenaElites`, `TRADE` (prices), `NODE_INFO` (star map nodes), `REST_HEAL`, `planetLabel`.
- `src/game/state.ts`: `GameState` and its parts (`Hero`, `Enemy`, `Bullet`, `Shard`, `Blast`,
  `Bomb`, `Fire`, `Ally`, `Pickup`, `Hazard`, `Pop`, `EventState`), the balance numbers (`RUN_MS`,
  `MAX_ENEMIES`, `MAX_SHARDS`, `ENEMY` for every foe kind, `ELITE`, `ROLLER`, `RATS`, `TOAD`,
  `LINE`, `WALKER`, `EMBER`, `KNIGHT`, `BOSS`, `WAVES`, `SPAWN_RING`, `LEASH`, `PICKUP_R`, `HERO_R`),
  `DIFF` (difficulty), `freshState`, `xpFor`, `statsOf` (the hero's numbers from upgrades and
  `maxHpMod`), `refreshUnlocks` and `clock`.
- `src/game/sim.ts`: the rules of a fight. `startRun`, `choose` / `nextPick` (free picks first,
  then level-ups, then `state.after`), `raise` / `lower` (a tier up or down), `tick` (splits a frame
  into steps of at most 16 ms), and per step: the foe grid (`near`, `nearest`, `swarmSpot`), the
  hero (`moveHero` with slows, `hurtHero` with `HURT_GRACE_MS`, `signature`), weapons (`bolt`,
  `volley`, `primary`, which aims at a boss in range first), every upgrade (`abilities`, `syncAllies`, `moveAllies` with the escort),
  foes (`director` with `spawnRate` and `spawnGroup` per faction, `spawnElite`, `moveEnemies` with
  each kind's behaviour, `bossAttacks` per boss, `detonate`), hazards (`hazards`, `inRingGap`),
  damage (`damage` with the knight's guard, `kill`, `explode`), bolts, bombs, fire and pickups
  (`gainXp`, `openChest`, `collectAll`). The arena ends at the end of `step`. Exports
  `suppressorLength`, `suppressorHalf`, `shieldHalf`, `phalanxSpots` and `angleDiff` for drawing.
- `src/game/voyage.ts`: between fights. `frame` (tick, then `afterClear` and `nextPlanet` for the
  passing phases), `afterClear` (collect, credits, arena reward, map or victory), `rollNodes`,
  `chooseNode`, the trader (`priceOf`, `buy`, `reroll`, `leave`), the arena (`startArena`),
  events (`rollEvent`, `chooseEvent`) and `nextPlanet`.
- `src/game/save.ts`: `SAVE_KEY`, `loadProgress`, `saveProgress`, `recordRun`.
- `src/art/glow.ts`: `C` (palette), `hex`, `shade`, `paint` (a canvas texture at `sharpRes`),
  `glow`, `shape`, `beam`, `outline`.
- `src/art/factions.ts`: `bakeFactions` paints the later factions (`rb-mirerat`, `rb-toad`,
  `rb-linetrooper`, `rb-walker`, `rb-acolyte`, `rb-knight`, each with `-elite`), the bosses
  (`rb-boss-bogmother`, `rb-boss-siege`, `rb-boss-champion`, `-burning`), hostile bolts
  (`rb-bolt-glob`, `-volley`, `-slug`), `rb-escort` and `rb-credits`. Faction colours are `C.beast`
  / `C.toad`, `C.iron` / `C.ironLight`, `C.hollow` / `C.ember` in `glow.ts`, apart from the heroes'.
- `src/art/sprites.ts`: `bakeSprites` paints the first textures (keys start `rb-`): the heroes
  (`heroKey`, `portraitKey`, drawn by `drawHero` from the scheme), `rb-trooper`, `rb-brother`,
  the droids (`rb-clanker`, `rb-clanker-elite`, `rb-roller`, `-armed`, `-elite`, `rb-boss`), bolts
  (`rb-bolt-<HeroId>`, `-drone`, `-heavy`, `-rocket`, `-shell`), shards, `rb-medkit` (a green
  cross), `rb-chest`, `rb-sentry`, `rb-drone`, `rb-charge`, `rb-grenade`, `rb-crate`, `rb-shadow`.
- `src/scenes/layout.ts`: `VIEW`, `CENTER`, HUD places (`XP_BAR`, `HP_BAR`, `KIT`, `TIMER`,
  `LEVEL`, `PLANET_TAG`, `CREDITS_TAG`, `BOSS_BAR`, `SIG_BUTTON`, `STICK`), card rectangles
  (`heroCardRect`, `levelCardRect`, `mapNodeRect` / `mapNodeSpot`, `tradeCardRect`, `REROLL`,
  `LEAVE`, `eventOptionRect`, `AGAIN`), `DEPTH`, `inside`.
- `src/scenes/GameScene.ts`: owns `state`, reads input, runs `frame`, follows the hero with the
  camera and draws: the planet's ground (`drawGround` with `duneCell`, `swampCell`, `iceCell`,
  `lavaCell`, scenery from a hash, so the rules' `Math.random` is untouched), graphics layers under
  and over the sprites (hazards, warnings, knight shields, dash lines, rings of fire), image pools
  per layer (bolts and foes drawn with additive blending), floating texts and the HUD (planet tag
  and credits). `splitHudCamera` keeps the HUD fixed. The panel is rebuilt whenever `panelKey`
  changes.
- `src/ui/panels.ts`: `Panel` (HUD objects plus tappable `spots`) and `heroSelect`, `levelUp`
  (also the arena reward), `starMap`, `trader`, `eventPanel`, `endScreen`.

### Flow

`state.phase` is `select` (hero cards), `run`, `levelup` (sim stopped, cards shown), `map`,
`trader`, `event`, `won` or `lost` (end screen); `cleared` and `travel` last only until the end of
the frame. The sim runs only in `run`. A boss's death sets `cleared`; `afterClear` collects what is
lying about, pays credits and either wins (the Lava boss) or rolls the map nodes, showing any
level-ups first (`after` = `map`). A node opens the trader or an event, starts the arena (`run`
with `arena` set, ended in `step` by the last elite falling or 60 s, then `cleared` again with a
free pick if won) or rests; each ends in `travel`, which `nextPlanet` turns into the next planet's
`run` (clock reset, field cleared, the escort droid added if taken). Run again resets to a fresh
`select` state.

### Input

Keys WASD / arrows walk; a mouse held on the field walks toward
`cameras.main.getWorldPoint(pointer)` (full speed from 40 px out). A touch on the field (`pointer.wasTouch`)
instead opens the floating stick, `GameScene.stick`: its base sits where the finger went down, the
knob follows that pointer id (`dragStick`, dragging the base along past the rim) and `moveInput`
walks the way of knob minus base, full speed at `STICK.r`, nothing inside `STICK.dead`; `drawHud`
draws it. A second touch pointer (`addPointer(1)`) lets the other thumb tap the signature. A pointerdown inside
`SIG_BUTTON` (or Space) queues the signature. Panel cards are hit-tested with `viewPoint` against
`panel.spots`; 1/2/3 pick (a card, a node, an offer or an answer), 4 rerolls at the trader, Enter
leaves the trader or runs again.

### Save keys

- `riftblade-progress`: `{ bestMs, wins: { [heroId]: count }, furthest: { [heroId]: planet 1-4 } }`.
  `bestMs` is the whole run's time (`runMs`). Older saves without `furthest` load with `{}`.

### Difficulty and reduced motion

`DIFF.hp` (0.75 / 1 / 1.35) scales foe and boss health, `DIFF.spawn` (0.75 / 1 / 1.25) the spawn
rate, on every planet. With `settings.reduceMotion`, the walk bob, the rush spin, the hit swell and
the rising of floating text are off. Warnings fill steadily rather than blink. There is no camera
shake or flash.

## Testing hooks

- `window.game.scene.getScene('Game').state`: the `GameState`.
- `.panel.spots`: the cards of the panel showing (`id` is a `HeroId`, an upgrade id, a node kind,
  `option-0` / `option-1`, `sold`, `reroll`, `leave` or `again`), in game pixels.
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
- **Balance**: spawn rate `spawnRate`, per planet `PLANETS[i].hp` / `spawn` / `dmg`, boss health
  `BOSSES`, foe stats `ENEMY`, `ELITE`, `ROLLER` and the kinds' numbers, XP curve `xpFor`, credits
  `CREDITS` and prices `TRADE`. The Dune world (planet 0) must stay as it is for the playthrough:
  rerun it; it must still survive the first minute on Normal. A headless bot that runs `frame` in
  Node (stubbing nothing but `Math.random`) is the quickest way to test the later planets.
- **A new foe**: add a `FoeKind` (planets.ts) and `ENEMY` entry, its spawning in `spawnGroup`, its
  behaviour in `moveEnemies`, its texture in `factions.ts` (key `rb-<kind>` and `-elite`, picked up
  by `GameScene.drawRun` on its own).
- **A new event**: add its id to `EventId`, its text and options in `rollEvent` and its effect in
  `chooseEvent` (voyage.ts).
- **A new planet or boss**: add a `PLANETS` row (and a `BossId` in `BOSSES` with its attacks in
  `bossAttacks` and texture `rb-boss-<id>`), its ground cell in `GameScene.drawGround`.

## Gotchas

- Painted textures with a glow halo darken whatever is under them in WebGL; bolts and droids use
  `BlendModes.ADD` for that reason. Don't draw filled ellipses in the shared graphics layers (they
  drew stray wedges in WebGL); the hero's shadow is a sprite.
- The sim uses `Math.random` only for rules; the ground decoration uses its own hash, so drawing
  never shifts the seeded sequence the test relies on. The Dune world's spawning calls
  `Math.random` in the same order as before the other planets came, so keep it that way.
- Bosses are `kind: 'boss'` on every planet; which one it is comes from `PLANETS[state.planet].boss`.
  The boss's timers reuse `shellMs`, `spawnMs` and `modeMs` with a meaning per boss (see
  `bossAttacks`).
