// What each person says, by where the quest stands, and what talking to them does.

import type { NpcId } from './maps';
import { hasFlag, MAX_SEEDS, reached, type GameState } from './state';

/** What a talk does once its last line is read. */
export type TalkEffect = 'quest-blade' | 'quest-thorns' | 'finish' | 'cat-pet' | 'cat-stone' | 'quest-bell' | 'seeds' | 'refill' | 'finish-two';

export interface Talk {
  lines: string[];
  then?: TalkEffect;
}

export function talk(id: NpcId, s: GameState): Talk {
  switch (id) {
    case 'elder':
      return elder(s);
    case 'pip':
      if (reached(s, 'bell') && !s.moonstones.includes('v-nook'))
        return { lines: ['Behind the shed there is a rock stuck between the trees.', 'I put my ear to it once. Something behind it hums, like the glowy stones do!'] };
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
      return hermit(s);
  }
}

function hermit(s: GameState): Talk {
  if (s.quest === 'bell')
    return {
      lines: [
        'The bell? Aye, I hear it too. It rings from under the fen, from the old belfry the water swallowed.',
        'Its door is north of the path, east of the big pool, choked with rocks. No blade will shift those.',
        'Take these. Bellseeds. Plant one, step back, and it bursts hard enough to crack stone.',
      ],
      then: 'seeds',
    };
  if (reached(s, 'belfry')) {
    if (s.seeds < MAX_SEEDS) return { lines: ['Out of bellseeds already? Here, a fresh handful. Cut bushes now and then; the pods hide in them.'], then: 'refill' };
    return {
      lines: reached(s, 'home')
        ? ['The bell is quiet. I slept a whole night through, first time in years.', "Rocks don't roll into rings of trees by themselves, you know. West of the river, there is one."]
        : ["The ringers who built that belfry walled up what they didn't want the river to take.", 'Mind the frogs down there. They bite.'],
    };
  }
  return {
    lines: [
      'Hm. A knight, out here? Nobody crosses the river these days.',
      'Three stone watchers stare at one patch of mud. I never dig there. Bad luck, I say.',
      'And that wisp... it flees anyone who chases it. Follow it to the end and see.',
    ],
  };
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
      return {
        lines: [
          'Do you hear it? A bell, tolling under the fen at midnight. Every night now, and louder.',
          'There has been no bell in Glimmer Fen since the water took the old belfry.',
          'Old Sedge lives out there. Ask him what he knows.',
        ],
        then: 'quest-bell',
      };
    case 'bell':
      return { lines: ['Old Sedge has a hut in Glimmer Fen, across the river from the woods.'] };
    case 'belfry':
      return { lines: ['The bell tolled again while you were gone. The lamps all flickered at once.'] };
    case 'home':
      return {
        lines: [
          'A wraith in the bell? And you rang it out of there. Listen: nothing but the frogs.',
          'The shrine builders walled up their mistakes too, I hear. Listen for hollow stone near its door.',
          'Rest now. The fen will keep for another night.',
        ],
        then: 'finish-two',
      };
    case 'end':
      return { lines: ['The night is long, and the fen still glimmers. Off you go.'] };
  }
}
