# Catacomb: guide for agents

How Catacomb is built and where it stands today, for agents changing it. `README.md` covers how to
play and lists the cards and foes. Keep this file up to date with any change to the game, as the
root `AGENTS.md` asks.

## Current state

Catacomb is a small dungeon deckbuilder. A knight walks one fixed map, the Crypt, through fights, a
campfire and a treasure chest to the Bone King, fighting with a deck of cards.

- **Implemented:** the branching map (`ROOMS` in `src/game/map.ts`, nine rooms in six columns),
  turn-based card fights against foes with fixed intent patterns, strength buffs, block, healing,
  card rewards after fights (common pool) and in the treasure room (rare pool, with Skip), a
  campfire that heals 30%, and defeat and victory panels whose button restarts the scene.
- **Progression** is only within a run: the deck grows by one card per reward and health carries
  over between rooms. There is no meta progression, gold, relics, card removal or upgrades.
- **Persistence:** none. The game writes nothing to browser storage; a reload starts a new run.
  It only reads the hub's shared settings (see Hub settings below).
- **Rough edges you can see in the code:**
  - The map is a single hand-placed layout; there is no map generation and only one act.
  - `GameScene.drawFight` hard-codes `/3` in the energy text and `f.energy === 3` in the
    "Your turn" banner check, and `drawHud` hard-codes `Room N of 6`. They do not follow `ENERGY`
    or the number of columns in `ROOMS`.
  - Foes always act in a fixed pattern; there is no randomness in foe behaviour.
  - The `PixelCanvas` doc comment in `src/art/pixelArt.ts` still mentions "stations, tiles" from
    the file it was copied from.
  - The card id `vampBite` is shown as "Leech".

## Architecture

File map (all under `src/` unless it starts with `shared/`):

- `main.ts`: creates the `Phaser.Game` (960x540 from `VIEW`, `Scale.FIT`, `pixelArt: true`) with
  `BootScene` then `GameScene`, calls `setupGame(game)`; in dev builds puts `game` on `window`.
- `game/cards.ts`: the `Card` type, the `CARDS` table, `CardId`, `STARTER_DECK`, the `COMMON` and
  `RARE` reward pools (derived from `rarity`), `describe` (card text) and `kindOf` (attack
  or skill).
- `game/enemies.ts`: `EnemyKind`, the `Intent` union (attack, block, buff) and the `ENEMIES` table
  of health and intent patterns.
- `game/map.ts`: `Room`, the `ROOMS` table (kind, column, screen x/y, `next` links, foes),
  `ENTRANCE` and `reachable`.
- `game/state.ts`: tuning constants, `Phase`, `Enemy`, `Fight`, `Pop`, `GameState`.
- `game/sim.ts`: all rules. `newRun`, `walkTo`, `playCard`, `canPlay`, `endTurn`, `takeReward`,
  `leaveRest`, `tick`, `intentOf`, `shuffle`. No Phaser import.
- `scenes/BootScene.ts`: bakes every texture (`bakeScenery`, `bakeCharacters`, `bakeIcons`), then
  starts `Game`.
- `scenes/GameScene.ts`: builds and draws the map, fight, reward overlay, panel, floating numbers
  and HUD, and wires taps to sim functions. Exposes `state`, `hand` and `rewards`.
- `scenes/layout.ts`: screen positions and sizes for the fight, hand, reward, buttons and HUD.
- `ui/CardView.ts`: `makeCard`, a card face container; returns `bg`, the part that takes taps.
- `ui/Button.ts`: `makeButton`, a wooden button container.
- `art/palette.ts`: colour constants and `CARD` frame colours.
- `art/pixelArt.ts`: `bakePixelArt`, `PixelCanvas` and the `seeded` generator for art noise.
- `art/characters.ts`: hero and foe grids (`FOES` keyed by `EnemyKind`); textures `hero`,
  `hero-token`, `foe-<kind>`.
- `art/icons.ts`: `CARD_ICONS` keyed by `Icon`, `INTENTS`, room icons keyed by `RoomKind`; textures
  `card-<icon>`, `intent-<kind>`, `room-<kind>`, `heart`.
- `art/scenery.ts`: the `room-bg` (fight) and `map-bg` backdrops.
- `shared/settings.ts` and `shared/setupGame.ts` (repo root, shared by every game): the hub's
  settings, `byDifficulty` and `setupGame`. `sim.ts` imports `byDifficulty`, `GameScene.ts`
  imports `settings`.

How it runs:

- **Boot:** all art is drawn in code and baked to textures in `BootScene.create`; there are no
  asset files. `GameScene.create` calls `newRun` and creates every layer once.
- **Time:** `GameScene.update(time)` computes `dt` from the frame timestamp (not Phaser's smoothed
  delta), clamped to `MAX_STEP_MS` (250), and calls `tick(state, dt)`. `tick` counts down pops and
  hit flashes, advances walking (`WALK_MS`), steps the foes' turn one foe per `ENEMY_ACT_MS`, and
  after `CLEARED_MS` moves a won fight to the reward (or to `won` for the boss room).
- **Input:** Phaser `pointerdown` handlers call sim functions directly: room circles call
  `walkTo`, hand cards `playCard(state, i)`, End turn `endTurn`, reward cards and Skip
  `takeReward`, the panel button `leaveRest` or `scene.restart()`. Sim functions check the phase
  and return false when the action is not allowed.
- **Rendering:** each frame, `update` picks the map or fight layer (the treasure reward is shown
  over the map) and redraws. Graphics (paths, room rings, health bars, HUD) are cleared and
  redrawn every frame. Foe sprites and pop texts are diffed by id in `this.foes` and `this.pops`;
  pops are drawn before the fight, so a killing blow's number still finds its foe before the foe is
  dropped.
  The hand and reward cards are rebuilt only when a key changes (`handKey` is the hand plus
  energy, `rewardKey` the offered ids).

State model (`src/game/state.ts`):

- `GameState` is plain data: `phase`, `hp`/`maxHp`, `deck` (all owned cards), `at` (room index or
  null at the entrance), `cleared` (rooms done, in order), `walk`, `fight`, `reward`, plus
  timers (`timerMs`, `heroHitMs`), `healed`, `pops` and `nextId`.
- `Phase` runs `map` -> `walk` -> `player` <-> `enemy` -> `cleared` -> `reward` -> `map`, with
  `rest`, `over` and `won` as side exits.
- `Fight` holds the `draw`, `hand` and `discard` piles, `energy`, hero `block`, `turn`, `enemies`
  and `acted`. `enemies[0]` is the one in front and takes single-target damage.
- Only `src/game/sim.ts` mutates state. The scene only reads it and calls sim functions.
- Invariants: `deck` is never changed by a fight (each fight shuffles a copy into `draw`); a dead
  foe is spliced out of `enemies` at once; the hero's block resets in `startTurn`, foes' block in
  `endTurn`; `nextId` is shared by foes and pops; a room joins `cleared` only when it is left (or
  the boss falls), so `cleared` drives which map paths are lit.

Randomness and timing:

- `Math.random` is used only in `shuffle` in `src/game/sim.ts`, which draws piles, reshuffles the
  discard and picks rewards (`pickSome`). The test seeds it, so changing the number or order of
  these calls changes the hands and rewards the test sees.
- Art noise uses `seeded` from `src/art/pixelArt.ts`, not `Math.random`.
- All timing is game time from `tick`; there is no `Date.now`, `setTimeout` or Phaser timer in
  the rules. Tweens are only used to fade fallen foes.

Data tables (where to tune):

- Cards and the starter deck: `CARDS` and `STARTER_DECK` in `src/game/cards.ts`.
- Foe health and intent patterns: `ENEMIES` in `src/game/enemies.ts` (health is the Normal value;
  `startFight` scales it by difficulty).
- Map layout, room kinds and foes per room: `ROOMS` and `colX` in `src/game/map.ts`.
- `MAX_HP`, `ENERGY`, `HAND_SIZE`, `REST_HEAL`, `REWARD_CHOICES` and the `*_MS` timings:
  `src/game/state.ts`.
- Screen positions: `src/scenes/layout.ts`.

### Hub settings

- `src/main.ts` calls `setupGame(game)` from `shared/setupGame.ts`, which applies the frame cap,
  the FPS readout and reduced motion for camera shake and flash.
- Difficulty scales one number: foe health. `startFight` in `src/game/sim.ts` sets each foe's `hp`
  and `maxHp` to `Math.round(ENEMIES[kind].hp * byDifficulty(0.75, 1, 1.3))`, so Easy 0.75x,
  Normal 1x, Hard 1.3x. Damage, block and the hero are not scaled.
- `settings.reduceMotion` also stops the hero's hit shake, the hero's red hit tint, the foes'
  white hit flash and the foes' idle bob in `GameScene.drawFight`, and holds the enterable rooms'
  gold ring pulse still (full brightness, no outer ring) in `GameScene.drawMap`.
- Keep Normal exactly as designed (multiplier 1): the playthrough runs on Normal and expects the
  slime's 24 health.
- Keep the Catacomb row of the difficulty table in the root `README.md` (and the difficulty line
  in this game's `README.md`) in sync with the multipliers.
- The shared settings live under the `hub-settings` storage key, owned by `shared/settings.ts`,
  not in a save of this game's own.

## Testing hooks

- `src/main.ts` sets `window.game` in dev builds only. The test reads
  `game.scene.getScene('Game')` and its `state`, `hand` and `rewards` (`CardSpot` lists with id
  and centre x/y). It never writes state.
- Inputs it drives: a tap on the first room (`FIRST_ROOM`, 110,290), taps on hand cards at the
  spots from `hand`, taps on End turn (`END_TURN`, 884,420) and a tap on the first reward card.
- Numbers mirrored in `e2e/playthrough.spec.ts` that must change with the game: `MAX_HP` (50), the
  starter deck counts, the costs, damage and block of Strike, Defend and Bash, the slime's health
  (24, on Normal) and pattern, `ENERGY` (3), `HAND_SIZE` (5), `REWARD_CHOICES` (3, all
  different), the first room being a lone slime at `ROOMS[0]`, and the `END_TURN` and `VIEW`
  positions. The test also expects the slime to fall in under eight turns without killing the hero.
- Field names the test reads: `phase` values, `hp`, `maxHp`, `deck`, `at`, `cleared`, `reward`,
  and in `fight`: `draw`, `hand`, `discard`, `energy`, `block`, `turn`, and each enemy's `kind`,
  `hp`, `block`, `step`.
- Screenshots are saved as `playthrough-0-map` through `playthrough-3-next-room` in
  `docs/screenshots/`; refresh them when the look of the first room changes.

## Making common changes

- **Add a card:** add an entry to `CARDS` in `src/game/cards.ts` with a `rarity` (common or rare
  puts it in a reward pool). A new `Icon` needs its grid in `CARD_ICONS` in `src/art/icons.ts`. A
  new kind of effect needs a field on `Card`, handling in `playCard` in `src/game/sim.ts` and a
  line in `describe`. Update the README's card table.
- **Add a foe:** add the kind to `EnemyKind` and `ENEMIES` in `src/game/enemies.ts` and its grid to
  `FOES` in `src/art/characters.ts` (typed by `EnemyKind`, so the build fails until you do), then
  place it in a room in `ROOMS`. Up to three foes fit (`FOE_XS` in `src/scenes/layout.ts`).
- **Add a new intent kind:** extend `Intent` in `src/game/enemies.ts`, handle it in `act` in
  `src/game/sim.ts`, add a texture in `INTENTS` in `src/art/icons.ts` (named `intent-<kind>`), and
  its text and colour in `GameScene.drawIntent`.
- **Change the map:** edit `ROOMS` in `src/game/map.ts`; `x`/`y` are screen positions. Keep
  `next` pointing at the following column, update `Room N of 6` in `GameScene.drawHud` if the
  column count changes, and keep `ROOMS[0]` a slime fight at 110,290 or update the test.
- **Add a room kind:** extend `RoomKind`, handle it in `enterRoom` in `src/game/sim.ts`, add a
  room icon in `src/art/icons.ts`, and handle its view in `GameScene.update` (`onMap`),
  `drawPanel` or `drawReward`, and its name in `drawHud`.

## Gotchas

- Hand cards bind `pointerdown` to their index at build time. The hand is rebuilt only when the
  hand or energy changes, so if a new effect changes playability some other way, add it to
  `handKey` in `GameScene.drawHand`.
- `FIRST_ROOM` and `END_TURN` in the test are copies of `ROOMS[0]` and `END_TURN` in layout;
  moving either breaks the taps silently (the wait then times out).
- A foe's strength is added per hit, and the intent text already includes it, so the shown number
  is the real damage before the hero's block.
- `over` is set in `tick` after a foe acts, and the fight object is kept, so the fight layer stays
  behind the defeat panel.
- The treasure room reuses the `reward` phase with `fight` null; `GameScene.update` and
  `drawReward` tell it apart by `ROOMS[s.at].kind`.
- `scene.restart()` reruns `create`, which resets the run, but `clock` and `lastFrame` carry over.
- Never use a red cross in any art (root `AGENTS.md`); healing pops are already green.
