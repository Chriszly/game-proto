# Space Wars: guide for agents

How Space Wars is built and where things stand, for agents changing it. README.md covers how to
play, the factions and the difficulty. Keep this file up to date with any change to the game, per
the root AGENTS.md.

## Current state

Space Wars is a one-screen RTS on a random star map, played with taps and box selection. Five
factions each start with a hub and two harvesters. The player is the Solar Concord; the other four
are AI.

Implemented today:

- Random maps (`game/map.ts`): hubs spread apart, three crystal nodes near each hub and six loose
  ones, six rock fields that block building, four nebulae and 160 stars.
- Harvesting: harvesters seek the crystal nearest their hub, mine it, carry it to the nearest hub
  or depot of their faction and deposit it. Nomad Freight carries 14 a trip, the others 10.
- Building: Depot, Barracks and Turret, each placed within 240 px of the hub on clear ground, built
  over time with a progress bar. A Turret shoots enemies in range.
- Training: a harvester is queued at the hub; the combat units (scout, gunship, heavy) are queued
  at a finished Barracks, up to five at a time per building.
- Orders: move, attack a unit or building, and auto-attack anything in sight when a unit has no
  order. Harvesters are never ordered.
- AI (`World.think`, once a second per rival): keeps four harvesters, builds a Depot, a Barracks
  and up to two Turrets, trains combat units, and after the opening 75 seconds sends its whole army
  at the nearest enemy building every 12 seconds once the army reaches the difficulty's size.
- Win: every rival hub gone. Lose: the player's hub gone. A fallen hub takes its faction's
  remaining units and buildings with it. A battle ends with a Victory or Defeat overlay; a tap starts
  a new map.

Missing or rough:

- Only the look and the stat multipliers set the factions apart. The cloaking, decoy, hacking,
  capture and mine abilities from the faction ideas are not built.
- No fog of war, no pathfinding (units move in straight lines and pass over rocks), no unit
  collision, no sound and no save.
- No camera: the whole map fits on screen.
- The rivals' Barracks and Turrets are placed at random within 60 to 150 px of their hub.
- The playthrough covers only the first round (harvest, raise a Barracks, train a Lancer, attack a
  base). Purchases beyond that round, the other buildings and the other units are not played.

## Architecture

File map (`src/`):

- `main.ts`: creates the `Phaser.Game` (960x540, `Phaser.Scale.FIT`, `pixelArt: true`) with
  `GameScene`, calls `setupGame(game)` from `shared/setupGame.ts`, and in dev builds puts `game`
  on `window`.
- `game/factions.ts`: the `FACTIONS` list (name, colours, `tune` multipliers, and the `units` and
  `buildings` definitions with their outlines), `COMBAT_UNITS`, and the types `UnitId`, `Role`,
  `Poly`, `Weapon`, `UnitDef`, `BuildingDef`. Outlines are polygons in local units, y down, with
  the front at the top (-y).
- `game/arena.ts`: `ARENA` (the field, below the top bar and above the command bar), `NODE_AMOUNT`,
  `NODE_CLEARANCE` and `BUILD_RANGE`.
- `game/map.ts`: `generateMap(count)` returns a `MapLayout` (homes, nodes, rocks, nebulae, stars).
  Uses `Math.random` only.
- `game/world.ts`: `World`, the whole battle. `PLAYER` (0), `unitStats` and `buildingStats`
  (faction numbers with multipliers applied). Methods the scene and test use: `update(dt)`,
  `build`, `train`, `command`, `selectableIn`, `selectable`, `entityAt`, `placementProblem`,
  `count`, `hubOf`, `unit`, `building`. No Phaser import.
- `scenes/GameScene.ts`: `GameScene` (key `'Game'`). Holds `state` (the `World`), `layout`,
  `buttons`, `selected`, `placing`. `update(time)` steps the world by the frame gap (clamped to
  100 ms) and draws it. Input: `onDown`, `onMove`, `onUp` (box or tap), `tapMap`, `press` (buttons).
- `scenes/layout.ts`: `VIEW`, `TOP`, `BAR`, `BUTTON`, `BUTTONS` (each button's kind, key and
  top-left corner), `FONT`.
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
- `scene.state.placementProblem(role, x, y)` answers whether a building can go somewhere. The test
  calls it to pick a clear spot, then taps it.
- Game time moves only through the test's clock; rAF is replaced with a timer at 64 ms frames.

## How to make common changes

- **A balance number**: change it in `game/factions.ts` (costs, times, hit points, weapons) or
  `game/world.ts` (the AI constants at the top). Update the playthrough if the first round depends
  on it (the Barracks cost, the Lancer's cost, the harvest rate), and the README's numbers.
- **A new faction**: add an entry to `FACTIONS` with all four units and four buildings and a
  `tune`. The map, HUD and AI pick it up by index, so `FACTIONS.length` sets the number of hubs.
  Keep every outline distinct and use neon colours; no red cross on any art.
- **A new building or unit type**: add it to the `Role` or `UnitId` types and to each faction's
  definitions, then the command bar's `BUTTON`s in `scenes/layout.ts` and any `World` rules that
  name it (`train`, `updateBuilding`, `harvest` for drop-offs).
- **A new command**: add a method on `World` that the scene calls from `tapMap` or `press`. Keep
  the rule in `World` so the AI can use it too.
- **A new setting**: add it to `shared/settings.ts` and honour it here; `reduceMotion` already
  skips the wreck rings and steadies the beams in `GameScene.draw`.
- **Anything the playthrough depends on** (button positions, the first-round numbers, the hub or
  harvester behaviour): change it in the same PR as its test update.
