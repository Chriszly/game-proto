import type { HowToPlay } from '../../../shared/howToPlay';
import { byLanguage } from '../../../shared/i18n';

const en: HowToPlay = {
  goal: 'Keep the beetles out of the cottage for 20 waves. There is no road: every tower you plant is also a wall, so you build the maze they must walk.',
  controls: [
    { input: 'Click or tap a tool', action: 'Pick a tower from your pouch (keys 1 to 6)' },
    { input: 'Click, tap or drag on the lawn', action: 'Plant the tool there, or a whole line of them' },
    { input: 'Click or tap a tower', action: 'Upgrade or sell it, or turn a bonfire or sunglass' },
    { input: 'Start wave button, Space', action: 'Send the next wave, early for a bonus' },
    { input: 'Speed button, F', action: 'Play at double speed' },
  ],
  loop: [
    'Under the garden cards, pick up to four towers to take along with the hedge and the bow.',
    'Beetles come out of the burrows and walk the shortest free way to the cottage.',
    'Plant hedges and towers to make that way long, past as many towers as you can.',
    'A placement that would close the last way through is refused: one route must stay open from each burrow.',
    'Beaten foes pay gold; a held wave pays more. Spend it between waves, or during them.',
    'Each foe that gets in costs lives. Hold all 20 waves to save the garden.',
  ],
  tips: [
    'Hold the pointer over the lawn to see the new route before you plant.',
    'Moths fly straight over the maze, so keep bows and frost near the cottage too.',
    'Moles chew through a hedge that blocks a much shorter way: put a tower there instead.',
    'From wave 6 the second burrow opens, so plan a maze that serves both routes.',
    'Weevils wear armour: crossbows, cannons, bonfires and puffballs get through it best.',
    'A bonfire or sunglass likes a long straight corridor; a storm rod likes foes bunched in tight bends.',
  ],
};

const de: HowToPlay = {
  goal: 'Halte die Käfer 20 Wellen lang vom Häuschen fern. Es gibt keinen Weg: Jeder Turm, den du pflanzt, ist auch eine Mauer, also baust du das Labyrinth, durch das sie laufen müssen.',
  controls: [
    { input: 'Ein Werkzeug klicken oder tippen', action: 'Einen Turm aus deinem Beutel wählen (Tasten 1 bis 6)' },
    { input: 'Auf den Rasen klicken, tippen oder ziehen', action: 'Das Werkzeug dort pflanzen, oder eine ganze Reihe' },
    { input: 'Einen Turm klicken oder tippen', action: 'Ihn ausbauen oder verkaufen, oder Feuerkorb und Brennglas drehen' },
    { input: 'Knopf Welle starten, Leertaste', action: 'Die nächste Welle schicken, früh mit Bonus' },
    { input: 'Tempo-Knopf, F', action: 'Mit doppeltem Tempo spielen' },
  ],
  loop: [
    'Wähle unter den Gartenkarten bis zu vier Türme, die du neben Hecke und Bogen mitnimmst.',
    'Käfer kommen aus den Bauen und laufen den kürzesten freien Weg zum Häuschen.',
    'Pflanze Hecken und Türme, damit dieser Weg lang wird und an möglichst vielen Türmen vorbeiführt.',
    'Was den letzten Weg schließen würde, wird abgelehnt: Von jedem Bau muss ein Weg offen bleiben.',
    'Besiegte Gegner bringen Gold, eine gehaltene Welle mehr. Gib es zwischen den Wellen aus oder währenddessen.',
    'Jeder Gegner, der durchkommt, kostet Leben. Halte alle 20 Wellen, um den Garten zu retten.',
  ],
  tips: [
    'Halte den Zeiger über den Rasen, um den neuen Weg zu sehen, bevor du pflanzt.',
    'Motten fliegen geradewegs über das Labyrinth, also stell Bögen und Frost auch nahe ans Häuschen.',
    'Maulwürfe fressen sich durch eine Hecke, die einen viel kürzeren Weg versperrt: Stell dort lieber einen Turm hin.',
    'Ab Welle 6 öffnet sich der zweite Bau, also plane ein Labyrinth für beide Wege.',
    'Rüsselkäfer tragen Panzer: Armbrust, Kanone, Feuerkorb und Bovist kommen am besten durch.',
    'Feuerkorb und Brennglas mögen einen langen geraden Gang, der Sturmstab Gegner dicht gedrängt in engen Kurven.',
  ],
};

const enUS: HowToPlay = {
  ...en,
  tips: en.tips.map((tip) => tip.replace('armour', 'armor')),
};

export const howToPlay = byLanguage({ en, 'en-US': enUS, de });
