# Agent guide

This repo is a hub of small Phaser 4 + TypeScript + Vite games. The hub page (`index.html`) links to
each game, and each game lives in its own folder, `games/<name>/`, with its own `index.html`, `src/`,
`e2e/`, `docs/screenshots/`, `README.md` (how to play and its code layout) and `AGENTS.md` (its
current state and architecture, for agents; read it before changing the game). The build, tsconfig,
Playwright config, CI workflows and PR template are shared. The games are Apothecary, in
`games/apothecary/`, Deadline, in `games/deadline/`, Palisade, in `games/palisade/`, Tiny Kingdom, in
`games/tiny-kingdom/`, Hotfoot, in `games/hotfoot/`, Anvilheart, in `games/anvilheart/`,
Broadside, in `games/broadside/`, TinctureTinker, in `games/tincture-tinker/`, Catacomb, in
`games/catacomb/`, Golem Garden, in `games/golem-garden/`, Beehive Baron, in
`games/beehive-baron/`, Wyrmrail, in `games/wyrmrail/`, Shrine Stack, in `games/shrine-stack/`,
Mapmaker, in `games/mapmaker/`, Lanternkeep, in `games/lanternkeep/`, Space Wars, in
`games/space-wars/`, Lane Brawl, in `games/lane-brawl/`, and Colonizer, in `games/colonizer/`.

Each game's guide for agents, to read before changing it:

| Game | Guide |
| --- | --- |
| Apothecary | [games/apothecary/AGENTS.md](games/apothecary/AGENTS.md) |
| Deadline | [games/deadline/AGENTS.md](games/deadline/AGENTS.md) |
| Palisade | [games/palisade/AGENTS.md](games/palisade/AGENTS.md) |
| Tiny Kingdom | [games/tiny-kingdom/AGENTS.md](games/tiny-kingdom/AGENTS.md) |
| Hotfoot | [games/hotfoot/AGENTS.md](games/hotfoot/AGENTS.md) |
| Anvilheart | [games/anvilheart/AGENTS.md](games/anvilheart/AGENTS.md) |
| Broadside | [games/broadside/AGENTS.md](games/broadside/AGENTS.md) |
| TinctureTinker | [games/tincture-tinker/AGENTS.md](games/tincture-tinker/AGENTS.md) |
| Catacomb | [games/catacomb/AGENTS.md](games/catacomb/AGENTS.md) |
| Golem Garden | [games/golem-garden/AGENTS.md](games/golem-garden/AGENTS.md) |
| Beehive Baron | [games/beehive-baron/AGENTS.md](games/beehive-baron/AGENTS.md) |
| Wyrmrail | [games/wyrmrail/AGENTS.md](games/wyrmrail/AGENTS.md) |
| Shrine Stack | [games/shrine-stack/AGENTS.md](games/shrine-stack/AGENTS.md) |
| Mapmaker | [games/mapmaker/AGENTS.md](games/mapmaker/AGENTS.md) |
| Lanternkeep | [games/lanternkeep/AGENTS.md](games/lanternkeep/AGENTS.md) |
| Space Wars | [games/space-wars/AGENTS.md](games/space-wars/AGENTS.md) |
| Lane Brawl | [games/lane-brawl/AGENTS.md](games/lane-brawl/AGENTS.md) |
| Colonizer | [games/colonizer/AGENTS.md](games/colonizer/AGENTS.md) |

## Feedback and issues

Feedback comes in as issues filed through the forms in `.github/ISSUE_TEMPLATE/` (bug report,
gameplay feedback, feature wish). Labels have short names, and each label's group is the start of
its description: **Game** (the folder name, like `apothecary`, plus `hub` and `shared`), **Type**
(`bug`, `gameplay`, `feature`, `refactor`, `assets`, `docs`, `ci`), **Priority** (`high`,
`medium`, `low`) and **Status** (`needs-info`, `duplicate`, `wontfix`). Every issue carries one
Game label and one Type label (`bug`, `gameplay` or `feature`); Priority and Status are optional.
The form sets the Type label and `.github/workflows/issue-labels.yml` adds the Game label from the
form's Game dropdown. Labels are defined in `.github/labels.json` and the Labels workflow
(`.github/workflows/labels.yml`) syncs them on main, deleting any label not in that file, so labels
are never edited on GitHub. A PR that fixes an issue says `Fixes #<number>`. Each Game label has its
own public GitHub Project, plus one "All feedback" Project, with the title, short description and
README listed in `.github/projects.json`. Each Project's built-in Auto-add workflow files issues
and PRs into it (filter `is:issue,pr is:open label:<game>`, or no label for "All feedback"), and
its "Item added to project" workflow, set to Issue only, gives new issues the status Todo. The
**Project status** workflow (`.github/workflows/project-status.yml`) puts each open PR into its
Projects with the status In Progress, using the `PROJECTS_TOKEN` secret (a classic token with only
the `project` scope).

- **Every PR needs labels.** It carries at least one Type label for what it changes (`bug` for a
  fix, `feature`, `gameplay`, `refactor`, `assets`, `docs`, `ci`) and at least one Game label for
  where (a game, `hub` or `shared`). The `type-and-game` job of the **PR Template Validation**
  workflow (`.github/workflows/pr-template-validation.yml`) reads each label's group from
  `.github/labels.json` and fails until both are set, so add them right after opening the PR.
- **Never create a new label.** Use only the labels in `.github/labels.json`, and never add one
  on GitHub or apply a label name that isn't in that file (GitHub creates it silently). The
  `type-and-game` check fails on any label not in the file. The one exception is a PR that adds a
  new game: it adds that game's label (its folder name, description `Game: <Name>`) to
  `.github/labels.json` (see "Add a game" below) and carries it.

## Work on one game at a time

- **Keep games apart.** A game's code stays in its folder and never imports from another game.
  Something two games both need can move to a shared folder once a second game actually needs it.
- **Keep the game's `AGENTS.md` up to date.** Each game's `games/<name>/AGENTS.md` describes what
  is built today, how the code fits together, its save keys, its test hooks and how to make common
  changes. A PR that changes a game updates that file in the same PR wherever it no longer matches:
  a new or removed feature, file, type, save key or test hook, or a recipe that changed. A
  `CLAUDE.md` next to it imports it (`@AGENTS.md`), like the root one does.
- **Say which game a PR is for** in its title or summary, and keep its screenshots in that game's
  `docs/screenshots/`.
- **Add a game** by creating `games/<name>/` with an `index.html` that loads `./src/main.ts`, a
  `README.md`, an `AGENTS.md` (current state and architecture) with a `CLAUDE.md` that imports it,
  a `cover.png` (a 16:9 screenshot) and an `e2e/playthrough.spec.ts` that plays its first round,
  and it is played by the shared `.github/workflows/playthrough.yml`, which finds every
  `games/<name>/e2e/playthrough.spec.ts` on its own, so a new game needs no workflow of its own. Give it a `favicon.svg` linked from its `index.html`: the orange bear from the hub's
  `favicon.svg` (same ears, head, dot eyes and muzzle, 32x32 viewBox) with one prop for the game,
  like Apothecary's plague doctor hat and beak. Then add a card for it in the hub's `index.html` and in `e2e/hub.spec.ts`, a
  Playwright project in `playwright.config.ts`, a row in the README's table of games and a row in
  the table of guides above. Add its Game label (its folder name, description `Game: <Name>`) to `.github/labels.json` (the Labels
  workflow creates it on main), its Project (title, short description and README) to `.github/projects.json`, its name to the
  Game dropdown of the three issue forms in
  `.github/ISSUE_TEMPLATE/` (before `Hub page` and `Shared / all games`, then raise each form's
  `default` by one so it still preselects Shared), and its name and label to the map in
  `.github/workflows/issue-labels.yml`. Then remind **Chriszly** to create the game's GitHub
  Project by hand, in the PR's "Notes for reviewers" and in your reply when the PR is up: its title,
  short description and README from `.github/projects.json`, public visibility, the Auto-add
  workflow with the filter `is:issue,pr is:open label:<game>`, the "Item added to project"
  workflow set to Issue only with Status Todo, and a link to the repo. Vite picks
  up `games/*/index.html` on its own. Keep save keys and other browser storage prefixed with the
  game's name, since every game shares the hub's origin.
- **Honour the hub's settings.** Every game calls `setupGame(game)` from `shared/setupGame.ts`
  right after creating its `Phaser.Game`, which applies the frame cap, the FPS readout, reduced motion and full screen. Each game also implements the difficulty itself: scale one or two of its own balance
  numbers with `byDifficulty(easy, normal, hard)` from `shared/settings.ts`, keep Normal exactly as
  designed (the playthrough runs on Normal), and add the game's row to the difficulty table in the
  README. Skip camera shake and flashes, and hold blinking or jittering effects still, when
  `settings.reduceMotion` is on. A new setting goes into `shared/settings.ts` (its type, default and
  `SETTING_FIELDS` row, which the hub panel shows on its own) and then into every game.
- **Fit every screen.** A game stays sharp and fills the screen from an upright phone to a 4K
  monitor by calling `setupScaling(game)` from `shared/scaling.ts` right after `setupGame(game)`
  (`grep -l setupScaling games/*/src/main.ts` lists the games that do; bring the others over one game per PR). The canvas then has
  `renderScale` canvas pixels per game pixel and every camera is zoomed to match, so: lay out with
  `viewSize(scene)` rather than `scene.scale`, read the world through `pointer.worldX/Y`,
  `getWorldPoint` and `worldView` rather than `pointer.x/y` or `scrollX/Y`, give a camera that
  follows, scrolls or has bounds `scrollingCamera(camera)` and keep scroll-factor-0 objects off it
  (`splitHudCamera(scene)` draws them with a second, fixed camera; read pointers with `viewPoint`), multiply a game's own camera zoom by `renderScale`, and
  paint canvas art at `sharpRes(w, h, res)`. A phone held the wrong way for the game gets a hint
  to turn it. `e2e/screens.spec.ts` picks the game up on its own and checks it on five screens; the
  **Screens** workflow (`.github/workflows/screens.yml`) runs it in one job per game, on a PR only for
  the games whose folder changed (every game when `shared/` or the test changes).
  Give its `index.html` the same `100dvh` and `touch-action: none` styles as Apothecary's.
- **Never use a red cross.** No game art, icon, button, cover or favicon (the hub's included) may show a
  red cross: no red plus, red-cross health or medic symbol, or red crosshair. Use a green cross (or
  another colour) for healing and aiming marks instead.

Each game's playthrough follows the rules below. They are written for Apothecary; a new game keeps
the same rules with its own first round, files and state.

## Keep the playthrough test working

`games/apothecary/e2e/playthrough.spec.ts` plays one round of the loop in headless Chromium: it opens the recipes,
harvests, refines, brews and sells potions to a customer. The **Playthrough Apothecary** workflow
(`.github/workflows/playthrough.yml`) runs on every PR (not on pushes to main) and reports one
required check, `Playthrough`. It plays each game whose `games/<name>/` folder changed, so a PR for
one game only plays that game, and a PR that only changes shared files plays none. If the workflow
itself changes, every game is played. A game that did not change is not played, and the check still passes. The **Hub** workflow (`.github/workflows/hub.yml`) runs `e2e/hub.spec.ts`: the hub's own checks
in one job, and opening each game from its card in one job per game, on a PR only for the games
whose folder changed (every game when the hub page, its test or `shared/` changes). The
playthrough is the check that the core loop can still be played, so it has to stay accurate.

- **Change the test in the same PR as the game.** A change to gameplay, layout, input or balance
  that the playthrough depends on goes in together with its test update. That includes rules and
  numbers in `games/apothecary/src/game/` (items, recipes, grow, refine and brew times, prices, carry and station
  capacity), positions in `games/apothecary/src/scenes/layout.ts`, controls and marker behaviour in
  `games/apothecary/src/scenes/GameScene.ts`, and the `GameScene` fields the test reads (`state`, `player`,
  `pointerTarget`). Don't leave a red playthrough for a follow-up PR.
- **Keep it to the first round.** The playthrough covers harvesting, refining, brewing and selling
  to a customer, and nothing bought with the coins. A change to that round (a new plant, recipe or
  step a first round goes through) gets a step in the test that asserts its effect on the game
  state. Upgrades, expansions, craftsmen, belts and other purchases stay out of it.
- **Never skip or loosen the test to get green.** No `test.skip`, `test.fixme`, `.only`, removed
  assertions, `continue-on-error`, retries, or narrowing a workflow's paths so it stops running on
  changes to its game.
  Don't raise timeouts or tolerances unless the failure is shown to come from a slow runner rather
  than the game, and say so in the PR. If the test is wrong, fix the test; if the game broke, fix
  the game.
- **Drive the game through real inputs.** The test walks by clicking, like a tap on a phone, and
  only reads state through `window.game` (exposed by the dev build in the game's `src/main.ts`). Don't write to
  game state from the test or add shortcuts that bypass the real controls.
- **Keep it deterministic.** The test owns the game clock (`page.clock`): game time only moves when
  the test advances it, in fixed 64ms animation frames, so a slow runner plays exactly like a fast
  one. `Math.random` is seeded so customer orders repeat. Keep game timing on
  `requestAnimationFrame`, Phaser's clock or `performance.now`, and new randomness behind
  `Math.random`, so runs stay reproducible. Waits are measured in game time, not real time.
- **It plays at 4x speed.** The test paces game time at `PLAYTHROUGH_SPEED` times real time (4 in
  CI, set in the workflow), so the recorded video is a 4x time-lapse. It renders with Phaser's
  canvas renderer, because software WebGL on a runner without a GPU is too slow for that. The end
  of each run logs the speed it reached (`Played 47s of game time at 4.0x`); a busy runner can fall
  short of 4x, which slows the video but never changes the result.
- **Keep the PR screenshots honest.** The test saves milestone screenshots; when the look of the
  loop changes, refresh the `games/apothecary/docs/screenshots/playthrough-*.png` files from a fresh run.

## Run it locally

```sh
npm ci
npx playwright install chromium   # once per machine
npm run test:e2e                  # starts the dev server on port 5173, checks the hub and plays every game
npx playwright test --project apothecary   # one game only
```

- It reuses a dev server already running on port 5173, so you can keep `npm run dev` open.
- `CPU_THROTTLE=4 npm run test:e2e` slows the browser's CPU to simulate a slow CI runner. The run
  takes longer but must play out the same; if it doesn't, something escaped the test's clock.
- `PLAYTHROUGH_SPEED=1 npm run test:e2e` plays at normal speed, handy with `--headed` to watch it.
- `npx playwright test --headed` shows the browser while it plays; `--debug` steps through it.
- Also run `npm run build` before pushing. It typechecks the games and `shared/` (`tsconfig.json`),
  then the e2e tests and the Vite and Playwright configs (`tsconfig.e2e.json`), then builds.

## Debug a failure

1. Read the error. Every wait has a name (for example `walk to 645,262` or `potions brewed`), and a
   failed wait prints where the doctor's feet were and the game state at that moment.
2. Open the run's `playthrough-<name>` artifact on the workflow run's summary page. It has `video.webm`, the
   milestone screenshots, `trace.zip` on failure and the HTML report (`playwright-report/index.html`).
   Open a trace with `npx playwright show-trace trace.zip` to see each step, the page and the console.
3. Reproduce locally with `npm run test:e2e`. Because the clock is controlled, a CI failure should
   reproduce locally; if it only fails in CI, try `CPU_THROTTLE=4` and look for timing that does
   not go through the browser's clock.
4. Decide whose fault it is. A walking target that moved or a marker that changed means the test
   needs the new coordinates from `games/apothecary/src/scenes/layout.ts`. Changed counts, recipes or prices mean the
   test's expectations need updating. A step that never completes in the game itself is a game bug.
