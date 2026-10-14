# Lanternkeep: guide for agents

How Lanternkeep is built and where things stand, for agents changing it. README.md covers how to
play, the upgrade table and the numbers. Keep this file up to date with any change to the game, per
the root AGENTS.md.

## Current state

Lanternkeep is a real-time juggling game on one fixed screen: a castle at dusk with lantern spots,
and a jar of moths at the gate. Tapping a lantern sends an idle moth to light it (or refill a lit
one); lit lanterns burn oil and go dark when it runs out. When the 45 second dusk ends, the lanterns
still lit pay coins, and too few lit costs a hearth (a life). Between nights a panel shows the tally
and four upgrades; each night adds a lantern.

Implemented today:

- One scene (`GameScene`): a sky that fades from sunset to night with a sinking sun and stars, the
  castle, the lanterns with glow, oil bars, a faint ring on dark ones and a fill ring while a moth
  lights one, the moths and their jar, a HUD (night, hearths, coins, dusk bar, lit count against
  the quota), coin popups at nightfall, the night panel (tally, upgrades, "Next dusk") and a
  game-over panel ("New keep").
- Nights without end: `lanternsFor` adds one lantern a night up to the ten in `LANTERN_SPOTS`.
- Four upgrades, three levels each, bought between nights. Only the most nights kept persists.

Missing or rough:

- No title screen, sound, pause, or randomness; the nights only differ in lantern count.
- Moths fly straight lines; nothing in the dusk threatens lanterns but their oil.
- No tap queue: a tap while every moth is busy does nothing.
- `src/art/pixelArt.ts` is a general helper copied from Tiny Kingdom; `bakePixelArt`, `padRows`,
  `line` and `outline` are unused here.
- The upgrade buttons are not exercised by the playthrough (purchases stay out of it), only by
  hand.

## Architecture

File map (`src/`):

- `main.ts`: creates the `Phaser.Game` (960x540, `Phaser.Scale.FIT`, `pixelArt: true`) with
  `BootScene` and `GameScene`, calls `setupGame(game)` from `shared/setupGame.ts`, and in dev
  builds puts `game` on `window`.
- `scenes/BootScene.ts`: calls `bakeSprites`, then starts `Game`.
- `scenes/GameScene.ts`: builds the world, HUD and panels once; `update` ticks the rules and
  redraws.
- `scenes/layout.ts`: `VIEW`, `HUD`, `DUSK_BAR`, `NIGHT_PANEL`, `SHOP`, `NEXT_BUTTON`, `BUTTON`,
  `LANTERN_HIT`, `UI_DEPTH` and `FONT`.
- `game/places.ts`: `JAR`, `LANTERN_SPOTS` (view pixels, in the order nights add them) and
  `mothRest`.
- `game/state.ts`: `GameState`, `Lantern`, `Moth`, `NightReport`, the balance constants,
  `UPGRADES`, `stats`, `newGame`, `send`, `tick`, `nextCost`, `buy` and `nextDusk`. No Phaser;
  `baseBurnMs` reads `byDifficulty` from `shared/settings.ts`.
- `game/save.ts`: `loadBest` and `saveBest`.
- `art/sprites.ts`: draws and bakes `castle` (the whole lower view from `CASTLE_TOP`),
  `lantern-lit`, `lantern-dark`, `moth-0`/`moth-1` (wing frames, 3x), `jar`, `hearth-lit`,
  `hearth-out`, `coin` and `glow`.
- `art/pixelArt.ts`: `PixelCanvas` and `seeded`.
- `ui/Button.ts`: `makeButton`, the wooden captioned button.

Shared code it imports (outside the game folder): `shared/setupGame.ts` (`setupGame`) and
`shared/settings.ts` (`byDifficulty`, `settings`).

How it runs:

- `update(time)` computes `dt` from the frame timestamp (clamped to `MAX_STEP_MS`), calls `tick`,
  and on a phase change saves the best and starts the coin popups. Then it redraws the sky, the
  lanterns, the moths, the HUD and the panels from state every frame.
- `tick` only runs in `'dusk'`: oil burns, then each moth moves (`out` to its lantern, `lighting`
  for `lightMs`, `home` to its rest spot, then `idle`), then the dusk clock runs down and
  `nightfall` scores. A lantern lit on the last tick counts.
- Input: one `Zone` per lantern spot calls `send`; the shop buttons call `buy`; "Next dusk" calls
  `nextDusk` and rebuilds the moth images (`syncMoths`), as does "New keep".
- Panels open `PANEL_DELAY_MS` after nightfall so the popups show first; `panelOpen` says when.

State model (`GameState` in `src/game/state.ts`):

- `phase` is `'dusk'`, `'night'` (panel open, shop live) or `'over'`. `duskMs` counts down.
- `lanterns[i]` sits at `LANTERN_SPOTS[i]`: `lit`, `oilMs` left, `claimed` while a moth is on it.
- `moths[i]` has a position, a `task`, its `target` lantern and `lightingMs`.
- `levels` per upgrade; `stats(s)` turns them into moth count, speed, wick time and burn time.
- `report` is the last nightfall's tally; `kept` counts nights that met the quota, `best` the most.

Persistence: one `localStorage` key, `lanternkeep-best`, holding the most nights kept, written when
nightfall ends a dusk (to night or game over). The hub's settings are read from the shared `hub-settings` key.

Randomness and timing: no `Math.random`, `Date.now` or `performance.now` in the rules. Game time is
the frame timestamps `update` receives. Art and stars use `seeded`.

### Hub settings

- `src/main.ts` calls `setupGame(game)` right after creating the game (frame cap, FPS readout,
  reduced motion).
- Difficulty scales one number: the burn time, `baseBurnMs()` = `byDifficulty(26_000, 20_000,
  16_000)`. Keep Normal at 20 s: the playthrough expects it.
- `settings.reduceMotion` holds the moths' wing flaps and bobbing and the lantern glow's flicker
  still. The game uses no camera shake or flash.
- Keep the Lanternkeep row of the difficulty table in the root README and the line in this game's
  README in step with the `byDifficulty` values.

## Testing hooks

- `window.game` in dev builds. The test reads `game.scene.getScene('Game')` and its `state`
  (copied through JSON) and `panelOpen`. `shopButtons` and `nextButton` give the panel buttons in
  view pixels, for tests that go past the first night.
- Inputs: it clicks lanterns at their `x`, `y` from state, scaled by the canvas bounding box.
- The test mirrors these, so change them together: `DUSK_MS` (45 s), the first night's five
  lanterns and quota of three, three moths, three lives, the 20 s burn, the pay (5 a lantern, 10
  bonus), the scene key `'Game'` and the fields above.
- The timing matters: it lights lantern 0 at the start and expects it out before 16 s of dusk is
  left, then lights three at 16 s left and the last two once the moths are home, all before
  nightfall. Slower moths, longer wicks or far lantern spots can break that; re-check the margins
  (about 6 s) after changing `BASE_SPEED`, `BASE_LIGHT_MS`, `LANTERN_SPOTS` or `JAR`.
- It saves `playthrough-0-dusk`, `-1-first-lantern`, `-2-all-lit` and `-3-night` screenshots;
  copy them into `docs/screenshots/` when the look changes. `cover.png` is `-2-all-lit`.

## Making common changes

- **Retune a night**: the constants at the top of `src/game/state.ts`, `lanternsFor` and
  `requiredFor`; update the README and the test's constants.
- **Add an upgrade**: add its id to `UPGRADE_IDS`, its row to `UPGRADES` and `levels`, apply it in
  `stats`, and give `SHOP` room for a fifth button.
- **Move or add a lantern spot**: edit `LANTERN_SPOTS`; the castle's merlons skip spots on their
  own, but check the castle art still reads around it and the test's timing margins.

## Gotchas

- `syncMoths` must run whenever `state.moths` is replaced, or the images and moths drift apart.
- `send` on a lit lantern refills it, by design; there is no "already lit" refusal.
- Night 1's quota is `ceil(5 * 0.6)` = 3; `requiredFor` rounds up.
