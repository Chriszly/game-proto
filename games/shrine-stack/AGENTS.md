# Shrine Stack: guide for agents

How Shrine Stack is built and where things stand, for agents changing it. README.md covers how to
play and the blessings. Keep this file up to date with any change to the game, per the root
AGENTS.md.

## Current state

Shrine Stack is a one-button stacking game. A stone swings left and right above the temple; a tap
drops it, the part hanging over the stone below breaks off, and the next stone is as wide as what
is left. Every three stones make a tier; a balanced tier (every stone kept at least `BALANCE` of
its width) earns favor and offers three blessings, one of which the player keeps; favor rerolls
the offer or buys one-time help, and a curse taken with the blessing doubles the next tier's
favor. From tier 2 stones come heavy or light and each tier sets a trial. Tier 10 is gilded (double
favor) and finishing tier 12 crowns the shrine and wins; the player can then keep building into an
endless, gusty sky.

Implemented today:

- One screen (`GameScene`): a dusk sky with stars, moon, parallax mountains and clouds; the hill
  and the stepped plinth; the temple, with a camera that follows its top up; the swinging stone
  and a dotted drop guide; a left panel with the tier, tier pips, favor, built and best, the next
  stone's kind, the trial, the curse in force, blessings, the goal box (a pip per tier up to `GOAL_TIER`, the gilded one framed) and a rules
  blurb; popups ("+1", "Perfect! +3"); tumbling debris for cut pieces and
  missed stones; gold trim and lanterns on balanced tiers; a banner for wobbly tiers, chosen
  blessings, Mason's Grace, the gilded tier and the crown; the break between tiers (blessing cards
  with a Reroll button, the curse toggle and the favor shop; after a wobbly tier only the shop
  and "Build on"); heavy (darker, iron-strapped) and light (pale, porous) stones; gilded stones
  (leaf gold, `GILT`) on tier `GILDED_TIER`; a gold crown on the finished shrine; gust streaks by
  the stone and a gust readout at the top in the endless sky; and an end panel (fallen or crowned,
  the crowned one with "Keep building") with "Build again".
- Five blessings (`BLESSINGS` in `src/game/blessings.ts`), offered three at a time, repeatable.
- Swing speed rises 5% per tier (`TIER_SPEEDUP`); `swingSpeed` adds the stone's kind, a slow drop
  and Haste on top of `speed`, which stays the tier's speed.
- Reroll: `reroll` spends `REROLL_COST` (5) favor for a new offer (and a new curse) while choosing.
- Favor shop (SS1): `buy` spends favor during a break on `SHOP` items (`src/game/catalog.ts`),
  each once per break (`bought`): `slow` (the stone in hand swings at `SLOW_MULT`, cleared when it
  lands), `wider` (top stone grows `WIDER_PX`, up to `PLINTH_W`) and `grace` (+1 grace). A
  wobbly tier opens a break with an empty `offer` when `favor >= CHEAPEST`; `buildOn` ends it.
- Stone kinds (SS2): from tier `KINDS_FROM_TIER` (2) a stone is `heavy` (`HEAVY_CHANCE`, swings at
  `KIND_SPEED.heavy`, a non-perfect drop cracks `HEAVY_CRACK` more off) or `light`
  (`LIGHT_CHANCE`, `KIND_SPEED.light`, `LIGHT_FAVOR` more favor); `nextKind` is rolled in `spawn`.
- Trials (SS3): from tier `TRIALS_FROM_TIER` (2) every tier gets a `trial` (`perfect`: three
  perfect drops, or `keep`: every stone keeps `TRIAL_KEEP`), rolled when the tier before finishes;
  meeting it adds `TRIAL_FAVOR` (times `favorMult`).
- Endless sky (SS4): `keepBuilding` after the crown sets `endless` and spawns the next stone; each
  stone then gets a `wind` from `gust` (chance `GUST_CHANCE`, strength `WIND_BASE` +
  `WIND_PER_TIER` per tier past 13, up to `WIND_MAX`) that pushes it sideways while it falls.
- Curses (SS5): a balanced tier's break offers `curseOffer` (`haste`, `brittle`, `dim`);
  `toggleCurse` sets `cursed`, and `chooseBlessing` then puts `curse` on the tier being started.
  `curseNow` says if it is in force; `favorMult` doubles (`CURSE_MULT`) every favor of that tier.
  Haste multiplies `swingSpeed` by `HASTE`, Brittle cracks `BRITTLE_CRACK` more off each cut, and
  Dimness hides the drop guide (scene only).
- Gilded tier: stones placed on tier `GILDED_TIER` (10), and its balance bonus, earn
  `GILDED_MULT` (2) times the favor (`gild`, `stoneFavor`).
- Goal: finishing tier `GOAL_TIER` (12) sets phase `crowned`, the win; no blessing is offered then.
  In the endless sky the run ends only on a miss; `best` keeps counting tiers.
- The game ends on a miss (a stone keeping less than `MIN_W`) unless Mason's Grace catches it.

Missing or rough:

- No title screen, sound or pause. Only the best height persists; a reload starts a new temple.
- The endless sky has no blessings or shop past what tiers give; gusts are the only new pressure.
- A tap is ignored while a stone falls; a tap during the blessing choice lands on the dim.
- The clouds stop about 16000 pixels up (`createBackdrop`), roughly 190 tiers.
- `docs/screenshots/game-over.png`, `gilded.png`, `crowned.png`, `wobbly-break.png`,
  `shop-bought.png`, `curse-taken.png`, `stone-kinds.png`, `endless-gust.png` and `cover.png` (a copy of `gilded.png`) are not produced
  by the test; refresh them by hand (play several tiers in the dev
  build) if the look changes.

## Architecture

File map (`src/`):

- `main.ts`: creates the `Phaser.Game` (960x540 from `VIEW`, `Phaser.Scale.FIT`,
  `pixelArt: true`) with `GameScene` only, calls `setupGame(game)` from `shared/setupGame.ts`, and
  in dev builds puts `game` on `window`.
- `game/state.ts`: the tuning constants (`TOWER_X`, `PLINTH_W`, `START_W`, `STONE_H`, `DROP_GAP`,
  `SWING`, `BASE_SPEED`, `TIER_SPEEDUP`, `CALM`, `GRAVITY`, `PERFECT_PX`, `STEADY_PX`, `BROAD_PX`,
  `STONES_PER_TIER`, `BALANCE`, `PERFECT_FAVOR`, `TIER_FAVOR`, `OFFER_SIZE`, `MIN_W`,
  `REROLL_COST`, `GILDED_TIER`, `GILDED_MULT`, `GOAL_TIER`, `SLOW_MULT`, `WIDER_PX`,
  `KINDS_FROM_TIER`, `HEAVY_CHANCE`, `LIGHT_CHANCE`, `KIND_SPEED`, `HEAVY_CRACK`, `LIGHT_FAVOR`,
  `TRIALS_FROM_TIER`, `TRIAL_KEEP`, `TRIAL_FAVOR`, `CURSE_MULT`, `HASTE`, `BRITTLE_CRACK`,
  `GUST_CHANCE`, `WIND_BASE`, `WIND_PER_TIER`, `WIND_MAX`), the types (`Phase`, `Stone`,
  `Moving`, `Trial`, `Drop`, `GameEvent`, `GameState`) and the rules (`speedFor`, `newGame`,
  `stackHeight`, `topOf`, `curseNow`, `swingSpeed`, `tick`, `drop`, `chooseBlessing`,
  `canReroll`, `reroll`, `canBuy`, `buy`, `toggleCurse`, `buildOn`, `keepBuilding`, `gild`,
  `favorMult`, `stoneFavor`; `spawn`, `kindFor`, `gust`, `land`, `pickOffer`, `pickCurse`,
  `widenTop` and `endBreak` are private). No Phaser; `speedFor` reads `byDifficulty` from `shared/settings.ts`.
- `game/blessings.ts`: `BLESSINGS`, `BlessingId` and `BLESSING_INFO` (name, card text, colour).
- `game/catalog.ts`: `SHOP`/`ShopId`/`SHOP_INFO` (name, cost, colour) and `CHEAPEST`,
  `KINDS`/`StoneKind`/`KIND_INFO`, `TRIALS`/`TrialId`/`TRIAL_INFO` and
  `CURSES`/`CurseId`/`CURSE_INFO`.
- `game/save.ts`: `loadBest` and `saveBest`.
- `scenes/GameScene.ts`: everything drawn, plus `drawStone`, `tierColor`, `shade`, `seeded`,
  `pin` and `place` helpers and the `UiPart` type.
- `scenes/layout.ts`: `VIEW`, `PLINTH_Y`, `TOP_SCREEN_Y`, `PANEL`, `CARDS`, `BUTTON`,
  `OFFER_TITLE`, `REROLL`, `CURSE`, `SHOP_TITLE`, `SHOP_ROW`, `BUILD_ON`, `GOAL`, `UI_DEPTH`,
  `FONT`.
- `ui/Button.ts`: `makeButton`, the captioned buttons on the end panel (returned as loose parts).

Shared code it imports (outside the game folder): `shared/setupGame.ts` (`setupGame`) and
`shared/settings.ts` (`byDifficulty`, `settings`).

How it runs:

- Coordinates: stone `x` values are view pixels (the temple's middle is `TOWER_X`); heights are
  pixels above the plinth's top. The scene turns a height into a world y with
  `PLINTH_Y - h`. The camera only scrolls vertically: `update` eases `scrollY` towards keeping
  the temple's top at `TOP_SCREEN_Y`.
- Time: `GameScene.update(time)` takes `dt` from the frame timestamp, clamped to `MAX_STEP_MS`,
  and calls `tick(state, dt)`. `tick` moves the swinging stone at `swingSpeed` (bouncing at
  `TOWER_X ± SWING`) or makes the falling one fall under `GRAVITY`, pushed by `wind`, until it
  reaches the temple's top, then `land` runs.
- `land` decides perfect (within `perfectPx`, and only when the overlap would also reach
  `MIN_W`: snap to the stone below, keep the full width), cut (keep the overlap,
  centred on it, less any heavy or Brittle crack) or miss (overlap under `MIN_W`), adds favor,
  marks the tier wobbly when the share kept is under `BALANCE`, updates the trial, and on the third
  stone of a tier finishes it: a met trial adds `TRIAL_FAVOR` and a balanced tier `TIER_FAVOR`
  (both times `favorMult`), `tier` goes up, the curse ends and the next trial is rolled. The goal
  tier then moves to `crowned` and stops (unless `endless`); otherwise a balanced tier moves to
  the `blessing` phase with `offer` and `curseOffer` set, and a wobbly one does too, with an empty
  offer, when favor reaches `CHEAPEST`. Then it spawns the next stone from the side opposite the
  last.
- Events: the rules push `GameEvent`s (`placed` with the favor it earned, `missed`, `tier`,
  `trial` (failed mid-tier, or passed with its favor), `rerolled`, `bought`) onto `state.events`; the scene drains them each frame in `show`, which draws the new
  stone, debris, popups, glow, lanterns, the crown and banners. Nothing else in the scene changes state.
- Input: one interactive zone over the whole view calls `drop`. The break layer (an interactive
  dim, the cards, the Reroll button, the curse toggle, the shop buttons, or "Build on") and the
  end layer (with "Build again" and "Keep building") sit above it and swallow taps. A reroll, a
  buy or the curse toggle sets `offerKey` to `'#'`, so `refresh` rebuilds the layer on the next
  frame, not inside the button's own tap. The end panel waits `CROWN_MS` of game time after
  the crown so the crowned shrine shows first. Everything on
  screen that stays put has scroll factor 0. Anything tappable is a loose game object, never
  inside a container: the break's parts live in `offerParts` (added with `addOffer`, buttons
  positioned with `place`) and the end panel's in `gameOver`, `againButton`, `againBeside` and
  `keepBuildingButton`; `makeButton` returns its parts. Only the banner, which takes no taps, is a
  container (fixed with `pin`).
- Rendering: placed stones are one `Graphics` each in `stoneViews`, drawn once (redrawn only by
  Broad Stones and the Wider stone, in `redrawTop`); ornaments are one `Graphics` per balanced tier in `ornaments`. The swinging stone
  is redrawn only when its width, tier or kind changes; the drop guide and gust streaks are
  redrawn every frame. The break layer is rebuilt when the offer changes (`offerKey`). The crown
  is one `Graphics`, destroyed by "Keep building". Panel texts are set every frame (Phaser skips unchanged text).

State model (`GameState`): `phase` (`swinging`, `falling`, `blessing`, `over`, `crowned`), `stones` (bottom
first), `moving`, `tier` and `inTier`, `wobbly`, `tiersBuilt`, `balancedTiers`, `favor`,
`blessings` (in the order chosen) and `offer`, the blessing-driven `speed`, `perfectPx`,
`favorPerStone` and `grace`, `dropped` (misses included), `lastDrop`, `best`, `nextKind`, `slow`,
`bought`, `trial`, `curseOffer`, `cursed`, `curse` (`{ id, tier }`), `endless`, `wind` and
`events`. `Stone` and `Moving` carry a `kind`. Only
`src/game/state.ts` mutates it. `moving` exists in every phase; it simply does not move outside
`swinging`/`falling`.

Persistence: one `localStorage` key, `shrine-stack-best`, holding the most tiers built in one
temple. The scene writes it when a tier finishes and on game over. The hub's settings are read
from the shared `hub-settings` key, not from this game's save.

Randomness and timing: `Math.random` is used only in the rules: `pickOffer`, `pickCurse`,
`kindFor` (from the third stone), the trial roll in `land` and `gust`. Stars, mountains and clouds use `seeded` in `GameScene.ts`. All rule timing is game time
from `tick`; tweens are cosmetic only.

### Hub settings

- `src/main.ts` calls `setupGame(game)` right after creating the game, which applies the frame cap, the FPS readout, reduced motion and full screen (camera shake and flash become no-ops; the miss shake is
  the only one here).
- Difficulty scales one number: the swing speed. `speedFor` multiplies `BASE_SPEED` by
  `byDifficulty(0.8, 1, 1.25)` (Easy, Normal, Hard). Nothing else changes.
- `settings.reduceMotion` also stops the blessing card icons' gentle pulse in
  `drawBlessingIcon`. Debris, popups and the glow are single, non-blinking tweens and stay.
- Keep Normal exactly as designed: the playthrough runs on Normal and expects a speed of 230.
- Keep the Shrine Stack row of the root README's difficulty table, and the difficulty line in this
  game's README, in sync with the `byDifficulty` values.

## Testing hooks

- `src/main.ts` exposes `window.game` in dev builds. The test reads `game.scene.getScene('Game')`
  and its `state` (copied through JSON, without `events`), `blessingCards` (`{ id, x, y, w, h }`
  per card, in view pixels), `rerollButton` (`{ x, y, w, h }` while choosing, else null),
  `shopButtons` (`{ id, x, y, w, h }`), `curseToggle` and `buildOnButton` (`{ x, y, w, h }` or
  null) during a break, and `keepButton` while the crowned panel shows.
- Inputs: it taps the sky at (860, 200) to drop, waiting frame by frame until the swinging
  stone's middle is within 12 pixels (`AIM_PX`) of the middle of what it lands on; it taps a
  card's centre from `blessingCards`, taps the centre of `rerollButton` once before choosing,
  and taps (480, 520) on the dim to check it does nothing (keep the shop row above it). It checks
  the curse toggle and the three shop buttons are there but takes neither: purchases stay out of
  the first round.
  The sky point must stay clear of the panel; the cards are not shown when it is tapped.
- Mirrored in `e2e/playthrough.spec.ts`, so change them together: the `GameState` field names,
  `VIEW`, `TOWER_X`, `PLINTH_W`, `START_W`, `STONE_H`, `DROP_GAP` (as the literal 120), the Normal
  speed 230, `STONES_PER_TIER`, `BALANCE`, `PERFECT_FAVOR`, `TIER_FAVOR`, `BROAD_PX`, `CALM`,
  `TIER_SPEEDUP`, `STEADY_PX`, `REROLL_COST`, favor per stone starting at 1, `SHOP` order,
  ordinary stones and no trial on tier 1 (`KINDS_FROM_TIER`, `TRIALS_FROM_TIER` at 2), the scene key `'Game'` and the save
  key `shrine-stack-best`.
- It saves `playthrough-0-start`, `-1-first-stone`, `-2-blessing` and `-3-tier-2` screenshots;
  copy them into `docs/screenshots/` when the look changes.

## Making common changes

- **Add a blessing**: add its id to `BLESSINGS` and its `BLESSING_INFO`, its effect in
  `chooseBlessing`, its emblem in `GameScene.drawBlessingIcon`, a README row, and a case in the
  test's `switch` (the seeded offer may change which card is first).
- **Retune**: the constants at the top of `src/game/state.ts` (shop prices in
  `src/game/catalog.ts`); mirror the changed ones in the test.
- **Add a shop item, curse or trial**: its id and info in `catalog.ts`, its effect in `buy`,
  `land`/`swingSpeed` or the trial check in `land`, and an icon in `drawShopIcon` for a shop item
  (a fourth shop button needs `SHOP_ROW.xs` widened).
  Moving `GOAL_TIER` past 13 needs a wider goal box (`GOAL` in layout); the first round must keep
  enough favor for one reroll, or the test's reroll step fails.
  Changing `STONES_PER_TIER` also changes the panel pips and the test's loop.
- **Change the look of stones**: `drawStone` (which also draws the kinds) and `TIER_COLORS` in
  `GameScene.ts`. Stones are drawn
  with their bottom middle at the graphics' origin.
- **Move things**: `src/scenes/layout.ts` for the panel, cards, plinth and camera; `TOWER_X` lives in
  `state.ts` because the rules use it.

## Gotchas

- Phaser registers new interactive objects on the next frame, so the blessing cards ignore a tap
  in the same frame the tier finished. Real taps never come that fast; a test should play a frame.
- Phaser misplaces taps on interactive objects inside a container once the camera has scrolled,
  even with scroll factor 0 all the way down: the blessing cards and "Build again" used to stop
  working from about tier 5. Keep tappable things out of containers.
- Broad Stones and the Wider stone widen the top stone in the rules; the scene redraws it (and
  its tier's lanterns, if it has them) in `redrawTop`. Anything new that changes a placed stone
  needs the same.
- `land` spawns the next stone even when the phase becomes `blessing`, so `moving.w` already
  matches the top stone while choosing; Broad Stones updates it again.
- Never use a red cross in any art (root AGENTS.md).
