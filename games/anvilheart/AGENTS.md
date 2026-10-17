# Anvilheart: guide for agents

How Anvilheart is built and where things stand, for agents about to change it. `README.md` covers
how to play and lists the swords and upgrades. Keep this file up to date with any change to the
game, as the root `AGENTS.md` asks.

## Current state

Anvilheart is a merge game in a smithy, drawn as a stained-glass window. A forge puts Rusty
Daggers (and, later, gems) onto a 4x4 board of anvils (4x5 once the fifth row is bought), two swords
of the same tier merge into the next tier (nine tiers, the ninth the Anvilheart), and adventurers at
a counter of three desks buy swords at least as good as the one they ask for. Coins buy forge
upgrades, a fifth row and a quench barrel; royal commissions, delivered to the crown, set the long
goal and end in a win, after which a new charter starts the smithy over with the guild stars kept.

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
- Royal commissions (`src/game/commissions.ts`, `COMMISSIONS`): Golden Claymore 500c, Runeblade
  1200c, Dragonslayer 3000c, 2 Dragonslayers 6000c, 3 Dragonslayers 9000c, then the Crown Blade (an
  Anvilheart, 20000c). `commissionAt(level)` returns null past the last. A sword is delivered by
  dropping it on the banner (`deliver` in `sim.ts`, `deliverable` says whether the held sword
  counts; the banner then shows a gold `frame-banner`). It leaves the board and counts towards
  `commission.made` (pushing `delivered`); an Anvilheart sets `made` to `count`, so it completes
  any commission on its own. When `made` reaches `count`, it pays the reward and a guild star
  (`stars`), pushes `commission` and moves on; after the Crown Blade `won` turns true and the win
  window (`createWin`, "Keep smithing" closes it, "Found a new smithy" calls `foundCharter`)
  opens. For one-sword plain commissions the banner's progress counts swords of the tier below on
  the board and barrel, capped at 2, or says "Ready: drag it here" once the wanted sword is there;
  for multi-sword or gemmed ones it shows `Given made/count`. Once won it reads "The crown's
  smithy" with "Tap here to found a new smithy". Guild stars show left of "Sold" in the top bar
  with the price bonus they give (`1 · +5%`).
- Choose your commission (AN7): from level 1 on (`offered`), finishing a commission sets
  `choosing` and the crown offers the next one two ways (`offers` in `sim.ts`): as `commissionAt`
  lists it, or `grandOf` it (`gem: true`, `GRAND_PAY` 2.5x the reward, title "Gemmed ..."), until
  `chooseCommission(s, grand)` sets `commission.grand`. `standing(s)` is the commission in force
  (grand when chosen); `deliverable` is false while `choosing`, needs a gemmed sword for a gem
  commission, and still takes an Anvilheart for any lesser commission (not for the Crown Blade,
  which must match). The banner reads "The crown offers two: Tap here to choose"; the chooser
  window (`createChooser`, `drawChooser` fills its two buttons from `offers`, "Decide later" hides
  it) opens on completion, on load while `choosing`, and when the banner is tapped (`pickUp`).
  `commissionTitle` names a commission ("The Crown Blade", "Gemmed Runeblade", "2 Dragonslayers";
  the banner's sword picture carries the gem); titles over 14 characters draw at 11.5px.
- A new charter after the win (AN6): `foundCharter` (only while `won`) raises `charter`, clears
  the board, barrel, coins, ranks, Auto Forge, `bestTier`, adventurers, heroes on the way and the
  streak, and starts the commissions over at level 0 with `won` false, keeping `stars`, `sold` and
  `reputation`; it pushes `charter` (a floating line). `commissionAt(level, charter)` asks for
  `count + charter` swords (capped at `MAX_COUNT` 4, the banner's pips) and scales the reward with
  the count. Every star raises `orderPrice` by `STAR_PRICE` (5%) (`payFor`, `orderPrice` and the
  order card take `stars`). The top bar names the charter (`Anvilheart II`, `roman`). "New smithy"
  in the corner still throws everything away, stars included.
- Rust on idle anvils (AN8): `idle[]` (parallel to `slots`, saved) counts how long each anvil's
  sword has lain; `put` and `forge` zero it, `rust` in `tick` adds `dt` for anything `rusts`
  (a sword above tier 1; gems, Rusty Daggers and the barrel never rust). At `RUST_MS` (3 min) the
  sword is `dull` (drawn at 0.55 alpha, with a rust ring in `drawMarks` draining over `rustLeft`),
  and `RUST_DROP_MS` (1 min) later it drops a tier (keeping its flags) and pushes `rusted`.
- Adventurers with traits (AN9): `Order` is `{ wants, gem, trait }`; `trait` (`Trait`, `TRAITS`)
  is rolled in `arrive` after the gem roll with one `Math.random` (never for the first order):
  `TRAIT_CHANCE` (35%), split evenly. A `haggler` gets `HAGGLER_PATIENCE` (1.6x) and pays
  `HAGGLER_PAY` (70%) of anything; a `noble` pays `NOBLE_PAY` (3x the price) for an exact fit and
  `fitOf` turns overkill into `short`; a `veteran` takes `wants - 1` as the new fit `lesser`
  (pays the price, no tip or reputation). `TRAIT_LINES` draws the trait between the order card
  and the patience bar; `tagLine` words the fit tag.
- Returning heroes (AN10): `sell` of tier `RETURN_TIER` (4) or better rolls `RETURN_CHANCE` (30%,
  one `Math.random`) to push a `Returning` (`RETURN_MS` 30s, the sword a tier lower with the
  `BATTERED` flag, `trophyFor` a tenth of its price, the buyer's look). `tick` brings the first
  due hero back once a desk and an anvil are free (`comeBack`: `arrive` with their look and
  `returned` true, the sword on the first empty anvil, the trophy paid, a `returned` event). A
  battered sword (`isBattered`, textures `sword-<tier>[-gem]-worn`, dull glass with notches)
  merges and sells as its tier; `combine` repairs it with a Rusty Dagger either way round
  (`repaired`), which `drop` pays `repairPay` (a fifth of its price) and pushes `repaired`. The
  card's trait line reads "Back from the quest" for a returned hero with no trait.
- Guild reputation (`reputation`, 0 to `REP_MAX` 100, starting at `REP_START` 50): an exact-fit
  sale adds `REP_EXACT` (5), a walk-off takes `REP_WALKOFF` (10). `visitorEveryMs` (6s at 50, 3s at
  100, 9s at 0) sets the gap between visitors and `patienceFactor` (1 at 50, 1.25 at 100, 0.75 at
  0) scales patience at arrival. The meter (`drawReputation`, word from `STANDING`) sits top left
  over the furnace on a pane painted by `reputationPanel` in `scenery.ts`.
- Gems (`src/game/items.ts`): once `bestTier >= GEM_TIER` (3, `gemsAbout`), each forge makes a
  loose gem (`GEM`) with `GEM_CHANCE` (8%) and each adventurer ordering tier 2+ wants a gemmed
  sword with `GEM_ORDER_CHANCE` (25%, `Adventurer.gem`). `combine` sets a gem into a plain sword
  (`set` event) or merges two swords, keeping a gem if either had one. A gem order only takes a
  gemmed sword (`fitOf`) and pays `GEM_PAY` (2x) the price (`orderPrice`), plus the exact tip.
- Bigger smithy: upgrades `row` (800c, adds four anvils, `anvilsOf`) and `barrel` (300c). They are
  not on the forge buttons (`FORGE_UPGRADES`): the row is bought with a button on the smoky cover
  over the fifth row (`createRowCover`, which also carries the one-line instructions), the barrel
  by tapping it. The barrel (`state.barrel`, place `BARREL` = -1) is a place like an anvil: swords
  merge, swap, sell and deliver from it; the forge never fills it.
- Anvilheart (tier 9, `MAX_TIER`): two Dragonslayers merge into it. Adventurers order up to
  `ORDER_TOP` (8) only.
- Progression: `bestTier` raises the tier adventurers may ask for (and unlocks gems); upgrades Bellows (faster forge),
  Fine Ore (five ranks of 20% chance the forge makes a tier 2 sword, so rank 5 always does) and,
  last, Auto Forge (one rank, locked until Bellows is maxed; Fine Ore is not needed): the forge then
  makes a sword by itself whenever it is hot and an anvil is free, so the player only merges and
  sells. Once bought, its button switches it on and off (`autoForge`).
- One screen (`GameScene`) with a HUD and commission banner, the reputation meter, drag highlights
  (glowing gold and green glass frames), jewel patience and heat bars, the quench barrel right of
  the board, a row of discovered swords under the board
  (one frame per tier, showing the sword's picture only, no name, once `bestTier` has reached it;
  a question mark before), and a "New smithy" reset link in the bottom right corner.
- Persistence of the board and its idle times, barrel, coins, swords sold, best tier, upgrade
  ranks, the Auto Forge switch, the standing commission (level, made, grand), the open offer
  (`choosing`), guild stars, the charter, reputation and `won` in `localStorage`.

Missing or rough:

- No title screen and no in-game settings (they are on the hub page), no sound.
- `walkedOff` is counted but not saved (its cost is the reputation drop, which is). Heroes on
  their way back (`returning`) are not saved either, so a reload loses them.
- The win window is only shown when the Crown Blade is delivered; on reload the banner's "Tap
  here to found a new smithy" opens it again.
- "New smithy" resets at once with no confirmation, and the saved key is only rewritten on the
  next action.
- Saved `coins`, `sold`, `bestTier` and `ranks` are trusted as loaded; only `slots`, `idle`,
  `barrel`, `commission`, `choosing`, `stars`, `charter`, `reputation` and `won` are checked (in
  `newShop`).
- The banner text is small (8 to 13px) to fit the top bar.

## Architecture

File map (`src/`):

- `howToPlay.ts`: the How to play screen's text (goal, controls, core loop and tips), handed to
  `setupGame(game, { howToPlay })` in `main.ts`; update it when the controls or the first round change.
- `main.ts`: creates the `Phaser.Game` (960x540, `Scale.FIT`, `pixelArt: false`) with `BootScene` and
  `GameScene`, calls `setupGame(game)` and then `setupScaling(game)` from `shared/scaling.ts`, and
  exposes `game` on window in dev builds.
- `game/state.ts`: types (`GameState`, `Order`, `Adventurer`, `Returning`, `GameEvent`,
  `Progress`, `Fit`, `Trait`), board (`GRID`, `SLOTS`, `MAX_SLOTS`, `BARREL`, `anvilsOf`),
  timing, tip, streak, reputation, gem, star, rust, trait and returning-hero constants
  (`EXACT_TIP`, `STREAK_MS`, `STREAK_COINS`, `LOOKS`, `REP_*`, `GEM_*`, `STAR_PRICE`, `RUST_*`,
  `TRAITS`, `TRAIT_CHANCE`, `HAGGLER_*`, `NOBLE_PAY`, `RETURN_*`, `TROPHY_PAY`, `REPAIR_PAY`),
  `freshProgress`, `newShop`, `progressOf`, the sale price rule `fitOf`, `orderPrice` and
  `payFor`, and the formulas `forgeMs`, `oreChance`, `autoForging`, `gemsAbout`,
  `visitorEveryMs`, `patienceFactor`, `rusts`, `dull`, `rustLeft`, `trophyFor` and `repairPay`.
- `game/items.ts`: what lies on an anvil as one number (`GEM`, `SET`, `BATTERED`, `tierOf`,
  `isGem`, `isGemmed`, `isBattered`, `sword`, `validItem`) and `combine`, the merge, gem-setting
  and repair rule.
- `game/sim.ts`: the rules as pure functions on `GameState`: `tick`, `forge`, `itemAt`, `drop`,
  `standing`, `offers`, `chooseCommission`, `deliverable`, `deliver`, `sell`, `buy`,
  `toggleAutoForge`, `foundCharter`, plus the private `rust`, `arrive`, `rollTrait`, `comeBack`,
  `put` and `hammer` (streaks).
- `game/commissions.ts`: `Commission`, `COMMISSIONS`, `MAX_COUNT`, `GRAND_PAY`,
  `commissionAt(level, charter)`, `grandOf`, `commissionTitle` and `offered`.
- `game/swords.ts`: the `SWORDS` table (name, price per tier), `MAX_TIER`, `ORDER_TOP`, `swordOf`.
- `game/upgrades.ts`: the `UPGRADES` table (name, blurb, price per rank, and `after`: the upgrades
  that must be maxed first), `UPGRADE_IDS`, `FORGE_UPGRADES` (the three on the forge buttons),
  `nextPrice`, `locked`.
- `game/save.ts`: `loadProgress`, `saveProgress`, `clearProgress`.
- `scenes/BootScene.ts`: bakes all textures, then starts `Game`.
- `scenes/GameScene.ts`: draws the smithy, turns pointer input into sim calls, animates events,
  saves, and offers `spots()` for the test.
- `scenes/layout.ts`: every screen position (`VIEW`, `FURNACE_WINDOW`, `FORGE_BUTTON`,
  `HEAT_BAR`, `BANNER`, `REPUTATION`, `UPGRADE_BUTTONS`, `BOARD` with `CELL_SCALE`, `ROW_BOX`,
  `ROW_BUTTON`, `BARREL`, `DISCOVERED` with `discoveredCentre`, `DESK`, inside a desk `ORDER`,
  `PATIENCE` and `TAG`, and `WIN`), the `FONT` stack (Georgia, serif) and hit tests `slotAt`,
  `placeAt` (anvil or barrel), `onBanner` and `deskAt`.
- `ui/Button.ts`: a leaded-glass caption button (style `forge`, `upgrade` or `row`, textures from
  `bakeUi`) that fires on `pointerdown` and can be disabled.
- `art/glass.ts`: the painting kit: `bake` (paints a canvas in art units, twice the view's, at
  `sharpRes` canvas pixels per view pixel, and adds it with `textures.addCanvas`), `fit` and
  `shown` (the scale that shows a baked texture at its size in view pixels), `glass` (a gradient, mottled piece in lead), `panel`,
  `glowFrame`, `glow`, `paint`, `label`, shape helpers and the seeded `rnd`.
  `art/scenery.ts`: `background` (Voronoi mosaic wall, furnace stones, all twenty board panes and
  anvils, the reputation pane, counter frames, top bar) and `furnace-0/1`. `art/swords.ts`:
  `sword-<tier>`, `sword-<tier>-gem` (a gem on the guard) and their `-worn` (battered) twins, the
  loose `gem`, `drawSword`, `drawGem`, `itemTexture`, `swordScale`.
  `art/characters.ts`: `adventurer-<look>` (lancet window with a knight, ranger, viking or mage).
  `art/ui.ts`: button, emblem, order card, fit tag, streak tag, banner, pip, star, frame (gold,
  green, banner, barrel), discovered frame, burst, spark, halo, `row-locked`, `barrel`/`barrel-off`
  and `win-panel` (also the offer window's pane) textures.

Shared code the game imports (repo root, outside `src/`): `shared/setupGame.ts` (`setupGame`),
`shared/scaling.ts` (`setupScaling`, `sharpRes`) and `shared/settings.ts` (`settings`,
`byDifficulty`). See "Hub settings" and "Screens" below.

How it runs:

- Boot: `BootScene.create` calls `bakeScenery`, `bakeSwords`, `bakeAdventurers` and `bakeUi`,
  which paint stained glass on 2D canvases (in art units, scaled to `sharpRes` canvas pixels per
  view pixel, which matches the screen's `renderScale`) and add them with `textures.addCanvas`. There are no asset files. The
  background's mosaic is computed pixel by pixel once at boot.
- Tick: `GameScene.update(time)` takes `dt` from the frame timestamp (clamped to `MAX_STEP_MS`,
  250ms), adds it to `clock`, and calls `tick(state, dt)`, which cools the forge, forges when
  `autoForging`, drains the hammer streak and patience (a walk-off costs reputation), rusts idle
  swords, brings heroes back and brings adventurers. If that pushed a `forged` event the scene
  saves. Then it draws (`drawChooser` last, which hides the offer window once a choice is made).
- Input: pointers are read through `pointer.worldX/worldY` (game pixels; `pointer.x/y` are canvas
  pixels once `setupScaling` runs). Scene `pointerdown` picks up a sword or gem from an anvil or the barrel (`pickUp`; on an
  unbought barrel it buys it), `pointermove` moves the held sprite, `pointerup` calls `putDown`,
  which calls `drop` if over an anvil or the barrel, `deliver` if over the banner, or `sell` if over
  a desk with an adventurer. `gameout` puts the sword back. Pick-ups and buys are ignored while a
  window shows (`windowOpen`: the win or the offer window). A `pointerdown` on the banner with
  nothing under it opens the offer window while `choosing`, or the win window once `won`. Forge
  and upgrade buttons call `forge` and `buy`; a
  bought Auto Forge's button calls `toggleAutoForge` instead. The offer window's buttons call
  `chooseCommission`, the win window's second button `foundCharter` (then `clearBoard` throws the
  sprites away, as "New smithy" does). Each successful action calls `save()`.
- Rendering is mixed. Sword sprites (`swords[]`, one per anvil up to `MAX_SLOTS`, drawn at
  `CELL_SCALE`, and `barrelSword`, all kept by `drawItem`) and visitor containers (`visitors`,
  keyed by adventurer id, each with its hidden fit `tag`) are diffed against state. The `marks`
  and `hud` graphics are cleared and redrawn every frame (patience segments and the streak ring in
  `marks`, with the rust rings, the heat bar in `hud`). `drawItem` fades a `dull` sword. `drawMarks` also shows and pulses the pre-made `mergeFrames`
  (one per slot) and `buyerFrames` (one per desk), and fills in each buyer's tag. The discovered
  row's frames and sword images are made once in `createDiscovered`; `drawHud` lights each whose
  tier is at most `bestTier`, sets the top bar texts and fills the commission `banner`. The
  "adventurer on the way" hint sits in the empty first desk. Sim functions push `GameEvent`s onto
  `state.events`; `drawEvents` drains them for pop, halo, burst and spark, banner and floating
  text tweens.

State model (`src/game/state.ts`):

- `GameState.slots` is `SLOTS` (16) entries, or `MAX_SLOTS` (20) once `ranks.row` is 1, each an
  item number or `null`, numbered row by row from the top left. An item is a sword tier (1 to
  `MAX_TIER`), `GEM` (-1) or a sword with flags added: `SET` (100) for a gem, `BATTERED` (200)
  for a hero's returned sword, or both (300); use the `items.ts` helpers, never compare raw
  numbers. `idle` has one entry per slot. `barrel` holds one item or null. A "place" is an anvil
  index or `BARREL`.
- `adventurers` holds at most `DESKS` (3); each has a unique `desk`, `wants` (minimum tier),
  `gem` (wants it gemmed), `trait`, `patienceMs` counting down from `patience`, `look` (0 to
  `LOOKS - 1`) and `returned`. `returning` holds heroes on their way back.
- `streak` is the number of merges in the current hammer streak (0 when none), `streakSlot` the
  anvil of the last one, and `streakMs` the time left to chain; `tick` drains it and zeroes
  `streak` when it runs out.
- `commission` is `{ level, made, grand }`: which `commissionAt` stands (in this `charter`), how
  many of its sword were delivered and whether its grand way was chosen; `choosing` is true while
  the crown's offer for it waits. `stars` counts commissions completed over every charter; `won`
  is true once this charter's Crown Blade is in, and `foundCharter` clears it.
- `reputation` is 0 to `REP_MAX`.
- `heatMs` is 0 when the forge is ready; buying a Bellows rank caps it at the new `forgeMs`. `nextVisitorMs` only counts down while a desk is free.
- `autoForge` is the Auto Forge's on/off switch; it only matters once `ranks.auto` is 1. `buy`
  turns it on when the Auto Forge is bought. `buy` refuses an upgrade while `locked` says one of
  its `after` upgrades still has ranks left.
- `orders` counts adventurers who arrived; when it is 0 the next one wants `FIRST_ORDER`. `newShop`
  sets it to `progress.sold`, so a returning player who has sold gets random orders at once.
- Only `src/game/sim.ts` changes rules state; the scene replaces `state` wholesale only on load and
    on "New smithy". `bestTier` is raised by `forge` and `drop` and only falls to 0 in
  `foundCharter`. Coins come from `sell` (`payFor`), streak and repair bonuses in `drop`, heroes'
  trophies in `tick` and commission rewards in `deliver`, and go on `buy`.

Persistence: one key of its own, `anvilheart-progress`, holding `Progress` as JSON (`coins`,
`slots`, `idle`, `sold`, `bestTier`, `ranks`, `autoForge`, `commission`, `choosing`, `stars`,
`charter`, `barrel`, `reputation`, `won`). Adventurers, returning heroes, heat, the streak and
timers are not saved. `loadProgress` merges over `freshProgress()`, so a new upgrade id in `ranks`
loads as rank 0, `autoForge` as false, and an old save starts with no barrel, reputation 50, not
won, no idle times, no open offer (its standing commission counts as the quick way) and charter
0. `newShop` sizes `slots` by `anvilsOf` and drops anything `validItem` rejects. An old save's
commission level keeps its meaning for the first three; an old level past them lands on the
multi-Dragonslayer ones or the win.

Randomness and timing:

- `Math.random` is only used in `src/game/sim.ts`: per `arrive`, the order tier (skipped for the
  first order), the look (skipped for a returning hero), the gem order roll (only once `gemsAbout`
  and for tier 2+), then the trait roll (skipped for the first order); per `forge` call, the Fine
  Ore roll (made even at rank 0) and then the gem roll (only once `gemsAbout`), including the
  forges the Auto Forge makes in `tick`; per `sell` of tier `RETURN_TIER`+, the returning roll.
  The gem, trait and returning rolls are skipped in the first round, so its random sequence is
  unchanged.
- Art uses the seeded `rnd()` from `src/art/glass.ts`, not `Math.random`.
- The streak, commissions, their offers, charters, rust and reputation add no randomness.
- Game time comes only from the `time` Phaser passes to `update`; tweens use Phaser's clock.

Data tables: sword names and prices in `src/game/swords.ts`; upgrade prices and blurbs in
`src/game/upgrades.ts`, with their effects in `forgeMs`, `oreChance` and `autoForging` in
`src/game/state.ts`;
forge time, visitor timing, patience, `FIRST_ORDER`, `EXACT_TIP`, `STREAK_MS`, `STREAK_COINS`,
board size, desk count, reputation and gem numbers in `src/game/state.ts`; commissions in
`src/game/commissions.ts` (with `MAX_COUNT` and `GRAND_PAY`); the star, rust, trait and
returning-hero numbers in `src/game/state.ts`; the order range (`Math.max(3, bestTier + 1)`,
capped at `ORDER_TOP`) and the difficulty, reputation and Haggler multipliers on patience in
`arrive`.

### Hub settings

- `src/main.ts` calls `setupGame(game)` from `shared/setupGame.ts` right after creating the game.
  It applies the frame cap, the FPS readout, reduced motion and full screen (camera shake and flash become
  no-ops; this game uses neither).
- Difficulty scales one number: adventurer patience. `arrive` in `src/game/sim.ts` multiplies
  `PATIENCE_MS + PATIENCE_PER_TIER_MS * wants` by `byDifficulty(1.5, 1, 0.7)` (easy, normal, hard)
  from `shared/settings.ts`, and then by the reputation's `patienceFactor`. The base constants in
  `src/game/state.ts` are unchanged.
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

### Screens

- `setupScaling` gives the canvas `renderScale` canvas pixels per game pixel (up to 4 on a 4K
  screen, 2 with the canvas renderer) and zooms the camera to match from its top-left corner. The
  camera never scrolls, so the layout in `layout.ts` stays in 960x540 game pixels.
- Every texture is baked at `sharpRes` canvas pixels per view pixel, so an image showing one must
  be sized with `fit(image, scale)` (in `GameScene`, `this.image(x, y, key, scale)`), and a tween
  on its `scale` targets `shown(key, scale)`. A bare `this.add.image` or `setScale` draws the art
  `renderScale` times too big. Containers (the banner, tags, buttons) scale as usual.
- Texts are drawn at `renderScale` by `shared/scaling.ts`; Graphics are sharp on their own.
- `index.html` has the shared `100dvh` and `touch-action: none` styles. A phone held upright gets
  the shared hint to turn it. `e2e/screens.spec.ts` at the root opens the game on five screens.

## Testing hooks

- `src/main.ts` puts `game` (the `Phaser.Game`) on window in dev builds only.
- `e2e/playthrough.spec.ts` reads `game.scene.getScene('Game')`: its `state` (copied without
  `events`, including `commission`, `stars`, `reputation`, `streak`, `streakSlot` and `streakMs`;
  it matches `commission` with `toMatchObject`, so `grand` and the other new fields pass)
  and `spots()`, which returns the Forge button centre, each anvil's sword position (`slotCentre`
  minus `SWORD_LIFT`, all 20), each `deskCentre`, and the `banner`, `barrel` and fifth-row button
  (`row`) centres. Positions therefore follow `layout.ts`.
- Inputs: mouse clicks on Forge and mouse drags (down, eight moves, up) from anvil to anvil and
  anvil to desk, mapped from the 960x540 view to the scaled canvas.
- The test mirrors these values; change them together: `VIEW` (960x540), `FIRST_ORDER` (2), the
  Iron Shortsword price (10), the 50% exact-fit tip (`EXACT_TIP`, so the sale pays 15) and
  `STREAK_MS` (4000), `REP_START` (50) and `REP_EXACT` (5). It also expects: 16 empty anvils, a
  fresh `commission` of `{ level: 0, made: 0 }`, no stars, no streak and reputation 50; the first
  adventurer within 5s at desk 0 with no gem order; a forged dagger on slot 0 and then
  slot 1 (so `forge` fills the first empty slot and makes tier 1 at Fine Ore rank 0);
  `heatMs > 0` after one forge and still above 0 one 192ms step later; heat back to 0 within 5s;
  a merge landing on the target slot that starts a streak of 1 on that slot with no bonus coins;
  `coins` (15), `sold`, `walkedOff` and `reputation` (55) exact after the sale; and the streak back to 0 within
  `STREAK_MS` + 1s with coins and the commission unchanged. It fails on any page error. The first
  round meets none of the round-2 rules: no stars (so prices are unchanged), no trait on the
  first order, a tier 2 sale (no returning hero), and 15s of play (no rust).
- Its screenshots are `0-forged`, `1-dragging`, `2-merged`, `3-exact-fit` (the sale drag midway,
  showing the tag) and `4-sold`; copy them to `docs/screenshots/playthrough-*.png`.
- It seeds `Math.random`, so adding or reordering random calls changes orders and looks but must
  not change the first round.

## Making common changes

- Add a sword tier: append to `SWORDS` in `src/game/swords.ts` and an entry to both `SHAPES` and
  `COLOURS` in `src/art/swords.ts` (one per tier, or `bakeSwords` crashes). The tier 8 and 9
  swords nearly fill their 100px texture, so a longer one needs a bigger `SWORD_SIZE`. `MAX_TIER`
  is the Anvilheart (the commission shortcut in `deliver`), `ORDER_TOP` caps orders, the Crown
  Blade in `COMMISSIONS` uses `MAX_TIER`, and `SET` (100) must stay above `MAX_TIER`. The
  discovered row (9 frames) just fits between the upgrade buttons and the barrel.
- Add or retune a commission: edit `COMMISSIONS` in `src/game/commissions.ts`; the last one wins.
  A commission's `tier` should be at least 2, since the banner names the tier below it, and at most
  `MAX_COUNT` (4) swords, the banner's pips; `commissionAt` adds one per charter and caps there.
  A commission whose title is over 14 characters (the grand way adds "Gemmed ") draws smaller.
- Add a trait: add it to `Trait` and `TRAITS` in `src/game/state.ts`, its rule in `fitOf`,
  `payFor` or `arrive`, its card line in `TRAIT_LINES` and `TRAIT_COLOURS` and, if it changes a
  fit's wording, `tagLine` in `GameScene.ts`.
- Add a sword flag: like `BATTERED` in `src/game/items.ts` (a multiple of 100 above `SET`, so
  `tierOf` stays `item % 100`), a texture suffix in `swordTexture`/`itemTexture` and a look in
  `drawSword`, and `validItem`'s upper bound.
- Add an upgrade: add the id to `UpgradeId` and `UPGRADES` in `src/game/upgrades.ts` (with `after`
  if it waits for others), its rank 0 in `freshProgress` in `src/game/state.ts`, its effect where
  the rule lives (a helper like `forgeMs`). A forge upgrade also goes in `FORGE_UPGRADES` with a y
  in `UPGRADE_BUTTONS.ys` in `src/scenes/layout.ts`; the three buttons already fill the left column
  down to the bottom edge, so a fourth needs a new place (like the row and barrel, bought where
  they go).
- Retune timing or prices: edit the constants above. Check the test still holds (first visitor
  within 5s, forge time above 192ms and under 5s, Shortsword price matching `SHORTSWORD_PRICE`).
- Add an adventurer look: raise `LOOKS` in `src/game/state.ts` and add a branch to `figure` in
  `src/art/characters.ts`.
- Add an effect for a new rule: push a new `GameEvent` kind from `src/game/sim.ts` and handle it
  in `GameScene.drawEvents`.
- Change the art: all textures are painted in `src/art/`, in art units (twice the view's pixels),
  and shown with `fit` (see "Screens").
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
- `drop` onto anything `combine` rejects swaps rather than failing, and returns true, so it saves.
- Slot values can be negative (`GEM`) or above 100 (gemmed, battered, or both), so always go
  through `tierOf` and friends; `0` never appears, and `null` is empty. Rust lowers a sword with
  `item - 1`, which keeps its flags.
- `idle` must stay as long as `slots`: `buy('row')` pushes to both, `foundCharter` and `newShop`
  rebuild both. Only `put`, `forge` and `comeBack` touch `idle` besides `rust`.
- A returning hero waits in `returning` until a desk and an anvil are both free, and then takes
  the desk out of turn (the visitor timer is untouched).
- The offer window and the win window share `win-panel` and both block input; `drawChooser` hides
  the offer window on its own once `choosing` is false, so never leave it visible with no offer.
- The background paints all twenty anvils; the fifth row's are hidden under `rowCover` (depth 12)
  until bought, and `slotAt` hits row 5 even then, which `drop` refuses as the slot does not exist.
- The board's cell is 86px, not the 100px the swords and anvils were painted for: board sprites and
  anvils are drawn at `CELL_SCALE`.
- Dropping on a desk with nobody there does nothing; the sword returns to its slot.
- Visitor containers are built once in `makeVisitor` and never refreshed; anything about an
  adventurer that changes over time must be drawn in `drawMarks` (like the patience bar and the
  fit tag).
- The streak bonus and the commission reward are paid inside `drop`, so a merge's coins land
  before the scene draws; `sold` events carry the `fit` for the floating text.
- The discovered row reads `bestTier`, so it shows every tier up to the best one made, even a
  tier the Fine Ore skipped. It fills the space between the board and the bottom edge; the
  one-line instructions sit between it and the board.
- The one-sword commissions' progress is read from the board and barrel each frame, not stored, so
  selling a Silver Saber takes the banner from 2/2 back to 1/2.
- All browser storage must stay prefixed `anvilheart-`, since every game shares the hub's origin.
