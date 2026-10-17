import type { Translation } from '../../../../shared/i18n';
import type en from './en';

/** Lanternkeep's texts in German. */
const de: Translation<typeof en> = {
  // Upgrades: name and card text
  wickName: 'Dochte',
  wickBlurb: 'Zünden 25 % schneller',
  oilName: 'Öl',
  oilBlurb: 'Laternen brennen 6 s länger',
  mothsName: 'Motten',
  mothsBlurb: 'Eine Motte mehr im Glas',
  wingsName: 'Flügel',
  wingsBlurb: 'Motten 20 % schneller',
  fireflyName: 'Glühwurm',
  fireflyBlurb: 'Zündet zwei Laternen je Flug',
  nectarName: 'Nektar',
  nectarBlurb: 'Müde ruhen 1,5 s kürzer',
  jarName: 'Glas',
  jarBlurb: 'Ein zweites Glas im Osten',
  caskName: 'Fass',
  caskBlurb: '+1 Füllung (ab Nacht {n})',
  hearthName: 'Herd',
  hearthBlurb: 'Erloschenes Feuer entfachen',

  // The shop cards' levels and prices
  level: '{n}/{max}',
  caskLevel: '{n}/{max}',
  hearthLevel: '{n}/{max} an',
  cost: '{n} M',
  full: 'Voll',
  spent: 'Verbraucht',
  allLit: 'Alle an',
  built: 'Gebaut',
  maxed: 'Maximal',

  // Curses: name and card text
  wetName: 'Nasse Dochte',
  wetBlurb: 'Laternen anzünden dauert 50 % länger',
  batsName: 'Rastlose Fledermäuse',
  batsBlurb: 'Jede Nacht kommt eine Fledermaus mehr',
  thinName: 'Dünnes Öl',
  thinBlurb: 'Öl brennt 25 % schneller',
  watchName: 'Wachsamer Fürst',
  watchBlurb: 'Eine Laterne mehr muss brennen',

  // Kinds of lantern, lettered under a special one
  plainName: 'Laterne',
  beaconName: 'Leuchtfeuer',
  candleName: 'Kerze',
  bellName: 'Glocke',

  // Kinds of night: name and plaque text
  clearName: 'Klare Nacht',
  clearBlurb: 'Nur die Motten regen sich',
  fogName: 'Neblige Nacht',
  fogBlurb: 'Öl brennt 40 % schneller',
  feastName: 'Festnacht',
  feastBlurb: 'Laternen und Ketten zahlen doppelt',
  stormName: 'Sturmnacht',
  stormBlurb: 'Zwei Böen mehr',

  // Districts: name and rule
  keepName: 'Die Burg',
  keepBlurb: 'Die alten Mauern: keine Regel außer dem Dunkel',
  docksName: 'Der Hafen',
  docksBlurb: 'Seewind: jede Böe bläst zwei Laternen aus',
  chapelName: 'Kapellenberg',
  chapelBlurb: 'Vesper: +2 je Laterne, aber drei von vier müssen brennen',
  marketName: 'Der Markt',
  marketBlurb: 'Markttag: Rettungen und Fensterrufe doppelt, Öl brennt 15 % schneller',

  // Lantern spots, named in the herald's orders outside the keep
  spotLeftTower: 'linker Turm',
  spotRightTower: 'rechter Turm',
  spotKeep: 'Bergfried',
  spotLeftWall: 'linke Mauer',
  spotRightWall: 'rechte Mauer',
  spotFarLeft: 'ganz links',
  spotFarRight: 'ganz rechts',
  spotLeftSconce: 'linker Halter',
  spotRightSconce: 'rechter Halter',
  spotGate: 'Tor',
  spotCrane: 'Kran',
  spotLighthouse: 'Leuchtturm',
  spotMast: 'Mast',
  spotWarehouse: 'Lagerhaus',
  spotFishHall: 'Fischhalle',
  spotWestMooring: 'Westanleger',
  spotEastMooring: 'Ostanleger',
  spotLeftQuay: 'linker Poller',
  spotRightQuay: 'rechter Poller',
  spotCustoms: 'Zollhaus',
  spotBellTower: 'Glockenturm',
  spotYew: 'Eibe',
  spotSteeple: 'Kirchturm',
  spotLeftWindow: 'linkes Fenster',
  spotRightWindow: 'rechtes Fenster',
  spotPorch: 'Vorhalle',
  spotLeftGable: 'linker Giebel',
  spotRightGable: 'rechter Giebel',
  spotClockTower: 'Uhrturm',
  spotBreadStall: 'Brotstand',
  spotClothStall: 'Tuchstand',
  spotFarLeftStall: 'Stand ganz links',
  spotFarRightStall: 'Stand ganz rechts',
  spotHallArch: 'Hallenbogen',

  // The herald's orders and the order card
  orderTowers: 'Türme + Bergfried brennen zur Nacht',
  orderWest: 'Die Westmauer brennt zur Nacht',
  orderCloseCalls: 'Rette zwei Laternen knapp',
  orderEast: 'Die Ostmauer brennt zur Nacht',
  orderShield: 'Schütze eine Laterne vor einer Böe',
  orderLit: 'Zur Nacht: {names}',
  heraldsOrder: 'HEROLDSAUFTRAG',
  reward: '+{n}',
  progressLit: '{done}/{of} brennen',
  progressLitMet: '{done}/{of} an · halten bis dunkel',
  progressSaved: '{done}/{of} rechtzeitig gerettet',
  progressShielded: '{done}/{of} geschützt',
  orderKept: 'Auftrag erfüllt!',
  orderMissed: 'Auftrag verfehlt',

  // HUD
  night: 'Nacht {n}',
  lit: 'An {lit}/{count}',
  need: 'nötig {n}',
  nightfallIn: 'Nacht in {s} s',
  nightfallQueued: 'Nacht in {s} s · {n} warten',
  nightHasFallen: 'Nacht',

  // Plaques and tags over the lanterns
  saveIt: 'Retten +{n} M',
  gustIn: 'Böe in {n} s',
  gustShielding: 'eine Motte schützt sie',
  gustShield: 'Motte darauf schützt sie',
  owlIn: 'Eule in {n} s',
  owlNote: 'Motten auf der Reihe halten sie',
  windowCalls: 'Fenster ruft: {n} s',
  windowNote: 'rechtzeitig zünden: +{n} M',
  nap: 'zz {n} s',

  // Popups
  chasedOff: 'Verjagt!',
  snuffed: 'Gelöscht!',
  drivenOff: 'Vertrieben!',
  keptPopup: 'Gehalten!',
  windowLit: '+{n} M Fenster hell!',
  windowDarkens: 'Das Fenster wird dunkel',
  caskDry: 'Fass leer!',
  closeCall: '+{n} M knapp gerettet!',
  shielded: 'Geschützt!',
  blownOut: 'Ausgeblasen!',
  chainPay: '+{n} Kette',
  orderPay: '+{n} Auftrag erfüllt',

  // Buttons
  nextDusk: 'Nächste Nacht',
  goOn: 'Weiter',
  newKeep: 'Neue Burg',
  keepGoing: 'Weiterspielen',

  // The night panel
  nightFalls: 'Nacht {n} bricht an',
  litLine: '{lit} von {count} Laternen an ({need} nötig){feast}',
  feastDouble: '  ·  das Fest zahlt doppelt',
  orderKeptLine: 'Auftrag des Herolds erfüllt: +{n}',
  orderMissedLine: 'Auftrag des Herolds verfehlt',
  chainsLit: { one: '  ·  {n} Kette an: +{coins}', other: '  ·  {n} Ketten an: +{coins}' },
  coinsLine: '+{n} Münzen{during}{peril}',
  closeCallsEarned: '+{n} durch knappe Rettungen',
  windowsEarned: '+{n} von Fenstern',
  cursesPaid: '  ·  Flüche zahlen x{mult}',
  verdictLost: 'Zu dunkel: eines der Herdfeuer ist erloschen.',
  verdictAll: 'Jede Laterne brennt: die Burg erstrahlt!',
  verdictHeld: 'Die Burg hält die Dunkelheit fern.',
  festivalHeldGoal: 'Das Große Fest wurde gefeiert: die Nächte gehen weiter.',
  festivalGoal: 'Großes Fest: {kept} von {of} Nächten gehalten',
  nextNight: 'Als Nächstes: {kind}{where} ({blurb})',
  nextWhere: ' · {district}',

  // The choice of district
  moveTitle: 'Nacht {n} bricht an: wohin?',
  moveSub: 'Ab der nächsten Dämmerung kann die Burg in einem anderen Viertel stehen,\nmit eigenen Laternen, Ketten und Regeln.',
  moveHint: 'Tippe auf ein Viertel, um die Burg dorthin zu bringen, oder bleib, wo sie ist.',
  stayHere: 'hier bleiben',

  // Pick your peril
  perilTitle: 'Nacht {n}: wähle dein Wagnis',
  perilSub: 'Jeder genommene Fluch gilt für den Rest des Spiels,\nund jede Nacht zahlt dafür 25 % mehr. Nimm einen, beide oder keinen.',
  taken: 'genommen',
  takenTimes: '{n}x genommen',
  perilMult: 'Lohn jetzt x{mult}  ·  bester x{best}',

  // Game over and the Great Festival
  keepDark: 'Die Burg ist dunkel',
  gameOver: {
    one: 'Das letzte Herdfeuer erlosch in Nacht {night}.\nGehaltene Nächte: {kept}.{festival}\n\nBestwert: {n} Nacht{peril}.',
    other: 'Das letzte Herdfeuer erlosch in Nacht {night}.\nGehaltene Nächte: {kept}.{festival}\n\nBestwert: {n} Nächte{peril}.',
  },
  festivalWasHeld: '\nDas Große Fest wurde gefeiert.',
  bestPeril: '  ·  bestes Wagnis x{mult}',
  festivalTitle: 'Das Große Fest!',
  festivalText: '{n} Nächte gehalten: das ganze Tal kommt,\num die Laternen der Burg zu sehen.\n\nDie Nächte gehen weiter. Wie lange hält sie?',
};

/** Texts that are the same in German. */
export const keepEnglish: (keyof typeof en)[] = ['caskLevel'];

export default de;
