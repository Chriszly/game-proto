# Space Wars: guide for agents

How Space Wars is built and where things stand, for agents changing it. README.md covers how to
play, the factions and the difficulty. Keep this file up to date with any change to the game, per
the root AGENTS.md.

## Current state

Space Wars is an RTS on a random star map, played with taps, box selection and a scrolling camera.
The battlefield is 1600 by 1000 pixels; the screen shows a 960 by 406 window of it between the top
and command bars. Five factions each start with a hub and two harvesters at a fixed start point.
The player picks one of the five factions on a picker before each battle; the other four are AI.

Implemented today:

- Random maps (`game/map.ts`): hubs at the fixed `START_POINTS` (`game/arena.ts`), each nudged up to
  36 px at random; three crystal nodes near each hub and 16 loose ones, 12 rock fields that block
  building, eight nebulae and 480 stars.
- Harvesting: harvesters seek the crystal nearest their hub, mine it, carry it to the nearest hub
  or depot of their faction and deposit it. Nomad Freight carries 14 a trip, the others 10.
- Building: Depot, Barracks and Turret, each placed within 240 px of the hub on clear ground, built
  over time with a progress bar. A Turret shoots enemies in range. Each faction calls its Barracks
  something else (Solar Concord: Orbital Dock); the command bar shows the role under each name
  (`Barracks · 100`), and train and build messages name the faction's own building.
- Training: a harvester is queued at the hub; the combat units (scout, gunship, heavy) are queued
  at a finished Barracks, up to five at a time per building.
- Orders: move, attack a unit or building, and auto-attack anything in sight when a unit has no
  order. Harvesters are never ordered.
- AI (`World.think`, once a second per rival): keeps four harvesters, builds a Depot, a Barracks
  and up to two Turrets, trains combat units, and after the opening 75 seconds sends its whole army
  at the nearest enemy building every 12 seconds once the army reaches the difficulty's size.
- Faction abilities (`Ability` in `game/factions.ts`, applied in `game/world.ts`): `cloak`
  (Phantom Blade, hidden from enemies until it fires for 2 s), `decoy` (Decoy Wraith drops a copy
  every 15 s that draws fire for 12 s and never acts), `hack` (Hack Frigate's hits disable a turret
  for 6 s), `shield` (Halo Cruiser: friends within 70 px take half of each shot), `brood` (Brood
  Carrier spawns a scout every 12 s up to 6 scouts), `splash` (Siege Barge hits enemies within 28 px
  of its target for half damage), `salvage` (Nomad Salvage Yard pays 8 crystal per enemy unit
  destroyed within 200 px).
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

- The factions' abilities are one signature each (above). The Mine Lattice turret does not lay
  mines, and hacking disables a turret rather than capturing it.
- No fog of war, no pathfinding (units move in straight lines and pass over rocks), no unit
  collision, no sound and no save.
- No minimap and no edge scrolling: the map scrolls with the keys only.
- The rivals' Barracks and Turrets are placed at random within 60 to 150 px of their hub.
- The playthrough covers only the first round (harvest, raise a Barracks, train a Lancer, attack a
  base). Purchases beyond that round, the other buildings and the other units are not played.

## Architecture

File map (`src/`):

- `main.ts`: creates the `Phaser.Game` (960x540, `Phaser.Scale.FIT`, `pixelArt: true`) with
  `GameScene`, calls `setupGame(game)` from `shared/setupGame.ts`, and in dev builds puts `game`
  on `window`.
- `game/factions.ts`: the `FACTIONS` list (name, colours, `tune` multipliers, and the `units` and
  `buildings` definitions with their outlines and optional `ability`), `COMBAT_UNITS`, and the types
  `UnitId`, `Role`, `Poly`, `Weapon`, `Ability`, `UnitDef`, `BuildingDef`. Outlines are polygons in local units, y down, with
  the front at the top (-y).
- `game/arena.ts`: `ARENA` (the 1600 by 1000 battlefield in world pixels), `START_POINTS` (the five
  fixed hub spots, player first), `NODE_AMOUNT`, `NODE_CLEARANCE` and `BUILD_RANGE`.
- `game/map.ts`: `generateMap(count)` returns a `MapLayout` (homes, nodes, rocks, nebulae, stars).
  Uses `Math.random` only.
- `game/describe.ts`: the text for tooltips and faction cards (`unitLines`, `buildingLines`,
  `factionLines`, `abilityText`), built from the faction data. No Phaser.
- `game/world.ts`: `World`, the whole battle. `new World(layout, pick)` puts faction `pick` in the
  player's slot. `PLAYER` (0), `unitStats` and `buildingStats`
  (faction numbers with multipliers applied). Methods the scene and test use: `update(dt)`,
  `build`, `train`, `command`, `selectableIn`, `selectable`, `entityAt`, `placementProblem`,
  `count`, `hubOf`, `unit`, `building`. No Phaser import.
- `scenes/GameScene.ts`: `GameScene` (key `'Game'`). Holds `state` (the `World`), `layout`, `camera`
  (the map camera), `buttons`, `selected`, `placing`, `picking` (the faction picker is up) and
  `pickCards` (the picker's card rectangles, in view pixels). `update(time)` steps the world by the frame
  gap (clamped to 100 ms), pans the camera from the keys and draws everything. Two cameras: the
  main `camera` shows the battlefield in the `MAP_VIEW` viewport and ignores the UI objects; a
  second, fixed camera covers the whole 960 by 540 view and ignores the map objects, so the bars and
  text never scroll. `toWorld(x, y)` and `toScreen(x, y)` convert between view pixels and
  battlefield pixels from the camera's scroll. Input: `onDown`, `onMove`, `onUp` (box or tap),
  `tapMap`, `press` (buttons). Bars and drag boxes use view pixels; placement and commands use
  battlefield pixels, converted with `toWorld`.
- `scenes/layout.ts`: `VIEW`, `TOP`, `BAR`, `MAP_VIEW` (the map's window on screen), `BUTTON`,
  `BUTTONS` (each button's kind, key and top-left corner), `ROLE_LABEL` (the generic name of each
  building and unit type, shown under the faction's own name), `FONT`.
- `art/draw.ts`: `drawShape` (neon outline with glow and tint), `drawDome`, `drawHealth`.

How it runs:

- Each frame `update(time)` computes `dt` from the frame timestamp (clamped to 100 ms), calls
  `World.update(dt)` and redraws everything with `Graphics` from the world's state.
- `World.update` runs, in order: beams and wrecks age; buildings progress (construction, training,
  turret fire); units act (harvesters `harvest`, others follow their order or acquire a target);
  each rival `think`s once a second; dead entities are removed; the phase becomes `won` or `lost`.
- Time is simulated, not read from the clock: `elapsedMs` is game time, used for the AI grace and
  the HUD clock.

Save keys: none. The game keeps nothing between visits and reads only the hub's settings
(`byDifficulty`, `settings.reduceMotion`) through `shared/`.

Test hooks (read by `e2e/playthrough.spec.ts`):

- `window.game.scene.getScene('Game')` (dev builds only). `scene.state` is the `World`: `phase`,
  `elapsedMs`, `units`, `buildings`, `nodes`, `sides` (crystal, alive), `layout`.
- `scene.buttons`: the command bar's buttons with their positions, read to click them.
- `scene.pickCards`: the picker's cards. The test taps the first one to play the Solar Concord.
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
  Keep every outline distinct and use neon colours; no red cross on any art.
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
  skips the wreck rings and steadies the beams in `GameScene.draw`.
- **Anything the playthrough depends on** (button positions, the first-round numbers, the hub or
  harvester behaviour): change it in the same PR as its test update.
