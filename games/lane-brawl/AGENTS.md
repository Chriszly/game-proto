# Lane Brawl: guide for agents

How Lane Brawl is built and where things stand, for agents changing it. README.md covers how to
play, the champions, the upgrades and the difficulty. Keep this file up to date with any change to
the game, per the root AGENTS.md.

## Current state

Lane Brawl is a single-player MOBA on one 2400x1600 map with three lanes, towers, minion waves,
jungle camps, two Nexuses, five champions a side and a shop. The player picks one of five champions
and fights with four AI allies against five AI champions on red. The art is low-poly 3D: every unit
is a small mesh built in code and rendered at boot by a software renderer into sprite frames; there
are no image assets besides the cover and favicon.

Implemented today:

- Pick screen with the five champions (their 3D figures on cards), then one match (`GameScene`).
- Map: lanes from the blue Nexus (bottom left) to the red (top right), two towers per team per lane,
  four jungle camps, minion waves every 25 s (three per lane per team).
- Champions: five, each with Q, W, E, R. Abilities are data: `burst` (around a point or the caster),
  `bolt` (projectiles, optionally piercing), `dash` (move, hit where it lands) and `ally` (heal and
  shield allied champions). R unlocks at level 3; levels run 1 to 5.
- Gold (passive plus last hits and kills), XP shared by nearby champions, respawns that scale with
  level, and eight shop items bought once each near the Nexus, in two columns. Items add flat
  damage, armor, health and speed, plus percent attack speed (`atk`) and cooldown reduction (`cdr`).
- AI for allies and red: attack the nearest champion, then minion, then structure in reach, retreat
  at low health, cast abilities when they have a use, otherwise walk the lane. Towers shoot
  champions first, then minions.
- Match objectives: one goal at a time for the player's team (`OBJECTIVES`, in turn): topple the
  red tower nearest the blue Nexus (150 s, 200 gold and the siege banner: the player's champion
  deals +25% to towers and the Nexus for 60 s), clear the camp nearest the player (90 s, 120 gold),
  defeat the red champion nearest the player (120 s, 150 gold). The goal is done when its target is
  dead, however it fell; when its time runs out it is missed. The next one starts 4 s later. A
  card under the top bar shows it (title, time left, the target's damage as a bar, the reward), a
  gold pill and dashed ring mark the target in the world and a star marks it on the minimap.
- Upgrade choice on level-up: each new level of the player's champion queues an offer of two
  upgrades (`UPGRADES[champion][level - 2]`); two cards in the bottom bar (between the shop button
  and the minimap) show the first offer, and the ability box an option changes gets a gold diamond.
  Clicking a card or pressing 1 or 2 keeps it. Upgrades scale an ability's radius, damage, range,
  heal, shield or cooldown by a percent, add a stun or a slow, or add bolts (`abilityFor` applies
  them). Gold pips under an ability box count its upgrades. AI champions take no upgrades.
- Last hits: after every tick the enemy minion within the player's reach plus 140 px that its next
  hit would kill is `lastHitMark` and gets a gold outline. A last hit by the player grows the streak
  (`streak`, shown in a chip by the gold counter) and pops a coin fx with the gold; from x4 on it
  pays +25% (24 gold). The streak resets when the marked minion dies to anyone else.
- Player input: click the ground to walk, click an enemy to attack it, Q/W/E/R cast at the cursor,
  B or the Shop button opens the shop, Esc closes it, 1 and 2 pick an upgrade. Standing still
  auto-attacks the nearest enemy.
- HUD (bevelled slate panels with gold trim, system font): gold with the streak chip, the Nexus
  health and the clock in the top bar; the objective card under it (hidden while the shop is open)
  and a siege banner chip when it is up; at the bottom the champion's figure, health, XP, items,
  respawn timer and last hits, the four ability boxes with cooldowns, the shop button, the upgrade
  cards (or the upgrades taken) and a minimap.
- Victory and defeat panel with the match's objectives, last hits and best streak, and "Play
  again".

Missing or rough:

- No pathing or collisions: units overlap and walk straight lines.
- No sound, pause, title or save. Nothing is persisted, so there are no save keys.
- No vision or fog; the camera follows the player's champion.
- Only the first round (see the playthrough) is covered by the test; the Warden is the only champion
  the test plays.
- Tower and Nexus rules are simple: no tower order per lane and no inhibitors.
- Sprites face eight directions; a unit turning between them snaps.

## Architecture

File map (`src/`):

- `main.ts`: creates the `Phaser.Game` (960x540, `Phaser.Scale.FIT`, smooth scaling) with
  `GameScene` only, calls `setupGame(game)` from `shared/setupGame.ts`, and in dev builds puts
  `game` on `window`.
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
  helm, hammer and kite shield, the Blade's hood, cape and daggers, the Archer's cap, quiver and bow,
  the Mage's hat and crystal staff, the Priest's halo, cloak and sunburst staff. `classPose` gives
  the joint angles for `idle`, the walk `w0`..`w3`, the attack `a0` (wind-up) and `a1` (strike) and
  the cast `c0`. Also the minion (a scaled soldier with sword and round shield), the boar, towers,
  rubble, the Nexus, pines, rocks and a coin. `TEAM_CLOTH` and `TEAM_GLOW` are the team colours.
- `art/bake.ts`: renders the models into sheets at boot (`bakeUnits`, once): each champion in both
  teams' cloth, the minions, the boar (8 directions x 8 poses each), a gold silhouette of the red
  minion sheet for the last-hit outline, towers, the Nexus, rubble and the coin. Frames are named
  `${dir}:${pose}` (`frameName`); dir 0 faces right and each step turns 45 degrees clockwise on
  screen (`dirFor` maps a facing angle). Sheets render at `RES` (2) and are drawn at 1/RES; each
  `*_CELL` gives a frame's size and where the feet sit.
- `art/map.ts`: `paintMap` paints the world once on one canvas (`MAP_KEY`): faceted grass, flagstone
  lanes clipped to the lane band, kerb rocks, paved plazas with a team ring round each Nexus, dirt
  clearings for the camps and about 260 pines and rocks, from a fixed seed.
- `game/data.ts`: plain data. `LANES`, `BASE`, `TOWERS`, `CAMPS`, the balance constants (`TOWER`,
  `CAMP`, `MINION`, `KILL`, `XP_FOR_LEVEL`, respawn times), `CHAMPIONS` with their `AbilityDef`s,
  `ITEMS`, `ALLY_LANES`, `ENEMY_LANES`, `SIDE_COLOR`, and the loop's data: `OBJECTIVES`,
  `OBJECTIVE_GAP_MS`, `SIEGE`, `UPGRADES` (with `upgradeById`), `STREAK` and `LAST_HIT_LOOK`.
- `game/state.ts`: the types (`GameState`, `Unit`, `Projectile`, `Fx`, `Objective`,
  `UpgradeOffer`), `createGame`, `spawnWave`, `spawnChampion`, `refreshStats` (level and items into
  stats), `pathFor` (red walks lanes backwards) and small helpers. No Phaser.
- `game/sim.ts`: the rules: `tick`, `cast`, `abilityFor`, `chooseUpgrade`, `buy`, `commandMove`,
  `commandAttack`, `damage`, the objectives (`updateObjective`), the last-hit mark
  (`updateLastHitMark`), and the AI and player behaviour. No Phaser.

Shared code it imports (outside the game folder): `shared/setupGame.ts` (`setupGame`) and
`shared/settings.ts` (`byDifficulty`, `settings`).

State model:

- `GameState.phase` is `'pick'` (the scene's own state; `state` is null there), `'playing'`, `'won'`
  or `'lost'`. `winner` says which team won. `time` is game time in ms.
- `units` holds every Nexus, tower, camp, champion and minion. Dead minions are removed each tick;
  dead champions and camps respawn at `spawnX`/`spawnY`, towers and Nexuses stay dead (a dead tower
  is drawn as rubble).
- `projectiles` are bolts in flight (with an optional `stun`). `fx` holds the visuals raised since
  the scene last drained them: rings, lines, arcs and last-hit `coin`s.
- `Unit.side` is `'blue'`, `'red'` or `'neutral'` (camps). Hostile means a different side.
- Champions keep `champ` (the `ChampionDef`), `level`, `xp`, `gold`, `items`, `cds` (cooldowns per
  key) and `upgrades` (ids the player kept). `refreshStats` recomputes `maxHp`, `dmg`, `armor` and
  `speed` from the level and items.
- `stunMs` holds a stunned champion or minion in place (no move, no attack).
- Animation timers: `swing` (180 ms after an attack: wind-up frame then strike frame), `castMs`
  (300 ms after an ability: the cast frame), `flash` (120 ms after a hit), `walk` (distance walked,
  picks the walk frame) and `facing` (radians, picks the direction).
- `Unit.path` and `wp` are a lane walk. The last point of each path is the enemy Nexus.
- A player's champion has `player: true`; `moveTo` is a walk to a point, `target` an enemy to attack.
- The loop: `objective` (kind, target unit id, title, gold, banner, `startAt`, `endsAt`) or null
  between two, `objectiveIndex`, `nextObjectiveAt`, `objectivesDone`, `lastObjective` (how the last
  one ended), `siegeUntil`; `lastHitMark`, `lastHits`, `streak`, `bestStreak`; `upgradeOffers`
  (queued `{ level, options }`, the first one shown).

How it runs:

- `update` adds the frame's own clock time (`game.loop.rawDelta`, at most 250 ms) to an accumulator
  and runs `tick(s, 16)` for each whole step; the camera and the effects age on the same time.
  Phaser's smoothed `delta` is not used: Phaser clamps it for 120 frames after boot, so how long the
  page took to load would change how fast a match starts and where the camera is. Then it drains
  `fx`, follows the player's champion with the camera, draws the world and HUD, and refreshes the
  zones.
- `tick` spawns waves, updates every unit (cooldowns, slows, stuns, shields, gold, then the unit's
  behaviour), resolves projectiles, drops dead minions, then settles or starts the objective and
  recomputes the last-hit mark. A Nexus falling ends the match.
- Sprite frames: `castMs` shows `c0`, a swing shows `a0` then `a1`, a unit whose `walk` changed in
  the last 120 ms of game time shows `w0`..`w3` by distance walked, otherwise `idle`. Feet are drawn
  `FOOT[kind]` px below the hitbox centre; hitboxes (`radius`) are unchanged by the art.
- Input: `onPointerDown` checks the zones newest first (shop rows and upgrade cards before the
  bars, which block, and the objective card, which also blocks). Anything else is a world click: a
  hostile unit under the cursor becomes the player's target, otherwise the point becomes a move.

Randomness and timing: no `Math.random`, `Date.now` or `performance.now` in the rules. Game time
advances only through `tick`, which the scene drives from frame times. The art uses its own seeded
generator (`seeded` in `lowpoly.ts`); `performance.now` only times the bake for a dev log.

### Hub settings

- `main.ts` calls `setupGame(game)` right after creating the game (frame cap, FPS readout, reduced
  motion).
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
  through JSON) and its `cameras.main` scroll, to turn world positions into view pixels.
- Inputs: it clicks the Warden's card at the pick screen, presses B, clicks the Long Sword's row,
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
  Sword's place in the two-column shop (`shopRow(0)`'s centre). Copy them into `docs/screenshots/`
  as `playthrough-1-pick` to `playthrough-4-upgrade` when the look changes. `cover.png`,
  `fight-art.png`, `loop-objective.png` and `loop-last-hit.png` are staged docs shots (a scratch
  Playwright script that ticks the sim and places units through `window.game`), not test output.

## Making common changes

- **Add a champion**: add a `ChampionDef` to `CHAMPIONS` with four `AbilityDef`s (keys Q, W, E, R;
  R at level 3), its four upgrade pairs to `UPGRADES`, a `Kit` in `KITS` (`models.ts`), and its id to
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
- **Add an item**: add it to `ITEMS` with its stats. `refreshStats` applies the stat fields it knows
  (`dmg`, `armor`, `hp`, `speed`, `atk`, `cdr`). The shop lays items out in two columns, so the panel
  height in `layout.ts` (`SHOP_PANEL`) must still fit the rows.

## Gotchas

- Only champions and camps respawn (`revive` in `updateUnit`); a tower or Nexus that falls must stay
  dead, or the match never ends.
- `kill` rewards only a champion killer: a tower or camp killed by a minion pays nothing. Minion
  gold for the player goes through the streak branch; AI champions always get the plain 19.
- Red's damage goes through `dealt`, so a new damage source on red must use it or it ignores the
  difficulty. The siege banner's bonus is applied in `damage` for the player's hits only.
- `refreshStats` heals by the increase in max health, so a level up or purchase tops the champion up
  by that amount, not to full.
- All HUD text sits above all HUD graphics (depth 12 over 10), so a panel drawn over another
  panel's text does not hide it: hide the covered panel instead (as the objective card does while
  the shop is open).
- Texts re-render their canvas when their string or colour changes; `t()` only sets what changed,
  which keeps the canvas renderer (used by the test) fast.
