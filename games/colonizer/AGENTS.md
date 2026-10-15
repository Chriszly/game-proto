# Colonizer: guide for agents

How Colonizer is built and where things stand, for agents about to change it. README.md covers how
to play and the difficulty table. Keep this file up to date in the same PR as any change to the game,
as the root AGENTS.md asks.

## Current state

Colonizer is a skirmish RTS: one player against one AI on a 128x128 tile map, with three factions
(Ember Legion, Tide Coven, Thorn Grove) that differ in their three combat units and one unique
building each (Forge, Dock, Grove). The map is
generated each match from `Math.random` and is point-symmetric, so both sides start the same. It is
drawn as the Bayeux tapestry: wool laid-and-couched work and stem-stitch outlines on linen, painted
in code on 2D canvases (no image files), with `pixelArt` off.

- Implemented: a menu that picks the faction (the AI plays the next one along), fog of war (unseen,
  explored and in sight), click, Shift and box selection, control groups (1 to 9, Ctrl to set),
  right-click commands (attack, gather, build, walk), attack-move (A), stop (S), build placement with
  a green or red ghost, a bottom panel with the selection, buttons for training, research and the
  build list, and a minimap; a top bar with resources, population, a three-pip age track, the match
  clock, the faction and the chosen boon; and an end screen with Victory or Defeat and a click back
  to the menu.
- Animation: every unit has a few baked frames per pose (see `src/art/figures.ts`), flipped for
  left-facing. Villagers: idle, walk, carry wood, food or ore, chop, reap, mine and build. Soldiers:
  idle, walk (riders gallop) and a three-frame attack (sword, club or spear blow, bow draw and loose,
  sling whirl, lance or axe charge). With `settings.reduceMotion` every pose holds its first frame.
- Economy: wood (trees), food (berry bushes and farms), ore (2x2 gold mines). Villagers gather a
  load of ten, drop it at the Town Center or at a Lumber or Mining Camp, and go back to the same node
  or the nearest of its kind. Builders and new villagers go to work on their own.
- Buildings (`BUILDINGS` in `src/game/data.ts`): Town Center, House, Farm, Lumber Camp, Mining Camp,
  Barracks, Archery Range, Stable, Academy, Watchtower; one per faction (`faction` on the def,
  `UNIQUE`): Forge (Ember, soldiers cost `FORGE_COST` 80%), Dock (Tide, on a shore, `DOCK_FOOD` every
  `DOCK_MS`), Grove (Thorn, plants a tree every `GROVE_MS` within `GROVE_RANGE`, up to `GROVE_TREES`,
  and takes wood); Palisade and Gate (`palisade: true`); the Monument (`age: 3`). `limit` caps how
  many a player may have. The build list has two pages: `BUILD_ORDER` plus the faction's building,
  then `BUILD_MORE` (Palisade, Gate, Monument).
- Rally flags (`Building.rally`): a right click with a production building selected (and no units)
  plants it; new units walk to a ring of spots round it (`RALLY_SPOTS`), and a villager whose flag is
  on a node or own farm gathers there. Units push apart where closer than `UNIT_GAP` (`separate` in
  the sim); villagers at work hold their place.
- Walls: a palisade is dragged out as a line (`wallLine`, `placeWall`, up to 40 stakes). A gate goes
  in a gap or on an own stake (replacing it). A finished gate is not solid: `GameState.gates` holds
  its owner, and `blocked(s, x, y, owner)` lets only that owner's units through. Auto-targeting
  (`nearestEnemy` with `auto`) skips palisades; a soldier whose path is cut off attacks the nearest
  enemy stake or gate (`breach`). A builder goes on to the next unfinished building within 6 tiles.
- Neutral camps (`MapData.camps`, `GameState.camps`): two flank relics (Plenty and Haste), the Relic of
  Valor in the middle, and an ore and a food cache near each side, each in a patch cleared of
  terrain and nodes (`CAMP_PLAN` in map.ts, no `Math.random`). Guards are `wild-brigand` and
  `wild-poacher` units of the `NEUTRAL` player (index 2), with a `post` they never leave by more than
  `LEASH`. With the guards dead, a side alone within `CLAIM_RANGE` takes a cache once or holds a relic
  (`updateCamps`); `holds(s, owner, relic)` applies `RELIC_GATHER`, `RELIC_DAMAGE` and `RELIC_SPEED`.
- The Monument: once finished (`Building.doneAt`), it wins for its owner after `MONUMENT_MS` (3 min)
  if it still stands (`checkWinner`, `GameState.winBy`). It is visible to everyone, and the relics
  card counts it down (`monumentLeft`).
- Techs (`TECHS`): Axes, Baskets and Picks (+25% wood, food and ore gathering), Ironworks (+2 melee
  damage), Fletching (+2 ranged damage), Age II and Age III (at the Town Center), Bodkin (+2 ranged
  damage, Age II) and Stirrups (+20% move speed for cavalry, Age II).
- Ages: Age II opens the one-time boon pick (`BOONS`: Shieldwall, own melee units take 20% less
  damage; Harvest Rites, farms gather 20% faster). Age III needs the three deeds (`DEEDS`: reach
  Age II, 14 soldiers alive at once, repel a raid) before it can be researched, and gives every
  soldier +2 damage (`AGE3_DAMAGE`).
- Raids: when the AI attack-moves its army at the player, the sim records a `Raid` (who, which
  units, where they are, how many are routed). The scene shows a horn toast naming it with an arrow
  towards it for 10 s, the minimap pulses rings where it is, and the deeds card counts the routed.
  Killing every raider repels it and does the raid deed.
- Feedback: hits throw ochre sparks, arrows fly from ranged attackers and towers, damage numbers
  rise, and every load the player drops off pops a "+N" badge with the resource's icon.
- The AI is a rule-based planner (`src/game/planner.ts`), not a full build-order search: it keeps
  villagers coming, builds houses before the cap, a farm, camps, barracks, range, stable, academy
  and watchtower, researches in a fixed order (Age III last, once its deeds are done), trains an
  army, attack-moves once it has 14 units (starting a raid), and picks Shieldwall at Age II. It also
  builds its faction's building after its camps (a Dock on the nearest shore), sets each production
  building's rally flag in front of its base, lays a nine-stake diagonal palisade with a gate in the
  middle across its front in Age II (`buildWall`), sends an army of 8 or more to take the nearest
  relic it doesn't hold between raids, builds a Monument in Age III, and attacks a standing player
  Monument with everything at once.
- Watch AI (`?watch`, `shared/watch.ts`): Boot skips the menu and starts `Game` with two random
  different factions; the planner plays both sides (`think(state, dt, PLAYER)` as well), both gather
  at the Normal rate, the whole map stays in sight (`sight.fill(2)` each frame), the sim runs
  `watchSteps()` times a frame, the panel shows no buttons, right clicks and hotkeys do nothing, and
  the end screen names the winning faction and starts another match on a click. The planner reports
  what it builds, trains and researches, its attacks, relic runs and boon to `aiLog`.
- Not implemented yet: saves and sound.

## Architecture

### File map

- `src/main.ts`: creates the `Phaser.Game` (960x540, FIT scaling, `pixelArt: false`, linen
  background), registers the three scenes, calls `setupGame(game)` from `shared/setupGame.ts` and
  `setupScaling(game)` from `shared/scaling.ts`, and puts `game` on window in dev.
- `src/game/data.ts`: every balance number and roster: `FACTIONS`, `UNITS` (cost, time, stats,
  trainer), `unitFor(faction, role)`, `BUILDINGS`, `BUILD_ORDER`, `TECHS` (with `advance: 2 | 3` on
  the age techs), `GATHER_MS`, `CARRY`, `START`, `START_VILLAGERS`, `DEEDS`, `ARMY_DEED`,
  `AGE3_DAMAGE`, `BOONS`, `SHIELDWALL_TAKEN`, `HARVEST_RITES`, `BUILD_MORE`, `UNIQUE`,
  `UNIQUE_TEXT`, the Forge, Dock and Grove numbers, `UNIT_GAP`, `RELICS` and their bonuses,
  `CLAIM_RANGE`, `LEASH`, `MONUMENT_MS`, `TILE` (32) and `MAP_SIZE` (128).
- `src/game/map.ts`: `generateMap()` draws lakes, rock ridges, forests, bushes and mines, mirrors
  each one, adds each side's starting trees, bushes and mine, then clears the camps' patches. Terrain is `Uint8Array` of
  `GRASS`, `WATER`, `ROCK` and `DIRT`; `Node`s are the resources. `START_TILES` are the two Town
  Center corners.
- `src/game/sim.ts`: the rules, free of Phaser. `createGame` builds the state, `tick` advances it,
  `issue` gives unit orders, `placeBuilding`, `canPlace`, `train` and `research` queue things,
  `chooseBoon` takes the Age II boon, `startRaid` records a raid, `notAllowed` says why a building
  can't be placed at all, `unitCost` applies the Forge, `placeWall`/`wallLine` lay a palisade,
  `setRally` plants a rally flag, `campAt`/`campSpots` find a camp and the tiles round it,
  `monumentLeft` reads a Monument's count, `deedCount` and `deedsDone` read
  the deeds, `findPath` is a breadth-first search on the tile grid, `updateSight` computes the
  player's sight, and `entityAt` finds what is under a point.
- `src/game/planner.ts`: `think(state, dt, side = AI)` runs the AI for a side every 4 s of game time (`THINK_MS`). It issues
  the same commands a player would, through the sim's functions, and at most `ACTIONS_PER_THINK`
  (2) of them each time, about 30 a minute, so it can't out-click a player. Each command goes
  through `act`, which spends the budget only when the command did something. It plays `ME`
  against `FOE`, which `think` sets from `side`; each side keeps its own clock in `state.aiClock`.
- `src/art/stitch.ts`: the embroidery kit: wool palette `T`, `SERIF` font stack, a private seeded
  generator (`reseed`, `rnd`), `linen`, `sew` (laid-and-couched fill), `outline` (stem stitch),
  `thread`, `knot`, `stext`, `bar` and `band` (border pieces), `card`, `canvas`.
  `src/art/figures.ts` also draws the `wild` side (`Side`), the camp guards.
- `src/art/figures.ts`: the units. `WOOL` holds each side's colours; `drawFigure` paints one frame
  of one unit with its feet at a point; `bakeFigureSheet` paints a unit's frames side by side, each
  `FRAME` (64) px with the feet at `FEET`. `VILLAGER_POSES` and `SOLDIER_POSES` list the poses and
  frame counts.
- `src/art/scenery.ts`: buildings (`bakeBuilding`, with `BUILDING_TOP` px above the footprint),
  trees (`bakeTree`, `TREE_TOP` px above the tile), `bakeBush`, `bakeMine`, the ground
  (`paintChunk`, one `CHUNK`x`CHUNK` tile chunk at full size), `bakeFogPattern`, `bakeNeedle`,
  `bakeRallyFlag`, and the camps (`bakeCache`, `bakeRelic`, with `CAMP_TOP` px above the footprint).
- `src/art/ui.ts`: wool `icon`s, the top bar, the panel band, buttons, cards and the menu backdrop.
- `src/scenes/layout.ts`: where every HUD piece sits in game space (`TOP_H`, `PANEL_Y`, the top
  bar's slots and bars, `AGE_PIPS`, `DEED_CARD`, `STATUS_CARD`, `TOAST`, `SEL`, `BUTTONS`, `BOON`,
  `MINI`).
- `src/scenes/BootScene.ts`: bakes every texture once, then starts `Menu`. Keys: `fig-<unit type>`
  for soldiers and `fig-villager-<faction>` for villagers (frames `<pose>-<n>`, e.g. `chop-2`),
  `bld-<faction>-<building>`, `tree-0`..`tree-3`, `bush`, `mine`, `fog-pattern`, `needle`,
  `icon-<kind>`, `icon-banner-<faction>`, `topbar`, `panel`, `btn-on|off|hot`, `card-*`, `backdrop`,
  `rally-flag`, `camp-cache-<res>`, `camp-relic-<relic>-<faction|none>` (`relicKey`) and
  `fig-wild-brigand`/`fig-wild-poacher`.
- `src/scenes/MenuScene.ts`: the three faction cards, each with its three soldiers and its own building. Clicking one
  starts `Game` with that faction and the AI's.
- `src/scenes/GameScene.ts`: the match: state, ground chunks, sprites and their animation frames,
  fog and needle, rings and health threads, input, the panel (selection, buttons, boon cards).
- `src/scenes/hud.ts`: `TopBar`, `DeedCard`, `StatusCard` (relics held and the Monument count),
  `Toast` and `Minimap` (camps, neutral units and every Monument), plus `stitchLine` and
  `stitchEllipse` for thread-like Graphics.
- `src/scenes/fx.ts`: `Effects`: sparks, arrows in flight, damage numbers and drop-off badges.

### State model additions

- `Unit.act` (`idle | walk | gather | build | fight`, set each tick), `Unit.face` (1 or -1) and
  `Unit.struck` (game time of the last blow) drive the animation; they change no rule.
- `Player.age` is 1, 2 or 3; `Player.deeds` is `{ age2, army, raid }` (`army` is the most soldiers
  alive at once); `Player.boon` and `Player.boonPending`.
- `GameState.raid` (`Raid | null`), `raids` and `repelled` counters, and `events`: `hit`, `drop` and
  `grow` events the sim pushes and the scene drains each frame (capped at 400 when nobody drains them).
- `GameState.players` has a third entry, `NEUTRAL` (the camp guards); its `faction` is only a
  placeholder. Code that loops over players skips it where it matters (`updateDeeds`, `checkWinner`).
- `Building.rally`, `doneAt` and `workMs` (the Dock's and Grove's timer); `Unit.post` (a guard's
  post); `GameState.gates`, `camps` and `winBy`.

### How it runs

- `GameScene.update(time, delta)`: clamps `delta` to 250 ms, runs `tick` and `think` (unless there
  is a winner), scrolls the camera, paints ground chunks coming into view (four a frame at most),
  syncs sprites (picking each unit's frame in `frameOf`), turns sim events into effects, redraws the
  fog when sight changed, then the rings, top bar, deeds card, minimap, toast and panel.
- The ground is 512 px chunks painted on first sight into textures `ground-<cx>-<cy>`, removed when
  a new match starts. Fog is a 256 px canvas: the fog pattern masked by a 128x128 sight mask,
  scaled up smoothly, drawn above the world and below the HUD. The needle sits on the edge of the
  unseen land nearest the middle of the view, rechecked every 1.5 s.
- Screens: `setupScaling` draws the canvas at the screen's resolution (`renderScale` canvas pixels
  per game pixel) and zooms every camera to match. `splitHudCamera` gives the Game scene a second,
  fixed camera for everything with a scroll factor of 0 (top bar, panel, cards, end screen), so the
  main camera keeps Phaser's middle origin for `setBounds`, `centerOn` and `setScroll`. Handlers
  turn the pointer into game-space screen points with `viewPoint(pointer)`; `toWorld` and
  `toScreen` go through the main camera and its `worldView`.
- Input: `pointerdown` and `pointerup` on the scene. Clicks on the minimap move the camera, on the
  toast jump to the raid, and in the top bar, the deeds card or the panel are left to the HUD. A
  click under 5 px is a click; otherwise it is a box select. Right click calls `commandAt`.
- Placement: `placing` holds a building type. A click calls `tryPlace`, which centres the footprint
  on the tile under the cursor and sends the nearest selected villager to build it. For the Palisade
  the press records `wallStart` and the release calls `tryWall` with the dragged line; the ghost is a
  stitched square per stake. Ghosts sit above the fog.
- A right click with a production building selected and no units calls `setRally`. A right click on
  a camp sends the selection to its free tiles (soldiers attack-move). A left click on a camp shows
  what it is in the toast.
- The build list's page is `buildPage` (0 or 1); its second page is behind the `Walls & Monument`
  button. A building the player may not place (`notAllowed`) shows disabled.
- The panel is rebuilt when `panelSignature` changes. While `boonPending`, the two boon cards take
  the buttons' place, with `hud` labels `Shieldwall` and `Harvest Rites`.

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
- The Town Center (10 damage every 1.5 s, range 6, 2000 hp) and Watchtowers (12 damage every 1.5 s,
  range 7, 900 hp) shoot anything in range; soldiers fight on their own when idle and
  an enemy is within sight.
- `research` refuses an age tech unless the player is in the age before it, and Age III unless
  `deedsDone`. Shieldwall is applied in `takenBy` (towers and soldiers alike), Harvest Rites in the
  gather step for farms, Age III in `ownBonus`. Hit points can be fractional under Shieldwall.
- One raid is tracked at a time: the planner calls `startRaid` each time it attack-moves, which does
  nothing while a raid is under way.
- `speedOf` in `sim.ts` gives cavalry the Stirrups speed (`STIRRUPS_SPEED`) when they move.
- The AI's gather rate is the only difficulty number: `byDifficulty(0.75, 1, 1.25)` in `GameScene`.
- `canPlace(s, type, tx, ty, owner)` also refuses gate tiles, and a Dock away from water
  (`nearWater`); a gate may go on the owner's own stake.
- A grown tree never goes next to a building, so it can't box one in; its id comes from `nextId`.
- Camps are solid until a cache is taken; relics stay. The camp patches change no other tile of the
  map, so a seed gives the same map as before camps (apart from the cleared patches).

## Save keys

None: there is no save. Settings come from the hub (`shared/settings.ts`).

## Testing hooks

- The dev build sets `window.game`. The playthrough reads `scene.getScene('Game')`: `state` (the
  whole sim, with `units`, `buildings`, `nodes`, `players` (with `age`, `deeds`, `boon`,
  `boonPending`), `winner`, `time`, `raid`), `selected` (a Set of ids), `hud` (the panel's buttons
  or boon cards, in game-space screen coordinates with `label`, `x`, `y`, `w`, `h`), `popLog` (the
  player's drop-off badges, such as `+10 wood`), `toastLog` (raid toasts shown), `toast.shown`,
  `placing`, `attackMode`, `buildMenu`, `buildPage`, `status.shown` (the Monument line),
  `cameras.main.worldView.x/y` (not `scrollX/Y`, which differ once `renderScale` zooms the
  camera), and `toScreen(tx, ty)`. `e2e/screens.spec.ts` at the root opens the game on five screens. `state.camps` lists the camps with `holder`.
- Inputs are canvas clicks (left and right), so the test drives the real controls. It never writes
  to game state.
- It seeds `Math.random`, owns `page.clock`, makes `requestAnimationFrame` a 64 ms timer and forces
  the canvas renderer, the same as Apothecary's test. Art randomness uses `stitch.ts`'s own
  generator, so baking textures does not use up the seeded `Math.random`.
- The first round: harvest (asserts the `+10 wood` badge), a villager, a house, an Academy and Axes,
  another villager, then Age II (asserts the Age II deed and the open boon pick with its two cards),
  picks Harvest Rites, and checks that Age III can't be queued yet.

## Making common changes

- Tune a number: `src/game/data.ts`. If it changes the first round (the harvest, the villager, the
  house, the Academy, Axes or Age II), update the playthrough's expectations too.
- Add a unit: add an entry to `UNITS` with its faction and role, and add it to the faction's trainer
  building. Give it a figure: map its name to a `Kind` in `kindOf` (`src/art/figures.ts`) and, for a
  new kind, its hands and weapon in `footman` or `rider`. `BootScene` bakes a strip for every unit.
- Add a pose: add it to `VILLAGER_POSES` or `SOLDIER_POSES` with its frame count, draw it in
  `villager`, `footman` or `rider`, and pick it in `GameScene.frameOf`.
- Add a building: add it to `BUILDINGS` and `BUILD_ORDER` (or `BUILD_MORE`; page one holds 10 plus
  two buttons, so it is full), give it a painter in `PAINT`
  (`src/art/scenery.ts`), and if it trains or researches, make `trains` or `research` say so. The
  panel and the planner pick it up from the data; add it to `BUILD_PLAN` in the planner if the AI
  should build it.
- Add a tech: add it to `TECHS` with its building and cost, then give its effect a line in the sim
  (`gatherBonus` for gathering, `ownBonus` for damage; `research` checks `age2` and `advance`).
- Add a deed: add it to `DEEDS` and `Player.deeds`, keep it in `updateDeeds` and `deedCount`, and
  give it a row in `DeedCard.update`.
- Add a boon: add it to `BOONS`, apply it in the sim, and the panel shows a third card (widen
  `BOON` in layout.ts to fit).
- Add a faction: add it to `FACTIONS` and `FACTION_IDS`, its colours to `WOOL`, its three units to
  `UNITS` (one each for melee, ranged and cavalry), its own building to `BUILDINGS` (with `faction`),
  `UNIQUE` and `UNIQUE_TEXT`, and the menu shows a card for it (re-space the cards for four).
- Add a relic: add it to `RELICS`, apply it in the sim behind `holds`, give it a sign in `bakeRelic`
  and an icon in `RELIC_ICON` (hud.ts), and put a camp for it in `CAMP_PLAN` (mirrored pairs keep
  the map fair).

## Gotchas

- `src/game/sim.ts` and `map.ts` import nothing from Phaser, so keep them free of it; the scene
  does all drawing.
- Never call `Math.random` in the art: the playthrough seeds it and the map is generated after the
  textures are baked. Use `reseed`/`rnd` from `stitch.ts`.
- A `Map` is not JSON. The test reads `state.units` and `state.buildings` as arrays, not as maps.
- Node ids come from the map and buildings and units start at 1000, so the two never clash.
- Units standing on a tile block placing a building there, and `pursue` gives up when it finds no
  path, so a unit can go idle; the planner reassigns builders each think for that reason.
- Building and tree textures are taller than their footprint (`BUILDING_TOP`, `TREE_TOP`); place
  them that much higher.
- Don't put a red cross in any sprite or icon (root rule). The raid's minimap rings and the toast's
  arrow are red; keep them rings and a triangle. The Relic of Valor's sword is drawn in ink and grey.
- `pointer.x/y` and `this.scale` are canvas pixels, `renderScale` times game space: read pointers
  through `viewPoint`, and give anything new on the HUD a scroll factor of 0 (a container too) so
  `splitHudCamera` draws it with the fixed camera.
- Painted textures are still baked at 1x, so on big screens the art is upscaled while text and
  Graphics are drawn sharp.
- A new scene needs `this.input.on(...)` handlers that check `this.endPanel` and the HUD bounds,
  or clicks will reach the world under the panel.
