# game-proto

A hub of small game prototypes built with [Phaser 4](https://phaser.io), TypeScript and Vite. The
start page lists the games; each one lives in its own folder under `games/`.

![The hub page](docs/screenshots/hub.png)

| Game | What it is |
| --- | --- |
| [Apothecary](games/apothecary/README.md) | Run a medieval apothecary as a plague doctor: grow herbs, refine them, brew potions and sell them to customers. |
| [Deadline](games/deadline/README.md) | Hold the bottom of a road against growing waves of zombies: move left and right, shoot automatically, and shoot crates open for upgrades. |
| [Palisade](games/palisade/README.md) | Hold a barricade against waves of goblins, orcs and dark knights as a ranger, picking one of three upgrades each level, with a boss every ten waves. |
| [Tiny Kingdom](games/tiny-kingdom/README.md) | Place farms, houses and towers on a small island grid, each scoring against its neighbours, and reach each round's goal before the tiles run out. |
| [Rogue Runner](games/rogue-runner/README.md) | Run as a knight who never stops: jump spikes and pits, slide under blades, and pick one of two boons at each checkpoint. |
| [Merge Forge](games/merge-forge/README.md) | Run a smithy: forge swords, drag two matching ones together to merge them into a better blade, and sell them to adventurers as their orders come in. |
| [Potion Puzzle](games/potion-puzzle/README.md) | A match-3 board of Apothecary's ingredients: swap tiles to gather what each potion order asks for before the moves run out, and sell the potion for coins. |

## Running locally

```sh
npm install
npm run dev       # dev server with hot reload; the hub is at /, each game at /games/<name>/
npm run build     # typecheck + production build of the hub and every game into dist/
npm run preview   # serve the production build
```

## Layout

- `index.html`: the hub page, one card per game.
- `games/<name>/`: one game, with its own `index.html`, `src/`, `e2e/` playthrough test, `docs/`
  screenshots and `README.md`. Games don't import from each other.
- `e2e/hub.spec.ts`: checks that the hub lists every game and that each card opens it.
- `package.json`, `tsconfig.json`, `vite.config.ts` and `playwright.config.ts` are shared. Vite
  builds every `games/*/index.html` next to the hub; Playwright runs one project per game.

See `AGENTS.md` for adding a game and for the playthrough rules.

## Tests

```sh
npx playwright install chromium        # once
npm run test:e2e                       # the hub test and every game's playthrough
npx playwright test --project apothecary   # one game only
```

Each game has its own playthrough workflow (`.github/workflows/playthrough-<name>.yml`) that runs
only when that game's folder or a shared file changes, and uploads videos and screenshots as the
`playthrough-<name>` artifact. The Hub workflow runs the hub test when the hub page or a game's
card changes. Each CI run also uploads a `game-build` artifact: download it from
the run's summary page, unzip it and serve the folder (for example with `npx serve`) to play.

## Container image

Every push to main also builds the hub and its games into a container image (`Dockerfile`: the
build served by nginx on port 8080) for arm64 and amd64, and publishes it as
`ghcr.io/chriszly/game-proto:latest` (and `:sha-<commit>`). Pull requests only check that the
image builds.
