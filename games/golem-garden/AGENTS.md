# Golem Garden: guide for agents

How Golem Garden is built and where things stand, for agents changing it. README.md covers how to
play and the golem and pest numbers. Keep this file up to date with any change to the game, per the
root AGENTS.md.

## Current state

Golem Garden is a real-time tower defense on a 12x7 garden, one of three layouts (`GARDENS`).
Pests walk dirt paths from the left edge to the Heartwood at their end. The player plants seeds on
soil cells beside the path; each grows into a golem that throws at pests within reach. Squashed pests drop sap, which buys seeds and
golem levels. Waves are started by the player, without end; the next one can be called early. The
art is claymation (plasticine on a studio table), painted in code at startup.

Implemented today:

- One screen (`GameScene`): the garden, a clay HUD strip (title, the garden tag that opens the
  garden picker, wave, Heartwood leaves, sap, the Heartwood bloom tag with five flowers, best, the
  1x/2x speed button), a side panel with three seed cards (the third, Thorn, shown as a padlock
  card until the Heartwood blooms), the next wave's preview, a hint line and the wave button, a
  hover outline with a bead ring for reach and a ghost golem, the golem menu, a banner for cleared
  or called waves, buds and the Queen Slug, and the garden picker overlay (also the game-over
  screen).
- Three golems, pebble, moss (slows) and thorn (pricks every pest in reach at once), each with
  three levels.
- Golem menu (GG1): tapping a golem opens Raise (`upgrade`), Move (`move`, `MOVE_FEE` = 10 sap,
  then a tap on free soil) and Uproot (`uproot`, gives back `UPROOT_REFUND` = 70% of
  `Golem.spent`). The speed button sets `state.fast`; the scene plays `FAST` (2) times the frame's
  time.
- Combos (GG2, `comboAt`): a grown moss golem one cell up, down, left or right of a pebble golem
  makes its hits on slowed pests do `COMBO.slowedDamage` (1.5x); of a thorn golem, makes it prick
  `COMBO.thornPricks` (2) times per throw. The scene draws a clay vine with a gold (pebble) or pink
  (thorn) bead between the pair.
- Seven pests in waves from `waveFor`: beetle, slug, crow, mole (from wave 4; `tunnel`: under
  ground between 30% and 60% of its route, untargetable, drawn as the `mound`), armoured snail
  (from 5; `armour` 4 off every hit, down to 1), aphid (from 6, in swarms) and the Queen Slug
  (`boss`, every `BOSS_EVERY` = 10th wave; `slime`: the 3x3 cells round her cell are slimed for
  `SLIME.ms`, and golems on slimed cells cool down at `SLIME.slow` speed).
- Gardens (GG5): Meadow (the first, the playthrough's), Forked Brook (best 5; two routes that
  split and rejoin) and Two Gates (best 10; two entrances). Pests take a garden's routes in turn
  (`state.spawned`). The garden tag and the game-over screen show the picker; a card plants that
  garden afresh (`saveGarden`, then `scene.restart`).
- Heartwood bloom: each wave cleared or called early opens a bud (`state.bloom`, up to
  `BLOOM_GOAL` = 5), drawn on the tree and on the HUD tag; at 5 the Thorn golem unlocks. The bloom
  is saved and kept between gardens, so once full the Thorn golem stays unlocked.
- Calling early: once a wave's queue is empty, the wave button reads "Call wave N now, +15 early";
  `startWave` then finishes the current wave at once (bonus, bud, best) plus `EARLY_BONUS` and
  starts the next. The preview above it counts the next wave's pests with `waveCounts`.
- Sap pops: each squashed pest pushes a `Pop` onto `state.pops`; the scene drains them into a
  splat, a "+N" label and three droplets that arc to the sap counter, whose glow pulses as they
  land.
- The most waves ever cleared, the bloom and the garden last picked persist.

Missing or rough:

- No title screen, sound or pause.
- The preview fits six kinds; the Queen Slug is named in its title instead of an icon.
- The golem menu can cover a neighbouring golem; it opens below golems in the top two rows.
- Pests come in at the board's left edge from under a strip of table (`edge`), so they pop in at
  the first path cell's left half.
- Pests on the same stretch can overlap; nothing spreads them out.
- The hit flash is a fill tint, which the canvas renderer (used by the playthrough) does not draw.
- Calling early counts the current wave as done even though its last pests are still walking:
  they can still bite the Heartwood, but its bonus and bud are already paid.
- Canvas `filter: blur` (the clay's soft shadows) is ignored by Safari, so shadows are hard there.
- The cover and the loop screenshots (`heartwood-bloom`, `call-early`, `sap-pops`, `golem-menu`,
  `golem-move`, `new-pests`, `queen-slug`, `garden-picker`, `forked-brook`, `two-gates`) were
  staged through `window.game` with a scratch Playwright script against the dev server (set
  `state` fields and `localStorage` keys, push pests or pops, click cells and buttons, pause the
  scene); refresh them the same way.

## Architecture

File map (`src/`):

- `main.ts`: creates the `Phaser.Game` (960x540, `Phaser.Scale.FIT`, `pixelArt: false`) with
  `BootScene` and `GameScene`, calls `setupGame(game)` from `shared/setupGame.ts`, and in dev
  builds puts `game` on `window`.
- `scenes/BootScene.ts`: calls `bakeTextures`, then starts `Game`.
- `scenes/GameScene.ts`: builds the garden, HUD, panel, golem menu, banner and garden picker;
  turns taps into `select`, `plant`, `upgrade`, `move`, `uproot`, `startWave` and the speed
  toggle; calls `tick` in `update` and draws slime, golems (and combo vines), pests (and mole
  mounds), shots, bars, level beads and the hover from the state; turns `state.pops` into splats,
  "+N" labels and flying droplets (`sapPop`); shows the banner (`waveDone`, `announce`); saves
  best and bloom in `refresh` when they rise.
- `scenes/layout.ts`: `VIEW`, `HUD` (title, garden tag and tag positions), `SPEED_BUTTON`,
  `GOLEM_MENU`, `GARDEN_CARD`, `PANEL`, `SEED_BUTTONS` (`ys` and `hs` per
  card), `PREVIEW`, `HINT`, `WAVE_BUTTON`, `BUTTON`, `UI_DEPTH`, `FONT` (a system sans stack), and
  re-exports `GRID` and `cellCentre` from `game/board.ts`.
- `game/board.ts`: `GRID`, the `Cell`, `Route` and `Garden` types, `GARDENS` (each with its
  name, blurb, `unlockAt`, `routes`, `map` and `heart`, built from corner lists), `cellCentre`,
  `cellAt` and `pathPoint(route, dist)` (position and facing at a distance along a route).
- `game/data.ts`: `GOLEMS`, `GOLEM_INFO` (with `area` and `locked` for the thorn golem),
  `BLOOM_GOAL`, `EARLY_BONUS`, `UPROOT_REFUND`, `MOVE_FEE`, `FAST`, `COMBO`, `MAX_LEVEL`,
  `UPGRADE_COST`, `golemStats`, `PESTS`, `PEST_INFO` (with `armour`, `tunnel`, `slime`, `boss`),
  `BOSS_EVERY`, `SLIME`, `PEST_HP_SCALE` (difficulty), `waveFor`, `waveCounts`, `waveBonus` and
  `START`.
- `game/state.ts`: `GameState`, `Golem`, `Pest`, `Shot`, `Pop`, `Slime`, `SHOT_MS`, `newGame(best,
  bloom, garden)`, `gardenOf`, `unlocked`, `select`, `golemAt`, `freeSoil`, `canPlant`, `plant`,
  `upgradeCost`, `upgrade`, `uprootValue`, `uproot`, `canMove`, `move`, `neighbours`, `comboAt`,
  `slimed`, `canCallEarly`, `nextWave`, `startWave` (returns `'start'`, `'early'` or null) and
  `tick`. No Phaser.
- `game/save.ts`: `loadBest`/`saveBest`, `loadBloom`/`saveBloom`, `loadGarden`/`saveGarden`.
- `art/clay.ts`: the claymation toolkit. `bake` paints a view-sized canvas in art units (2 per
  view pixel) around an anchor and adds it with `textures.addCanvas`; `clay` shades any path as
  plasticine (shadow, top-left light, rim, fingerprint, glint), with `E`, `R` and `Pp` for
  ellipses, rounded rectangles and blobs; the palette `C`; the seeded `rnd` and `reseed`; and the
  painters `drop`, `flower`, `golem`, `sprout` and `pest` (all seven pests; the queen is the slug
  at 1.7x with a crown), ported from the approved mockup's
  drawing script.
- `art/textures.ts`: `bakeTextures` (every texture, listed at the top of the file: `bg-0`,
  `edge`, `tree`, `bud`/`bloom`, `golem-<kind>`, `sprout`, `pest-<kind>`, `mound`, `slime`,
  `slow`, `shot-<kind>`, `sap`, `glow`, `splat`, `leaf`, `card-<h>[-dim]`, `rim-<h>`,
  `card-locked`, `btn-wave[-off]`, `menu`, `chip[-off]`, `speed[-on]`, `pill`,
  `gcard[-rim|-locked]`, `btn`), `bakeGarden` and `gardenBg` (each garden's `bg-<n>`, baked when
  it is first planted) and `TREE_FLOWERS`, where the five flowers sit on the tree. A garden's
  static scene (table, garden slab, paths, soil beds, HUD strip and tags, panel slab, preview pad)
  is its one `bg-<n>` texture.
- `ui/Button.ts`: `makeButton`, the clay button used by the garden picker's Back.

Shared code it imports (outside the game folder): `shared/setupGame.ts` (`setupGame`) and
`shared/settings.ts` (`byDifficulty`, `settings`).

How it runs:

- `GameScene.update` takes game time from the frame's timestamp (clamped to `MAX_STEP_MS`) and
  calls `tick` (with twice the time when `fast`), which plays it in steps of at most 16ms. Each
  step: shots and slime age, the wave's queue spawns pests whose `atMs` has come (each on the next
  route in turn), pests walk (slowed if `slowMs`; a mole's `under` is set in its tunnel; the queen
  slimes the cells round her), pests past their route's `length` bite the Heartwood, seeds grow,
  grown golems off cooldown (slower on slime) throw at the pest furthest along its route (as a
  share of it) within `golemStats(...).range` and not `under` (a thorn golem hits every pest in
  reach; combos and armour change the damage, which lands at once; the `Shot` is only drawn), squashed pests pay their bounty and push a `Pop`, and an empty
  queue with no pests ends the wave (`finishWave`: `waveBonus`, a bud, `best`).
- Input: one zone over the board; `pointermove` sets `hover`, `pointerdown` calls `tapCell`,
  which moves the golem being moved (`moving`) there, else toggles the menu of the golem on the
  cell (`picked`), else closes an open menu, else plants. The menu's chips call `upgrade`, start a
  move or `uproot`. The seed cards call `select` (refused for a
  locked kind; the locked thorn card's own image is hidden, so a tap on it does nothing), the wave
  button `startWave`, the speed button toggles `fast`, the garden tag opens the picker. The
  picker's dim rectangle swallows taps.
- Rendering is diffed by id: `golems`, `pests` (body, slow-clump and mound images), `shots` and
  `slimes` (by cell) map state ids to images, created and destroyed as the state changes; bars, level beads and the hover are
  redrawn each frame on Graphics; `refresh` rewrites the HUD, flowers, cards, preview and wave
  button. Splats, labels and droplets are fire-and-forget objects on Phaser tweens.

State model (`GameState` in `src/game/state.ts`): `garden` (index into `GARDENS`), `wave` (being
fought, or next while building), `phase` (`'build'`, `'wave'` or `'over'`), `heart`, `sap`,
`selected`, `golems` (each with `spent`), `pests` (each with `route` and `under`), `queue`,
`spawned`, `slime`, `fast`, `waveMs`, `waveHpScale`, `shots`, `kills`, `bloom` (0 to 5), `pops`
(squashed pests not yet shown; the scene empties it every frame), `best` and `nextId`. Golem
positions are cells; pest positions are `dist` pixels along their route. The open menu and the
golem being moved (`picked`, `moving`) are the scene's, not the state's.

Persistence: three `localStorage` keys, written by the scene: `golem-garden-best` (the most waves
ever cleared, when `state.best` rises), `golem-garden-bloom` (the Heartwood's bloom, when it rises;
kept between gardens, so the Thorn golem stays unlocked once it blooms) and `golem-garden-garden`
(the garden last picked, which a reload plants). The garden's golems and pests are never saved.
The hub's settings are read from the shared `hub-settings` key.

Randomness and timing: no `Math.random`, `Date.now` or `performance.now`. Waves are fixed by
`waveFor`; art uses the seeded `rnd` in `art/clay.ts`. Game time is only the frame timestamps
Phaser passes to `update`; the pops' tweens run on Phaser's clock and are cosmetic.

### Hub settings

- `src/main.ts` calls `setupGame(game)` right after creating the game: frame cap, FPS readout, reduced motion and full screen (the camera shake when a pest reaches the Heartwood becomes a no-op).
- Difficulty scales pest health: `PEST_HP_SCALE = byDifficulty(0.75, 1, 1.3)` in
  `src/game/data.ts`, folded into each wave's `hpScale`. Keep the Golem Garden row of the root
  README's difficulty table and the README's line in step.
- `settings.reduceMotion` also turns off the white hit flash on pests, the warm flash on the
  Heartwood and the crows' bobbing, and in `sapPop` keeps the "+N" label still (it only fades) and
  skips the flying droplets and the sap counter's glow.
- Keep Normal exactly as designed: the playthrough runs on Normal.

## Testing hooks

- `src/main.ts` exposes `window.game` in dev builds. The test reads `game.scene.getScene('Game')`
  and its `state` (copied through JSON), `seedButtons` (`{ kind, x, y, w, h }` per card),
  `waveButton` (`{ x, y, w, h }`), all in view pixels, and `waveLabel` (the wave button's text on
  one line, such as `Start wave 1` or `Call wave 2 now, +15 early`).
- Inputs: it clicks the seed cards, cell centres and the wave button, scaling view pixels by the
  canvas bounding box.
- The test mirrors these, so change them together: the `GameState` fields it reads, `GRID`,
  `VIEW`, `START`, the Meadow's path (the playthrough plays it, with no saved keys), the pebble seed's cost and grow time (`PEBBLE`), wave 1's beetle count, bounty
  and bonus (`WAVE_1`), `EARLY_BONUS`, the wave button's labels, the cells it plants on (`PLANTS`,
  inside the path's bends) and a path cell (`PATH_CELL`). It also checks the thorn card picks
  nothing while locked, the early-call label once wave 1's queue is empty (it does not take it),
  and `bloom` going from 0 to 1 when wave 1 is cleared. Moving the path, weakening the pebble
  golem or toughening wave 1 can make the two golems miss a beetle; the test then fails on `heart`.
- It saves `playthrough-0-start`, `-1-sprout`, `-2-wave` and `-3-cleared` screenshots; copy them
  into `docs/screenshots/` with the `playthrough-` prefix when the look changes.

## Making common changes

- **Retune a golem or pest**: its row in `GOLEM_INFO` or `PEST_INFO`, the README tables, and the
  test's constants if it is the pebble golem or the beetle.
- **Add a golem**: add it to `GOLEMS` and `GOLEM_INFO`, give `golem()` in `src/art/clay.ts` its
  look, bake `golem-<kind>` and `shot-<kind>` in `src/art/textures.ts`, and add a card to
  `SEED_BUTTONS.ys` and `hs` (the panel is full; the preview or the hint would have to shrink).
- **Add a pest**: add it to `PESTS` and `PEST_INFO`, give `pest()` in `clay.ts` its look (bake it
  as `pest-<kind>` in `textures.ts`; it is used in the preview too, which fits six kinds), its
  health bar height in `PEST_TOP` if it is not slug-sized, and give it spawns in `waveFor` (from
  wave 2 or later, so the playthrough's wave 1 stays beetles only). Add its README row.
- **Add a garden**: a `garden(...)` entry in `GARDENS` with its corner lists (straight runs,
  starting off the left edge at col -1, every route ending on the same Heartwood cell). The
  background, picker card and mini map follow; `GARDEN_CARD` fits three cards side by side.
- **Retune combos, the boss or the menu's prices**: `COMBO`, `BOSS_EVERY`, `SLIME`, the queen's
  `PEST_INFO` row, `UPROOT_REFUND` and `MOVE_FEE` in `data.ts`, and the README.
- **Change the bloom goal or early bonus**: `BLOOM_GOAL` and `EARLY_BONUS` in `data.ts`. The HUD
  draws `BLOOM_GOAL` flowers but the tree has five spots (`TREE_FLOWERS`), and the test's
  `EARLY_BONUS` mirrors the bonus.
- **Change a path**: edit its garden's corner lists in `GARDENS`; the `map` and the painted path
  follow. For the Meadow, re-pick the test's `PLANTS` and `PATH_CELL`.
- **Restyle**: shapes live in `clay.ts`, placements and the static `bg` in `textures.ts`; texture
  sizes and anchors there must match the origins in `GameScene` (`GOLEM_ORIGIN`, `PEST_ORIGIN`,
  the sprout's and the tree's origins).

## Gotchas

- `SEED_BUTTONS.ys` and `hs` are indexed in `GOLEMS` order; a 68px-tall card uses the short card
  layout (the thorn golem's).
- `startWave` during a wave returns null until the queue is empty. The scene shows the "called
  early" banner itself (from the click), while a natural clear is spotted in `update`.
- A golem's damage lands when it throws; the shot image is cosmetic, so a pest can vanish before
  the rock arrives.
- `tapCell` opens the menu whenever the cell has a golem, so planting never replaces one, and a tap
  anywhere with a menu open only closes it.
- The scene saves `best` and `bloom` on any rise (in `refresh`, so an early call counts too);
  `newGame` reads them back on restart.
- Picking "furthest along" compares the share of each pest's route walked, since a forked
  garden's routes can differ in length.
- A pest's texture origin is `PEST_ORIGIN`, except the bigger queen's (`QUEEN_ORIGIN`).
