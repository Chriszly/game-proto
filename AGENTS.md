# Agent guide

Apothecary is a Phaser 4 + TypeScript + Vite game. See the README for how to play and the code layout.

## Keep the playthrough test working

`e2e/playthrough.spec.ts` plays the whole game in headless Chromium, and the **Playthrough** workflow
(`.github/workflows/playthrough.yml`) runs it on every PR and every push to main. It is the check
that the game can still be played from start to finish, so it has to stay accurate.

- **Change the test in the same PR as the game.** A change to gameplay, layout, input or balance
  that the playthrough depends on goes in together with its test update. That includes rules and
  numbers in `src/game/` (items, recipes, grow, refine and brew times, prices, carry and station
  capacity, upgrade costs), positions in `src/scenes/layout.ts`, controls and marker behaviour in
  `src/scenes/GameScene.ts`, and the `GameScene` fields the test reads (`state`, `player`,
  `pointerTarget`). Don't leave a red playthrough for a follow-up PR.
- **Add new content to the playthrough.** A new station, item, recipe, garden, upgrade or other
  step in the loop gets a step in the test that uses it and asserts its effect on the game state.
  Features that are not part of the loop yet (menus, new screens) get a check when they are added.
- **Never skip or loosen the test to get green.** No `test.skip`, `test.fixme`, `.only`, removed
  assertions, `continue-on-error`, path filters that stop the workflow from running, or retries.
  Don't raise timeouts or tolerances unless the failure is shown to come from a slow runner rather
  than the game, and say so in the PR. If the test is wrong, fix the test; if the game broke, fix
  the game.
- **Drive the game through real inputs.** The test walks by clicking, like a tap on a phone, and
  only reads state through `window.game` (exposed by the dev build in `src/main.ts`). Don't write to
  game state from the test or add shortcuts that bypass the real controls.
- **Keep it deterministic.** The test owns the game clock (`page.clock`): game time only moves when
  the test advances it, in fixed 64ms animation frames, so a slow runner plays exactly like a fast
  one. `Math.random` is seeded so customer orders repeat. Keep game timing on
  `requestAnimationFrame`, Phaser's clock or `performance.now`, and new randomness behind
  `Math.random`, so runs stay reproducible. Waits are measured in game time, not real time.
- **It plays at 4x speed.** The test paces game time at `PLAYTHROUGH_SPEED` times real time (4 in
  CI, set in the workflow), so the recorded video is a 4x time-lapse. It renders with Phaser's
  canvas renderer, because software WebGL on a runner without a GPU is too slow for that. The end
  of each run logs the speed it reached (`Played 48s of game time at 4.0x`); a busy runner can fall
  short of 4x, which slows the video but never changes the result.
- **Keep the PR screenshots honest.** The test saves milestone screenshots; when the look of the
  loop changes, refresh the `docs/screenshots/playthrough-*.png` files from a fresh run.

## Run it locally

```sh
npm ci
npx playwright install chromium   # once per machine
npm run test:e2e                  # starts the dev server on port 5173 and plays the game
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
2. Open the run's `playthrough` artifact on the workflow run's summary page. It has `video.webm`, the
   milestone screenshots, `trace.zip` on failure and the HTML report (`playwright-report/index.html`).
   Open a trace with `npx playwright show-trace trace.zip` to see each step, the page and the console.
3. Reproduce locally with `npm run test:e2e`. Because the clock is controlled, a CI failure should
   reproduce locally; if it only fails in CI, try `CPU_THROTTLE=4` and look for timing that does
   not go through the browser's clock.
4. Decide whose fault it is. A walking target that moved or a marker that changed means the test
   needs the new coordinates from `src/scenes/layout.ts`. Changed counts, recipes or prices mean the
   test's expectations need updating. A step that never completes in the game itself is a game bug.
