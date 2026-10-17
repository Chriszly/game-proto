import type { HowToPlay } from '../../../shared/howToPlay';

export const howToPlay: HowToPlay = {
  goal: 'Explore Mossford, the woods and the fen by lamplight, beat what grows the thorns, then find what rings the bell under the fen. Moonstones are hidden everywhere; how many you find changes the ending.',
  controls: [
    { input: 'WASD or arrow keys', action: 'Walk' },
    { input: 'Click or tap the ground', action: 'Walk there' },
    { input: 'Click or tap a person, chest, sign or foe', action: 'Walk over and talk, open, read or attack' },
    { input: 'Space, J or the sword button', action: 'Talk to or open what is in front, else swing the sword' },
    { input: 'Shift, K or the roll button', action: 'Roll out of the way; nothing hits you mid-roll' },
    { input: 'Q, L or the vine button', action: 'Throw the hookvine (once found): pulls you to golden posts' },
    { input: 'B, X or the seed button', action: 'Plant a bellseed (once given): it bursts, breaking boulders and cracked walls' },
    { input: 'Space or a tap', action: 'Read on while someone is talking' },
  ],
  loop: [
    'Talk to Elder Wren in the square: she sends you for the old blade.',
    'Open the chest by the shed to take the blade, then bring it back to her.',
    'Cut the thorns at the north gate and head into Bramble Woods.',
    'Find the Sunken Shrine, its key, its puzzle and the tool hidden inside.',
    'Face the Thornmother: pull her glowing bulbs down with the hookvine, then strike them.',
    'Chapter two: ask about the bell in the night, get bellseeds from the fen hermit and find the Drowned Belfry.',
  ],
  tips: [
    'Your journal line, top right, always says what to do next.',
    'Swing at bushes: some hide moonstones, some drop hearts.',
    'People drop hints. Listen to the baker, Pip and the hermit, and read the signs.',
    'Step back from a planted bellseed: its burst hurts you too.',
    'Fall in a fight and you wake where you last came in, healed.',
    'Your progress saves whenever you change place.',
  ],
};
