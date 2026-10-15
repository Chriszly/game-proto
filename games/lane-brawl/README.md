# Lane Brawl

A single-player MOBA prototype built with [Phaser 4](https://phaser.io), TypeScript and Vite, part of
the [game hub](../../README.md).

You pick one of ten champions and lead a team of five down three lanes of a big square map. Four
allies walk the lanes with you, and five NPC champions on the red team fight you. Every champion has
a name of its own, drawn fresh for each match (like Ilmisdor the Unbroken, a Warden, or Fiath
Thornmother, a Witch), and its class gives it a passive and four abilities. Farm minions for gold,
level up on XP, hunt the jungle between the lanes for gold and buffs, hold the watchstones on the
river for sight, fight over the guardian beast, ambush from the tall grass and the fog of war, and
push the lanes through the towers and an inhibitor until the red Nexus falls. There is no multiplayer.

Everything is low-poly 3D: the champions, minions, the jungle's boars, wolves and brutes, the
watchstones, the guardian beast, the towers, the inhibitors and the Nexus are small
faceted models built in code and rendered by a tiny software renderer at start-up into sprites from
eight directions, with a walk cycle, attack poses and a cast pose. The map has faceted grass, flagstone
lanes with stone kerbs, a river from corner to corner, ruins, flowers and pines, lit from the top
left, under bevelled slate panels.

![Five blue champions and five red ones clash on the middle lane by the river, each with a name over its health bar, a Witch's zone glowing violet and a notice saying who slew whom](cover.png)

## How to play

| Control | Action |
| --- | --- |
| Click a champion card | Pick your champion and start the match |
| New names | Draw new names for the champions on the pick screen |
| Click the ground | Walk there |
| Click an enemy | Walk to it and attack it until it dies or you stop it by clicking the ground |
| Q, W, E, R, or click their boxes | Cast the ability at the cursor |
| D, H, or click their buttons | Use an item's active: D dashes toward the cursor (Phase Boots), H drinks the Healing Flask |
| 1 or 2, or click an upgrade card | Keep one of the two upgrades a new level offers |
| B, or Shop | Open or close the shop; buy an item by clicking it |
| Esc | Close the shop |
| Play again | After a match: pick a champion again |

1. **Your team**: you and four allies drawn at random from the other nine classes; red gets the
   five left over. Allies walk a lane each and fight what they meet. Each champion's name shows
   over its health bar, and a notice says who slew whom.
2. **The map** is a 2800 px square: the blue Nexus at the bottom left, the red at the top right,
   the top and bottom lanes along the edges and the middle lane on the diagonal. A river runs from
   the top left corner to the bottom right one, across the middle lane, and splits the jungle
   between the lanes into four quarters.
3. **Fog of war**: you only see what your team sees. Every champion, minion, tower, inhibitor,
   Nexus and held watchstone lights a circle around it; the rest of the map lies under a dark fog,
   on the map and the minimap, and enemies in it are not drawn and can't be targeted. Towers,
   inhibitors and the Nexuses always show.
4. **Standing still** makes your champion attack whatever enemy comes in reach. Clicking the
   ground sends it walking and it stops attacking until it arrives.
5. **Minions** leave both Nexuses every 25 seconds, three to a lane. A champion that lands the
   last hit on one earns 19 gold, and every champion of the other team nearby earns 30 XP.
6. **Last hits**: the enemy minion near you that your next hit would kill gets a gold outline. Each
   last hit pops a coin with the gold it paid and grows your streak, shown in a chip by the gold
   counter. From x4 on, a last hit pays 25% more (24 gold). The streak breaks when a minion you had
   outlined falls to someone else.
7. **Towers** shoot minions first. A champion who hurts an enemy champion in a tower's reach draws
   its fire for 2.5 seconds, and with no minion near a tower shoots any champion. Each side has two
   per lane.
   Behind them, near each Nexus, stands one **inhibitor** per lane. It is warded (a ring round it
   and a grey health bar) until both of its lane's towers are down. When it falls, the other team's
   minions on that lane come out as **super minions**: bigger, gold-ringed, with 60% more health and
   damage. The Nexus itself is warded until one of its inhibitors has fallen.
8. **The jungle** between the lanes holds twelve neutral camps, six a side, on dirt clearings
   among pines, ruins and flowers. A camp fights back, wakes its whole pack when one of them is
   hit, heals when left alone, takes no harm from fights near by that are not aimed at it, and returns after a minute (the brutes after 90 seconds).

   | Camp | Health | Gold | XP | Slaying it gives |
   | --- | --- | --- | --- | --- |
   | Boar (two a side) | 600 | 80 | 120 | |
   | Wolf pack: an alpha and two wolves (two a side) | 460, 200 each | 60, 20 each | 90, 30 each | |
   | Ember brute (one a side) | 1150, armored | 100 | 170 | Ember buff for 60 s: +15 damage, attacks slow |
   | Moss brute (one a side) | 1150, armored | 100 | 170 | Moss buff for 60 s: -20% cooldowns, heal 8 a second |

   A buff shows as a coloured ring under its champion and a chip with its time left over the
   bottom bar.
   **Watchstones**: three standing stones on islands in the river. Stand by one with no enemy
   champion near for 3 seconds to take it for your team (a ring fills as you do); a held stone
   shows your team's colour and lights a wide circle of the fog around it, until the other team
   takes it back.
   **The guardian beast** wakes in its pit by the river between the middle and bottom lanes at 1:30, and again
   2:30 after it falls. It has 3200 health, claws whoever hurt it last (and anyone beside them),
   hurls rocks at those out of reach, and heals when left alone. The team that slays it gets
   **empowered minions** for 90 seconds (they hit 50% harder and take 35% less damage; they glow
   violet, and a chip at the top right shows the time left); the slayer takes 150 gold and 250 XP.
   Two AI champions from each side go to fight over it while it is awake.
   **Tall grass**: eighteen bushes in the jungle and beside the lanes. A champion inside one can't be seen or targeted by
   enemies unless one of them stands in the same bush or right next to it; your own champion shows
   through the grass. Attacking or casting shows the champion for 1.5 seconds. A target that slips
   into a bush is lost.
9. **Champions** level from 1 to 5 on XP. R unlocks at level 3. Each level adds health and damage.
   Each class has a passive (in the table below) and its own mix of abilities: bursts, bolts,
   dashes, heals and shields, plus self buffs (Frenzy, Vanish), lingering zones that hurt and slow
   (Blight, Arrow Rain), a harpoon that pulls its target in, knock-backs, and finishers that hit
   twice as hard on a champion under 40% health (Execute, Final Mark). The Stalker's Vanish hides
   it from enemies and their towers and camps until it attacks.
10. **Upgrades**: each new level puts two upgrade cards in the bottom bar and marks the ability box
   they change with a gold diamond. Keep one; it changes that ability for the rest of the match (gold
   pips under a box count the upgrades it has). The choices per champion are in the table below.
11. **Objectives**: a card under the top bar names one goal at a time with a timer and a reward, a
   gold marker floats over its target and a star marks it on the minimap. They come in turn: topple
   the nearest red tower (2:30, 200 gold and the siege banner, +25% damage to towers and the Nexus
   for a minute), clear the boar or wolf pack nearest you on your half of the jungle (1:30, 120 gold), defeat the red champion nearest
   you (2:00, 150 gold), slay the guardian beast (2:00, 250 gold; only when your team slays it).
   A goal counts however its target falls; a late one is missed, and one with nothing to aim at
   (the beast asleep) is skipped. The next goal comes 4 seconds after one ends.
12. **Items**: twelve of them, bought within reach of your Nexus, at most six in your bag (the slots
    under your health bar). Cheap parts build into bigger items: buying a big item uses up the parts
    you own and takes their cost off its price (the shop shows the saving).

   | Item | Cost | Stats | Builds from |
   | --- | --- | --- | --- |
   | Long Sword | 350 | +12 damage | |
   | Dagger | 300 | +15% attack speed | |
   | Cloth Armor | 300 | +6 armor | |
   | Ruby Crystal | 300 | +100 health | |
   | Swift Boots | 300 | +25 speed | |
   | Sapphire | 300 | -8% ability cooldowns | |
   | Healing Flask | 150 | Active (H): heal 220, every 40s | |
   | Brutal Edge | 950 | +30 damage, +20% attack speed | Long Sword + Dagger |
   | Thornmail | 900 | +16 armor, +180 health | Cloth Armor + Ruby Crystal |
   | Phase Boots | 600 | +40 speed; active (D): dash 220 px, every 18s | Swift Boots |
   | Sage's Cloak | 900 | -20% ability cooldowns, +120 health | Sapphire + Ruby Crystal |
   | Giant's Belt | 700 | +320 health | Ruby Crystal |
13. **Dying** sends the champion back to its Nexus after a short wait that grows with its level.
14. **Winning** destroys the red Nexus. Losing means your Nexus falls first.

The bars under the map show the Nexuses' health and your champion's health, experience, items and
cooldowns, with the D and H buttons under the shop button; the portrait card shows your champion's
name, class, passive and kills and deaths. Short notices under the top bar say when the beast
wakes or falls, an inhibitor falls, a watchstone is taken, a champion slays another or a champion
roams to another lane. The minimap in the corner shows the river, every tower, inhibitor, Nexus,
camp, watchstone, bush, the beast and the champions you can see, under the fog.

### The AI

The AI champions take an upgrade at each level (the one they rate higher: stuns and damage first).
Every 70 seconds from 1:40, each team sends one healthy champion from another lane to gang up on
the weakest enemy champion it can see. A champion that is low on health with an enemy champion
near, or outnumbered by two, falls back to its nearest tower behind it, and its allies near by fall
back with it (all of them when outnumbered, the hurt ones otherwise). Every 45 seconds from 2:00
each team sends one healthy champion into the jungle for a brute's buff on its half, or else for a
watchstone it lacks. Ranged champions keep their distance from melee ones, and every champion keeps
its finisher (R) for champions and the beast and its escape for when it falls back.

![The pick screen: ten classes in two rows, each card with a random name, class and role, passive and a blurb, and the New names button](docs/screenshots/playthrough-1-pick.png)

![Fog of war: the Warden by the river sees a circle around him; the far bank and the jungle beyond lie in a dark fog, on the map and the minimap](docs/screenshots/fog-of-war.png)

![The Warden takes on the ember brute in its clearing with the glowing ring, a boar camp below; the jungle past his sight is fogged](docs/screenshots/jungle-brute.png)

![The Warden stands by a watchstone on its river island: the ring fills as he takes it for blue](docs/screenshots/watchstone.png)

![The guardian beast in its pit hurls a rock while the Warden and the Mage come to fight it](docs/screenshots/upgrade-beast.png)

![The Warden waits in the tall grass by the middle lane, half see-through: the red Mage walking past can't see him](docs/screenshots/upgrade-bush.png)

![Red's mid inhibitor falls to rubble with a notice; the red Nexus loses its ward while the top inhibitor keeps its ring. The bag shows four items and the Dash button counts down](docs/screenshots/upgrade-inhibitor.png)

![Blue super minions march the middle lane after red's mid inhibitor fell, bigger and ringed in gold](docs/screenshots/upgrade-super-minions.png)

![The first objective: a card names the red mid tower, a marker floats over it and a star marks it on the minimap](docs/screenshots/loop-objective.png)

![A last hit pops a coin with +24g; the next minion the Warden would kill is outlined in gold, and the chip by the gold counter shows an x4 streak](docs/screenshots/loop-last-hit.png)

![Level 2 offers Wide Slam or Stun Slam in the bottom bar; the Q box carries the gold diamond](docs/screenshots/playthrough-4-upgrade.png)

![The shop: twelve items in four columns, the parts first, with what each builds into or from](docs/screenshots/playthrough-2-shop.png)

![All ten classes in one brawl by the river: Warden, Witch, Stalker, Lancer and Berserker among them, each under its own name](docs/screenshots/ten-classes.png)

### Champions

| Class | Role | Passive | Q | W | E | R (level 3) |
| --- | --- | --- | --- | --- | --- | --- |
| Warden | Tank | Stalwart: takes 15% less damage | Slam: burst around self, slows | Bulwark: shields allies near the cursor | Charge: dash, hits and stuns where it lands | Last Stand: big burst, slows |
| Blade | Assassin | Keen Edge: every 3rd attack hits 2x | Dash Strike: dash and hit | Whirl: burst around self | Shadow Step: dash | Execute: heavy hit at the cursor, double under 40% health |
| Archer | Marksman | Fleetfoot: runs 30% faster for 1.5 s after a shot | Piercing Arrow: long bolt through enemies | Volley: three arrows in a fan | Roll: short dash | Arrow Rain: zone at the cursor, hurts and slows |
| Mage | Burst | Arcane Power: abilities deal 20% more | Fireball: bolt | Frost Nova: burst around self, slows | Blink: dash | Meteor: big burst at the cursor |
| Priest | Support | Blessed Aura: allies near heal 2 a second | Smite: bolt | Mend: heals allies near the cursor | Ward: shields allies near the cursor | Sanctuary: heals and shields a wide area |
| Berserker | Fighter | Bloodthirst: heals 10% of attack damage | Cleave: burst around self | Frenzy: +45% attack speed for 4 s | Leap: dash, hits and slows | Rampage: +30 damage, +20% lifesteal, +20% speed for 6 s |
| Harpooner | Catcher | Sea Legs: heals 4 a second | Harpoon: bolt that pulls its target in and stuns | Riptide: burst around self, knocks back | Brace: +20 armor and a shield for 3 s | Maelstrom: zone at the cursor, hurts and slows |
| Witch | Controller | Hex: attacks slow for 0.6 s | Hex Bolt: bolt, slows | Blight: zone at the cursor, hurts | Bramble Snare: roots foes at the cursor | Plague Field: wide zone, hurts and slows |
| Stalker | Ambusher | Ambush: the first hit after a 2 s lull or out of Vanish hits 2.3x | Shuriken Fan: three stars in a fan | Vanish: unseen and +30% speed for 3 s | Pounce: dash, hits and stuns | Final Mark: bolt, double under 40% health |
| Lancer | Bruiser | Wide Reach: attacks hit foes beside the target for 40% | Thrust: short bolt through enemies | Sweep: burst around self, knocks back | Vault: dash, hits and stuns | Phalanx: shields allies around and gives +15 armor for 6 s |

Champions are characters, not just classes: each gets a first name drawn from syllables and a
byname that fits its class (a Warden is "the Unbroken" or "Stonehide", a Witch "Thornmother" or
"Hexweaver"), so no two matches field the same faces. **New names** on the pick screen draws again.

### Upgrades

| Champion | Level 2 | Level 3 | Level 4 | Level 5 |
| --- | --- | --- | --- | --- |
| Warden | Wide Slam (Q radius +30%) or Stun Slam (Q stuns 0.6s) | Iron Bulwark (W shield +40%) or Long Charge (E range +30%) | Titan Stand (R damage +25%) or Quick Slam (Q cooldown -25%) | Crushing Charge (E damage +40%) or Wide Bulwark (W radius +40%) |
| Blade | Deep Strike (Q range +30%) or Keen Strike (Q damage +30%) | Wide Whirl (W radius +30%) or Quick Step (E cooldown -30%) | Brutal Execute (R damage +25%) or Crippling Whirl (W slows 1.2s) | Swift Strike (Q cooldown -25%) or Long Step (E range +30%) |
| Archer | Heavy Arrow (Q damage +30%) or Wide Volley (W two more arrows) | Long Roll (E range +40%) or Quick Arrow (Q cooldown -25%) | Wide Rain (R radius +30%) or Hard Volley (W damage +30%) | Pinning Arrow (Q stuns 0.5s) or Heavy Rain (R damage +25%) |
| Mage | Big Fireball (Q damage +30%) or Swift Fireball (Q cooldown -25%) | Deep Freeze (W stuns 0.6s) or Far Blink (E range +30%) | Huge Meteor (R radius +30%) or Wide Nova (W radius +30%) | Long Fireball (Q range +30%) or Heavy Meteor (R damage +25%) |
| Priest | Deep Mend (W heals +30%) or Wide Mend (W radius +30%) | Holy Smite (Q damage +30%) or Strong Ward (E shield +40%) | Wide Sanctuary (R radius +25%) or Quick Ward (E cooldown -25%) | Binding Smite (Q stuns 0.5s) or Quick Mend (W cooldown -25%) |
| Berserker | Wide Cleave (Q radius +30%) or Savage Cleave (Q damage +30%) | Long Frenzy (W lasts 50% longer) or Far Leap (E range +30%) | Endless Rampage (R lasts 40% longer) or Crushing Leap (E stuns 0.5s) | Quick Cleave (Q cooldown -25%) or Quick Frenzy (W cooldown -30%) |
| Harpooner | Long Harpoon (Q range +25%) or Barbed Harpoon (Q damage +40%) | Deep Riptide (W radius +30%) or Iron Brace (E shield +50%) | Wide Maelstrom (R radius +25%) or Quick Harpoon (Q cooldown -25%) | Stunning Riptide (W stuns 0.5s) or Raging Maelstrom (R damage +30%) |
| Witch | Cruel Hex (Q damage +30%) or Lasting Blight (W lasts 40% longer) | Wide Snare (E radius +40%) or Quick Hex (Q cooldown -25%) | Wide Plague (R radius +25%) or Foul Blight (W damage +35%) | Deep Roots (E holds 0.5s longer) or Long Plague (R lasts 30% longer) |
| Stalker | Sharp Shuriken (Q damage +30%) or Wide Fan (Q two more stars) | Long Vanish (W lasts 50% longer) or Far Pounce (E range +30%) | Deadly Mark (R damage +25%) or Quick Vanish (W cooldown -30%) | Stunning Pounce (E stuns 0.4s longer) or Quick Shuriken (Q cooldown -25%) |
| Lancer | Long Thrust (Q range +30%) or Hard Thrust (Q damage +30%) | Wide Sweep (W radius +25%) or High Vault (E range +30%) | Iron Phalanx (R shield +40%) or Crippling Sweep (W slows 1.2s) | Stunning Vault (E stuns 0.4s longer) or Quick Thrust (Q cooldown -25%) |

A stunned champion or minion neither moves nor attacks. AI champions take upgrades too (see The AI).

### Difficulty

The difficulty, set on the hub page's Settings, changes how hard red hits: Easy has red's champions
and minions deal 20% less damage, Hard 25% more. Normal is the game as designed.

## Running locally

`npm run dev` at the repo root, then open `/games/lane-brawl/` (or pick Lane Brawl on the hub).
The playthrough runs with `npx playwright test --project lane-brawl`: it picks the Warden, buys a
Long Sword, topples the red mid tower (the first objective), clears the camp the next objective
marks, last-hits a gold-outlined minion and, at level 2, keeps Wide Slam. On the way it waits out
of the red tower's reach for the first minion wave and hits back at a red champion that comes for
it.

## Code layout

- `src/main.ts`: creates the game and applies the hub's settings.
- `src/scenes/GameScene.ts`: the pick screen, the match view, the HUD and input; `layout.ts` holds
  where everything sits on screen.
- `src/game/`: the rules, free of Phaser: `data.ts` (map, river, camps, watchstones, sight,
  champions and their passives, items, objectives, upgrades, buffs, the beast, inhibitors, bushes
  and AI plans), `names.ts` (the champions' random names), `state.ts` (types and a new match) and
  `sim.ts` (the rules, vision and the AI).
- `src/art/`: `lowpoly.ts` (the software renderer), `models.ts` (every low-poly model), `bake.ts`
  (renders the models into sprite sheets at start-up) and `map.ts` (paints the map).
