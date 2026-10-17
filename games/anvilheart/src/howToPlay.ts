import type { HowToPlay } from '../../../shared/howToPlay';

export const howToPlay: HowToPlay = {
  goal: 'Forge and merge swords, sell them to adventurers and deliver great swords to the crown. The Crown Blade wins the smithy.',
  controls: [
    {
      input: 'Click or tap Forge',
      action: 'Make a Rusty Dagger on the first empty anvil, once the forge is hot',
    },
    {
      input: 'Drag a sword onto its twin',
      action: 'Merge the two into one sword of the next tier',
    },
    {
      input: 'Drag a sword onto an anvil or sword',
      action: 'Move it there, or swap the two',
    },
    {
      input: 'Drag a sword onto an adventurer',
      action: 'Sell it, if it is at least as good as the one they asked for',
    },
    {
      input: 'Drag a sword onto the commission banner',
      action: 'Deliver it to the crown',
    },
    { input: 'Drag a gem onto a plain sword', action: 'Set the gem in it' },
    {
      input: 'Tap the switch under the furnace',
      action: 'Forge bucklers instead of swords, once you have made a Knight\'s Blade',
    },
    {
      input: 'Tap Guild perks or the stars',
      action: 'Spend guild stars on lasting perks',
    },
    {
      input: 'Tap an upgrade, the barrel or the fifth row',
      action: 'Buy it with your coins',
    },
  ],
  loop: [
    'Tap Forge to make Rusty Daggers on the anvils.',
    'Drag two matching swords together to make a better one.',
    'Sell each adventurer the sword they ask for, shown on their order card.',
    'Spend your coins on forge upgrades and more room.',
    'Build the great sword the royal commission asks for and drag it onto the banner.',
  ],
  tips: [
    'The exact sword an adventurer asked for pays 50% more; a better one only pays what they asked.',
    'Merges within 4 seconds of each other build a hammer streak that pays bonus coins.',
    "A merge while the streak's ring glows gold, in its last second, makes a Masterwork: it pays 50% more and never rusts.",
    'Adventurers leave if they wait too long, and that lowers your guild reputation.',
    'A good reputation brings adventurers more often and makes them wait longer.',
    'A sword left alone on an anvil for 3 minutes dulls and then drops a tier; the quench barrel keeps it safe.',
    'Two Dragonslayers merge into the Anvilheart, which the Crown Blade commission asks for.',
    'Some adventurers order a sword and buckler set: hand over both, in either order, for a 50% bonus.',
    'Each new charter after the win makes you choose one of two edicts that change its rules.',
  ],
};
