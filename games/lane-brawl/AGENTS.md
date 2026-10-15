# Lane Brawl: guide for agents

How Lane Brawl is built and where things stand, for agents changing it. README.md covers how to
play, the champions, the upgrades and the difficulty. Keep this file up to date with any change to
the game, per the root AGENTS.md.

## Current state

Lane Brawl is a single-player MOBA on one 2400x1600 map with three lanes, towers, inhibitors, minion
waves, jungle camps, a guardian beast, tall grass, two Nexuses, five champions a side and a shop.
The player picks one of five champions and fights with four AI allies against five AI champions on
red. The art is low-poly 3D: every unit is a small mesh built in code and rendered at boot by a
software renderer into sprite frames; there are no image assets besides the cover and favicon.

Implemented today:

- Pick screen with the five champions (their 3D figures on cards), then one match (`GameScene`).
- Map: lanes from the blue Nexus (bottom left) to the red (top right), two towers per team per lane,
  an inhibitor per team per lane near its Nexus (`INHIBITORS`), four jungle camps, the beast's pit
  (`BEAST`), eight bushes (`BUSHES`), minion waves every 25 s (three per lane per team).
- Champions: five, each with Q, W, E, R. Abilities are data: `burst` (around a point or the caster),
  `bolt` (projectiles, optionally piercing), `dash` (move, hit where it lands) and `ally` (heal and
  shield allied champions). R unlocks at level 3; levels run 1 to 5.
- Gold (passive plus last hits and kills), XP shared by nearby champions, respawns that scale with
  level.
- Items (LB4): twelve in `ITEMS`, bought near the Nexus, each owned once, at most `MAX_ITEMS` (6) in
  the bag. Seven are parts (the Healing Flask among them); five build `from` parts: buying one uses
  up the parts owned and takes their cost off its price (`priceFor`, `buy`). Items add flat damage,
  armor, health and speed, plus percent attack speed (`atk`) and cooldown reduction (`cdr`). Two add
  an `active` (`ACTIVES`): Phase Boots dash 220 px on D, the Healing Flask heals 220 on H (F is the
  hub's full screen key), through `useActive`, with cooldowns in `Unit.activeCds`. The shop is a 4x3
  grid of cards; the bag shows as six slots in the portrait card and the actives as two buttons
  under the shop button.
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
- Bushes (LB2): `updateVision` fills `s.hidden[team]` each tick with the enemy champions in a bush
  (`bushAt`) that no unit of that team sees (in the same bush or within `BUSH_REVEAL`). `nearest`,
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
  (`aiRate` picks). Towers shoot champions first, then minions.
- Notices (`s.notices`, `notice` in `sim.ts`): the beast waking or falling, an inhibitor falling and
  ganks; the newest shows for 4 s in a strip under the top bar.
- Match objectives: one goal at a time for the player's team (`OBJECTIVES`, in turn): topple the red
  tower nearest the blue Nexus (150 s, 200 gold and the siege banner: the player's champion deals
  +25% to towers and the Nexus for 60 s), clear the camp nearest the player (90 s, 120 gold), defeat
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
- Player input: click the ground to walk, click an enemy to attack it, Q/W/E/R cast at the cursor,
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
- No fog of war beyond the bushes; the camera follows the player's champion. Bushes hide champions
  only, not minions.
- AI champions don't shop (their gold piles up) and don't use bushes on purpose.
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
  bow, the Mage's hat and crystal staff, the Priest's halo, cloak and sunburst staff. `classPose`
  gives the joint angles for `idle`, the walk `w0`..`w3`, the attack `a0` (wind-up) and `a1`
  (strike) and the cast `c0`. Also the minion (a scaled soldier with sword and round shield), the
  boar, towers, rubble, the Nexus, an inhibitor (`inhibitorModel`), the guardian beast
  (`beastModel`: a horned quadruped with violet crystals, scaled 2.1), pines, rocks and a coin.
  `TEAM_CLOTH` and `TEAM_GLOW` are the team colours.
- `art/bake.ts`: renders the models into sheets at boot (`bakeUnits`, once): each champion in both
  teams' cloth, the minions, the boar and the beast (8 directions x 8 poses each), a gold silhouette
  of the red minion sheet for the last-hit outline, towers, inhibitors, the Nexus, rubble and the
  coin. Frames are named `${dir}:${pose}` (`frameName`); dir 0 faces right and each step turns 45
  degrees clockwise on screen (`dirFor` maps a facing angle). Sheets render at `RES` and are
  drawn at 1/RES: 2 on a screen that needs no scaling, up to 3 on a big or dense one (`sharpRes`
  in half steps, held to what the beast's sheet can load). Pick cards and the portrait scale by
  `1.7 / RES` and `1.2 / RES`; each `*_CELL` gives a frame's size and where the feet sit.
- `art/map.ts`: `paintMap` paints the world once on one canvas (`MAP_KEY`), `MAP_RES` canvas pixels
  per world pixel (1, up to about 1.7 on big screens; the tiles are sized back with
  `setDisplaySize`): faceted grass, flagstone
  lanes clipped to the lane band, kerb rocks, paved plazas with a team ring round each Nexus, dirt
  clearings for the camps and about 260 pines and rocks, from a fixed seed; then the beast's pit and
  the bushes (tall faceted grass) from a second seed, so adding them left the rest of the map as it
  was.
- `game/data.ts`: plain data. `LANES`, `BASE`, `TOWERS`, `CAMPS`, the balance constants (`TOWER`,
  `CAMP`, `MINION`, `KILL`, `XP_FOR_LEVEL`, respawn times), `CHAMPIONS` with their `AbilityDef`s,
  `ITEMS`, `ALLY_LANES`, `ENEMY_LANES`, `SIDE_COLOR`, and the loop's data: `OBJECTIVES`,
  `OBJECTIVE_GAP_MS`, `SIEGE`, `UPGRADES` (with `upgradeById`), `STREAK` and `LAST_HIT_LOOK`, plus
  `ACTIVES`, `MAX_ITEMS`, `BEAST`, `BEAST_BUFF`, `BEAST_CONTESTERS`, `INHIBITORS`, `INHIBITOR`,
  `SUPER_MINION`, `BUSHES` (with `bushAt`), `BUSH_REVEAL`, `REVEAL_MS`, `GANK` and `RETREAT`.
- `game/state.ts`: the types (`GameState`, `Unit`, `Projectile`, `Fx`, `Objective`,
  `UpgradeOffer`), `createGame`, `spawnWave`, `spawnChampion`, `refreshStats` (level and items into
  stats), `pathFor` (red walks lanes backwards), `laneNear` and small helpers. No Phaser.
- `game/sim.ts`: the rules: `tick`, `cast`, `abilityFor`, `chooseUpgrade`, `buy`, `priceFor`,
  `useActive`, `invulnerable`, `hiddenFrom`, `commandMove`,
  `commandAttack`, `damage`, the objectives (`updateObjective`), the last-hit mark
  (`updateLastHitMark`), vision (`updateVision`), the beast (`beastAct`, `updateContesters`), ganks
  (`updateGanks`), and the AI (`championPlan`) and player behaviour. No Phaser.

Shared code it imports (outside the game folder): `shared/setupGame.ts` (`setupGame`),
`shared/settings.ts` (`byDifficulty`, `settings`) and `shared/scaling.ts` (`setupScaling`,
`sharpRes`, `splitHudCamera`, `viewPoint`).

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
- `units` holds every Nexus, inhibitor, tower, camp, the beast, champion and minion. Dead minions
  are removed each tick; dead champions, camps and the beast respawn at `spawnX`/`spawnY`; towers,
  inhibitors and Nexuses stay dead (drawn as rubble).
- `Unit.lane` is the lane of a tower, inhibitor, minion or lane champion; `power` a minion's
  super multiplier.
- `projectiles` are bolts in flight (with an optional `stun`). `fx` holds the visuals raised since
  the scene last drained them: rings, lines, arcs and last-hit `coin`s.
- `Unit.side` is `'blue'`, `'red'` or `'neutral'` (camps and the beast). Hostile means a different
  side.
- Champions keep `champ` (the `ChampionDef`), `level`, `xp`, `gold`, `items`, `cds` (cooldowns per
  key) and `upgrades` (ids the player kept). `refreshStats` recomputes `maxHp`, `dmg`, `armor` and
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
- The upgrades' state: `beast`, `beastBuff`, `beastKills`, `contesters`, `hidden`, `nextGank`,
  `notices`; per AI champion `retreatUntil`, `gankTarget`, `gankUntil`; per champion `revealMs`,
  `activeCds`.

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
  bars, which block, and the objective card, which also blocks; the D and H buttons sit in the
  bottom bar). Anything else is a world click: a
  hostile unit under the cursor becomes the player's target, otherwise the point becomes a move.

Randomness and timing: no `Math.random`, `Date.now` or `performance.now` in the rules. Game time
advances only through `tick`, which the scene drives from frame times. The art uses its own seeded
generator (`seeded` in `lowpoly.ts`); `performance.now` only times the bake for a dev log.

### Hub settings

- `main.ts` calls `setupGame(game)` right after creating the game (frame cap, FPS readout, reduced
  motion and full screen).
- Difficulty scales red's damage: `ENEMY_DAMAGE = byDifficulty(0.8, 1, 1.25)` in `GameScene.ts`,
  applied through `dealt` in `sim.ts`. Normal stays 1, which the playthrough expects.
- `settings.reduceMotion` skips the effect rings and attack lines (`collectFx`) but keeps the
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
- Inputs: it clicks the Warden's card at the pick screen, presses B, clicks the Long Sword's card,
  clicks the ground and the red tower, presses Q, clicks the camp the second objective marks, clicks
  gold-outlined minions (`lastHitMark`) and clicks the first upgrade card. Clicks go to the canvas
  through the bounding box, never on the objective card (it blocks clicks).
- The test mirrors these, so change them together: the card, shop row, tower, objective card and
  upgrade card coordinates in `playthrough.spec.ts` (`WARDEN_CARD`, `SWORD_ROW`, `RED_MID_TOWER`,
  `OBJECTIVE_CARD`, `UPGRADE_CARD_1`) against `layout.ts` and `TOWERS`, the Warden's stats and Slam
  radius (`CHAMPIONS`), the Long Sword cost and damage (`ITEMS`), the first two `OBJECTIVES` (the
  tower: 150 s and 200 gold with the banner; then a camp, whose 80 gold plus 120 the test checks),
  the Warden's level 2 `UPGRADES` pair (`wide-slam`, `stun-slam`), and the 240 s game-time budget.
- It asserts the first objective and its target, the objective paid and the siege banner after
  the tower falls, the camp objective, at least one last hit and a streak, level 2's offer, and
  Wide Slam kept from the card.
- It saves `0-pick`, `1-shop`, `2-tower-down` and `3-upgrade` screenshots. `SWORD_ROW` is the Long
  Sword's card in the four-column shop (`shopRow(0)`'s centre, so the Long Sword stays first in
  `ITEMS`). The round ends near 40 s of game time, before the beast wakes (90 s) and the first gank
  (100 s), so neither touches it; keep `BEAST.firstAt` and `GANK.firstAt` past it, and keep the
  bushes off the middle lane's paving and the path to the camp by the red mid tower. Copy them into
  `docs/screenshots/` as `playthrough-1-pick` to `playthrough-4-upgrade` when the look changes.
  `cover.png`, `fight-art.png`, `loop-objective.png`, `loop-last-hit.png` and `upgrade-*.png` are
  staged docs shots (a scratch Playwright script that ticks the sim and places units through
  `window.game`), not test output.

## Making common changes

- **Add a champion**: add a `ChampionDef` to `CHAMPIONS` with four `AbilityDef`s (keys Q, W, E, R; R
  at level 3), its four upgrade pairs to `UPGRADES`, a `Kit` in `KITS` (`models.ts`), and its id to
  `CHAMPION_IDS` (`bake.ts`). Keep the roster at five: `spawnChampion` gives red all five and blue
  the four others. Update the README's champion and upgrade tables and the pick cards (they read
  `CHAMPIONS` directly).
- **Add an ability kind**: add it to `AbilityKind`, handle it in `cast` (`sim.ts`) and, for AI use,
  in `aimFor`, and give it an icon in `abilityIcon` (`GameScene.ts`).
- **Add or change an upgrade**: edit the champion's pair in `UPGRADES`; a new kind of effect needs
  a field on `UpgradeDef` and a line in `abilityFor`. The playthrough expects the Warden's level 2
  pair to be `wide-slam` then `stun-slam`.
- **Add an objective kind**: add it to `ObjectiveKind` and `OBJECTIVES`, pick its target in
  `updateObjective` and give the marker a height in `HEAD` if the target is a new kind of unit.
- **Change a model**: edit its builder in `models.ts`; the preview is the game itself. Keep the feet
  at the origin and the figure inside its `*_CELL` in `bake.ts` (raise the cell if a pose clips).
  More poses or directions multiply the boot bake (one to two seconds in headless Chrome now).
- **Tune the map**: edit `LANES`, `TOWERS` and `CAMPS` in `data.ts`; `map.ts` paints from them. Keep
  blue towers mirrored by red's under the 180-degree rotation of the map, and check the playthrough
  still reaches the red mid tower at (1576, 584).
- **Add an item**: add it to `ITEMS` with its stats, and `from` for a recipe. `refreshStats` applies
  the stat fields it knows (`dmg`, `armor`, `hp`, `speed`, `atk`, `cdr`). The shop holds twelve
  cards (4x3); a thirteenth needs a taller `SHOP_PANEL` or a fifth column. A new active needs an
  `ActiveId`, an `ACTIVES` row with a free key, a branch in `useActive` and an icon in the bottom
  bar's active buttons.
- **Tune the beast or the AI plans**: `BEAST`, `BEAST_BUFF`, `BEAST_CONTESTERS`, `GANK` and
  `RETREAT` in `data.ts`. Move the pit with `BEAST.x`/`y`; `map.ts` paints it there.
- **Add a bush**: add it to `BUSHES` (and its mirror); `map.ts` paints it and keeps pines out of it.

## Gotchas

- Only champions, camps and the beast respawn (`revive` in `updateUnit`); a tower, inhibitor or
  Nexus that falls must stay dead, or the match never ends.
- `damage` ignores warded structures and `nearest` skips them, so minions walk past a warded
  inhibitor to the Nexus and wait there; anything new that hurts structures should go through
  `damage`.
- `hidden` is recomputed at the start of each tick, so a unit placed or moved in between is judged
  on the next tick.
- `kill` rewards only a champion killer: a tower or camp killed by a minion pays nothing. Minion
  gold for the player goes through the streak branch; AI champions always get the plain 19.
- Red's damage goes through `dealt`, so a new damage source on red must use it or it ignores the
  difficulty. The siege banner's bonus is applied in `damage` for the player's hits only.
- `refreshStats` heals by the increase in max health, so a level up or purchase tops the champion up
  by that amount, not to full.
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
