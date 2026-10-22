import type { HowToPlay } from '../../../shared/howToPlay';
import { byLanguage } from '../../../shared/i18n';

const en: HowToPlay = {
  goal: 'Play Bjarn, a hunter who does not know he can turn into a hybrid and a bear. Live through the raid on his village, find out what happened that night and defeat Ulfgar, the wolf chief. A fall starts the chapter over.',
  controls: [
    { input: 'A / D or arrow keys, or the ◀ ▶ buttons', action: 'Walk' },
    { input: 'J, Z, a click or the Strike button', action: 'Strike' },
    { input: 'Hold K, X or the Block button', action: 'Block; raised just before a hit lands it is a parry' },
    { input: 'L, C, Shift or the Dodge button', action: 'Dodge roll: nothing hits you mid-roll' },
    { input: 'Q or the Shift button (once learned)', action: 'Call the hybrid, and turn back' },
    { input: 'E or the Use button', action: 'Look closer at tracks' },
    { input: 'Space, Enter, E or a tap', action: 'Read on while someone is talking' },
  ],
  loop: [
    'The hunt: learn to walk, strike, block and dodge on the boars in the woods.',
    'The raid: defend the village with your father until the cult leader Skarn arrives.',
    'The outburst: the beast breaks out and you only half control it.',
    'Awakening: Ratatoskr the squirrel finds you; follow the tracks to Torvald, who teaches you to parry.',
    'The forest: fight wolves and cultists on the cult’s trail.',
    'Ulfgar: beat him as a man, then call the hybrid to beat his giant wolf.',
  ],
  tips: [
    'Every form plays differently: the human is nimble, the hybrid fast and strong, the bear mighty but slow and unable to block.',
    'Rage rises only when you are hit. When it overflows, the beast breaks out on its own.',
    'A yellow mark means a strike you can block, a red one a strike you must dodge.',
    'Parries cost no stamina and stun the foe; stunned foes take more damage.',
    'Strikes, dodges and blocks use stamina. At zero you are exhausted: weaker and unable to dodge.',
    'Herbs heal the human and the hybrid; the bear heals through its blows.',
  ],
};

const de: HowToPlay = {
  goal: 'Spiele Bjarn, einen Jäger, der nicht weiß, dass er sich in einen Hybriden und einen Bären verwandeln kann. Überlebe den Überfall auf sein Dorf, finde heraus, was in jener Nacht geschah, und besiege Ulfgar, den Wolf-Obersten. Wer fällt, beginnt das Kapitel neu.',
  controls: [
    { input: 'A / D oder Pfeiltasten, oder die Tasten ◀ ▶', action: 'Gehen' },
    { input: 'J, Z, ein Klick oder die Schlag-Taste', action: 'Zuschlagen' },
    { input: 'K, X oder die Block-Taste halten', action: 'Blocken; kurz vor dem Treffer gehoben ist es eine Parade' },
    { input: 'L, C, Umschalt oder die Rollen-Taste', action: 'Ausweichrolle: mitten in der Rolle trifft dich nichts' },
    { input: 'Q oder die Wandel-Taste (sobald gelernt)', action: 'Den Hybriden rufen und zurückverwandeln' },
    { input: 'E oder die Nutzen-Taste', action: 'Spuren genauer ansehen' },
    { input: 'Leertaste, Enter, E oder Tippen', action: 'Weiterlesen, während jemand spricht' },
  ],
  loop: [
    'Die Jagd: Lerne an den Keilern im Wald gehen, zuschlagen, blocken und ausweichen.',
    'Der Überfall: Verteidige mit deinem Vater das Dorf, bis der Kultführer Skarn kommt.',
    'Der Ausbruch: Die Bestie bricht hervor und du hast sie nur halb im Griff.',
    'Erwachen: Das Eichhörnchen Ratatoskr findet dich; folge den Spuren zu Torvald, der dir die Parade beibringt.',
    'Das Waldgebiet: Kämpfe auf der Spur des Kults gegen Wölfe und Kultkrieger.',
    'Ulfgar: Besiege ihn als Mensch und ruf dann den Hybriden gegen seinen Riesenwolf.',
  ],
  tips: [
    'Jede Gestalt spielt sich anders: Der Mensch ist wendig, der Hybrid schnell und stark, der Bär gewaltig, aber träge und ohne Block.',
    'Die Wut steigt nur, wenn du getroffen wirst. Läuft sie über, bricht die Bestie von selbst hervor.',
    'Ein gelbes Zeichen ist ein Schlag, den du blocken kannst, ein rotes einer, dem du ausweichen musst.',
    'Paraden kosten keine Ausdauer und betäuben den Gegner; betäubte Gegner nehmen mehr Schaden.',
    'Schläge, Ausweichen und Blocken kosten Ausdauer. Bei null bist du erschöpft: schwächer und ohne Ausweichen.',
    'Kräuter heilen Mensch und Hybrid; der Bär heilt sich durch seine Hiebe.',
  ],
};

export const howToPlay: HowToPlay = byLanguage({ en, de });
