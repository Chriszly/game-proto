# Anvilheart: guide for agents

How Anvilheart is built and where things stand, for agents about to change it. `README.md` covers
how to play and lists the swords and upgrades. Keep this file up to date with any change to the
game, as the root `AGENTS.md` asks.

## Current state

Anvilheart is a merge game in a smithy. A forge puts Rusty Daggers onto a 4x4 board of anvils,
two swords of the same tier merge into the next tier (eight tiers), and adventurers at a counter of
three desks buy swords at least as good as the one they ask for. Coins buy three upgrades.

Implemented today:

- The full loop: forge with a heat-up cooldown, drag to move, swap or merge, drag onto an
  adventurer to sell, adventurers arriving on a timer and leaving when their patience runs out.
- Progression: `bestTier` raises the tier adventurers may ask for; upgrades Bellows (faster forge),
  Fine Ore (chance the forge makes a tier 2 sword) and, last, Auto Forge (one rank, locked until
  Bellows and Fine Ore are maxed): the forge then makes a sword by itself whenever it is hot and an
  anvil is free, so the player only merges and sells. Once bought, its button switches it on and
  off (`autoForge`).
- One screen (`GameScene`) with a HUD, drag highlights, patience and heat bars, and a
  "New smithy" reset link in the bottom right corner.
- Persistence of the board, coins, swords sold, best tier, upgrade ranks and the Auto Forge switch
  in `localStorage`.

Missing or rough:

- No title or win screen and no in-game settings (they are on the hub page), no sound, no ending
  once the Dragonslayer is made. Two Dragonslayers dropped on each other just swap.
- Adventurers who walk off cost nothing; `walkedOff` is counted but only shown as floating text,
  and it is not saved.
- A sale pays the price of the sword given, not the one asked for, so overselling is never
  penalised or rewarded beyond the price.
- "New smithy" resets at once with no confirmation, and the saved key is only rewritten on the
  next action.
- `Visitor.adventurer` in `GameScene` is stored but never read. `arrive` in `src/game/sim.ts` picks
  `look` with a hard-coded 4 rather than `LOOKS` from `src/art/characters.ts`.
- Saved `coins`, `sold`, `bestTier` and `ranks` are trusted as loaded; only `slots` are checked
  (in `newShop`).

## Architecture

File map (`src/`):

- `main.ts`: creates the `Phaser.Game` (960x540, `Scale.FIT`, `pixelArt`) with `BootScene` and
  `GameScene`, calls `setupGame(game)`, and exposes `game` on window in dev builds.
- `game/state.ts`: types (`GameState`, `Adventurer`, `GameEvent`, `Progress`), board and timing
  constants, `freshProgress`, `newShop`, `progressOf`, and the upgrade formulas `forgeMs`,
  `oreChance` and `autoForging`.
- `game/sim.ts`: the rules as pure functions on `GameState`: `tick`, `forge`, `drop`, `sell`,
  `buy`, `toggleAutoForge`, plus the private `arrive`.
- `game/swords.ts`: the `SWORDS` table (name, price per tier), `MAX_TIER`, `swordOf`.
- `game/upgrades.ts`: the `UPGRADES` table (name, blurb, price per rank, and `after`: the upgrades
  that must be maxed first), `UPGRADE_IDS`, `nextPrice`, `locked`.
- `game/save.ts`: `loadProgress`, `saveProgress`, `clearProgress`.
- `scenes/BootScene.ts`: bakes all textures, then starts `Game`.
- `scenes/GameScene.ts`: draws the smithy, turns pointer input into sim calls, animates events,
  saves, and offers `spots()` for the test.
- `scenes/layout.ts`: every screen position (`VIEW`, `FURNACE`, `FORGE_BUTTON`, `HEAT_BAR`,
  `UPGRADE_BUTTONS`, `BOARD`, `DESK`) and hit tests `slotAt` and `deskAt`.
- `ui/Button.ts`: a wooden caption button that fires on `pointerdown` and can be disabled.
- `art/palette.ts`: the shared colours. `art/pixelArt.ts`: `bakePixelArt`, `PixelCanvas` and the
  `seeded` RNG. `art/swords.ts`, `art/characters.ts`, `art/scenery.ts`: the sword tiers, the four
  adventurer looks, and the background, furnace (two frames) and anvil.

Shared code the game imports (repo root, outside `src/`): `shared/setupGame.ts` (`setupGame`) and
`shared/settings.ts` (`settings`, `byDifficulty`). See "Hub settings" below.

How it runs:

- Boot: `BootScene.create` calls `bakeScenery`, `bakeSwords` and `bakeAdventurers`, which paint
  pixel grids into Phaser graphics and `generateTexture` them (keys `background`, `furnace-0/1`,
  `anvil`, `sword-<tier>`, `adventurer-<look>`). There are no asset files.
- Tick: `GameScene.update(time)` takes `dt` from the frame timestamp (clamped to `MAX_STEP_MS`,
  250ms), adds it to `clock`, and calls `tick(state, dt)`, which cools the forge, forges when
  `autoForging`, drains patience and brings adventurers. If that pushed a `forged` event the scene
  saves. Then it draws.
- Input: scene `pointerdown` picks up a sword (`pickUp`), `pointermove` moves the held sprite,
  `pointerup` calls `putDown`, which calls `drop` if over an anvil or `sell` if over a desk with an
  adventurer. `gameout` puts the sword back. Forge and upgrade buttons call `forge` and `buy`; a
  bought Auto Forge's button calls `toggleAutoForge` instead. Each successful action calls `save()`.
- Rendering is mixed. Sword sprites (`swords[]`, one per slot) and visitor containers (`visitors`,
  keyed by adventurer id) are diffed against state. The `marks` and `hud` graphics are cleared and
  redrawn every frame (patience bars, merge and buyer outlines, HUD, heat bar). Sim functions push
  `GameEvent`s onto `state.events`; `drawEvents` drains them for pop, flash and floating text
  tweens.

State model (`src/game/state.ts`):

- `GameState.slots` is `SLOTS` (16) entries, each a sword tier (1 to `MAX_TIER`) or `null`,
  numbered row by row from the top left. Swords are only ever stored as tier numbers.
- `adventurers` holds at most `DESKS` (3); each has a unique `desk`, `wants` (minimum tier),
  `patienceMs` counting down from `patience`, and `look`.
- `heatMs` is 0 when the forge is ready. `nextVisitorMs` only counts down while a desk is free.
- `autoForge` is the Auto Forge's on/off switch; it only matters once `ranks.auto` is 1. `buy`
  turns it on when the Auto Forge is bought. `buy` refuses an upgrade while `locked` says one of
  its `after` upgrades still has ranks left.
- `orders` counts adventurers who arrived; when it is 0 the next one wants `FIRST_ORDER`. `newShop`
  sets it to `progress.sold`, so a returning player who has sold gets random orders at once.
- Only `src/game/sim.ts` changes rules state; the scene replaces `state` wholesale only on load and
  on "New smithy". `bestTier` is raised by `forge` and `drop` and never falls.

Persistence: one key of its own, `anvilheart-progress`, holding `Progress` as JSON (`coins`,
`slots`, `sold`, `bestTier`, `ranks`, `autoForge`). Adventurers, heat and timers are not saved.
`loadProgress` merges over `freshProgress()`, so a new upgrade id in `ranks` loads as rank 0 and
`autoForge` as false from old saves.

Randomness and timing:

- `Math.random` is only used in `src/game/sim.ts`: twice per `arrive` (order tier, skipped for the
  first order, and look) and once per `forge` call (the Fine Ore roll, made even at rank 0),
  including the forges the Auto Forge makes in `tick`.
- Art uses `seeded()` from `src/art/pixelArt.ts`, not `Math.random`.
- Game time comes only from the `time` Phaser passes to `update`; tweens use Phaser's clock.

Data tables: sword names and prices in `src/game/swords.ts`; upgrade prices and blurbs in
`src/game/upgrades.ts`, with their effects in `forgeMs`, `oreChance` and `autoForging` in
`src/game/state.ts`;
forge time, visitor timing, patience, `FIRST_ORDER`, board size and desk count in
`src/game/state.ts`; the order range (`Math.max(3, bestTier + 1)`) and the difficulty multiplier on
patience in `arrive`.

### Hub settings

- `src/main.ts` calls `setupGame(game)` from `shared/setupGame.ts` right after creating the game.
  It applies the frame cap, the FPS readout and reduced motion (camera shake and flash become
  no-ops; this game uses neither).
- Difficulty scales one number: adventurer patience. `arrive` in `src/game/sim.ts` multiplies
  `PATIENCE_MS + PATIENCE_PER_TIER_MS * wants` by `byDifficulty(1.5, 1, 0.7)` (easy, normal, hard)
  from `shared/settings.ts`. The base constants in `src/game/state.ts` are unchanged.
- Reduced motion: `GameScene.drawEvents` skips the white flash circle on a merge when
  `settings.reduceMotion` is on. The pop tween on the merged sword still plays.
- Normal must stay exactly as designed, since the playthrough runs on Normal.
- Keep the README's difficulty line in sync ("adventurers wait 50% longer on Easy and 30% less on
  Hard"), and the game's row in the root README's difficulty table.
- The settings are read once at load from the `hub-settings` storage key, which the hub owns. They
  are not part of `anvilheart-progress`, and "New smithy" does not touch them.

## Testing hooks

- `src/main.ts` puts `game` (the `Phaser.Game`) on window in dev builds only.
- `e2e/playthrough.spec.ts` reads `game.scene.getScene('Game')`: its `state` (copied without
  `events`) and `spots()`, which returns the Forge button centre, each anvil's sword position
  (`slotCentre` minus `SWORD_LIFT`) and each `deskCentre`. Positions therefore follow `layout.ts`.
- Inputs: mouse clicks on Forge and mouse drags (down, eight moves, up) from anvil to anvil and
  anvil to desk, mapped from the 960x540 view to the scaled canvas.
- The test mirrors these values; change them together: `VIEW` (960x540), `FIRST_ORDER` (2) and the
  Iron Shortsword price (10). It also expects: the first adventurer within 5s at desk 0; a forged
  dagger on slot 0 and then slot 1 (so `forge` fills the first empty slot and makes tier 1 at
  Fine Ore rank 0); `heatMs > 0` after one forge and still above 0 one 192ms step later; heat
  back to 0 within 5s; a merge landing on the target slot; and `coins`, `sold`, `walkedOff` exact
  after the sale. It fails on any page error.
- It seeds `Math.random`, so adding or reordering random calls changes orders and looks but must
  not change the first round.

## Making common changes

- Add a sword tier: append to `SWORDS` in `src/game/swords.ts` and a `Look` to `LOOKS` in
  `src/art/swords.ts` (it must have one per tier or `bakeSwords` crashes). The 18x18 canvas in
  `bakeSword` already clips the tier 8 blade tip, so a tier 9 needs a bigger canvas or a shorter
  blade.
- Add an upgrade: add the id to `UpgradeId` and `UPGRADES` in `src/game/upgrades.ts` (with `after`
  if it waits for others), its rank 0 in `freshProgress` in `src/game/state.ts`, its effect where
  the rule lives (a helper like `forgeMs`), and a y in `UPGRADE_BUTTONS.ys` in
  `src/scenes/layout.ts`. The three buttons already fill the left column down to the bottom edge,
  so a fourth needs a new place or smaller buttons.
- Retune timing or prices: edit the constants above. Check the test still holds (first visitor
  within 5s, forge time above 192ms and under 5s, Shortsword price matching `SHORTSWORD_PRICE`).
- Add an adventurer look: add a head to `HEADS` and a palette to `PALETTES` in
  `src/art/characters.ts`, then change the hard-coded 4 in `arrive`.
- Add an effect for a new rule: push a new `GameEvent` kind from `src/game/sim.ts` and handle it
  in `GameScene.drawEvents`.

## Gotchas

- `drawHud` clears the `hud` graphics and `drawForge` then paints the heat bar into it, so
  `drawForge` must run after `drawHud` in `update`.
- `HEAT_BAR.x` is hand-matched to `FORGE_BUTTON` (130 - 90); move them together.
- `deskAt` and `slotAt` hit whole cells and boxes, while sprites sit `SWORD_LIFT` above an anvil's
  centre; the test's slot spots include that lift.
- `drop` onto a different-tier sword swaps rather than failing, and returns true, so it saves.
- Dropping on a desk with nobody there does nothing; the sword returns to its slot.
- Visitor containers are built once in `makeVisitor` and never refreshed; anything about an
  adventurer that changes over time must be drawn in `drawMarks` (like the patience bar).
- All browser storage must stay prefixed `anvilheart-`, since every game shares the hub's origin.
