import type { HowToPlay } from '../../../shared/howToPlay';

export const howToPlay: HowToPlay = {
  goal: 'Destroy the enemy Town Center (both of them in a three-way match), or hold a Monument for three minutes. If your own Town Center falls, you lose.',
  controls: [
    { input: 'Left click, or drag a box', action: 'Select units or a building; Shift adds to the selection' },
    { input: 'Right click', action: 'Gather, build, attack or walk; with a building selected, set its rally flag' },
    { input: 'Tap, on a touch screen', action: 'With units selected, give the right click order; tap your own unit or building to select it' },
    { input: 'A, then left click', action: 'Attack-move: walk there and fight on the way' },
    { input: 'S', action: 'Stop the selected units' },
    { input: 'B, or the bottom panel', action: 'Open the build list with villagers selected, then click a spot' },
    { input: '1 to 9 (Ctrl to save)', action: 'Select a control group, or save the selection to one' },
    { input: 'Arrow keys, screen edge or minimap', action: 'Scroll the map' },
    { input: 'Esc', action: 'Cancel placing a building or attack-moving' },
  ],
  loop: [
    'Pick the map kind and one or two AI rivals, then a faction on the menu.',
    'Send villagers to chop wood, gather food and mine ore.',
    'Build houses for population, then train more villagers and soldiers.',
    'Research Age II at the Town Center and pick your boon.',
    'Complete the three deeds to reach Age III, pick its edge, then march on the enemy Town Center.',
  ],
  tips: [
    'Villagers carry ten at a time to the Town Center, or to a Lumber or Mining Camp.',
    "The enemy's first raid comes no sooner than six minutes in, and a horn warns you.",
    'Each AI is a Raider, a Builder or a Warden; scout its Town Center to learn which.',
    'Ring the bell at the Town Center to shelter villagers; press Back to work when the raid is over.',
    'Kill the guards at a camp to claim its cart of ore or food, or hold its relic for a bonus.',
    'Soldiers earn ranks from kills, adding health and damage.',
    'Rams break buildings and walls but cannot hurt units, so give them an escort.',
    'Each faction has its own building, shown last on the first page of the build list.',
  ],
};
