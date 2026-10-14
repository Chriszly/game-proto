# Hotfoot: guide for agents

How this game is built and where it stands, for agents about to change it. `README.md` covers how
to play, the boon table and the controls. Per the root `AGENTS.md`, keep this file up to date in
the same PR as any change to the game.

## Current state

An endless auto-runner: a knight runs right at a fixed screen x while the course scrolls, and the
player jumps spikes, pits, fire vents and goblins and up onto raised ledges, slides under hanging
blades and bats, and picks up coins. Every 3200 px (100 m) a checkpoint stops the run on a choice
of two boons, and each stage after runs faster with obstacles closer together and new kinds mixed
in.

- Implemented: the run (jump, Second Leap air jump, slide, air drop into a slide), four static trap
  kinds (spikes, pit, blade, timed fire vent), two moving foes (a goblin pacing its beat, a bat
  flying at the knight) that can be stomped from above, raised ledges and two-step stairs the knight
  climbs and drops off, hearts with a hurt blink, coins with lodestone pull, checkpoints with two
  boon cards, eight boons plus the Field Dressing filler, a game-over panel with a coin shop and
  "Run again", a fading controls hint on stage 1, and progress saved between runs (best distance,
  banked coins and a bought boon).
- Loop extras: a **coin streak** (every 10 coins taken in a row without a hit raise a multiplier, up
  to x5, shown in a HUD chip, with "+N" pops and a trail of gold stars; any hit resets it), a
  **wayside shrine** once a stage from stage 2 (slide into it to trade 15 run coins for a heart when
  hurt) and a **run track** under the HUD (a banner every 100 m, the knight's marker, and a ghost
  flag at the best distance).
- The art is an illuminated manuscript: a gothic miniature on vellum, painted on 2D canvases
  (`src/art/ink.ts`): a lapis-and-madder diapered sky with a gold-leaf moon, crags and a pink
  castle, lollipop trees, a turf road, ink outlines with white highlights, gold-leaf coins, a lapis
  HUD band with an illuminated initial on the stage's name, and a vellum margin of acanthus
  scrollwork under the road with a rubric caption that names what is ahead. No cast shadows.
- One scene does everything: there is no title screen, pause, settings, audio or menu. The run
  starts as soon as `GameScene` loads. The hub's shared settings (difficulty, frame cap, FPS readout, reduced motion and full screen) apply; see Hub settings below.
- Coins are counted during a run and banked when the knight falls. On the game-over panel they buy
  the boon missed at the last checkpoint (the card not taken), for `BOON_PRICE` (30) coins. The next
  run starts with that boon at one rank, with full hearts. One purchase at a time; Field Dressing is
  never for sale, and no boon is for sale before the first checkpoint.
- The best distance, the banked coins and a bought boon persist. A run in progress is lost on
  reload; a bought boon waits in storage until a run starts with it.
- No TODOs or FIXMEs in the code.

## Architecture

### File map

- `src/main.ts`: creates the `Phaser.Game` (960x540, `Scale.FIT`, `pixelArt: false`) with `BootScene`
  then `GameScene`, calls `setupGame(game)`, and puts `game` on `window` in dev builds.
- `src/game/state.ts`: `GameState` and its parts (`Trap`, `Ledge`, `Shrine`, `Coin`, `Effect`,
  `Runner`), the physics and size constants, `BOON_PRICE`, `STREAK` and `streakMult` (the coin
  multiplier), `SHRINE` (first stage, price, width), `FOES`, `TRAP_SPAN`, `FLAMES` and `flameOf` (a
  vent's burn), `AWAKE`, `floorAt` (ground height under a stretch of course), `speedOf`, `stats`
  (the knight's numbers from boon ranks), `canTake`, `freshState`, `metres`, and `trackOf` (the run
  track's numbers: metres run, best, track length, banners, metres to the next banner).
- `src/game/sim.ts`: the rules. `newRun`, `jump`, `slide`, `tick`, `rollChoices`, `pick`, `buyMissed`, plus
  `runnerBox` and the private helpers: collision (`touches`), foe movement (`moveFoes`), stomping
  (`stomp`), coins (`gainCoin`: the streak and its multiplier), shrines (`visitShrines`) and damage
  (`hurt`, which also takes `'wall'` for a ledge's side, and resets the streak).
- `src/game/course.ts`: `buildStage` lays out a stage's pieces (`Piece`: each trap kind, `ledge`
  and `steps`) and their coins, and from `SHRINE.from` its shrine (`placeShrine`, in the gap between
  pieces nearest the stage's middle); `planOf` sizes and places one piece, `piecesOf` is the pool per
  stage, `OPENING` is stage 1's fixed first four, `gapsOf` gives spacing per stage, `nextStage`
  moves to the next stage.
- `src/game/boons.ts`: the `BOONS` table (name, text, `maxRank`, `filler`) and `BOON_IDS`.
- `src/game/save.ts`: `loadProgress` and `saveProgress` (best distance, banked coins, the bought boon).
- `src/scenes/BootScene.ts`: bakes every texture, then starts `Game`.
- `src/scenes/GameScene.ts`: owns the `GameState`, wires input, ticks the sim and draws everything.
- `src/scenes/layout.ts`: screen constants (`VIEW`, `GROUND_Y`, `RUNNER_X`, `TAP_SPLIT_Y`,
  `FRAME` (the miniature's gold frame), `TRACK` (the run track), `STREAK_CHIP`, `MARGIN` (the
  scrollwork and caption), `CARDS`, `BUTTON`, `HUD_HEIGHT`, `UI_DEPTH`, `FONT` (a Georgia serif stack)).
- `src/ui/BoonCards.ts`: the checkpoint overlay and its two vellum cards; exposes `cards: CardSpot[]`.
- `src/ui/Button.ts`: `makeButton`, the lapis button ruled in gold used for "Run again" and the shop's buy button.
- `src/art/ink.ts`: the manuscript toolkit. `C` (the pigments as CSS colours) and `N` (the same as
  numbers for Phaser), `SERIF`, `seeded`, `paint` (paints a canvas and adds it with
  `textures.addCanvas`), `poly`, `circle`, `oval`, `hl` (a white highlight), `gold` (a gold-leaf
  gradient), `star6`, `heartPath`, `bezant` (a gold coin) and `shade`.
- `src/art/scenery.ts`: the vellum `page` (stains, acanthus scrollwork, snail), `sky` (diaper,
  sunset clouds, stars, moon), `far` (crags and a castle), `near` (trees and a tower), `ground`
  (turf and flowers), spikes, pits, the hanging log (`blade`), fire vent, `ledge` (pink ashlar),
  coins, `checkpoint`, `shrine` and `shrine-used`, the shrine's `banderole` and the miniature's
  `frame`. Exports `FAR_H`, `NEAR_H`, `GROUND_TOP` and `PIT_DEPTH`.
- `src/art/foes.ts`: the goblin (`goblin-0`, `goblin-1`, sized by `GOBLIN_ART`) and bat (`bat-0`,
  `bat-1`, `BAT_ART`), facing left.
- `src/art/knight.ts`: the knight's poses (`KnightPose`), painted as `knight-<pose>`, and
  `KNIGHT_FEET` (texture sizes and where the feet are).
- `src/art/icons.ts`: one 64x64 icon per boon (`iconTexture`), and the HUD's `heart-full` and `heart-empty`.
- `src/art/hud.ts`: `bakeHud` (the `hud-band`, the illuminated `initial`, the `streak-chip` and its
  `medallion`, the `track-strip`), `bakePanel` (vellum panels: cards, the title strip, the game-over
  panel) and `bakeButton`.
- `shared/setupGame.ts` and `shared/settings.ts` (outside the game folder): the hub's settings.
  `main.ts` imports `setupGame`; `state.ts` imports `byDifficulty`.

### How it runs

- Boot: `BootScene.create` calls `bakeScenery`, `bakeFoes`, `bakeKnight`, `bakeIcons` and
  `bakeHud`, which paint 2D canvases (`ink.ts`) and add them as textures. There are no asset files.
  A texture is as big as it appears on screen; most art is written in page units (twice screen size,
  the mockup's scale) under `ctx.scale(0.5)`, the knight at 0.5 and the foes at 0.46 and 0.45.
- Tick: `GameScene.update(time)` computes `dt` from the frame timestamp (not Phaser's smoothed
  delta), clamped to `MAX_STEP_MS` (100), with 0 on the first frame. It calls `tick(state, dt)`
  once per frame (no fixed substeps) and advances its own `clock`, used only for animation.
- `tick` order: age effects; stop unless `phase === 'running'`; add `dt` to `time`; move awake
  foes (`moveFoes`); move `distance` (clamped to `checkpointX`); if the feet are now below the
  floor (`floorAt` under the knight's box), that is a ledge's side: hurt (`'wall'`, unless
  unhurtable or less than `STEP_UP` short) and snap onto its top; apply gravity and land on the floor; stomp a foe landed on;
  refill jumps when grounded; count down slide and hurt; check one trap hit; visit a shrine slid
  into; collect or pull coins; drop traps, ledges, shrines and coins more than `BEHIND` behind;
  enter `checkpoint` and roll choices when `distance` reaches `checkpointX`.
- Coins: `gainCoin` pays `stats().coinValue * streakMult(streak)` (the multiplier reached before
  this coin), then adds one to `streak`, and pushes a `pop` effect ("+N") when the coin is worth more
  than one. Picked-up coins and stomped foes both go through it. `hurt` sets `streak` to 0 on every
  hit, blocked ones included.
- Shrines: `visitShrines` runs while sliding on the road; a shrine the knight's box overlaps that is
  neither `used` nor `tried` trades `SHRINE.price` coins for a heart (`used`, a `heal` effect) when
  `hearts < maxHearts` and `coins >= price`, and otherwise is marked `tried` with a `refuse` effect
  ("Hearts full" or "Needs 15 coins").
- Moving the knight forward before gravity is deliberate: a jump that is still above a ledge's top
  as it reaches the side lands on it, even if a long frame takes the feet below the top.
- Input: a `pointerdown` on the scene with nothing interactive under it calls `jump` above
  `TAP_SPLIT_Y` and `slide` below it. Keys: Space, Up, W jump; Down, S slide. Card and button taps
  are ignored by that handler because they hit interactive objects; the full-screen dims behind the
  cards and the game-over panel are interactive too, so they swallow stray taps.
- Rendering, back to front: the vellum `page` (depth -10, with the margin's scrollwork), the `sky`
  inside the frame, the `far` and `near` tile sprites (scrolling at 0.15 and 0.4), the `ground` tile
  sprite (depth 1), ledges, ledge ends and doors (`Graphics`), pits, the shrine and checkpoint
  (depth 3), traps, foes and coins (depth 4), the shrine's banderole (4.2), the `frame` overlay
  (4.5: vellum side strips and the gold rule), the knight (5), effects (6) and words (6.5), the hint
  and the HUD (`UI_DEPTH`). The margin caption is a `Text` at depth 0, set by `drawCaption` from
  the phase and the nearest thing ahead.
- Traps, coins and shrines are diffed into caches each frame (created on first sight, destroyed when
  gone from state), and ledges into `Map<id, TileSprite>` of the `ledge` texture cropped to each
  ledge's height. `drawTrap` animates fire vents (by `flameOf`), goblin steps (by x, flipped when
  walking right) and bat flaps (with a bob that is only drawn, not collided). Effects, the Aegis
  nimbus, the sparkle trail and the HUD's bars and track are `Graphics` cleared and redrawn every
  frame; `pop`, `heal` and `refuse` effects are `Text` objects in `words`, keyed by effect id. The
  sparkle trail (`trail`) is a short list of course points the knight passed, laid every 45 ms of
  the scene's clock while the multiplier is x2 or more. The knight is one image whose texture and
  origin change by pose. `BoonCards.show` rebuilds only when the choices change.
- Saving (`persist`) happens in `update` whenever the phase changes away from `running` (checkpoint
  or fall), on each run's start (`create` and `restart`) and when a boon is bought.

### State model

- `GameState.phase` is `'running' | 'checkpoint' | 'over'`. Nothing moves outside `running`;
  `jump`, `slide` return false and `pick` needs `checkpoint`.
- Coordinates: x is course pixels, left to right; `distance` is the middle of the knight's box.
  Heights (`runner.h`, coin `h`, trap and ledge `h`) are pixels up from the road, and
  `TRAP_SPAN` is up from the trap's own `h`. On a ledge the knight's feet are at the ledge's `h`;
  "grounded" means feet at `floorAt` under the box and not rising. Screen x is
  `RUNNER_X + x - distance` (`GameScene.sx`), screen y is `GROUND_Y - h`.
- `Runner`: `h`, `vh`, `slideMs`, `slideQueued` (slide on landing after an air drop), `jumps` left,
  `hurtMs` (invulnerable time).
- `traps: Trap[]`: `kind`, `x`, `w`, `h` (the ground it stands on; a bat's flying height, 34),
  `vx` (0 unless a foe), a goblin's beat `from`/`to`, a fire vent's `phase` in its burn.
  Foes (`FOES`: goblin, bat) only move once within `AWAKE` (760 px) ahead of the knight, just off
  screen. A bat is placed so it meets the knight where its piece was laid out, from the stage's
  speed. A stomped foe is removed from `traps` and counted in `stomps`.
- `ledges: Ledge[]` (`x`, `w`, `h`): raised ground. Steps are two touching ledges, 48 then 80 high.
- `time` is ms spent running this run; fire vents burn by it (`FLAMES`: lit 800 of every 1800 ms,
  sputtering for the 300 before).
- `shrines: Shrine[]` (`x`, `w` 46, `used` once it gave a heart, `tried` once slid into without
  one): at most one per stage, on the road, from stage 2.
- `streak`: coins taken in a row since the last hit (stomps count). `streakMult(streak)` is
  `min(5, 1 + floor(streak / 10))`.
- `course: Coin[]` (the coins; `pulled` once a lodestone catches one). `effects: Effect[]` are
  short visual timers (`coin`, `hit`, `block`, `dust`, `stomp`, and `pop`, `heal`, `refuse`,
  which carry their words in `text`).
- `ranks` maps `BoonId` to rank taken; `stats(s)` derives every boon effect from it, so boons have
  no other state except `shields` (Aegis charges, reset from `stats` on each `pick`).
- `nextId` hands out ids for traps, ledges, shrines, coins and effects; sprite caches key on them.
- All mutation is in `src/game/` (`sim.ts`, `course.ts`). `GameScene` only calls those functions,
  except `restart`, which replaces `state` with `newRun(best, bank, pending)`, and `buy`, which
  calls `buyMissed`.
- Progress across runs: `best` (the best distance in metres), `bank` (coins banked from finished
  runs, added in `hurt` when the knight falls), `pending` (the boon bought at game over, applied and
  cleared by the next `newRun`) and `missed` (the boon offered at the last checkpoint and not taken,
  set by `pick`; null before any checkpoint). `buyMissed` takes `BOON_PRICE` from `bank` into
  `pending`, and refuses unless the run is over, `missed` is a non-filler boon, nothing is pending and
  the bank covers the price.
- Invariants: `distance <= checkpointX`; `choices` is non-null only at a checkpoint and holds two
  ids; `hearts` is clamped to `stats().maxHearts` on `pick`; a pit only hurts when grounded over
  its middle; one hit per frame, and none while `hurtMs > 0`; pieces never overlap, so pits, blades
  and the rest always sit on the road (`h` 0) and the checkpoint is always on the road.

### Persistence

`localStorage` keys: `hotfoot-best` (the best distance in metres), `hotfoot-bank` (banked coins) and
`hotfoot-start` (the boon bought for the next run; removed once a run starts with it). Read once in
`GameScene.create` via `loadProgress`, written by `saveProgress`; every access is wrapped in
try/catch. Nothing else is saved by the game; the hub's settings live under the shared `hub-settings`
key (see Hub settings).

### Randomness and timing

- `Math.random` is used only in `src/game/course.ts` (sizes and fire vent phases in `planOf`,
  ledge heights, `pickOf`, gap length) and in
  `rollChoices` in `src/game/sim.ts`. `placeShrine` takes no random draws, so adding the shrine did
  not change the seeded courses. The art uses `seeded()` from `ink.ts`, not `Math.random`.
- Time comes only from the `time` argument of `GameScene.update` (the sim's `state.time` is the sum
  of the `dt`s it was given). No timers, tweens or
  `Date.now`.

### Data tables

- `src/game/state.ts`: `RUNNER` box, `GRAVITY`, `JUMP_V`, `DROP_V`, `SLIDE_MS`, `HURT_MS`,
  `START_HEARTS`, `COIN_REACH`, `STAGE_LEN`, `LEAD_IN`, `BOON_PRICE`, `STREAK` (step 10, max 5),
  `SHRINE` (from stage 2, price 15, width 46), `PX_PER_M`, `speedOf`, `TRAP_SPAN`,
  `FLAMES`, `AWAKE`, and the per-rank boon multipliers inside `stats`.
- `src/game/course.ts`: `CLEAR_BEFORE_CHECKPOINT`, `gapsOf`, `piecesOf` (the pool and its weights
  per stage: fire vents and bats from stage 2, steps, tall ledges and a second goblin entry from
  stage 3), `OPENING`, `GOBLIN` (width, beat, speed per stage), `BAT` (width, height, speed per
  stage), `LEDGE_H`, sizes and coin patterns per piece in `planOf`, and the shrine's gap (at least
  `SHRINE.w + 160`) in `placeShrine`.
- `src/game/sim.ts`: `PULL_SPEED`, `BEHIND`, `STOMP_REACH`, `STOMP_BOUNCE`, `STEP_UP`.
- `src/game/boons.ts`: names, card text and max ranks.

### Hub settings

- `src/main.ts` calls `setupGame(game)` from `shared/setupGame.ts` right after creating the game.
  It applies the frame cap, the FPS readout, reduced motion and full screen (camera shake and flash become
  no-ops; Hotfoot uses neither).
- Difficulty scales one number: `START_HEARTS` in `src/game/state.ts` is
  `byDifficulty(5, 3, 2)` (easy, normal, hard), from `shared/settings.ts`. It is read once at
  module load, so a change takes effect on the next page load. It sets the hearts of a new run
  (`freshState`) and the base of `maxHearts` in `stats`.
- `GameScene` reads `settings.reduceMotion` itself: with it on, the knight's hurt blink (alpha
  toggled every 80 ms) is held at a steady 0.6 alpha, the Aegis nimbus's pulse is held at a fixed
  alpha, the "+N" coin pops and the shrine's "+1 heart" stay where they appear instead of rising,
  and the streak's sparkle trail is not drawn.
- Normal must stay exactly as designed: the playthrough runs on Normal and its `STAGE_1` expects 3
  hearts.
- Keep the README's difficulty line (5 hearts on Easy, 2 on Hard) in sync with `byDifficulty`.
- The settings are stored under the `hub-settings` key by the hub, not in the game's own save, and
  read once when the page loads.

## Testing hooks

- `src/main.ts` sets `window.game` (the `Phaser.Game`) in dev builds only.
- `e2e/playthrough.spec.ts` reads `game.scene.getScene('Game')`: its `state` (JSON-copied) and
  `boonCards.cards` (`CardSpot` with `id`, `x`, `y`, `w`, `h` in game pixels).
- It seeds `Math.random`, owns the clock with 64 ms frames, and blocks WebGL so Phaser uses canvas.
- It drives only mouse clicks on the canvas: `JUMP_AT` (720,120) and `SLIDE_AT` (720,470), on
  either side of `TAP_SPLIT_Y`, and the centre of the first boon card. Nothing interactive may sit
  under those two points (the run track and the margin caption are not interactive).
- Values the test copies and that must stay in sync: `VIEW` 960x540, `HALF_W` 14 (half of
  `RUNNER.w`), `STAGE_1` (3 hearts, speed 260, `checkpointX` 3200), and the reaction distances in
  `REACT`. Its `obstaclesOf` turns `traps` and the rising sides of `ledges` into one list; it
  slides for blades and bats and jumps everything else, acting only when `runner.vh === 0`
  (grounded). It asserts stage 1 has spikes, a blade, a goblin and a ledge (`OPENING` in
  `course.ts`), a jump peak above 100 px, a slide, a goblin and a ledge's side passed, running on a
  ledge, coins, zero hits, a streak past 10 and coins equal to what that streak pays (`STREAK` and
  `coinsFor` copy the rule: step 10, max x5), no shrine on stage 1 and a new run's streak of 0, two
  different choices matching the card order, and that stage 2 is faster, laid out past 3200 and has
  one unused shrine.
- The test loads the game by its folder URL in `page.goto`, which must follow the folder name.

## Making common changes

- Add a boon: add the id to `BoonId` and an entry to `BOONS` in `src/game/boons.ts`; apply its
  effect in `stats` in `src/game/state.ts` (or in `pick` for a one-off effect like heart and mend);
  draw it in `ICONS` in `src/art/icons.ts` (the `Record` type forces this); update the README table.
- Add a trap or foe: add the kind to `TrapKind` and a `TRAP_SPAN` entry (pits are special-cased
  in `touches`; add it to `FOES` if it moves and can be stomped), give it a case in `planOf` and a
  place in `piecesOf` in `course.ts`, bake its art in `src/art/scenery.ts` (or `foes.ts`), and
  create its sprite in `GameScene.drawWorld` (animate it in `drawTrap`). `OPENING` and the test's
  kind checks and jump/slide choice need updating if stage 1 should include it.
- Add terrain: ledges are plain `Ledge` rows, so a new shape is a `planOf` case pushing ledges. Keep
  each ledge long enough to land a jump on at the stage's speed (as `steps` does), and keep
  traps off ledges unless the art and the test handle a trap at `h > 0`.
- Tune difficulty: `speedOf` and `STAGE_LEN` in `state.ts`, `gapsOf` in `course.ts`. Changing
  stage 1's speed, length or Normal hearts means updating `STAGE_1` in the test. To change what
  the hub's Difficulty setting scales, edit the `byDifficulty` call (see Hub settings) and the
  README's difficulty line.
- Move the screen layout: edit `src/scenes/layout.ts`; then check the test's tap points and the art
  that reads `GROUND_Y` and `VIEW` (pit depth and blade length in `scenery.ts`).
- Save more between runs: extend `src/game/save.ts`, keep keys prefixed `hotfoot-`, and carry the
  new field through `newRun`, `persist` and the game-over panel.
- Change the shop: `buyMissed` in `src/game/sim.ts` (price, what can be bought) and `drawGameOver`
  in `GameScene` (its wording and button). The shop is off the playthrough's path on purpose.
- Restyle an object: its sprite is painted in `scenery.ts`, `foes.ts`, `knight.ts`, `icons.ts` or
  `hud.ts` with the `ink.ts` helpers. Keep the texture's size and its origin in `GameScene` (feet on
  the road; see Gotchas), or change both together.
- Tune the streak or the shrine: `STREAK` and `SHRINE` in `state.ts`; the test's `STREAK` copy and
  the README's rules must follow. Moving the shrine to stage 1 puts it on the playthrough's path:
  the test would then need to handle it (it is harmless, so only the assertions change).
- Change the run track: `trackOf` in `state.ts` (the numbers) and the track part of `drawHud` and
  `TRACK` in `layout.ts` (the drawing).

## Gotchas

- Trap widths must have a baked texture: `planOf` makes spikes 36/48/60 and pits 80/96/112 wide, and `scenery.ts` bakes `spikes-<w>` and `pit-<w>` for exactly those widths.
- The blade art hangs to 34 px above the road (`blade()` in `scenery.ts` ends at `GROUND_Y - 34`); it
  must match `TRAP_SPAN.blade.lo`, which must stay above `RUNNER.slideH` (26) and below `RUNNER.h` (60).
- The knight's texture origins come from `KNIGHT_FEET` in `knight.ts`: the standing poses are
  104x100 px with the feet at (52, 94), and the slide is 108x42 px with the feet at (66, 38). Change
  the sizes and the feet together, or the knight floats or sinks. The goblin's origin comes from
  `GOBLIN_ART` (feet at row 51 of 54, centred so a flipped goblin stays put).
- The knight's tabard cross and the checkpoint banner's cross are gold leaf; the Field Dressing's is
  green. Never paint a red cross.
- A new sprite's origin is part of its look: spikes and fire vents stand on the road by their
  bottom-left, a pit hangs from 2 px above the road by its top-left (its art cuts through the turf
  and the frame's bottom rule into the margin, `PIT_DEPTH` 64), the goblin stands centred on its
  feet, the shrine stands by its bottom middle, and the blade hangs centred from the top of the
  screen (its art is 46 px wide, wider than the trap's 26, for the side spikes).
- `buildStage` relies on `nextId` and `stageStart`/`checkpointX` being set first; `nextStage` sets
  them before calling it. Traps and coins of the next stage are appended, not replaced.
- A collected coin gets `x = NaN` and is filtered out at the end of the same `tick`.
- `pick` sets `shields` from `stats`, so Aegis charges refill only when a boon is taken at a
  checkpoint, never mid-stage.
- The test's choice of which boon to pick depends on the seeded `rollChoices` order; changing the
  number of `Math.random` calls in `buildStage` changes both the course and the boons offered.
  `planOf` draws its random sizes before `buildStage` checks the piece fits, so a piece that does
  not fit still uses up its draws.
- `OPENING` pieces are spaced by the minimum gap so all four always fit in stage 1; random pieces
  after it use the full gap range.
- The `ledge` texture is 72x128 px; a ledge taller than about 118 px would need it baked taller.
- Scrolling layers (`far`, `near`, `ground`, `ledge`) must wrap: `far` and `near` paint every
  piece three times, a page-width apart, so the seam matches.
- Texts redrawn every frame (`setText`) only re-render when their string changes; keep it that
  way, since the canvas renderer is what the playthrough uses.
- A bat's meeting point assumes the knight runs at `speedOf(stage)` the whole way, which holds
  because nothing changes speed mid-stage.
- Hearts in the HUD are created up to `maxHearts` and never destroyed; extra ones are hidden.
- Healing art uses green (`C.heal`). Never draw a red cross (root `AGENTS.md`).
