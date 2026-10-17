import type { HowToPlay } from '../../../shared/howToPlay';
import { byLanguage } from '../../../shared/i18n';

/** British English, which US English shares: nothing in it is spelled differently. */
const en: HowToPlay = {
  goal: 'Fight across four worlds, the Dune, Swamp, Ice and Lava worlds. Survive five minutes on each, then beat its boss. Beat the Hollow Champion on the Lava world to win. The run ends when your health runs out.',
  controls: [
    { input: 'WASD / arrow keys, or hold the mouse on the field', action: 'Walk (toward where you hold)' },
    { input: 'Touch: put a finger down anywhere and drag', action: 'A steering stick appears under it; walk the way you drag' },
    { input: 'Nothing', action: 'Your weapon fires, or your blade strikes, on its own' },
    { input: 'Space, or the round button bottom right', action: 'Signature move, when charged' },
    { input: 'Tap a hero, or 1-9, 0, - and =; then Fight, or Enter', action: 'Choose a hero and start' },
    { input: 'Tap a card, or 1 / 2 / 3 (4 for a fourth card)', action: 'Choose an upgrade, a star map node, an offer or an answer' },
    { input: 'Continue, Enter or Space', action: 'Go on after a new hero is unlocked' },
    { input: '4 / Enter at the trader', action: 'Reroll the offers / leave' },
  ],
  loop: [
    'Pick a hero: Legionary TR-9 at first; the other soldiers, the blade knights, a rebel commander and a trio of battle droids join as you unlock them.',
    'Keep moving: foes come at you from every side, and your weapon shoots them down.',
    'Walk over the green lumen shards they drop to fill the XP bar. Each level-up pauses the run on three cards (four for Elara Voss).',
    'At 5:00 the planet\'s boss comes. Beat it, and your hero, level and kit carry on to the next world.',
    'Between worlds, choose a node on the star map: a trader, an elite fight, a rest or an event.',
  ],
  tips: [
    'Elites, ringed in gold, drop a chest with a free upgrade and credits to spend at a trader.',
    'An elite fight is a 60 s arena: beat every elite for a free tier of your choice and credits.',
    'Swamp toads spit slowing globs, Ice troopers fire in volleys, fallen knights block shots from the front: hit them while they dash.',
    'Glowing rings on the ground are warnings: step out before they blow. Lava vents erupt on the Lava world.',
    'You hold at most 5 abilities and 4 pieces of gear. A path at tier 5 plus its matching gear unlocks a capstone.',
    'Locked heroes stay a mystery: each joins after a deed, like taking a path to tier 5 or reaching a new world. The run pauses to show the new hero.',
    'A card with a link icon completes a crossover: a pool skill and a path that work together.',
  ],
};

const de: HowToPlay = {
  goal: 'Kämpfe dich durch vier Welten: Wüsten-, Sumpf-, Eis- und Lavawelt. Überlebe auf jeder fünf Minuten und besiege dann ihren Boss. Besiege den Hohlen Champion auf der Lavawelt, um zu gewinnen. Der Lauf endet, wenn deine Gesundheit aufgebraucht ist.',
  controls: [
    { input: 'WASD / Pfeiltasten, oder die Maus auf dem Feld halten', action: 'Laufen (dorthin, wo du hältst)' },
    { input: 'Touch: einen Finger irgendwo aufsetzen und ziehen', action: 'Darunter erscheint ein Steuerknüppel; lauf in die Richtung, in die du ziehst' },
    { input: 'Nichts', action: 'Deine Waffe feuert, oder deine Klinge schlägt zu, von selbst' },
    { input: 'Leertaste, oder der runde Knopf unten rechts', action: 'Spezialangriff, wenn aufgeladen' },
    { input: 'Einen Helden antippen, oder 1-9, 0, - und =; dann Kämpfen, oder Enter', action: 'Einen Helden wählen und loslegen' },
    { input: 'Karte antippen, oder 1 / 2 / 3 (4 für eine vierte Karte)', action: 'Ein Upgrade, einen Knoten der Sternenkarte, ein Angebot oder eine Antwort wählen' },
    { input: 'Weiter, Enter oder Leertaste', action: 'Nach einem neu freigeschalteten Helden weitermachen' },
    { input: '4 / Enter beim Händler', action: 'Angebote neu würfeln / gehen' },
  ],
  loop: [
    'Wähle einen Helden: zuerst Legionär TR-9; die anderen Soldaten, die Klingenritter, eine Rebellenkommandantin und ein Trio Kampfdroiden kommen hinzu, sobald du sie freischaltest.',
    'Bleib in Bewegung: Gegner kommen von allen Seiten, und deine Waffe schießt sie ab.',
    'Lauf über die grünen Lumensplitter, die sie fallen lassen, um die EP-Leiste zu füllen. Jeder Stufenaufstieg hält den Lauf auf drei Karten an (vier bei Elara Voss).',
    'Bei 5:00 kommt der Boss des Planeten. Besiege ihn, und dein Held, seine Stufe und Ausrüstung ziehen mit zur nächsten Welt.',
    'Wähle zwischen den Welten einen Knoten auf der Sternenkarte: einen Händler, einen Elitekampf, eine Rast oder ein Ereignis.',
  ],
  tips: [
    'Eliten mit goldenem Ring lassen eine Kiste mit einem freien Upgrade fallen und Credits für den Händler.',
    'Ein Elitekampf ist eine 60-s-Arena: besiege jede Elite für eine freie Stufe deiner Wahl und Credits.',
    'Sumpfkröten spucken bremsende Klumpen, Eissoldaten feuern Salven, gefallene Ritter blocken Schüsse von vorn: triff sie, während sie vorstürmen.',
    'Leuchtende Ringe am Boden sind Warnungen: tritt hinaus, bevor sie explodieren. Auf der Lavawelt brechen Lavaschlote aus.',
    'Du hältst höchstens 5 Fähigkeiten und 4 Ausrüstungsteile. Ein Pfad auf Stufe 5 mit der passenden Ausrüstung schaltet eine Krönung frei.',
    'Gesperrte Helden bleiben ein Geheimnis: jeder kommt nach einer Tat hinzu, etwa einem Pfad auf Stufe 5 oder einer neuen Welt. Der Lauf hält an, um den neuen Helden zu zeigen.',
    'Eine Karte mit Kettensymbol vervollständigt eine Kombination: eine Vorratsfähigkeit und ein Pfad, die zusammenwirken.',
  ],
};

export const howToPlay: HowToPlay = byLanguage({ en, de });
