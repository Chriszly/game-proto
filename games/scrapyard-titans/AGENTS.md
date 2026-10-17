# Scrapyard Titans: guide for agents

How Scrapyard Titans is built and where things stand, for agents changing it. README.md covers how
to play, the robots, traits, items and the difficulty. Keep this file up to date with any change to
the game, per the root AGENTS.md.

## Current state

A single-player board auto-battler: eight commanders (the player and seven AI rivals) buy robots,
place them on their half of an 8x8 board and watch them fight. The art is a cel-shaded arena in
fake 3D, all painted in code at start-up; the only image files are the cover and the favicon.

Implemented today:

- Menu: three commanders (`PLAYER_COMMANDERS`, each with one skill in `SKILLS`), two seasons
  (`SETS`) and a terrain toggle, then START MATCH. The menu shows the saved stats.
- Seasons: each `SetDef` lists five origins; `rosterOf(set)` gives its 30 robots (six per origin,
  one per class, costs 1 to 5). Scrap Rush adds scrap tokens on wins (`SCRAP_TOKENS_PER_PART`),
  Overcharge gives every robot `OVERCHARGE_MANA` at the start of a fight. `UNITS` holds both
  seasons' 42 robots.
- Traits: `TRAITS` (origins tiered 2/4/6, classes 2/4), counted per distinct robot on the board
  (`countTraits`), read in the sim with `traitValue`.
- Shop and economy (`ECONOMY`, `LEVEL_XP`, `SHOP_ODDS`): 5 cards, reroll, buy XP, interest,
  streak bonus, levels 1 to 9 (the level is the robots allowed on the board). Gilded robots
  (`GILDED`) count a second origin, cost 2 more and never merge.
- Star-ups: `addUnit` merges three copies of the same star into the next star (up to 3), keeping
  their items up to `MAX_ITEMS` and sending the rest to the player's parts.
- Items: six parts (`PARTS`) and 21 finished items (`COMBOS`, `comboOf`); `equip` bolts a part on
  and builds the finished item when a robot already carries a lone part.
- Power cards (`AUGMENTS`): offered at rounds with `augment` set (2-1, 3-2, 4-2) and picked with
  `pickAugment`.
- Rounds (`stageRounds`): stage 1 is three neutral rounds and a draft; later stages are
  pvp, pvp, pvp, draft, pvp, pvp, then a monster round (2-7 is the Scrap Rat, `RAT`).
  `stageDamage` and `SURVIVOR_DAMAGE` set what a loss costs.
- Fights (`battle.ts`): both squads on one 8x8 board (side 0 on rows 4-7, side 1 mirrored onto
  rows 0-3), Chebyshev range and targeting, one robot per tile, charge (mana) and the class
  abilities, trait and item specials, commander skills (`useSkill`), terrain (`TERRAIN`), and
  `FIGHT_LIMIT_S`. The player's fight is played back step by step; every other pairing runs
  `runToEnd` at once.
- Pairings: `startFight` pairs the living seats at random, avoiding last round's opponent; with an
  odd count one seat fights a ghost copy of another board. Rivals call a taunt bubble at the start.
- Draft rounds (`startDraft`, `draftPick`): one robot with a part or item per living seat plus
  one, on a ring; lowest health picks first, `DRAFT_PICK_S` each.
- Commander avatars walk the board's near edge (`COMMANDER_HOME`) and collect monster drops (orbs),
  and the rival walks the far edge (`RIVAL_HOME`).
- Scrap Rat round: the rat runs about the board; the player taps it to zap it (`zapRat`), and each
  hit on it shakes gold loose until it escapes.
- Speed button (1x/2x, T), reduced motion (no shake, flash, bob or idle sway).
- Shop lock (`Player.shopLocked`, `toggleShopLock`, the Lock button `BUTTONS.lock` or L):
  `startPlan` skips `rollShop` for a locked shop; `reroll` unlocks it. The AI never locks.
- Scouting: during planning a tap on a rival's row in the players list sets `GameScene.scout`;
  `syncViews` draws that rival's board mirrored onto rows 0-3 (views keyed `s<uid>`) and the info
  panel shows its level, gold, active traits and power cards. Cleared when a plan or fight starts.
- Damage meter: `BUnit.dealt` and `taken` (counted in `Battle.hurt`, overkill left out);
  `endFight` stores the player's side as `Match.meter` (`meterOf`, `MeterRow`), which the info
  panel shows in the result and plan phases (`buildMeter`). A tap on the panel switches it to the
  power cards (`infoPage`).
- Part preview: with a part or item selected or dragged, `buildPreview` tags each robot with
  `equipPreview(id, robot)` (the finished item, the part, or full), and the info panel lists the
  part's six recipes.
- Stats (matches, wins, best place) saved under `scrapyard-titans-stats`; watched matches never
  count.

Missing or rough:

- No sound. No pathing beyond one tile step at a time toward the target.
- AI rivals use a simple scored plan (`aiPlan`). Balance is checked with AI-only matches (see
  Gotchas); every origin's average place sits between about 4.0 and 4.9 of 8, and matches end
  around stages 5 and 6.
- Seasons are picked on the menu; nothing rotates them.

## Architecture

File map (`src/`):

- `main.ts`: creates the `Phaser.Game` (960x540) with `GameScene`, calls `setupGame(game,
  { howToPlay })` and `setupScaling(game)`, and in dev builds puts `game` on `window`.
- `howToPlay.ts`: the How to play text; update it when controls or the loop change.
- `game/data.ts`: every rule and number (see above). No Phaser.
- `game/battle.ts`: `Battle(a, b, terrain)` with `step()` (fixed `STEP_S` 0.05 s), `useSkill`,
  `zapRat`, `runToEnd`, and `events` (`BEvent`) the scene drains for animation. No Phaser.
- `game/match.ts`: the `Match` and `Player` types and every action: `newMatch`, `rollShop`,
  `reroll`, `buyXp`, `buy`, `sell`, `moveUnit`, `equip`, `giveItem`, `pickAugment`, `startPlan`,
  `startFight`, `endFight`, `advance`, `startDraft`, `draftPick`, `newDrops`, plus helpers. No
  Phaser. A board is a record keyed `"col,row"` (rows 4-7).
- `game/ai.ts`: `aiPlan` (level, buy, sell, `arrange`, equip), `aiPickAugment`, `aiDraft`;
  reports to `aiLog` with side `p<seat>`.
- `art/paint.ts`: canvas painters for robots (a class body plus an origin head), monsters,
  commanders and part icons; `bakeAll` makes textures `unit:<id>`, `mon:<id>`, `cmd:<name>` and
  `item:<id>` at `sharpRes` resolution.
- `scenes/layout.ts`: positions of every HUD block and button, and the board projection
  (`project`, `boardPoint`, `tileAt`).
- `scenes/GameScene.ts`: scene key `Game`. The menu, the HUD (rebuilt when `dirty`), board and
  unit views (`syncViews`, `drawUnits`), fight playback (`consume` turns events into effects,
  numbers and orbs), drafts, commanders, and input (`onDown`/`onMove`/`onUp` for tap and drag,
  `onKey`).

The phase flow: `plan` (timed by `PLAN_S`) → `fight` → `result` → next round's `plan`, or `draft`;
`won`/`lost` end the match. `GameScene.tick` drives it with the frame's delta; the fight advances
in `STEP_S` steps times the playback speed.

Shared code it imports: `shared/setupGame.ts`, `shared/scaling.ts` (`setupScaling`, `sharpRes`,
`viewPoint`), `shared/settings.ts` (`byDifficulty`, `settings`) and `shared/watch.ts`.

### Hub settings

- Difficulty: `newMatch` gives the player `byDifficulty(130, 100, 80)` health, and `startPlan`
  gives each rival `byDifficulty(-1, 0, 1)` gold a round. Keep the README rows in step.
- Reduced motion: no camera shake on slams, no hit flash, no idle sway or orb bob.
- Watch AI (`?watch`): the scene starts a match at once with a random commander, season and
  terrain, seat 0 is AI-run (`human` false: `aiPlan` near the end of each plan phase, skill at 3 s),
  and `mountWatch` shows the panel; `watchSteps()` ticks per frame. Watch another on the end screen
  starts the next match.

## Testing hooks

- `window.game` in dev builds; the test reads `game.scene.getScene('Game').state` (the `Match`)
  and waits until the scene is active and the shared loading screen is gone.
- `e2e/playthrough.spec.ts` plays round 1-1: START MATCH (`START_BUTTON` 635,404), the first shop
  card (`SHOP_CARD_1`), bench slot 0 (`BENCH_SLOT_1`), tile 3,4 (`FRONT_TILE`), FIGHT
  (`FIGHT_BUTTON`); it asserts the bought robot moves bench → board, the fight is won with no
  damage, a part drops, the damage meter (`Match.meter`) lists the robot with damage dealt, and
  round 1-2's plan starts with income paid. Change these together with
  `layout.ts` (`SHOP`, `BENCH`, `BUTTONS.fight`, `BOARD_VIEW`), the menu's START MATCH rect in
  `buildMenu`, `ECONOMY.startGold`, and round 1-1's monsters (`MONSTERS.mite`), which every 1-cost
  robot must beat alone.
- Screenshots: `docs/screenshots/menu.webp` is the test's `0-menu`; `fight.webp` (also
  `cover.png`), `draft.webp` and `scrap-rat.webp` are from a scratch `?watch` run with the watch
  panel hidden; `scout.webp`, `part-preview.webp` and `damage-meter.webp` from a scratch run that
  plays round 1-1 with real clicks.

## Making common changes

- **Add a robot**: add it to `UNITS` with an origin of its season and a class; give its origin a
  head in `paint.ts` if the origin is new. Keep six per origin, one per class.
- **Add an origin or class**: add it to the ids, `TRAITS`, `ORIGIN_COLOR` (origins), a season's
  `origins` and, for a class, `CLASS_STATS` with an ability the sim handles in `battle.ts`.
- **Add an item**: add a part to `PARTS`/`PART_DEFS` (every pair then needs a combo) or change a
  `combo` row; a new `Special` needs handling in `battle.ts`.
- **Add a power card**: add it to `AugmentId`, `AUGMENTS` and `AUGMENT_TASTE` in `ai.ts`, then
  apply it in `match.ts` (one-off) or `battle.ts` (in fights).
- **Change rounds or damage**: `stageRounds`, `stageDamage`, `SURVIVOR_DAMAGE`.

## Gotchas

- Balance: a scratch harness bundles `src/game` with rolldown (`node_modules/.bin/rolldown`),
  stubs `location` and `localStorage`, and plays AI-only matches in node (`newMatch` with
  `watch: true`, then `startPlan`/`aiPlan`, `startFight` and `runToEnd`, `endFight`, `advance`,
  drafts through `aiDraft`), recording each seat's place and main origin. Run one after changing a
  trait, a class or `stageDamage`. `startFight` copes with seat 0 being out for this.
- The bench slots are drawn on the board layer (`drawBoard`), under the benched robots; HUD
  graphics sit above every robot.
