# Colonizer: guide for agents

How Colonizer is built and where things stand, for agents about to change it. README.md covers how
to play and the difficulty table. Keep this file up to date in the same PR as any change to the game,
as the root AGENTS.md asks.

## Current state

Colonizer is a skirmish RTS: one player against one AI on a 128x128 tile map, with three factions
(Ember Legion, Tide Coven, Thorn Grove) that differ only in their three combat units. The map is
generated each match from `Math.random` and is point-symmetric, so both sides start the same.

- Implemented: a menu that picks the faction (the AI plays the next one along), fog of war (unseen,
  explored and in sight), click, Shift and box selection, control groups (1 to 9, Ctrl to set),
  right-click commands (attack, gather, build, walk), attack-move (A), stop (S), build placement with
  a green or red ghost, a bottom panel with buttons for training, research and the build list, a
  top bar with resources, population, age and the match clock, and an end screen with Victory or
  Defeat and a click back to the menu.
- Economy: wood (trees), food (berry bushes and farms), ore (2x2 gold mines). Villagers gather a
  load of ten, drop it at the Town Center or at a Lumber or Mining Camp, and go back to the same node
  or the nearest of its kind. Builders and new villagers go to work on their own.
- Buildings (`BUILDINGS` in `src/game/data.ts`): Town Center, House, Farm, Lumber Camp, Mining Camp,
  Barracks, Archery Range, Stable, Academy, Watchtower.
- Techs (`TECHS`): Axes, Baskets and Picks (+25% wood, food and ore gathering), Ironworks (+2 melee
  damage), Fletching (+2 ranged damage), Age II (at the Town Center, unlocks the Age II techs),
  Bodkin (+2 ranged damage, Age II). Stirrups is researchable but has no effect yet.
- The AI is a rule-based planner (`src/game/planner.ts`), not a full build-order search: it keeps
  villagers coming, builds houses before the cap, a farm, camps, barracks, range, stable, academy
  and watchtower, researches in a fixed order, trains an army, and attack-moves once it has 14 units.
- Not implemented yet: a third age (the proposal had three, the build has two), a minimap, unit
  collisions (units overlap), saves, sound, rally points, Stirrups' effect, and any win or loss
  other than a Town Center falling.

## Architecture

### File map

- `src/main.ts`: creates the `Phaser.Game` (960x540, FIT scaling, `pixelArt`), registers the three
  scenes, calls `setupGame(game)` from `shared/setupGame.ts`, and puts `game` on window in dev.
- `src/game/data.ts`: every balance number and roster: `FACTIONS` (colours), `UNITS` (cost, time,
  stats, trainer), `unitFor(faction, role)`, `BUILDINGS` (cost, time, size, hp, sight, pop, drops,
  trains, research, farm, tower), `BUILD_ORDER`, `TECHS`, `GATHER_MS`, `CARRY`, `START`,
  `START_VILLAGERS`, `TILE` (32) and `MAP_SIZE` (128). Times are ms, speeds tiles per second.
- `src/game/map.ts`: `generateMap()` draws lakes, rock ridges, forests, bushes and mines, mirrors
  each one, and adds each side's starting trees, bushes and mine. Terrain is `Uint8Array` of
  `GRASS`, `WATER`, `ROCK` and `DIRT`; `Node`s are the resources. `START_TILES` are the two Town
  Center corners.
- `src/game/sim.ts`: the rules, free of Phaser. `createGame` builds the state, `tick` advances it,
  `issue` gives unit orders, `placeBuilding`, `canPlace`, `train` and `research` queue things,
  `findPath` is a breadth-first search on the tile grid, `updateSight` computes the player's sight,
  and `entityAt` finds what is under a point. Orders are `idle`, `move`, `attackMove`, `attack`,
  `gather`, `build` and `return` (a villager taking its load home).
- `src/game/planner.ts`: `think(state, dt)` runs the AI every 1.5 s of game time. It issues the same
  commands a player would, through the sim's functions.
- `src/art/sprites.ts`: pixel art drawn in code. `bakeTerrain` paints the map at 4 px per tile,
  `bakeUnit` draws 16x16 cells at 3 px (48 px sprites), `bakeBuilding` draws 4 px cells for each
  footprint (a tile is 8 cells), and `bakeTree`, `bakeBush` and `bakeMine` draw the nodes.
- `src/scenes/BootScene.ts`: bakes the unit, building and node textures (keys `unit-<type>`,
  `bld-<faction>-<building>`, `tree-0`, `tree-1`, `bush`, `mine`), then starts `Menu`.
- `src/scenes/MenuScene.ts`: the three faction cards. Clicking one starts `Game` with that faction
  and the AI's.
- `src/scenes/GameScene.ts`: the match. It creates the state, bakes this match's terrain texture,
  makes sprites for every entity, handles input and the panel, and runs `tick` and `think` each
  frame.

### How it runs

- `GameScene.update(time, delta)`: clamps `delta` to 250 ms, runs `tick` and `think` (unless
  there is a winner), scrolls the camera, then syncs sprites, the fog texture, the rings and health
  bars, the top bar, the panel (rebuilt only when its signature changes) and the build ghost.
- Rendering is retained: one Phaser image per unit, building and node, created on first sight and
  destroyed when the sim drops them. Units sort by their y; buildings by the bottom of their
  footprint. Fog is a 128x128 canvas texture scaled up by `TILE`, drawn above the world and below
  the HUD.
- Input: `pointerdown` and `pointerup` on the scene. A click under 5 px is a click; otherwise it is
  a box select. Clicks in the top bar or the bottom panel are left to the panel's buttons. Right
  click calls `commandAt`. Arrow keys scroll; A, S, B and Esc and the number keys are handled in
  `onKey`.
- Placement: `placing` holds a building type. A click calls `tryPlace`, which centres the footprint
  on the tile under the cursor and sends the nearest selected villager to build it.

### Rules worth knowing

- A unit is in reach of its target when its distance to the target's footprint is within
  `range + 0.5` (melee and gather use tile adjacency, 0.5 tiles). Pathing goals are checked on tile
  centres, so `pursue` walks to the centre of the goal tile before it counts as arrived.
- `canPlace` refuses a site where a unit stands or where no free tile touches the footprint, so a
  builder can always reach it.
- `nearestSource` only picks nodes with a free tile next to them (`touchable`), so villagers don't
  head for trees boxed in by other trees.
- A building under construction blocks walking (it is solid) and is an enemy target. Its hp grows
  as it is built. A finished farm gives endless food to gather.
- The Town Center and Watchtowers shoot anything in range; soldiers fight on their own when idle and
  an enemy is within sight.
- The AI's gather rate is the only difficulty number: `byDifficulty(0.75, 1, 1.25)` in `GameScene`.

## Testing hooks

- The dev build sets `window.game`. The playthrough reads `scene.getScene('Game')`: `state` (the
  whole sim, with `units`, `buildings`, `nodes`, `players`, `winner`, `time`), `selected` (a Set of
  ids), `hud` (the panel's buttons, in game-space screen coordinates with `label`, `x`, `y`, `w`,
  `h`), `placing`, `attackMode`, `buildMenu`, `cameras.main.scrollX/Y`, and `toScreen(tx, ty)`.
- Inputs are canvas clicks (left and right), so the test drives the real controls. It never writes
  to game state.
- It seeds `Math.random`, owns `page.clock`, makes `requestAnimationFrame` a 64 ms timer and forces
  the canvas renderer, the same as Apothecary's test.

## Making common changes

- Tune a number: `src/game/data.ts`. If it changes the first round (the harvest, the villager, the
  house, the Academy or Axes), update the playthrough's expectations too.
- Add a unit: add an entry to `UNITS` with its faction and role, and add it to the faction's trainer
  building. Its sprite comes from `unitRects` (`src/art/sprites.ts`) by role and faction; `BootScene`
  bakes one texture per faction and combat role, so a new role needs a new entry in its role list.
- Add a building: add it to `BUILDINGS` and `BUILD_ORDER`, give it a drawing case in
  `bakeBuilding`, and if it trains or researches, make `trains` or `research` say so. The panel and
  the planner pick it up from the data; add it to `BUILD_PLAN` in the planner if the AI should build
  it.
- Add a tech: add it to `TECHS` with its building and cost, then give its effect a line in the sim
  (`gatherBonus` for gathering, `ownBonus` for damage; `research` checks `age2`).
- Add a faction: add it to `FACTIONS` and `FACTION_IDS`, add its three units to `UNITS` (one each
  for melee, ranged and cavalry), and add a card to `MenuScene`.

## Gotchas

- `src/game/sim.ts` and `map.ts` import nothing from Phaser, so keep them free of it; the scene
  does all drawing.
- A `Map` is not JSON. The test reads `state.units` and `state.buildings` as arrays, not as maps.
- Node ids come from the map and buildings and units start at 1000, so the two never clash.
- Units standing on a tile block placing a building there, and `pursue` gives up when it finds no
  path, so a unit can go idle; the planner reassigns builders each think for that reason.
- Don't put a red cross in any sprite or icon (root rule).
- A new scene needs `this.input.on(...)` handlers that check `this.endPanel` and the panel bounds,
  or clicks will reach the world under the panel.
