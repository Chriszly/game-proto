# Catacomb: guide for agents

How Catacomb is built and where it stands today, for agents changing it. `README.md` covers how to
play and lists the cards and foes. Keep this file up to date with any change to the game, as the
root `AGENTS.md` asks.

## Current state

Catacomb is a small dungeon deckbuilder. A hero (the Knight or the Hunter) walks two maps, the
Crypt and the Sunken Tombs, each laid out anew for each run, through fights, elites, campfires,
treasure chests, merchants and mystery rooms to the Bone King and then the Hollow Queen, fighting
with a deck of cards and three flasks. Beating the Hollow Queen opens the next depth, a harder run
with one more rule. The art is painterly: shapes and pixel grids drawn in code, repainted with brush strokes.

- **Implemented:** a hero choice before the first room (`phase` `hero`; `HEROES` in
  `src/game/heroes.ts`: the Knight is the original game, the Hunter has 40 health and a deck of
  Venom Knives and Dodges), a depth ladder (`state.depth`, `src/game/depth.ts`: the Hollow Queen's
  fall unlocks `depth + 1`, saved as `bestDepth`; depth 1 gives foes 20% more health, depth 2 cuts
  rests to 15%, depth 3 starts the deck with a Wound, each depth past 3 adds 20% foe health again),
  flasks (`src/game/flasks.ts`, three slots in `state.flasks`, drunk on the hero's turn for no
  energy; each hero starts with one, elites and bosses drop one, the merchant sells two), power
  cards (`power` on a `Card`: played, they go to `fight.powers` and stay in play; Bulwark, Thorns,
  Battle Rage with `fight.strength`, Venom Veil), curse cards (`curse` on a `Card`: unplayable
  Rust, Wound that bites when drawn, Doubt that makes the first card of a turn dearer; added by an
  elite's `curse` intent, the shrine's loot and the chained chest), a branching map per act (`makeMap(act)` in `src/game/map.ts`, 12 to 17 rooms
  in seven columns, kept in `state.rooms`), two acts (`state.act`; the Bone King's fall leaves a
  relic and a `descend` panel that makes the second map), turn-based card fights against foes whose
  next move is drawn at random from their moves (opening with the first, never the same move twice
  in a row), strength buffs, block, healing, the statuses Weak, Vulnerable and Poison on both sides
  (cards, foe attacks with an `apply` rider, and a `debuff` intent), elites (rare card reward),
  gold dropped by foes, card rewards after fights (common pool) and in treasure rooms (rare pool,
  with Skip), a campfire with three choices (heal 30%, temper one card, burn one card), a merchant
  (cards, relics, one removal per visit), four mystery rooms with two choices each, seven relics
  (passive bonuses, shown in the top bar with a tap-for-text tip), and defeat and victory panels
  whose button restarts the scene.
- **Progression** within a run: the deck grows by rewards, purchases and curses, shrinks at a
  campfire or the merchant, cards can be tempered once each, gold, relics and flasks are kept until
  the run ends, and health carries over between rooms and acts. Across runs, only the best depth
  unlocked carries over.
- **Persistence:** one key, `catacomb-best-depth` (`loadBestDepth`/`saveBestDepth` in
  `src/game/depth.ts`), the deepest depth unlocked. A new run defaults to it; the hero panel's
  `<` and `>` pick a lower one. A reload otherwise starts a new run. The game also reads the hub's
  shared settings (see Hub settings below).
- **Rough edges you can see in the code:**
  - Card faces show a card's own numbers, not what Whetstone, Weak or Vulnerable make of them; the
    foes' intents do show the real damage.
  - The relic tip shows on tap or hover; there is no list of owned relics elsewhere.
  - Most foes are still pixel grids, rounded and repainted; only the knight and the slime are
    drawn as shapes. The panels, buttons and merchant boxes are flat rectangles, not painted.
  - The second act's backdrops are the first act's with a green wash (`washed` in
    `src/art/scenery.ts`), not drawn on their own.
  - The card id `vampBite` is shown as "Leech".
  - A card face shows its own cost, not the one Doubt makes of it (`costOf` in `sim.ts`); the
    card simply dims when it can't be afforded.
  - Flasks can only be drunk during a fight, on the hero's turn, so a Healing Flask can't be used
    on the map.

## Architecture

File map (all under `src/` unless it starts with `shared/`):

- `howToPlay.ts`: the How to play screen's text (goal, controls, core loop and tips), handed to
  `setupGame(game, { howToPlay })` in `main.ts`; update it when the controls or the first round change.
- `main.ts`: creates the `Phaser.Game` (960x540 from `VIEW`, `Scale.FIT`, `pixelArt: false`, so
  the painted textures are smoothed) with
  `BootScene` then `GameScene`, calls `setupGame(game)` and `setupScaling(game)` from
  `shared/scaling.ts`; in dev builds puts `game` on `window`.
- `game/cards.ts`: the `Card` type (with `up`, what tempering changes, and the optional `power`
  and `curse` kinds), `PowerKind`, `CurseKind`, the `CARDS` table, `BaseId` (a key of `CARDS`) and
  `CardId` (a `BaseId`, or `BaseId+` once tempered), `card(id)` (the rules, with `up` applied to a
  tempered id), `isTempered`, `baseOf`, `tempered`, `isCurse`, `STARTER_DECK` (the Knight's) and
  `HUNTER_DECK`, the `COMMON` and `RARE` pools (derived from `rarity`; curses are in neither),
  the power and curse constants (`POWER_BLOCK`, `POWER_STRENGTH`, `THORNS`, `WOUND_HURT`,
  `DOUBT_COST`), `describe` (card text) and `kindOf` (attack, skill, power or curse).
- `game/heroes.ts`: `HeroId`, `HEROES` (name, health, deck, starting flask, caption) and `HERO_IDS`.
- `game/flasks.ts`: `FlaskId`, `FLASKS` (name and text), `FLASK_IDS`, `FLASK_SLOTS` (3),
  `FLASK_PRICE` and each flask's number. Their effects live in `useFlask` in `sim.ts`.
- `game/depth.ts`: the depth ladder: `DEPTH_RULES` and `depthText(depth)` for the panels,
  `depthFoeHp(depth)`, `DEEP_REST_HEAL`, `DEPTH_CURSE`, and the save (`loadBestDepth`,
  `saveBestDepth`, key `catacomb-best-depth`).
- `game/enemies.ts`: `EnemyKind`, `StatusKind`, the `Intent` union (attack with an optional
  `apply` status, block, buff, debuff, and `curse`, which adds a curse card to the deck) and the
  `ENEMIES` table of health, `gold`, `elite`/`boss` and `moves` (the first is the opening move).
- `game/relics.ts`: `RelicId`, `RELICS` (name and text) and `RELIC_IDS`. Their effects live in
  `sim.ts` (search for `hasRelic`).
- `game/events.ts`: `EventId`, `EVENTS` (title, text, two choice captions), their cost constants
  and the curses the shrine's loot and the chest add (`SHRINE_CURSE`, `CHEST_CURSE`). Their effects
  live in `chooseEvent` in `sim.ts`.
- `game/map.ts`: `RoomKind`, `Room` (kind, column, screen x/y, `next` links, foes, event),
  `COLUMNS` (7), `ACTS` (2), `ACT_FOES` (each act's name, first fight, early, late and elite foe
  groups and boss), `COLUMN_KINDS` (what each middle column holds), `makeMap(act)`, `ENTRANCE` and
  `reachable(rooms, at)`.
- `game/state.ts`: tuning constants (including `MIN_DECK`, the prices, `SHOP_CARDS`,
  `SHOP_RELICS`, `SHOP_FLASKS`, `WEAK_MULT` and `VULNERABLE_MULT`), `Phase`, `Status` and
  `noStatus`, `Ware`, `Shop` (cards, relics, flasks, removal), `Enemy` (with its `intent` and
  `status`), `Fight` (with the hero's `status`, `strength`, the `powers` in play, the cards
  `played` this turn and the `gold` its foes drop), `Pop`, `GameState` (with `hero`, `depth`,
  `bestDepth`, `flasks` and `flaskWon`).
- `game/sim.ts`: all rules. `newRun`, `chooseHero`, `setDepth`, `walkTo`, `playCard`, `canPlay`,
  `costOf` (a card's cost in hand, with Doubt), `canUseFlask`, `useFlask`, `heroHit` and `foeHit`
  (damage after relics, strength and statuses), `endTurn`, `takeReward`, `descend`, `rest`,
  `restShare`, `restHeal`, `canRemove`, `removeCard`, `canTemper`, `temperCard`, `buyCard`,
  `buyRelic`, `canBuyFlask`, `buyFlask`, `canBuyRemoval`, `buyRemoval`, `leaveShop`, `canChoose`,
  `chooseEvent`, `eventHere`, `hasRelic`, `actName`, `tick`, `intentOf`, `shuffle`; private `act`
  (a foe's go, poison first), `endRound` (after the foes' turn), `winFight`, `grantRelic`,
  `grantFlask`, `curse` (a curse card into the deck and the discard pile), `applyPoison` (Venom
  Gland and Venom Veil), `makeShop` and `nextIntent`. No Phaser import.
- `scenes/BootScene.ts`: reads the screen's resolution (`setArtRes`), bakes every texture
  (`bakeScenery`, `bakeCharacters`, `bakeIcons`, `bakeCardFrames`), then starts `Game`.
- `scenes/GameScene.ts`: builds and draws the map (room icons rebuilt by `buildRooms` when a new
  act brings a new map), fight (with a `StatusRow` over each fighter, the flask slots in
  `flaskLayer` and the powers in play in `powerLayer`), reward overlay, the merchant (`shopLayer`,
  with the flasks under the cards), panel (hero choice with the depth row, campfire, mystery room,
  descent, defeat and victory), the card picker (`pickLayer`, shown while `picking` is `burn`,
  `temper` or `sell`), floating numbers and HUD (gold and relic icons, with a tip that flasks and
  powers reuse), and wires taps to sim functions. The hero's and the map token's textures follow
  `state.hero`. Exposes `state`, `hand` and `rewards`.
- `scenes/layout.ts`: screen positions and sizes for the fight, hand, reward, buttons, campfire
  buttons (`REST_BUTTONS`), event choices (`EVENT_BUTTONS`, which the hero choice reuses), the hero
  panel's figures and depth row (`HERO_PANEL`), the flask slots (`FLASKS`), the powers in play
  (`POWERS`), the card picker (`PICKER`), the merchant (`SHOP`, with `flasks`), the top bar (`HUD`)
  and statuses (`STATUS_GAP`), and `FONT` (a serif).
- `ui/CardView.ts`: `makeCard`, a card face container: an ink edge (`bg`, the part that takes
  taps), the painted parchment, icon, name, rules and a gold cost seal (hidden on a curse).
- `ui/Button.ts`: `makeButton`, a wooden button container.
- `art/palette.ts`: colour constants.
- `art/pixelArt.ts`: `bakePixelArt`, `PixelCanvas` (with `toCanvas`) and the `seeded` generator
  for art noise.
- `art/paint.ts`: the painterly pass. `paint(canvas, opts)` repaints a canvas with oval brush dabs,
  biggest brush first, each smaller one only where the painting still differs (`sizes`, `seed`,
  `threshold`, `grain`, `vignette`, `cutout` for sprites, `res`). Also `sketch`, `blank`,
  `addTexture`, `artImage` and `bakePainted` (a pixel grid, optionally rounded off with `smooth`,
  then painted). Every texture is painted `ART` (the screen's `renderScale`) times its size as
  shown, the backdrops at most `BACKDROP_RES` (2): `sketch` gives a canvas that big, pre-scaled so
  pictures are drawn at their own size, `paint` widens brushes, grain and the cutout's blur to
  match, `addTexture` remembers each key's `res`, and `artImage` shows a texture scaled back to its
  own size.
- `art/characters.ts`: the knight (`KNIGHT`), the hunter (`HUNTER`) and slime (`SLIME`) drawn as
  shapes at twice their size, and grids for the other foes (`FOES` keyed by `EnemyKind`); textures
  `hero-<hero>` and `hero-token-<hero>` (`heroTexture(hero, token)`), `foe-<kind>`.
- `art/icons.ts`: `CARD_ICONS` keyed by `Icon`, `INTENTS` (with `curse`), `STATUSES`,
  `RELIC_ICONS`, `FLASK_ICONS` (one bottle grid recoloured per flask), `COIN`, room icons keyed by
  `RoomKind`, all through `bakePainted`; textures `card-<icon>`, `intent-<kind>`, `status-<kind>`,
  `relic-<id>` and `relic-big-<id>` (`relicIcon`), `flask-<id>` (`flaskIcon`), `room-<kind>`,
  `coin`, `heart`.
- `art/cardFrames.ts`: the parchment card faces `card-attack`, `card-skill`, `card-power` (purple
  header) and `card-curse` (grey header, stained parchment), painted at twice the card size, and
  `CARD_FRAME` (where the header and picture window sit).
- `art/scenery.ts`: the `room-bg` crypt (wall, arch, two torches, floor in perspective) and the
  `map-bg` flagstones, drawn at 1920x1080, shrunk to 960x540 (times their `res`) and painted, plus `room-bg-2` and
  `map-bg-2` for the second act (the same washed green); `backdrop(kind, act)` names the one to use.
- `shared/settings.ts`, `shared/setupGame.ts` and `shared/scaling.ts` (repo root, shared by every
  game): the hub's settings, `byDifficulty`, `setupGame`, and `setupScaling` with `renderScale`. `sim.ts` imports `byDifficulty`, `GameScene.ts`
  imports `settings`.

How it runs:

- **Boot:** all art is drawn in code and baked to textures in `BootScene.create`; there are no
  asset files. Painting is the slow part of boot (the two backdrops most, which is why they stop
  at `BACKDROP_RES`; each step up in `res` costs about as much again). `GameScene.create` calls `newRun` and creates every layer once.
  `newRun` reads the saved best depth and opens on the `hero` phase; `chooseHero` sets the health,
  deck and flask (and depth 3's Wound) and goes to the map.
- **Time:** `GameScene.update(time)` computes `dt` from the frame timestamp (not Phaser's smoothed
  delta), clamped to `MAX_STEP_MS` (250), and calls `tick(state, dt)`. `tick` counts down pops and
  hit flashes, advances walking (`WALK_MS`), steps the foes' turn one foe per `ENEMY_ACT_MS` (a
  foe's poison bites before its move, and can kill it), then `endRound`, and after `CLEARED_MS`
  `winFight` adds the gold and moves a won fight to the reward (rare after an elite), to
  `descend` after the first boss or to `won` after the last.
- **Input:** Phaser `pointerdown` handlers call sim functions directly: the hero panel's two
  buttons `chooseHero` and its `<`/`>` `setDepth`, room circles call
  `walkTo`, hand cards `playCard(state, i)`, flask slots `useFlask(state, i)`, End turn `endTurn`, reward cards and Skip
  `takeReward`, the campfire's Rest `rest` and its picker's cards `temperCard` or `removeCard`, the
  merchant's wares `buyCard`, `buyRelic`, `buyFlask` and (through the picker) `buyRemoval`, Leave `leaveShop`,
  a mystery's choices `chooseEvent`, Descend `descend`, Delve again `scene.restart()`. Sim functions check the phase
  and return false when the action is not allowed. The mystery room's two choice buttons double
  as the hero choice (the handler reads the phase).
- **Rendering:** each frame, `update` picks the map or fight layer (the campfire, merchant,
  mystery and the rewards of treasure and the altar are shown over the map) and redraws. Graphics (paths, room rings, health bars, HUD) are cleared and
  redrawn every frame. Foe sprites and pop texts are diffed by id in `this.foes` and `this.pops`;
  pops are drawn before the fight, so a killing blow's number still finds its foe before the foe is
  dropped.
  The hand and reward cards are rebuilt only when a key changes (`handKey` is the hand plus
  energy, `rewardKey` the offered ids, `shopKey` the wares, gold and deck size, `pickKey` the
  picker's mode and cards, `relicKey` the relics, `flaskKey` the flasks plus whether it is the
  hero's turn, `powerKey` the powers in play).

State model (`src/game/state.ts`):

- `GameState` is plain data: `phase`, `hero`, `depth` and `bestDepth`, `flasks`, `act`,
  `hp`/`maxHp`, `deck` (all owned cards, curses included), `gold`,
  `relics`, `rooms` (this act's map), `at` (room index into `rooms`, or null at the entrance),
  `cleared` (rooms done in this act, in order), `walk`, `fight`, `reward` with `rewardRare`,
  `goldWon` and `flaskWon`, `shop`, `notice` (what the last event, temper or descent did, shown on the map), plus
  timers (`timerMs`, `heroHitMs`), `healed`, `pops` and `nextId`.
- `Phase` runs `hero` -> `map` -> `walk` -> `player` <-> `enemy` -> `cleared` -> `reward` -> `map`, with
  `rest`, `shop`, `event` (which can lead to `reward`), `descend` (to the next act's `map`), `over`
  and `won` as side exits.
- `Fight` holds the `draw`, `hand` and `discard` piles, `energy`, hero `block`, `turn`, `enemies`,
  `acted`, the hero's `status` and `strength`, the `powers` in play, the cards `played` this turn
  and the `gold` to drop. `enemies[0]` is the one in front and takes single-target damage.
- Statuses wear off like this: the hero's Weak in `endTurn`, a foe's Weak after it acts, everyone's
  Vulnerable in `endRound`; a foe's poison bites at the start of its go, the hero's in `endRound`.
- Only `src/game/sim.ts` mutates state. The scene only reads it and calls sim functions.
- Invariants: a fight never changes `deck` except through a foe's `curse` intent, which pushes the
  curse onto both `deck` and `fight.discard` (each fight otherwise shuffles a copy into `draw`); a
  played power goes to `fight.powers` and to no pile; a dead
  foe is spliced out of `enemies` at once (poison or Thorns can do it on the foes' turn, and `act`
  then returns false); the hero's block resets in `startTurn`, foes' block in
  `endTurn`; `nextId` is shared by foes and pops; a room joins `cleared` only when it is left (or
  a boss falls), so `cleared` drives which map paths are lit; a relic is owned at most once; at
  most `FLASK_SLOTS` flasks are held (a drop or purchase with full slots is refused); `depth` is
  between 0 and `bestDepth`.

Randomness and timing:

- `Math.random` is used in `makeMap` (once per act, in `newRun` and `descend`), in `shuffle` in
  `src/game/sim.ts`, which draws piles, reshuffles the discard and picks rewards (`pickSome`) and
  wares (cards, relics, then flasks), in `grantRelic`, `grantFlask` (after an elite or boss) and `temperRandom`, and in `nextIntent` after each foe acts. The test seeds it, so changing the number or order of these
  calls changes the map, hands, rewards and foe moves the test sees. Choosing the hero and the
  depth draws nothing.
- Art noise uses `seeded` from `src/art/pixelArt.ts`, not `Math.random`.
- All timing is game time from `tick`; there is no `Date.now`, `setTimeout` or Phaser timer in
  the rules. Tweens are only used to fade fallen foes.

Data tables (where to tune):

- Cards and the starter decks: `CARDS`, `STARTER_DECK` and `HUNTER_DECK` in `src/game/cards.ts`;
  the heroes' health and starting flask in `src/game/heroes.ts`; the power and curse numbers at the
  top of `cards.ts`.
- Flasks: `src/game/flasks.ts`. The depth rules: `src/game/depth.ts`.
- Foe health, gold and moves: `ENEMIES` in `src/game/enemies.ts` (health is the Normal value;
  `startFight` scales it by difficulty).
- Map shape and foes per act: `COLUMN_KINDS`, `ACT_FOES`, `ROWS` and `colX` in `src/game/map.ts`.
- Relics: `RELICS` in `src/game/relics.ts`; events: `EVENTS` and their constants in
  `src/game/events.ts`.
- `ENERGY`, `HAND_SIZE`, `REST_HEAL`, `MIN_DECK`, `REWARD_CHOICES`, `START_GOLD`,
  `CARD_PRICE`, `RELIC_PRICE`, `REMOVE_PRICE`, `SHOP_CARDS`, `SHOP_RELICS`, `SHOP_FLASKS`, `RELIC_GOLD`,
  `WEAK_MULT`, `VULNERABLE_MULT` and the `*_MS` timings: `src/game/state.ts`.
- Screen positions: `src/scenes/layout.ts`.

### Hub settings

- `src/main.ts` calls `setupGame(game)` from `shared/setupGame.ts`, which applies the frame cap, the FPS readout, reduced motion (camera shake and flash) and full screen.
- It then calls `setupScaling(game)` from `shared/scaling.ts`, which draws the canvas at the
  screen's resolution (`renderScale` canvas pixels per game pixel, every camera zoomed to match)
  and asks to turn a phone held upright. No camera scrolls, so nothing else changes: layout stays
  in the 960x540 `VIEW`, and taps go through Phaser's own hit tests. The art is painted at
  `renderScale` (see `art/paint.ts`). `e2e/screens.spec.ts` at the root checks the game on five
  screens.
- Difficulty scales one number: foe health. `startFight` in `src/game/sim.ts` sets each foe's `hp`
  and `maxHp` to `Math.round(ENEMIES[kind].hp * byDifficulty(0.75, 1, 1.3) * depthFoeHp(depth))`, so Easy 0.75x,
  Normal 1x, Hard 1.3x, times the depth's multiplier (1 at depth 0). Damage, block and the hero are not scaled.
- `settings.reduceMotion` also stops the hero's hit shake, the hero's red hit tint, the foes'
  white hit flash and the foes' idle bob in `GameScene.drawFight`, and holds the enterable rooms'
  gold ring pulse still (full brightness, no outer ring) in `GameScene.drawMap`.
- Keep Normal exactly as designed (multiplier 1): the playthrough runs on Normal, at depth 0 (a
  fresh browser has nothing saved), and expects the slime's 24 health.
- Keep the Catacomb row of the difficulty table in the root `README.md` (and the difficulty line
  in this game's `README.md`) in sync with the multipliers.
- The shared settings live under the `hub-settings` storage key, owned by `shared/settings.ts`;
  this game's own save is only `catacomb-best-depth`.

## Testing hooks

- `src/main.ts` sets `window.game` in dev builds only. The test reads
  `game.scene.getScene('Game')` and its `state`, `hand` and `rewards` (`CardSpot` lists with id
  and centre x/y). It never writes state.
- Inputs it drives: a tap on the Knight's button on the hero panel (`KNIGHT_BUTTON`, 480,324, the
  first of `EVENT_BUTTONS`), a tap on the first room (`FIRST_ROOM`, 110,290), taps on hand cards at the
  spots from `hand`, taps on End turn (`END_TURN`, 884,420) and a tap on the first reward card.
- Numbers mirrored in `e2e/playthrough.spec.ts` that must change with the game: the Knight's health (50), the Knight's
  starter deck counts, the costs, damage and block of Strike, Defend and Bash, the slime's health
  (24, on Normal at depth 0), gold (12) and `moves` (`SLIME` in the test), `START_GOLD` (0, with no relics and one
  flask), `ENERGY` (3), `HAND_SIZE` (5),
  `REWARD_CHOICES` (3, all different), the first room being a lone slime at `rooms[0]`, the run
  opening on the `hero` phase at depth 0, and the `KNIGHT_BUTTON`, `END_TURN` and `VIEW` positions. The test checks each slime turn against its shown `intent`,
  that it opens with its first move and that it never repeats a move twice in a row. The test also expects the slime to fall in under eight turns without killing the hero.
- The first round must stay free of statuses, relics, powers and curses: the slime's moves apply
  none and the Knight's starter cards apply none, so the test's damage sums hold. The test never
  drinks the starting flask.
- Field names the test reads: `phase` values, `hero`, `depth`, `flasks`, `hp`, `maxHp`, `deck`, `gold`, `relics`, `at`,
  `cleared`, `reward`,
  and in `fight`: `draw`, `hand`, `discard`, `energy`, `block`, `turn`, and each enemy's `kind`,
  `hp`, `block`, `step`, `intent`.
- Screenshots are saved as `playthrough-0-heroes` and `playthrough-0-map` through `playthrough-3-next-room` in
  `docs/screenshots/`; refresh them when the look of the first room changes. `map`, `boss`,
  `treasure`, `victory`, `campfire`, `campfire-temper`, `campfire-remove`, `shop`, `event`,
  `elite-fight`, `descend`, `act2-map`, `tombs-foes`, `hollow-queen`, `heroes`,
  `flasks-and-powers` and `curses` there are taken by hand
  (not by the test); refresh them too when the look changes. `cover.png` is a copy of `playthrough-1-fight`.

## Making common changes

- **Add a card:** add an entry to `CARDS` in `src/game/cards.ts` with a `rarity` (common or rare
  puts it in a reward pool) and an `up` (what tempering changes). A new `Icon` needs its grid in `CARD_ICONS` in `src/art/icons.ts`
  (it is painted on its own). A
  new kind of effect needs a field on `Card`, handling in `playCard` in `src/game/sim.ts` and a
  line in `describe`. Update the README's card table.
- **Add a power:** add its `PowerKind` and text (`POWER_TEXT`) in `cards.ts` and a card with
  `power` set, then its effect in `sim.ts`: a per-turn one in `startTurn`'s power loop, one that
  reacts elsewhere behind `hasPower`.
- **Add a curse:** add its `CurseKind` and text (`CURSE_TEXT`) in `cards.ts` and a card with
  `curse` set and `rarity: 'curse'`; what it does goes where it bites (`drawCards` for a draw
  effect, `costOf` for a cost one). Give it a source: an elite's `curse` move, an event or a depth.
- **Add a flask:** add it to `FlaskId` and `FLASKS` in `src/game/flasks.ts`, its colours to
  `FLASK_ICONS` in `src/art/icons.ts` and its effect to `useFlask` in `sim.ts`. Update the
  README's flask table.
- **Add a hero:** add it to `HeroId` and `HEROES` in `src/game/heroes.ts` (its deck in `cards.ts`),
  draw its `Figure` in `src/art/characters.ts` and add it to `HERO_FIGURES`; the hero panel has
  room for two buttons and two figures (`HERO_PANEL`), so a third needs a new layout.
- **Add a depth rule:** add its line to `DEPTH_RULES` in `src/game/depth.ts` and apply it in
  `sim.ts` by `s.depth` (foe health in `startFight`, rests in `restShare`, the start of a run in
  `chooseHero`). Update the README's depth table.
- **Add a foe:** add the kind to `EnemyKind` and `ENEMIES` in `src/game/enemies.ts` and its grid to
  `FOES` in `src/art/characters.ts` (typed by `EnemyKind`, so the build fails until you do), then
  add it to a foe group (`early`, `late` or `elites`) of an act in `ACT_FOES` in `src/game/map.ts`. Up to three foes fit (`FOE_XS` in `src/scenes/layout.ts`).
- **Change a foe's moves:** edit its `moves` in `ENEMIES`; the first is always its opening move.
  The slime's moves are mirrored in the test.
- **Add a new intent kind:** extend `Intent` in `src/game/enemies.ts`, handle it in `act` in
  `src/game/sim.ts`, add a texture in `INTENTS` in `src/art/icons.ts` (named `intent-<kind>`), and
  its text and colour in `GameScene.drawIntent` (the `curse` kind shows the curse's name).
- **Change the map:** edit `COLUMN_KINDS` or `makeMap` in `src/game/map.ts`; `x`/`y` are screen
  positions. Keep `next` pointing at the following column, keep `COLUMNS` matching the columns
  made (the top bar and the defeat text read it), keep every room reachable, and keep act one's
  `rooms[0]` a lone slime at 110,290 or update the test. Draw only
  with `Math.random`, so the seeded test sees the same map each run.
- **Change the look:** draw on a canvas from `sketch` and pass it through `paint`; bigger
  `sizes` give looser strokes. Show the texture with `artImage`, never `this.add.image`, and read
  an image's size from `displayWidth`/`displayHeight`, since the texture is `res` times bigger. Shapes drawn at twice the size (like `KNIGHT`) paint better than
  pixel grids.
- **Add a room kind:** extend `RoomKind`, handle it in `enterRoom` in `src/game/sim.ts`, add a
  room icon in `src/art/icons.ts`, put it in `COLUMN_KINDS`, and handle its view in
  `GameScene.update` (`onMap`), `drawPanel` or `drawReward`, and its name in `drawHud`.
- **Add a relic:** add it to `RelicId` and `RELICS` in `src/game/relics.ts`, its icon to
  `RELIC_ICONS` in `src/art/icons.ts`, and its effect where it applies in `src/game/sim.ts`
  behind `hasRelic`. Update the README's relic table.
- **Add an event:** add it to `EventId` and `EVENTS` in `src/game/events.ts` and its two choices
  to `chooseEvent` (and any health cost to `canChoose`) in `src/game/sim.ts`.
- **Add a status:** extend `StatusKind`, `noStatus`, `STATUS_NAMES` in `sim.ts`, its effect in
  `heroHit`/`foeHit`, `act` or `endRound`, its icon in `STATUSES` and its colour in
  `STATUS_COLORS` in `GameScene.ts`.
- **Add an act:** add an entry to `ACT_FOES`, raise `ACTS`, add the backdrops in
  `bakeScenery`, and give the descent panel and victory title in `GameScene.drawPanel` the right
  boss names.

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
- The treasure room and the altar reuse the `reward` phase with `fight` null; `GameScene.update`
  and `drawReward` tell them apart by `s.rooms[s.at].kind`. A fight's reward also has `fight`
  null (`winFight` drops it), and is shown over the fight backdrop.
- Entering a campfire no longer heals; `rest` does, and `temperCard` and `removeCard` leave
  without healing. They, `leaveShop` and `chooseEvent` call `leaveRoom`, which marks the room
  cleared.
- Tempered cards are separate ids (`strike+`), so the deck and the pickers count them apart from
  plain copies; `card(id)` is the only place that applies `up`.
- A foe killed by its own poison is spliced out during the foes' turn, so `tick` only moves
  `acted` on when `act` returns true.
- `descend` swaps `state.rooms` for a new array; `GameScene.buildRooms` compares by reference to
  rebuild the room icons and switch the backdrops.
- Card text is dark ink on parchment; keep new card text dark, and light text on the header. A
  card's rules have about three lines of 13px text in 104px before they run off the face, so keep
  power and curse texts short.
- `newRun` reads `localStorage` (through `loadBestDepth`); the sim stays free of Phaser but not of
  the browser. Both save helpers swallow storage errors.
- The hero panel reuses the mystery room's two `choiceButtons` and the panel's `panelText`, which
  it narrows (`setWordWrapWidth(300)`) and moves; `drawPanel` restores both for the other panels.
- The tip under the top bar is shared by relics, flasks and powers (`showTip(text)`).
- `scene.restart()` reruns `create`, which resets the run, but `clock` and `lastFrame` carry over.
- `this.scale.width/height` and `pointer.x/y` are canvas pixels, `renderScale` times the view;
  lay out with `VIEW` (or `viewSize(this)`), and read pointers through `viewPoint` or
  `pointer.worldX/Y`. A camera that scrolls or zooms needs `scrollingCamera` and `renderScale`
  (see the root `AGENTS.md`).
- Never use a red cross in any art (root `AGENTS.md`); healing pops are already green.
