# Agent guide

This repo is a hub of small Phaser 4 + TypeScript + Vite games. The hub page (`index.html`) links to
each game, and each game lives in its own folder, `games/<name>/`, with its own `index.html`, `src/`,
`e2e/`, `docs/screenshots/` and `README.md` (how to play and its code layout). The build, tsconfig,
Playwright config, CI workflows and PR template are shared. The games are Apothecary, in
`games/apothecary/`, Deadline, in `games/deadline/`, Palisade, in `games/palisade/`, Tiny Kingdom,
in `games/tiny-kingdom/`, Rogue Runner, in `games/rogue-runner/`, Merge Forge, in
`games/merge-forge/`, and Pirate Raid, in `games/pirate-raid/`.

## Work on one game at a time

- **Keep games apart.** A game's code stays in its folder and never imports from another game.
  Something two games both need can move to a shared folder once a second game actually needs it.
- **Say which game a PR is for** in its title or summary, and keep its screenshots in that game's
  `docs/screenshots/`.
- **Add a game** by creating `games/<name>/` with an `index.html` that loads `./src/main.ts`, a
  `README.md`, a `cover.png` (a 16:9 screenshot) and an `e2e/playthrough.spec.ts` that plays its
  first round, plus its own `.github/workflows/playthrough-<name>.yml`: copy Apothecary's and change
  the name, the `games/<name>/**` path, the workflow's own path, the concurrency group, the
  `--project` and the artifact name. Give it a `favicon.svg` linked from its `index.html`: the orange bear from the hub's
  `favicon.svg` (same ears, head, dot eyes and muzzle, 32x32 viewBox) with one prop for the game,
  like Apothecary's plague doctor hat and beak. Then add a card for it in the hub's `index.html` and in `e2e/hub.spec.ts`, a
  Playwright project in `playwright.config.ts`, and a row in the README's table of games. Vite picks
  up `games/*/index.html` on its own. Keep save keys and other browser storage prefixed with the
  game's name, since every game shares the hub's origin.
- **Never use a red cross.** No game art, icon, button, cover or favicon (the hub's included) may show a
  red cross: no red plus, red-cross health or medic symbol, or red crosshair. Use a green cross (or
  another colour) for healing and aiming marks instead.

Each game's playthrough follows the rules below. They are written for Apothecary; a new game keeps
the same rules with its own first round, files and state.

## Keep the playthrough test working

`games/apothecary/e2e/playthrough.spec.ts` plays one round of the loop in headless Chromium: it opens the recipes,
harvests, refines, brews and sells potions to a customer. The **Playthrough Apothecary** workflow
(`.github/workflows/playthrough-apothecary.yml`) runs it on every PR and push to main that changes
`games/apothecary/` or a shared file the game builds and tests with (`package.json`,
`package-lock.json`, `tsconfig.json`, `vite.config.ts`, `playwright.config.ts`) or the workflow
itself. Each game has its own playthrough workflow like it, so a PR for one game only plays that
game. The **Hub** workflow (`.github/workflows/hub.yml`) runs `e2e/hub.spec.ts` when the hub page,
its test, a game's `index.html`, `cover.png` or `favicon.svg`, or a shared file changes. The
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
  changes to its game or the shared files.
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
- Also run `npm run build` (typecheck and build) before pushing.

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
