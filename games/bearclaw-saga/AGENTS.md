# Bearclaw Saga: guide for agents

How Bearclaw Saga is built and where things stand, for agents changing it. README.md covers how to
play. Keep this file up to date with any change to the game, per the root AGENTS.md.

## Current state

Bearclaw Saga is a side-view action prototype of the first playable version designed in
[Chriszly/bearclaw-saga](https://github.com/Chriszly/bearclaw-saga) (`Docs/GAME_DESIGN.md`,
section 7), with a simpler combat system than the design's directional one: strike, block, parry
by timing, dodge. Bjarn walks a horizontal strip per chapter; the camera follows him.

Implemented today:

- Seven chapters (`CHAPTERS` and `STORY` in `src/game/story.ts`): `hunt`, `raid`, `wake`, `trail`,
  `forest`, `boss`, `end`. Each is a theme, a strip length, a start and a list of events the
  director in `GameScene` runs one after another (`stepDirector`, `startEvent`, `eventDone`):
  `say`, `hint`, `reach`, `wave` (with `lock`, and `until: 'half'` for Ulfgar), `clue`, `herbs`,
  `hold`, `npc`, `npcTo`, `npcGone`, `script`, `toast` and `next`. Bjarn stands still during
  `npcTo` and the scripted moments (`cutscene`).
- Scripts (`runScript`): `fatherDies` (Skarn walks to the father and strikes), `grief` (rage climbs
  `GRIEF_RAGE` a second and the outburst becomes the story's: no drain, and two kills as the hybrid
  bring out the bear), `blackout`, `wakeUp`, `ratatoskr`, `drill` (Torvald as a harmless foe; two
  parries end it), `recipes`, `giantWolf` (Ulfgar becomes the giant wolf and calls two wolves),
  `unlockShift`, `ulfgarDown` and `endCard`.
- Bjarn's forms (`FORMS` in `src/game/forms.ts`): human, hybrid and bear, with speed, damage,
  reach, resistance, strike timing, block share (the bear can't block), dodge and life steal (the
  bear). A change of form takes `SHIFT_MS`, can't be hurt meanwhile, and a hit in its first
  `SHIFT_COUNTER_MS` is countered like a parry.
- Combat: a strike lands at `hitAt` of its time on every foe in reach in front. Foes approach, wind
  up (a yellow mark, or red for an unblockable strike), strike and recover; at most
  `MAX_ATTACKERS` wind up or strike at once. `resolveStrike` decides a foe's hit: countered by a
  change of form, missed in a dodge, parried (block raised within `PARRY_MS`: the foe is stunned
  for `STUN_MS` and takes 1.5x damage), blocked (stamina, a share of the damage) or taken.
- Stamina: strikes, dodges and blocked hits cost it; at 0 Bjarn is exhausted until
  `EXHAUSTED_UNTIL` (half damage, slower strikes, no dodge, a blocked hit breaks the guard).
- Rage: only a hit taken fills it (`RAGE_PER_HP`). At 100 the beast breaks out (`startBurst`):
  human to hybrid, or a hybrid called at will to bear. In the outburst the beast runs at the
  nearest foe and strikes on its own (the player nudges it at 30%), rage starts at `BURST_RAGE`
  and drains (`BURST_DRAIN`, `BURST_DRAIN_CALM` with no foe about); a hit that fills it again turns
  the hybrid into the bear. At 0 Bjarn turns back into a human (`endBurst`).
- Healing: no regeneration. Herbs heal the human and the hybrid (`HERB_HEAL`, more with Torvald's
  recipes); the bear heals by `lifesteal`.
- People (`drawNpc`): the father, Skarn, Torvald, Sigrun, two of Haakon's warriors, Ulfgar's body;
  Ratatoskr follows Bjarn from waking on. Foes: boars, cultists, wolves, Ulfgar, the giant wolf
  (damage taken by form, `vs`) and Torvald's drill.
- The HUD (`src/scenes/hud.ts`): health, stamina and rage bars, the form, the objective line, a
  hint line, toasts, the chapter banner, the talk box under the bars, touch buttons (shown once the
  screen is touched), the outburst's red haze (black flashes in the raid's outburst) and the fall
  and end cards.
- Art (`src/scenes/art.ts`): every figure is drawn with vector Graphics around its feet, facing
  right, each frame; `paintBackdrop` paints a chapter's sky, parallax mountains and trees or houses,
  and ground once per chapter.

## Sound

All in code through `shared/audio.ts`, in `src/audio/`:

- `music.ts`: one song, `SAGA`, in D minor at 92 BPM, with the parts `calm` (hunt, waking, trail,
  end), `dark` (raid and forest with no foe about), `battle` (foes about) and `boss` (Ulfgar),
  picked in `GameScene.updateMusic`, plus the stings `burst` (`startBurst`), `fall` (`fall`) and
  `victory` (`ulfgarDown`).
- `sounds.ts`: `swing` and `swipe` (`startAttack`, by form), `hit` (`strikeFoes`), `down`
  (`killFoe`), `block` and `parry` (`resolveStrike`), `dodge`, `hurt` (`takeDamage`), `warn` (an
  unblockable windup), `roar` and `calm` (outburst and changing form), `herb`, `clue`
  (`useNearby`), `blip` (each line of talk, pitched by speaker), `howl` (`giantWolf`) and `slash`
  (`fatherDies`).
- `ui('click')` for the cards' buttons.

## Architecture

- `src/main.ts` creates the game (960x540, `Phaser.AUTO`), calls `setupGame(game, { howToPlay })`
  and `setupScaling(game, { fill: true })`, and exposes `window.game` in dev builds.
- Fill mode: the view takes the screen's shape (read it with `viewSize`). The ground is
  `GROUND_FROM_BOTTOM` above the view's bottom edge; the world camera follows a zone at Bjarn's x
  with bounds of the strip (or the locked arena) and the view's height, so it never scrolls up or
  down. The HUD lays out from the view's corners; the cards centre in `viewFrame`.
- `src/game/` is plain data and rules with no Phaser: `forms.ts`, `story.ts`, `state.ts`.
- `src/scenes/GameScene.ts` (scene key `'Game'`) does the rest. Graphics with a scroll factor of 0
  go to the HUD camera (`splitHudCamera`); the backdrop's parallax layers keep scroll factors
  between 0.25 and 1, so they stay on the world camera.
- Input: held keys are read once a frame in `update`; presses are caught by a `keydown` listener
  (`PRESS_KEYS`), so a tap between two frames still counts, and handed to
  `updatePlayer`; strike, dodge and shift presses are buffered for `BUFFER_MS`. Touch buttons are
  tracked by pointer id (`touchHeld`), and a pause lets go of all of them.
- `src/i18n.ts` and `src/i18n/`: every text on screen; `t(key, vars)` in the hub's language.

### Save

`bearclaw-saga-save` in localStorage: `{ chapter, recipes, shift, falls, kills }`, written at the
start of every chapter, on Torvald's recipes, on learning the hybrid and on a fall. A reload or a
fall starts the saved chapter over with full health. `loadSave` starts a new run when the saved
chapter is unknown.

### Hub settings

- Difficulty: `foeDamage()` in `forms.ts` scales the damage foes deal (0.75, 1, 1.3).
- Reduce motion: no screen shake, hit flash, flicker while changing form, walk bobbing, double
  image or black flashes in the outburst, and a steady red haze.

## Testing hooks

- `window.game.scene.getScene('Game')` gives `chapter` (its `id`), `evi` (the event in progress),
  `player` (`Bjarn`), `foes`, `dialog` (`{ lines, i }` or null), `parries` and `save`.
- `e2e/playthrough.spec.ts` plays the hunt with the keyboard: Space through the talk, D to walk,
  K (with a direction) to block a foe winding up within `BLOCK_RANGE`, J to strike within
  `STRIKE_RANGE`. Mirrored there, so change them together: the hunt's three boars (`HUNT_BOARS`),
  the human's reach, the text keys `hunt1`, `hunt2` and `raid1`, the chapter ids and the save key.
- It saves `0-start`, `1-boar`, `2-boars` and `3-raid` screenshots.

## Making common changes

- **Add or change a text**: its key in `i18n/en.ts`, the German in `i18n/de.ts` (the build fails
  without it) and a US spelling in `i18n/en-US.ts` if it differs; run
  `node scripts/check-translations.mjs`.
- **Add a chapter**: its id in `ChapterId` and `CHAPTERS` (in order), its `Chapter` in `STORY`, its
  title and goal texts, and a theme in `PALETTES` (`art.ts`) if it needs a new one.
- **Add a foe**: its kind in `FoeKind`, its row in `FOES`, its drawing in `drawFoe`, and its body
  size in `strikeFoes` and its health bar's height in `draw` if it is not person-sized.
- **Add a person**: an `NpcId`, a look in `PEOPLE` (`art.ts`) and the `npc` events that place them.
- **Add a scripted moment**: a `ScriptName`, its case in `runScript` (return a function that says
  when it is done), and add it to `cutscene` if Bjarn should stand still meanwhile.
- **Retune**: `src/game/forms.ts` (forms, stamina, rage, healing, foes).

## Gotchas

- Phaser 4 has no `Geom.Point`: give `fillPoints` `Phaser.Math.Vector2`s.
- Beaten foes stay in `foes` with `state: 'dead'` for 700ms while they fade; skip them in anything
  that counts foes (`hostiles`).
- `goChapter` skips its fade-out when the screen is already black (after `blackout`).
- Never use a red cross in any art (root AGENTS.md); herbs are green with white flowers.
