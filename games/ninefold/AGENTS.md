# Ninefold: guide for agents

How Ninefold is built and where things stand, for agents changing it. README.md covers how to play,
the relics and the styles. Keep this file up to date with any change to the game, per the root
AGENTS.md.

## Current state

Ninefold is a number-placement puzzle (every row, column and box holds each digit once) with two
modes and nine unlockable art styles. Classic plays a 9x9 board at Easy, Normal or Hard, plus a
daily puzzle seeded by the date; Delve is a run of floors (4x4, then 6x6, then 9x9 with fewer
givens) with hearts, hints and relics between floors. Every solved board counts towards the style
unlocks; the worn style redraws everything (backdrop, board, panel, buttons, cards).

Implemented today:

- One scene (`GameScene`) with three screens (`screen`: `menu`, `styles`, `board`) and end cards
  over the board for the phases `solved` (Classic and daily), `relic` (a cleared Delve floor) and
  `over` (a Delve run out of hearts).
- Puzzles are made in code (`makePuzzle`): a random full board, then cells emptied while the
  solution stays unique, down to the givens asked for (a board that can't lose more keeps a few
  more). 9x9 boards take a few to a few tens of milliseconds.
- Entering: a right digit is filled in for good and clears that digit from its peers' notes; a
  wrong one stays (shown in `wrong`/`wrongBg`), counts a mistake, and in Delve costs a heart unless
  a Ward catches the floor's first. Erase clears a wrong digit or notes. Notes mode toggles a bit
  per digit in `notes`. Hints fill the picked cell, or the first open one.
- Finished rows, columns and boxes (`doneUnits`) flash once and stay tinted; picking a cell tints
  its peers and every cell with the same right digit.
- Delve floors are `FLOORS` (from floor 6 on, the last row repeats). Relics (`RELICS`): Lantern
  (+1 hint), Heartstone (+1 heart, up to `MAX_HEARTS`), Seer's Eye (`SEER_CELLS` more cells filled
  at the start of each floor, per copy), Ward (first mistake each floor is free).
- Styles (`STYLES`, `THEMES`): Paper Cut-out (default), Garden Markers, Chalkboard, Ink &
  Parchment, Cosy Pixel, Star Chart, Carved Stone, Neon Arcade, Stained Glass, unlocked by
  `UNLOCKS` and picked on the style screen. Fonts are the device's own, so nothing is downloaded.

Missing or rough:

- A board in play is not saved; a reload starts at the menu.
- The daily puzzle has no streak and no shared leaderboard; the menu only ticks it off for today.
- No undo; a right digit can't be taken back (it is right).
- Puzzle levels are by given count, not by the solving techniques they need.
- `docs/screenshots/all-styles.webp`, `style-picker.webp`, `menu.webp` and `cover.png` are not made by
  the test; refresh them by hand (a Playwright script that sets `ninefold-progress` with every style
  unlocked and taps like the test) when the look changes. `delve-relics.webp` is the test's
  `playthrough-3-relics` screenshot.

## Architecture

File map (`src/`):

- `main.ts`: creates the `Phaser.Game` (960x540 from `VIEW`, `Phaser.Scale.FIT`) with `GameScene`,
  calls `setupGame(game, { howToPlay })` and then `setupScaling(game, { fill: true })`, and in dev
  builds puts `game` on `window`.
- `howToPlay.ts`: the How to play text in English (also used for US English, which spells nothing
  differently there) and German; update both when the controls or the first round change.
- `i18n.ts` and `i18n/`: the game's texts (`shared/i18n.ts`). `en.ts` is the British English source,
  `de.ts` the German (with `keepEnglish` for the title) and `en-US.ts` only "Cozy Pixel". Every text
  on screen goes through `t`; game logic compares ids.
- `audio.ts`: `SONG` (parts `menu`, `calm`, `delve`, stings `solved` and `over`) and the `SFX` table.
- `game/sudoku.ts`: `Shape`, `SHAPES`, `Puzzle`, `seeded` (mulberry32), `dailySeed`, `boxOf`,
  `units`, `peersOf`, `countSolutions` and `makePuzzle` (the solver picks the cell with the fewest
  candidates). No Phaser.
- `game/state.ts`: the tuning (`CLASSIC_GIVENS`, `DAILY_LEVEL`, `classicHints`, `delveHearts`,
  `DELVE_HINTS`, `MAX_HEARTS`, `RELIC_OFFER`, `SEER_CELLS`, `FAST_MS`, `HARD_FLOOR`, `FLOORS`),
  `Progress`, `UNLOCKS`, `GameEvent`, `GameState` and the actions (`newGame`, `startClassic`,
  `startDaily`, `startDelve`, `select`, `toggleNotes`, `canEnter`, `enter`, `erase`, `hint`,
  `takeRelic`, `chooseStyle`, `toMenu`, `tick`, `unlock`, `isRight`, `digitsLeft`). Only this file
  changes `GameState`.
- `game/catalog.ts`: `STYLES`/`StyleId`/`STYLE_INFO`, `RELICS`/`RelicId`/`RELIC_INFO` and `LEVELS`.
- `game/save.ts`: `loadProgress` and `saveProgress`.
- `scenes/GameScene.ts`: everything drawn and all input.
- `scenes/themes.ts`: `Theme`, `THEMES` (one per style) and `hex`.
- `scenes/layout.ts`: `VIEW`, `BOARD`, `PANEL`, `PAD`, `TOOLS`, `MENU_BUTTON`, `MENU`,
  `STYLE_CARDS`, `BACK`, `END`, `END_BUTTONS`, `RELIC_CARDS`, `UI_DEPTH`.

Shared code it imports: `shared/setupGame.ts`, `shared/scaling.ts` (`setupScaling`, `viewSize`,
`viewFrame`), `shared/audio.ts` (`sounds`, `playMusic`, `playSting`, `ui`), `shared/settings.ts`
(`byDifficulty`, `settings`) and `shared/i18n.ts` (`translator`, `byLanguage`, `Translation`).

How it runs:

- Coordinates: everything is laid out in the designed 960x540 frame (`layout.ts`). The game fills
  the screen's shape (`fill: true`); `create` reads `viewSize`/`viewFrame` and scrolls the camera to
  `(-fx, -fy)` once, so the frame sits in the middle of the view. Backdrops (`drawDeco`) and dims
  are drawn from `(-fx, -fy)` over the whole view. The camera never moves after that. Taps on the
  board use `pointer.worldX/Y`.
- Time: `update` takes `dt` from the frame time (capped at `MAX_STEP_MS`) and calls `tick`, which
  only runs the board's clock (`timeMs`) while playing. Nothing else is timed; the flashes age by
  `dt`.
- Events: the rules push `GameEvent`s (`board`, `placed`, `wrong`, `hint`, `unit`, `solved`,
  `unlocked`, `relic`, `over`) onto `state.events`; `drain` plays their sounds, adds flashes, saves
  the progress and switches the screen to `board` when a board loads. It also picks the music part.
- Redrawing: `currentKey` names what is on screen (screen, phase, style, board size, relic offer,
  mode); when it changes `buildLayer` destroys `parts` and rebuilds the screen or card. The board
  (`boardG`, the 81 digit and note texts) is redrawn when `dirty` is set by an input or event; the
  panel's clock, hearts, hints and notes label are set every frame in `updatePanel`.
- Input: the scene's `pointerdown` picks a cell (only on the board while playing). Buttons are a
  `Graphics` and a text under an interactive `Zone` (`button`), which stops the event so it never
  reaches the board; disabled ones play `ui('refuse')`. Keys: 1-9, arrows, N, H, Backspace/Delete/0.
- End cards sit above a dim zone that swallows taps (`dim`, `raise`).

State model (`GameState`): `phase` (`menu`, `playing`, `solved`, `relic`, `over`), `mode`
(`classic`, `daily`, `delve`), `level`, `puzzle` (`size`, `boxW`, `boxH`, `solution`, `givens`),
`values` (0 empty; may hold a wrong digit), `notes` (bit per digit), `selected` (-1 none),
`notesMode`, `mistakes`, `hintsLeft`, `hintsUsed`, `timeMs`, `hearts`, `maxHearts`, `floor`,
`relics`, `relicOffer`, `warded`, `doneUnits` (indexes into `units`), `newStyles`, `progress` and
`events`.

Persistence: one `localStorage` key, `ninefold-progress`, holding `Progress` (`solved`, `flawless`,
`noHint`, `hard`, `fast`, `bestFloor`, `daily`, `style`, `unlocked`). It is written when a board is
solved, a style unlocks, a Delve run ends or a style is picked. `loadProgress` keeps only known
styles and re-checks `UNLOCKS`.

Randomness and timing: `makePuzzle` and the relic offer use `Math.random`, except the daily puzzle,
which uses `seeded(dailySeed(date))`. The backdrops use Phaser's `RandomDataGenerator` with a fixed
seed. All rule timing is game time from `tick`.

### Hub settings

- Difficulty scales two numbers: Classic hints `classicHints` = `byDifficulty(5, 3, 2)` and Delve
  hearts `delveHearts` = `byDifficulty(4, 3, 2)`. Keep Normal at 3 and 3 (the playthrough expects
  3 hearts and 1 Delve hint), and keep the README's row and the root README's difficulty table in
  sync.
- `settings.reduceMotion` skips the finished-unit and solved flashes (`drawFlashes`). Nothing
  shakes or blinks.

## Sound

All sound is made in code by `shared/audio.ts`; `src/audio.ts` holds the song and effects, and
only `GameScene` plays them. Nothing plays under browser automation.

Music, `SONG` (84 BPM, a triangle music-box lead): `menu` on the menu and style screens, `calm` on
Classic and daily boards (G major), `delve` on Delve floors (A minor, busier drums); stings `solved`
(every solved board) and `over` (a Delve run ends). `drain` calls `playMusic` every frame with the
part for the screen; the engine only switches when it changes.

| Sound | Where |
| --- | --- |
| `tap` | a cell picked (`onBoardTap`) |
| `place` | a `placed` event |
| `wrong` / `heart` / `ward` | a `wrong` event in Classic / one that cost a heart / one the Ward caught |
| `note` | a digit entered in notes mode |
| `erase` | Erase on a cell that can be erased |
| `hint` | a `hint` event |
| `unit` | a `unit` event (a row, column or box finished) |
| `unlock` | an `unlocked` event, and picking a style |
| `relic` | a `relic` event |

Shared sounds: `ui('click')` on menu and card buttons and the Notes toggle, `ui('refuse')` for a
digit, Erase or Hint that can't be used, a disabled pad key and a locked style.

## Testing hooks

- `src/main.ts` exposes `window.game` in dev builds. The test reads `game.scene.getScene('Game')`
  and its `state` (copied through JSON, without `events`), `screen`, `cellSpots` (`{ cell, x, y,
  w, h }` per cell of the board, in view pixels) and `buttons` (spots by id: `daily`, `easy`,
  `normal`, `hard`, `delve`, `styles`, `menu`, `key-1`..`key-9`, `notes`, `erase`, `hint`,
  `relic-0`..`relic-2`, `next`, `done`, `again`, `back`, `style-<id>`).
- Inputs: it taps `delve`, taps cells from `cellSpots` and pad keys from `buttons`, toggles
  `notes`, taps `erase` and `relic-0`. It never uses hints and stays on Delve floors 1 and 2.
- Mirrored in `e2e/playthrough.spec.ts`, so change them together: the `GameState` field names,
  `VIEW`, 3 hearts and `DELVE_HINTS` (1) on Normal, `FLOORS[0]` and `FLOORS[1]` (sizes and givens),
  `RELIC_OFFER`, `MAX_HEARTS`, `SEER_CELLS`, each relic's effect, Cosy Pixel unlocking on a first
  solve without hints (and nothing else on a first solve with a mistake), the scene key `'Game'`
  and the save key `ninefold-progress`.
- It saves `playthrough-0-menu`, `-1-floor-1`, `-2-mistake`, `-3-relics` and `-4-floor-2`.

## Making common changes

- **Add or change a text**: its key in `i18n/en.ts`, the German in `i18n/de.ts` (the build fails
  without it) and a US entry in `i18n/en-US.ts` if the spelling differs; run
  `node scripts/check-translations.mjs` and check German with `?lang=de` (style card names and the
  pad tools are the tightest spots).
- **Add a style**: its id in `STYLES` (the order is the unlock order; Stained Glass waits for every
  other one), `STYLE_INFO` and its two texts, its goal in `UNLOCKS`, its `THEMES` entry, a case in
  `drawDeco`, and the README row. Ten styles need `STYLE_CARDS` laid out four across.
- **Add a relic**: its id and `RELIC_INFO` in `catalog.ts`, its effect in `takeRelic`, `nextFloor`
  or `enter`, an emblem in `drawRelicIcon`, a README row and a case in the test's `switch`. A fifth
  relic still offers three.
- **Retune**: the constants at the top of `state.ts`; mirror the first two `FLOORS` and the Normal
  hearts in the test.
- **Board sizes**: `SHAPES` in `sudoku.ts`; the pad has nine keys, so boards go up to 9x9.

## Gotchas

- A right digit is never wrong again, so `canEnter` refuses a cell that is right; Erase only clears
  wrong digits and notes.
- `drawBoard` hides every digit text first; a board of fewer than 81 cells uses the first
  `size * size` texts.
- Buttons stop their `pointerdown` so the board never sees a tap on the panel; anything tappable
  that doesn't go through `button` must do the same.
- Never use a red cross in any art (root AGENTS.md).
