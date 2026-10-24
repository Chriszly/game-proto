# Mazewright: guide for agents

How Mazewright is built and where things stand, for agents changing it. README.md covers how to
play, the towers, the foes and the gardens. Keep this file up to date with any change to the game,
per the root AGENTS.md.

## Current state

Mazewright is a maze-building tower defense in a Hedge Garden look, drawn in flat vector shapes
(clean fills, soft drop shadows, no outlines). There is no road: foes walk from a burrow to the
cottage by the shortest free way across a 22x11 grid, and every hedge and tower is a wall. The core
rule is that a free route always remains: a placement is refused when it would leave either burrow,
or any foe on the ground, without a way to the cottage.

Implemented today:

- Three gardens (`MAPS`): Meadow, Orchard and Millpond, each with two burrows, a cottage and fixed
  rocks. The picker shows each garden's best wave.
- The pouch: under the garden cards, chips in two rows (`CHIPS.perRow`) for the thirteen towers and two traps besides `hedge` and `bow` (`ALWAYS`);
  up to `POUCH_PICKS` (4) are picked, saved, and make the run's tool bar (six buttons at most).
  `DEFAULT_POUCH` is today's four (hedge, bow, frost, cannon), which the playthrough uses.
- Towers (`TOWERS`), levels 1 to 3 and the master level `MASTER` (4; hedges stay at 1), sold for 70% of what they cost: `hedge`
  (blocks only), `bow`, `frost` (pulse, slows), `cannon` (splash, ground only), `storm` (a bolt that
  chains to foes within `jump` of each other), `crossbow` (long reach, aims at the toughest),
  `bonfire` (a cone the way it faces, sets ground foes burning), `puffball` (poison that spreads once
  to ground foes close by), `sunglass` (a beam along its row or column to the first blocked tile),
  `beehive` (towers on the 8 tiles round it reload faster; the best hive counts), `apple` (gold
  each held wave), `whirligig` (reload spins down from 0.6 s while it keeps firing), `swallow`
  (`airOnly`), `nettle` (pulses `stun` into ground foes in reach: `Foe.stunUntil` stops `moveFoe`)
  and `toadstool` (shrinks the foe it picks once: `shrink` of its health, `body` 0.8, a life less,
  `Foe.shrunk`). The master level costs `upgradeCost(kind, 3)` (4 times the cost), uses level 3's
  numbers (`tier`) and adds a trick from `MASTER_TRICKS`, each coded in `fire`, `boosts`,
  `moveShot` and the wave payout (`hurt`'s `pierce` skips shells; `Shot.pierce`, `Shot.knock`,
  `Foe.blueFlame`); the panel shows `${kind}Master` from level 3. Bonfire and
  sunglass `faces`: they first point where they cover most of the route (`bestFace`) and turn a
  quarter round from their panel (`turn`).
- Foes (`FOES`): `beetle`, `ladybird`, `stag`, `moth` (flies straight over the maze), `mole` (chews
  through one hedge in its life when that saves it at least `CHEW_GAIN` steps; towers and rocks are
  never chewed), the `weevil` (from wave 8), `woodlouse` (`splits` into two small ones),
  `earwig` (fastest), `snail` (rubbery shell, `heals` a share of its health a second unless chilled
  or poisoned), `ember` (shell `ember`: no Heat) and the `queen` (wave 10). On wave 20 the queen is
  the Empress (`EMPRESS`: lays a beetle every `egg` seconds, and every `turn` seconds takes the
  shell in `RESISTS` against the damage kind that hurt her most; event `shell`).
- Stolen cabbages: `lives` are the cabbages in the patch. A foe reaching the cottage `grab`s
  `min(f.lives, g.lives)` into `carry`, turns `home` and walks `homeDist[gate]` (a field to each
  burrow, made again with `dist` in `refield`) back; at its burrow they are lost (event `leak`). A
  beaten carrier `drop`s them as a `Loose` cabbage that `roll`s back along `dist` at `CABBAGE.speed`
  (straight, off a moth) and is picked up by any foe with free hands within `CABBAGE.reach`; back
  in the patch it adds to `lives` (event `saved`). `remaining` for a foe going home is its way to
  the burrow. The game is lost when `cabbagesLeft` is 0; building on a loose cabbage is refused
  like a foe.
- Garden traps: `honey` and `snare` are pouch picks with `TowerDef.trap`. `build` puts them in
  `g.traps` (`Trap`), not `towers`: they never block, need no open way and may lie under foes
  (`canBuild`), and can't be upgraded or sold. `springTraps` (each `step`): a honey pot springs
  when a ground foe is within `TRAP.honey.lure`, makes `field` (a walking field to its cell, made
  again in `refield`) and sets `Foe.lure` on the ground foes in reach, which `moveFoe` follows
  instead of `dist`; after `TRAP.honey.for` seconds it bursts (blast and `stunUntil`). A snare
  catches the first ground foe whose `from` is its cell. Events `lured`, `burst`, `snared`.
- Kings and big foes: a `Group` may carry `{ king: true }` (`KING`: hp, gold, lives, body, speed;
  `KING_TRICKS`: a king mole chews 3 hedges, a king woodlouse splits into 4, a king moth lets 3
  moths go) or `{ size: 2 | 3 }` (`BIG`). `makeFoe` and `offspring` build foes; a `Foe` keeps its
  `body` (draw radius in tiles), `gold`, `lives`, `chews`, `splits` and `shell`. After the last
  wave's groups, `RUSH_KINDS` each send one king, `RUSH.delay` seconds later and `RUSH.gap` apart (event `rush`); events `king`, `split`, `egg`.
- Damage kinds (`DAMAGE_KINDS`, a tower's `hits`) and shells (`SHELLS`, a foe's `shell`):
  `shellFactor` gives the share that gets through (stag waxy, mole hairy, weevil hard). Burning is
  Heat, poison goes through every shell. Sunglass and bonfire hits add `HEAT.hit` to a foe's `heat`
  (cooling by `HEAT.cool` a second); at 1 it takes `HEAT.boost` times Heat damage.
- Aim (`AIMS`, a tower's `target`): first, last, strongest, weakest or fliers first, set from the
  panel for the towers where `aims(kind)` holds; a `TowerDef.aim` sets the start (crossbow:
  strongest). Sell asks for a second tap within 2 seconds.
- 20 waves (`WAVES`); the second burrow is used from wave `SECOND_GATE` (6), but both routes must
  stay open all game. Wave 1 starts by hand (Start wave). After it, unless `calm` (the picker's
  toggle, saved), `nextAt` is set `WAVE_TIMER` (20) seconds after a wave is all out and `step`
  starts the next then; Start wave still sends it early, for `EARLY_BONUS` gold while foes are out.
- Growing (`GROW_RATE`): `build` and `upgrade` set a tower's `grow` (and `growFull`) to its cost
  over 10 seconds; `fire` only counts it down while it grows, and a growing beehive boosts nothing.
  The scene draws it faint with a filling ring.
- Building during a wave is allowed; a tile with a foe on it (or walking onto it) is refused.
- Hover preview: the routes as they would be with the hovered tile planted, or the no-entry ring.
- Drag to plant a line; keys 1 to 6 (the pouch, in order), Space and F; a 2x speed button. The
  picked tool's use is told in the top bar.
- Banners name each new foe kind the first time it comes, the second burrow, the first stolen
  cabbage (`grabbed`), a chewing mole, a king
  (`kingComing`), the final rush (`rush`) and the Empress's shell turns (`empressShell`). Kings
  wear a crown (`art.foe` with `king`).

Missing or rough:

- A game in play is not saved; a reload starts at the garden picker.
- No Watch AI mode, no upright layout (an upright phone gets the turn hint).
- Balance was tuned with a scripted bot (a fixed serpentine on the Meadow): building only between
  waves it loses at the final queen on Normal, building during waves it wins with a few lives left
  (before stolen cabbages, which made every maze hold foes twice and the game easier).
  The new towers were checked one at a time beside a serpentine corridor for damage per gold:
  crossbow, cannon, bow, whirligig and puffball do most, the storm rod, bonfire and beehive less
  but need bunched foes, a straight corridor or neighbours to shine, and the sunglass needs a
  corridor in line with it. A tower's balance is a first pass.
- `docs/screenshots/gardens.webp` (the picker with the pouch), `towers.webp`, `aim.webp`, `kings.webp`, `cabbages.webp`, `grow.webp`, `master.webp`, `traps.webp`, `maze.webp`,
  `mole.webp` and `cover.png` were taken by hand (a
  Playwright script that plants a maze and sends waves 8 and 9); `refused.webp` is the
  playthrough's `playthrough-2-refused` shot. Refresh them when the look changes.

## Architecture

File map (`src/`):

- `main.ts`: creates the `Phaser.Game` (960x540 from `VIEW`, `Phaser.Scale.FIT`) with `GameScene`,
  calls `setupGame(game, { howToPlay })` and then `setupScaling(game, { fill: true })`, and in dev
  builds puts `game` on `window`.
- `howToPlay.ts`: the How to play text in English (also US English) and German.
- `i18n.ts` and `i18n/`: the game's texts. `en.ts` is the British English source, `de.ts` the
  German (with `keepEnglish` for the title and Frost) and `en-US.ts` empty. Keys built from ids
  (`${map}Name`, `${map}Text`, `${tower}Name`, `${tower}Text`, `refuse_${reason}`, `new_${foe}`)
  must exist for every id.
- `audio.ts`: `SONG` and the `SFX` table (see Sound).
- `game/rules.ts`: `COLS`, `ROWS`, `TOWERS`/`TOWER` (cost, range, damage and reload by level, air,
  splash, slow, stun, shrink, airOnly), `MAX_LEVEL`, `MASTER`, `tier`, `MASTER_TRICKS`, `harms`, `SELL_BACK`, `upgradeCost`, `SHOT_SPEED`, `FOES`/`FOE` (hp, speed,
  gold, lives, gap, flies, digs, size), `CHEW_TIME`, `CHEW_GAIN`, `WAVES`, `SECOND_GATE`,
  `GROUP_GAP`, `HP_PER_WAVE`, `FINAL_QUEEN`, `startLives`, `START_GOLD`, `hpScale`, `waveReward`,
  `EARLY_BONUS`, `ALWAYS`, `POUCH_PICKS`, `DEFAULT_POUCH`, `attacks`, `ShotKind`, `SPREAD`. A
  `TowerDef` carries the extra numbers of the towers that need them (`chain`/`jump`, `dot`/`dotFor`,
  `faces`/`cone`, `boost`, `apples`, `spinTo`/`spinUp`, `aim`), `DAMAGE_KINDS`, `SHELLS`,
  `shellFactor`, `HEAT`, `AIMS`, `aims`. No Phaser.
- `game/maps.ts`: `MAPS` (`MapDef`: `id`, `gates`, `goal`, `rocks`), `cellIndex`, `cellOf`,
  `inGrid`. A cell index is `row * COLS + col`.
- `game/grid.ts`: `distances` (breadth-first search out from the cottage over free cells, 4
  neighbours), `nextStep` (a neighbour one step closer, keeping the heading on ties, then right,
  down, up, left), `route`, `UNREACHABLE`, `DIRS`.
- `game/sim.ts`: `Game`, `Tower`, `Foe`, `Shot`, `GameEvent`, `Refusal` and the actions:
  `newGame`, `canBuild`, `wouldBlock`, `build`, `nextUpgrade`, `upgrade`, `sellValue`, `sell`, `turn`, `setAim`,
  `canStartWave`, `startWave`, `step`, `remaining`, `routeLength`, `towerAt`, and `beamCells`,
  `inCone` and `bestFace` for the towers that point one way. Only this file
  changes a `Game`. `g.blocked` is 0 free, 1 rock, 2 tower; `g.dist` is made again whenever a cell
  is blocked or freed. A ground foe walks from `from` to `to` (neighbouring cells) with `t` from 0
  to 1, and picks its next cell from `g.dist` on arrival, so a maze changed mid-wave takes effect at
  its next step. `canBuild` refuses a tile in this order: `reserved` (a burrow or the cottage),
  `taken` (a rock or tower; the scene opens the tower's panel instead), `foe`, `blocks` (the
  never-close rule: `open` checks both burrows and every ground foe's `to` cell against the new
  field) and `gold`. Towers pick a foe in reach by their aim (`pick`;
  First is the least `remaining` distance). `step` moves foes, then `afflict` (burning, poison and its
  spread, and cooling), then fires every tower with its beehive `boosts`; `hurt` takes a damage kind
  through the foe's shell, `scorch` is a heat hit that also heats. Apple trees pay out with the wave reward.
- `game/save.ts`: `loadRecords`, `noteRecord`, `loadPouch`, `savePouch`, `pouchOf` (hedge and bow,
  then up to four more in tower order, traps included).
- `scenes/layout.ts`: `VIEW`, `CELL` (40), `GRID` (the grid's corner in the 960x540 frame), the bar
  height, the tool, wave, speed and Gardens buttons, `TIP_X` (the tool's use in the top bar), the
  tower panel (taller with Turn), the garden cards, the pouch's `CHIPS` (two rows, above the corner buttons)
  and `DEPTH`.
- `scenes/art.ts`: `C` (colours), `FOE_COLOUR` and the drawing functions (`lawn`, `flowers`,
  `hedge`, `chewedHedge`, `rock`, `tower`, `burrow`, `cottage`, `foe`, `healthBar`, `dotted`,
  `dashedCircle`, `noEntry`), all on a Phaser Graphics at a cell's middle.
- `scenes/GameScene.ts`: the only scene. Screens `menu` (the garden picker) and `play`. It steps the
  game in fixed `STEP`s (1/60 s, times `speed`), drains `g.events` for sound, flashes and records,
  redraws the rocks, burrows and cottage when the board changes (`boardG`), everything that moves
  each frame (`fxG`: routes, towers, the hover preview, foes, shots, flashes) and the bars, buttons,
  tower panel, banner and end panel when what they show changes (`hudG` and texts). The lawn
  fills the whole view; the bars are pinned to its top and bottom and the grid sits in the middle of
  `viewFrame`. Tools start 176 pixels in, clear of the corner buttons.

Save keys: `mazewright-best` (per garden: best wave and whether it was won), `mazewright-pouch`
(the towers picked) and `mazewright-calm` (`'1'` when waves wait for Start wave).

Test hooks (read by `e2e/playthrough.spec.ts` through `window.game.scene.getScene('Game')`):
`screen`, `state` (the `Game`), `pouch`, `buttons` (every button by id, centred, in view pixels:
`map-<garden>`, `pouch-<tower>`, `tool-<tower>`, `wave`, `speed`, `gardens`, `upgrade`, `sell`,
`turn`, `aim`, `again`) and `grid` (the grid's corner and cell size in view pixels).

Difficulty: `startLives` (30, 20, 12) and `hpScale` (0.8, 1, 1.25) use `byDifficulty`. Reduced
motion holds the frost pulse and cannon boom rings at full size and the gold numbers still.

## Sound

`SONG` (104 BPM, G major): `calm` (the picker and between waves), `battle` (a wave in play, E minor),
`boss` (while a queen or a king is out or to come) and the stings `win` and `lose`.

| Sound | Where |
| --- | --- |
| `plant`, `build` | a hedge or another tower built (`built` event) |
| `upgrade`, `sell` | `upgraded`, `sold` |
| `honey`, `snare` | a honey pot springs, a snare catches a foe (a burst plays `cannon`) |
| `bow`, `cannon`, `storm`, `crossbow`, `bonfire`, `puffball`, `sunglass`, `whirligig`, `swallow`, `nettle`, `toadstool` | a tower fires (`shot`), one per shot, rate-limited |
| `apples` | an apple tree drops its gold (`apples`) |
| `frost` | a frost pulse |
| `pop` | a foe beaten |
| `leak` | a foe takes cabbages from the patch |
| `lost` | cabbages carried into a burrow |
| `saved` | loose cabbages roll back into the patch |
| `horn`, `cleared` | a wave starts, a wave is held |
| `chew` | a mole starts chewing, and the hedge is gone |
| shared `refuse` | a refused placement, a disabled button, Start wave while a wave is still coming out |
| shared `click` | every button |

## Common changes

- **A tower's numbers**: `TOWER` in `rules.ts`. A new tower kind also needs its drawing in
  `art.tower`, its `${kind}Name`/`${kind}Text` texts, a sound named after it in `SFX` if it fires,
  and its firing in `sim.fire`. It gets a pouch chip on its own; the chip row holds 10 at 84
  pixels, so an eleventh pickable tower needs a second row or narrower chips.
- **A foe**: add it to `FOES` and `FOE`, its look in `art.foe` (beetle-shaped foes in `beetle`), its colour in `FOE_COLOUR`, its
  `new_${kind}` text, and put it in `WAVES`.
- **A garden**: add a `MapDef` to `MAPS` (keep both burrows and the cottage free of rocks and the
  burrows able to reach the cottage), its `${id}Name`/`${id}Text` texts and a picker card slot in
  `CARDS.xs`.
- **The playthrough** plays the first wave on the Meadow with the default pouch: hedges in column 4 rows 0 to 9 (a drag),
  a refused tap on (4, 10), bows at (3, 9), (5, 9) and (5, 7), then wave 1 (six beetles). A change to
  `START_GOLD`, the hedge or bow cost or numbers, the beetle or wave 1, `waveReward`, the Meadow's
  rocks, `GRID` or `CELL` goes with its update in `e2e/playthrough.spec.ts`.
