# Lane Brawl: guide for agents

How Lane Brawl is built and where things stand, for agents changing it. README.md covers how to
play, the champions, the upgrades and the difficulty. Keep this file up to date with any change to
the game, per the root AGENTS.md.

## Current state

Lane Brawl is a single-player MOBA on one 2800x2800 square map with three lanes, a river, towers,
inhibitors, minion waves, a jungle of twelve camps, watchstones, a guardian beast, tall grass, fog of
war, two Nexuses, five champions a side and a shop. The player picks one of fifteen champion classes,
from medieval fantasy to steampunk and beasts,
and fights with four AI allies against five AI champions on red; every champion gets a random name. The art is low-poly 3D: every unit is a small mesh built in code and rendered at boot by a
software renderer into sprite frames; there are no image assets besides the cover and favicon.

Implemented today:

- Pick screen with the fifteen classes in three rows of five cards (3D figure, the champion's random
  name, class and role, passive), a line under them with the blurb of the card under the pointer
  (`hoverPick`) and a New names button (`REROLL`), then one match.
- Map (`WORLD` 2800x2800): the blue Nexus at the bottom left, the red at the top right; top and
  bottom lanes along the edges, the middle lane on the diagonal. Everything red is blue mirrored
  through the centre (`mirror`, `both` in `data.ts`), with top and bottom lanes swapped. Two towers
  per team per lane, an inhibitor per team per lane near its Nexus (`INHIBITORS`), the river
  (`RIVER`, top left to bottom right, crossing the middle lane), twelve camps (`CAMPS`), three
  watchstones on river islands (`WATCHSTONES`), the beast's pit by the river (`BEAST`), eighteen
  bushes (`BUSHES`), four ruins (painted only) and minion waves every 25 s (three per lane per team).
- Champions: fifteen classes (`CHAMPIONS`): ten medieval (Warden to Lancer) and five steampunk or
  beast (Gunslinger, Automaton, Tinker, Wolfkin, Bruin), each with a passive (`PassiveDef`: `tough`, `critEvery` and
  `critMult`, `haste`, `spellpower`, `aura`, `lifesteal`, `regen`, `slowHit`, `ambush`, `splash`)
  and Q, W, E, R. Abilities are data: `burst` (around a point or the caster, with optional `knock`),
  `bolt` (projectiles, optionally piercing, with optional `pull` or `executeBelow`), `dash` (move,
  hit where it lands), `ally` (heal, shield and optional `buff` for allied champions), `buff` (a
  timed `BuffDef` on the caster: attack speed, damage, speed, lifesteal, armor, cooldowns, regen,
  slowing hits or stealth) and `zone` (a lingering circle that hurts enemies by `dps` and slows
  them, in `s.zones`). R unlocks at level 3; levels run 1 to 5.
- Names (`names.ts`): `championName(classId, rnd, taken)` joins a syllable first name (for the
  Automaton a maker's mark and number, like KR-6) to a byname for the class; `createGame` names every champion (the player's from the pick card), no two alike.
  `shortName` drops the byname for the portrait and notices.
- Jungle (LB6): camps of five kinds (`CAMP_KINDS`): boars, wolf packs (an alpha and two pups, one
  `group`), and per side one ember and one moss brute, whose slayer gets a 60 s buff (`BUFFS`, in
  `Unit.buffs`). Hitting one camp wakes its pack; a camp heals 5% a second when left alone and
  ignores stealthed champions. `damage` spares a camp from a champion that neither targets it nor
  is already fighting it, so splash and bursts from a lane fight don't steal or wake camps.
- Watchstones (LB6): `'watchstone'` units, neutral until a team's champions stand within
  `WATCH.radius` with no enemy champion there for `WATCH.captureMs` (`updateWatchstones`,
  progress in `Unit.capture`); a held one gives its team `SIGHT.watchstone` of vision.
- Fog of war (LB6): `updateVision` sets `Unit.hidden[team]` each tick for every unit no unit of that
  team sees (`viewers`: champions, minions, towers, inhibitors, Nexuses and held watchstones, each
  with its `SIGHT`), plus champions in a bush or stealthed. Structures and watchstones are never
  hidden. The view darkens what blue can't see on the map and the minimap (`updateFog`,
  `paintFog`) and skips hidden units, effects, projectiles and zones there.
- Gold (passive plus last hits and kills), XP shared by nearby champions, respawns that scale with
  level.
- Items (LB4): thirteen in `ITEMS`, bought near the Nexus (`atShop`, `SHOP_RANGE`) or anywhere while
  the champion is dead (`buy` skips the distance then), each owned once, at most `MAX_ITEMS` (6) in
  the bag. Seven are parts (the Healing Flask among them); five build `from` parts: buying one uses
  up the parts owned and takes their cost off its price (`priceFor`, `buy`); the thirteenth is the
  Vision Ward (below). Items add flat damage,
  armor, health and speed, plus percent attack speed (`atk`) and cooldown reduction (`cdr`). Two add
  an `active` (`ACTIVES`): Phase Boots dash 220 px on D, the Healing Flask heals 220 on H (F is the
  hub's full screen key), through `useActive`, with cooldowns in `Unit.activeCds`; the third
  `ACTIVES` row is the ward on V. The shop is a 4x4
  grid of cards (the last row holds the ward alone); the bag shows as six slots in the portrait card
  and the actives as three narrow buttons under the shop button.
- Vision wards (LB6, round 2): the `'ward'` item (`ItemDef.ward`) is a consumable: `buy` adds one to
  `Unit.wards` (up to `WARD.carry`) and takes no bag slot. `useActive(..., 'ward', aim)` calls
  `plantWard`, which spawns a `'ward'` unit (`spawnWard` in `state.ts`) within `WARD.range` of the
  champion, with `hp` `WARD.hits` and `expiresAt` `WARD.ms` from now. A ward gives its team
  `SIGHT.ward` of sight (`sightOf`, `viewers`) and `updateVision` lets it see champions in a bush
  within that sight. `damage` takes exactly one hit off a ward whatever the amount; projectiles and
  zones skip wards; `kill` pays `WARD.gold` to a champion killer and notices blue's losses. Dead and
  burnt-out wards are dropped each tick like dead minions. AI champions (`aiWard`) plant a carried
  ward at the first `WARD_SPOTS` entry within `WARD_AI.reach` that has no live ward of their team
  within `WARD_AI.taken`, and in `aiAct` knock down an enemy ward within 220 px when nothing else is
  in reach. The view draws wards with the Graphics (`drawWard`: stake, gem eye, hit pips, and blue's
  sight ring), not a baked sheet, and as diamonds on the minimap.
- Recall (LB7, round 2): `startRecall` sets `Unit.recallMs` to `RECALL.ms` (and `lastRecallAt`);
  `updateUnit` counts it down and `finishRecall` moves the champion to its spawn point (its lane
  walk restarts at `wp` 1). `damage` on a champion, `commandMove`, `commandAttack`, `cast` and
  `useActive` zero `recallMs`; `playerAct` and `championPlan` stand still while it runs, and `free`
  keeps a recalling champion off team plans. The player recalls with T or the top bar's
  `RECALL_BUTTON` (`drawRecallButton`), which fills as the channel runs; a bar and "Recalling" show
  under any recalling champion's health bar. AI champions recall (in `championPlan`) when free of
  enemies within `RECALL.aiLook`, far from home, at most every `RECALL.aiEvery`, and either under
  `RECALL.aiLow` health or carrying `RECALL.rich` gold with a `nextBuy` to spend it on; at home they
  wait at the fountain until 90% health.
- Kill streak bounties (LB8, round 2): `Unit.killStreak` counts champion kills since the last
  death (`kill` raises the killer's, zeroes the victim's). `bountyOf(killStreak)` (`BOUNTY`) is the
  gold a slayer gets on top of `KILL.gold`; notices and `aiLog` say when a streak sets a bounty and
  when one is claimed. `updateGanks` sorts prey by bounty before health and runs every
  `GANK.every / 2` while any living champion carries one. The view puts a gold "BOUNTY" label over
  the champion's bar (`drawBar`).
- AI shopping (LB9, round 2): `aiShop` runs for every AI champion each tick it is dead or `atShop`:
  it buys `nextBuy(u)`, the first item of `AI_BUILDS[AI_BUILD_FOR[role] ?? 'fighter']` not owned
  and not a part of an owned item, when it can pay (the build order is kept, so gold is saved for
  the next item), else a ward when it carries none. Every build starts with the Healing Flask, which
  `aiAct` drinks under 40% health. `aiLog` reports each purchase.
- Buy back (LB10, round 2): `buyBack` lets a dead champion pay `buybackCost` (`BUYBACK.base` plus
  `perLevel` per level) to `revive` at once, then sets `buybackReadyAt` `BUYBACK.cd` ahead. The
  player uses X or the top bar button, which shows the cost or the time until it is allowed again
  while dead. `aiBuyBack` runs for dead AI champions: they buy back with at least 3 s left to wait
  when an enemy champion stands within `BUYBACK.aiThreat` of their Nexus.
- Inhibitors (LB5): warded (no damage, not targeted, a ring and a grey bar) while a tower of their
  team and lane stands (`invulnerable`); a Nexus is warded while all three of its inhibitors stand.
  A fallen inhibitor stays down (drawn as small rubble) and makes `spawnWave` give the other team's
  minions on that lane `power` `SUPER_MINION` (1.6x health and damage, drawn 1.5x with a gold ring).
- The guardian beast (LB1): one `'beast'` unit (`s.beast`), neutral, asleep (dead) until
  `BEAST.firstAt` (90 s) and `BEAST.respawnMs` after each fall. `beastAct` claws the unit that hit
  it last plus anyone within `BEAST.splash` of it, throws a neutral projectile at one out of reach,
  forgets an attacker past `BEAST.leash` and heals while nobody fights it. Its slayer's team gets
  `beastBuff[team]` for 90 s: its minions deal 1.5x and take 0.65x (`attack`, `takenMult`), drawn
  with a violet glow, with a chip per team at the top right (`buffChip`).
- Bushes (LB2): `updateVision` hides enemy champions in a bush (`bushAt`) that no unit of that team
  sees in the same bush or within `BUSH_REVEAL`. `nearest`,
  the player's target, AI ganks and clicks skip hidden units; the view draws no sprite, bar, marker
  or minimap dot for red champions hidden from blue and draws blue champions in a bush at 0.6
  alpha. Attacking or casting sets `revealMs` (1.5 s), which shows the champion.
- AI for allies and red: attack the nearest visible champion, then minion, then vulnerable structure
  in reach, cast abilities (with their upgrades) when they have a use, otherwise walk the lane.
  Before that, `championPlan` (LB3): fall back to the nearest own tower behind (`fallbackPoint`) for
  `RETREAT.ms` when low or outnumbered by two, calling allies near by with it; go for the beast if
  picked as one of its team's two `contesters` (`updateContesters`); walk to a `gankTarget` set by
  `updateGanks` (every 70 s from 100 s, per team: the weakest visible enemy champion, hunted by the
  nearest healthy AI champion more than 550 px away). AI champions take upgrades on level up
  (`aiRate` picks). AI champions with reach kite melee ones (`KITE`), cast an escape when they
  fall back, keep R for champions and the beast, and from 2:00 every `JUNGLE.every` each team sends
  one free champion for a brute's buff on its half or a watchstone it lacks (`updateJungle`).
  Towers shoot a champion with `aggroMs` (it hurt an enemy champion in the last `TOWER.aggroMs`)
  first, then minions, then any champion.
- Watch AI (`?watch`, `shared/watch.ts`): `GameScene.watchMatch` skips the pick screen and calls
  `createGame(random, 1, { watch: true })`, which spawns blue's fifth champion as an AI one
  (`player` false, lane `top`, still `s.player` so the camera and HUD follow it) and sets
  `s.watch`, which stops `updateObjective`. The scene adds `frameMs * watchSteps()` to its step
  accumulator, draws with no fog (`hidden` and `updateFog`), ignores keys and clicks but the end
  screen's Watch another, and hides the objective card and marker. `aiLog` in `sim.ts` reports
  ganks, jungle trips, outnumbered retreats, AI upgrades, kills, the beast, towers, inhibitors and
  watchstones, keyed by team.
- Notices (`s.notices`, `notice` in `sim.ts`): the beast waking or falling, an inhibitor falling,
  ganks, champion kills ("X slew Y"), brute buffs taken by blue and watchstones taken; the newest shows for 4 s in a strip under the top bar.
- Match objectives: one goal at a time for the player's team (`OBJECTIVES`, in turn): topple the red
  tower nearest the blue Nexus (150 s, 200 gold and the siege banner: the player's champion deals
  +25% to towers and the Nexus for 60 s), clear the boar or wolf pack nearest the player on blue's half (`ownHalf`) (90 s, 120 gold), defeat
  the red champion nearest the player (120 s, 150 gold), slay the guardian beast (120 s, 250 gold;
  done only when blue slew it, read from `beastBuff.blue`; skipped while it sleeps). The goal is
  done when its target is dead, however it fell; when its time runs out it is missed. The next one
  starts 4 s later. A card under the top bar shows it (title, time left, the target's damage as a
  bar, the reward), a gold pill and dashed ring mark the target in the world and a star marks it on
  the minimap.
- Upgrade choice on level-up: each new level of the player's champion queues an offer of two
  upgrades (`UPGRADES[champion][level - 2]`); two cards in the bottom bar (between the shop button
  and the minimap) show the first offer, and the ability box an option changes gets a gold diamond.
  Clicking a card or pressing 1 or 2 keeps it. Upgrades scale an ability's radius, damage, range,
  heal, shield or cooldown by a percent, add a stun or a slow, or add bolts (`abilityFor` applies
  them). Gold pips under an ability box count its upgrades. AI champions pick theirs on their own.
- Last hits: after every tick the enemy minion within the player's reach plus 140 px that its next
  hit would kill is `lastHitMark` and gets a gold outline. A last hit by the player grows the streak
  (`streak`, shown in a chip by the gold counter) and pops a coin fx with the gold; from x4 on it
  pays +25% (24 gold). The streak resets when the marked minion dies to anyone else.
- Healing at home: a champion within `FOUNTAIN.radius` of its own Nexus (`atFountain`) heals
  `FOUNTAIN.share` of its max health a second (`updateUnit`). The view draws the ring round both
  Nexuses (`drawFountains`) and green motes over a champion healing there.
- Skill looks (`scenes/skillFx.ts`): every ability has its own animation, keyed by its look
  `${championId}.${key}` (`lookOf` in `sim.ts`). `cast` raises one `'skill'` fx per cast (where it
  lands, where the caster stood, the radius and facing); bolts carry `look` and raise
  `${look}>hit` where they strike; zones carry `look`; buffs from abilities carry `look` and glow
  with an aura (`drawAura`) instead of the plain ring. `LOOKS` holds each cast's draw function and
  how long it lasts, `drawProjectile` each bolt's shape, `drawZone` each zone's churn; anything
  without a look (towers, the beast, jungle buffs) keeps the plain shapes. Scatter comes from
  `hash`, never `Math.random`.
- Range indicators (`drawRanges`): a dashed ring round the player's champion at its attack `range`,
  one round a champion under the cursor, and while an ability's key is held (`aiming`) or its box is
  hovered (`hoverAbility`), its range ring and shape on the ground (an area circle, a bolt's lane
  per bolt, a dash's line and landing), grey while it can't be cast. Holding a key aims; letting go
  casts at the cursor (`release`); Esc drops the aim. `lastWorld` is re-read from the pointer every
  frame, as the camera moves under it.
- Player input: click the ground to walk, click an enemy to attack it, hold Q/W/E/R to aim and let go
  to cast at the cursor,
  D/H use item actives at the cursor, B or the Shop button opens the shop, Esc closes it, 1 and 2
  pick an upgrade. Standing still
  auto-attacks the nearest enemy.
- HUD (bevelled slate panels with gold trim, system font): gold with the streak chip, the Nexus
  health and the clock in the top bar; the objective card under it (hidden while the shop is open)
  and a siege banner chip when it is up; at the bottom the champion's figure, health, XP, items,
  respawn timer and last hits, the four ability boxes with cooldowns, the shop button, the upgrade
  cards (or the upgrades taken) and a minimap.
- Victory and defeat panel with the match's objectives, last hits, best streak and beasts slain,
  and "Play again".

Missing or rough:

- No pathing or collisions: units overlap and walk straight lines.
- No sound, pause, title or save. Nothing is persisted, so there are no save keys.
- Bushes hide champions only, not minions. The camera follows the player's champion.
- AI champions don't use bushes on purpose, and their wards go only to the fixed `WARD_SPOTS`.
- Balance is tuned with AI-only matches (every class within roughly 35% to 65% wins over 80
  matches); the player's own champion is not part of that.
- Only the first round (see the playthrough) is covered by the test; the Warden is the only champion
  the test plays.
- No tower order within a lane; inhibitors don't come back.
- Sprites face eight directions; a unit turning between them snaps.

## Architecture

File map (`src/`):

- `main.ts`: creates the `Phaser.Game` (960x540, `Phaser.Scale.FIT`, smooth scaling) with
  `GameScene` only, calls `setupGame(game)` from `shared/setupGame.ts` and `setupScaling(game)`
  from `shared/scaling.ts`, and in dev builds puts `game` on `window`.
- `scenes/GameScene.ts`: the pick screen, the match view and input. `create` bakes the art
  (`bakeUnits`, `paintMap`), shows the map as 400 px tiles (only the ones in view are drawn) and
  keeps one image per unit (figure, gold outline, additive hit flash), depth-sorted by the feet's y.
  Each frame it runs `tick` in fixed 16 ms steps, draws shadows and team rings (`groundG`), places
  the sprites, draws bars, projectiles, effects and the objective marker (`topG`), then the HUD
  (`hudG` plus text objects kept in a map by key; world texts such as coin labels and level badges
  live in the same map).
- `scenes/skillFx.ts`: every ability's look (see "Skill looks" above): `drawSkill`, `skillMs`,
  `drawProjectile`, `drawZone` and `drawAura`, with small shape helpers. No game rules.
- `scenes/layout.ts`: screen rectangles for the bars, the objective card, the streak chip, the
  ability boxes, the upgrade panel and cards (`upgradeCard`), the shop, the minimap, the pick cards
  and the end panel, plus `VIEW` and `FONT` (a system font stack).
- `art/lowpoly.ts`: the software renderer. 3x4 matrices (`T`, `S`, `Rx`, `Ry`, `Rz`, `chain`,
  `swing`), a `Model` with a transform stack (`at`), primitives (`box` with a taper, `prism`,
  `gem`, `ico`, `slab`) whose faces get outward normals from each primitive's centre, and `render`:
  turn by yaw, cull back faces, Lambert light from the top left (`LIGHT`), painter's sort, fill.
  The camera looks down from the south at `ELEVATION` radians. Also `seeded`, the art's own random
  generator.
- `art/models.ts`: every model as a function of a pose. `figure` builds a humanoid (legs or a robe,
  a tunic in the team's cloth, head, arms on shoulder joints) from a `Kit` per class: the Warden's
  helm, hammer and kite shield, the Blade's hood, cape and daggers, the Archer's cap, quiver and
  bow, the Mage's hat and crystal staff, the Priest's halo, cloak and sunburst staff, the
  Berserker's horned helm, fur mantle and great axe, the Harpooner's knit cap, beard, rope and
  harpoon, the Witch's antlered hood, shawl and branch staff, the Stalker's straw hat, scarf, curved
  sword and throwing star, the Lancer's crested helm, pennant spear and banded shield, the
  Gunslinger's wide hat, bandana, duster and revolver, the Automaton's brass head with glowing eyes,
  boiler and piston fists, the Tinker's goggles, tesla-coil backpack, spark gun and wrench, the
  Wolfkin's wolf head, mane, tail and claws, and the Bruin's bear head, belly and claws. Also
  `wolfModel`, `bruteModel` (ember or moss), `watchstoneModel` (per side or neutral) and
  `ruinModel`. `classPose`
  gives the joint angles for `idle`, the walk `w0`..`w3`, the attack `a0` (wind-up) and `a1`
  (strike) and the cast `c0`. Also the minion (a scaled soldier with sword and round shield), the
  boar, towers, rubble, the Nexus, an inhibitor (`inhibitorModel`), the guardian beast
  (`beastModel`: a horned quadruped with violet crystals, scaled 2.1), pines, rocks and a coin.
  `TEAM_CLOTH` and `TEAM_GLOW` are the team colours.
- `art/bake.ts`: renders the models into sheets at boot (`bakeUnits`, once): one idle frame per
  class for the pick cards and portrait (`pickKey`), the minions, the boar, wolf, brutes,
  watchstones and the beast (8 directions x 8 poses each), a gold silhouette
  of the red minion sheet for the last-hit outline, towers, inhibitors, the Nexus, rubble and the
  coin. The champions' full sheets (both teams' cloth) are baked when a match starts, only for
  the classes in it (`bakeChampions`, kept for later matches). Frames are named `${dir}:${pose}` (`frameName`); dir 0 faces right and each step turns 45
  degrees clockwise on screen (`dirFor` maps a facing angle). Sheets render at `RES` and are
  drawn at 1/RES: 2 on a screen that needs no scaling, up to 3 on a big or dense one (`sharpRes`
  in half steps, held to what the beast's sheet can load). Pick cards and the portrait scale by
  `1.3 / RES` and `1.2 / RES`; each `*_CELL` gives a frame's size and where the feet sit.
- `art/map.ts`: `paintMap` paints the world once on one canvas (`MAP_KEY`), `MAP_RES` canvas pixels
  per world pixel (1, up to about 1.7 on big screens; the tiles are sized back with
  `setDisplaySize`): faceted grass, flagstone
  lanes clipped to the lane band, kerb rocks, paved plazas with a team ring round each Nexus, dirt
  the river (faceted water, banks and glints), clearings for the camps (a glowing ring for the
  brutes, bones for the wolves), watchstone islands, ruins, flowers and mushrooms and up to 620
  pines and rocks, from a fixed seed; then the beast's pit and the bushes (tall faceted grass).
- `game/names.ts`: the random names (`championName`, `firstName`, `shortName`).
- `game/data.ts`: plain data. `WORLD`, `LANES`, `BASE`, `TOWERS`, `RIVER`, `CAMPS`, `CAMP_KINDS`,
  `PUPS`, `SIGHT`, `WATCHSTONES`, `WATCH`, `BUFFS`, `JUNGLE`, `KITE`, the balance constants (`TOWER`,
  `CAMP`, `MINION`, `KILL`, `XP_FOR_LEVEL`, respawn times), `CHAMPIONS` with their `AbilityDef`s,
  `ITEMS`, `ALLY_LANES`, `ENEMY_LANES`, `SIDE_COLOR`, and the loop's data: `OBJECTIVES`,
  `OBJECTIVE_GAP_MS`, `SIEGE`, `UPGRADES` (with `upgradeById`), `STREAK` and `LAST_HIT_LOOK`, plus
  `ACTIVES`, `MAX_ITEMS`, `BEAST`, `BEAST_BUFF`, `BEAST_CONTESTERS`, `INHIBITORS`, `INHIBITOR`,
  `SUPER_MINION`, `BUSHES` (with `bushAt`), `BUSH_REVEAL`, `REVEAL_MS`, `GANK` and `RETREAT`, and
  round 2's `WARD`, `WARD_SPOTS`, `WARD_AI`, `RECALL`, `BUYBACK`, `BOUNTY` (with `bountyOf`),
  `AI_BUILDS` and `AI_BUILD_FOR`.
- `game/state.ts`: the types (`GameState`, `Unit`, `Projectile`, `Fx`, `Objective`,
  `UpgradeOffer`), `createGame`, `spawnWave`, `spawnChampion`, `spawnWard`, `refreshStats` (level
  and items into stats), `pathFor` (red walks lanes backwards), `laneNear` and small helpers. No
  Phaser.
- `game/sim.ts`: the rules: `tick` (vision, watchstones, contesters, ganks, jungle trips, units,
  projectiles, zones), `cast`, `abilityFor`, `viewers`, `stealthed`, buffs (`addBuff`, `buffSum`), `chooseUpgrade`, `buy`, `priceFor`,
  `useActive`, `plantWard`, `startRecall`, `buyBack`, `buybackCost`, `invulnerable`, `hiddenFrom`,
  `commandMove`, `commandAttack`, `damage`, the objectives (`updateObjective`), the last-hit mark
  (`updateLastHitMark`), vision (`updateVision`), the beast (`beastAct`, `updateContesters`), ganks
  (`updateGanks`), and the AI (`championPlan`, `aiShop`, `aiWard`, `aiBuyBack`) and player
  behaviour. No Phaser.

Shared code it imports (outside the game folder): `shared/setupGame.ts` (`setupGame`),
`shared/settings.ts` (`byDifficulty`, `settings`), `shared/scaling.ts` (`setupScaling`,
`sharpRes`, `splitHudCamera`, `viewPoint`) and `shared/watch.ts` (`watching`, `watchSteps`,
`mountWatch`, `aiLog`).

Screens: `setupScaling` draws the canvas at the screen's resolution (`renderScale` canvas pixels
per game pixel) and zooms every camera to match. `splitHudCamera` gives the scene a second, fixed
camera for everything with a scroll factor of 0 (the HUD, its texts, the pick screen and the
portrait), so the main camera keeps Phaser's middle origin for `setBounds` and `centerOn`. Zones
are hit with `viewPoint(pointer)`; world points come from `worldAt` (the main camera's
`getWorldPoint`, not `pointer.worldX`, which the HUD camera on top would give). `viewRect` is the
part of the world in view this frame (from the camera's `midPoint`, clamped to the world) and
drives the camera follow, the map tiles drawn and the minimap's view box.

State model:

- `GameState.phase` is `'pick'` (the scene's own state; `state` is null there), `'playing'`, `'won'`
  or `'lost'`. `winner` says which team won. `time` is game time in ms.
- `units` holds every Nexus, inhibitor, tower, camp, the beast, champion, minion and ward. Dead
  minions and wards are removed each tick; dead champions, camps and the beast respawn at
  `spawnX`/`spawnY`; towers, inhibitors and Nexuses stay dead (drawn as rubble). A ward keeps
  `expiresAt`.
- `Unit.lane` is the lane of a tower, inhibitor, minion or lane champion; `power` a minion's
  super multiplier.
- `projectiles` are bolts in flight (with an optional `stun`). `fx` holds the visuals raised since
  the scene last drained them: rings, lines, arcs, last-hit `coin`s and abilities' `skill` effects.
- `Unit.side` is `'blue'`, `'red'` or `'neutral'` (camps and the beast). Hostile means a different
  side.
- Champions keep `champ` (the `ChampionDef`), `name`, `level`, `xp`, `gold`, `items`, `cds`
  (cooldowns per key), `upgrades` (ids the player kept), `buffs`, `kills`, `deaths`, and for the
  passives `attackCount` (crits), `lullMs` (ambush) and `hasteMs`. Camps keep `campKind` and
  `group`; watchstones `capture`. Every unit has `hidden` (per team, set by `updateVision`).
- `zones` are the lingering circles of `zone` abilities (side, owner, `dps`, slow, time left). `refreshStats` recomputes `maxHp`, `dmg`, `armor` and
  `speed` from the level and items.
- `stunMs` holds a stunned champion or minion in place (no move, no attack).
- Animation timers: `swing` (180 ms after an attack: wind-up frame then strike frame), `castMs`
  (300 ms after an ability: the cast frame), `flash` (120 ms after a hit), `walk` (distance walked,
  picks the walk frame) and `facing` (radians, picks the direction).
- `Unit.path` and `wp` are a lane walk. The last point of each path is the enemy Nexus.
- A player's champion has `player: true`; `moveTo` is a walk to a point, `target` an enemy to
  attack.
- The loop: `objective` (kind, target unit id, title, gold, banner, `startAt`, `endsAt`) or null
  between two, `objectiveIndex`, `nextObjectiveAt`, `objectivesDone`, `lastObjective` (how the last
  one ended), `siegeUntil`; `lastHitMark`, `lastHits`, `streak`, `bestStreak`; `upgradeOffers`
  (queued `{ level, options }`, the first one shown).
- The upgrades' state: `beast`, `beastBuff`, `beastKills`, `contesters`, `nextGank`, `nextJungle`,
  `notices`; per AI champion `retreatUntil`, `gankTarget`, `gankUntil`, `jungleTarget`,
  `jungleUntil`; per champion `revealMs`, `aggroMs`, `activeCds`, and round 2's `killStreak`,
  `wards`, `recallMs`, `lastRecallAt` and `buybackReadyAt`.

How it runs:

- `update` adds the frame's own clock time (`game.loop.rawDelta`, at most 250 ms) to an accumulator
  and runs `tick(s, 16)` for each whole step; the camera and the effects age on the same time.
  Phaser's smoothed `delta` is not used: Phaser clamps it for 120 frames after boot, so how long the
  page took to load would change how fast a match starts and where the camera is. Then it drains
  `fx`, follows the player's champion with the camera, draws the world and HUD, and refreshes the
  zones.
- `tick` spawns waves, updates vision, the beast's contesters and ganks, updates every unit
  (cooldowns, slows, stuns, shields, gold, then the unit's behaviour), resolves projectiles, drops
  dead minions, then settles or starts the objective and recomputes the last-hit mark. A Nexus
  falling ends the match.
- Sprite frames: `castMs` shows `c0`, a swing shows `a0` then `a1`, a unit whose `walk` changed in
  the last 120 ms of game time shows `w0`..`w3` by distance walked, otherwise `idle`. Feet are drawn
  `FOOT[kind]` px below the hitbox centre; hitboxes (`radius`) are unchanged by the art.
- Input: `onPointerDown` checks the zones newest first (shop rows and upgrade cards before the
  bars, which block, and the objective card, which also blocks; the D, H and V buttons sit in the
  bottom bar, the Recall/Buy back button in the top bar). Anything else is a world click: a
  hostile unit under the cursor becomes the player's target, otherwise the point becomes a move.

Randomness and timing: `Math.random` only draws the rosters and names, in `createGame` and the
pick screen's `rollNames` (the test seeds it); no `Date.now` or `performance.now` in the rules. Game time
advances only through `tick`, which the scene drives from frame times. The art uses its own seeded
generator (`seeded` in `lowpoly.ts`); `performance.now` only times the bake for a dev log.

### Hub settings

- `main.ts` calls `setupGame(game)` right after creating the game (frame cap, FPS readout, reduced
  motion and full screen).
- Difficulty scales red's damage: `ENEMY_DAMAGE = byDifficulty(0.8, 1, 1.25)` in `GameScene.ts`,
  applied through `dealt` in `sim.ts`. Normal stays 1, which the playthrough expects.
- `settings.reduceMotion` skips the effect rings, attack lines and skill effects (`collectFx`) and
  holds zones' and auras' motion still but keeps the
  last-hit coins (they hold still instead of rising), turns off the hit flash, the objective
  marker's bob and its ring's spin, and makes the camera follow without easing. The game has no
  camera shake or screen flashes.
- Keep the Lane Brawl row of the difficulty table in the root README and the line in this game's
  README in step with `ENEMY_DAMAGE`.

## Testing hooks

- `window.game` in dev builds. The test reads `game.scene.getScene('Game')`: its `state` (copied
  through JSON) and its `cameras.main.worldView` (not `scrollX/Y`, which differ once `renderScale` zooms the camera),
  to turn world positions into view pixels. `e2e/screens.spec.ts` at the root opens the game on
  five screens.
- Inputs: it clicks the Warden's card at the pick screen (top left of the fifteen), presses B, clicks the Long Sword's card (T, V and X are never pressed),
  clicks the ground and the red tower, presses Q (down and up: abilities cast on the key's release), clicks the camp the second objective marks, clicks
  gold-outlined minions (`lastHitMark`) and clicks the first upgrade card. Clicks go to the canvas
  through the bounding box, never on the objective card (it blocks clicks).
- The test mirrors these, so change them together: the card, shop row, tower, objective card and
  upgrade card coordinates in `playthrough.spec.ts` (`WARDEN_CARD` (120, 133), `SWORD_ROW`,
  `RED_MID_TOWER` (1793, 1007), `OBJECTIVE_CARD`, `UPGRADE_CARD_1`) against `layout.ts` and
  `TOWERS`, `TOWER_REACH` against `TOWER.range`, `CAMP_GOLD` against `CAMP_KINDS`, the Warden's
  stats and Slam radius (`CHAMPIONS`), the Long Sword cost and damage (`ITEMS`), the first two
  `OBJECTIVES` (the tower: 150 s and 200 gold with the banner; then a camp, whose kind's gold plus
  120 the test checks; with the seeded roster it is the boar at (1280, 1900)),
  the Warden's level 2 `UPGRADES` pair (`wide-slam`, `stun-slam`), and the 240 s game-time budget.
- It asserts the first objective and its target, the objective paid and the siege banner after
  the tower falls, the camp objective, at least one last hit and a streak, level 2's offer, and
  Wide Slam kept from the card.
- Round 2 stays out of the first round: the AI buys only a Healing Flask at 0:00 (its wards and
  recalls change nothing the test asserts), `GANK.firstAt` keeps bounty hunts past it, and the
  player never recalls, wards or buys back.
- On the way to the tower the Warden waits out of its reach until a blue minion reaches it (and
  steps back out when none is left there, until the tower is under 200 health), and hits back (with
  Slam) at a red champion that comes within 240 px out of the tower's reach. It Slams the camp too.
- It saves `0-pick`, `1-shop`, `2-tower-down` and `3-upgrade` screenshots. `SWORD_ROW` is a point inside the Long
  Sword's card in the four-column shop (`shopRow(0)`, so the Long Sword stays first in `ITEMS`;
  the card is 74 px tall from y 86, so the click at y 146 lands in its lower half). The round ends near 40 s of game time, before the beast wakes (90 s) and the first gank
  (100 s), so neither touches it; keep `BEAST.firstAt` and `GANK.firstAt` past it, and keep the
  bushes off the middle lane's paving and the path to the camp by the red mid tower. Copy them into
  `docs/screenshots/` as `playthrough-1-pick` to `playthrough-4-upgrade` when the look changes.
  `cover.png` (a copy of `new-cast.png`), `new-cast.png` (the shuffle steered with a fixed
  `Math.random` sequence so blue fields the five new classes), `ten-classes.png`, `fog-of-war.png`,
  `jungle-brute.png`, `watchstone.png`, `watch-ai.png` (a `?watch` match at 8x with the log open), `skill-looks-1.png` to
  `skill-looks-3.png` (every ability's effect, five classes each), `aim-indicators.png`,
  `home-heal-and-dead-shop.png`, `loop-objective.png`, `loop-last-hit.png` and
  `upgrade-*.png` and `round2-*.png` (the ward in the shop and planted by a bush, a recall, a
  bounty, the buy back button and the watch log of the AI shopping) are staged docs shots (a scratch
  Playwright script that places units through
  `window.game` and lets the match run), not test output. The `loop-*` and `upgrade-*` ones predate
  the square map.

## Making common changes

- **Add a champion**: add a `ChampionDef` to `CHAMPIONS` with a blurb (32 characters at most, for
  the card), a `PassiveDef` (a short desc) and four `AbilityDef`s (keys Q, W, E, R; R at level 3),
  its four upgrade pairs to `UPGRADES`, four looks in `skillFx.ts`, bynames in `names.ts`, a `Kit` in `KITS` and its pose in
  `classPose` (`models.ts`) and its id to `ChampId`. `createGame` shuffles the classes other than the
  player's, gives blue the first four and red the next five, so any roster of ten or more works;
  the pick screen lays out `pickCard(i)` in three rows of five, so a sixteenth needs a new layout.
  A machine or beast sets `ownHead` on its `Kit` (the head draws its own skull and face) and
  `skin`, `legs` and `feet` for its hands, legs and feet. Update
  the README's champion and upgrade tables. Then run the balance check (see Gotchas).
- **Add a passive**: add its field to `PassiveDef` and apply it where it acts: `damage` (taken),
  `attack` (hits), `updateUnit` (over time) or `abilityDamage` (spells).
- **Add an ability kind**: add it to `AbilityKind`, handle it in `cast` (`sim.ts`) and, for AI use,
  in `aimFor`, give it an icon in `abilityIcon` (`GameScene.ts`) and its shape in `drawRanges`.
- **Give an ability its look**: add a `LOOKS` row `'<championId>.<key>'` in `skillFx.ts` (and a
  `drawProjectile` case and `HIT_COLOR` for a bolt, a `drawZone` case for a zone, a `drawAura` case
  for a buff). A new champion needs four, or its casts fall back to a plain ring.
- **Add or change an upgrade**: edit the champion's pair in `UPGRADES`; a new kind of effect needs
  a field on `UpgradeDef` and a line in `abilityFor`. The playthrough expects the Warden's level 2
  pair to be `wide-slam` then `stun-slam`.
- **Add an objective kind**: add it to `ObjectiveKind` and `OBJECTIVES`, pick its target in
  `updateObjective` and give the marker a height in `HEAD` if the target is a new kind of unit.
- **Change a model**: edit its builder in `models.ts`; the preview is the game itself. Keep the feet
  at the origin and the figure inside its `*_CELL` in `bake.ts` (raise the cell if a pose clips).
  More poses or directions multiply the boot bake (one to two seconds in headless Chrome now).
- **Tune the map**: edit `LANES`, `TOWERS`, `CAMPS`, `WATCHSTONES`, `BUSHES` and `RIVER` in
  `data.ts`; `map.ts` paints from them. Give only blue's half and build red's with `both`/`mirror`,
  so the map stays fair, and check the playthrough still reaches the red mid tower at (1793, 1007).
- **Tune the fog**: `SIGHT` in `data.ts` (per unit kind) and `FOG_ALPHA` in `GameScene.ts`.
- **Add an item**: add it to `ITEMS` with its stats, and `from` for a recipe. `refreshStats` applies
  the stat fields it knows (`dmg`, `armor`, `hp`, `speed`, `atk`, `cdr`). The shop holds sixteen
  cards (4x4, thirteen used); put a new one into an AI build in `AI_BUILDS` if the AI should buy
  it. A new active needs an
  `ActiveId`, an `ACTIVES` row with a free key, a branch in `useActive` and an icon in the bottom
  bar's active buttons (`activeButton`, 30 px wide; a fourth needs the row widened).
- **Tune round 2**: `WARD` (carry, range, life, hits), `WARD_SPOTS` and `WARD_AI` for the AI's
  warding, `RECALL` (channel time and the AI's reasons to go home), `BUYBACK` (price and cooldown),
  `BOUNTY` (streak, gold) and `AI_BUILDS` / `AI_BUILD_FOR` (what each role buys), all in `data.ts`.
- **Tune the beast or the AI plans**: `BEAST`, `BEAST_BUFF`, `BEAST_CONTESTERS`, `GANK` and
  `RETREAT` in `data.ts`. Move the pit with `BEAST.x`/`y`; `map.ts` paints it there.
- **Add a bush**: add it to `BUSHES` (blue's half; `both` adds the mirror); `map.ts` paints it and
  keeps pines out of it.
- **Add a camp kind**: add it to `CampKind` and `CAMP_KINDS`, a model and sheet (`models.ts`,
  `bake.ts`), its sprite and `headOf` height in `GameScene.ts`, its clearing in `map.ts`, and its
  gold to `CAMP_GOLD` in the test if the camp objective can pick it.

## Gotchas

- Only champions, camps and the beast respawn (`revive` in `updateUnit`); a tower, inhibitor or
  Nexus that falls must stay dead, or the match never ends.
- `damage` ignores warded structures and `nearest` skips them, so minions walk past a warded
  inhibitor to the Nexus and wait there; anything new that hurts structures should go through
  `damage`.
- `hidden` is recomputed at the start of each tick, so a unit placed or moved in between is judged
  on the next tick. Anything that looks for targets (`nearest`, clicks, AI plans) must skip units
  `hiddenFrom` its team, or it would see through the fog.
- The fog is drawn with Graphics rectangles (`paintFog`, one per run of equal shade along a row),
  not a stretched canvas texture: an image of a CanvasTexture updated every frame did not show on
  the map in either renderer.
- Balance: a scratch harness bundles `src/game` with rolldown (`node_modules/.bin/rolldown`) and
  plays AI-only matches in node (the player's champion turned into an AI on a lane), counting
  wins, kills and deaths per class; run one after changing a champion, a passive or an ability.
- `kill` rewards only a champion killer: a tower or camp killed by a minion pays nothing. Minion
  gold for the player goes through the streak branch; AI champions always get the plain 19.
- Anything new that hurts a unit over time (a zone, a splash) should skip `'ward'` units, or a ward
  dies the instant it is touched, since every hit takes one of its three points.
- `aiShop` runs every tick a champion is home or dead, so it must stay cheap: one `nextBuy` scan
  and at most one purchase.
- Red's damage goes through `dealt`, so a new damage source on red must use it or it ignores the
  difficulty. The siege banner's bonus is applied in `damage` for the player's hits only.
- `refreshStats` heals by the increase in max health, so a level up or purchase tops the champion up
  by that amount, not to full; a dead champion (shopping while it waits) stays at 0 until `revive`.
- All HUD text sits above all HUD graphics (depth 12 over 10), so a panel drawn over another
  panel's text does not hide it: hide the covered panel instead (as the objective card does while
  the shop is open).
- `pointer.x/y` and `this.scale` are canvas pixels, `renderScale` times game pixels: read pointers
  through `viewPoint` or `worldAt`, and give anything new on the HUD a scroll factor of 0 so the
  fixed camera draws it.
- A sharper screen bakes bigger sheets and a bigger map, so the boot bake takes longer there (about
  1.8x at 4K); keep `RES` capped rather than raising it further.
- Texts re-render their canvas when their string or colour changes; `t()` only sets what changed,
  which keeps the canvas renderer (used by the test) fast.
