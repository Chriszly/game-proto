# Space Wars: guide for agents

How Space Wars is built and where things stand, for agents changing it. README.md covers how to
play, the factions and the difficulty. Keep this file up to date with any change to the game, per
the root AGENTS.md.

## Current state

Space Wars is an RTS on a random star map, played with taps, box selection and a scrolling camera.
The battlefield is 1600 by 1000 pixels; the screen shows a 960 by 406 window of it between the top
and command bars. Five factions each start with a hub and two harvesters at a fixed start point.
The player picks one of the five factions on a picker before each battle; the other four are AI.
The art is a 1970s sci-fi paperback cover: low-poly 3D models baked into sprites at boot (see
`art/` below), an airbrushed backdrop and a chocolate-and-mustard HUD with cream pill buttons.

Implemented today:

- Random maps (`game/map.ts`): hubs at the fixed `START_POINTS` (`game/arena.ts`), each nudged up to
  36 px at random; three crystal nodes near each hub and 16 loose ones, 12 rock fields that block
  building, eight nebulae, 480 stars and three derelict stations. `beaconNode` picks the relay
  beacon's node (the world takes it out of `nodes`), so the map can keep nebulae and derelicts off
  the lane from the player's start to the beacon. Retries that keep them clear draw on a local
  generator (`localRandom`), so the map takes the same count from `Math.random` however many
  retries, and the stars and the battle's own randomness repeat as before.
- Nebulae (`World.inNebula`, `Unit.nebula`, `updateCover`): a ship inside one flies at 70% speed
  (`NEBULA_SLOW`) and is hidden from an enemy faction (`hidden`) unless that faction has a ship
  within 70 px (`NEBULA_SPOT`), a building within 70 px of its edge or claimed sensors in range, or
  the ship fired in the last 1.5 s (`revealMs`, shared with the cloak). `updateCover` works the
  cover out once an update into `spotted` (unit id to the factions that see it). Hidden ships are
  skipped by `nearestEnemy` and drop out of an attacker's order, so a chase into a nebula is lost
  until the chaser is close. The scene draws each nebula's edge as a faint dashed ring and the
  player's own hidden ships at 0.6 alpha.
- Veteran ships (`Unit.kills`, `Unit.lastHitBy`, `World.credit`, `rankOf`, `veteranBonus`): the ship
  whose shot landed last on a destroyed enemy ship (`lastHitBy`; turrets, mines and derelict guns
  give no credit) gets the kill, and at 3 and 8 kills (`VETERAN_RANKS`) it ranks up, Veteran then Ace
  (`VETERAN_NAMES`): +15% damage and hit points per rank (`VETERAN_STEP`), the hull scaled on the
  spot like a hull research level. Gold chevrons above the ship show its rank, the hover label names
  it, and the player's rank-ups pop a notice.
- Repair and fall back (`REPAIR_RANGE`, `REPAIR_RATE`, `World.fallBack`, `sendHome`, `repairSpots`,
  `Unit.repairing`): any ship within 120 px of a finished hub, outpost or Depot of its faction gets
  back 3% of its hit points a second (a green cross beside it). The Fall back button at the right of
  the message line (`FALL_BACK_BUTTON` in `layout.ts`, kind `command`, also the F key) sends the
  selected ships to a point 30 px short of their nearest repair spot. The AI pulls a warship below
  30% (`AI_FALL_BACK_HP`) home when it is not on a raid, and leaves repairing ships out of raids.
- Derelict stations (`World.derelicts`, `Derelict`, `updateDerelict`, `DERELICT_DEFS`): three neutral
  wrecks per map, one of each `DerelictKind`: `sensors` (the owner sees 280 px round it,
  `SENSOR_RANGE`, stamped into the player's fog and spotting ships in nebulae), `shipyard` (it is a
  producer for the owner's combat units in `train`, beside its Barracks) and `gun` (it fires
  `DERELICT_GUN` at the owner's enemies within 170 px). A faction alone in the 60 px ring
  (`DERELICT_RADIUS`) with warships fills `claim` in 10 s (`CLAIM_MS`), draining a rival's claim first
  (which costs the owner the station), and owns it until another takes it; a fallen owner loses its
  stations. They show once the player has seen them (`derelictAt` for the hover label), cannot be
  destroyed or built beside, and the player can build at them only in the sense of training. From
  60 s (`AI_CLAIM_MS`) a rival with 3 warships sends one idle ship (`Side.claimer`) to the nearest
  station it does not own within 600 px of its hub (`contestDerelicts`), and frees it once the
  station is its.
- Truces and tribute (`Side.truceMs`, `offerMs`, `offerCooldownMs`, `grudgeLockMs`, `pressure`,
  `World.atPeace`, `acceptTruce`, `declineTruce`, `bribe`, `bribeTarget`, `considerTruce`,
  `updateTruce`): a rival whose grudge is the player offers a truce when its hub is under 75% or it
  has lost 3 ships to the player lately (`pressure`, fading one every 10 s), with 40 crystal of
  tribute (`TRUCE_TRIBUTE`); the offer stays open 25 s (`OFFER_MS`) and it waits 120 s before the next.
  Accepting gives 90 s (`TRUCE_MS`) of peace: `nearestEnemy`, `nearestEnemyBuilding`, mines, splash
  and the AI's raid target all skip a faction at peace, and ships already sent at each other are
  called off. A player command to attack a rival under truce breaks it. Tribute (`BRIBE_COST` 60)
  turns a rival's grudge onto the living faction nearest its hub (other than the player) for 60 s
  (`BRIBE_MS`): hits do not move the grudge while `grudgeLockMs` runs, and its ships already sent at
  the player turn on that faction's hub. The rivals panel (`RIVALS_PANEL` in `layout.ts`,
  `GameScene.rivalsOpen`, `rivalButtons`, `drawRivals`) opens from the rivals area of the top bar
  (`RIVALS_TAB`, which glows while an offer waits) or with T, and shows each rival's grudge, truce or
  offer with Accept, Decline and Tribute buttons; a hint on the map's top right names an open offer.
  No offers or panel in watch mode.
- Harvesting: harvesters seek the crystal nearest their home hub (`Unit.home`: the hub or outpost
  that trained them), mine it, carry it to the nearest hub, outpost or depot of their faction and
  deposit it. Nomad Freight carries 14 a trip, the others 10.
- Fog of war (`game/fog.ts`, stamped in `World.updateFog`): a 10 px grid of `explored` and
  `visible` cells for the player only. Ships see `sight` times 1.2 (scouts 1.6), harvesters 80 px,
  the hub 175 px and other buildings 110 px past their radius. Rival units show only in sight
  (`seesUnit`); rival buildings once seen stay drawn (`known`, `knowsBuilding`); crystal nodes,
  the beacon, shards, beams and fireballs show only where explored or in sight; the player can only
  build on explored ground. `entityAt` skips what the player can't see. The AI is not fogged.
- Expansions (`Build` = a building role or `'expansion'`, `expansionStats`): an outpost is a
  `Building` of type `hub` with `expansion: true`, drawn at 0.8 of the hub's size and named after
  the hub (`Sun Outpost`). 250 crystal, 18 s, 60% of the hub's hp; it goes within 120 px of a
  crystal node and 400 px or more from the faction's hubs. It trains harvesters and takes crystal,
  and buildings can go within 240 px of any finished hub (`hubsOf`). `hubOf` is the main hub
  only; only the main hub's fall ends a faction or counts for the `hubs` contract.
- Research (`game/research.ts`, `World.research`, `updateResearch`): hull, weapons and engines,
  three levels each (100, 160, 240 crystal times the faction's cost multiplier, 20 s at the hub,
  one at a time), each +10% to every ship's hp, damage or speed in `unitStats`. A hull level also
  scales ships already flying. State in `Side.research` (`levels`, `current`).
- Building: Depot, Barracks and Turret, each placed within 240 px of a hub on clear ground, built
  over time with a progress bar. A Turret shoots enemies in range. Each faction calls its Barracks
  something else (Solar Concord: Orbital Dock); the command bar shows the role under each name
  (`Barracks · 100`), and train and build messages name the faction's own building.
- Training: a harvester is queued at the hub; the combat units (scout, gunship, heavy) are queued
  at a finished Barracks, up to five at a time per building.
- Orders: move, attack a unit or building, and auto-attack anything in sight when a unit has no
  order. Harvesters are never ordered.
- AI (`World.think`, once a second per rival): keeps four harvesters (three more per outpost),
  builds a Depot, a Barracks and up to two Turrets, trains combat units up to 20, and after the
  opening 75 seconds sends its army (less its picket and two ships kept home) every 12 seconds,
  once the army reaches the difficulty's size, at the faction that hit it last (`Side.grudge`, set
  in `shoot`) or else the nearest enemy building, so rivals fight each other. From 120 s it
  researches its lowest track and from 150 s builds one outpost (`expand`) at a field away from
  every other hub, saving crystal for both (no training) once its army is big enough. Idle
  warships fetch their faction's shards within 360 px (`fetchSalvage`).
- Watch AI (`?watch`, `shared/watch.ts`): `newGame` skips the picker and starts
  `new World(layout, random pick, true)`. With `World.watch` the AI thinks for slot 0 too (and it
  can hold the beacon picket), the fog is lifted (`updateFog` fills it and knows every building,
  `seesUnit` shows every ship, cloaked or in a nebula),
  contracts don't run, and the battle ends with `phase` `won` once one faction is left
  (`World.winner`, a side index). The scene runs `update` `watchSteps()` times a frame, ignores
  taps except on the end overlay (which starts another battle), and the overlay names the winner.
  `think` reports builds, outposts, research and attacks to `aiLog`.
- Faction abilities (`Ability` in `game/factions.ts`, applied in `game/world.ts`): `cloak`
  (Phantom Blade, hidden from enemies until it fires for 2 s), `decoy` (Decoy Wraith drops a copy
  every 15 s that draws fire for 12 s and never acts), `hack` (Hack Frigate's hits disable a turret
  for 6 s, and `takeover` (6) hits in a row while it is dark make it the hacker's own turret, as
  damaged as it was: `takeOver`, counted in `Building.hacks`), `mines` (Veil Syndicate's Mine
  Lattice lays a hidden mine within 130 px every 8 s, up to 4, while not hacked: `World.mines`,
  `layMine`; an enemy ship within 16 px sets it off for 45 damage within 40 px: `updateMines`; a
  rival's mine is drawn only with a player ship within `MINE_SPOT` 60 px), `shield` (Halo Cruiser: friends within 70 px take half of each shot), `brood` (Brood
  Carrier spawns a scout every 12 s up to 6 scouts), `splash` (Siege Barge hits enemies within 28 px
  of its target for half damage), `salvage` (Nomad Salvage Yard pays 8 crystal per enemy unit
  destroyed within 200 px).
- Contract chain (`game/contracts.ts`, progress in `World.updateContract` and `World.score`): five
  contracts in a row (raise the Barracks; destroy 7 enemy ships; hold the relay beacon 60 s;
  destroy 3 enemy buildings; destroy a rival hub). Each pays its crystal reward and applies its
  rank perk to `sides[PLAYER].perks` (train time, turret range, ship speed, ship hit points, ship
  damage), which `unitStats` and `buildingStats` multiply in, then the next one starts. Progress
  counts only while a contract is current. Kills and razes count when the player's shot (`lastHit`
  on every unit and building) landed last. The top bar's pill and the command bar's panel show the
  current contract, its progress, reward and perk, and the next one.
- Relay beacon (`World.beacon`, `World.updateBeacon`): the loose crystal node nearest the point
  halfway from the player's start to the map's centre, at least 300 px from every rival start
  (`beaconNode` in `game/map.ts`), is taken out of `nodes` and becomes the beacon. A faction alone in its 70 px ring with warships
  fills `capture` in 5 s (draining a rival's first) and then owns it; the owner gets 3 crystal a
  second while one of its warships is in the ring (`held`). `paid` counts what it paid the player.
  It sits at least 200 px from the player's start, outside the hub's sight, so it starts hidden in
  the fog. Buildings keep clear of it. The two rivals whose hubs are nearest the beacon each send
  one idle warship (`Side.picket`) to contest or hold it (`World.contestBeacon`), the nearest from
  30 s on, the next from 120 s; a lost picket is replaced.
- Salvage (`World.shards`, `World.updateShards`): a ship destroyed by another faction (not a
  decoy) leaves a shard worth 8 for that faction (`Shard.faction`); the nearest unit of that
  faction within 260 px pulls it in at 220 px/s and banks it on contact (`salvaged` counts the
  player's). Shards fade after 45 s, and go with a fallen faction.
- Floating numbers and one-off notices: `World.pops` (+8 and +3 over the map, aged in `update`) and
  `World.events` (`notice` for the command bar, `gain` for the flash by the crystal count), which
  the scene empties each frame.
- Win: every rival hub gone. Lose: the player's hub gone. A fallen hub takes its faction's
  remaining units and buildings with it. A battle ends with a Victory or Defeat overlay; a tap starts
  a new map.

- Faction picker: a new map opens on a picker with a card per faction. Tapping a card starts the
  battle with that faction under the player's command (`World(layout, pick)`: it takes slot 0, the
  bottom-left start, and the others fill the rest in order). The world does not update while picking.
- Camera and hover: arrow keys and WASD scroll the map, H centres it on the hub, and hovering a unit
  or building shows its name, role, hit points and stats. Hovering a command button shows what it is
  (cost, stats, ability). Selecting one unit shows its name and hit points on the command bar.

Missing or rough:

- No pathfinding (units move in straight lines and pass over rocks), no unit
  collision, no sound and no save.
- No minimap and no edge scrolling: the map scrolls with the keys only.
- The rivals' Barracks and Turrets are placed at random within 60 to 150 px of their hub.
- Ships of a type spawn on the same spot and stack (no collision), so a fresh wing looks like one
  ship until it moves.
- The AI ignores contracts and sees through the fog (but not into nebulae). Rivals left alone wipe
  each other out fast: the centre faction usually falls first.
- Only the player makes truces and pays tribute; rivals never make peace with each other. The AI
  never bribes.
- The playthrough covers only the first round (harvest, raise a Barracks for the first contract,
  train three Lancers, find the beacon in the fog and take it, fight off its picket for salvage,
  attack a base). Purchases
  beyond that round, the other buildings and the other units are not played.

## Architecture

File map (`src/`):

- `howToPlay.ts`: the How to play screen's text (goal, controls, core loop and tips), handed to
  `setupGame(game, { howToPlay })` in `main.ts`; update it when the controls or the first round change.
- `main.ts`: creates the `Phaser.Game` (960x540, `Phaser.Scale.FIT`, `pixelArt: false`) with
  `GameScene`, calls `setupGame(game)` from `shared/setupGame.ts` and `setupScaling(game)` from
  `shared/scaling.ts`, and in dev builds puts `game` on `window`. The canvas has `renderScale`
  canvas pixels per view pixel (see "Screen scaling" below).
- `game/factions.ts`: the `FACTIONS` list (name, colours, `tune` multipliers, and the `units` and
  `buildings` definitions with their outlines and optional `ability`), `COMBAT_UNITS`, and the types
  `UnitId`, `Role`, `Poly`, `Weapon`, `Ability`, `UnitDef`, `BuildingDef`. The outlines (`shape`) are
  no longer drawn; the art comes from `art/models.ts`.
- `game/fog.ts`: `Fog` (`explored` and `visible` cells, `stamp`, `sees`, `knows`; `toJSON` gives
  only the explored share, so the test's state reads stay small), `FOG_CELL` (10), `FOG_COLS`,
  `FOG_ROWS`. No Phaser.
- `game/research.ts`: `TRACKS`, `TRACK_DEFS`, `RESEARCH_LEVELS`, `RESEARCH_STEP`, `RESEARCH_COSTS`,
  `RESEARCH_MS`, `Research`, `noResearch`, `researchBonus`. No Phaser.
- `game/contracts.ts`: `CONTRACTS` (goal, target, reward, rank, title, brief and perk text from the
  faction, and `apply` for the perk), `Perks`, `NO_PERKS`, `Goal`. No Phaser.
- `game/arena.ts`: `ARENA` (the 1600 by 1000 battlefield in world pixels), `START_POINTS` (the five
  fixed hub spots, player first), `NODE_AMOUNT`, `NODE_CLEARANCE` and `BUILD_RANGE`.
- `game/map.ts`: `generateMap(count)` returns a `MapLayout` (homes, nodes, rocks, nebulae, stars,
  derelicts), `beaconNode` (which node is the relay beacon), `DerelictKind` and `DERELICT_KINDS`.
  Uses `Math.random`, plus `localRandom` for the retries that keep nebulae and derelicts clear.
- `game/describe.ts`: the text for tooltips and faction cards (`unitLines`, `buildingLines`,
  `factionLines`, `abilityText`, `expansionLines`, `researchLines`, `fallBackLines`,
  `derelictLines`), built from the faction data. No Phaser.
- `game/world.ts`: `World`, the whole battle. `new World(layout, pick, watch)` puts faction `pick` in the
  player's slot (`watch`: the AI plays it, see Watch AI above). `PLAYER` (0), `unitStats` and `buildingStats`
  (faction numbers with the faction's multipliers, the side's perks and research applied),
  `expansionStats`, `buildInfo` (what a build button costs and is called), `researchCost`, the
  expansion constants (`EXPANSION_COST`, `EXPANSION_NEAR`, `EXPANSION_GAP`), `MINE_SPOT`, the beacon and
  salvage constants (`BEACON_RADIUS`, `CAPTURE_MS`, `BEACON_PAY`, `SHARD_VALUE`, `SHARD_MAGNET`,
  `POP_MS`), the nebula, veteran, repair, derelict and truce constants (`NEBULA_SPOT`,
  `NEBULA_SLOW`, `VETERAN_RANKS`, `VETERAN_STEP`, `VETERAN_NAMES`, `REPAIR_RANGE`, `REPAIR_RATE`,
  `DERELICT_RADIUS`, `CLAIM_MS`, `SENSOR_RANGE`, `DERELICT_GUN`, `DERELICT_DEFS`, `TRUCE_MS`,
  `TRUCE_TRIBUTE`, `OFFER_MS`, `BRIBE_COST`, `BRIBE_MS`) and the types `Beacon`, `Shard`, `Mine`,
  `Pop`, `Build`, `ContractState`, `WorldEvent`, `Derelict`. Fields `fog`, `known`, `mines`,
  `derelicts`. Methods the scene and test use: `update(dt)`, `build`, `train`, `research`,
  `command`, `fallBack`, `acceptTruce`, `declineTruce`, `bribe`, `bribeTarget`, `selectableIn`,
  `selectable`, `entityAt`, `derelictAt`, `placementProblem`, `count`, `hubOf`, `hubsOf`,
  `seesUnit`, `knowsBuilding`, `seesMine`, `inNebula`, `atPeace`, `rankOf`, `veteranBonus`, `unit`,
  `building`. No Phaser import.
- `scenes/GameScene.ts`: `GameScene` (key `'Game'`). Holds `state` (the `World`), `layout`, `camera`
  (the map camera), `buttons`, `selected`, `placing`, `picking` (the faction picker is up),
  `pickCards` (the picker's card rectangles, in view pixels), `rivalsOpen` and `rivalButtons` (the
  rivals panel and its buttons as last drawn). `update(time)` steps the world by the frame
  gap (clamped to 100 ms), reads `World.events`, pans the camera from the keys and draws everything.
  Two cameras: the main `camera` shows the battlefield in the `MAP_VIEW` viewport; a second, fixed
  camera (`fixed`) covers the whole 960 by 540 view. Both viewports are set in canvas pixels
  (`renderScale` times the view's), and both keep the zoom and top-left origin `setupScaling`
  gives them, so `scrollX` and `scrollY` stay the battlefield point at the map's top-left corner. Every object is made through `onMap` (the
  fixed camera ignores it) or `onUi` (the map camera ignores it), so the bars and text never
  scroll. Ships, buildings, crystals and shards are Images kept in maps by entity id, made when an
  entity appears and destroyed when it goes (`drawShips`, `drawBuildings`, `drawShards`); each
  ship shows the baked frame nearest its heading (`facing`), rotated by the few degrees left over,
  with an exhaust flame Image behind it while it moves. The fog (`drawFog`) is a canvas texture,
  one pixel a cell box-blurred and smoothed up 3x, stretched over the battlefield above the ships
  and repainted every third frame. Mines are drawn on `underGfx` (`drawMines`), a hacked turret
  fills a cyan ring toward its takeover, and research buttons are drawn by `drawResearchButton`.
  Beams, fireballs, rings and health pills are Graphics redrawn each frame (`underGfx` under the sprites, `gfx` over them), as are the nebula edges (`drawNebulae`), the derelict stations with their claim arcs and labels (`drawDerelicts`), the veteran chevrons and repair crosses (in `drawShips`), the Fall back pill (`drawCommandButton`) and the rivals panel (`drawRivals`, on `pickGfx`). `toWorld(x, y)` and `toScreen(x, y)` convert between view pixels and
  battlefield pixels from the camera's scroll. Input: `onDown`, `onMove`, `onUp` (box or tap; each
  reads the pointer in view pixels through `viewPoint`),
  `tapMap`, `press` (buttons). Bars and drag boxes use view pixels; placement and commands use
  battlefield pixels, converted with `toWorld`.
- `scenes/layout.ts`: `VIEW`, `TOP`, `BAR`, `MAP_VIEW` (the map's window on screen), `BUTTON`
  (116 by 30), `BUTTONS` (each button's kind, `build`, `train` or `research`, key and top-left
  corner: four build buttons with Expansion last, four train buttons, and the research column),
  `RESEARCH_COLUMN`, `FALL_BACK_BUTTON` (kind `command`, key `fallback`, at the right of the message
  line), `PANEL_X` (where the message line and contract panel start), `RIVALS_PANEL` and `RIVALS_TAB`
  (the rivals panel's box and the top bar area that opens it), `ROLE_LABEL` (the generic
  name of each building and unit type, shown under the faction's own name), `FONT` (a system sans
  stack, bold italic for headings).
- `art/mesh.ts`: the modelling kit. `Mesh` (vertex and face lists, each face with a material key),
  primitives `box`, `tube` (and cones), `ellipsoid` (and domes), `slab` (an extruded outline),
  `plate`, `crystal`, `band` and `ring` (curved strips), `rock`; transforms `move`, `scale`,
  `turn`, `mirrorY`, `pair`, `merge`, `xform`; `hashRandom` (never `Math.random`). Models face
  +x, +z is up, in display pixels.
- `art/render3d.ts`: `renderMesh` turns a mesh to a heading, tilts it toward the viewer (`TILT`),
  culls back faces, sorts by depth (painter's order) and fills each face with a top-left to
  bottom-right gradient. Materials are `paint` (Lambert plus a highlight), `chrome` (reflects a
  painted sky, horizon and desert), `glass` and `glow` (unlit, blooms with a canvas shadow).
  Also `sparkle` (the four-pointed glint) and `reach`.
- `art/models.ts`: `FACTION_ART` (by faction name: materials, the four ship and four building
  meshes, and the flame colours) and the props (`crystalCluster`, `beaconModel`, `shardModel`,
  `rockModel`, `PROP_MATS`).
- `art/textures.ts`: `bakeAll` (once per page) bakes each faction's ships as sheets of `FACINGS`
  (16) frames (`shipKey(faction, type)`, frame k faces k x 22.5 degrees clockwise from east), its
  buildings (`buildingKey`), flames (`flameKey`), crystals, the beacon, the shard and two glows,
  at `RES` canvas pixels per display pixel with a dark ink outline. `RES` is set by `bakeAll`:
  `renderScale` held between 2 and `MAX_RES` (3), so draw sprites at `1 / RES`. A ship sheet lays
  its frames out four to a row. `bakeBackdrop` paints each map's 1600 by 1000 backdrop (sky,
  nebulae, ringed planet, moon, stars, rocks) at `sharpRes` and returns that resolution, which the
  scene draws it at `1 /`. `facing`
  picks a frame for a heading. Faction keys index `FACTIONS`, not the battle's sides; the scene
  maps sides with `art(side)`.
- `art/draw.ts`: `drawHealth`, `drawProgress`, `dashedCircle`, `progressArc`, `stripes`.
- `art/palette.ts`: `INK` and `INK_CSS`, the HUD's chocolate, tangerine, mustard and cream.

How it runs:

- Each frame `update(time)` computes `dt` from the frame timestamp (clamped to 100 ms), calls
  `World.update(dt)` and redraws everything with `Graphics` from the world's state.
- `World.update` runs, in order: beams, wrecks and pops age; nebula cover is worked out
  (`updateCover`); buildings progress (construction, training, turret fire); derelicts claim, train
  and fire; units act (repair, harvesters `harvest`, others follow their order or acquire a
  target); each rival's truce timers run and it `think`s once a second (including `contestBeacon`,
  `contestDerelicts`, `considerTruce` and falling hurt ships back); dead entities are removed (kills,
  veteran credit, razes, pressure and shards are recorded here, after mines go off); research, the
  beacon, shards, the contract and the fog update; the phase becomes `won` or `lost`.
- Boot bakes all sprites in `create` (320 ship frames and the rest); a new map only repaints the
  backdrop.
- Time is simulated, not read from the clock: `elapsedMs` is game time, used for the AI grace and
  the HUD clock.

Screen scaling (`shared/scaling.ts`): lay out in view pixels from `layout.ts` (never
`this.scale`, which is canvas pixels), read pointers through `viewPoint`, give a new camera its
viewport in canvas pixels, and paint new canvas art at `RES` or `sharpRes`. The map camera never
follows or uses bounds (`scrollTo` clamps it), so it keeps the top-left origin rather than
`scrollingCamera`. `index.html` has the shared `100dvh` and `touch-action: none` styles.
`e2e/screens.spec.ts` checks the game on five screens.

Save keys: none. The game keeps nothing between visits and reads only the hub's settings
(`byDifficulty`, `settings.reduceMotion`) through `shared/`.

Test hooks (read by `e2e/playthrough.spec.ts`):

- `window.game.scene.getScene('Game')` (dev builds only). `scene.state` is the `World`: `phase`,
  `elapsedMs`, `units`, `buildings`, `nodes`, `sides` (crystal, alive), `layout`.
- `scene.buttons`: the command bar's buttons with their positions, read to click them.
- `scene.pickCards`: the picker's cards. The test taps the first one to play the Solar Concord.
- `scene.state.fog`: its JSON is `{ explored }` (the explored share); `state.fog.knows({ x, y })`
  answers whether the player has seen a point. The test checks the beacon starts hidden and is
  found, and that flying out explores more.
- `scene.state.beacon` (`owner`, `capture`, `held`, `paid`), `shards` (with `faction`), `salvaged`, `kills`,
  `contract` (`index`, `progress`) and `sides[0].perks`: the test asserts the first contract's
  reward and perk, the beacon's capture and pay, and a kill and its salvage.
- `scene.selected`: the ids of the selected units; the test checks that its box selected the wing.
- Not read by the test, but there: `scene.state.derelicts` (`perk`, `owner`, `claim`), `sides[i].truceMs`,
  `offerMs`, `grudge`, `units[i].kills`, `nebula`, `repairing`, and `scene.rivalsOpen`.
- `scene.camera.scrollX` and `scrollY`: the map's scroll, which the test reads to see whether a pan
  moved. `scene.toScreen(x, y)` gives where a battlefield point is in view pixels.
- `scene.state.placementProblem(role, x, y)` answers whether a building can go somewhere. The test
  calls it to pick a clear spot, then taps it.
- The test pans with the real arrow keys (`page.keyboard.down`) until the target is on screen, then
  taps it. A unit moves while the game plays, so the test reads its position right before tapping.
- Game time moves only through the test's clock; rAF is replaced with a timer at 64 ms frames.

## How to make common changes

- **A balance number**: change it in `game/factions.ts` (costs, times, hit points, weapons) or
  `game/world.ts` (the AI constants at the top). Update the playthrough if the first round depends
  on it (the Barracks cost, the Lancer's cost, the harvest rate), and the README's numbers.
- **A new faction**: add an entry to `FACTIONS` with all four units and four buildings and a
  `tune`. The map, HUD and AI pick it up by index, so `FACTIONS.length` sets the number of hubs.
  Give it models in `FACTION_ART` (`art/models.ts`, keyed by its name) in a look of its own with its colour on a stripe or glow; no red cross on any art.
- **A new building or unit type**: add it to the `Role` or `UnitId` types and to each faction's
  definitions, then the command bar's `BUTTON`s in `scenes/layout.ts` (and its `ROLE_LABEL`) and
  any `World` rules that name it (`train`, `updateBuilding`, `harvest` for drop-offs).
- **A tooltip or card text**: add the line in `game/describe.ts`; the scene shows whatever it returns.
- **A map-clicked command**: convert the view pixel with `toWorld` first; the bars take view pixels.
- **Shooting and approach** share a half-pixel slack (`approach` and `updateUnit`), so a unit that
  stops at its range can always fire.
- **A new command**: add a method on `World` that the scene calls from `tapMap` or `press`. Keep
  the rule in `World` so the AI can use it too.
- **A new setting**: add it to `shared/settings.ts` and honour it here; `reduceMotion` already
  skips the fireballs, steadies the beams, flames, shard and beacon glows, keeps pops from rising
  and stops the Solar Concord's pylons bobbing in `GameScene`.
- **A ship or building's look**: edit its mesh in `art/models.ts` (models face +x, in display
  pixels before `SHIP_ZOOM` 1.25 or the building zoom 1.35; Iron Dominion's ships also go through
  its `big` scale of 1.12,
  and its heavy a scale of 1.6; `bakeAll` then scales every faction's heavy to the battleship's
  reach, so all heavies are the same size and the biggest ships in the game). Give each class of a faction its own silhouette, not one ship at four sizes. Keep the faction's colour on a
  stripe or glow material, keep it distinct at phone size, and never a red cross. Check it with a
  sheet of the baked textures (`scene.textures.get(shipKey(f, type))`).
- **A contract**: add or change an entry in `CONTRACTS`. A new `Goal` needs counting in
  `World` (`score` for events, or a check in `updateContract`). The first contract is part of
  the first round, so changing it means updating the playthrough.
- **Beacon or salvage numbers**: the constants at the top of `game/world.ts`; the playthrough
  waits on the beacon paying 3 a second and a shard worth 8.
- **Sight and fog**: the vision constants at the top of `game/world.ts` and the fog's look at the
  top of `GameScene.ts`. Keep the beacon out of the hub's sight at the start (`HUB_VISION` below
  `BEACON_HOME_GAP` in `game/map.ts`): the playthrough asserts it starts hidden.
- **Nebula, veteran, repair, derelict or truce numbers**: the constants at the top of
  `game/world.ts`; the tooltips, labels and panel read them, so update the README's numbers. Keep
  nebulae and derelicts off the start-to-beacon lane (`NEBULA_LANE_GAP`, `DERELICT_LANE_GAP` in
  `game/map.ts`), so the playthrough's flight to the beacon stays in the open, and keep the map's
  `Math.random` draw count the same (retries use `localRandom`), or the seeded playthrough plays a
  different battle.
- **A new derelict kind**: add it to `DerelictKind` and `DERELICT_KINDS` in `game/map.ts` (the map
  places one of each), its name and text to `DERELICT_DEFS`, and its rule to `updateDerelict`,
  `updateCover`, `updateFog` or `train`.
- **A new rivals-panel action**: a method on `World` (so the AI could use it too), a `RivalButton`
  action in `GameScene.drawRivals` and its case in `onDown`.
- **Research or expansion numbers**: `game/research.ts` and the expansion constants in
  `game/world.ts`; the tooltips read them, so update the README's numbers.
- **Anything the playthrough depends on** (button positions, the first-round numbers, the hub or
  harvester behaviour): change it in the same PR as its test update.
