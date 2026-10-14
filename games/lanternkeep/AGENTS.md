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
pay at once. Between nights a panel shows the tally and four upgrades; each night adds a lantern.

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
  "Next dusk") and a game-over panel ("New keep").
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
- Four upgrades, three levels each, bought between nights. Only the most nights kept persists.

Missing or rough:

- No title screen, sound or pause; nights differ in lantern count, order and gusts only.
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
- `scenes/layout.ts`: `VIEW`, `HUD`, `DUSK_BAR`, `NIGHT_PANEL`, `SHOP`, `NEXT_BUTTON`, `BUTTON`,
  `ORDER` (the order card), `GUST_TAG` (the gust plaque's size), `LANTERN_HIT`, `UI_DEPTH` and
  `FONT` (Georgia / DejaVu Serif / serif).
- `game/places.ts`: `JAR`, `LANTERN_SPOTS` (view pixels, in the order nights add them) and
  `mothRest` (30 px apart on the jar's rim).
- `game/state.ts`: `GameState`, `Lantern`, `Moth`, `Gust`, `GameEvent`, `Order`, `OrderGoal`,
  `NightReport`, the balance constants, `MOTH_KINDS`, `KIND_ORDER`, `QUEUE_MAX`, `GUST_WARN_MS`,
  `gustsFor`, `CLOSE_CALL`, `CLOSE_CALL_PAY`, `ORDERS`, `orderFor`, `orderProgress`, `UPGRADES`,
  `stats`, `mothSpeed`, `mothLightMs`, `newGame`, `send`, `tick`, `nextCost`, `buy` and
  `nextDusk`. No Phaser; `baseBurnMs` reads `byDifficulty` from `shared/settings.ts`.
- `game/save.ts`: `loadBest` and `saveBest`.
- `art/puppet.ts`: `bakeTextures` and the painters. Full-screen layers are painted at 1x
  (`screen-0/1/2`, `castle` with the jar, `stars`), sprites and plaques at `RES` = 2 and drawn at
  scale 1 / `RES`: `moon`, `glow`/`glow-pale` (additive), `lantern-lit`/`-dark`
  (origin 36/56 down), `flame`, `moth-<kind>-up`/`-down` (`MOTH_LOOK`: size and gel colour),
  `hud`, `dusk-fill` (cropped to the dusk left), `dusk-rim`, `sun`, `hearth-lit`/`-out`, `coin`,
  `order-card`, `pip-lit`/`-dark`, `gust-tag`, `save-tag`, `spark`, `panel`, `panel-small`,
  `card-on`/`-off`, `btn`/`btn-hover`. Plaques, cards and panels are baked with `PAD` pixels of
  room for their shadow; place them at (x - `PAD`, y - `PAD`) with origin 0. Also exports `INK`,
  `INK_HEX`, `DUSK` (layout's `DUSK_BAR`) and `SCREENS`.
- `ui/Button.ts`: `makeButton`, the carved card button (texture swap on hover, a `Zone` for taps).

Shared code it imports (outside the game folder): `shared/setupGame.ts` (`setupGame`) and
`shared/settings.ts` (`byDifficulty`, `settings`).

How it runs:

- `update(time)` computes `dt` from the frame timestamp (clamped to `MAX_STEP_MS`), calls `tick`,
  drains `state.events` into popups, and on a phase change saves the best and starts the nightfall
  popups. Then it sets every image from state (screens, lanterns, moths, tags, HUD, panels) and
  redraws the Graphics layers (`marks`: oil bars and rings; `wind`; `trails`; the gust pointer).
- `tick` only runs in `'dusk'`: oil burns (not on a lantern a moth sits on), then each moth moves
  at its kind's speed (`out` to its lantern, `lighting` for its kind's `mothLightMs`, then `guard`
  if a gust is warned for that lantern, else `home` to its rest spot, then `idle`). Then `wind`
  warns or blows the gust, a moth that is idle takes the oldest queued tap, the dusk clock runs
  down and `nightfall` scores (lanterns, all-lit bonus, order). A lantern lit on the last tick
  counts.
- Input: one `Zone` per lantern spot calls `send`; the shop cards' zones call `buy`; "Next dusk"
  calls `nextDusk`, as does "New keep" through `restart`.
- Panels open `PANEL_DELAY_MS` after nightfall so the popups show first; `panelOpen` says when.

State model (`GameState` in `src/game/state.ts`):

- `phase` is `'dusk'`, `'night'` (panel open, shop live) or `'over'`. `duskMs` counts down.
- `lanterns[i]` sits at `LANTERN_SPOTS[i]`: `lit`, `oilMs` left of `oilMaxMs`, `claimed` while a
  moth is on its way to it, lighting it or guarding it.
- `moths[i]` has a `kind`, a position, a `task` (`idle`, `out`, `lighting`, `guard`, `home`), its
  `target` lantern, `lightingMs` and `closeCall` (set when it arrived at a nearly dry lantern).
- `queue` holds lantern indexes whose taps wait for a moth, oldest first, at most `QUEUE_MAX`.
  `send` queues a tap only when no moth is idle and the lantern is not claimed or already queued;
  otherwise the tap is lost.
- `order` is the night's `Order`; `orderProgress(s)` gives `{ done, of }`.
- `gusts` are the dusk-left times of the gusts still to come; `gust` is the warned one
  (`{ target, atMs }`) or null. `closeCalls` and `shields` count this dusk's.
- `events` lists `closeCall` and `gust` events since the scene last looked; the scene empties it.
- `levels` per upgrade; `stats(s)` turns them into moth count, speed, wick time and burn time.
- `report` is the last nightfall's tally (`lit`, `count`, `required`, `earned` with the order's
  reward, `lostHearth`, `orderMet`); `kept` counts nights that met the quota, `best` the most.

Persistence: one `localStorage` key, `lanternkeep-best`, holding the most nights kept, written when
nightfall ends a dusk (to night or game over). The hub's settings are read from the shared
`hub-settings` key.

Randomness and timing: no `Math.random`, `Date.now` or `performance.now` in the rules; gust targets
and orders are deterministic. Game time is the frame timestamps `update` receives. The art uses a
seeded generator in `puppet.ts`. Popups, flares and sparks are cosmetic Phaser tweens.

### Hub settings

- `src/main.ts` calls `setupGame(game)` right after creating the game (frame cap, FPS readout, reduced motion and full screen).
- Difficulty scales one number: the burn time, `baseBurnMs()` = `byDifficulty(26_000, 20_000,
  16_000)`. Keep Normal at 20 s: the playthrough expects it. The moth kinds, the queue, the gusts,
  the close-call share and the orders are not scaled by difficulty.
- `settings.reduceMotion` holds still: the moths' wing flaps (wings stay up) and bobbing, the
  lantern glow's and flame's flicker, the pulse of the close-call rings, the spin of the gust's
  dashed ring and the travelling gust along its wind curls, the rise of popups (they only fade)
  and the spread of the close-call sparks. The game uses no camera shake or flash.
- Keep the Lanternkeep row of the difficulty table in the root README and the line in this game's
  README in step with the `byDifficulty` values.

## Testing hooks

- `window.game` in dev builds. The test reads `game.scene.getScene('Game')` and its `state`
  (copied through JSON) and `panelOpen`. `shopButtons` and `nextButton` give the panel buttons in
  view pixels, for tests that go past the first night.
- Inputs: it clicks lanterns at their `x`, `y` from state, scaled by the canvas bounding box.
- The test mirrors these, so change them together: `DUSK_MS` (45 s), the first night's five
  lanterns and quota of three, three moths in kind order (fast, slow, heavy), three lives, the 20 s
  burn, the pay (5 a lantern, 10 bonus), night 1's order (lanterns 0, 1, 2 for 15), night 1's one
  gust at 34 s left warned 5 s before, the close call (under 15%, 2 coins), the scene key `'Game'`
  and the fields above (`queue`, `order`, `gusts`, `gust`, `closeCalls`, `shields` too).
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

## Making common changes

- **Retune a night**: the constants at the top of `src/game/state.ts`, `lanternsFor` and
  `requiredFor`; update the README and the test's constants.
- **Add or change an order**: a row in `ORDERS` (its `lit` lanterns must exist on every night it
  comes round on: night n has `lanternsFor(n)` lanterns). `GameScene.drawOrder` shows up to three
  pips; a goal with more needs more `orderPips`. Night 1's order is mirrored in the test.
- **Retune gusts**: `gustsFor` and `GUST_WARN_MS` in `state.ts`; night 1's gust is in the test.
- **Add an upgrade**: add its id to `UPGRADE_IDS`, its row to `UPGRADES` and `levels`, apply it in
  `stats`, and give `SHOP` room for a fifth card.
- **Move or add a lantern spot**: edit `LANTERN_SPOTS`; the castle's merlons skip spots on their
  own, but check the castle art still reads around it and the test's timing margins.
- **Add a moth kind**: add it to `MOTH_KINDS` and `KIND_ORDER` in `state.ts` (its speed, wick and
  oil multipliers), and give it a size and gel colour in `MOTH_LOOK` in `art/puppet.ts` (its
  textures are baked from that list).
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
- The test forces Phaser's canvas renderer; additive glows (`BlendModes.ADD`) and `setCrop` work
  there, tints do not, so the art swaps textures instead of tinting.
