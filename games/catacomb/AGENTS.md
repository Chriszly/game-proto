# Catacomb: guide for agents

How Catacomb is built and where it stands today, for agents changing it. `README.md` covers how to
play and lists the cards and foes. Keep this file up to date with any change to the game, as the
root `AGENTS.md` asks.

## Current state

Catacomb is a small dungeon deckbuilder. A knight walks a map, the Crypt, laid out anew for each
run, through fights, a campfire and a treasure chest to the Bone King, fighting with a deck of
cards. The art is painterly: shapes and pixel grids drawn in code, repainted with brush strokes.

- **Implemented:** a branching map made per run (`makeMap` in `src/game/map.ts`, nine rooms in six
  columns, kept in `state.rooms`), turn-based card fights against foes whose next move is drawn at
  random from their moves (opening with the first, never the same move twice in a row), strength
  buffs, block, healing, card rewards after fights (common pool) and in the treasure room (rare
  pool, with Skip), a campfire that either heals 30% or burns one card from the deck, and defeat
  and victory panels whose button restarts the scene.
- **Progression** is only within a run: the deck grows by one card per reward, shrinks by one at a
  campfire, and health carries over between rooms. There is no meta progression, gold, relics or
  upgrades.
- **Persistence:** none. The game writes nothing to browser storage; a reload starts a new run.
  It only reads the hub's shared settings (see Hub settings below).
- **Rough edges you can see in the code:**
  - There is only one act, and `makeMap` always makes the same shape (1, 2, 2, 2, 1, 1 rooms per
    column); only the foes, which row the campfire and chest take, and the crossing paths vary.
  - `GameScene.drawFight` hard-codes `/3` in the energy text and `f.energy === 3` in the
    "Your turn" banner check, and `drawHud` hard-codes `Room N of 6`. They do not follow `ENERGY`
    or the number of columns in `state.rooms`.
  - "Never the same move twice in a row" compares move objects, so the Cultist's two separate
    attack-6 entries can follow each other (and make attacks twice as likely).
  - Most foes are still pixel grids, rounded and repainted; only the knight and the slime are
    drawn as shapes. The panels and buttons are flat rectangles, not painted.
  - The card id `vampBite` is shown as "Leech".

## Architecture

File map (all under `src/` unless it starts with `shared/`):

- `main.ts`: creates the `Phaser.Game` (960x540 from `VIEW`, `Scale.FIT`, `pixelArt: false`, so
  the painted textures are smoothed) with
  `BootScene` then `GameScene`, calls `setupGame(game)`; in dev builds puts `game` on `window`.
- `game/cards.ts`: the `Card` type, the `CARDS` table, `CardId`, `STARTER_DECK`, the `COMMON` and
  `RARE` reward pools (derived from `rarity`), `describe` (card text) and `kindOf` (attack
  or skill).
- `game/enemies.ts`: `EnemyKind`, the `Intent` union (attack, block, buff) and the `ENEMIES` table
  of health and `moves` (the first is the opening move).
- `game/map.ts`: `Room` (kind, column, screen x/y, `next` links, foes), `makeMap` (a new Crypt
  from the `EARLY`, `DEEPER` and `LATE` foe groups), `ENTRANCE` and `reachable(rooms, at)`.
- `game/state.ts`: tuning constants (including `MIN_DECK`), `Phase`, `Enemy` (with its `intent`),
  `Fight`, `Pop`, `GameState`.
- `game/sim.ts`: all rules. `newRun`, `walkTo`, `playCard`, `canPlay`, `endTurn`, `takeReward`,
  `rest`, `restHeal`, `canRemove`, `removeCard`, `tick`, `intentOf`, `shuffle`; private
  `nextIntent` draws a foe's next move. No Phaser import.
- `scenes/BootScene.ts`: bakes every texture (`bakeScenery`, `bakeCharacters`, `bakeIcons`,
  `bakeCardFrames`), then starts `Game`.
- `scenes/GameScene.ts`: builds and draws the map, fight, reward overlay, panel (with Rest and
  Remove a card at a campfire), the burn-a-card picker (`removeLayer`, shown while `removing`),
  floating numbers and HUD, and wires taps to sim functions. Exposes `state`, `hand` and
  `rewards`.
- `scenes/layout.ts`: screen positions and sizes for the fight, hand, reward, buttons, campfire
  buttons (`REST_BUTTONS`), the burn picker (`REMOVE`) and HUD, and `FONT` (a serif).
- `ui/CardView.ts`: `makeCard`, a card face container: an ink edge (`bg`, the part that takes
  taps), the painted parchment, icon, name, rules and a gold cost seal.
- `ui/Button.ts`: `makeButton`, a wooden button container.
- `art/palette.ts`: colour constants.
- `art/pixelArt.ts`: `bakePixelArt`, `PixelCanvas` (with `toCanvas`) and the `seeded` generator
  for art noise.
- `art/paint.ts`: the painterly pass. `paint(canvas, opts)` repaints a canvas with oval brush dabs,
  biggest brush first, each smaller one only where the painting still differs (`sizes`, `seed`,
  `threshold`, `grain`, `vignette`, `cutout` for sprites). Also `sketch`, `addTexture` and
  `bakePainted` (a pixel grid, optionally rounded off with `smooth`, then painted).
- `art/characters.ts`: the knight (`KNIGHT`) and slime (`SLIME`) drawn as shapes at twice their
  size, and grids for the other foes (`FOES` keyed by `EnemyKind`); textures `hero`, `hero-token`,
  `foe-<kind>`.
- `art/icons.ts`: `CARD_ICONS` keyed by `Icon`, `INTENTS`, room icons keyed by `RoomKind`, all
  through `bakePainted`; textures `card-<icon>`, `intent-<kind>`, `room-<kind>`, `heart`.
- `art/cardFrames.ts`: the parchment card faces `card-attack` and `card-skill`, painted at twice
  the card size, and `CARD_FRAME` (where the header and picture window sit).
- `art/scenery.ts`: the `room-bg` crypt (wall, arch, two torches, floor in perspective) and the
  `map-bg` flagstones, drawn at 1920x1080, shrunk to 960x540 and painted.
- `shared/settings.ts` and `shared/setupGame.ts` (repo root, shared by every game): the hub's
  settings, `byDifficulty` and `setupGame`. `sim.ts` imports `byDifficulty`, `GameScene.ts`
  imports `settings`.

How it runs:

- **Boot:** all art is drawn in code and baked to textures in `BootScene.create`; there are no
  asset files. Painting is the slow part of boot (the two backdrops most). `GameScene.create` calls `newRun` and creates every layer once.
- **Time:** `GameScene.update(time)` computes `dt` from the frame timestamp (not Phaser's smoothed
  delta), clamped to `MAX_STEP_MS` (250), and calls `tick(state, dt)`. `tick` counts down pops and
  hit flashes, advances walking (`WALK_MS`), steps the foes' turn one foe per `ENEMY_ACT_MS`, and
  after `CLEARED_MS` moves a won fight to the reward (or to `won` for the boss room).
- **Input:** Phaser `pointerdown` handlers call sim functions directly: room circles call
  `walkTo`, hand cards `playCard(state, i)`, End turn `endTurn`, reward cards and Skip
  `takeReward`, the campfire's Rest `rest` and its picker's cards `removeCard`, the panel button
  `scene.restart()`. Sim functions check the phase
  and return false when the action is not allowed.
- **Rendering:** each frame, `update` picks the map or fight layer (the treasure reward is shown
  over the map) and redraws. Graphics (paths, room rings, health bars, HUD) are cleared and
  redrawn every frame. Foe sprites and pop texts are diffed by id in `this.foes` and `this.pops`;
  pops are drawn before the fight, so a killing blow's number still finds its foe before the foe is
  dropped.
  The hand and reward cards are rebuilt only when a key changes (`handKey` is the hand plus
  energy, `rewardKey` the offered ids).

State model (`src/game/state.ts`):

- `GameState` is plain data: `phase`, `hp`/`maxHp`, `deck` (all owned cards), `rooms` (this run's
  map), `at` (room index into `rooms`, or null at the entrance), `cleared` (rooms done, in order), `walk`, `fight`, `reward`, plus
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

- `Math.random` is used in `makeMap` (once per run, in `newRun`), in `shuffle` in
  `src/game/sim.ts`, which draws piles, reshuffles the discard and picks rewards (`pickSome`), and
  in `nextIntent` after each foe acts. The test seeds it, so changing the number or order of these
  calls changes the map, hands, rewards and foe moves the test sees.
- Art noise uses `seeded` from `src/art/pixelArt.ts`, not `Math.random`.
- All timing is game time from `tick`; there is no `Date.now`, `setTimeout` or Phaser timer in
  the rules. Tweens are only used to fade fallen foes.

Data tables (where to tune):

- Cards and the starter deck: `CARDS` and `STARTER_DECK` in `src/game/cards.ts`.
- Foe health and moves: `ENEMIES` in `src/game/enemies.ts` (health is the Normal value;
  `startFight` scales it by difficulty).
- Map shape and foes per depth: `makeMap`, `EARLY`, `DEEPER`, `LATE` and `colX` in
  `src/game/map.ts`.
- `MAX_HP`, `ENERGY`, `HAND_SIZE`, `REST_HEAL`, `MIN_DECK`, `REWARD_CHOICES` and the `*_MS` timings:
  `src/game/state.ts`.
- Screen positions: `src/scenes/layout.ts`.

### Hub settings

- `src/main.ts` calls `setupGame(game)` from `shared/setupGame.ts`, which applies the frame cap, the FPS readout, reduced motion and full screen for camera shake and flash.
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
  (24, on Normal) and `moves` (`SLIME` in the test), `ENERGY` (3), `HAND_SIZE` (5),
  `REWARD_CHOICES` (3, all different), the first room being a lone slime at `rooms[0]`, and the
  `END_TURN` and `VIEW` positions. The test checks each slime turn against its shown `intent`,
  that it opens with its first move and that it never repeats a move twice in a row. The test also expects the slime to fall in under eight turns without killing the hero.
- Field names the test reads: `phase` values, `hp`, `maxHp`, `deck`, `at`, `cleared`, `reward`,
  and in `fight`: `draw`, `hand`, `discard`, `energy`, `block`, `turn`, and each enemy's `kind`,
  `hp`, `block`, `step`, `intent`.
- Screenshots are saved as `playthrough-0-map` through `playthrough-3-next-room` in
  `docs/screenshots/`; refresh them when the look of the first room changes. `boss`, `treasure`,
  `victory`, `campfire` and `campfire-remove` there are taken by hand (not by the test); refresh
  them too when the look changes. `cover.png` is a copy of `playthrough-1-fight`.

## Making common changes

- **Add a card:** add an entry to `CARDS` in `src/game/cards.ts` with a `rarity` (common or rare
  puts it in a reward pool). A new `Icon` needs its grid in `CARD_ICONS` in `src/art/icons.ts`
  (it is painted on its own). A
  new kind of effect needs a field on `Card`, handling in `playCard` in `src/game/sim.ts` and a
  line in `describe`. Update the README's card table.
- **Add a foe:** add the kind to `EnemyKind` and `ENEMIES` in `src/game/enemies.ts` and its grid to
  `FOES` in `src/art/characters.ts` (typed by `EnemyKind`, so the build fails until you do), then
  add it to a foe group (`EARLY`, `DEEPER` or `LATE`) in `src/game/map.ts`. Up to three foes fit (`FOE_XS` in `src/scenes/layout.ts`).
- **Change a foe's moves:** edit its `moves` in `ENEMIES`; the first is always its opening move.
  The slime's moves are mirrored in the test.
- **Add a new intent kind:** extend `Intent` in `src/game/enemies.ts`, handle it in `act` in
  `src/game/sim.ts`, add a texture in `INTENTS` in `src/art/icons.ts` (named `intent-<kind>`), and
  its text and colour in `GameScene.drawIntent`.
- **Change the map:** edit `makeMap` in `src/game/map.ts`; `x`/`y` are screen positions. Keep
  `next` pointing at the following column, update `Room N of 6` in `GameScene.drawHud` if the
  column count changes, and keep `rooms[0]` a lone slime at 110,290 or update the test. Draw only
  with `Math.random`, so the seeded test sees the same map each run.
- **Change the look:** draw on a canvas from `sketch` and pass it through `paint`; bigger
  `sizes` give looser strokes. Shapes drawn at twice the size (like `KNIGHT`) paint better than
  pixel grids.
- **Add a room kind:** extend `RoomKind`, handle it in `enterRoom` in `src/game/sim.ts`, add a
  room icon in `src/art/icons.ts`, and handle its view in `GameScene.update` (`onMap`),
  `drawPanel` or `drawReward`, and its name in `drawHud`.

## Gotchas

- Hand cards bind `pointerdown` to their index at build time. The hand is rebuilt only when the
  hand or energy changes, so if a new effect changes playability some other way, add it to
  `handKey` in `GameScene.drawHand`.
- `FIRST_ROOM` and `END_TURN` in the test are copies of `rooms[0]` (from `makeMap`) and `END_TURN` in layout;
  moving either breaks the taps silently (the wait then times out).
- A foe's strength is added per hit, and the intent text already includes it, so the shown number
  is the real damage before the hero's block.
- `over` is set in `tick` after a foe acts, and the fight object is kept, so the fight layer stays
  behind the defeat panel.
- The treasure room reuses the `reward` phase with `fight` null; `GameScene.update` and
  `drawReward` tell it apart by `s.rooms[s.at].kind`.
- Entering a campfire no longer heals; `rest` does, and `removeCard` leaves without healing. Both
  call `leaveRest`, which marks the room cleared.
- Card text is dark ink on parchment; keep new card text dark, and light text on the header.
- `scene.restart()` reruns `create`, which resets the run, but `clock` and `lastFrame` carry over.
- Never use a red cross in any art (root `AGENTS.md`); healing pops are already green.
