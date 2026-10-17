# Colonizer: guide for agents

How Colonizer is built and where things stand, for agents about to change it. README.md covers how
to play and the difficulty table. Keep this file up to date in the same PR as any change to the game,
as the root AGENTS.md asks.

## Current state

Colonizer is a skirmish RTS: one player against one AI (or two, in a three-way match) on a 128x128 tile map, with three factions
(Ember Legion, Tide Coven, Thorn Grove) that differ in their three combat units, one unique
building each (Forge, Dock, Grove) and an Age III champion. The map is
generated each match from `Math.random` in one of three kinds (Lowlands, Lakes, Highlands) and is
point-symmetric, so both sides start the same. It is
drawn as the Bayeux tapestry: wool laid-and-couched work and stem-stitch outlines on linen, painted
in code on 2D canvases (no image files), with `pixelArt` off.

- Implemented: a menu that picks the map kind, one or two AI rivals and the faction (the AI plays
  the next one along, the second AI the one after), fog of war (unseen,
  explored and in sight), click, Shift and box selection, control groups (1 to 9, Ctrl to set),
  right-click commands (attack, gather, build, walk; on a touch screen a tap gives them, `tapOrder`), attack-move (A), stop (S), build placement with
  a green or red ghost, a bottom panel with the selection, buttons for training, research and the
  build list, and a minimap; a top bar with resources, population, a three-pip age track, the match
  clock, the faction, the chosen boon and Age III edge; and an end screen with Victory or Defeat and a click back
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
  and takes wood); Palisade and Gate (`palisade: true`); the Market (`market: true`, `age: 2`, takes
  ore, trains carts); the Monument (`age: 3`). `limit` caps how
  many a player may have. The build list has two pages: `BUILD_ORDER` plus the faction's building,
  then `BUILD_MORE` (Palisade, Gate, Market, Monument) behind the `Walls & More` button.
- Roles (`Role` in data.ts): `villager` and `cart` are civil (`isCivil`), `melee`, `ranged`,
  `cavalry`, `siege` (the Ram) and `champion` are soldiers (`isSoldier`); `earnsRanks` is every
  soldier but the Ram. `unitFor(faction, role)` also finds the shared `neutral` units (villager,
  cart, ram). A `UnitDef` may carry `age` (trained from that age), `limit` (alive, sheltering or
  queued, counted by `unitCount`) and `gift` (a champion's power).
- The town bell (`ringBell`, `releaseBell`, `Player.bell`): villagers within `BELL_RANGE` of a
  shelter (a building with `shelter`: the Town Center 12, a finished Watchtower 5) get a `garrison`
  order, walk there and are moved out of `s.units` into `Building.garrison`. Each adds
  `GARRISON_ARROW` to the building's volley. `releaseBell` (or a shelter falling, in `reap`) puts them
  back on free tiles round it and `backToWork` sends each to its old node. `Player.bell` is only set
  when `ringBell` sent someone. `garrisoned` counts them;
  `popUsed` and `unitCount` include them. The AI rings when an enemy soldier is within `BELL_RANGE`
  of its Town Center and releases when none is.
- Veteran ranks (`Unit.kills`, `Unit.rank`): a kill of a unit in `strike` counts; `RANK_KILLS`
  gives rank 1 to 3, each worth `RANK_HP` (added to `maxHp(u)` and healed at once) and `RANK_DMG` in
  `ownBonus`. The scene draws chevrons over the head and names the rank (`RANK_NAMES[rank - 1]`).
- The Market and trade carts: `trade(s, owner, res, dir)` swaps `MARKET_LOT` wood or food for ore
  at `marketPrice` (`MARKET_BASE` times `Player.rates[res]`, sales pay `MARKET_SELL` of it); each
  trade moves the rate by `MARKET_STEP` within `MARKET_RATE_MIN..MAX`, and `updateMarkets` drifts
  rates back to 1 by `MARKET_DRIFT` a second. A cart (`cartUpdate`, order `trade`) drives to the
  nearest trading post (`GameState.posts`, from `MapData.posts`: two 2x2 halls on the map's
  anti-diagonal, so each is as far from either Town Center, cleared like camps and solid), loads
  `TRADE_ORE`, returns it to the nearest ore drop-off, and sets off again; a new cart trades at
  once. `postAt` finds a post under a point. The AI builds a Market after its Watchtower, keeps
  `AI_CARTS` carts, and swaps by `SWAP_HIGH`/`SWAP_LOW`.
- Siege rams (`ram`, role `siege`, Barracks, Age II): `nearestEnemy` with `structures` picks every
  building including palisades, so a ram goes for walls on its own; `strike` does nothing to a unit,
  and `issue` turns an attack order on a unit into a walk. The AI keeps `AI_RAMS` with its army.
- Champions (`gift` on the def, Town Center, Age III, `limit: 1`): the Ember Warlord (`aura`: own
  soldiers within `AURA_RANGE` get `AURA_DMG` in `ownBonus`, `inAura`), the Tide Seer (`sight` 14),
  the Thorn Druid (`heal`: `HEAL_HP` to own units within `HEAL_RANGE` every `HEAL_MS`, `Unit.pulse`).
  The scene rings the aura and heal ranges with a faint ellipse.
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
  Age II, 14 soldiers alive at once, repel a raid) before it can be researched, gives every
  soldier +2 damage (`AGE3_DAMAGE`) and opens the edge pick (`EDGES`, `chooseEdge`,
  `Player.edge`/`edgePending`): Masonry (`buildingHp` is `MASONRY_HP` times the def's, and what
  stands is scaled up on the pick) or Muster (soldiers' queue time runs `MUSTER_SPEED` times as fast,
  in `updateBuilding`). The top bar shows the edge's icon (`icon-stone`, `icon-drum`) at x 752.
- Map kinds (`MAP_KINDS`, `generateMap(kind, sides)`): Lowlands is the map as first designed (a
  seed gives the same map as before kinds); Lakes draws 12 lakes of radius 3 to 6, two of radius 6
  either side of the middle and a pond by each start; Highlands draws two ridges along x + y =
  `HIGH_RIDGE` (88) and its mirror, broken by `HIGH_PASSES`, whose surroundings are reserved from
  other terrain and nodes. `generateMap` redraws (up to 30 times) a map on which `connected` finds a
  Town Center corner, camp or trading post cut off by water or rock.
- Three-way matches: `createGame(sides, map, toLast)` takes a `SideSetup` per side; a third one
  becomes `AI2` (index 3, after `NEUTRAL`), starting at `THIRD_START` (top right). With `sides` 3
  the map keeps that corner and its mirror (`FOURTH_CORNER`, left free) clear, gives both the start
  trees, bushes and mine flipped left to right, and adds `THIRD_CAMPS` (two caches and their
  mirrors). `MapData.starts` lists the Town Center corners in side order (`SIDES`). Every side is
  everyone's enemy. A side whose Town Center falls is `out` (`checkWinner`): if the match goes on,
  its units and buildings fall and its relics are freed; it ends with one side left, or when the
  player is out unless `toLast` (watch mode). `rivalsOf(s, owner)` lists the sides still in;
  `threeWay(s)` says whether there is a second AI. Only raids on the player are tracked as
  `GameState.raid` in a three-way match; the AIs' raid deeds come from `updateAssault`, which
  watches every AI's base for soldiers of any other side.
- Temperaments (`TEMPERAMENTS`, `Player.temperament`): each AI side draws Raider, Builder or Warden
  in `GameScene.create` (the player's side too when watching). A temperament sets the planner's
  build plan (`plan`, with `unique` for the faction's building), research order, soldier order
  (`roles`), Watchtowers kept (`towers`), palisade (`wall`: from which age, stakes each side of the
  gate), raid gate (`firstRaid`, `rest`, `army`, `party`) and its boon and edge. The player learns
  it once their sight touches that side's Town Center (`Player.scouted`, set in `updateSight`); the
  status card's Rivals row shows `?` until then.
- Raids: when the AI attack-moves its army at the player, the sim records a `Raid` (who, which
  units, where they are, how many are routed). The scene shows a horn toast naming it with an arrow
  towards it for 10 s, the minimap pulses rings where it is, and the deeds card counts the routed.
  Killing every raider repels it and does the raid deed. The AI's raid deed comes from the player's
  attacks instead (`updateAssault`, `GameState.assault`): `ASSAULT_MIN` (3) player soldiers within
  `BELL_RANGE` of its Town Center start one, and once none of them is within `ASSAULT_CLEAR` (20)
  tiles it ends, repelled if at least half of them fell. The AI's Monument rush is a raid with the
  Monument as its goal, so it ends like any other once the Monument falls.
- Feedback: hits throw ochre sparks, arrows fly from ranged attackers and towers, damage numbers
  rise, and every load the player drops off pops a "+N" badge with the resource's icon.
- The AI is a rule-based planner (`src/game/planner.ts`), not a full build-order search: it keeps
  villagers coming, builds houses before the cap, then its temperament's build plan, researches in
  its order (Age III last, once its deeds are done), trains an army in its order, raids (below) and
  picks its boon and edge. It also builds its faction's building (a Dock on the nearest shore), sets
  each production building's rally flag in front of its base, lays a diagonal palisade with a gate
  in the middle across its front (`buildWall`, the temperament's `wall`), sends an army of 8 or more
  to take the nearest relic it doesn't hold between raids, builds a Monument in Age III, and attacks
  a standing rival Monument with everything at once. Its foe for each think is `foeFor`: the raid
  under way's (`AiRaid.foe`), else a rival with a Monument, else the rivals by turns (`count`).
- AI raids (`raidGoal`, `pressRaid` in the planner, `GameState.aiRaid` per side): none before its
  temperament's `firstRaid`, and its `rest` after one ends before the next; it needs `army`
  soldiers, half of them idle or walking. Each raid has a `RaidGoal`: the first the
  enemy's outlying economy (a `RAID_ECONOMY` building at least `RAID_CLEAR` tiles from its Town
  Center, else any outlying building), the second a relic it holds (each falling back on the other),
  from `RAID_TOWN_FROM` (the third) or in Age III its Town Center; a Monument always comes first.
  Economy and relic raids send the temperament's `party` of soldiers nearest the goal; a Town Center raid
  sends everyone. Idle raiders are sent at the goal again; the party walks home when the goal is
  done, when half of it has fallen (`endRaid(s, by, true)`: repelled, the deed is done) or after
  `RAID_MAX_MS` for a non-town raid (`endRaid(s, by, false)`: withdrawn).
- Watch AI (`?watch`, `shared/watch.ts`): Boot skips the menu and starts `Game` with two random
  different factions on a random map kind, half the time with the third faction as a second AI; the
  planner plays every side (`GameScene.aiSides`, `think(state, dt, PLAYER)` as well), the sides are
  named with their temperaments, every side gathers
  at the Normal rate, the whole map stays in sight (`sight.fill(2)` each frame), the sim runs
  `watchSteps()` times a frame, the panel shows no buttons, right clicks and hotkeys do nothing, and
  the end screen names the winning faction and starts another match on a click. The planner reports
  what it builds, trains and researches, its attacks, relic runs and boon to `aiLog`.
- Languages: British English (the source), US English and German, following the hub's Language
  setting (`?lang=de` for a quick look): the menu, HUD, panel, notices, end screens, How to play and
  the watch log. Names that are the same in German (the game's title, the Palisade) are in
  `keepEnglish` in `src/i18n/de.ts`.
- Not implemented yet: saves and sound.

## Architecture

### File map

- `src/howToPlay.ts`: the How to play screen's text (goal, controls, core loop and tips) in British
  English, US English (the same with "Town Center", made by `us`) and German, picked with
  `byLanguage` and handed to `setupGame(game, { howToPlay })` in `src/main.ts`; update every language
  when the controls or the first round change.
- `src/i18n.ts` and `src/i18n/`: the game's texts (`shared/i18n.ts`). `i18n/en.ts` is the British
  English source (Town Centre, Relic of Valour), `i18n/de.ts` the German and `i18n/en-US.ts` only the
  texts spelled differently in US English (Town Center, Relic of Valor). `t(key, vars)` shows a text
  in the hub's language; `TextKey` types the keys. Every text on screen, the sim's notices and the
  planner's watch log go through `t`, and a new one gets its German entry (and a US one if its
  spelling differs) in the same PR.
- `src/main.ts`: creates the `Phaser.Game` (960x540, FIT scaling, `pixelArt: false`, linen
  background), registers the three scenes, calls `setupGame(game)` from `shared/setupGame.ts` and
  `setupScaling(game)` from `shared/scaling.ts`, and puts `game` on window in dev.
- `src/game/data.ts`: every balance number and roster (names and texts are `TextKey`s, shown with `t`): `FACTIONS`, `UNITS` (cost, time, stats,
  trainer, `age`, `limit`, `gift`), `unitFor(faction, role)`, `isCivil`/`isSoldier`/`earnsRanks`,
  `BUILDINGS`, `BUILD_ORDER`, `TECHS` (with `advance: 2 | 3` on
  the age techs), `GATHER_MS`, `CARRY`, `START`, `START_VILLAGERS`, `DEEDS`, `ARMY_DEED`,
  `AGE3_DAMAGE`, `BOONS`, `SHIELDWALL_TAKEN`, `HARVEST_RITES`, `EDGES`, `MASONRY_HP`, `MUSTER_SPEED`,
  `MAP_KINDS`, `TEMPERAMENTS`, `BUILD_MORE`, `UNIQUE`,
  `UNIQUE_EFFECT` (what each faction's building does), the Forge, Dock and Grove numbers, `UNIT_GAP`, `RELICS` and their bonuses,
  `CLAIM_RANGE`, `LEASH`, the bell (`BELL_RANGE`, `GARRISON_ARROW`), the ranks (`RANK_KILLS`,
  `RANK_HP`, `RANK_DMG`, `RANK_NAMES`, rank r's at `r - 1`), the Market (`MARKET_*`, `TRADE_ORE`), the champions
  (`AURA_*`, `HEAL_*`), `MONUMENT_MS`, the raid pacing (`RAID_TOWN_FROM`, `RAID_MAX_MS`,
  `ASSAULT_MIN`, `ASSAULT_CLEAR`; the rest is per temperament), `TILE` (32) and `MAP_SIZE` (128).
- `src/game/map.ts`: `generateMap(kind, sides)` draws lakes, rock ridges (and Highlands' long
  ridges), forests, bushes and mines, mirrors each one, adds each side's starting trees, bushes and mine, then clears the camps' and the two
  trading posts' patches (`POST_PLAN` and its mirror, `MapData.posts`). Terrain is `Uint8Array` of
  `GRASS`, `WATER`, `ROCK` and `DIRT`; `Node`s are the resources. `START_TILES` are the two Town
  Center corners of a two-side match, `THIRD_START` the second AI's.
- `src/game/sim.ts`: the rules, free of Phaser. `createGame` builds the state, `tick` advances it,
  `issue` gives unit orders, `placeBuilding`, `canPlace`, `train` and `research` queue things,
  `chooseBoon` takes the Age II boon, `chooseEdge` the Age III edge, `buildingHp` reads a building's
  full health, `startRaid` records a raid (its `from` is a compass `TextKey`), `notAllowed` says why a
  building can't be placed at all (a translated text, or null), `unitCost` applies the Forge, `placeWall`/`wallLine` lay a palisade,
  `ringBell`/`releaseBell` run the garrison, `trade`/`marketPrice` the Market, `maxHp`, `unitCount`,
  `garrisoned`, `shelters`, `inAura` and `postAt` read things,
  `setRally` plants a rally flag, `endRaid` ends a raid whose raiders turn back, `campAt`/`campSpots` find a camp and the tiles round it,
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
  `FRAME` (64) px with the feet at `FEET`. `VILLAGER_POSES`, `SOLDIER_POSES` and `CART_POSES` list
  the poses and frame counts. Kinds beyond the weapons: `cart` (a villager pulling a cart), `ram`
  (the slung log and two crewmen), and the champions `warlord` (a plumed, gold-shielded swordsman),
  `seer` and `druid` (robed, with a `staff`).
- `src/art/scenery.ts`: buildings (`bakeBuilding`, with `BUILDING_TOP` px above the footprint, the
  Market among them), the trading post (`bakePost`, also `BUILDING_TOP` above its 2x2 footprint),
  trees (`bakeTree`, `TREE_TOP` px above the tile), `bakeBush`, `bakeMine`, the ground
  (`paintChunk`, one `CHUNK`x`CHUNK` tile chunk at full size), `bakeFogPattern`, `bakeNeedle`,
  `bakeRallyFlag`, and the camps (`bakeCache`, `bakeRelic`, with `CAMP_TOP` px above the footprint).
- `src/art/ui.ts`: wool `icon`s, the top bar, the panel band, buttons, cards and the menu backdrop.
- `src/scenes/layout.ts`: where every HUD piece sits in game space (`TOP_H`, `PANEL_Y`, the top
  bar's slots and bars, `AGE_PIPS`, `DEED_CARD`, `STATUS_CARD`, `TOAST`, `SEL`, `BUTTONS`, `BOON`,
  `MINI`).
- `src/scenes/BootScene.ts`: bakes every texture once, then starts `Menu`. Keys: `fig-<unit type>`
  for a faction's soldiers and `fig-<unit type>-<faction>` for the shared neutral units (villager,
  cart, ram), with frames `<pose>-<n>` (e.g. `chop-2`),
  `bld-<faction>-<building>`, `post`, `tree-0`..`tree-3`, `bush`, `mine`, `fog-pattern`, `needle`,
  `icon-<kind>`, `icon-banner-<faction>`, `topbar`, `panel`, `btn-on|off|hot`, `card-*`, `backdrop`,
  `rally-flag`, `camp-cache-<res>`, `camp-relic-<relic>-<faction|none>` (`relicKey`) and
  `fig-wild-brigand`/`fig-wild-poacher`.
- `src/scenes/MenuScene.ts`: the three faction cards, each with its three soldiers and its own
  building, and two rows of toggles (`MENU_OPTS`: map kind, one or two AIs, kept in the module's
  `options` for the session). Clicking a card starts `Game` with that faction, the AI's, the second
  AI's (or null) and the map kind.
- `src/scenes/GameScene.ts`: the match: state, ground chunks, sprites and their animation frames,
  fog and needle, rings and health threads, input, the panel (selection, buttons, boon cards).
- `src/scenes/hud.ts`: `TopBar`, `DeedCard`, `StatusCard` (relics held, the Rivals row with each
  rival's banner and temperament or `?`, and the Monument count),
  `Toast` and `Minimap` (camps, neutral units and every Monument, each side in its colour, and a `?`
  over every rival corner not yet seen), plus `stitchLine` and
  `stitchEllipse` for thread-like Graphics.
- `src/scenes/fx.ts`: `Effects`: sparks, arrows in flight, damage numbers and drop-off badges.

### State model additions

- `Unit.act` (`idle | walk | gather | build | fight`, set each tick), `Unit.face` (1 or -1) and
  `Unit.struck` (game time of the last blow) drive the animation; they change no rule. `Unit.kills`
  and `Unit.rank` are the veteran ranks, `Unit.pulse` a champion's heal timer. Orders also include
  `garrison` (a villager running to a shelter) and `trade` (a cart heading for a post).
- `Player.age` is 1, 2 or 3; `Player.deeds` is `{ age2, army, raid }` (`army` is the most soldiers
  alive at once); `Player.boon` and `Player.boonPending`, `Player.edge` and `Player.edgePending`,
  `Player.temperament`, `Player.scouted` and `Player.out`; `Player.bell` (the bell is ringing) and
  `Player.rates` (the Market's wood and food rates).
- `GameState.raid` (`Raid | null`), `raids` and `repelled` counters, `assault` (per AI side, by
  index: the ids of other sides' soldiers attacking its base, or null), `toLast`, and `events`: `hit`, `drop` and
  `grow` events the sim pushes and the scene drains each frame (capped at 400 when nobody drains them).
- `GameState.players` has a third entry, `NEUTRAL` (the camp guards); its `faction` is only a
  placeholder. Code that loops over players skips it where it matters (`updateDeeds`, `checkWinner`).
  A three-way match has a fourth, `AI2`; per-side arrays (`aiClock`, `aiRaid`, `assault`) have one
  entry per player, the guards' unused.
- `GameState.aiRaid[side]`: `next` (earliest time of the next raid), `foe`, `count`, `goal`, `party`
  and `started`; the planner's memory, which changes no rule.
- `Building.rally`, `doneAt`, `workMs` (the Dock's and Grove's timer) and `garrison` (the
  sheltering villagers, as whole `Unit`s taken out of `units`); `Unit.post` (a guard's post);
  `GameState.gates`, `camps`, `posts` and `winBy`.

### How it runs

- `GameScene.update(time, delta)`: clamps `delta` to 250 ms, runs `tick` and `think` for each of
  `aiSides` (unless there is a winner), scrolls the camera, paints ground chunks coming into view (four a frame at most),
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
- The build list's page is `buildPage` (0 or 1); its second page is behind the `Walls & More`
  button. A building the player may not place (`notAllowed`) shows disabled. `renderPanel` closes
  the build list (`buildMenu`, `buildPage`) whenever the selection changes (`panelSelection`) or no
  villager is left in it, so clicking another unit or building shows its own buttons.
- Panel buttons are `Action`s: an `id` in no language (a unit, building or tech id, `build`,
  `more`, `back`, `bell`, `release`, `buy-wood` and so on), the `name` and the `sub` line under it (a
  cost from `costText`, the age it waits for, or "one only"). `fitWidth` squeezes a name or line
  that would run past the button, for long German words. `info(dx, dy, lines)` wraps the selection's
  lines before the buttons.
- The panel is rebuilt when `panelSignature` changes (it also watches the bell, the Market rates
  and the champion count). While `boonPending` (or `edgePending`), `renderPick` puts the two boon
  (or edge) cards in the buttons' place, with `hud` ids `shieldwall` and `harvest` (or
  `masonry` and `muster`). The Town Center's buttons
  are the Villager, the champion, `Ring the bell` or `Back to work`, and the age; a Market's are the
  Trade Cart and `Buy 100 wood` / `70 ore` buy and sell buttons with the live price; selected carts
  get `Trade`. A unit whose age is too low shows the age under its name (`Ram`, `Age II`), a
  champion at its limit `one only`.
- Right click on a trading post sends selected carts trading (`postAt`) and everyone else there;
  carts otherwise take move orders with the soldiers. A left click on a post says what it is.

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
- One raid is tracked at a time (`GameState.raid`): `startRaid` does nothing while a raid is under
  way, so in watch mode a side's raid can go untracked while the other's is on. A raid ends when
  every raider has fallen (repelled) or with `endRaid` when the planner calls its party home.
- `speedOf` in `sim.ts` gives cavalry the Stirrups speed (`STIRRUPS_SPEED`) when they move.
- Garrisoned villagers are not in `s.units`, so nothing targets, draws or selects them; code that
  counts a player's villagers (the planner's `TARGET_VILLAGERS`) adds `garrisoned(s, owner)`.
- A ram's `strike` on a unit does nothing, so never give one a unit as an attack target: `issue`
  and `nearestEnemy('structures')` keep them on buildings.
- The AI's gather rate is the only difficulty number: `byDifficulty(0.75, 1, 1.25)` in `GameScene`,
  for both AIs in a three-way match.
- `GameScene` draws the temperaments after `generateMap`, so a seed gives the same map as before
  temperaments; the playthrough's first round ends long before any temperament's first raid.
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
  or boon cards, in game-space screen coordinates with `id`, `label`, `x`, `y`, `w`, `h`; the test
  finds a button by its `id`, so it plays in any language, and `label` is the translated text),
  `popLog` (the player's drop-off badges by resource id, such as `+10 wood`, in no language),
  `toastLog` (raid toasts shown, translated), `toast.shown`,
  `placing`, `attackMode`, `buildMenu`, `buildPage`, `status.shown` (the Monument line),
  `status.temperaments` (each rival's temperament as the card shows it, translated, `?` until scouted),
  `cameras.main.worldView.x/y` (not `scrollX/Y`, which differ once `renderScale` zooms the
  camera), and `toScreen(tx, ty)`. `e2e/screens.spec.ts` at the root opens the game on five screens. `state.camps` lists the camps with `holder`, `state.posts` the trading posts,
  and each building's `garrison` the villagers inside it.
- The playthrough runs in British English, the default language, and plays the same in German
  (`?lang=de`), since it finds buttons by `id`.
- Inputs are canvas clicks (left and right), so the test drives the real controls. It never writes
  to game state.
- It seeds `Math.random`, owns `page.clock`, makes `requestAnimationFrame` a 64 ms timer and forces
  the canvas renderer, the same as Apothecary's test. Art randomness uses `stitch.ts`'s own
  generator, so baking textures does not use up the seeded `Math.random`.
- The first round: harvest (asserts the `+10 wood` badge), a villager, a house, an Academy and Axes,
  another villager, then Age II (asserts the Age II deed and the open boon pick with its two cards),
  picks Harvest Rites, and checks that Age III can't be queued yet.

## Making common changes

- Add or change a text: its key in `src/i18n/en.ts`, the German in `src/i18n/de.ts` (the build
  fails without it) and, when it spells "Centre" or "Valour", the US spelling in `src/i18n/en-US.ts`;
  run `node scripts/check-translations.mjs`. German runs longer: the panel's buttons (squeezed by
  `fitWidth`), the deeds card's rows and the top bar's labels are the tightest spots, so check a new
  text with `?lang=de`. Never compare a translated text in code; compare ids.
- Tune a number: `src/game/data.ts`. If it changes the first round (the harvest, the villager, the
  house, the Academy, Axes or Age II), update the playthrough's expectations too.
- Add a unit: add an entry to `UNITS` with its faction, role and name key (in the `i18n/` files), and add it to the faction's trainer
  building. Give it a figure: map its name to a `Kind` in `kindOf` (`src/art/figures.ts`) and, for a
  new kind, its hands and weapon in `footman` or `rider`. `BootScene` bakes a strip for every unit.
  A new role needs a line in `isCivil`/`isSoldier`, a branch in `updateUnit` and `frameOf`, and its
  poses in `framesFor`.
- Add a champion gift: a value of `gift` on the def, its numbers in data.ts, and its effect in the
  sim (`ownBonus` for damage, `updateUnit` for a pulse like the heal); the scene's selection text and
  the range ring in `renderRings` read `gift` too.
- Add a pose: add it to `VILLAGER_POSES` or `SOLDIER_POSES` with its frame count, draw it in
  `villager`, `footman` or `rider`, and pick it in `GameScene.frameOf`.
- Add a building: add it to `BUILDINGS` (its name key in the `i18n/` files) and `BUILD_ORDER` (or `BUILD_MORE`; page one holds 10 plus
  two buttons, so it is full), give it a painter in `PAINT`
  (`src/art/scenery.ts`), and if it trains or researches, make `trains` or `research` say so. The
  panel and the planner pick it up from the data; add it to `BUILD_PLAN` in the planner if the AI
  should build it.
- Add a tech: add it to `TECHS` with its building and cost, then give its effect a line in the sim
  (`gatherBonus` for gathering, `ownBonus` for damage; `research` checks `age2` and `advance`).
- Add a deed: add it to `DEEDS` and `Player.deeds`, keep it in `updateDeeds` and `deedCount`, and
  give it a row in `DeedCard.update`.
- Add a boon: add it to `BOONS`, apply it in the sim, and the panel shows a third card (widen
  `BOON` in layout.ts to fit). An Age III edge goes the same way in `EDGES`, with its icon in
  `renderPick` and `TopBar.update`.
- Add a temperament: add it to `TEMPERAMENTS`; the planner reads every field from it, the scene
  draws it and the status card names it.
- Add a map kind: add it to `MAP_KINDS` and give it its terrain in `drawMap` (map.ts); the menu
  shows a toggle for it (re-space `MENU_OPTS` for a fourth). Keep Lowlands' `Math.random` calls as
  they are, so the playthrough's seeded map stays the same.
- Add a faction: add it to `FACTIONS` and `FACTION_IDS`, its colours to `WOOL`, its three units to
  `UNITS` (one each for melee, ranged and cavalry), its own building to `BUILDINGS` (with `faction`),
  `UNIQUE` and `UNIQUE_EFFECT` (with its texts in the `i18n/` files), and the menu shows a card for it (re-space the cards for four).
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
  The Druid's heal ring is green, never a cross.
- `pointer.x/y` and `this.scale` are canvas pixels, `renderScale` times game space: read pointers
  through `viewPoint`, and give anything new on the HUD a scroll factor of 0 (a container too) so
  `splitHudCamera` draws it with the fixed camera.
- Painted textures are still baked at 1x, so on big screens the art is upscaled while text and
  Graphics are drawn sharp.
- A new scene needs `this.input.on(...)` handlers that check `this.endPanel` and the HUD bounds,
  or clicks will reach the world under the panel.
