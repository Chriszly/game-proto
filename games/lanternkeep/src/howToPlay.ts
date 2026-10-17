import type { HowToPlay } from '../../../shared/howToPlay';

export const howToPlay: HowToPlay = {
  goal: 'Light enough lanterns by nightfall to keep the hearths burning. Keep ten nights for the Great Festival; lose all three hearths and the keep falls.',
  controls: [
    {
      input: 'Click or tap a lantern',
      action: "Send an idle moth to light it, or to refill a lit one's oil",
    },
    {
      input: 'Click or tap a bat',
      action: 'Send an idle moth to chase it off',
    },
    {
      input: 'Click or tap an upgrade',
      action: 'Between nights: buy its next level, put a fill in the cask or rekindle a hearth',
    },
    {
      input: 'Click or tap a resting moth',
      action: 'With the second jar bought: move it to rest at the other jar',
    },
    {
      input: 'Click or tap a district',
      action: 'At every fifth nightfall: move the keep there, or stay',
    },
    {
      input: 'Click or tap a curse / Go on',
      action: 'After the Great Festival: take a curse for more pay, or take none',
    },
    { input: 'Next dusk', action: "Start the next night's dusk" },
    {
      input: 'Keep going / New keep',
      action: 'Play on after the Great Festival, or start again after a loss',
    },
  ],
  loop: [
    'Tap a lantern and a moth flies out from the jar to light it, then flies home.',
    'Lit lanterns burn oil and go dark when it runs out, so tap them again to refill.',
    'Watch for the gust warning and keep a moth sitting on the lantern it names.',
    'At nightfall each lit lantern pays 5 coins, and all of them lit pays 10 more.',
    'Spend your coins on upgrades, then start the next dusk with one more lantern.',
  ],
  tips: [
    "Dusk lasts 45 seconds, and a full lantern burns for 20, so don't light them all too early.",
    'Fewer than three in five lanterns lit at nightfall puts out one of your three hearths.',
    'Saving a lantern with under 15% oil left is a close call and pays 2 coins at once.',
    "Meet the herald's order on the card under the HUD for 15 more coins at nightfall.",
    'A tap while every moth is busy waits in line, up to two taps.',
    'From night 3 bats come to snuff lanterns, and refills draw on the oil cask.',
    'Lanterns side by side form chains that pay 8 coins when all of them burn at nightfall.',
    'From night 6 a moth rests 6 seconds after its fourth flight of a dusk; Nectar shortens it.',
    'Lost a hearth? The Hearth card rekindles it between nights for 40, then 80, then 120 coins.',
    'After the Festival each curse you take makes the nights harder and every nightfall pay 25% more.',
  ],
};
