# Lane Brawl: guide for agents

How Lane Brawl is built and where things stand, for agents changing it. README.md covers how to
play, the champions and the difficulty. Keep this file up to date with any change to the game, per
the root AGENTS.md.

## Current state

Lane Brawl is a single-player MOBA on one 2400x1600 map with three lanes, towers, minion waves,
jungle camps, two Nexuses, five champions a side and a shop. The player picks one of five champions
and fights with four AI allies against five AI champions on red. Everything is flat vector drawn
with Phaser's Graphics; there are no image assets besides the cover and favicon.

Implemented today:

- Pick screen with the five champions, then one match (`GameScene`).
- Map: lanes from the blue Nexus (bottom left) to the red (top right), two towers per team per lane,
  four jungle camps, minion waves every 25 s (three per lane per team).
- Champions: five, each with Q, W, E, R. Abilities are data: `burst` (around a point or the caster),
  `bolt` (projectiles, optionally piercing), `dash` (move, hit where it lands) and `ally` (heal and
  shield allied champions). R unlocks at level 3; levels run 1 to 5.
- Gold (passive plus last hits and kills), XP shared by nearby champions, respawns that scale with
  level, and three shop items bought once each near the Nexus.
- AI for allies and red: attack the nearest champion, then minion, then structure in reach, retreat
  at low health, cast abilities when they have a use, otherwise walk the lane. Towers shoot
  champions first, then minions.
- Player input: click the ground to walk, click an enemy to attack it, Q/W/E/R cast at the cursor,
  B or the Shop button opens the shop, Esc closes it. Standing still auto-attacks the nearest enemy.
- HUD: gold, clock and Nexus health in the top bar; the champion, its health, XP, items and
  respawn timer, the four ability boxes with cooldowns, the shop button and a minimap at the bottom.
- Victory and defeat panel with "Play again".

Missing or rough:

- No pathing or collisions: units overlap and walk straight lines.
- No sound, pause, title or save. Nothing is persisted.
- No vision or fog; the camera follows the player's champion.
- Only the first round (see the playthrough) is covered by the test; the Warden is the only champion
  the test plays.
- Tower and Nexus rules are simple: no tower order per lane and no inhibitors.

## Architecture

File map (`src/`):

- `main.ts`: creates the `Phaser.Game` (960x540, `Phaser.Scale.FIT`) with `GameScene` only, calls
  `setupGame(game)` from `shared/setupGame.ts`, and in dev builds puts `game` on `window`.
- `scenes/GameScene.ts`: the pick screen, the match view and input. It runs `tick` in fixed 16 ms
  steps, draws the map once, redraws units, projectiles and effects every frame, and builds the HUD
  with text objects it keeps in a map.
- `scenes/layout.ts`: screen rectangles for the bars, the ability boxes, the shop, the minimap, the
  pick cards and the end panel, plus `VIEW` and `FONT`.
- `game/data.ts`: plain data. `LANES`, `BASE`, `TOWERS`, `CAMPS`, the balance constants (`TOWER`,
  `CAMP`, `MINION`, `KILL`, `XP_FOR_LEVEL`, respawn times), `CHAMPIONS` with their `AbilityDef`s,
  `ITEMS`, `ALLY_LANES`, `ENEMY_LANES` and `SIDE_COLOR`.
- `game/state.ts`: the types (`GameState`, `Unit`, `Projectile`, `Fx`), `createGame`, `spawnWave`,
  `spawnChampion`, `refreshStats` (level and items into stats), `pathFor` (red walks lanes
  backwards) and small helpers. No Phaser.
- `game/sim.ts`: the rules: `tick`, `cast`, `buy`, `commandMove`, `commandAttack`, `damage`, and the
  AI and player behaviour. No Phaser.

Shared code it imports (outside the game folder): `shared/setupGame.ts` (`setupGame`) and
`shared/settings.ts` (`byDifficulty`, `settings`).

State model:

- `GameState.phase` is `'pick'` (the scene's own state; `state` is null there), `'playing'`, `'won'`
  or `'lost'`. `winner` says which team won. `time` is game time in ms.
- `units` holds every Nexus, tower, camp, champion and minion. Dead minions are removed each tick;
  dead champions and camps respawn at `spawnX`/`spawnY`, towers and Nexuses stay dead.
- `projectiles` are bolts in flight. `fx` holds the visuals raised since the scene last drained them.
- `Unit.side` is `'blue'`, `'red'` or `'neutral'` (camps). Hostile means a different side.
- Champions keep `champ` (the `ChampionDef`), `level`, `xp`, `gold`, `items` and `cds` (cooldowns
  per key). `refreshStats` recomputes `maxHp`, `dmg`, `armor` and `speed` from the level and items.
- `Unit.path` and `wp` are a lane walk. The last point of each path is the enemy Nexus.
- A player's champion has `player: true`; `moveTo` is a walk to a point, `target` an enemy to attack.

How it runs:

- `update` adds the frame's delta to an accumulator and runs `tick(s, 16)` for each whole step
  (at most 250 ms of catch-up per frame). Then it drains `fx`, follows the player's champion with
  the camera, draws the world and HUD, and refreshes the zones.
- `tick` spawns waves, updates every unit (cooldowns, slows, shields, gold, then the unit's
  behaviour), resolves projectiles and drops dead minions. A Nexus falling ends the match.
- Input: `onPointerDown` checks the zones first (bars block, pick cards, ability boxes, the shop
  button, shop rows). Anything else is a world click: a hostile unit under the cursor becomes the
  player's target, otherwise the point becomes a move.

Randomness and timing: no `Math.random`, `Date.now` or `performance.now` in the rules. Game time
advances only through `tick`, which the scene drives from frame deltas.

### Hub settings

- `main.ts` calls `setupGame(game)` right after creating the game (frame cap, FPS readout, reduced
  motion).
- Difficulty scales red's damage: `ENEMY_DAMAGE = byDifficulty(0.8, 1, 1.25)` in `GameScene.ts`,
  applied through `dealt` in `sim.ts`. Normal stays 1, which the playthrough expects.
- `settings.reduceMotion` skips the effect rings and attack lines (`collectFx`) and makes the camera
  follow without easing. The game has no camera shake or flashes.
- Keep the Lane Brawl row of the difficulty table in the root README and the line in this game's
  README in step with `ENEMY_DAMAGE`.

## Testing hooks

- `window.game` in dev builds. The test reads `game.scene.getScene('Game')`: its `state` (copied
  through JSON) and its `cameras.main` scroll, to turn world positions into view pixels.
- Inputs: it clicks the Warden's card at the pick screen, presses B, clicks the Long Sword's row,
  clicks the ground and the red tower, and presses Q. Clicks go to the canvas through the bounding
  box.
- The test mirrors these, so change them together: the card, shop row and tower coordinates in
  `playthrough.spec.ts` (`WARDEN_CARD`, `SWORD_ROW`, `RED_MID_TOWER`) against `layout.ts` and
  `TOWERS`, the Warden's stats and Slam radius (`CHAMPIONS`), the Long Sword cost and damage
  (`ITEMS`), and the 240 s game-time budget.
- It saves `0-pick`, `1-shop` and `2-tower-down` screenshots. Copy them into `docs/screenshots/` when
  the look changes. `cover.png` is `playthrough-3-tower-down`.

## Making common changes

- **Add a champion**: add a `ChampionDef` to `CHAMPIONS` with four `AbilityDef`s (keys Q, W, E, R;
  R at level 3). Keep the roster at five: `spawnChampion` gives red all five and blue the four
  others. Update the README's champion table and the pick cards (they read `CHAMPIONS` directly).
- **Add an ability kind**: add it to `AbilityKind`, handle it in `cast` (`sim.ts`) and, for AI use,
  in `aimFor`.
- **Tune the map**: edit `LANES`, `TOWERS` and `CAMPS` in `data.ts`. Keep blue towers mirrored by
  red's under the 180-degree rotation of the map, and check the playthrough still reaches the red mid
  tower at (1576, 584).
- **Add an item**: add it to `ITEMS` with its stats. `refreshStats` applies the stat fields it knows
  (`dmg`, `armor`, `hp`, `speed`).

## Gotchas

- Only champions and camps respawn (`revive` in `updateUnit`); a tower or Nexus that falls must stay
  dead, or the match never ends.
- `kill` rewards only a champion killer: a tower or camp killed by a minion pays nothing.
- Red's damage goes through `dealt`, so a new damage source on red must use it or it ignores the
  difficulty.
- `refreshStats` heals by the increase in max health, so a level up or purchase tops the champion up
  by that amount, not to full.
