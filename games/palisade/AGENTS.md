# Palisade: guide for agents

How Palisade is built and where it stands, for agents about to change it. `README.md` covers how to
play, the foes and the upgrades. Keep this file up to date with any change to the game, as the
root AGENTS.md asks.

## Current state

Palisade is a one-screen wave defense game. A ranger who cannot move shoots on their own from
behind a barricade at foes walking in from the right. Each kill gives experience, and each level-up
pauses the battle on a pick of three upgrades, taking one at random after 10 seconds without a tap.

- **Loop:** a break with the wave's banner, then the wave's foes come on one by one. Clearing it
  repairs a tenth of the barricade and starts the next break. Foes hack at the barricade, and once
  it is at 0 they walk on. The run ends when one reaches the hero (`phase` becomes `'over'`).
- **Progression:** level, experience, upgrade ranks, pending level-ups, best wave and run count
  carry over between runs. Every run restarts at wave 1. A boss (the troll) closes every tenth
  wave with stacked health bars.
- **Screens:** there is one scene with the battle and HUD, plus three overlays drawn over it: the
  level-up cards (`LevelUp`), the skill book (`SkillBook`, opened by the "Skill book" button in the
  top bar) and the game-over panel with "Fight again" and "New hero". There is no
  title or menu screen.
- **Rough edges seen in the code:**
  - `rollChoices` adds at most one `mend` filler, so with fewer than two upgrades left the level-up
    shows fewer than three cards. The README says the filler "fills the gaps".
  - `GameState.version` (`VERSION`) is never read, and the save holds no version, so there is no
    migration path.
  - Progress is only saved when the phase or wave changes, on a level-up and on a pick (tapped or
    auto). Experience and kills gained mid-wave are lost on a reload.
  - `HERO` in `src/game/state.ts` is unused (the scene draws the hero at `HERO_FEET`).
  - There is no sound, pause button or in-game settings panel (the upgrade list pauses, though) (only the hub's shared settings, see Hub
    settings), and the hero has a single frame.

## Architecture

### File map

- `src/main.ts`: creates the `Phaser.Game` (960x540 from `VIEW`, `pixelArt`, FIT scaling) with
  `BootScene` and `GameScene`, calls `setupGame(game)`, and puts `game` on `window` in the dev
  build.
- `src/game/`: the rules in plain TypeScript, with no Phaser imports.
  - `state.ts`: `GameState` and its parts, field geometry (`FIELD`, `SPAWN_X`, `BOW`,
    `HERO_FRONT`, `BARRICADE_FRONT`), `xpToNext`, `stats` (all upgrade effects), `newRun`,
    `Progress`, `progressOf`, `offerable`.
  - `sim.ts`: `tick` (the battle and the auto-pick countdown), `pick`, `offer`, `rollChoices`,
    `fightAgain`, `AUTO_PICK_MS`, and the private steps: spawning, shooting, missiles, damage, foe
    movement, experience, wave clear, game over.
  - `enemies.ts`: the `ENEMIES` table of wave 1 stats per `EnemyKind`.
  - `upgrades.ts`: the `UPGRADES` table, `UpgradeId`, `Icon` and `UPGRADE_IDS`.
  - `waves.ts`: `waveFoes`, `foeHp` (scaled by difficulty), `hpScale`, `bossBars`,
    `spawnInterval`, break lengths.
  - `save.ts`: `loadProgress`, `saveProgress`, `clearProgress`, `loadSpeed`, `saveSpeed`,
    `loadFound`, `saveFound`.
- `src/scenes/BootScene.ts`: bakes every texture, then starts `Game`.
- `src/scenes/GameScene.ts`: owns the `GameState`, ticks it each frame, draws it, saves progress,
  handles restart and draws the 1x/2x speed switch (`speed`, at `SPEED` in the bottom bar).
- `src/scenes/layout.ts`: screen positions (`HERO_FEET`, `BARRICADE`, `XP_BAR`, `BOSS_BAR`,
  `CARDS`, `COUNTDOWN`, `SKILL_BOOK`, `SPEED`, `BUTTON`), `HUD_HEIGHT`, `UI_DEPTH`, `FONT`.
- `src/ui/LevelUp.ts`: the level-up overlay, its cards and the auto-pick countdown (seconds left
  over an emptying bar, at `COUNTDOWN`). It records each card's spot in `cards`.
- `src/ui/SkillBook.ts`: the "Skill book found/total" button in the top bar and the book it opens,
  a 3x6 grid with a slot for every id in `UPGRADE_IDS` order. A slot not yet in `found` is an empty
  placeholder (a "?" frame and blank lines); a found one shows icon, name, rank of max (`Nx` for
  the `mend` filler, how many times it was picked) and `text`, dimmed at rank 0. Its `open` flag tells the scene to hold
  everything still.
- `src/ui/Button.ts`: `makeButton`, the wooden button used on the game-over panel.
- `src/art/`: pixel art drawn in code. `pixelArt.ts` has `bakePixelArt`, `PixelCanvas` and the
  seeded generator `seeded`. `characters.ts` has the hero, foes (two walk frames, `foeTexture`)
  and missiles. `scenery.ts` has the background and barricade stages 0 to 3. `icons.ts` has the
  upgrade icons (`iconTexture`). `palette.ts` holds the colours, including `BAR` and `BOSS_BARS`.
- `shared/` (repo root, shared by every game): `shared/setupGame.ts` (`setupGame`) and
  `shared/settings.ts` (`settings`, `byDifficulty`). `waves.ts` and `GameScene` import
  `shared/settings.ts`, and neither file imports Phaser, so `src/game/` stays Phaser-free.

### How it runs

- **Boot:** `BootScene.create` calls `bakeScenery`, `bakeCharacters`, `bakeMissiles` and
  `bakeIcons`. These write textures with keys like `background`, `barricade-N`, `hero`,
  `foe-<kind>-<frame>`, `arrow`, `arrow-fire`, `arrow-frost`, `fireball` and `icon-<icon>`. There
  are no asset files.
- **Tick:** `GameScene.update(time)` takes `dt` from the frame timestamp (not Phaser's smoothed
  delta), clamped to `MAX_STEP_MS` (250), then multiplies it by `speed` (1 or 2) unless a level-up
  is up, so the auto-pick countdown stays in real seconds. It calls `tick(state, dt)`, which runs
  `step` in substeps of at most `SUBSTEP_MS` (16) and stops while `choices` is set or the run is
  over. Only effects keep ageing then. While `choices` is set, `tick` counts `pickMs` down instead,
  and when it reaches 0 it calls `pick` with one of `choices` chosen by `Math.random`; any time left
  in the frame then goes on to the battle (or the next level-up's countdown). The scene keeps its
  own `clock`, used only for animation phases and blinking, and it stops during a pick and after a
  fall.
- **Order inside `step`:** age effects, then the break countdown or spawning, then `shoot`,
  `moveMissiles`, `moveEnemies`, and finally the wave-clear check. Arrows home, turning fully
  towards their target every substep.
- **Input:** the only input is a tap. A tap on a level-up card calls `GameScene.pick`, which calls
  `pick` in `sim.ts`. Without a tap, `tick` picks after `AUTO_PICK_MS` (10 s). "Fight again" and
  "New hero" call `restart`. The "Skill book" button opens `SkillBook`; Back or a tap beside the
  book closes it. While it is open `GameScene.update` skips `tick` and its `clock`, so the battle,
  effects and the auto-pick countdown all wait. The button sits above the level-up overlay (depth
  `UI_DEPTH + 15`) so it works while choosing, and hides after a fall. Shooting is automatic. A dimming rectangle under each overlay is
  interactive, so taps on the battle are swallowed.
- **Skill book:** after each `tick`, `GameScene.discover` adds every id in `choices` and `ranks`
  to `found` (so an old save's upgrades count as found) and saves it when it grew.
- **Rendering:** sprites are diffed by id. `foes` and `missiles` are `Map`s of images, and crit
  texts are `crits`. Each is created, updated or destroyed to match the state every frame.
  Health bars, flames, blasts, bolts and the HUD are `Graphics` that are cleared and redrawn every
  frame. `LevelUp.show` only rebuilds its cards when the choices, their ranks, the level or the
  picks left change, and `SkillBook.show`
  only rebuilds its slots when what is found or taken changes.

### State model

- `GameState` (`src/game/state.ts`) has two halves. The progress fields (`level`, `xp`, `ranks`,
  `levelUps`, `bestWave`, `runs`) form `Progress`. The run fields are `wave`, `phase`
  (`'break' | 'fighting' | 'over'`), `breakMs`, `toSpawn`, `spawnMs`, `barricade`, `enemies`,
  `missiles`, `effects`, `cooldown`, `choices`, `pickMs` (time left to pick before the auto-pick),
  `kills` and `nextId`.
- `Enemy` holds its position, `hp`/`maxHp`, boss `bars`, slow and burn timers, `attacking` and
  `hitMs`. `Missile` is an arrow or a fireball with a homing `target`, a `hit` list and `pierce`.
  `Effect` is a short-lived visual with `ms`/`total`.
- Hero stats are never stored. `stats(state)` derives them from `ranks` each time. `pick` counts
  the `mend` filler in `ranks` too (for the skill book); `stats` ignores it and `offerable` never
  offers a filler, so its rank changes nothing else.
- Only `sim.ts` mutates state during play. The scene only replaces it wholesale (`newRun`,
  `fightAgain`) and calls `offer` on load when level-ups are pending.
- **Invariants:** `choices` is set while `levelUps > 0`, and the battle is frozen then. Every
  place that sets `choices` (`offer`, `fightAgain`) also resets `pickMs` to `AUTO_PICK_MS`, so
  each level-up gets the full 10 seconds. The countdown also stops while the run is over. In
  `moveEnemies` a foe hacks at the standing barricade only when it is at the face (at most one
  substep's walk past it); a foe that got behind it while it was down keeps walking after a repair
  (Stout Timber or Mend), and any live foe reaching `HERO_FRONT` ends the run (one that burns to death on that substep does not). Foe,
  missile and effect ids share the one `nextId` counter. A boss's `maxHp` is its per-bar health
  times `bars`. Foes spawn at `SPAWN_X` plus their radius and are only targeted once
  `x < VIEW_RIGHT` (950).

### Persistence

Three `localStorage` keys. `palisade-skill-book` holds a JSON array of the upgrade ids found
(offered on a level-up, or held), read by `loadFound` (unknown ids dropped) and written by
`GameScene.discover` whenever one is new; "New hero" leaves it alone. `palisade-speed` holds the
battle speed (`'1'` or `'2'`, through `loadSpeed`/`saveSpeed`), kept apart so "New hero" leaves it
alone. `palisade-progress` holds JSON of `Progress`. `loadProgress` merges it over `freshProgress()`
and falls back to fresh on any error. "New hero" calls `clearProgress`. The run itself (wave, foes,
barricade) is never saved, so a reload starts at wave 1.

### Randomness and timing

- `Math.random` is used in exactly five places, all in `src/game/`. In `sim.ts`: `spawn` (a foe's
  y), `arrowHit` (crit roll, called on every arrow hit even at 0% crit), `rollChoices` and the
  auto-pick in `tick` (only when the countdown runs out). In
  `waves.ts`: `waveFoes` (shuffle). Art uses its own `seeded` generator, so it does not touch the
  sequence.
- Time comes only from Phaser's frame timestamp in `GameScene.update`. There are no timers or
  `Date.now`.

### Data tables

Foe stats are in `ENEMIES` (`enemies.ts`). Wave size, health scaling, spawn gaps, boss cadence and
break lengths are in `waves.ts`. Upgrade names, texts, ranks and prerequisites are in `UPGRADES`
(`upgrades.ts`), and their numbers are in `stats` (`state.ts`). The barricade base
(`BASE_BARRICADE_HP`), the level curve (`xpToNext`) and field geometry are also in `state.ts`.
The difficulty multiplier on foe health is in `foeHp` (`waves.ts`).
Missile speeds, `LEAP_RANGE`, `BARRICADE_REPAIR` and effect durations (`EFFECT_MS`) are in
`sim.ts`.

### Hub settings

- `src/main.ts` calls `setupGame(game)` from `shared/setupGame.ts` right after creating the game.
  It applies the frame cap (skipped animation frames count towards the next frame's `dt`), the FPS
  readout and reduced motion for camera shake and flash. Palisade uses neither shake nor flash.
- **Difficulty:** `byDifficulty` scales one number, foe health. `foeHp` in `src/game/waves.ts`
  multiplies `ENEMIES` hp times `hpScale(wave)` by `byDifficulty(0.75, 1, 1.3)` (easy, normal,
  hard) before rounding, so it covers every foe and each boss bar. Nothing else changes.
- **Reduced motion:** `GameScene.drawFoes` also reads `settings.reduceMotion` to hold its tint
  blinks still: a hit foe stays a steady white instead of blinking, and a burning foe a steady
  orange tint instead of flickering.
- Keep Normal exactly as designed (multiplier 1): the playthrough runs on Normal, and how its
  wave 1 plays out depends on foe health.
- Keep the Palisade row of the difficulty table in the root README ("foes have 25% less health",
  "foes have 30% more health") and the matching line in this game's README in sync with the
  multipliers.
- The settings live under the `hub-settings` storage key, written by the hub and read once when the
  page loads, not in `palisade-progress`.

## Testing hooks

- In dev, `src/main.ts` sets `window.game`. The test reads
  `game.scene.getScene('Game').state` (JSON-cloned) and `.levelUp.cards` (`CardSpot` id, x, y,
  w, h). It never writes to the game.
- **Inputs:** the test only advances the clock and clicks the centre of a card, scaled from the
  960-wide view to the canvas box. It never opens the upgrade list (not part of the first
  round's loop); `.skillBook.open` and `.found` are there to read if a test ever does. Nor does it touch
  the speed switch: with no `palisade-speed` saved the game plays at 1x. Keep the "Skill book"
  button clear of the cards, since it sits above the level-up overlay.
- **What it checks:**
  - A fresh hero: level 1, no ranks, wave 1, phase `'break'`, a full barricade.
  - Wave 1 is exactly 3 goblins and 3 orcs, with an orc first.
  - An arrow is fired and hits.
  - Earned experience equals the summed foe `xp`.
  - The first level-up lands at level 2 with three distinct choices that match the card ids, and
    the foes do not move while it waits. `pickMs` counts down (by more than 0.9 s over the 1 s
    wait) and stays above 0, so the tap beats the auto-pick; the auto-pick itself is not played.
  - Tapping the first card sets that rank to 1.
  - At most two more level-ups in wave 1, then wave 2 in `'break'` with `bestWave` 1, 6 kills,
    18 experience earned and the barricade above 0.
- **Mirrored in the test:** `VIEW`, each foe's `xp`, `xpToNext`, the wave 1 makeup and the field
  names of `GameState`, and `AUTO_PICK_MS`. A change to `ENEMIES` xp, `xpToNext`, `waveFoes` for wave 1, `VIEW`
  or those state fields needs a test update in the same PR.
- **Seeded random:** the test seeds `Math.random`. The upgrades offered, and so the card tapped,
  depend on the exact sequence of random calls. The exact-experience checks only hold if no
  tapped card is Battle Lore (`lore` changes `xpGain`). Adding a random call, or reordering
  `UPGRADES`, can change which card comes first. Rerun the test after any such change.

## Making common changes

- **Add an upgrade:**
  1. Add its id to `UpgradeId` and an entry to `UPGRADES` (with `requires` for a follow-up).
  2. Put its effect in `stats`, and read the new stat in `sim.ts`.
  3. Draw an icon in `ICONS` in `src/art/icons.ts`, adding to `Icon` if it is new.
  4. Add a row to the README table.
- **Add a missile or weapon:** do everything for an upgrade, then:
  1. Add a cooldown to `GameState.cooldown` and `newRun`.
  2. Fire it in `shoot` in `sim.ts`, and if it flies, add its kind to `MissileKind`, handle it in
     `launch` and `moveMissiles`, and pick its texture in `GameScene.drawMissiles`.
  3. Draw it in `bakeMissiles`.
- **Add a foe:**
  1. Extend `EnemyKind` and `ENEMIES`.
  2. Add its rows, legs and palette to `FOES` in `src/art/characters.ts`, or a custom bake like
     `bakeTroll`.
  3. Add it to `waveFoes`. Keep wave 1 unchanged, or update the test.
- **Retune balance:** use the tables listed under Data tables. Anything that changes wave 1 (foe
  xp, foe count or the level curve) changes the playthrough's expectations.
- **Move HUD or overlay elements:** edit `src/scenes/layout.ts`. The rules' own positions are in
  `state.ts`, and the two must agree: `HERO_FEET` and `BARRICADE` are drawn to line up with
  `BOW`, `HERO_FRONT` and `BARRICADE_FRONT`.

## Gotchas

- Positions live in two places. The rule geometry is in `state.ts`, and the draw positions are in
  `layout.ts` and partly hard-coded in `GameScene` (the barricade bar at x 232, the banner at
  y 170, the game-over panel). Moving the barricade art means moving `BARRICADE_FRONT` too.
- `armor` only reduces arrow, burst and fireball hits (`hurt(..., true)`). Burning and lightning
  ignore it. Damage after armour is at least 1.
- Experience can be fractional with Battle Lore. The HUD floors it, and the state keeps the
  fraction.
- `fightAgain` keeps any pending `choices`. `GameScene.create` rolls choices on load when
  `levelUps > 0`, so a saved hero can open on a level-up overlay.
- Storage is shared with the other games on the hub's origin. Keep any new key prefixed
  `palisade-`.
