# Hotfoot: guide for agents

How this game is built and where it stands, for agents about to change it. `README.md` covers how
to play, the boon table and the controls. Per the root `AGENTS.md`, keep this file up to date in
the same PR as any change to the game.

## Current state

An endless auto-runner: a knight runs right at a fixed screen x while the course scrolls, and the
player jumps spikes and pits, slides under hanging blades and picks up coins. Every 3200 px (100 m)
a checkpoint stops the run on a choice of two boons, and each stage after runs faster with traps
closer together.

- Implemented: the run (jump, Second Leap air jump, slide, air drop into a slide), three trap kinds,
  hearts with a hurt blink, coins with lodestone pull, checkpoints with two boon cards, eight boons
  plus the Field Dressing filler, a game-over panel with "Run again", a fading controls hint on
  stage 1, and a best-distance save.
- One scene does everything: there is no title screen, pause, settings, audio or menu. The run
  starts as soon as `GameScene` loads. The hub's shared settings (difficulty, frame cap, FPS
  readout, reduced motion) apply; see Hub settings below.
- Coins are counted but buy nothing; they only show in the HUD and the game-over text.
- Only the best distance persists. A run in progress is lost on reload.
- `bakePixelArt` in `src/art/pixelArt.ts` is unused (the art all draws through `PixelCanvas`).
- No TODOs or FIXMEs in the code.

## Architecture

### File map

- `src/main.ts`: creates the `Phaser.Game` (960x540, `Scale.FIT`, `pixelArt`) with `BootScene`
  then `GameScene`, calls `setupGame(game)`, and puts `game` on `window` in dev builds.
- `src/game/state.ts`: `GameState` and its parts, the physics and size constants, `speedOf`,
  `stats` (the knight's numbers from boon ranks), `canTake`, `freshState`, `metres`.
- `src/game/sim.ts`: the rules. `newRun`, `jump`, `slide`, `tick`, `rollChoices`, `pick`, plus
  `runnerBox` and the private collision (`touches`) and damage (`hurt`) helpers.
- `src/game/course.ts`: `buildStage` lays out a stage's traps and coins, `gapsOf` gives trap
  spacing per stage, `nextStage` moves to the next stage.
- `src/game/boons.ts`: the `BOONS` table (name, text, `maxRank`, `filler`) and `BOON_IDS`.
- `src/game/save.ts`: `loadBest` and `saveBest`.
- `src/scenes/BootScene.ts`: bakes every texture, then starts `Game`.
- `src/scenes/GameScene.ts`: owns the `GameState`, wires input, ticks the sim and draws everything.
- `src/scenes/layout.ts`: screen constants (`VIEW`, `GROUND_Y`, `RUNNER_X`, `TAP_SPLIT_Y`,
  `CARDS`, `BUTTON`, `HUD_HEIGHT`, `UI_DEPTH`, `FONT`).
- `src/ui/BoonCards.ts`: the checkpoint overlay and its two cards; exposes `cards: CardSpot[]`.
- `src/ui/Button.ts`: `makeButton`, the wooden button used for "Run again".
- `src/art/pixelArt.ts`: `PixelCanvas` (shape painting, outline, bake to texture) and `seeded`.
- `src/art/scenery.ts`: sky, parallax hills, road, spikes, pits, blade, coin and checkpoint art.
- `src/art/knight.ts`: the knight's poses (`KnightPose`), baked as `knight-<pose>`.
- `src/art/icons.ts`: one icon per boon plus `heart-empty`, baked large and `-small`.
- `src/art/palette.ts`: shared colour ramps.
- `shared/setupGame.ts` and `shared/settings.ts` (outside the game folder): the hub's settings.
  `main.ts` imports `setupGame`; `state.ts` imports `byDifficulty`.

### How it runs

- Boot: `BootScene.create` calls `bakeScenery`, `bakeKnight` and `bakeIcons`, which draw into
  `PixelCanvas` grids and generate textures. There are no asset files.
- Tick: `GameScene.update(time)` computes `dt` from the frame timestamp (not Phaser's smoothed
  delta), clamped to `MAX_STEP_MS` (100), with 0 on the first frame. It calls `tick(state, dt)`
  once per frame (no fixed substeps) and advances its own `clock`, used only for animation.
- `tick` order: age effects; stop unless `phase === 'running'`; move `distance` (clamped to
  `checkpointX`); apply gravity and landing; refill jumps when grounded; count down slide and hurt;
  check one trap hit; collect or pull coins; drop traps and coins more than `BEHIND` behind; enter
  `checkpoint` and roll choices when `distance` reaches `checkpointX`.
- Input: a `pointerdown` on the scene with nothing interactive under it calls `jump` above
  `TAP_SPLIT_Y` and `slide` below it. Keys: Space, Up, W jump; Down, S slide. Card and button taps
  are ignored by that handler because they hit interactive objects; the full-screen dims behind the
  cards and the game-over panel are interactive too, so they swallow stray taps.
- Rendering: traps and coins are diffed into `Map<id, Image>` caches each frame (created on first
  sight, destroyed when gone from state). Effects, the shield ring and the HUD bar are `Graphics`
  cleared and redrawn every frame. The knight is one image whose texture and origin change by pose.
  `BoonCards.show` rebuilds only when the choices change.
- Saving happens in `update` whenever the phase changes away from `running` (checkpoint or fall).

### State model

- `GameState.phase` is `'running' | 'checkpoint' | 'over'`. Nothing moves outside `running`;
  `jump`, `slide` return false and `pick` needs `checkpoint`.
- Coordinates: x is course pixels, left to right; `distance` is the middle of the knight's box.
  Heights (`runner.h`, coin `h`, `TRAP_SPAN`) are pixels up from the road. Screen x is
  `RUNNER_X + x - distance` (`GameScene.sx`), screen y is `GROUND_Y - h`.
- `Runner`: `h`, `vh`, `slideMs`, `slideQueued` (slide on landing after an air drop), `jumps` left,
  `hurtMs` (invulnerable time).
- `traps: Trap[]` (`kind`, `x`, `w`) and `course: Coin[]` (the coins; `pulled` once a lodestone
  catches one). `effects: Effect[]` are short visual timers (`coin`, `hit`, `block`, `dust`).
- `ranks` maps `BoonId` to rank taken; `stats(s)` derives every boon effect from it, so boons have
  no other state except `shields` (Aegis charges, reset from `stats` on each `pick`).
- `nextId` hands out ids for traps, coins and effects; sprite caches key on them.
- All mutation is in `src/game/` (`sim.ts`, `course.ts`). `GameScene` only calls those functions,
  except `restart`, which replaces `state` with `newRun(best)`.
- Invariants: `distance <= checkpointX`; `choices` is non-null only at a checkpoint and holds two
  ids; `hearts` is clamped to `stats().maxHearts` on `pick`; a pit only hurts when grounded over
  its middle; one hit per frame, and none while `hurtMs > 0`.

### Persistence

`localStorage` key `hotfoot-best` holds the best distance in metres. Read once in
`GameScene.create` via `loadBest`; both calls are wrapped in try/catch. Nothing else is saved by
the game; the hub's settings live under the shared `hub-settings` key (see Hub settings).

### Randomness and timing

- `Math.random` is used only in `src/game/course.ts` (`widthOf`, `pickOf`, gap length) and in
  `rollChoices` in `src/game/sim.ts`. The art uses `seeded()` from `pixelArt.ts`, not
  `Math.random`.
- Time comes only from the `time` argument of `GameScene.update`. No timers, tweens or
  `Date.now`.

### Data tables

- `src/game/state.ts`: `RUNNER` box, `GRAVITY`, `JUMP_V`, `DROP_V`, `SLIDE_MS`, `HURT_MS`,
  `START_HEARTS`, `COIN_REACH`, `STAGE_LEN`, `LEAD_IN`, `PX_PER_M`, `speedOf`, `TRAP_SPAN`, and
  the per-rank boon multipliers inside `stats`.
- `src/game/course.ts`: `CLEAR_BEFORE_CHECKPOINT`, `gapsOf`, `widthOf`, trap weights in
  `buildStage`, coin patterns per trap.
- `src/game/sim.ts`: `PULL_SPEED`, `BEHIND`.
- `src/game/boons.ts`: names, card text and max ranks.

### Hub settings

- `src/main.ts` calls `setupGame(game)` from `shared/setupGame.ts` right after creating the game.
  It applies the frame cap, the FPS readout and reduced motion (camera shake and flash become
  no-ops; Hotfoot uses neither).
- Difficulty scales one number: `START_HEARTS` in `src/game/state.ts` is
  `byDifficulty(5, 3, 2)` (easy, normal, hard), from `shared/settings.ts`. It is read once at
  module load, so a change takes effect on the next page load. It sets the hearts of a new run
  (`freshState`) and the base of `maxHearts` in `stats`.
- Hotfoot does not read `settings.reduceMotion` itself: the knight's hurt blink (alpha toggled
  every 80 ms in `GameScene`) still blinks with reduced motion on. The root `AGENTS.md` asks for
  blinking effects to be held still, so this is a gap to fix.
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
  either side of `TAP_SPLIT_Y`, and the centre of the first boon card.
- Values the test copies and that must stay in sync: `VIEW` 960x540, `HALF_W` 14 (half of
  `RUNNER.w`), `STAGE_1` (3 hearts, speed 260, `checkpointX` 3200), and the reaction distances in
  `REACT`. It also asserts stage 1 has all three trap kinds (the `opening` list in `buildStage`),
  a jump peak above 100 px, a slide, coins, zero hits, two different choices matching the card
  order, and that stage 2 is faster and laid out past 3200.
- The test loads the game by its folder URL in `page.goto`, which must follow the folder name.

## Making common changes

- Add a boon: add the id to `BoonId` and an entry to `BOONS` in `src/game/boons.ts`; apply its
  effect in `stats` in `src/game/state.ts` (or in `pick` for a one-off effect like heart and mend);
  draw it in `ICONS` in `src/art/icons.ts` (the `Record` type forces this); update the README table.
- Add a trap: add the kind to `TrapKind` and a `TRAP_SPAN` entry (pits are special-cased in
  `touches`), place it in `buildStage` and `widthOf` in `course.ts`, bake its art in
  `src/art/scenery.ts`, and create its sprite in `GameScene.drawWorld`. Stage 1's `opening` list
  and the test's kind check and jump/slide choice need updating if stage 1 should include it.
- Tune difficulty: `speedOf` and `STAGE_LEN` in `state.ts`, `gapsOf` in `course.ts`. Changing
  stage 1's speed, length or Normal hearts means updating `STAGE_1` in the test. To change what
  the hub's Difficulty setting scales, edit the `byDifficulty` call (see Hub settings) and the
  README's difficulty line.
- Move the screen layout: edit `src/scenes/layout.ts`; then check the test's tap points and the art
  that reads `GROUND_Y` and `VIEW` (pit depth and blade length in `scenery.ts`).
- Save more between runs: extend `src/game/save.ts`, keep keys prefixed `hotfoot-`.

## Gotchas

- Trap widths must have a baked texture: `widthOf` returns 36/48/60 for spikes and 80/96/112 for
  pits, and `scenery.ts` bakes `spikes-<w>` and `pit-<w>` for exactly those widths.
- The blade art hangs to 34 px above the road, hard-coded in `blade()` in `scenery.ts`; it must
  match `TRAP_SPAN.blade.lo`, which must stay above `RUNNER.slideH` (26) and below `RUNNER.h` (60).
- `buildStage` relies on `nextId` and `stageStart`/`checkpointX` being set first; `nextStage` sets
  them before calling it. Traps and coins of the next stage are appended, not replaced.
- A collected coin gets `x = NaN` and is filtered out at the end of the same `tick`.
- `pick` sets `shields` from `stats`, so Aegis charges refill only when a boon is taken at a
  checkpoint, never mid-stage.
- The test's choice of which boon to pick depends on the seeded `rollChoices` order; changing the
  number of `Math.random` calls in `buildStage` changes both the course and the boons offered.
- Hearts in the HUD are created up to `maxHearts` and never destroyed; extra ones are hidden.
- Healing art uses the green `HEAL` ramp. Never draw a red cross (root `AGENTS.md`).
