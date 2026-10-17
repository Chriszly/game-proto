import type { HowToPlay } from '../../../shared/howToPlay';

export const howToPlay: HowToPlay = {
  goal:
    'Plant golems beside the garden path to squash the pests before they eat the Heartwood. ' +
    'You lose when its 10 leaves are gone.',
  controls: [
    { input: 'Click or tap a seed card', action: 'Pick the seed to plant' },
    { input: 'Click or tap a soil cell', action: 'Plant the picked seed there, if you have the sap' },
    { input: 'Hedge card, then a path cell', action: 'Plant a hedge that blocks pests until they chew through it' },
    { input: 'Click or tap a golem', action: 'Open its menu: Raise, Aim, Move or Uproot' },
    { input: 'Start wave / Call wave now', action: 'Send the next wave, or call it early for bonus sap' },
    { input: '1x / 2x button', action: 'Play at double speed, or back to normal' },
    { input: 'Garden tag under the title', action: 'Pick a garden to plant, or its thorny variant' },
    { input: 'Click or tap the Heartwood', action: 'Between waves, regrow a lost leaf for sap' },
  ],
  loop: [
    'Pick the Pebble golem seed and plant it on soil next to the path.',
    'Wait a few seconds while the seed grows into a golem that fights.',
    'Tap Start wave to send the pests down the path.',
    'Your golems squash pests, and each one drops sap.',
    'Clearing the wave pays bonus sap and opens a bud on the Heartwood.',
    'Spend the sap on more seeds and levels, then start the next wave.',
  ],
  tips: [
    'Golems only throw at pests within their reach; hover a soil cell to see how far that is.',
    'Moss golems slow pests, and golems side by side with one get a combo.',
    'At level 3 each golem picks one of two forms for good.',
    'Open all five Heartwood buds to unlock the Thorn golem, which pricks every pest in reach.',
    'From wave 3, unspent sap earns a little compost interest each wave.',
    'Crows fly over hedges, moles tunnel out of reach, and snails shrug off small hits.',
    'Wave 30 is the harvest: stars for the leaves you kept unlock new gardens.',
    'After every Queen Slug you pick one of three boons for the rest of the garden.',
    'Three stars on a garden open its thorny variant; harvest it to win a laurel.',
  ],
};
