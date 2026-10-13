# Golem Garden: guide for agents

How Golem Garden is built and where things stand, for agents changing it. README.md covers how to
play and the golem and pest numbers. Keep this file up to date with any change to the game, per the
root AGENTS.md.

## Current state

Golem Garden is a real-time tower defense on a fixed 12x7 garden. Pests walk a dirt path from the
left edge to the Heartwood at its end. The player plants seeds on soil cells beside the path; each
grows into a golem that throws at pests within reach. Squashed pests drop sap, which buys seeds and
golem levels. Waves come one at a time, started by the player, without end.

Implemented today:

- One screen (`GameScene`): the garden, a HUD (wave, Heartwood leaves, sap, best), a side panel
  with two seed buttons, a hint text and the wave button, a hover outline with the reach circle
  and a ghost golem, a "Wave N cleared" banner and a game-over overlay with a "Replant" button.
- Two golems, pebble and moss (moss slows), each with three levels.
- Three pests, beetle, slug and crow, in waves from `waveFor`.
- Only the most waves ever cleared persists.

Missing or rough:

- No title screen, sound, selling or moving golems, speed-up button or pause.
- Pests come in at the board's left edge from under a covering strip, so they pop in at the first
  path cell's left half.
- Pests on the same stretch can overlap; nothing spreads them out.
- Tints (hit flash, slow) only show with the WebGL renderer; the playthrough's canvas renderer
  draws pests untinted.
- `src/art/pixelArt.ts` is copied from Tiny Kingdom; `bakePixelArt` and `padRows` are unused.
- The cover was captured by hand by calling the scene's methods; refresh it the same way.

## Architecture

File map (`src/`):

- `main.ts`: creates the `Phaser.Game` (960x540, `Phaser.Scale.FIT`, `pixelArt: true`) with
  `BootScene` and `GameScene`, calls `setupGame(game)` from `shared/setupGame.ts`, and in dev
  builds puts `game` on `window`.
- `scenes/BootScene.ts`: calls `bakeSprites`, then starts `Game`.
- `scenes/GameScene.ts`: builds the garden, HUD, panel, banner and game-over overlay; turns taps
  into `select`, `plant`, `upgrade` and `startWave`; calls `tick` in `update` and draws golems,
  pests, shots, bars and the hover from the state.
- `scenes/layout.ts`: `VIEW`, `HUD`, `PANEL`, `SEED_BUTTONS`, `WAVE_BUTTON`, `BUTTON`,
  `UI_DEPTH`, `FONT`, and re-exports `GRID` and `cellCentre` from `game/board.ts`.
- `game/board.ts`: `GRID`, `PATH_CORNERS`, the `Cell` type, `MAP` (built from the corners),
  `cellCentre`, `cellAt`, `PATH_LENGTH` and `pathPoint` (position and facing at a distance along
  the path).
- `game/data.ts`: `GOLEMS`, `GOLEM_INFO`, `MAX_LEVEL`, `UPGRADE_COST`, `golemStats`, `PESTS`,
  `PEST_INFO`, `PEST_HP_SCALE` (difficulty), `waveFor`, `waveBonus` and `START`.
- `game/state.ts`: `GameState`, `Golem`, `Pest`, `Shot`, `SHOT_MS`, `newGame`, `select`,
  `golemAt`, `canPlant`, `plant`, `upgradeCost`, `upgrade`, `startWave` and `tick`. No Phaser.
- `game/save.ts`: `loadBest` and `saveBest`.
- `art/sprites.ts`: the palette `C` and every texture in `ART`, drawn on `PixelCanvas`es and
  baked at 2x: `cell-soil-0..2`, `cell-path`, `cell-heart`, `sprout`, `golem-<kind>`,
  `pest-<kind>`, `shot-<kind>`, `sap` and `leaf`.
- `art/pixelArt.ts`: `PixelCanvas` and `seeded`.
- `ui/Button.ts`: `makeButton`, used by the game-over overlay.

Shared code it imports (outside the game folder): `shared/setupGame.ts` (`setupGame`) and
`shared/settings.ts` (`byDifficulty`, `settings`).

How it runs:

- `GameScene.update` takes game time from the frame's timestamp (clamped to `MAX_STEP_MS`) and
  calls `tick`, which plays it in steps of at most 16ms. Each step: shots age, the wave's queue
  spawns pests whose `atMs` has come, pests walk (slowed if `slowMs`), pests past `PATH_LENGTH`
  bite the Heartwood, seeds grow, grown golems off cooldown throw at the pest furthest along the
  path within `golemStats(...).range` (damage lands at once; the `Shot` is only drawn), squashed
  pests pay their bounty, and an empty queue with no pests ends the wave with `waveBonus`.
- Input: one zone over the board; `pointermove` sets `hover`, `pointerdown` calls `tapCell`,
  which upgrades the golem on the cell or else plants. The seed buttons call `select`, the wave
  button `startWave`. The game-over dim rectangle swallows taps.
- Rendering is diffed by id: `golems`, `pests` and `shots` map state ids to images, created and
  destroyed as the state changes; bars and the hover are redrawn each frame; `refresh` rewrites
  the HUD and panel.

State model (`GameState` in `src/game/state.ts`): `wave` (being fought, or next while building),
`phase` (`'build'`, `'wave'` or `'over'`), `heart`, `sap`, `selected`, `golems`, `pests`,
`queue`, `waveMs`, `waveHpScale`, `shots`, `kills`, `best` and `nextId`. Golem positions are
cells; pest positions are `dist` pixels along the path.

Persistence: one `localStorage` key, `golem-garden-best`, the most waves ever cleared, written by
the scene whenever `state.best` rises. The garden itself is never saved. The hub's settings are
read from the shared `hub-settings` key.

Randomness and timing: no `Math.random`, `Date.now` or `performance.now`. Waves are fixed by
`waveFor`; art uses `seeded`. Game time is only the frame timestamps Phaser passes to `update`.

### Hub settings

- `src/main.ts` calls `setupGame(game)` right after creating the game: frame cap, FPS readout and
  reduced motion (the camera shake when a pest reaches the Heartwood becomes a no-op).
- Difficulty scales pest health: `PEST_HP_SCALE = byDifficulty(0.75, 1, 1.3)` in
  `src/game/data.ts`, folded into each wave's `hpScale`. Keep the Golem Garden row of the root
  README's difficulty table and the README's line in step.
- `settings.reduceMotion` also turns off the white hit flash on pests, the red flash on the
  Heartwood and the crows' bobbing.
- Keep Normal exactly as designed: the playthrough runs on Normal.

## Testing hooks

- `src/main.ts` exposes `window.game` in dev builds. The test reads `game.scene.getScene('Game')`
  and its `state` (copied through JSON), `seedButtons` (`{ kind, x, y, w, h }` per button) and
  `waveButton` (`{ x, y, w, h }`), all in view pixels.
- Inputs: it clicks the seed buttons, cell centres and the wave button, scaling view pixels by
  the canvas bounding box.
- The test mirrors these, so change them together: the `GameState` fields it reads, `GRID`,
  `VIEW`, `START`, the pebble seed's cost and grow time (`PEBBLE`), wave 1's beetle count, bounty
  and bonus (`WAVE_1`), the cells it plants on (`PLANTS`, inside the path's bends) and a path cell
  (`PATH_CELL`). Moving the path, weakening the pebble golem or toughening wave 1 can make the two
  golems miss a beetle; the test then fails on `heart`.
- It saves `playthrough-0-start`, `-1-sprout`, `-2-wave` and `-3-cleared` screenshots; copy them
  into `docs/screenshots/` with the `playthrough-` prefix when the look changes.

## Making common changes

- **Retune a golem or pest**: its row in `GOLEM_INFO` or `PEST_INFO`, the README tables, and the
  test's constants if it is the pebble golem or the beetle.
- **Add a golem**: add it to `GOLEMS` and `GOLEM_INFO`, draw `golem-<kind>` and `shot-<kind>` in
  `src/art/sprites.ts`, and add a y to `SEED_BUTTONS.ys` (the panel has room for one more if the
  hint moves down).
- **Add a pest**: add it to `PESTS` and `PEST_INFO`, draw `pest-<kind>`, and give it spawns in
  `waveFor` (from wave 2 or later, so the playthrough's wave 1 stays beetles only).
- **Change the path**: edit `PATH_CORNERS` (straight runs only, starting off the left edge at
  col -1); `MAP` follows. Re-pick the test's `PLANTS` and `PATH_CELL`.

## Gotchas

- `SEED_BUTTONS.ys` is indexed in `GOLEMS` order.
- A golem's damage lands when it throws; the shot image is cosmetic, so a pest can vanish before
  the rock arrives.
- `tapCell` upgrades whenever the cell has a golem, so planting never replaces one.
- The scene saves `best` on any rise, including mid-garden; `newGame` reads it back on restart.
