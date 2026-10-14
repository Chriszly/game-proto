# Mapmaker

A fog-of-war charting prototype built with [Phaser 4](https://phaser.io), TypeScript and Vite,
part of the [game hub](../../README.md).

A bear surveyor lands at the port of an island nobody has mapped. The island is a modern
topographic survey sheet: what you have surveyed is printed in layered height colours with contour
lines, hill shading, map symbols and place names, and the rest is blank, gridded drafting paper.
Each voyage you have a sack of supplies, and every tile you survey costs one. Push inland across
beaches, meadows and forests, climb hills and peaks to see the land around them, and find the
villages and ruins worth the most. When the supplies run out (or you turn back early), the surveyor
sails home and draws what they found into a chart, which sells at the port. Spend the coins at the
harbor, set sail again, and chart the whole isle to bind it into your atlas before a new one waits
over the horizon.

![Surveying the island](docs/screenshots/island.png)

## How to play

| Control | Action |
| --- | --- |
| Tap a magenta survey station | Survey that tile for one supply; the surveyor walks there |
| Return to port | End the voyage (early, if you like: unused supplies sell back) and draw the chart |
| Sell chart | Sell the voyage's chart at the port |
| Buy | Buy an upgrade at the harbor |
| Set sail | Start the next voyage with full supplies (to a new isle once this one is charted) |

1. **Surveying**: a blank tile next to a charted land tile carries a magenta survey station
   (pointing at one shows "−1 supply"). The sea can be charted but leads nowhere: you can't survey
   on from a sea tile.
2. **Lookouts**: hills reveal the four tiles beside them for free, and peaks all eight around them.
   A lookout that charts new ground sweeps a dotted sight ring out over the tiles it sees, and their
   values gather into one tally ("Viewshed, 6 tiles, +18"), while the panel's small live chart inks
   the new tiles in magenta.
3. **Supplies**: 12 a voyage. When they run out, the surveyor heads home on their own.
4. **Turn back early or push on**: every supply left when you tap Return to port sells back for 3
   coins, up to what the chart's tiles are worth. The panel brackets the unused supply pips and the
   button carries the sell-back as a magenta tag (+18c). A voyage that spends every supply sells
   none back.
5. **Charts**: every tile revealed on a voyage, surveyed or seen from a lookout, goes on the chart.
6. **Commissions**: each voyage a buyer at the port asks for a chart with enough of one terrain,
   and pays a bonus if the chart has it.
7. **Isle goal**: the panel's "Isle surveyed" bar shows how much of the isle is charted (its land
   and the sea beside it). The voyage whose chart takes it past 50% pays +20 coins, past 75% +40
   coins, and at 100% the isle is bound into your atlas as a page; the atlas count shows beside the
   voyage in the panel and at the harbor.
8. **Islands**: what you have charted stays charted between voyages. Once every tile you can reach
   is charted, the next voyage sails to a new island with more villages and ruins.

The game saves itself at every step.

![A lookout's viewshed gathering into its tally](docs/screenshots/viewshed.png)

![The start of a voyage](docs/screenshots/playthrough-0-start.png)

### What tiles are worth

| Tile | Coins | Note |
| --- | --- | --- |
| Sea | 1 | Leads nowhere |
| Beach | 2 | |
| Meadow | 2 | |
| Forest | 3 | |
| Hills | 4 | Reveals the four tiles beside it |
| Peak | 6 | Reveals the eight tiles around it |
| Village | 10 | Landmark |
| Ruins | 12 | Landmark |

![A chart back at port](docs/screenshots/playthrough-2-chart.png)

A voyage that turned back with supplies left and took the isle past 50%: the unused supplies and
the milestone are paid with the chart.

![A chart with sell-back and an isle milestone](docs/screenshots/isle-goal.png)

### Upgrades

| Upgrade | Ranks | Costs | What it does |
| --- | --- | --- | --- |
| Provisions | 3 | 40, 80, 140 | +3 supplies every voyage |
| Spyglass | 2 | 60, 120 | Hills and peaks see one tile further |
| Fine Ink | 3 | 50, 100, 180 | Charts sell for 25% more |
| Lodestone Compass | 1 | 90 | Shows villages and ruins on blank paper as gold compass roses |

![The harbor](docs/screenshots/harbor-upgrades.png)

Once an isle is charted in full, its atlas page shows at the harbor and the next voyage sails to a
new isle.

![The harbor after binding an atlas page](docs/screenshots/atlas.png)

## Difficulty

The hub's Difficulty setting changes the supplies of a voyage: 16 on Easy, 12 on Normal, 9 on Hard.

## Code layout

- `src/main.ts`: creates the game and applies the hub's settings.
- `src/game/`: the rules, with no Phaser: `island.ts` rolls an island, `sim.ts` surveys, charts,
  sells, buys and tracks the isle goal, `state.ts` holds the state and numbers, `terrain.ts` and `upgrades.ts` the tables,
  `save.ts` the save.
- `src/scenes/`: `BootScene` bakes the art, `GameScene` paints the island and draws the sheet,
  panel and overlays and takes the taps, `layout.ts` says where everything goes.
- `src/art/`: the survey-sheet art, painted on canvases in code: `map.ts` (terrain, contours,
  symbols, blank paper, place names), `surveyor.ts`, `icons.ts`, `paint.ts` (colours and helpers).
- `src/ui/Button.ts`: the flat ink button.
- `e2e/playthrough.spec.ts`: plays the first voyage.

See [AGENTS.md](AGENTS.md) for how it fits together.
