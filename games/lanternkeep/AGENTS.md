# Lanternkeep: guide for agents

How Lanternkeep is built and where things stand, for agents changing it. README.md covers how to
play, the upgrade table and the numbers. Keep this file up to date with any change to the game, per
the root AGENTS.md.

## Current state

Lanternkeep is a real-time juggling game on one fixed screen, played as a shadow-puppet theatre: a
castle of black cut card in front of a backlit paper screen, with lantern spots and a jar of moths
at the gate. Tapping a lantern sends an idle moth to light it (or refill a lit one); a tap while
every moth is busy waits in a queue of two. The moths come in three kinds (fast, slow, heavy). Lit
lanterns burn oil and go dark when it runs out. When the 45 second dusk ends, the lanterns still
lit pay coins, and too few lit costs a hearth (a life). Each night has a herald's order (a bonus
goal), gusts that blow out a warned lantern unless a moth sits on it, and close-call refills that
pay at once. Every night after the first draws a kind (clear, foggy, feast, stormy), bats come for
lit lanterns from night 3 and are chased off by tapping them, and lanterns side by side form
chains that pay when all of them are lit at nightfall. Between nights a panel shows the tally,
the festival count, the next night's kind and five upgrades (one buys fireflies, which light two
lanterns a flight); each night adds a lantern. Ten nights kept reach the Great Festival, a win,
with endless nights after.

Implemented today:

- One scene (`GameScene`): the paper screen crossfading from saffron through deep dusk to indigo
  with stars and a rising moon, the cut-card castle, lanterns with additive glow, flickering
  flames and oil bars, punched-hole rings (faint on a dark lantern, amber with a place badge on a
  queued one, filling while a moth lights one, pale blue while a moth guards one), moth puppets
  with a pale halo and dotted trails home, the herald's order card, the gust warning (wind curls,
  dashed ring, "Gust in Ns" plaque with a pointer), the "Save it +2c" tag and orange rings on
  nearly dry lanterns, popups ("+2c close call!" with a flare and sparks, "Shielded!",
  "Blown out!", "+5" per lantern and "+15 order kept" at nightfall), a HUD (night, hearths,
  coins, dusk bar with the queue count, lit count and quota), the night panel (tally, upgrades,
  "Next dusk"), a game-over panel ("New keep") and the Great Festival panel (sky lanterns,
  "Keep going"). Also the night-kind plaque (top right), mist (`fog`), bunting and rain layers,
  the chains' dotted cords (faint, amber when all lit), bat puppets with a dotted line to their
  lantern and a punched ring (pale blue once chased), and popups "Snuffed!", "Driven off!",
  "Chased off!" and "+8 chain".
- Shadow-puppet art, painted on 2D canvases at startup (`art/puppet.ts`, `pixelArt: false`),
  ported from the approved mockup's drawing script. Lettering is a system serif stack.
- Three moth kinds: `fast`, `slow` and `heavy`, cycling in jar order, so the first night's three
  moths are one of each. Each kind scales its speed, wick time and (heavy only) oil.
- Two-tap queue: a tap on an unclaimed lantern while every moth is busy waits (at most `QUEUE_MAX`
  = 2); a moth that comes home takes the oldest. The queue empties at nightfall.
- Herald's order: `ORDERS` (five, one a night in turn) of three goal kinds, `lit` (named lanterns
  lit at nightfall), `closeCalls` and `shields` (counts this dusk). Met at nightfall it adds its
  `reward` (15) to the night's pay.
- Gusts: `gustsFor(night)` gives the dusk-left times they hit (night 1 one, nights 2 and 3 two,
  then three). `GUST_WARN_MS` (5 s) before one, it picks the lit lantern with the most oil and
  sets `state.gust`; a moth lighting or guarding that lantern when it hits shields it, otherwise
  the lantern goes dark. A moth that finishes lighting the warned lantern stays on it (`guard`)
  until the gust passes.
- Close calls: a moth that reaches a lit lantern with under `CLOSE_CALL` (15%) of its oil marks a
  close call; when it finishes the refill the game pays `CLOSE_CALL_PAY` (2) coins at once. A
  lantern a moth sits on (lighting or guarding) burns no oil.
- Nights without end: `lanternsFor` adds one lantern a night up to the ten in `LANTERN_SPOTS`.
- Kinds of night (LK1): `NIGHT_KINDS` (`clear`, `fog`, `feast`, `storm`). `drawKind` keeps night
  1 clear and draws later kinds with `Math.random` at the nightfall before (`state.nextKind`), so
  the panel can show it; `nextDusk` moves it to `state.kind`. Fog burns oil `FOG_BURN` (1.4x)
  faster, a feast multiplies the lantern pay, all-lit bonus and chains by `FEAST_PAY` (2, not the
  order), and a storm adds `STORM_GUSTS` (28 s and 16 s) through `gustsFor(night, kind)`.
- Bats (LK2): `batsFor(night)` gives the dusk-left times they come (none on nights 1 and 2, one on
  3 to 5, then two). A bat enters from a side edge at `BAT_Y`, flies at `BAT_SPEED` to the lit
  lantern with the most oil (re-targeting if that goes dark, leaving if none is lit) and snuffs
  it, unless a moth sits on it. `chase(s, id)` sends an idle moth (not a firefly if another is
  idle) with task `chase`; catching the bat makes it flee (`BAT_FLEE` times faster, off the top
  corner) and counts `state.chased`. A chase is never queued.
- Lantern chains (LK3): `CHAINS` in `places.ts`, four of three lanterns each. `chainsFor(s)` lists
  the chains whose lanterns all exist this night (none on night 1), `chainLit` whether one is all
  lit. Each lit at nightfall pays `CHAIN_BONUS` (8).
- Fireflies (LK4): the `firefly` upgrade (two levels) adds a `firefly` moth after the regular ones.
  `send` sends an idle firefly first. `dispatch` gives it `hops` = `FIREFLY_LANTERNS` - 1; after
  lighting, `nextHop` takes the oldest unclaimed queued tap or the nearest dark unclaimed lantern
  and it flies on (unless a gust makes it guard).
- The Great Festival (LK5): the nightfall that brings `kept` to `FESTIVAL_NIGHTS` (10) sets
  `state.festival`, `report.festival` and phase `'festival'`; `carryOn` moves on to `'night'`.
- Five upgrades (four of three levels, Firefly of two), bought between nights. Only the most
  nights kept persists.

Missing or rough:

- No title screen, sound or pause. The kinds, bats, chains, fireflies and the festival are not
  exercised by the playthrough (night 1 is clear with no bats or chains), only by hand and the
  scratch staging script.
- Moths fly straight lines.
- The upgrade buttons are not exercised by the playthrough (purchases stay out of it), only by
  hand.
- Canvas `filter: blur` (the card's soft shadows and the far hills) is ignored by Safari, so those
  edges are hard there.
- `docs/screenshots/hub-card.png` and `favicon.png` are old captures of the hub card and favicon,
  not referenced anywhere.

## Architecture

File map (`src/`):

- `main.ts`: creates the `Phaser.Game` (960x540, `Phaser.Scale.FIT`, `pixelArt: false`) with
  `BootScene` and `GameScene`, calls `setupGame(game)` from `shared/setupGame.ts`, and in dev
  builds puts `game` on `window`.
- `scenes/BootScene.ts`: calls `bakeTextures`, then starts `Game`.
- `scenes/GameScene.ts`: builds the world, order card, gust plaque, HUD and panels once; `update`
  ticks the rules, turns `state.events` into popups and redraws from state.
- `scenes/layout.ts`: `VIEW`, `HUD`, `DUSK_BAR`, `NIGHT_PANEL`, `SHOP` (two columns, three rows;
  a last card alone sits in the middle), `NEXT_BUTTON`, `SMALL_PANEL` (game over and festival),
  `BUTTON`, `ORDER` (the order card), `KIND_TAG` (the night-kind plaque), `GUST_TAG` (the gust
  plaque's size), `LANTERN_HIT`, `BAT_HIT`, `UI_DEPTH` and `FONT` (Georgia / DejaVu Serif / serif).
- `game/places.ts`: `JAR`, `LANTERN_SPOTS` (view pixels, in the order nights add them), `CHAINS`
  and `mothRest` (30 px apart on the jar's rim).
- `game/state.ts`: `GameState`, `Lantern`, `Moth`, `Bat`, `Gust`, `GameEvent`, `Order`,
  `OrderGoal`, `NightReport`, `NightKind`, the balance constants, `MOTH_KINDS`, `KIND_ORDER`,
  `FIREFLY_LANTERNS`, `QUEUE_MAX`, `GUST_WARN_MS`, `gustsFor`, `NIGHT_KINDS`, `drawKind`,
  `FOG_BURN`, `FEAST_PAY`, `STORM_GUSTS`, `BAT_SPEED`, `BAT_FLEE`, `BAT_Y`, `batsFor`,
  `CHAIN_BONUS`, `chainsFor`, `chainLit`, `FESTIVAL_NIGHTS`, `CLOSE_CALL`, `CLOSE_CALL_PAY`,
  `ORDERS`, `orderFor`, `orderProgress`, `UPGRADES`, `stats`, `mothSpeed`, `mothLightMs`,
  `newGame`, `send`, `chase`, `tick`, `nextCost`, `buy`, `carryOn` and `nextDusk`. No Phaser;
  `baseBurnMs` reads `byDifficulty` from `shared/settings.ts`.
- `game/save.ts`: `loadBest` and `saveBest`.
- `art/puppet.ts`: `bakeTextures` and the painters. Full-screen layers are painted at 1x
  (`screen-0/1/2`, `castle` with the jar, `stars`), sprites and plaques at `RES` = 2 and drawn at
  scale 1 / `RES`: `moon`, `glow`/`glow-pale` (additive), `lantern-lit`/`-dark`
  (origin 36/56 down), `flame`, `moth-<kind>-up`/`-down` (`MOTH_LOOK`: size and gel colour),
  `hud`, `dusk-fill` (cropped to the dusk left), `dusk-rim`, `sun`, `hearth-lit`/`-out`, `coin`,
  `order-card`, `pip-lit`/`-dark`, `gust-tag`, `kind-tag`, `kind-<kind>` (the plaque's emblems),
  `save-tag`, `spark`, `bat-up`/`-down`, `sky-lantern`, `panel`, `panel-small`, `card-on`/`-off`,
  `btn`/`btn-hover`, and full-screen 1x layers `fog` and `bunting`. Plaques, cards and panels are baked with `PAD` pixels of
  room for their shadow; place them at (x - `PAD`, y - `PAD`) with origin 0. Also exports `INK`,
  `INK_HEX`, `DUSK` (layout's `DUSK_BAR`) and `SCREENS`.
- `ui/Button.ts`: `makeButton`, the carved card button (texture swap on hover, a `Zone` for taps).

Shared code it imports (outside the game folder): `shared/setupGame.ts` (`setupGame`) and
`shared/settings.ts` (`byDifficulty`, `settings`).

How it runs:

- `update(time)` computes `dt` from the frame timestamp (clamped to `MAX_STEP_MS`), calls `tick`,
  drains `state.events` into popups, and on a phase change saves the best and starts the nightfall
  popups. Then it sets every image from state (screens, lanterns, moths, tags, HUD, panels) and
  redraws the Graphics layers (`marks`: oil bars and rings; `wind`; `trails`; the gust pointer;
  `cords`: the chains; `rain`; `batMarks`: bat lines and rings).
- `tick` only runs in `'dusk'`: oil burns (faster on fog; not on a lantern a moth sits on), then
  each moth moves at its kind's speed (`out` to its lantern, `lighting` for its kind's
  `mothLightMs`, then `guard` if a gust is warned for that lantern, else a firefly's next hop or
  `home` to its rest spot, then `idle`; `chase` follows its bat). Then `wind` warns or blows the
  gust, `raiders` brings in and moves the bats, a moth that is idle takes the oldest queued tap,
  the dusk clock runs down and `nightfall` scores (lanterns, all-lit bonus and chains, doubled on
  a feast, then the order), draws the next kind and checks the festival. A lantern lit on the
  last tick counts.
- Input: one `Zone` per lantern spot calls `send`; one `Zone` per bat (depth 7.5, above the
  lanterns' zones, moved off screen when unused) calls `chase`; the shop cards' zones call `buy`;
  "Next dusk" calls `nextDusk`, "Keep going" `carryOn`, and "New keep" `restart`.
- Panels open `PANEL_DELAY_MS` after nightfall so the popups show first; `panelOpen` says when.

State model (`GameState` in `src/game/state.ts`):

- `phase` is `'dusk'`, `'night'` (panel open, shop live), `'festival'` (the Great Festival's
  panel, once) or `'over'`. `duskMs` counts down.
- `lanterns[i]` sits at `LANTERN_SPOTS[i]`: `lit`, `oilMs` left of `oilMaxMs`, `claimed` while a
  moth is on its way to it, lighting it or guarding it.
- `moths[i]` has a `kind`, a position, a `task` (`idle`, `out`, `lighting`, `guard`, `chase`,
  `home`), its `target` lantern, `lightingMs`, `closeCall` (set when it arrived at a nearly dry
  lantern), `bat` (the id it chases) and `hops` (lanterns left on a firefly's flight).
- `kind` and `nextKind` are this night's and the next night's kind. `batTimes` are the bats still
  to come, `bats` those on screen (`id`, position, `target`, `task` `fly` or `flee`), `nextBat`
  the next id and `chased` the bats chased off this dusk. `festival` is set once the Great
  Festival is reached.
- `queue` holds lantern indexes whose taps wait for a moth, oldest first, at most `QUEUE_MAX`.
  `send` queues a tap only when no moth is idle and the lantern is not claimed or already queued;
  otherwise the tap is lost.
- `order` is the night's `Order`; `orderProgress(s)` gives `{ done, of }`.
- `gusts` are the dusk-left times of the gusts still to come; `gust` is the warned one
  (`{ target, atMs }`) or null. `closeCalls` and `shields` count this dusk's.
- `events` lists `closeCall`, `gust`, `bat` (snuffed or driven off) and `chased` events since the
  scene last looked; the scene empties it.
- `levels` per upgrade; `stats(s)` turns them into moth count, speed, wick time and burn time.
- `report` is the last nightfall's tally (`lit`, `count`, `required`, `earned` with the order's
  reward, `lostHearth`, `orderMet`, `chains` lit, `festival`); `kept` counts nights that met the
  quota, `best` the most.

Persistence: one `localStorage` key, `lanternkeep-best`, holding the most nights kept, written when
nightfall ends a dusk (to night or game over). The hub's settings are read from the shared
`hub-settings` key.

Randomness and timing: the only `Math.random` in the rules is `drawKind` (never on night 1, so the
playthrough's night is fixed, and the test seeds it anyway); no `Date.now` or `performance.now`.
Gust and bat targets, bat edges and orders are deterministic. Game time is the frame timestamps `update` receives. The art uses a
seeded generator in `puppet.ts`. Popups, flares and sparks are cosmetic Phaser tweens.

### Hub settings

- `src/main.ts` calls `setupGame(game)` right after creating the game (frame cap, FPS readout, reduced motion and full screen).
- Difficulty scales one number: the burn time, `baseBurnMs()` = `byDifficulty(26_000, 20_000,
  16_000)`. Keep Normal at 20 s: the playthrough expects it. The moth kinds, the queue, the gusts,
  the close-call share, the orders, the kinds of night, bats, chains and the festival are not
  scaled by difficulty.
- `settings.reduceMotion` holds still: the moths' wing flaps (wings stay up) and bobbing, the
  lantern glow's and flame's flicker, the pulse of the close-call rings, the spin of the gust's
  dashed ring and the travelling gust along its wind curls, the rise of popups (they only fade)
  and the spread of the close-call sparks, the drift of the fog, the falling rain (drawn still),
  the bats' flapping and bobbing and the rising sky lanterns. The game uses no camera shake or
  flash.
- Keep the Lanternkeep row of the difficulty table in the root README and the line in this game's
  README in step with the `byDifficulty` values.

## Testing hooks

- `window.game` in dev builds. The test reads `game.scene.getScene('Game')` and its `state`
  (copied through JSON) and `panelOpen`. `shopButtons`, `nextButton` and `carryOnButton` give the
  panel buttons in view pixels, for tests that go past the first night.
- Inputs: it clicks lanterns at their `x`, `y` from state, scaled by the canvas bounding box.
- The test mirrors these, so change them together: `DUSK_MS` (45 s), the first night's five
  lanterns and quota of three, three moths in kind order (fast, slow, heavy), three lives, the 20 s
  burn, the pay (5 a lantern, 10 bonus), night 1's order (lanterns 0, 1, 2 for 15), night 1's one
  gust at 34 s left warned 5 s before, the close call (under 15%, 2 coins), the scene key `'Game'`
  and the fields above (`queue`, `order`, `gusts`, `gust`, `closeCalls`, `shields`, `kind`
  `'clear'`, empty `batTimes`, and the report's `chains` 0 and `festival` false too).
- The timing matters. It lights lantern 0 at the start (lit about 41 s left); when the gust is
  warned (39 s left) it taps lantern 0 again, and the fast moth refills it and guards it until the
  gust passes (34 s left); the lantern burns no oil meanwhile, so it runs low (under 15%) at about
  17 s left. Then it taps lanterns 0, 1 and 2 (one moth each; lantern 0's refill is the close
  call) and 3 and 4, which queue and are taken as moths come home. The last lantern is lit about
  10 s after the wave, before nightfall. Slower moths, longer wicks, far lantern spots or moved
  gusts can break that; re-check the margins after changing `BASE_SPEED`, `BASE_LIGHT_MS`,
  `MOTH_KINDS`, `LANTERN_SPOTS`, `JAR`, `mothRest`, `gustsFor`, `GUST_WARN_MS` or `CLOSE_CALL`.
- It saves `playthrough-0-dusk`, `-1-first-lantern`, `-2-gust-shield`, `-3-all-lit` and
  `-4-night` screenshots; copy them into `docs/screenshots/` when the look changes.
- `cover.png` and `docs/screenshots/loop-herald-order.png`, `loop-gust-shield.png` and
  `loop-close-call.png` were staged with a scratch Playwright script against the dev server: it
  sets `state` fields through `window.game` (night 4 at 17 s left, eight lanterns, four moths, a
  warned gust, a queued tap; for the order shot night 3 with the close-call order at 1/2) and
  pushes a `closeCall` event onto `state.events`. Refresh them the same way.
- `loop-foggy-night`, `loop-feast-chains`, `loop-stormy-night`, `loop-bat-chase`, `loop-firefly`,
  `loop-great-festival` and `loop-night-panel` were staged the same way: end night 1 by setting
  `duskMs`, set `night` and `nextKind` and click "Next dusk" (the Firefly card for the firefly
  shot), light lanterns through state, push a bat time onto `batTimes` and click the bat, or set
  `kept` to 9 before nightfall for the festival.

## Making common changes

- **Retune a night**: the constants at the top of `src/game/state.ts`, `lanternsFor` and
  `requiredFor`; update the README and the test's constants.
- **Add or change an order**: a row in `ORDERS` (its `lit` lanterns must exist on every night it
  comes round on: night n has `lanternsFor(n)` lanterns). `GameScene.drawOrder` shows up to three
  pips; a goal with more needs more `orderPips`. Night 1's order is mirrored in the test.
- **Retune gusts**: `gustsFor` and `GUST_WARN_MS` in `state.ts`; night 1's gust is in the test.
- **Add an upgrade**: add its id to `UPGRADE_IDS`, its row to `UPGRADES` and `levels`, apply it in
  `stats`, and give `SHOP` room for a sixth card (a third row is there; a seventh needs a fourth).
- **Add a kind of night**: a row in `NIGHT_KINDS`, its effect in `tick`, `nightfall` or
  `gustsFor`, its emblem in `paintKindIcon` and the list in `bakeTextures`, and any layer in
  `GameScene.drawKind`.
- **Add or change a chain**: a row in `CHAINS` (lanterns side by side, in the order the cord
  runs; `payout` puts its popup between the first and last).
- **Retune bats**: `batsFor`, `BAT_SPEED`, `BAT_FLEE` and `BAT_Y` in `state.ts`.
- **Move or add a lantern spot**: edit `LANTERN_SPOTS`; the castle's merlons skip spots on their
  own, but check the castle art still reads around it and the test's timing margins.
- **Add a moth kind**: add it to `MOTH_KINDS` and `KIND_ORDER` in `state.ts` (its speed, wick and
  oil multipliers), and give it a size and gel colour in `MOTH_LOOK` in `art/puppet.ts` (its
  textures are baked from that list). A bought kind like the firefly stays out of `KIND_ORDER`
  and is added by `makeMoths`.
- **Change the queue**: `QUEUE_MAX` in `state.ts`; the test asserts the queue contents.
- **Restyle**: shapes and colours live in `art/puppet.ts`; the texture anchors there must match
  the scene's placements (the lantern origin, `PAD` for plaques).

## Gotchas

- `send` on a lit lantern refills it, by design; there is no "already lit" refusal.
- A lost tap and an ignored one both return false from `send`: a tap on a lantern already claimed
  (including one a moth guards) is ignored, a tap with no moth idle and a full queue is lost.
- A queued tap is dispatched in `tick` after the moths move and the wind, so the moth that just
  came home (or was released by a passing gust) takes it on the same frame; the queue never holds
  a lantern a moth has already claimed.
- The gust picks its target when it is warned, not when it hits; if that lantern burns out before
  then, the gust does nothing. A moth still flying to it (`out`) does not shield it.
- Night 1's quota is `ceil(5 * 0.6)` = 3; `requiredFor` rounds up.
- Night 1 must stay clear with no bats and no chain (every chain has a lantern from night 2 on):
  the playthrough's pay depends on it.
- A bat zone's `pointerdown` reads `state.bats[k]` when tapped, as bats are removed from the
  array when they leave the screen.
- `report.festival` is true only on the one nightfall that reaches the festival; `state.festival`
  stays true after, so the panel says the festival was held and later nights never reach it again.
- The test forces Phaser's canvas renderer; additive glows (`BlendModes.ADD`) and `setCrop` work
  there, tints do not, so the art swaps textures instead of tinting.
