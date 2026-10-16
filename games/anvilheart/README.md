# Anvilheart

A merge game prototype built with [Phaser 4](https://phaser.io), TypeScript and Vite, part of the
[game hub](../../README.md).

You run a smithy, drawn as a stained-glass window. The forge on the left makes Rusty Daggers onto a
board of sixteen anvils. Drag two matching swords together and they merge into one sword of the
next tier, up to the Dragonslayer and, from two of those, the legendary Anvilheart. Adventurers come
to the counter on the right, each asking for a sword, and you sell them one by dragging it onto
them: the exact sword they asked for earns a tip and the guild's good name. Quick merges chain into
a hammer streak for bonus coins, and royal commissions in the top bar ask you to deliver great
swords to the crown, ending with the Crown Blade, which wins the smithy. The coins buy upgrades for
the forge, a fifth row of anvils and a quench barrel. After the win you can found a new smithy
under a new charter, keeping the guild stars that raise every price.

![The smithy as a stained-glass window, with a Steel Sword held over its two twins](cover.png)

## How to play

| Control | Action |
| --- | --- |
| Tap or click Forge | Make a Rusty Dagger on the first empty anvil, once the forge is hot |
| Drag a sword onto a matching sword | Merge the two into one of the next tier |
| Drag a sword onto an empty anvil or another sword | Move it there, or swap the two |
| Drag a gem onto a plain sword | Set the gem in it |
| Drag a sword onto an adventurer | Sell it, if it is at least as good as the one they asked for; the exact one pays a tip |
| Drag a sword onto the commission banner | Deliver it to the crown, if the commission wants it |
| Tap the commission banner | Choose between the crown's two offers, or found a new smithy once the Crown Blade is in |
| Drag a Rusty Dagger onto a battered sword | Repair it, for a bonus |
| Drag a sword onto the quench barrel, once bought | Keep it there, off the anvils |
| Tap the quench barrel or the fifth row's button | Buy it |
| Tap an upgrade | Buy its next rank |
| Tap Auto Forge, once bought | Switch the auto forge on or off |
| New smithy (bottom right) | Throw the board, coins and upgrades away and start again |

1. **The forge** makes one sword at a time and then has to heat up again (1.2s), shown by the bar
   under the button.
2. **Merging**: two swords of the same tier make one of the next. While you hold a sword, the
   swords it can merge with are outlined in gold and the adventurers who would buy it in green.
3. **Adventurers** come every 6 seconds while there is room at the counter, three at most (at
   middling reputation, see below). The first one always wants an Iron Shortsword; later ones ask
   for anything up to one tier better than your best sword so far, up to the Dragonslayer. They
   leave if they wait too long (the jewel bar under their order).
4. **Exact fit pays a tip.** The exact sword an adventurer asked for pays its price and 50% more
   (rounded down: an Iron Shortsword asked for and given pays 15 coins instead of 10). A better
   sword than they asked for is taken but only pays the price they asked, so it is usually worth
   more kept for someone who wants it. While you hold a sword, each adventurer who would buy it
   shows a tag: green "Exact fit +50%" with the tipped price, or grey "Overkill, pays N c".
5. **Hammer streak.** A merge within 4 seconds of the one before chains into a streak. A ring of
   orange glass round the anvil of the last merge drains to show the time left. From the second
   merge on, each one bursts into sparks and pays 5 coins times the streak's length ("Hammer
   streak ×3 +15c"), so a quick run of merges pays 10, then 15, then 20 coins and so on.
6. **Royal commission.** The banner in the top bar names the great sword the crown wants, starting
   with a Golden Claymore, and shows how many of the sword below it (two Silver Sabers make one) are
   on your anvils, or "Ready" once the sword is made. Drag it onto the banner to deliver it: it
   leaves your board, so a commission costs a sword you could have sold and an anvil while you
   build it. Delivering completes the commission: it pays a purse and a guild star, counted in the
   top bar, and the next one takes its place. The commissions are a Golden Claymore (500 coins), a
   Runeblade (1200), a Dragonslayer (3000), two Dragonslayers (6000), three (9000) and last the
   Crown Blade: an Anvilheart (20000). Delivering the Crown Blade wins the smithy; you can keep
   smithing afterwards, or found a new one (see below).
   **Choose your commission.** From the second commission on, the crown offers each one two ways:
   quick, as listed, or grand, with a gem set in every sword asked for, for two and a half times
   the purse (a gemmed Runeblade pays 3000 instead of 1200). A window opens with the two offers
   when the one before is done; "Decide later" closes it and tapping the banner opens it again.
   Nothing is delivered until you have chosen.
7. **Guild reputation.** The meter at the top left starts in the middle. An exact fit raises it by
   5 and an adventurer who walks off lowers it by 10. At full reputation adventurers come twice as
   often (every 3 seconds) and wait 25% longer; at none they come every 9 seconds and wait 25%
   less.
8. **Gems.** Once you have made a Steel Sword, the forge now and then (8%) makes a green gem
   instead of a sword. Drop it on a plain sword to set it; merging a gemmed sword keeps the gem.
   Some adventurers (a quarter, once gems are about) ask for a gemmed sword, which pays double, and
   only take one with a gem.
9. **Bigger smithy.** A fifth row of four anvils (800 coins, the button over the covered row) and a
   quench barrel beside the board (300 coins, tap it) that holds one sword or gem off the anvils.
   Swords in the barrel merge, sell and deliver like any other.
10. **The Anvilheart.** Two Dragonslayers merge into a ninth tier, the Anvilheart. Delivered to the
   crown, it completes whatever commission stands on its own, and it is what the Crown Blade asks
   for.
11. **Discovered swords** are shown in a row under the anvils, one frame per tier. A frame shows its
   sword's picture once you have made that sword, and a question mark until then.
12. **Rust.** A sword left on its anvil for 3 minutes dulls (it fades, and a rust-brown ring round
   the anvil drains), and a minute later it drops a tier. Moving, merging or swapping it starts it
   afresh, Rusty Daggers and gems never rust, and the quench barrel keeps a sword safe for as long
   as you like.
13. **Adventurers with traits.** From the second adventurer on, about a third come with a trait,
   written under their order. A **Haggler** waits 60% longer but pays 70% of any price. A
   **Noble** pays triple for the exact sword asked for and takes nothing else. A **Veteran** also
   takes the sword one tier below the one asked for, at the price asked (no tip).
14. **Returning heroes.** Whoever buys a Knight's Blade or better may come back half a minute
   later (3 in 10 do) with a new order, a trophy of a tenth of the sword's price in coins, and the
   sword itself, battered and a tier lower, laid on the first empty anvil. A battered sword merges
   and sells like any other, and a Rusty Dagger dropped on it repairs it for a fifth of its price.
15. **A new charter.** Once the Crown Blade is in, "Found a new smithy" (in the win window, or by
   tapping the banner) clears the board, barrel, coins and upgrades but keeps your guild stars,
   reputation and swords sold. Every guild star raises every sale's price by 5% (a sword's price
   on the order card already includes it), and in each new charter the commissions ask for one
   more sword each (two Golden Claymores, then two Runeblades, and so on, paying as much more).
   The top bar names the charter: Anvilheart II, III and so on. "New smithy" in the corner still
   throws everything away, stars included.
16. **The smithy is kept**: the board and barrel (and how long each sword has lain), coins, swords
   sold, upgrades, the standing commission and its open offer, your guild stars and charter,
   reputation and whether you have won are saved in the browser.

![While a Steel Sword is held, the knight who asked for one shows the tipped price and the ranger who asked for less shows Overkill](docs/screenshots/exact-fit-tip.png)

![A third quick merge makes a Silver Saber: a hammer streak of three, with its burst, timer ring and bonus](docs/screenshots/hammer-streak.png)

![A Golden Claymore dragged onto the glowing commission banner to deliver it](docs/screenshots/deliver-to-crown.png)

![Delivered: the commission pays 500 coins and a guild star, and the Runeblade commission follows](docs/screenshots/delivered.png)

![A gem dragged onto a Steel Sword, with an adventurer at the counter who wants a gemmed one](docs/screenshots/gem-setting.png)

![The gemmed Steel Sword held over that adventurer, who pays double plus the exact-fit tip](docs/screenshots/gem-order.png)

![The fifth row of anvils and the quench barrel, with a Silver Saber being dropped into it](docs/screenshots/bigger-smithy.png)

![An adventurer walks off and the guild reputation falls to Shunned](docs/screenshots/reputation-walk-off.png)

![Two Dragonslayers merging into the Anvilheart](docs/screenshots/anvilheart-merge.png)

![The Anvilheart, ready for the Crown Blade commission](docs/screenshots/anvilheart-made.png)

![The Crown Blade delivered: the smithy is won](docs/screenshots/crown-blade-won.png)

![The row of discovered swords under the anvils](docs/screenshots/discovered-swords.png)

![The crown's two offers for the next commission: a Runeblade for 1200 coins, or a gemmed one for 3000](docs/screenshots/commission-offer.png)

![The grand commission chosen: a gemmed Runeblade held over the banner](docs/screenshots/grand-commission.png)

![Three dulled swords with their rust rings draining, next to a fresh one](docs/screenshots/rust.png)

![A Noble, a Haggler and a Veteran at the counter, each tag showing what they would pay for the held Knight's Blade](docs/screenshots/adventurer-traits.png)

![A hero back from the quest with a battered Silver Saber and a trophy](docs/screenshots/returning-hero.png)

![A Rusty Dagger dragged onto the battered Silver Saber to repair it](docs/screenshots/repair-battered.png)

![The win window with "Found a new smithy"](docs/screenshots/found-new-smithy.png)

![The new charter: an empty smithy, six stars, 30% on every price and a commission for two Golden Claymores](docs/screenshots/new-charter.png)

![In the new charter an Iron Shortsword asked for pays 13 coins instead of 10, and 19 as an exact fit](docs/screenshots/charter-prices.png)

![Dragging a dagger onto its twin](docs/screenshots/playthrough-1-dragging.png)

### Swords

Prices are what an adventurer who asked for that sword pays; given exactly that sword, they pay 50%
more.

| Tier | Sword | Price |
| --- | --- | --- |
| 1 | Rusty Dagger | 4 |
| 2 | Iron Shortsword | 10 |
| 3 | Steel Sword | 25 |
| 4 | Knight's Blade | 60 |
| 5 | Silver Saber | 140 |
| 6 | Golden Claymore | 320 |
| 7 | Runeblade | 720 |
| 8 | Dragonslayer | 1600 |
| 9 | Anvilheart | 4000 |

Adventurers never ask for the Anvilheart; it is made for the crown. A gemmed sword asked for pays
double its price, and every guild star adds 5%.

### Upgrades

| Upgrade | Ranks | What it does |
| --- | --- | --- |
| Bellows | 4 (40, 110, 260, 600 coins) | The forge heats up 20% faster per rank |
| Fine Ore | 5 (90, 250, 700, 1500, 3000 coins) | 20% chance per rank that the forge makes an Iron Shortsword; at rank 5 it makes nothing else |
| Auto Forge | 1 (1200 coins), once Bellows is maxed | The forge makes a sword by itself whenever it is hot and an anvil is free, so you only merge and sell. Tap it again to pause or restart it |
| Fifth row | 1 (800 coins) | Four more anvils under the board; bought with the button over the covered row |
| Quench barrel | 1 (300 coins) | A barrel beside the board that holds one sword or gem; bought by tapping it |

![Auto Forge, unlocked once Bellows is maxed, forging on its own](docs/screenshots/auto-forge-on.png)

The difficulty, set on the hub page's Settings, changes one thing: adventurers wait 50% longer on Easy and 30% less on Hard.

## Running locally

`npm run dev` at the repo root, then open `/games/anvilheart/` (or pick Anvilheart on the hub page).

## Playthrough test

`e2e/playthrough.spec.ts` plays the first sale in headless Chromium: it checks the new smithy and
its first royal commission, waits for the first adventurer and their Iron Shortsword order, taps
Forge twice (checking the forge must heat up in between), drags one dagger onto the other and
checks they merged and started a hammer streak, then drags the Shortsword onto the adventurer and
checks the sale paid the exact-fit tip (15 coins) and raised the guild reputation from 50 to 55, and
finally that the lone streak runs out. Like
the other games' tests it owns the game clock and plays at 4x speed (`PLAYTHROUGH_SPEED`). The
shared **Playthrough** workflow (`.github/workflows/playthrough.yml`) runs it on every pull request
that changes `games/anvilheart/` or the workflow itself, and uploads the video and screenshots as
the `playthrough-anvilheart` artifact.

```sh
npx playwright test --project anvilheart
```

## Code layout

All paths are inside `games/anvilheart/`.

- `src/game/`: the rules in plain TypeScript with no Phaser dependency. `swords.ts`,
  `upgrades.ts` and `commissions.ts` are data tables (the last also scales commissions per charter
  and makes the grand offers), `items.ts` says what can lie on an anvil (swords, gems, gemmed and
  battered swords) and how two combine, `state.ts` holds the shop, its timings, the reputation,
  rust, trait and returning-hero rules and the sale price rule, `sim.ts` forges, rusts, merges
  (with streaks), repairs, delivers to the crown, offers commissions, sells, buys, brings heroes
  back and founds new charters, and `save.ts` keeps the smithy.
- `src/scenes/`: `BootScene` bakes textures, `GameScene` draws the smithy and turns drags into
  rules calls, `layout.ts` says where things are drawn.
- `src/art/`: all the stained-glass art, painted on canvases in code at startup: `glass.ts` holds
  the glass-and-lead painting kit, `scenery.ts` the mosaic wall, furnace, anvils and counter,
  `swords.ts` the nine swords (each also with a set gem, and battered) and the loose gem, `characters.ts` the
  four adventurers and `ui.ts` the buttons, cards, tags, banner, barrel, the win and offer windows
  and effects.
- `src/ui/`: the leaded-glass button.

Adding a sword is an entry in `src/game/swords.ts` and a shape and colours for it in
`src/art/swords.ts`.
