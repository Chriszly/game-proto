# Anvilheart: guide for agents

How Anvilheart is built and where things stand, for agents about to change it. `README.md` covers
how to play and lists the swords and upgrades. Keep this file up to date with any change to the
game, as the root `AGENTS.md` asks.

## Current state

Anvilheart is a merge game in a smithy, drawn as a stained-glass window. A forge puts Rusty
Daggers onto a 5x4 board of anvils (the fifth column locked until bought), two swords of the same
tier merge into the next tier (nine tiers, the last the Anvilheart), and adventurers at a counter of
three desks buy swords at least as good as the one they ask for. Coins buy three upgrades, a quench
barrel and the fifth column; royal commissions, delivered to the crown, end in a win.

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
- Royal commissions (`src/game/commissions.ts`): a banner in the top bar names the sword wanted
  (`COMMISSIONS`, read by `commissionAt(level)`: Golden Claymore 500c, Runeblade 1200c,
  Dragonslayer 3000c, two Dragonslayers 6000c, then the Crown Blade, an Anvilheart, 10000c and
  `final`). The player delivers a sword by dragging it onto the banner (`deliver` in `sim.ts`,
  hit test `onBanner` in `layout.ts`): it leaves the board and counts towards `commission.made`
  (a `delivered` event flies it into the banner); when `made` reaches `count`, it pays the reward
  and a guild star (`stars`), pushes a `commission` event and moves to the next level. Delivering
  the `final` one sets `won` and pushes `crowned`, which shows the Royal Smith panel (`WIN_PANEL`,
  "Keep smithing" hides it); `commissionAt` then returns null and the banner reads "Royal Smith,
  Every commission done". The banner's progress counts the swords of the tier below on the board,
  capped at 2, or `made`/`count` for two Dragonslayers, and reads "Ready! Drag it here" once a
  wanted sword is on the board; `bannerFrame` glows while such a sword is held. Guild stars show
  left of "Sold" in the top bar once there is one.
- The Anvilheart: tier 9 (`MAX_TIER`), merged from two Dragonslayers, worth 4000c. Adventurers ask
  for at most `MAX_ORDER` (8), so it is only for the Crown Blade (or an overkill sale).
- Gems: once `bestTier` reaches `GEMS_FROM` (4, `gemsOpen`), each forge rolls `GEM_CHANCE` (10%)
  to make a gem instead, stored in `slots` as `GEM` (0). Dragging a gem onto a sword without one
  sets it (`gemmed[slot]`, a `set` event); merging keeps a gem from either sword; a gem never
  merges. Each adventurer then rolls `GEM_ORDER_CHANCE` (25%) to want a gemmed sword
  (`Adventurer.gem`): they only buy one with a gem and pay `GEM_PAY` (2) times `payFor`
  (`offerFor`). Their card shows the doubled base price and a gem; the fit tag reads "Gemmed ×2".
  Gemmed swords show a small gem (`badges`) at the hilt.
- Renown (`renown`, 0 to 100, `RENOWN_START` 50): an exact sale adds `RENOWN_EXACT` (4), another
  sale `RENOWN_OVERKILL` (1), a walk-off `RENOWN_WALKED_OFF` (-10). `visitorFactor` scales the
  time to the next adventurer (1.25 at 0, 1 at 50, 0.75 at 100) and `patienceFactor` their
  patience (0.8 to 1.2). `renownBand` names it (Shunned, Doubted, Trusted, Renowned) for the meter
  of ten panes (`RENOWN_BAR`) at the right of the top bar, which replaced the best sword's name.
- Quench barrel and fifth column: `slots` holds `ANVILS` (20) anvils and then `BARREL` (index 20).
  `slotOpen` says which can hold a sword: the first `OPEN_COLS` (4) columns, the fifth once
  `ranks.anvils` is 1, the barrel once `ranks.barrel` is 1. Locked spots show a padlock pane and a
  price (`locks`); tapping one calls `buy`. `forge` uses `freeAnvil`, which never picks the barrel.
- Progression: `bestTier` raises the tier adventurers may ask for; upgrades Bellows (faster forge),
  Fine Ore (five ranks of 20% chance the forge makes a tier 2 sword, so rank 5 always does) and,
  last, Auto Forge (one rank, locked until Bellows is maxed; Fine Ore is not needed): the forge then
  makes a sword by itself whenever it is hot and an anvil is free, so the player only merges and
  sells. Once bought, its button switches it on and off (`autoForge`).
- One screen (`GameScene`) with a HUD and commission banner, drag highlights (glowing gold and
  green glass frames: a held gem lights the swords it can be set in), jewel patience and heat bars,
  a row of discovered swords under the board
  (one frame per tier, showing the sword's picture only, no name, once `bestTier` has reached it;
  a question mark before), and a "New smithy" reset link in the bottom right corner.
- Persistence of the board and its gems, coins, swords sold, best tier, upgrade ranks, the Auto
  Forge switch, the standing commission, guild stars, renown and `won` in `localStorage`.

Missing or rough:

- No title screen and no in-game settings (they are on the hub page), no sound. Two Anvilhearts
  dropped on each other just swap, as do two gems.
- `walkedOff` is counted (and costs renown) but only shown as floating text, and it is not saved.
- "New smithy" resets at once with no confirmation, and the saved key is only rewritten on the
  next action.
- Saved `coins`, `sold`, `bestTier` and `ranks` are trusted as loaded; only `slots`, `gemmed`,
  `commission`, `stars`, `renown` and `won` are checked (in `newShop`).
- The banner text is small (8 to 13px) to fit the top bar.
- While the Royal Smith panel shows, the board ignores taps; the counter and buttons do not.

## Architecture

File map (`src/`):

- `main.ts`: creates the `Phaser.Game` (960x540, `Scale.FIT`, `pixelArt: false`) with `BootScene` and
  `GameScene`, calls `setupGame(game)`, and exposes `game` on window in dev builds.
- `game/state.ts`: types (`GameState`, `Adventurer`, `GameEvent`, `Progress`, `Fit`), board
  (`GRID`, `ANVILS`, `OPEN_COLS`, `BARREL`, `SLOTS`), timing, tip and streak constants
  (`EXACT_TIP`, `STREAK_MS`, `STREAK_COINS`, `LOOKS`), renown (`RENOWN_*`, `renownBand`,
  `visitorFactor`, `patienceFactor`), gems (`GEMS_FROM`, `GEM_CHANCE`, `GEM_ORDER_CHANCE`,
  `GEM_PAY`, `gemsOpen`), `freshProgress`, `newShop` (with the move of old 16-anvil saves),
  `progressOf`, `slotOpen`, `freeAnvil`, the sale price rules `fitOf`, `payFor` and `offerFor`,
  and the upgrade formulas `forgeMs`, `oreChance` and `autoForging`.
- `game/sim.ts`: the rules as pure functions on `GameState`: `tick`, `forge`, `drop` (moves,
  merges, sets gems, swaps), `deliver`, `wanted`, `sell`, `buy`, `toggleAutoForge`, plus the
  private `arrive`, `renown` and `hammer` (streaks).
- `game/commissions.ts`: `Commission`, the `COMMISSIONS` table and `commissionAt(level)` (null
  once they are all done).
- `game/swords.ts`: the `SWORDS` table (name, price per tier), `MAX_TIER`, `MAX_ORDER`, `GEM`,
  `swordOf`.
- `game/upgrades.ts`: the `UPGRADES` table (name, blurb, price per rank, and `after`: the upgrades
  that must be maxed first), `UPGRADE_IDS`, `BUTTON_UPGRADES` (the three with buttons; `barrel` and
  `anvils` are bought by tapping their locked spot), `nextPrice`, `locked`.
- `game/save.ts`: `loadProgress`, `saveProgress`, `clearProgress`.
- `scenes/BootScene.ts`: bakes all textures, then starts `Game`.
- `scenes/GameScene.ts`: draws the smithy, turns pointer input into sim calls, animates events,
  saves, and offers `spots()` for the test.
- `scenes/layout.ts`: every screen position (`VIEW`, `FURNACE_WINDOW`, `FORGE_BUTTON`,
  `HEAT_BAR`, `RENOWN_BAR`, `BANNER`, `UPGRADE_BUTTONS`, `BOARD` (86px cells), `BARREL_SPOT`,
  `HINT_SPOT`, `DISCOVERED` with `discoveredCentre`, `DESK`, inside a desk `ORDER`, `PATIENCE` and
  `TAG`, and `WIN_PANEL`), the `FONT` stack (Georgia, serif) and hit tests `slotAt` (anvils and the
  barrel), `onBanner` and `deskAt`.
- `ui/Button.ts`: a leaded-glass caption button (style `forge` or `upgrade`, textures from
  `bakeUi`) that fires on `pointerdown` and can be disabled.
- `art/glass.ts`: the painting kit: `bake` (paints a canvas in art units, twice the view's, and
  adds it with `textures.addCanvas`), `glass` (a gradient, mottled piece in lead), `panel`,
  `glowFrame`, `glow`, `paint`, `label`, shape helpers and the seeded `rnd`.
  `art/scenery.ts`: `background` (Voronoi mosaic wall, furnace stones, board panes, anvils scaled
  to the cell, counter frames, top bar) and `furnace-0/1`. `art/swords.ts`: `sword-<tier>`,
  `drawSword` (the Anvilheart's molten core and amber heart), `drawGem`, `swordScale`.
  `art/characters.ts`: `adventurer-<look>` (lancet window with a knight, ranger, viking or mage).
  `art/ui.ts`: button, emblem, order card, fit tag, streak tag, banner, pip, star, frame, discovered
  frame, burst, spark, halo, `gem`, `gem-badge`, `frame-banner`, `barrel`, `lock-cell` and
  `win-panel` textures.

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
- Input: scene `pointerdown` picks up a sword or gem (`pickUp`), or on a locked spot calls `unlock`
  (which buys it or floats its price); `pointermove` moves the held sprite, `pointerup` calls
  `putDown`, which calls `drop` if over an anvil or the barrel, `sell` if over a desk with an
  adventurer, or `deliver` if over the banner. `gameout` puts the sword back. Forge and upgrade buttons call `forge` and `buy`; a
  bought Auto Forge's button calls `toggleAutoForge` instead. Each successful action calls `save()`.
- Rendering is mixed. Sword sprites (`swords[]`, one per slot, scaled by `SWORD_FIT` to the 86px
  cells), gem `badges[]` and the `locks` are diffed against state in `drawSwords`, and visitor
  containers (`visitors`, keyed by adventurer id, each with its hidden fit `tag`) in
  `drawVisitors`. The `marks`
  and `hud` graphics are cleared and redrawn every frame (patience segments and the streak ring in
  `marks`, the heat bar in `hud`). `drawMarks` also shows and pulses the pre-made `mergeFrames`
  (one per slot) and `buyerFrames` (one per desk), and fills in each buyer's tag. The discovered
  row's frames and sword images are made once in `createDiscovered`; `drawHud` lights each whose
  tier is at most `bestTier`, sets the top bar texts and fills the commission `banner`. The
  "adventurer on the way" hint sits in the empty first desk. Sim functions push `GameEvent`s onto
  `state.events`; `drawEvents` drains them for pop, halo, burst and spark, banner and floating
  text tweens.

State model (`src/game/state.ts`):

- `GameState.slots` is `SLOTS` (21) entries: the 20 anvils numbered row by row from the top left
  (five to a row), then the barrel. Each is a sword tier (1 to `MAX_TIER`), `GEM` (0) or `null`.
  `gemmed` runs alongside it; `drop`, `sell` and `deliver` move or clear both together.
- `adventurers` holds at most `DESKS` (3); each has a unique `desk`, `wants` (minimum tier),
  `gem` (wants a gemmed sword), `patienceMs` counting down from `patience`, and `look` (0 to
  `LOOKS - 1`).
- `renown` is 0 to 100, changed only by `sell` and walk-offs in `tick`. `won` is set by `deliver`.
- `streak` is the number of merges in the current hammer streak (0 when none), `streakSlot` the
  anvil of the last one, and `streakMs` the time left to chain; `tick` drains it and zeroes
  `streak` when it runs out.
- `commission` is `{ level, made }`: which `commissionAt` stands and how many of its sword were
  delivered since it began. `stars` counts commissions completed.
- `heatMs` is 0 when the forge is ready; buying a Bellows rank caps it at the new `forgeMs`. `nextVisitorMs` only counts down while a desk is free.
- `autoForge` is the Auto Forge's on/off switch; it only matters once `ranks.auto` is 1. `buy`
  turns it on when the Auto Forge is bought. `buy` refuses an upgrade while `locked` says one of
  its `after` upgrades still has ranks left.
- `orders` counts adventurers who arrived; when it is 0 the next one wants `FIRST_ORDER`. `newShop`
  sets it to `progress.sold`, so a returning player who has sold gets random orders at once.
- Only `src/game/sim.ts` changes rules state; the scene replaces `state` wholesale only on load and
  on "New smithy". `bestTier` is raised by `forge` and `drop` and never falls. Coins come from
`sell` (`offerFor`), streak bonuses in `drop` and commission rewards in `deliver`, and go on `buy`.

Persistence: one key of its own, `anvilheart-progress`, holding `Progress` as JSON (`coins`,
`slots`, `gemmed`, `sold`, `bestTier`, `ranks`, `autoForge`, `commission`, `stars`, `renown`,
`won`). Adventurers, heat, the streak and timers are not saved. `loadProgress` merges over
`freshProgress()`, so a new upgrade id in `ranks` loads as rank 0, `autoForge` as false, renown as
50 and an old save starts on the first commission with no stars. `newShop` moves a 16-anvil save
(four to a row) to the same rows and columns of the 5x4 board, and drops anything out of range.

Randomness and timing:

- `Math.random` is only used in `src/game/sim.ts`: per `arrive` the order tier (skipped for the
  first order), the look, and once gems are open the gem order roll; per `forge` call the Fine Ore
  roll (made even at rank 0) and, once gems are open, the gem roll. That includes the forges the
  Auto Forge makes in `tick`. The gem rolls are only made from `bestTier` 4, so the first round
  draws the same numbers as before gems.
- Art uses the seeded `rnd()` from `src/art/glass.ts`, not `Math.random`.
- The streak and commission add no randomness.
- Game time comes only from the `time` Phaser passes to `update`; tweens use Phaser's clock.

Data tables: sword names and prices in `src/game/swords.ts`; upgrade prices and blurbs in
`src/game/upgrades.ts`, with their effects in `forgeMs`, `oreChance`, `autoForging` and
`slotOpen` in `src/game/state.ts`;
forge time, visitor timing, patience, `FIRST_ORDER`, `EXACT_TIP`, `STREAK_MS`, `STREAK_COINS`,
renown, gem odds and pay, board size and desk count in `src/game/state.ts`; commissions in
`src/game/commissions.ts`; the order range (`Math.min(MAX_ORDER, Math.max(3, bestTier + 1))`)
and the difficulty and renown multipliers on patience in `arrive`.

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
  and `commissionDone` does not pulse the banner. Setting a gem skips its halo flash. The banner's
  glow holds still like the other frames. The pop tween on the merged sword, the draining streak
  ring, the delivered sword rising into the banner, the Royal Smith panel's fade and the floating
  texts still play.
- Normal must stay exactly as designed, since the playthrough runs on Normal.
- Keep the README's difficulty line in sync ("adventurers wait 50% longer on Easy and 30% less on
  Hard"), and the game's row in the root README's difficulty table.
- The settings are read once at load from the `hub-settings` storage key, which the hub owns. They
  are not part of `anvilheart-progress`, and "New smithy" does not touch them.

## Testing hooks

- `src/main.ts` puts `game` (the `Phaser.Game`) on window in dev builds only.
- `e2e/playthrough.spec.ts` reads `game.scene.getScene('Game')`: its `state` (copied without
  `events`, including `commission`, `stars`, `renown`, `streak`, `streakSlot` and `streakMs`) and
  `spots()`, which returns the Forge button centre, each slot's sword position (`slotCentre` minus
  `SWORD_LIFT`, the barrel last), each `deskCentre` and the banner's centre. Positions therefore
  follow `layout.ts`.
- Inputs: mouse clicks on Forge and mouse drags (down, eight moves, up) from anvil to anvil and
  anvil to desk, mapped from the 960x540 view to the scaled canvas.
- The test mirrors these values; change them together: `VIEW` (960x540), `FIRST_ORDER` (2), the
  Iron Shortsword price (10), the 50% exact-fit tip (`EXACT_TIP`, so the sale pays 15) and
  `STREAK_MS` (4000), `RENOWN_START` (50) and `RENOWN_EXACT` (4). It also expects: a fresh
  `commission` of `{ level: 0, made: 0 }`, no stars, no streak and renown 50; the first adventurer within 5s at desk 0; a forged dagger on slot 0 and then
  slot 1 (so `forge` fills the first empty slot and makes tier 1 at Fine Ore rank 0);
  `heatMs > 0` after one forge and still above 0 one 192ms step later; heat back to 0 within 5s;
  a merge landing on the target slot that starts a streak of 1 on that slot with no bonus coins;
  `coins` (15), `sold`, `walkedOff` and `renown` (54) exact after the sale; and the streak back to 0 within
  `STREAK_MS` + 1s with coins and the commission unchanged. It fails on any page error.
- Its screenshots are `0-forged`, `1-dragging`, `2-merged`, `3-exact-fit` (the sale drag midway,
  showing the tag) and `4-sold`; copy them to `docs/screenshots/playthrough-*.png`.
- It seeds `Math.random`, so adding or reordering random calls changes orders and looks but must
  not change the first round.
- The other screenshots in `docs/screenshots/` (gems, renown, the barrel and fifth column,
  deliveries, the Anvilheart, Royal Smith, the cover) are not made by the test: they were staged
  with a scratch Playwright script against the dev server that sets `state` fields through
  `window.game` (board, gems, ranks, renown, commission and adventurers) and then drags with the
  mouse. Refresh them the same way.

## Making common changes

- Add a sword tier: append to `SWORDS` in `src/game/swords.ts` and an entry to both `SHAPES` and
  `COLOURS` in `src/art/swords.ts` (one per tier, or `bakeSwords` crashes). The tier 8 and 9 swords
  nearly fill their 100px texture, so a longer one needs a bigger `SWORD_SIZE`. `MAX_ORDER` is
  `MAX_TIER - 1`; the discovered row fits nine frames under the board.
- Add or retune a commission: edit `COMMISSIONS` in `src/game/commissions.ts`; the `final` one
  wins. A commission's `tier` should be at least 2, since the banner names the tier below it.
- Add an upgrade: add the id to `UpgradeId` and `UPGRADES` in `src/game/upgrades.ts` (with `after`
  if it waits for others), its rank 0 in `freshProgress` in `src/game/state.ts`, and its effect
  where the rule lives (a helper like `forgeMs`). For a button, add it to `BUTTON_UPGRADES` and a
  y in `UPGRADE_BUTTONS.ys` in `src/scenes/layout.ts`; the three buttons already fill the left
  column, so a fourth needs a new place or smaller buttons. The barrel and fifth column are bought
  from their own spots instead (`createLocks` and `unlock` in `GameScene`).
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
  centre; the test's slot spots include that lift. `slotAt` returns locked anvils too: `pickUp`
  treats them as a buy, and `drop` refuses a closed `to`.
- `drop` onto a different-tier sword swaps rather than failing, and returns true, so it saves.
- `GEM` is 0, so `tier === null` and `!tier` are not the same test; a gem is never sold, delivered
  or merged.
- The board's cells shrank from 100px to 86px for the fifth column. Sword textures are still
  painted for 100px and drawn at `SWORD_FIT`; the background's anvils and quarries are scaled by
  `BOARD.cell / 100` in `board()`.
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
  Silver Saber takes the banner from 2/2 back to 1/2. A delivered sword is gone, so delivering
  plans around an anvil.
- All browser storage must stay prefixed `anvilheart-`, since every game shares the hub's origin.
