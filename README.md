# game-proto

Apothecary: a small automation game prototype built with [Phaser 4](https://phaser.io), TypeScript and Vite.

You play a plague doctor running a medieval apothecary. Grow herbs in the backyard, refine them,
brew potions in the cauldron and sell them to customers at the storefront.

![The whole map](docs/screenshots/u-layout-map.png)

The apothecary is laid out as a U: goods go down the left arm (the wheat field and mandrake patch,
then the refining table), along the bottom (the cauldron) and up the middle into the shop at the
top. The right arm is grass for now: an expansion will open it up for a second production line
that mirrors the left. The courtyard inside the U is where the doctor works. The map is bigger than the screen, so the camera
follows the doctor.

## How to play

| Control | Action |
| --- | --- |
| WASD / arrow keys, or tap | Walk |
| Walk past ripe plants | Harvest every ripe plant within one character height of the doctor; the spinning sickle marks the edge |
| Stand on a floor marker | Green: drop off items. Blue: work the station. Gold: pick up products or coins. Purple: pay coins to upgrade or build a belt |

1. **Gardens**: each garden grows one kind of plant. Harvest ripe wheat in the wheat field and
   mandrake in the mandrake patch. Plots regrow on their own.
2. **Refining table**: drop off plants; wheat becomes wheat flour, mandrake becomes mandrake seeds.
   Stand on the work spot while it refines; finished goods wait on the pick-up marker.
3. **Cauldron**: drop in refined goods. Two wheat flour brew a Healing Draught, wheat flour and
   mandrake seeds brew a Sleeping Tonic. Stand on the work spot while it brews.
4. **Storefront**: customers show the potions they want and how long they will wait. Drop potions
   on the counter and stand on the work spot behind it; customers take what they ordered and
   leave coins on the pick-up marker.

Every station has an upgrade marker. Upgrades cost 20, 40 and 80 coins: the refining table and
cauldron work faster, and customers at an upgraded counter tip more and wait longer.

**Conveyor belts** take the walking out of the loop. Three can be bought on their own purple build
markers, a handful of coins at a time: gardens to refining table (60 coins), table to cauldron (100)
and cauldron to counter (150). A belt picks ripe plants or finished goods up at its start and
hands them to the next station when it has room; the drop and pick-up markers it replaces go away.
The belts are steampunk machinery, brass rails over leather slats, in an otherwise medieval world.

![All three belts built](docs/screenshots/belts-map.png)

You can carry four items at a time; they stack up on the doctor's back. Progress is saved in the browser automatically; "New game"
in the top bar starts over.

## Running locally

```sh
npm install
npm run dev       # dev server with hot reload
npm run build     # typecheck + production build into dist/
npm run preview   # serve the production build
```

## Playthrough test

`e2e/playthrough.spec.ts` plays the whole loop in headless Chromium with real clicks: it harvests
both gardens, refines, brews, sells to customers until it has 20 coins and buys a counter upgrade,
then sells more until it can buy the garden belt and watches the belt bring plants to the refining
table, checking items, coins, the upgrade and the belt along the way. It plays at 4x speed
(`PLAYTHROUGH_SPEED`), so the run takes under a minute. The Playthrough workflow runs it on every PR
and push to main and uploads a video and milestone screenshots as the `playthrough` artifact.

```sh
npx playwright install chromium   # once
npm run test:e2e                  # starts the dev server and plays; CPU_THROTTLE=4 simulates a slow machine
```

Changes to gameplay, layout or controls update the test in the same PR; see `AGENTS.md` for the
rules and for how to debug a failing run.

Each CI run also uploads a `game-build` artifact: download it from the run's summary page,
unzip it and serve the folder (for example with `npx serve`) to play.

## Code layout

- `src/game/`: the rules (items, recipes, state, simulation tick and player actions) in plain
  TypeScript with no Phaser dependency, plus saving.
- `src/scenes/`: Phaser scenes. `BootScene` bakes textures, `GameScene` draws the world and wires
  input to the rules.
- `src/art/`: all the pixel art, drawn in code on a shared palette and baked into textures at
  startup: the plague doctor, townsfolk, items, gardens, stations, conveyor belts, floor markers, ground tiles and
  interface pieces.
- `src/ui/`: small reusable display pieces (icon rows, progress bars).
