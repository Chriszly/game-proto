# Lane Brawl

A single-player MOBA prototype built with [Phaser 4](https://phaser.io), TypeScript and Vite, part of
the [game hub](../../README.md).

You pick one of five champions and lead a team of five down three lanes. Four allies walk the lanes
with you, and five NPC champions on the red team fight you. Farm minions for gold, level up on XP,
buy items at your Nexus, and push the lanes until the red Nexus falls. There is no multiplayer.

![The red team's first middle tower falls to a Warden's Slam](cover.png)

## How to play

| Control | Action |
| --- | --- |
| Click a champion card | Pick your champion and start the match |
| Click the ground | Walk there |
| Click an enemy | Walk to it and attack it until it dies or you stop it by clicking the ground |
| Q, W, E, R, or click their boxes | Cast the ability at the cursor |
| B, or Shop | Open or close the shop; buy an item by clicking it |
| Esc | Close the shop |
| Play again | After a match: pick a champion again |

1. **Your team**: you and four allies, one per remaining champion. Allies walk a lane each and
   fight what they meet.
2. **Standing still** makes your champion attack whatever enemy comes in reach. Clicking the
   ground sends it walking and it stops attacking until it arrives.
3. **Minions** leave both Nexuses every 25 seconds, three to a lane. A champion that lands the
   last hit on one earns 19 gold, and every champion of the other team nearby earns 30 XP.
4. **Towers** shoot the nearest champion or minion in reach. Each side has two per lane.
5. **Jungle camps**: four neutral camps, two a side. Attack one to take its 80 gold and 120 XP; it
   fights back and returns after a minute.
6. **Champions** level from 1 to 5 on XP. R unlocks at level 3. Each level adds health and damage.
7. **Items**: Long Sword (+12 damage), Chain Mail (+6 armor, +90 health) and Swift Boots (+25
   speed). Each costs 300 to 350 gold and can be bought once. Buy them within reach of your Nexus.
8. **Dying** sends the champion back to its Nexus after a short wait that grows with its level.
9. **Winning** destroys the red Nexus. Losing means your Nexus falls first.

The bars under the map show the Nexuses' health and your champion's health, experience and
cooldowns. The minimap in the corner shows every tower, Nexus and champion.

![Buying a Long Sword from the shop](docs/screenshots/playthrough-2-shop.png)

### Champions

| Champion | Role | Q | W | E | R (level 3) |
| --- | --- | --- | --- | --- | --- |
| Warden | Tank | Slam: burst around self, slows | Bulwark: shields allies near the cursor | Charge: dash, hits where it lands | Last Stand: big burst, slows |
| Blade | Assassin | Dash Strike: dash and hit | Whirl: burst around self | Shadow Step: dash | Execute: heavy hit at the cursor |
| Archer | Marksman | Piercing Arrow: long bolt through enemies | Volley: three arrows in a fan | Roll: short dash | Arrow Rain: burst at the cursor |
| Mage | Burst | Fireball: bolt | Frost Nova: burst around self, slows | Blink: dash | Meteor: big burst at the cursor |
| Priest | Support | Smite: bolt | Mend: heals allies near the cursor | Ward: shields allies near the cursor | Sanctuary: heals and shields a wide area |

### Difficulty

The difficulty, set on the hub page's Settings, changes how hard red hits: Easy has red's champions
and minions deal 20% less damage, Hard 25% more. Normal is the game as designed.

## Running locally

`npm run dev` at the repo root, then open `/games/lane-brawl/` (or pick Lane Brawl on the hub).
The playthrough runs with `npx playwright test --project lane-brawl`.
