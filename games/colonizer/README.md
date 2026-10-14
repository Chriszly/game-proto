# Colonizer

A small real-time strategy prototype built with [Phaser 4](https://phaser.io), TypeScript and Vite,
part of the [game hub](../../README.md). It is in the style of Age of Empires and StarCraft, with
pixel art drawn in code for now.

You pick one of three factions and play a skirmish on a 128 by 128 tile map against an AI opponent,
which plays the next faction along. Gather wood, food and ore, put up buildings, research techs in
the Academy and the Town Center, train villagers and armies, and destroy the enemy Town Center to
win. Lose your own Town Center and the match is over.

## Factions

| Faction | Units |
| --- | --- |
| Ember Legion | Militia (melee), Archer (ranged), Knight (cavalry) |
| Tide Coven | Spearman (melee, strong against cavalry), Slinger (ranged), Rider (cavalry) |
| Thorn Grove | Brute (tough melee), Hunter (long-range), Stalker (fast cavalry) |

Every faction has the same buildings and the same villagers.

## How to play

| Control | Action |
| --- | --- |
| Left click | Select one unit or building; hold and drag to box-select units; Shift adds to the selection |
| Right click | Attack an enemy, gather from a tree, bush or mine, finish a building, or walk |
| A, then left click | Attack-move: the army walks and fights whatever it meets on the way |
| S | Stop the selected units |
| B | Open the build list for the selected villagers, then click a spot to place it |
| 1 to 9 | Select a control group; Ctrl with a number saves the selection to it |
| Arrow keys, or the screen edge | Scroll the map |
| Esc | Cancel placing a building or attack-moving |
| Bottom panel | Train units, research techs and advance to Age II from the buttons |

Villagers gather on their own once they have a node to work, and go back to a node of the same kind
when one runs out. Buildings need a builder to finish them, and a builder goes on to gather once
the building is done.

## Economy and population

- Wood comes from trees, food from berry bushes and farms, and ore from gold mines.
- Villagers carry ten at a time to the Town Center, or to a Lumber or Mining Camp for wood and ore.
- A house adds population; the Town Center adds ten. Units in training count against the cap.

## Difficulty

| Easy | Normal | Hard |
| --- | --- | --- |
| The AI gathers 25% slower | The game as designed | The AI gathers 25% faster |

The hub's difficulty setting changes only how fast the AI gathers. Normal is the game as designed.

## Notes

- There is no save yet: each match starts fresh.
- Units can walk over each other, and there is no minimap.
- The map is the same for a given seed, and the seed is fixed in the playthrough test.
