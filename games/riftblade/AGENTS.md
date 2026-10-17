# Riftblade: guide for agents

How this game is built and where it stands, for agents about to change it. `README.md` covers how
to play and the upgrade tables. Per the root `AGENTS.md`, keep this file up to date in the same PR
as any change to the game.

## Current state

A survivor-style auto-attack roguelike, landscape 960x540. A run is the Rift Crusade: four planets
(Dune, Swamp, Ice, Lava) of five minutes each, every one ending in its boss, with a star map
between them.

- Implemented: a hero select screen with twelve heroes in a 6x2 grid and a detail panel with a
  Fight button: three soldiers (Captain Rook, Legionary TR-9, Corporal Bram-17), seven blade
  knights (Kael Varro, Lord Vharn, Master Oom, Elder Corvin Hale, Regent Veyl, Kresh the
  Twinblade, Master Joren Vask) and two more Blaster heroes, Commander Elara Voss and Triad-77.
  Only TR-9 is open on a fresh save; every other hero is unlocked by a deed (`checkDeeds`), never
  shown in the game: a locked card is a dark placeholder (`rb-locked`, no art, name or colour) and
  its detail panel says only "Locked". A deed done mid-run pauses the game on the new hero's panel
  until Continue. Each hero has an auto-attacking weapon, a
  signature move (Space or the round button) and three five-tier paths. Pools by weapon class
  and side: Blaster (8 skills: soldiers, Elara, Triad-77), Blade (6, knights), Current (4: Kael, Oom, Corvin,
  Joren) and Hollow (4: Vharn, Veyl, Kresh, and Kael once he takes The Fall); Joren may also draw
  Lightning Arc. The shared Gear deck (8 pieces), the 5-ability and 4-gear limits, level-ups with
  three cards (four for Elara, her Hope; at least one of the hero's own paths while any are left,
  the Field Ration as filler), 36 capstones and 13 crossovers (the cards show a link icon); gold-ringed elites with
  chests and credits, ring waves at 1:30, 3:00 and 4:15 on every planet.
- Four factions: Scrap droids (Clankers, Rollerbombs; the Grinder Crawler), wild beasts (mire rat
  packs, spitter toads with slowing globs; the Bog Mother with globs, young and bog pools), the
  Iron Dominion (line trooper squads firing volleys, walker gunners; the Siege Walker with volleys,
  artillery barrages behind ground warnings and stomps) and the Hollow cult (ash acolytes that
  burst into embers, fallen knights with a frontal shield and dashes; the Hollow Champion with
  marked blade dashes and, below half health, rings of fire with gaps), plus lava vents.
- Between planets: collecting what is left, credits, the star map with 2-3 nodes (trader, elite
  arena, rest, event; four events), free arena picks, the escort droid. The hero, level, kit and
  allies carry over; the clock resets per planet. Victory after the Lava boss; the end screen
  names the planet reached. Saved longest run, wins and furthest planet per hero, and the heroes
  unlocked.
- The field is endless: the camera follows the hero, foes spawn on a ring just off screen and
  ones left far behind are brought round ahead again.
- Sound effects and music (see Sound below).
- Not built yet: Watch AI.
- No TODOs or FIXMEs in the code.

## Architecture

### File map

- `src/main.ts`: creates the `Phaser.Game` (960x540, `Scale.FIT`) with `BootScene` then
  `GameScene`, calls `setupGame(game, { howToPlay })` and `setupScaling(game)`, and puts `game` on
  `window` in dev builds.
- `src/howToPlay.ts`: the How to play text in British English (which US English shares) and
  German, picked with `byLanguage`; update both when controls or the first round change.
- `src/i18n.ts` and `src/i18n/`: the game's texts (`shared/i18n.ts`). `i18n/en.ts` is the British
  English source, `i18n/de.ts` the German (with `keepEnglish` for the few texts that are the same)
  and `i18n/en-US.ts` the texts spelled differently in US English ("Plate Armor", "armored").
  `t(key, vars)` shows a text in the hub's language; `TextKey` types the keys. Every name and text
  in `heroes.ts`, `upgrades.ts`, `planets.ts` and the events is a `TextKey`, and every text on screen goes through `t` (in `sim.ts`, `blades.ts` and `squad.ts` it
  is imported as `tr`, since `t` is a common local name there). Floating texts are translated when
  they pop.
- `src/game/heroes.ts`: `HeroId`, `HERO_IDS` (select order), `PoolId`, `HEROES` (weapon numbers,
  aim mode, `pools`, `extra` pool skills, signature, paths, blurb, `short` name for the Fight
  button, the `pathKind` line of their path cards, `r`, `armour` and `locked`)
  and each hero's `schemes` (`HeroScheme`: `name`, `body`, `accent`, optional `mark`, `bolt`);
  `schemeOf(id, variant)` returns a scheme (Kael has a second, Fallen, used once he takes The
  Fall), `isKnight`. All hero colours come from here; each hero's accent is unique (Elara's red,
  Triad-77's white). `locked` marks a hero that needs a deed (all but TR-9); Triad-77's `maxHp`
  is the sum of its three droids' and its `r` the whole unit's.
- `src/game/upgrades.ts`: `UPGRADES` (every path, pool skill and gear piece, with five tier lines),
  `MAX_TIER`, `MAX_ABILITIES`, `MAX_GEAR`, `FILLER`, `CAPSTONES`, `CROSSOVERS`, `capstonesOf`,
  `crossoversOf`, `crossoverFor(id, hero)` and `capstoneFor` (card hints), `at` (per-tier tables),
  `POOL_NAMES` (the pools' card kind lines), `poolsOf` (the pools a hero draws from now), `canOffer`,
  `rollChoices` and `cardCount` (4 for Elara, else 3). Pool skills carry `pool`; a hero is only offered skills of `poolsOf` or its
  `extra`.
- `src/game/planets.ts`: `PLANETS` (per planet: name, faction, `foes` (the HUD's kill count, with
  plural forms), `elite` (its pop), `hp` / `spawn` / `dmg`
  multipliers, ring-wave kind, elite kinds, boss, ground colours), `BOSSES` (name, boss bar label,
  `beaten` line for the end screen, size, health, credits), the bosses' attack numbers (`BOG`, `SIEGE`, `CHAMPION`), `VENT`, `CREDITS`, `ARENA_MS`,
  `arenaElites`, `TRADE` (prices), `NODE_INFO` (star map nodes), `REST_HEAL`, `planetLabel`.
- `src/game/state.ts`: `GameState` and its parts (`Hero`, `Enemy`, `Bullet`, `Shard`, `Blast`,
  `Bomb`, `Fire`, `Ally`, `Pickup`, `Hazard`, `Pop`, `EventState`), the balance numbers (`RUN_MS`,
  `MAX_ENEMIES`, `MAX_SHARDS`, `ENEMY` for every foe kind, `ELITE`, `ROLLER`, `RATS`, `TOAD`,
  `LINE`, `WALKER`, `EMBER`, `KNIGHT`, `BOSS`, `WAVES`, `SPAWN_RING`, `LEASH`, `PICKUP_R`, `HERO_R`),
  `DIFF` (difficulty), `freshState`, `xpFor`, `statsOf` (the hero's numbers from upgrades and
  `maxHpMod`, with `squadMods` for Elara and Triad-77), `droidCount` and `droidMax` (Triad-77's
  droids and their health), `refreshUnlocks` and `clock`. `Droid` and `Flag` are Triad-77's droids
  (`state.droids`, `formation`, `scrap`) and Elara's signal flag (`state.flag`, `supplyWorld`).
- `src/game/sim.ts`: the rules of a fight. `startRun`, `choose` / `nextPick` (free picks first,
  then level-ups, then `state.after`), `raise` / `lower` (a tier up or down), `tick` (splits a frame
  into steps of at most 16 ms), and per step: the foe grid (`near`, `nearest`, `swarmSpot`), the
  hero (`moveHero` with slows, `hurtHero` with `HURT_GRACE_MS`, `signature`), weapons (`bolt`,
  `volley`, `primary`, which aims at a boss in range first), every upgrade (`abilities`, `syncAllies`, `moveAllies` with the escort),
  foes (`director` with `spawnRate` and `spawnGroup` per faction, `spawnElite`, `moveEnemies` with
  each kind's behaviour, `bossAttacks` per boss, `detonate`), hazards (`hazards`, `inRingGap`),
  damage (`damage` with the knight's guard, `kill`, `explode`), bolts, bombs, fire and pickups
  (`gainXp`, `openChest`, `collectAll`). The arena ends at the end of `step`. Exports
  `suppressorLength`, `suppressorHalf`, `shieldHalf`, `phalanxSpots` and `angleDiff` for drawing,
  and `stats`, `near`, `nearest`, `swarmSpot`, `bolt`, `volley`, `ready`, `knock`, `damage`,
  `explode`, `addBomb`, `heal` and `SHORT_LIVED` (allies gone after a fight) for `blades.ts`,
  `squad.ts` and `voyage.ts`. Knight code runs only when the hero `isKnight`, squad code only for
  Elara and Triad-77, so the soldiers' `Math.random` order is unchanged. `hurtHero` takes where a hit
  came from (Triad-77's nearest droid takes it). TR-9's Drop Squad troopers (`legionary` allies)
  land with a drop pod (an `orbital` bomb) in `syncAllies`. Foes with `charmMs` (Persuasion's
  turned foes and the Diplomat's confused ones) fight other foes in `turned`.
- `src/game/blades.ts`: everything the knights do, called from `sim.ts`: `knightMods` (their
  `statsOf` numbers: reach, dodge, signature cooldown, Temper, Rage and the like), `knightAttack`
  per aim mode (`slash`, `throw` boomerang blades, `ripple`, `spin`, `chain` lightning, `orbit`,
  `flurry`), `knightSignature`, `knightAbilities` (every knight path and Blade, Current and Hollow
  skill), the knights' allies (`knightAllies`, `moveKnightAlly`: starfighters, co-pilot, spirits,
  puppets), hooks for kills, heals and hits (`onKill`, `healFactor`, `onHurt`, `rescue`,
  `knightGuard`, `foeMod`, `contactMod`), `orbitBlades`, `bladeColor` and `heroVariant` for
  drawing, and `checkDeeds` (every hero's unlock deed, into `state.deeds`; `DEEDS` holds Elara's
  and Triad-77's numbers). Slashes and lightning are
  `state.slashes` / `state.zaps`, drawn by `GameScene` (lightning jitters from a hash).
- `src/game/squad.ts`: Elara Voss and Triad-77, called from `sim.ts` like `blades.ts`:
  `squadAttack` (Elara's pistol on the `weakest` foes; `triadVolley`, each droid at the nearest foe
  in its own sector in Spread, all at one in Column), `squadSignature` (Call for Aid: the flag and
  12 `carpet` bombs round it, Diplomat confusion; Formation Shift and Hive Signal's bursts),
  `squadAbilities` (the flag's bubble and confusion, the bike, the Uprising supply drop; droids
  walking to `droidSpots` and being rebuilt), `syncSquad` (droids and health in line with the
  upgrades: the hero's health is the sum of its droids'), allies (`squadAllies`, `moveSquadAlly`:
  commandos, `bike`, `medic`, `shieldbot`, `command`, `spare`; `droneSpot` for Eyes in the Sky) and
  hooks (`squadHurt`, `hurtFactor`, `squadHeal`, `squadCrit`, `turnedBonus`, `squadKill`,
  `squadBlock`, `bubble`, `rebuildTime`). `AID`, `BUBBLE` and `TRIAD` hold their numbers.
- `src/game/voyage.ts`: between fights. `frame` (tick, then `afterClear` and `nextPlanet` for the
  passing phases), `afterClear` (collect, credits, arena reward, map or victory), `rollNodes`,
  `chooseNode`, the trader (`priceOf`, `buy`, `reroll`, `leave`), the arena (`startArena`),
  events (`rollEvent`, `chooseEvent`) and `nextPlanet`.
- `src/game/save.ts`: `SAVE_KEY`, `loadProgress`, `saveProgress`, `recordRun`, `recordUnlocks`,
  `isUnlocked` (TR-9, a deed done, a hero the save shows as played, or the old world deeds) and
  `unlockedHeroes`.
- `src/audio/music.ts`: the songs (`PLANET_SONGS`, `MENU_SONG`, `STINGS`); `src/audio/sfx.ts`: the
  sound table `sfx`; `src/audio/cues.ts`: `SoundCues`, which plays them by watching the state (see
  Sound).
- `src/art/glow.ts`: `C` (palette), `hex`, `shade`, `paint` (a canvas texture at `sharpRes`),
  `glow`, `shape`, `beam`, `outline`.
- `src/art/factions.ts`: `bakeFactions` paints the later factions (`rb-mirerat`, `rb-toad`,
  `rb-linetrooper`, `rb-walker`, `rb-acolyte`, `rb-knight`, each with `-elite`), the bosses
  (`rb-boss-bogmother`, `rb-boss-siege`, `rb-boss-champion`, `-burning`), hostile bolts
  (`rb-bolt-glob`, `-volley`, `-slug`), `rb-escort` and `rb-credits`. Faction colours are `C.beast`
  / `C.toad`, `C.iron` / `C.ironLight`, `C.hollow` / `C.ember` in `glow.ts`, apart from the heroes'.
- `src/art/sprites.ts`: `bakeSprites` paints the first textures (keys start `rb-`): the heroes
  (`heroKey`, `portraitKey`, drawn by `drawHero` from the scheme), `rb-trooper`, `rb-brother`,
  `rb-legionary` (TR-9's Drop Squad troopers), `rb-commando`, `rb-medic` (Elara's rebels, drawn by
  `rebel` in `squad.ts`), the droids (`rb-clanker`, `rb-clanker-elite`, `rb-roller`, `-armed`,
  `-elite`, `rb-boss`), bolts (`rb-bolt-<HeroId>`, `-drone`, `-heavy`, `-rocket`, `-shell`),
  shards, `rb-medkit` (a green cross), `rb-chest`, `rb-drone`, `rb-charge`, `rb-grenade`, `rb-crate`, `rb-shadow`.
  Every scheme is baked: `heroKey(id, variant)` is `rb-hero-<id>` or `rb-hero-<id>-<variant>`.
- `src/art/squad.ts`: `drawSquadHero` (Elara and the Triad-77 portrait; `drawHero` hands them to
  it), `droid`, `rebel` and `bakeSquad`: `rb-droid`, `rb-droid-down`, `rb-bike`, `rb-shieldbot`,
  `rb-command`, `rb-pod` (TR-9's drop pod) and `rb-locked` (the locked hero placeholder).
- `src/art/knights.ts`: `drawKnight` (the knights, from their scheme; `drawHero` hands knights to
  it) and `bakeKnights`: the blades (`bladeKey`, `rb-blade-<id>`), `rb-fighter`, `rb-copilot`,
  `rb-spirit`, `rb-puppet`, `rb-wreck`, `rb-ship` and `rb-bolt-fallen`.
- `src/scenes/layout.ts`: `VIEW`, `CENTER`, HUD places (`XP_BAR`, `HP_BAR`, `KIT`, `TIMER`,
  `LEVEL`, `PLANET_TAG`, `CREDITS_TAG`, `BOSS_BAR`, `SIG_BUTTON`, `STICK`), card rectangles
  (`heroCardRect` for the 6x2 grid, `levelCardRect` with `LEVEL_CARD4` for four cards, `UNLOCK` and
  `CONTINUE` for the new hero panel, `mapNodeRect` / `mapNodeSpot`, `tradeCardRect`, `REROLL`,
  `LEAVE`, `eventOptionRect`, `AGAIN`), `DEPTH`, `inside`.
- `src/scenes/GameScene.ts`: owns `state`, reads input, runs `frame`, follows the hero with the
  camera and draws: the planet's ground (`drawGround` with `duneCell`, `swampCell`, `iceCell`,
  `lavaCell`, scenery from a hash, so the rules' `Math.random` is untouched), graphics layers under
  and over the sprites (hazards, warnings, knight shields, dash lines, rings of fire), image pools
  per layer (bolts and foes drawn with additive blending), floating texts and the HUD (planet tag
  and credits). `splitHudCamera` keeps the HUD fixed. The panel is rebuilt whenever `panelKey`
  changes.
- `src/ui/panels.ts`: `Panel` (HUD objects plus tappable `spots`) and `heroSelect` (12 cards from
  `heroCardRect`, keyed by `heroKeyLabel`, and the detail panel `HERO_DETAIL` with the `FIGHT`
  button; a locked hero shows only `rb-locked`), `unlockPanel` (the new hero, with a `continue`
  spot), `levelUp` (also the arena reward; three or four cards whose lines flow down; pool labels
  from `POOL_NAMES`, `linkIcon` for crossovers), `starMap`, `trader`, `eventPanel`, `endScreen`.

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
`panel.spots`. On the hero select, tapping a card (or 1-9, 0, then - and = for the last two) sets
`GameScene.chosen` and tapping Fight (or Enter) starts the run, if the hero is unlocked. At a
level-up 1-4 pick a card (as many as there are); elsewhere 1/2/3 pick (a node, an offer or an
answer), 4 rerolls at the trader, Enter leaves the trader or runs again. While `GameScene.unlocking`
holds heroes just unlocked, `frame` is not run, the new hero panel shows, and Continue, Enter or
Space closes it.

### Save keys

- `riftblade-progress`: `{ bestMs, wins: { [heroId]: count }, furthest: { [heroId]: planet 1-4 },
  unlocked: HeroId[] }`. `bestMs` is the whole run's time (`runMs`). Older saves without
  `furthest` load with `{}`, without `unlocked` with `[]`; unknown ids are dropped. A hero with a
  `furthest` world is open (so saves from when Rook and Bram were free keep them), and the deeds
  of reaching a world (Kael, Veyl, Joren) also count from `furthest`. `GameScene` saves new
  `state.deeds` with `recordUnlocks` as they happen.

### Difficulty and reduced motion

`DIFF.hp` (0.75 / 1 / 1.35) scales foe and boss health, `DIFF.spawn` (0.75 / 1 / 1.25) the spawn
rate, on every planet. With `settings.reduceMotion`, the walk bob, the rush spin, the hit swell and
the rising of floating text are off. Warnings fill steadily rather than blink. There is no camera
shake or flash.

## Sound

All sound goes through `shared/audio.ts` and is silent under browser automation. The sim has no
event list and imports no audio: `GameScene` calls `SoundCues.update(state)` after every frame,
which compares the state with the frame before and plays at most one of each sound per frame:
new bolts, slashes, zaps, bombs, blasts and hazards by id (`id >= nextId` of the frame before),
counts that went up (`kills`, `elitesKilled`, `chests`, `signatures`, `damageTaken`, `credits`,
`xp`, `capstones`, `crossovers`), `waves` and `nextElite`, a boss appearing or gone, and the phase.
Enemy bolts, blasts and hazards play only on screen. The scene plays the input sounds itself.

**Music** (`music.ts`): one song per planet, Dune in D minor (152 BPM), Swamp in E minor swung
(150, three steps a beat, via `swing`), Ice in B minor sparse (156) and Lava in C minor heavy
(160). Each has its own `calm` part, and `tense`, `boss` and `pad` written once in D minor and moved
into its key (`transpose`). `MENU_SONG` (90 BPM) has `select`, `map` and `shop`. `SoundCues.pickMusic`:
hero select `select`; a fight `calm`, `tense` for 25 s after a ring wave and in the elite arena,
`boss` while a boss lives; level-up cards mid-fight `pad`, between planets `map`; star map and
events `map`; trader `shop`; the end screen stops the music. `STINGS`: `cleared` (a boss falls or
the arena is won), `unlock` (a new hero), `win`, `lose`.

**Effects** (`sfx.ts`), and where they play:
- Hero bolts by colour (`boltSound`): `pistol` (Rook), `carbine` (TR-9), `spread` (Bram),
  `blaster` (Elara), `droidShot` (Triad-77, drones), `heavy`, `rocket`, `boomerang` (a spinning
  thrown blade), `saber` (The Fall's wave).
- Knights' swings, from new `slashes` by aim mode: `saber` (Kael and other slashes), `ripple`
  (Oom), `spinHum` (Corvin), `flurry` with `ping` on every tenth (Joren); `crackle` for new `zaps`
  (Veyl); `whir` every 0.7 s while a foe is near Kresh's staff.
- Signatures (`SIGNATURE`, on `signatures` going up): `sigHorn`, `sigPulse`, `sigToss`, `sigSlam`,
  `sigForce`, `sigDash`, `sigRing`, `sigStorm`, `sigFlare`, `sigShift`. A signature asked for that
  does not go off plays `ui('refuse')`.
- New bombs: `toss` (grenade, frag), `charge`, `whistle` (crate, orbital, carpet). New blasts:
  `boom` (radius 90 and up, louder with size) or `pop`.
- `kill`, `eliteKill`, `bossHit` (the boss's hit flash), `hurt`, `dodge` (a knight's Foresight),
  `barrier`, `heal` (health up by more than 8), `shard` (pitch rises with a combo), `chest`,
  `ui('coin')` for credits gained.
- `levelUp` (into the cards), `card` (a pick), `capstone`, `crossover`.
- `eliteHorn`, `siren` (ring wave), hazards `warn` (vent, shell), `stomp`, `fireRing`, `glob` (bog
  pool and toad globs), `enemyShot`, `enemyVolley` (volley and slug bolts), `bossStab`,
  `bossDown`.
- Between fights: `node` (star map), `ui('coin')` / `ui('refuse')` (trader buy), `reroll` /
  `ui('refuse')`, `event`, `warp` (on to a new planet or the arena), `ui('click')` for the hero
  cards, Fight, Leave, Continue and Run again, `ui('refuse')` for a locked hero.

To add a sound: add it to `sfx.ts`, then play it from `SoundCues` off a state change (keep the sim
free of audio) or from the scene's input handler.

## Testing hooks

- `window.game.scene.getScene('Game').state`: the `GameState`.
- `.panel.spots`: the cards of the panel showing (`id` is a `HeroId`, `fight`, an upgrade id, a
  node kind, `option-0` / `option-1`, `sold`, `reroll`, `leave`, `again` or `continue`), in game
  pixels. A locked hero card has `locked: true`. `.chosen` is the hero picked on the select screen
  (TR-9 at first), `.unlocking` the heroes waiting to be shown.
- The hero is always at `CENTER` (480, 270) on screen; `SIG_BUTTON` is at (890, 470).
- The playthrough (`e2e/playthrough.spec.ts`) checks the twelve cards (all but TR-9 locked on a
  fresh save), waits out Phaser's start-up easing on the select screen (140 frames; its first 120
  steps are cut short, so a run started during them would play differently depending on load
  time), taps Rook's locked card (no Fight button), then TR-9 and Fight, walks a circle by holding
  the mouse at a point turning once every 25 s, takes the first card at each level-up, fires Brace
  and plays to 60 s. It depends on: the hero card order, TR-9 being the open hero, his health,
  paths and Brace length, the layout above, and TR-9 surviving a minute of that walk on Normal.

## Making common changes

- **Add or change a text**: its key in `i18n/en.ts`, the German in `i18n/de.ts` (the build fails
  without it) and, when the US spelling differs (armour, colour), the US one in `i18n/en-US.ts`;
  run `node scripts/check-translations.mjs`. German runs longer: the star map's node texts (two
  lines), the card tier lines (two lines) and the signature button (its label shrinks to fit) are
  the tightest spots, so check a new text with `?lang=de`.
- **A new hero, planet or boss**: give its names and texts keys in the `i18n/` files too (a hero's
  `short` and `pathKind` (no deed text: deeds are never shown); a planet's `foes` and `elite`, a boss's `bar`
  and `beaten`).
- **A new hero colour scheme**: add it to the hero's `schemes` in `heroes.ts`; the art reads
  `schemeOf`. To use another scheme, change `schemeOf` (and bake per scheme if both are needed).
- **A new upgrade**: add it to `UPGRADES` (five tier lines, and `pool` for a pool skill),
  implement it in `statsOf` (a passive number) or `abilities` (something with a cooldown) in
  `sim.ts`, and add allies in `syncAllies`. For knights: `knightMods` and `knightAbilities` in
  `blades.ts`.
- **A new knight**: add its id to `HeroId` / `HERO_IDS`, its `HEROES` row (pools, a unique accent,
  `locked`), its texts in `i18n/` (name, short name, weapon, signature, blurb, path kind, and the
  paths' and capstones' names and tiers; no deed text, deeds are never shown), three paths in
  `UPGRADES`, its capstones, its art in `drawKnight`, its attack in `knightAttack` (or reuse an aim
  mode), its signature in `knightSignature` and its deed in `checkDeeds` (and `isUnlocked` if older
  saves should count), and the deed in the README. Then the select grid (`HERO_CARD` holds 12,
  keyed 1-9, 0, - and =) and the playthrough's card list. A Blaster hero with mechanics of its own
  goes in `squad.ts` the same way.
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
- **A new event**: add its id to `EventId`, its title, text and options (as `TextKey`s, with the
  texts in `i18n/`) in `rollEvent` and its effect in `chooseEvent` (voyage.ts).
- **A new planet or boss**: add a `PLANETS` row (and a `BossId` in `BOSSES` with its attacks in
  `bossAttacks` and texture `rb-boss-<id>`), its ground cell in `GameScene.drawGround`.

## Gotchas

- Painted textures with a glow halo darken whatever is under them in WebGL; bolts and droids use
  `BlendModes.ADD` for that reason. Don't draw filled ellipses in the shared graphics layers (they
  drew stray wedges in WebGL); the hero's shadow is a sprite.
- Phaser draws on `Math.random` for the id of every texture it makes, so baking more textures at
  boot shifts the seeded sequence the playthrough's run starts with (Rook's run then sees other
  droids and cards; the rules are unchanged).
- The playthrough's animation frames sit on a fixed grid of 64 ms (the fake clock's timers can fire
  late on a busy machine), so each step is the same length.
- The sim uses `Math.random` only for rules; the ground decoration uses its own hash, so drawing
  never shifts the seeded sequence the test relies on. The Dune world's spawning calls
  `Math.random` in the same order as before the other planets came, so keep it that way.
- Bosses are `kind: 'boss'` on every planet; which one it is comes from `PLANETS[state.planet].boss`.
  The boss's timers reuse `shellMs`, `spawnMs` and `modeMs` with a meaning per boss (see
  `bossAttacks`).
- `blades.ts` and `sim.ts` import each other. That works because each only calls the other's
  functions at run time; don't read the other module's values at load time (top-level constants
  built from imported values).
- The knights' random calls (crits, dodges, Persuasion) only happen when a knight is played (the
  same for Elara's and Triad-77's in `squad.ts`), and their pools are filtered out of a soldier's
  card roll before `Math.random` is used, so a soldier's seeded playthrough plays exactly as before.
- `squad.ts` imports `sim.ts` like `blades.ts` does; the same rule about load-time values holds.
- Triad-77's health lives in its droids: `p.hp` is recomputed from `state.droids` each step
  (`syncSquad`), so anything that changes it must go through `heal` or `hurtHero`.
