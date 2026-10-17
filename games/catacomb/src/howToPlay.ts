import type { HowToPlay } from '../../../shared/howToPlay';

export const howToPlay: HowToPlay = {
  goal: 'Lead your hero through the Crypt and the Sunken Tombs to beat the Hollow Queen. The run ends if your health reaches zero.',
  controls: [
    { input: 'Tap a hero', action: 'Set out as the Knight or the Hunter (< and > pick the depth once one is open)' },
    { input: 'Tap a lit room', action: 'Walk there and go in' },
    { input: 'Tap a card in hand', action: 'Play it, if you have the energy for it' },
    { input: 'Tap a flask', action: 'Drink it on your turn, for no energy' },
    { input: 'Tap End turn', action: 'Discard your hand and let the foes act' },
    { input: 'Tap a reward card or a ware', action: 'Add the card to your deck, or buy from the merchant' },
    { input: 'Tap a relic in the top bar', action: 'Show its name and what it does' },
  ],
  loop: [
    'Pick a hero and tap one of the lit rooms on the map.',
    'In a fight you draw five cards and have three energy to spend each turn.',
    'Play attacks to hit foes and skills to block, then end your turn.',
    'Win the fight to collect gold and pick a new card for your deck.',
    "Choose your next room along the forking paths, all the way to the act's boss.",
  ],
  tips: [
    'Each foe shows its intent: what it will do on its next turn, so you can block in time.',
    'Block soaks up damage until your next turn, but health carries over from room to room.',
    'Campfires let you rest to heal, temper a card to make it stronger, or burn one to thin the deck.',
    'The merchant sells cards, relics and flasks for gold, and removes a card for 40.',
    'Weak cuts attacks by a quarter, Vulnerable makes attacks hit harder, and Poison hurts each turn.',
    'Elites are tougher and can add curse cards to your deck, but drop rare cards and a flask.',
    'Beating the Hollow Queen opens the next depth, a harder run with one more rule.',
  ],
};
