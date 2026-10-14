# Anvilheart: guide for agents

How Anvilheart is built and where things stand, for agents about to change it. `README.md` covers
how to play and lists the swords and upgrades. Keep this file up to date with any change to the
game, as the root `AGENTS.md` asks.

## Current state

Anvilheart is a merge game in a smithy, drawn as a stained-glass window. A forge puts Rusty
Daggers onto a 4x4 board of anvils, two swords of the same tier merge into the next tier (eight
tiers), and adventurers at a counter of three desks buy swords at least as good as the one they ask
for. Coins buy three upgrades; a royal commission sets a long goal on top.

Implemented today:

- The full loop: forge with a heat-up cooldown, drag to move, swap or merge, drag onto an
  adventurer to sell, adventurers arriving on a timer and leaving when their patience runs out.
- Exact-fit pricing (`payFor` in `src/game/state.ts`): the exact sword asked for pays its price
  plus `EXACT_TIP` (50%, rounded down); a better sword pays only the asked-for sword's price. While
  a sword is held, every desk that would buy it shows a tag ("Exact fit +50%" with the tipped
  price, or "Overkill" with "pays Nc").
- Hammer streak: a merge within `STREAK_MS` (4s) of the last chains (`streak`, `streakMs`,
  `streakSlot`); from the second merge on it pays `STREAK_COINS * streak` (5 per step) and pushes a
  `streak` event (burst, sparks and a "Hammer streak ×N +Nc" tag). A timer ring round the last
  merge's anvil drains while `streakMs > 0`.
- Royal commission (`src/game/commissions.ts`): a banner in the top bar names the sword wanted
  (`commissionAt(level)`: Golden Claymore 500c, Runeblade 1200c, Dragonslayer 3000c, then 2, 3...
  Dragonslayers at 3000c each). A merge producing that tier counts towards it (`commission.made`);
  when `made` reaches `count`, it pays the reward and a guild star (`stars`), pushes a
  `commission` event and moves to the next level. For one-sword commissions the banner's progress
  counts the swords of the tier below on the board, capped at 2; for the multi-sword ones it shows
  `made`/`count`. Guild stars show left of "Sold" in the top bar once there is one.
- Progression: `bestTier` raises the tier adventurers may ask for; upgrades Bellows (faster forge),
  Fine Ore (five ranks of 20% chance the forge makes a tier 2 sword, so rank 5 always does) and,
  last, Auto Forge (one rank, locked until Bellows is maxed; Fine Ore is not needed): the forge then
  makes a sword by itself whenever it is hot and an anvil is free, so the player only merges and
  sells. Once bought, its button switches it on and off (`autoForge`).
- One screen (`GameScene`) with a HUD and commission banner, drag highlights (glowing gold and
  green glass frames), jewel patience and heat bars, a row of discovered swords under the board
  (one frame per tier, showing the sword's picture only, no name, once `bestTier` has reached it;
  a question mark before), and a "New smithy" reset link in the bottom right corner.
- Persistence of the board, coins, swords sold, best tier, upgrade ranks, the Auto Forge switch,
  the standing commission and guild stars in `localStorage`.

Missing or rough:

- No title or win screen and no in-game settings (they are on the hub page), no sound. The
  commissions never end (ever more Dragonslayers). Two Dragonslayers dropped on each other just swap.
- Adventurers who walk off cost nothing; `walkedOff` is counted but only shown as floating text,
  and it is not saved.
- "New smithy" resets at once with no confirmation, and the saved key is only rewritten on the
  next action.
- Saved `coins`, `sold`, `bestTier` and `ranks` are trusted as loaded; only `slots`, `commission`
  and `stars` are checked (in `newShop`).
- A commission sword made by a merge stays on the board; there is no delivering it to the crown.
- The banner text is small (8 to 13px) to fit the top bar.
- `Visitor.adventurer` in `GameScene` is stored but never read.

## Architecture

File map (`src/`):

- `main.ts`: creates the `Phaser.Game` (960x540, `Scale.FIT`, `pixelArt: false`) with `BootScene` and
  `GameScene`, calls `setupGame(game)`, and exposes `game` on window in dev builds.
- `game/state.ts`: types (`GameState`, `Adventurer`, `GameEvent`, `Progress`, `Fit`), board,
  timing, tip and streak constants (`EXACT_TIP`, `STREAK_MS`, `STREAK_COINS`, `LOOKS`),
  `freshProgress`, `newShop`, `progressOf`, the sale price rule `fitOf` and `payFor`, and the
  upgrade formulas `forgeMs`, `oreChance` and `autoForging`.
- `game/sim.ts`: the rules as pure functions on `GameState`: `tick`, `forge`, `drop`, `sell`,
  `buy`, `toggleAutoForge`, plus the private `arrive`, `hammer` (streaks) and `commissioned`.
- `game/commissions.ts`: `Commission` and `commissionAt(level)`, the royal commission table.
- `game/swords.ts`: the `SWORDS` table (name, price per tier), `MAX_TIER`, `swordOf`.
- `game/upgrades.ts`: the `UPGRADES` table (name, blurb, price per rank, and `after`: the upgrades
  that must be maxed first), `UPGRADE_IDS`, `nextPrice`, `locked`.
- `game/save.ts`: `loadProgress`, `saveProgress`, `clearProgress`.
- `scenes/BootScene.ts`: bakes all textures, then starts `Game`.
- `scenes/GameScene.ts`: draws the smithy, turns pointer input into sim calls, animates events,
  saves, and offers `spots()` for the test.
- `scenes/layout.ts`: every screen position (`VIEW`, `FURNACE_WINDOW`, `FORGE_BUTTON`,
  `HEAT_BAR`, `BANNER`, `UPGRADE_BUTTONS`, `BOARD`, `DISCOVERED` with `discoveredCentre`, `DESK`,
  and inside a desk `ORDER`, `PATIENCE` and `TAG`), the `FONT` stack (Georgia, serif) and hit tests
  `slotAt` and `deskAt`.
- `ui/Button.ts`: a leaded-glass caption button (style `forge` or `upgrade`, textures from
  `bakeUi`) that fires on `pointerdown` and can be disabled.
- `art/glass.ts`: the painting kit: `bake` (paints a canvas in art units, twice the view's, and
  adds it with `textures.addCanvas`), `glass` (a gradient, mottled piece in lead), `panel`,
  `glowFrame`, `glow`, `paint`, `label`, shape helpers and the seeded `rnd`.
  `art/scenery.ts`: `background` (Voronoi mosaic wall, furnace stones, board panes, anvils, counter
  frames, top bar) and `furnace-0/1`. `art/swords.ts`: `sword-<tier>`, `drawSword`, `swordScale`.
  `art/characters.ts`: `adventurer-<look>` (lancet window with a knight, ranger, viking or mage).
  `art/ui.ts`: button, emblem, order card, fit tag, streak tag, banner, pip, star, frame, discovered
  frame, burst, spark and halo textures.

Shared code the game imports (repo root, outside `src/`): `shared/setupGame.ts` (`setupGame`) and
`shared/settings.ts` (`settings`, `byDifficulty`). See "Hub settings" below.

How it runs:

- Boot: `BootScene.create` calls `bakeScenery`, `bakeSwords`, `bakeAdventurers` and `bakeUi`,
  which paint stained glass on 2D canvases (in art units, scaled by a half so each texture is at
  the view's size) and add them with `textures.addCanvas`. There are no asset files. The
  background's mosaic is computed pixel by pixel once at boot.
- Tick: `GameScene.update(time)` takes `dt` from the frame timestamp (clamped to `MAX_STEP_MS`,
  250ms), adds it to `clock`, and calls `tick(state, dt)`, which cools the forge, forges when
  `autoForging`, drains the hammer streak and patience and brings adventurers. If that pushed a `forged` event the scene
  saves. Then it draws.
- Input: scene `pointerdown` picks up a sword (`pickUp`), `pointermove` moves the held sprite,
  `pointerup` calls `putDown`, which calls `drop` if over an anvil or `sell` if over a desk with an
  adventurer. `gameout` puts the sword back. Forge and upgrade buttons call `forge` and `buy`; a
  bought Auto Forge's button calls `toggleAutoForge` instead. Each successful action calls `save()`.
- Rendering is mixed. Sword sprites (`swords[]`, one per slot) and visitor containers (`visitors`,
  keyed by adventurer id, each with its hidden fit `tag`) are diffed against state. The `marks`
  and `hud` graphics are cleared and redrawn every frame (patience segments and the streak ring in
  `marks`, the heat bar in `hud`). `drawMarks` also shows and pulses the pre-made `mergeFrames`
  (one per slot) and `buyerFrames` (one per desk), and fills in each buyer's tag. The discovered
  row's frames and sword images are made once in `createDiscovered`; `drawHud` lights each whose
  tier is at most `bestTier`, sets the top bar texts and fills the commission `banner`. The
  "adventurer on the way" hint sits in the empty first desk. Sim functions push `GameEvent`s onto
  `state.events`; `drawEvents` drains them for pop, halo, burst and spark, banner and floating
  text tweens.

State model (`src/game/state.ts`):

- `GameState.slots` is `SLOTS` (16) entries, each a sword tier (1 to `MAX_TIER`) or `null`,
  numbered row by row from the top left. Swords are only ever stored as tier numbers.
- `adventurers` holds at most `DESKS` (3); each has a unique `desk`, `wants` (minimum tier),
  `patienceMs` counting down from `patience`, and `look` (0 to `LOOKS - 1`).
- `streak` is the number of merges in the current hammer streak (0 when none), `streakSlot` the
  anvil of the last one, and `streakMs` the time left to chain; `tick` drains it and zeroes
  `streak` when it runs out.
- `commission` is `{ level, made }`: which `commissionAt` stands and how many of its sword were
  merged since it began. `stars` counts commissions completed.
- `heatMs` is 0 when the forge is ready; buying a Bellows rank caps it at the new `forgeMs`. `nextVisitorMs` only counts down while a desk is free.
- `autoForge` is the Auto Forge's on/off switch; it only matters once `ranks.auto` is 1. `buy`
  turns it on when the Auto Forge is bought. `buy` refuses an upgrade while `locked` says one of
  its `after` upgrades still has ranks left.
- `orders` counts adventurers who arrived; when it is 0 the next one wants `FIRST_ORDER`. `newShop`
  sets it to `progress.sold`, so a returning player who has sold gets random orders at once.
- Only `src/game/sim.ts` changes rules state; the scene replaces `state` wholesale only on load and
  on "New smithy". `bestTier` is raised by `forge` and `drop` and never falls. Coins come from
`sell` (`payFor`), streak bonuses and commission rewards in `drop`, and go on `buy`.

Persistence: one key of its own, `anvilheart-progress`, holding `Progress` as JSON (`coins`,
`slots`, `sold`, `bestTier`, `ranks`, `autoForge`, `commission`, `stars`). Adventurers, heat, the
streak and timers are not saved. `loadProgress` merges over `freshProgress()`, so a new upgrade id
in `ranks` loads as rank 0, `autoForge` as false and an old save starts on the first commission
with no stars.

Randomness and timing:

- `Math.random` is only used in `src/game/sim.ts`: twice per `arrive` (order tier, skipped for the
  first order, and look) and once per `forge` call (the Fine Ore roll, made even at rank 0),
  including the forges the Auto Forge makes in `tick`.
- Art uses the seeded `rnd()` from `src/art/glass.ts`, not `Math.random`.
- The streak and commission add no randomness.
- Game time comes only from the `time` Phaser passes to `update`; tweens use Phaser's clock.

Data tables: sword names and prices in `src/game/swords.ts`; upgrade prices and blurbs in
`src/game/upgrades.ts`, with their effects in `forgeMs`, `oreChance` and `autoForging` in
`src/game/state.ts`;
forge time, visitor timing, patience, `FIRST_ORDER`, `EXACT_TIP`, `STREAK_MS`, `STREAK_COINS`,
board size and desk count in `src/game/state.ts`; commissions in `src/game/commissions.ts`; the
order range (`Math.max(3, bestTier + 1)`) and the difficulty multiplier on
patience in `arrive`.

### Hub settings

- `src/main.ts` calls `setupGame(game)` from `shared/setupGame.ts` right after creating the game.
  It applies the frame cap, the FPS readout, reduced motion and full screen (camera shake and flash become
  no-ops; this game uses neither).
- Difficulty scales one number: adventurer patience. `arrive` in `src/game/sim.ts` multiplies
  `PATIENCE_MS + PATIENCE_PER_TIER_MS * wants` by `byDifficulty(1.5, 1, 0.7)` (easy, normal, hard)
  from `shared/settings.ts`. The base constants in `src/game/state.ts` are unchanged.
- Reduced motion: `GameScene.drawEvents` skips the halo flash on a merge when
  `settings.reduceMotion` is on. With it on, `drawMarks` also holds the pulsing frames on the
  matching swords and desks at full alpha, `drawForge` holds the furnace on its `furnace-0` frame
  instead of flickering, `hammerStreak` shows the burst still and fading with no flying sparks,
  and `commissionDone` does not pulse the banner. The pop tween on the merged sword, the draining
  streak ring and the floating texts still play.
- Normal must stay exactly as designed, since the playthrough runs on Normal.
- Keep the README's difficulty line in sync ("adventurers wait 50% longer on Easy and 30% less on
  Hard"), and the game's row in the root README's difficulty table.
- The settings are read once at load from the `hub-settings` storage key, which the hub owns. They
  are not part of `anvilheart-progress`, and "New smithy" does not touch them.

## Testing hooks

- `src/main.ts` puts `game` (the `Phaser.Game`) on window in dev builds only.
- `e2e/playthrough.spec.ts` reads `game.scene.getScene('Game')`: its `state` (copied without
  `events`, including `commission`, `stars`, `streak`, `streakSlot` and `streakMs`) and `spots()`, which returns the Forge button centre, each anvil's sword position
  (`slotCentre` minus `SWORD_LIFT`) and each `deskCentre`. Positions therefore follow `layout.ts`.
- Inputs: mouse clicks on Forge and mouse drags (down, eight moves, up) from anvil to anvil and
  anvil to desk, mapped from the 960x540 view to the scaled canvas.
- The test mirrors these values; change them together: `VIEW` (960x540), `FIRST_ORDER` (2), the
  Iron Shortsword price (10), the 50% exact-fit tip (`EXACT_TIP`, so the sale pays 15) and
  `STREAK_MS` (4000). It also expects: a fresh `commission` of `{ level: 0, made: 0 }`, no stars
  and no streak; the first adventurer within 5s at desk 0; a forged dagger on slot 0 and then
  slot 1 (so `forge` fills the first empty slot and makes tier 1 at Fine Ore rank 0);
  `heatMs > 0` after one forge and still above 0 one 192ms step later; heat back to 0 within 5s;
  a merge landing on the target slot that starts a streak of 1 on that slot with no bonus coins;
  `coins` (15), `sold`, `walkedOff` exact after the sale; and the streak back to 0 within
  `STREAK_MS` + 1s with coins and the commission unchanged. It fails on any page error.
- Its screenshots are `0-forged`, `1-dragging`, `2-merged`, `3-exact-fit` (the sale drag midway,
  showing the tag) and `4-sold`; copy them to `docs/screenshots/playthrough-*.png`.
- It seeds `Math.random`, so adding or reordering random calls changes orders and looks but must
  not change the first round.

## Making common changes

- Add a sword tier: append to `SWORDS` in `src/game/swords.ts` and an entry to both `SHAPES` and
  `COLOURS` in `src/art/swords.ts` (one per tier, or `bakeSwords` crashes). The tier 8 sword nearly
  fills its 100px texture, so a longer one needs a bigger `SWORD_SIZE`. Check the commissions
  past the Dragonslayer in `commissionAt`, which use `MAX_TIER`.
- Add or retune a commission: edit `FIRST` (or the formula after it) in
  `src/game/commissions.ts`. A commission's `tier` should be at least 2, since the banner names the
  tier below it.
- Add an upgrade: add the id to `UpgradeId` and `UPGRADES` in `src/game/upgrades.ts` (with `after`
  if it waits for others), its rank 0 in `freshProgress` in `src/game/state.ts`, its effect where
  the rule lives (a helper like `forgeMs`), and a y in `UPGRADE_BUTTONS.ys` in
  `src/scenes/layout.ts`. The three buttons already fill the left column down to the bottom edge,
  so a fourth needs a new place or smaller buttons.
- Retune timing or prices: edit the constants above. Check the test still holds (first visitor
  within 5s, forge time above 192ms and under 5s, Shortsword price matching `SHORTSWORD_PRICE`).
- Add an adventurer look: raise `LOOKS` in `src/game/state.ts` and add a branch to `figure` in
  `src/art/characters.ts`.
- Add an effect for a new rule: push a new `GameEvent` kind from `src/game/sim.ts` and handle it
  in `GameScene.drawEvents`.
- Change the art: all textures are painted in `src/art/`, in art units (twice the view's pixels).
  Positions inside the background follow `layout.ts` through `a(n)`; a texture that must line up
  with a layout box (the order card, tags, frames) takes its size from `layout.ts` too.

## Gotchas

- `drawHud` clears the `hud` graphics and `drawForge` then paints the heat bar into it, so
  `drawForge` must run after `drawHud` in `update`.
- `HEAT_BAR.x` is hand-matched to `FORGE_BUTTON` (130 - 90); move them together.
- Button textures are baked per style at the sizes `BootScene` passes to `bakeUi`
  (`FORGE_BUTTON`, `UPGRADE_BUTTONS`); a button of a new size needs a new style.
- The furnace window's flames are their own texture over the background's arch, positioned by
  `FURNACE_WINDOW`; the arch's art-unit coordinates in `scenery.ts` are hand-matched to it.
- The top bar's right-hand texts are laid out right to left each frame (best sword, sold, stars),
  so a long sword name pushes them left towards the banner.
- `deskAt` and `slotAt` hit whole cells and boxes, while sprites sit `SWORD_LIFT` above an anvil's
  centre; the test's slot spots include that lift.
- `drop` onto a different-tier sword swaps rather than failing, and returns true, so it saves.
- Dropping on a desk with nobody there does nothing; the sword returns to its slot.
- Visitor containers are built once in `makeVisitor` and never refreshed; anything about an
  adventurer that changes over time must be drawn in `drawMarks` (like the patience bar and the
  fit tag).
- The streak bonus and the commission reward are paid inside `drop`, so a merge's coins land
  before the scene draws; `sold` events carry the `fit` for the floating text.
- The discovered row reads `bestTier`, so it shows every tier up to the best one made, even a
  tier the Fine Ore skipped. It fills the space between the board and the bottom edge; the
  one-line instructions sit between it and the board.
- The one-sword commissions' progress is read from the board each frame, not stored, so selling a
  Silver Saber takes the banner from 2/2 back to 1/2.
- All browser storage must stay prefixed `anvilheart-`, since every game shares the hub's origin.
