# Palisade: guide for agents

How Palisade is built and where it stands, for agents about to change it. `README.md` covers how to
play, the foes, the relics and the upgrades. Keep this file up to date with any change to the game,
as the root AGENTS.md asks.

## Current state

Palisade is a one-screen wave defense game in low-poly 3D. A ranger who cannot move shoots on
their own from behind a barricade at foes walking in from the right. Each kill gives experience
(more during a kill streak) and charges Arrow Rain, a volley the player drags onto the field; each
level-up pauses the battle on a pick of three upgrades, taking one at random after 10 seconds
without a tap.

- **Loop:** a break with the wave's banner, then the wave's foes come on one by one. Clearing it
  repairs a tenth of the barricade and starts the next break. Foes hack at the barricade, and once
  it is at 0 they walk on. The run ends when one reaches the hero (`phase` becomes `'over'`).
- **Road to the boss:** waves come in roads of ten (`waveTrack` in `waves.ts`), shown as a track
  under the top bar. The tenth wave of each road ends with its boss (`bossOf`: the Troll King, the
  Ogre Warlord, the Frost Giant, then round again) with stacked health bars. Clearing a boss wave
  opens the relic chest: a random relic (`RELICS`, a lasting bonus that stacks) goes into
  `relics`, and `relicFound` shows it during the next break.
- **Arrow Rain:** kills charge `rain.charge` up to `rain.need` (`rainNeed`: 4 on wave 1, one more
  every other wave, fewer with the Endless Quiver). When full, the button above the ranger is
  dragged onto the field and let go (or R / Space looses it on the thickest crowd); after
  `RAIN_FALL_MS` the volley hits every foe in an elliptical ring for 4x the arrow damage.
- **Kill streak:** each kill within `streakMs` (2.5 s, longer with the Streak Banner) of the last
  adds to `streak.count`; from two on every kill gives `streakBonus` (5% a kill, up to 50%) more
  experience, totalled in `streak.bonusXp`. Each kill pops "+N XP" (and "xN") and sends orbs to the
  experience bar, whose gold segment shows experience still in flight.
- **Progression:** level, experience, upgrade ranks, relics, pending level-ups, best wave and run
  count carry over between runs. Every run restarts at wave 1.
- **Screens:** there is one scene with the battle and HUD, plus overlays drawn over it: the
  level-up cards (`LevelUp`), the skill book (`SkillBook`, opened by the "Skill book" button in the
  top bar, with the relics along its bottom), the relic chest panel (during the break after a
  boss) and the game-over panel with "Fight again" and "New hero". There is no title or menu
  screen.
- **Rough edges seen in the code:**
  - `rollChoices` adds at most one `mend` filler, so with fewer than two upgrades left the level-up
    shows fewer than three cards. The README says the filler "fills the gaps".
  - `GameState.version` (`VERSION`) is never read, and the save holds no version, so there is no
    migration path (relics are merged over `freshProgress`, so older saves load with none).
  - Progress is only saved when the phase or wave changes, on a level-up and on a pick (tapped or
    auto). Experience and kills gained mid-wave are lost on a reload.
  - `HERO` in `src/game/state.ts` is unused (the scene draws the hero at `HERO_FEET`).
  - There is no sound, pause button or in-game settings panel (only the hub's shared settings, see
    Hub settings), and the hero has a single frame. Arrow Rain can be loosed during a break, when
    there may be no foes to hit.

## Architecture

### File map

- `src/main.ts`: creates the `Phaser.Game` (960x540 from `VIEW`, `pixelArt: false`, FIT scaling)
  with `BootScene` and `GameScene`, calls `setupGame(game)`, and puts `game` on `window` in the dev
  build.
- `src/game/`: the rules in plain TypeScript, with no Phaser imports.
  - `state.ts`: `GameState` and its parts (`Enemy`, `Missile`, `Effect`, `Volley`), field geometry
    (`FIELD`, `SPAWN_X`, `BOW`, `HERO_FRONT`, `BARRICADE_FRONT`), `xpToNext`, `stats` (all upgrade
    and relic effects), `streakBonus`, `STREAK_MS`, `RAIN_KILLS`, `rainNeed`, `newRun`, `Progress`,
    `progressOf`, `offerable`.
  - `sim.ts`: `tick` (the battle and the auto-pick countdown), `pick`, `offer`, `rollChoices`,
    `fightAgain`, `loose` (Arrow Rain), `crowdSpot`, `inRing`, `AUTO_PICK_MS`, `RAIN_FALL_MS`,
    `RAIN_RING`, and the private steps: spawning, shooting, missiles, volleys, damage, foe
    movement, kills (streak, rain charge, experience), wave clear with the relic chest, game over.
  - `enemies.ts`: the `ENEMIES` table of wave 1 stats per `EnemyKind`, the three bosses included.
  - `upgrades.ts`: the `UPGRADES` table, `UpgradeId`, `Icon` and `UPGRADE_IDS`.
  - `relics.ts`: the `RELICS` table, `RelicId` and `RELIC_IDS`.
  - `waves.ts`: `waveFoes`, `foeHp` (scaled by difficulty), `hpScale`, `bossBars`, `BOSSES`,
    `bossOf`, `waveTrack`, `isBossWave`, `spawnInterval`, break lengths.
  - `save.ts`: `loadProgress`, `saveProgress`, `clearProgress`, `loadSpeed`, `saveSpeed`,
    `loadFound`, `saveFound`.
- `src/scenes/BootScene.ts`: paints every texture, then starts `Game`.
- `src/scenes/GameScene.ts`: owns the `GameState`, ticks it each frame, draws the battle, the HUD,
  the wave track, Arrow Rain (button, drag arc, ring, falling volleys), the streak chip, the relic
  chest panel and the game-over panel, saves progress, handles restart and the 1x/2x speed switch
  (`speed`, at `SPEED` in the bottom bar).
- `src/scenes/layout.ts`: screen positions (`HERO_FEET`, `BARRICADE`, `XP_BAR`, `BOSS_BAR`,
  `TRACK`, `RAIN`, `RAIN_HINT`, `STREAK`, `CARDS`, `COUNTDOWN`, `SKILL_BOOK`, `SPEED`, `BUTTON`),
  `HUD_HEIGHT`, `UI_DEPTH`, `FONT` (a system font stack).
- `src/ui/LevelUp.ts`: the level-up overlay, its cards and the auto-pick countdown (seconds left
  over an emptying bar, at `COUNTDOWN`). It records each card's spot in `cards`.
- `src/ui/SkillBook.ts`: the "Skill book found/total" button in the top bar and the book it opens,
  a 3x6 grid with a slot for every id in `UPGRADE_IDS` order, and the relics won along the bottom.
  A slot not yet in `found` is an empty placeholder (a "?" frame and blank lines); a found one
  shows icon, name, rank of max (`Nx` for the `mend` filler, how many times it was picked) and
  `text`, dimmed at rank 0. Its `open` flag tells the scene to hold everything still.
- `src/ui/panel.ts`: the slate-and-gold look: `drawPanel` (a chamfered panel with a lit bevel and a
  gold edge, on a `Graphics`), `chamferPts`, `textStyle` and `makeButton`.
- `src/art/`: low-poly art painted in code on 2D canvases and added with `textures.addCanvas`.
  `lowpoly.ts` has the toolkit (`paint`, `poly`, `facet` for a flat-shaded part lit from the top
  left, `gem`, `softShadow`, colour helpers and the seeded generator `seeded`). `characters.ts` has
  the rigs (parts in local units, feet at 0,0) for the hero, foes and bosses, two walk frames per
  foe (`foeTexture`), `FIGURES` (each texture's feet origin and height) and the missiles.
  `scenery.ts` has the background (painted at double size and scaled down), the HUD bars and the
  barricade stages 0 to 3 (`BARRICADE_TEX`). `icons.ts` has the upgrade icons (`iconTexture`),
  relic icons (`relicTexture`), the chest, the boss marks (`bossNodeTexture`), the Arrow Rain
  button and small HUD icons. `palette.ts` holds the runtime colours, including `BAR` and
  `BOSS_BARS`.
- `shared/` (repo root, shared by every game): `shared/setupGame.ts` (`setupGame`) and
  `shared/settings.ts` (`settings`, `byDifficulty`). `waves.ts` and `GameScene` import
  `shared/settings.ts`, and neither file imports Phaser, so `src/game/` stays Phaser-free.

### How it runs

- **Boot:** `BootScene.create` calls `bakeScenery`, `bakeCharacters`, `bakeMissiles` and
  `bakeIcons`. These write canvas textures with keys like `background`, `hud-top`, `hud-bottom`,
  `barricade-N`, `hero`, `foe-<kind>-<frame>`, `arrow`, `arrow-fire`, `arrow-frost`, `fireball`,
  `rain-arrow`, `icon-<icon>`, `relic-<id>`, `chest`, `chest-open`, `node-<boss>`, `rain-ready`,
  `rain-charging`, `hud-flame` and `hud-book`. There are no asset files.
- **Tick:** `GameScene.update(time)` takes `dt` from the frame timestamp (not Phaser's smoothed
  delta), clamped to `MAX_STEP_MS` (250), then multiplies it by `speed` (1 or 2) unless a level-up
  is up, so the auto-pick countdown stays in real seconds. It calls `tick(state, dt)`, which runs
  `step` in substeps of at most `SUBSTEP_MS` (16) and stops while `choices` is set or the run is
  over. Only effects keep ageing then. While `choices` is set, `tick` counts `pickMs` down instead,
  and when it reaches 0 it calls `pick` with one of `choices` chosen by `Math.random`; any time left
  in the frame then goes on to the battle (or the next level-up's countdown). The scene keeps its
  own `clock`, used only for animation phases, pulses and blinking, and it stops during a pick and
  after a fall.
- **Order inside `step`:** age effects, count the streak down (ending it at 0), update
  `rain.need`, bring volleys down (`landVolleys`), then the break countdown or spawning, then
  `shoot`, `moveMissiles`, `moveEnemies`, and finally the wave-clear check. Arrows home, turning
  fully towards their target every substep. Every death goes through `removeDead`, which counts the
  kill, charges Arrow Rain, carries the streak, adds `death`, `xp` and `orb` effects and calls
  `gainXp`.
- **Input:** a tap on a level-up card calls `GameScene.pick`, which calls `pick` in `sim.ts`.
  Without a tap, `tick` picks after `AUTO_PICK_MS` (10 s). Arrow Rain: a `pointerdown` on the
  button's hit circle while `rainReady()` sets `aim`; the scene-wide `pointermove` moves it; a
  `pointerup` (or `pointerupoutside`) calls `loose(state, x, y)` if `onField` (right of the
  barricade, on the road) and clears `aim` either way. R and Space call `loose` at `crowdSpot`. A
  level-up, a fall or the open skill book clears `aim`. "Fight again" and "New hero" call
  `restart`. The "Skill book" button opens `SkillBook`; Back or a tap beside the book closes it.
  While it is open `GameScene.update` skips `tick` and its `clock`, so the battle, effects and the
  auto-pick countdown all wait. The button sits above the level-up overlay (depth `UI_DEPTH + 15`)
  so it works while choosing, and hides after a fall. Shooting is automatic. A dimming rectangle
  under each overlay is interactive, so taps on the battle are swallowed.
- **Skill book:** after each `tick`, `GameScene.discover` adds every id in `choices` and `ranks`
  to `found` (so an old save's upgrades count as found) and saves it when it grew.
- **Rendering:** sprites are diffed by id. `foes` and `missiles` are `Map`s of images, the crit and
  "+N XP" texts are `pops`, and each volley's falling shafts are `rainArrows`. Each is created,
  updated or destroyed to match the state every frame. A foe's texture origin and height come from
  `FIGURES`. Health bars, flames, blasts, bolts, death shards, orbs (`fx`, and `glow` with additive
  blending), the HUD (`hud`), the track (`trackG`) and Arrow Rain's button rim, arc and rings
  (`aimG`) are `Graphics` cleared and redrawn every frame. The experience bar's gold segment is the
  sum of the `orb` effects still flying (`inFlight`), and the orbs fly to the end of the blue fill.
  `LevelUp.show` only rebuilds its cards when the choices, their ranks, the level or the picks
  left change, and `SkillBook.show` only rebuilds when what is found, taken or won changes.

### State model

- `GameState` (`src/game/state.ts`) has two halves. The progress fields (`level`, `xp`, `ranks`,
  `levelUps`, `bestWave`, `runs`, `relics`) form `Progress`. The run fields are `wave`, `phase`
  (`'break' | 'fighting' | 'over'`), `breakMs`, `toSpawn`, `spawnMs`, `barricade`, `enemies`,
  `missiles`, `effects`, `cooldown`, `choices`, `pickMs` (time left to pick before the auto-pick),
  `kills`, `rain` (`charge`, `need`, `volleys`), `streak` (`count`, `ms` left, `best`, `bonusXp`),
  `relicFound` and `nextId`.
- `Enemy` holds its position, `hp`/`maxHp`, boss `bars`, slow and burn timers, `attacking` and
  `hitMs`. `Missile` is an arrow or a fireball with a homing `target`, a `hit` list and `pierce`.
  `Volley` is an Arrow Rain volley in the air (`x`, `y`, `ms` until it lands). `Effect` is a
  short-lived visual with `ms`/`total`; `xp` and `orb` carry `amount` (the kill's experience) and
  `xp` its `streak`.
- Hero stats are never stored. `stats(state)` derives them from `ranks` and `relics` each time.
  `pick` counts the `mend` filler in `ranks` too (for the skill book); `stats` ignores it and
  `offerable` never offers a filler, so its rank changes nothing else.
- Only `sim.ts` mutates state during play. The scene only replaces it wholesale (`newRun`,
  `fightAgain`), calls `offer` on load when level-ups are pending, and calls `loose`.
- **Invariants:** `choices` is set while `levelUps > 0`, and the battle (streak timer and volleys
  included) is frozen then. Every place that sets `choices` (`offer`, `fightAgain`) also resets
  `pickMs` to `AUTO_PICK_MS`, so each level-up gets the full 10 seconds. The countdown also stops
  while the run is over. `rain.charge` never exceeds `rain.need`; `loose` refuses unless it is full,
  no level-up is up and the run is not over, and clamps the spot to the road in front of the
  barricade. `streak.bonusXp` is exactly the experience given beyond each foe's `xp * xpGain`.
  `relicFound` is set by `clearWave` on a boss wave and cleared when the next wave starts. In
  `moveEnemies` a foe hacks at the standing barricade only when it is at the face (at most one
  substep's walk past it); a foe that got behind it while it was down keeps walking after a repair
  (Stout Timber or Mend), and any live foe reaching `HERO_FRONT` ends the run (one that burns to
  death on that substep does not). Foe, missile, volley and effect ids share the one `nextId`
  counter. A boss's `maxHp` is its per-bar health times `bars`. Foes spawn at `SPAWN_X` plus their
  radius and are only targeted once `x < VIEW_RIGHT` (950).

### Persistence

Three `localStorage` keys. `palisade-skill-book` holds a JSON array of the upgrade ids found
(offered on a level-up, or held), read by `loadFound` (unknown ids dropped) and written by
`GameScene.discover` whenever one is new; "New hero" leaves it alone. `palisade-speed` holds the
battle speed (`'1'` or `'2'`, through `loadSpeed`/`saveSpeed`), kept apart so "New hero" leaves it
alone. `palisade-progress` holds JSON of `Progress`, relics included. `loadProgress` merges it over
`freshProgress()` (dropping unknown upgrade and relic ids) and falls back to fresh on any error.
"New hero" calls `clearProgress`, which also drops the relics. The run itself (wave, foes,
barricade, Arrow Rain charge, streak) is never saved, so a reload starts at wave 1.

### Randomness and timing

- `Math.random` is used in exactly six places, all in `src/game/`. In `sim.ts`: `spawn` (a foe's
  y), `arrowHit` (crit roll, called on every arrow hit even at 0% crit), `rollChoices`, the
  auto-pick in `tick` (only when the countdown runs out) and the relic chest in `clearWave` (only
  on boss waves). In `waves.ts`: `waveFoes` (shuffle). Arrow Rain and the streak use none. Art uses
  its own `seeded` generator, and the scene scatters a volley's shafts with a hash of its id, so
  neither touches the sequence.
- Time comes only from Phaser's frame timestamp in `GameScene.update`. There are no timers or
  `Date.now`.

### Data tables

Foe and boss stats are in `ENEMIES` (`enemies.ts`). Wave size, health scaling, spawn gaps, boss
cadence and order (`BOSSES`) and break lengths are in `waves.ts`. Upgrade names, texts, ranks and
prerequisites are in `UPGRADES` (`upgrades.ts`); relic names and texts in `RELICS` (`relics.ts`);
the numbers of both are in `stats` (`state.ts`). The barricade base (`BASE_BARRICADE_HP`), the
level curve (`xpToNext`), `streakBonus`, `STREAK_MS`, `RAIN_KILLS`, `rainNeed` and field geometry
are also in `state.ts`. The difficulty multiplier on foe health is in `foeHp` (`waves.ts`).
Missile speeds, `LEAP_RANGE`, `BARRICADE_REPAIR`, effect durations (`EFFECT_MS`), `RAIN_FALL_MS`,
`RAIN_RING` and `RAIN_DAMAGE` are in `sim.ts`.

### Hub settings

- `src/main.ts` calls `setupGame(game)` from `shared/setupGame.ts` right after creating the game.
  It applies the frame cap (skipped animation frames count towards the next frame's `dt`), the FPS
  readout and reduced motion for camera shake and flash. Palisade uses neither shake nor flash.
- **Difficulty:** `byDifficulty` scales one number, foe health. `foeHp` in `src/game/waves.ts`
  multiplies `ENEMIES` hp times `hpScale(wave)` by `byDifficulty(0.75, 1, 1.3)` (easy, normal,
  hard) before rounding, so it covers every foe and each boss bar. Nothing else changes.
- **Reduced motion:** `GameScene.blink` and `GameScene.pulse` read `settings.reduceMotion`. With it
  on, a hit foe stays a steady white instead of blinking, a burning foe a steady orange tint
  instead of flickering, and the glows that pulse (the charged Arrow Rain button, the streak chip,
  the current wave and boss marks on the track) hold still.
- Keep Normal exactly as designed (multiplier 1): the playthrough runs on Normal, and how its
  wave 1 plays out depends on foe health.
- Keep the Palisade row of the difficulty table in the root README ("foes have 25% less health",
  "foes have 30% more health") and the matching line in this game's README in sync with the
  multipliers.
- The settings live under the `hub-settings` storage key, written by the hub and read once when the
  page loads, not in `palisade-progress`.

## Testing hooks

- In dev, `src/main.ts` sets `window.game`. The test reads `game.scene.getScene('Game')`:
  `.state` (JSON-cloned), `.levelUp.cards` (`CardSpot` id, x, y, w, h), `.track` (`waveTrack` of
  the current wave: `first`, `last`, `boss`, `step`), `.rainSpot` (the Arrow Rain button's centre)
  and `.aim` (where Arrow Rain is being dragged, or null). It never writes to the game.
- **Inputs:** the test advances the clock, clicks the centre of a card, and drags Arrow Rain with
  `page.mouse` (down on `rainSpot`, three moves towards a foe with a step of game time after each,
  up), all scaled from the 960-wide view to the canvas box. It never opens the skill book (not part
  of the first round's loop); `.skillBook.open` and `.found` are there to read if a test ever does.
  Nor does it touch the speed switch or the keyboard: with no `palisade-speed` saved the game plays
  at 1x. Keep the "Skill book" button clear of the cards, since it sits above the level-up overlay,
  and keep the Arrow Rain button clear of other interactive objects.
- **What it checks:**
  - A fresh hero: level 1, no ranks or relics, wave 1, phase `'break'`, a full barricade, Arrow
    Rain at 0 of 4, no streak, and the track on step 1 of the road to the Troll King (1 to 10).
  - Wave 1 is exactly 3 goblins and 3 orcs, with an orc first.
  - An arrow is fired and hits.
  - The first kill: earned experience equals that foe's `xp` (a streak of 1 has no bonus), the
    streak is 1 with time running, Arrow Rain has 1 charge, and there is one `xp` pop and one
    `orb` for that amount.
  - Every "+N XP" pop seen while it plays is a goblin's or orc's `xp` times `1 + streakBonus`.
  - The first level-up lands at level 2 with earned experience equal to the foes' `xp` plus
    `streak.bonusXp`, three distinct choices that match the card ids, and the foes and the streak do
    not change while it waits. `pickMs` counts down (by more than 0.9 s over the 1 s wait) and
    stays above 0, so the tap beats the auto-pick; the auto-pick itself is not played.
  - Tapping the first card sets that rank to 1.
  - Arrow Rain charges to `need` 4 with a foe in view; dragging it sets `aim`, letting go spends the
    charge, leaves one volley at the release point, and once it lands there is a `rain` effect,
    the foe it was dropped on is gone and kills went up.
  - At most two more level-ups in wave 1, then wave 2 in `'break'` with `bestWave` 1, 6 kills, no
    relic, the barricade above 0, a best streak of 2 or more with `bonusXp` above 0, earned
    experience equal to 18 plus `bonusXp`, and the track on step 2.
- **Mirrored in the test:** `VIEW`, each foe's `xp`, `xpToNext`, `streakBonus`, `RAIN_KILLS`, the
  wave 1 makeup, the field names of `GameState` and `AUTO_PICK_MS`. A change to `ENEMIES` xp,
  `xpToNext`, `streakBonus`, `RAIN_KILLS` or `rainNeed` for wave 1, `waveFoes` for wave 1, `VIEW`
  or those state fields needs a test update in the same PR.
- **Seeded random:** the test seeds `Math.random`. The upgrades offered, and so the card tapped,
  depend on the exact sequence of random calls. The exact-experience checks only hold if no
  tapped card is Battle Lore (`lore` changes `xpGain`). Adding a random call, or reordering
  `UPGRADES`, can change which card comes first, and Arrow Rain's kills change how many arrows hit
  (each hit rolls for a crit). Rerun the test after any such change. Wave 1 depends on Arrow Rain
  being ready while a foe is still in view, and on a streak of two or more happening.

## Making common changes

- **Add an upgrade:**
  1. Add its id to `UpgradeId` and an entry to `UPGRADES` (with `requires` for a follow-up).
  2. Put its effect in `stats`, and read the new stat in `sim.ts`.
  3. Draw an icon in `ICONS` in `src/art/icons.ts`, adding to `Icon` if it is new.
  4. Add a row to the README table.
- **Add a relic:**
  1. Add its id to `RelicId` and an entry to `RELICS` in `src/game/relics.ts`.
  2. Put its effect in `stats` (read it with `relic('<id>')`).
  3. Draw its icon in `RELIC_ICONS` in `src/art/icons.ts`, and add a row to the README's relic
     table.
- **Add a missile or weapon:** do everything for an upgrade, then:
  1. Add a cooldown to `GameState.cooldown` and `newRun`.
  2. Fire it in `shoot` in `sim.ts`, and if it flies, add its kind to `MissileKind`, handle it in
     `launch` and `moveMissiles`, and pick its texture in `GameScene.drawMissiles`.
  3. Draw it in `bakeMissiles`.
- **Add a foe:**
  1. Extend `EnemyKind` and `ENEMIES`, and `SCALE` in `src/art/characters.ts`.
  2. Add its rig to `RIGS` (parts in local units, feet at 0,0, facing left) and bake it in
     `bakeCharacters`.
  3. Add it to `waveFoes`. Keep wave 1 unchanged, or update the test.
- **Add a boss:** do everything for a foe with `boss: true`, give it a body in `bossRig`, add it to
  `BOSSES` (which sets the order of the roads) and a mark in `marks` in `bakeIcons`, and add a row
  to the README's foe table. The track's title and the wave banner name it from `ENEMIES`.
- **Retune balance:** use the tables listed under Data tables. Anything that changes wave 1 (foe
  xp, foe count, the level curve, the streak bonus or window, or Arrow Rain's charge or damage)
  changes the playthrough's expectations.
- **Move HUD or overlay elements:** edit `src/scenes/layout.ts`. The rules' own positions are in
  `state.ts`, and the two must agree: `HERO_FEET` and `BARRICADE` are drawn to line up with
  `BOW`, `HERO_FRONT` and `BARRICADE_FRONT`.
- **Change the art:** every texture is painted in `src/art/` with the `lowpoly.ts` toolkit. Keep
  the light from the top left (`facet`, `gem`) and shadows to the lower right (`softShadow`). The
  background and barricade are painted in double units (as the approved mockup was) and scaled by
  half; figures are painted in rig units times `SCALE`.

## Gotchas

- Positions live in two places. The rule geometry is in `state.ts`, and the draw positions are in
  `layout.ts` and partly hard-coded in `GameScene` (the barricade bar at x 232, the banner and
  relic panel at y 170, the game-over panel, the top bar's texts) and in `scenery.ts` (the log at
  double-unit x 365, `BARRICADE_TEX`). Moving the barricade art means moving `BARRICADE` and
  `BARRICADE_FRONT` too.
- `armor` only reduces arrow, burst, Arrow Rain and fireball hits (`hurt(..., true)`). Burning and
  lightning ignore it. Damage after armour is at least 1.
- Experience can be fractional with Battle Lore, the Troll King's Crown or a streak. The HUD floors
  it, and the state keeps the fraction; the test compares it with `toBeCloseTo`.
- `fightAgain` keeps any pending `choices`. `GameScene.create` rolls choices on load when
  `levelUps > 0`, so a saved hero can open on a level-up overlay.
- During the break after a boss the wave has already moved on to the next road; the track shows
  the finished road (`waveTrack(wave - 1)`) while `relicFound` is set, but `GameScene.track` is
  always the current wave's.
- Storage is shared with the other games on the hub's origin. Keep any new key prefixed
  `palisade-`.
