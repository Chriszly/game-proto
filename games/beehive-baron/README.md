# Beehive Baron

An idle beehive in cut paper. Build comb cells, send your foragers out to the meadow for nectar,
let the full cells ripen into honey, harvest the capped cells and sell the jars. Cells built side by
side earn a comb bonus on every jar, goals of jars sold unlock new meadows on the far hill, and the
bees keep gathering a little nectar while you are away. Each open meadow gives its own honey, a
market shifts which one sells best, village orders pay a premium, wasps raid the capped cells, and
brood cells hatch new bees. The coins (and the wax from each harvest) buy more cells and upgrades,
until the Waggle Dance sends the bees out on their own.

![A hive with every meadow open: clover, lavender and heather cells, two brood cells, the market board under the hive, a village order on the board and wax in the HUD](docs/screenshots/upgrades-overview.png)

## How to play

1. **Build a cell**: tap a spot in the comb. The first cell is free; each one after costs more,
   and wax pays part of it (see below). With a mouse, pointing at an empty spot first shows a green
   preview with its price, the wax it uses and how many built cells it would touch.
2. **Send the foragers**: tap **Send foragers**. Every bee at home flies to a flower and brings
   nectar back. A cell holds 4 drops; nectar that comes home to a full comb is lost.
3. **Harvest**: a full cell ripens into honey and is capped with pale wax. Tap it to fill a jar
   and get a piece of wax, and the cell starts over.
4. **Sell**: tap **Sell** to sell every jar on the shelf. A clover jar is worth 15 coins, plus the
   comb bonus, plus 5 once the Sunflower Ridge is open; other kinds and the market change that.
5. **The hive is kept**: the comb, coins, jars, wax, bees, upgrades, unlocked meadows and where
   the bees forage are saved in the browser. Bees out foraging come home when the page reloads,
   and wasps, the market's timer and village orders start afresh. **New hive**, in the bottom
   right corner, starts over.

![Foragers flying to the flowers](docs/screenshots/playthrough-1-foraging.png)

### Comb bonus: build cells touching

Every edge two built cells share glows gold and adds **1 coin to every jar you sell**. The plaque
on the hive roof shows the total ("Comb bonus +18c a jar"), and the Sell button's price includes
it. Building a cell next to others pops a green "+3 touching" tag over it, and the build preview
lights the edges it would share in green. A tight cluster pays far more than cells scattered over
the comb: ten cells in a clump share 18 edges, which more than doubles a jar's price.

![The comb bonus: a cell just built touching three others, and the preview on the next spot](docs/screenshots/comb-bonus.png)

### Goals unlock meadows

The goal card at the top right names the next goal, the meadow it unlocks and that meadow's
benefit, with a bar of how far along you are. The locked meadow already shows, faded, on the far
hill with a padlock tag. The goals come in a chain, each counting jars sold since the hive began,
and every meadow's benefit lasts for good:

| Goal | Unlocks | Benefit |
| --- | --- | --- |
| 10 jars sold | Lavender Field | Every forager brings 1 more drop a trip |
| 30 jars sold | Sunflower Ridge | Every jar sells for 5 more coins |
| 80 jars sold | Heather Moor | Full cells ripen twice as fast |

![The tenth jar sold: the Lavender Field opens and the next goal is the Sunflower Ridge](docs/screenshots/goal-unlocked.png)

### Honey kinds and the market

Each open meadow gives its own nectar, and a cell holds one kind: an empty cell takes whatever
comes home first, then only fills with that kind. Clover grows by the hive, the Lavender Field
gives lavender and the Heather Moor gives heather, each with its own colour of cell and jar.

| Honey | Opens with | Jar price |
| --- | --- | --- |
| Clover | the start | 15 coins |
| Lavender | Lavender Field (10 jars sold) | 18 coins |
| Heather | Heather Moor (80 jars sold) | 22 coins |

After the first sale the **market** board under the hive lists every kind with what a jar of it
sells for now (comb bonus and Sunflower Ridge included). Once two kinds are open, one of them is
**in demand** (a green price with a star) and sells for half as much again; the demand moves on
to the next open kind every minute, and the board counts down to it. Tap a kind on the market to
send the foragers there: the highlighted entry with the little bee is where they go, and the Send
button says which nectar they fetch. Bees already out finish their trip.

![Foragers sent to the Lavender Field, the market showing lavender picked](docs/screenshots/lavender-foraging.png)

### Village orders

From 3 jars sold, a note pinned to the board asks for 3 to 5 jars of one open kind within 2
minutes, for example "Order: 4 Heather". Every jar of that kind you sell counts, and once the whole
order is sold it pays a premium of 8 coins per jar on top of the jars' price. A lapsed order pays
nothing, and a new one comes 20 seconds after the last ends.

### Wasp raids

From 8 jars sold, a wasp flies in now and then (every 40 to 80 seconds while a cell is capped) and
lands on a capped cell. An orange bar over the cell runs out in 5 seconds, and then the honey is
gone. Tap the wasp to swat it away, or harvest the cell first. **Guard Bees** drive off every wasp
as it lands.

![A wasp on a capped heather cell, stealing its honey](docs/screenshots/wasp-raid.png)

### Brood cells

Bees are not bought: they hatch. Tap **Brood cell** in the shop, then an empty spot (tap the button
again to cancel). A brood cell costs a honey cell's price plus 30 coins and holds no nectar, but it
hatches a new bee every 45 seconds while the hive has fewer than 12 bees (a green ring shows the
next one growing). It counts for the comb bonus like any cell, so it competes with honey cells for
the best spots.

![Placing a brood cell: the preview says "Brood here" and the wax it uses](docs/screenshots/brood-preview.png)

### Wax

Every harvest also gives a piece of wax (shown in the HUD). Wax pays 3 coins of a new cell's price
each, for up to half of it, so the prices on the empty spots and the shop already take it off and
the preview names the wax a build uses. A big comb funds itself.

### While you were away

Close the page and the bees keep foraging, slowly: each bee gathers 1 drop per 30 seconds away,
up to **20 drops** a visit, poured into the filling cells (it never spills, and an already full
comb gets nothing). When you come back a chip under the hive says how much they brought, with a
bar against the cap: "While you were away: +12 nectar (cap 20)". It fades after a few seconds, or
when tapped. Cells it fills start ripening as you return.

![Back after twenty minutes: the bees filled the comb up to the 20-drop cap](docs/screenshots/away.png)

### What the coins buy

| Buy | Ranks | What it does |
| --- | --- | --- |
| Comb cell | one per spot (20 spots): free, then 12 coins, rising 25% per cell (wax pays up to half) | Room for 4 more drops of nectar, and comb bonus for each built cell it touches |
| Brood cell | one per spot: a comb cell's price plus 30 coins (wax pays up to half) | A new bee every 45 seconds, up to 12 bees, and comb bonus like any cell |
| Pollen Baskets | 3 (40, 120, 320 coins) | Every forager brings one more drop a trip |
| Clover Patch | 3 (60, 180, 480 coins) | Trips take 20% less time per rank |
| Waggle Dance | 1 (250 coins) | Bees at home fly out by themselves whenever the comb has room |
| Guard Bees | 1 (150 coins) | Every wasp is driven off as it lands, before it steals anything |

The difficulty, set on the hub page's Settings, changes one thing: foraging trips take 25% less
time on Easy and 30% more on Hard.

## Running locally

`npm run dev` at the repo root, then open `/games/beehive-baron/` (or pick Beehive Baron on the hub
page).

## Playthrough test

`e2e/playthrough.spec.ts` plays the first jar of honey in headless Chromium: it checks the new
hive, checks the foragers stay home while there is no comb, builds the first cell, sends the two
foragers out twice until the cell is full, waits for it to ripen and be capped, harvests it and
sells the jar for 15 coins (a lone cell touches nothing, so no comb bonus, and one jar is short of
the first goal, so no meadow unlocks). Along the way it checks the first jar is clover honey and
that its harvest gave a piece of wax. Like the other games' tests it owns the game clock and plays
at 4x speed (`PLAYTHROUGH_SPEED`). The **Playthrough Beehive Baron** workflow
(`.github/workflows/playthrough.yml`) runs it on every PR that touches this folder or
the workflow, and uploads the video and screenshots as the `playthrough-beehive-baron` artifact.

```sh
npx playwright test --project beehive-baron
```

## Code layout

All paths are inside `games/beehive-baron/`.

- `src/game/`: the rules in plain TypeScript with no Phaser dependency. `state.ts` holds the hive,
  its numbers, prices and the comb bonus, `sim.ts` builds, forages, ripens, hatches, harvests,
  sells, buys, runs the market, wasp raids and village orders and adds the nectar gathered while
  away, `honey.ts` is the kinds of honey, `meadows.ts` the chain of goals, `upgrades.ts` the
  upgrade table, `wasps.ts` and `orders.ts` their numbers, and `save.ts` keeps the hive.
- `src/scenes/`: `BootScene` bakes textures, `GameScene` draws the hive and turns taps into rules
  calls, `layout.ts` says where things are drawn.
- `src/art/`: the cut-paper art, painted on canvases at startup: `paper.ts` cuts card with
  shadows and grain, `scenery.ts` the meadow, meadows, hive, flowers, jar, comb cells and UI cards,
  `bees.ts` the bee and the wasp.
- `src/ui/`: the paper buttons.
