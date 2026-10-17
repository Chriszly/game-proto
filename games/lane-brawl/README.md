# Lane Brawl

A single-player MOBA prototype built with [Phaser 4](https://phaser.io), TypeScript and Vite, part of
the [game hub](../../README.md).

You pick one of fifteen champions and lead a team of five down three lanes of a big square map.
The cast runs from medieval fantasy to steampunk: knights, archers and witches fight beside
gunslingers, brass automatons, tinkers with tesla coils, wolf-folk and a great bear. Four
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

![A Gunslinger, an Automaton, a Tinker, a Wolfkin and a Bruin on blue clash with red on the middle lane by the river, each with a name over its health bar](cover.png)

## How to play

| Control | Action |
| --- | --- |
| Click a champion card | Pick your champion and start the match |
| New names | Draw new names for the champions on the pick screen |
| Click the ground | Walk there |
| Click an enemy | Walk to it and attack it until it dies or you stop it by clicking the ground |
| Hold Q, W, E or R, then let go | Show the ability's range and where it will land while held; cast it at the cursor on letting go |
| Click an ability box | Cast the ability at the cursor (hovering the box shows its range) |
| D, H, or click their buttons | Use an item's active: D dashes toward the cursor (Phase Boots), H drinks the Healing Flask |
| V, or click its button | Plant a Vision Ward at the cursor (within 600 px), if you carry one |
| T, or Recall home in the top bar | Channel 4 seconds standing still, then appear at your Nexus; damage, moving, attacking or casting cancels it |
| X, or Buy back in the top bar | While dead: pay to respawn at once (100 gold + 50 per level), once every 2:30 |
| 1 or 2, or click an upgrade card | Keep one of the two upgrades a new level offers |
| B, or Shop | Open or close the shop; buy an item by clicking it |
| Esc | Close the shop |
| Play again | After a match: pick a champion again |

1. **Your team**: you and four allies drawn at random from the other fourteen classes; red gets
   five more of them. Allies walk a lane each and fight what they meet. Each champion's name shows
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
12. **Items**: twelve of them plus the Vision Ward, bought within reach of your Nexus or anywhere
    while you wait to respawn, at most six in your bag (the slots
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
   | Vision Ward | 75 | Consumable: carry up to two, plant with V | |

13. **Vision wards**: a planted ward is a stake with a gem eye that gives your team sight 420 px
    around it for 90 seconds, tall grass included, so a champion hiding in a bush near it is seen.
    It takes no bag slot. Enemies that see it can kill it in three hits of any kind (20 gold to the
    killer); AI champions knock down wards they pass. Your wards show a faint dashed ring of their
    sight; a notice tells you when red destroys one. The AI buys a ward whenever it is home without
    one and plants it at the beast's pit or on a river island its team has no ward at.
14. **Recall**: T (or the Recall button in the top bar) channels 4 seconds; a bar fills under your
    champion and in the button, then you appear at your Nexus to shop and heal. Any damage, or
    moving, attacking, casting or using an active, cancels it. AI champions recall when they are
    low with no enemy about, or carry 900 gold and have something to buy, at most once a minute.
15. **Dying** sends the champion back to its Nexus after a short wait that grows with its level;
    the shop stays open to you the whole time you are down. **Buy back**: while dead, X (or the
    Buy back button that takes the Recall button's place) pays 100 gold plus 50 per level to
    respawn at once, then not again for 2:30. An AI champion buys back when an enemy champion
    stands within 800 px of its Nexus. **Going home** heals: within the
    dashed ring round your own Nexus you get back 12% of your health a second (green motes rise).
16. **Kill streak bounties**: a champion that slays three champions without dying carries a bounty
    (100 gold, 50 more per further kill, up to 300), shown in a gold label over its bar, and a
    notice names the streak. Whoever slays it takes the bounty on top of the kill's 300 gold, and
    the notice says so. The AI's roaming hunts go after the biggest bounty they can see, and come
    twice as often while anyone carries one. Dying ends the streak.
17. **Winning** destroys the red Nexus. Losing means your Nexus falls first.

Every ability has an animation of its own (a hammer that splits the ground, a meteor from the
sky, a harpoon on its rope, a tesla pylon arcing, a blood moon rising and so on), and so do bolts in
flight, where they strike, zones while they last and buffs while they glow. A dashed ring round your
champion shows how far it attacks; hovering another champion shows its reach.

The bars under the map show the Nexuses' health and your champion's health, experience, items and
cooldowns, with the D, H and V buttons under the shop button and the Recall (or Buy back) button
right of the clock; the portrait card shows your champion's
name, class, passive and kills and deaths. Short notices under the top bar say when the beast
wakes or falls, an inhibitor falls, a watchstone is taken, a champion slays another, a champion
roams to another lane, a bounty is set or claimed, you buy back or red destroys one of your wards.
The minimap in the corner shows the river, every tower, inhibitor, Nexus,
camp, watchstone, bush, ward, the beast and the champions you can see, under the fog.

### The AI

The AI champions take an upgrade at each level (the one they rate higher: stuns and damage first).
They shop whenever they are home or dead, following a build for their class's role (tanks, bruisers,
brawlers and catchers go Cloth Armor, Ruby Crystal, Thornmail, Swift Boots, Giant's Belt and on;
casters and supports go Sapphire, Sage's Cloak and on; everyone else goes Long Sword, Dagger,
Brutal Edge, Phase Boots and on), each starting with a Healing Flask they drink under 40% health,
and buy a Vision Ward whenever they have none. They recall home when hurt with no enemy near, or
with 900 gold and something to buy, and buy back when an enemy champion is at their Nexus.
Every 70 seconds from 1:40, each team sends one healthy champion from another lane to gang up on
the weakest enemy champion it can see. A champion that is low on health with an enemy champion
near, or outnumbered by two, falls back to its nearest tower behind it, and its allies near by fall
back with it (all of them when outnumbered, the hurt ones otherwise). Every 45 seconds from 2:00
each team sends one healthy champion into the jungle for a brute's buff on its half, or else for a
watchstone it lacks. Ranged champions keep their distance from melee ones, and every champion keeps
its finisher (R) for champions and the beast and its escape for when it falls back.

![The pick screen: fifteen classes in three rows, from the Warden to the Gunslinger, the Automaton, the Tinker, the Wolfkin and the Bruin, each card with a random name, class and role and passive; the line under the cards tells about the one under the pointer](docs/screenshots/playthrough-1-pick.webp)

![The five steampunk and beast classes in one brawl by the river: Gunslinger, Automaton, Tinker, Wolfkin and Bruin](docs/screenshots/new-cast.webp)

![Fog of war: the Warden by the river sees a circle around him; the far bank and the jungle beyond lie in a dark fog, on the map and the minimap](docs/screenshots/fog-of-war.webp)

![The Warden takes on the ember brute in its clearing with the glowing ring, a boar camp below; the jungle past his sight is fogged](docs/screenshots/jungle-brute.webp)

![The Warden stands by a watchstone on its river island: the ring fills as he takes it for blue](docs/screenshots/watchstone.webp)

![The guardian beast in its pit hurls a rock while the Warden and the Mage come to fight it](docs/screenshots/upgrade-beast.webp)

![The Warden waits in the tall grass by the middle lane, half see-through: the red Mage walking past can't see him](docs/screenshots/upgrade-bush.webp)

![Red's mid inhibitor falls to rubble with a notice; the red Nexus loses its ward while the top inhibitor keeps its ring. The bag shows four items and the Dash button counts down](docs/screenshots/upgrade-inhibitor.webp)

![Blue super minions march the middle lane after red's mid inhibitor fell, bigger and ringed in gold](docs/screenshots/upgrade-super-minions.webp)

![The first objective: a card names the red mid tower, a marker floats over it and a star marks it on the minimap](docs/screenshots/loop-objective.webp)

![A last hit pops a coin with +24g; the next minion the Warden would kill is outlined in gold, and the chip by the gold counter shows an x4 streak](docs/screenshots/loop-last-hit.webp)

![Level 2 offers Wide Slam or Stun Slam in the bottom bar; the Q box carries the gold diamond](docs/screenshots/playthrough-4-upgrade.webp)

![The shop: twelve items in four columns, the parts first, with what each builds into or from](docs/screenshots/playthrough-2-shop.webp)

![The shop with the Vision Ward card in its fourth row: a 75 gold consumable, carried two at a time; the top bar has the Recall home button right of the clock, and the V button sits beside D and H](docs/screenshots/round2-shop-ward.webp)

![A vision ward planted at the edge of a bush by the middle lane: a stake with a blue gem eye and three pips, its dashed sight ring round it, and the red Gunslinger hiding in the grass shown by it](docs/screenshots/round2-ward.webp)

![The Warden recalling by the river: a Recalling bar fills under his health bar and the top bar button counts down 1.2 s](docs/screenshots/round2-recall.webp)

![Red's Dunandis carries a BOUNTY 150g label over his bar after four kills; the notice names the streak](docs/screenshots/round2-bounty.webp)

![Dead at the Nexus with 8 s to respawn: the top bar offers Buy back 150g [X] in gold](docs/screenshots/round2-buyback.webp)

![Watch AI with the log open: every champion buys the Healing Flask at 0:00, then wards the river, recalls and buys its build](docs/screenshots/round2-watch-ai-shops.webp)

![Ten champions in one brawl by the river: Warden, Witch, Stalker, Lancer and Berserker among them, each under its own name](docs/screenshots/ten-classes.webp)

![Each ability's own effect: the Warden's Slam splits the ground, the Mage's Meteor falls from the sky, the Priest's Sanctuary raises a column of light](docs/screenshots/skill-looks-1.webp)

![Holding an ability's key shows its range and where it lands: areas, bolt lanes and dash lines](docs/screenshots/aim-indicators.webp)

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
| Gunslinger | Marksman | Ricochet: shots hit foes beside the target for 35% | Fan the Hammer: three quick shots in a fan | Smoke Bomb: zone at the cursor, slows | Dodge Roll: short dash | Deadeye: very long shot, more than double under 30% health |
| Automaton | Tank | Iron Hull: takes 12% less damage | Steam Vent: burst around self, slows | Overclock: +40% attack speed and +15 armor for 4 s | Rocket Fist: bolt that pulls its target in and stuns | Overload: big burst around self, stuns |
| Tinker | Controller | Overcharge: abilities deal 15% more | Spark Bolt: bolt, stuns briefly | Tesla Field: zone at the cursor, hurts and slows | Jetpack: long dash | Lightning Storm: wide zone, hurts and slows |
| Wolfkin | Hunter | Feral Hunger: heals 12% of attack damage | Lunge: dash, hits and slows | Howl: +30% attack speed and +20% speed for 4 s | Rend: burst around self, slows | Blood Moon: +25 damage, +25% lifesteal, +25% speed for 6 s |
| Bruin | Brawler | Thick Hide: heals 6 a second | Maul: burst around self | Roar: wide burst, slows | Bull Rush: dash, hits and stuns | Grizzly Wrath: shield, +25 damage, +30% attack speed, +15 armor for 6 s |
| Lancer | Bruiser | Wide Reach: attacks hit foes beside the target for 40% | Thrust: short bolt through enemies | Sweep: burst around self, knocks back | Vault: dash, hits and stuns | Phalanx: shields allies around and gives +15 armor for 6 s |

Champions are characters, not just classes: each gets a first name drawn from syllables and a
byname that fits its class (a Warden is "the Unbroken" or "Stonehide", a Witch "Thornmother" or
"Hexweaver", a Bruin "Honeypaw"), and an Automaton gets a maker's mark and a number instead, like
"KR-6 Boilerplate", so no two matches field the same faces. **New names** on the pick screen draws again.

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
| Gunslinger | Six Shooter (Q two more shots) or Hot Lead (Q damage +30%) | Thick Smoke (W radius +30%) or Quick Roll (E cooldown -30%) | Steady Aim (R damage +25%) or Long Smoke (W lasts 40% longer) | Stunning Shot (Q stuns 0.3s) or Quick Hammer (Q cooldown -25%) |
| Automaton | Wide Vent (Q radius +30%) or Scalding Vent (Q damage +30%) | Long Overclock (W lasts 50% longer) or Long Fist (E range +25%) | Big Overload (R radius +25%) or Quick Vent (Q cooldown -25%) | Heavy Fist (E damage +40%) or Quick Overclock (W cooldown -30%) |
| Tinker | Hot Spark (Q damage +30%) or Quick Spark (Q cooldown -25%) | Wide Field (W radius +30%) or Long Jet (E range +30%) | Wide Storm (R radius +25%) or Strong Field (W damage +35%) | Stunning Spark (Q stuns 0.4s longer) or Long Storm (R lasts 30% longer) |
| Wolfkin | Far Lunge (Q range +30%) or Savage Lunge (Q damage +30%) | Long Howl (W lasts 50% longer) or Wide Rend (E radius +30%) | Long Moon (R lasts 40% longer) or Quick Lunge (Q cooldown -25%) | Deep Rend (E damage +40%) or Quick Howl (W cooldown -30%) |
| Bruin | Wide Maul (Q radius +30%) or Heavy Maul (Q damage +30%) | Loud Roar (W radius +25%) or Long Rush (E range +30%) | Long Wrath (R lasts 40% longer) or Quick Maul (Q cooldown -25%) | Stunning Roar (W stuns 0.5s) or Crushing Rush (E damage +40%) |
| Lancer | Long Thrust (Q range +30%) or Hard Thrust (Q damage +30%) | Wide Sweep (W radius +25%) or High Vault (E range +30%) | Iron Phalanx (R shield +40%) or Crippling Sweep (W slows 1.2s) | Stunning Vault (E stuns 0.4s longer) or Quick Thrust (Q cooldown -25%) |

A stunned champion or minion neither moves nor attacks. AI champions take upgrades too (see The AI).

### Watch AI

Add `?watch` to the game's URL (`/games/lane-brawl/?watch`) to skip the pick screen and let the AI
play all ten champions, blue's with a random class, until a Nexus falls. The fog is lifted, the
camera follows blue's champion, and the keys and clicks play nothing. The panel in the top right
holds the match still, plays it from 1x to 8x (**[** and **]**) and opens a log (**L**) of each
team's roams, jungle trips, retreats, upgrades, kills, towers and inhibitors. Objectives don't
run in a watched match, so blue gets no extra gold or siege banner, and red deals normal damage
whatever the difficulty. **Watch another** on the end screen starts the next match.

![Watching the AI play, with the log open](docs/screenshots/watch-ai.webp)

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
