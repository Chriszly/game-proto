// What each person says, by where the quest stands, and what talking to them does.

import type { NpcId } from './maps';
import { hasFlag, type GameState } from './state';

/** What a talk does once its last line is read. */
export type TalkEffect = 'quest-blade' | 'quest-thorns' | 'finish' | 'cat-pet' | 'cat-stone';

export interface Talk {
  lines: string[];
  then?: TalkEffect;
}

export function talk(id: NpcId, s: GameState): Talk {
  switch (id) {
    case 'elder':
      return elder(s);
    case 'pip':
      return {
        lines: s.moonstones.includes('v-pond')
          ? ['You found the glowy stone! Grandma says they fall from the moon when nobody is looking.']
          : ['I dropped a glowy stone in the bushes by the pond.', 'The bushes are too prickly for me. Maybe a sword could help?'],
      };
    case 'baker':
      return {
        lines:
          s.quest === 'start' || s.quest === 'blade'
            ? ["Fresh bread for the night watch! Elder Wren was looking for you, dear."]
            : ['Mind the woods. My mother said two of the trees there never cast a shadow.', 'Walk right through them, she said. Nobody believed her.'],
      };
    case 'cat': {
      if (hasFlag(s, 'cat-3')) return { lines: ['Biscuit is asleep, very pleased with herself.'] };
      if (hasFlag(s, 'cat-2')) return { lines: ['Biscuit drops something shiny at your feet!'], then: 'cat-stone' };
      if (hasFlag(s, 'cat-1')) return { lines: ['Biscuit rolls over and stretches.'], then: 'cat-pet' };
      return { lines: ['Biscuit the cat purrs at you.'], then: 'cat-pet' };
    }
    case 'hermit':
      return {
        lines: [
          'Hm. A knight, out here? Nobody crosses the river these days.',
          'Three stone watchers stare at one patch of mud. I never dig there. Bad luck, I say.',
          'And that wisp... it flees anyone who chases it. Follow it to the end and see.',
        ],
      };
  }
}

function elder(s: GameState): Talk {
  switch (s.quest) {
    case 'start':
      return {
        lines: [
          "Ah, there you are. The lamps are lit, but the thorns crept over the north gate again.",
          "Your grandfather's old blade is in the shed, east along the street. Fetch it for me, would you?",
        ],
        then: 'quest-blade',
      };
    case 'blade':
      return s.items.sword
        ? {
            lines: [
              "That's the one. It still remembers his hand.",
              'Cut the thorns at the north gate. Something in the woods keeps calling them back.',
            ],
            then: 'quest-thorns',
          }
        : { lines: ["The shed is east along the street, past Marla's ovens. The chest is in front."] };
    case 'thorns':
      return { lines: ['The gate is at the top of the main street. Give those thorns a good swing.'] };
    case 'shrine':
      return { lines: ['Old folk say a shrine sank in those woods long ago. If the thorns come from anywhere, it is there.'] };
    case 'return':
      return {
        lines: [
          'You came back! And the thorns at the gate are withering as we speak.',
          'A queen of thorns, under the shrine? Then this is only the start of it.',
          'Rest now. You have done the village proud.',
        ],
        then: 'finish',
      };
    case 'done':
      return { lines: ['The night is long, and the fen still glimmers. Off you go.'] };
  }
}
