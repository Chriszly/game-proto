import type { HowToPlay } from '../../../shared/howToPlay';

export const howToPlay: HowToPlay = {
  goal: 'Grow herbs, brew potions and sell them to grow your apothecary. You win by brewing the Panacea that cures the town of the plague.',
  controls: [
    { input: 'Tap or click the ground, or WASD / arrow keys', action: 'Walk the plague doctor there' },
    { input: 'Walk past ripe plants', action: 'Harvest every ripe bed within reach of the sickle' },
    {
      input: 'Stand on a floor marker',
      action: 'Green drops items off, blue works the station, gold picks goods or coins up',
    },
    { input: 'Stand still on a purple marker', action: 'Pay coins towards an upgrade, a craftsman or a new building' },
    { input: 'Mouse wheel, + / - keys or pinch', action: 'Zoom the map in and out' },
    { input: 'Recipes button', action: 'Show what each station makes and what each potion sells for' },
    { input: 'Drop all button', action: 'Throw away everything the doctor carries' },
    {
      input: 'Tap a sign',
      action: 'Replant a garden, set what a station makes first, set a shelf to Cheap, Fair or Dear, or pick what the herb market sells',
    },
  ],
  loop: [
    'Walk through the wheat field and mandrake patch to harvest the ripe plants.',
    'Drop them at the refining table and stand on its work spot to refine them.',
    'Carry the refined goods to the cauldron and stand on its work spot to brew potions.',
    'Drop the potions outside the shop and stand behind the counter to serve customers.',
    'Pick up the coins and spend them on upgrades, craftsmen and pixies.',
  ],
  tips: [
    'Step off the cauldron in the gold part of the brewing bar and pick the potion up for a Fine one, worth half again as much.',
    'Customers tip more the faster you serve them, and a happy customer comes back as a regular.',
    'Keep the daily contract on the top card by dusk to earn its reward.',
    'The study teaches new recipes, and the shade garden grows nightshade for them.',
    'Craftsmen and pixies keep the shop running without you, even while the game is closed.',
    'Rain can blight a bed; walk past it to clear it before it spreads.',
    'From day five the plague asks for potions in three stages; meet them all to unlock the Panacea.',
    'After the cure a new sickness comes each season; every season cured earns a town seal that raises all prices.',
    'Keep 5 or fewer of a potion on its shelf: past that an overstocked shop sells it cheaper, down to half price when full.',
    'Some days a merchant wagon across the street buys a whole crate of one potion at a premium: tap it to sell.',
    'The herb market below the outfitter buys and sells plants and refined goods at prices that change with the weather.',
  ],
};
