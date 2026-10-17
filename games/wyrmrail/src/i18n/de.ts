import type { Translation } from '../../../../shared/i18n';
import type en from './en';

/** Wyrmrail's texts in German. */
const de: Translation<typeof en> = {
  // Cargo: the name on an order card, and the same word inside a sentence
  grain: 'Getreide',
  grainLower: 'Getreide',
  tools: 'Werkzeug',
  toolsLower: 'Werkzeug',
  timber: 'Holz',
  timberLower: 'Holz',
  ore: 'Erz',
  oreLower: 'Erz',
  fish: 'Fisch',
  fishLower: 'Fisch',
  flour: 'Mehl',
  flourLower: 'Mehl',
  planks: 'Bretter',
  planksLower: 'Bretter',
  iron: 'Eisen',
  ironLower: 'Eisen',
  passengers: 'Fahrgäste',
  passengersLower: 'Fahrgäste',

  // Charters: name and card text
  fairName: 'Markt',
  fairText: '{cargo} bringt das Doppelte, jede Frist ein Viertel kürzer',
  rushName: 'Eilaufträge',
  rushText: 'Jeder Auftrag bringt die Hälfte mehr, Fristen ein Drittel kürzer',
  patientName: 'Geduldige Dörfer',
  patientText: 'Fristen um die Hälfte länger, ein Viertel weniger Lohn',
  railsName: 'Billige Schienen',
  railsText: 'Gleise kosten die Hälfte, jeder Auftrag bringt ein Fünftel weniger',
  busyName: 'Hochsaison',
  busyText: 'Doppelt so viele Aufträge, ein Zehntel weniger Lohn',
  feastName: 'Festmahl',
  feastText: 'Die Lindwürmer werden nie hungrig, jeder Auftrag bringt ein Zehntel weniger',

  // Festival medals and the boons they bring the next game
  bronze: 'Bronze',
  silver: 'Silber',
  gold: 'Gold',
  headStart: 'Vorsprung',
  swiftStart: 'Flinker Start',
  earlyRiser: 'Frühaufsteher',

  // Banners
  startBanner: 'Lege Gleise vom Horst nach Millbrook und Ashford',
  medalBoons: 'Medaillenboni: {boons}',
  secondWyrmWakes: 'Ein zweiter Lindwurm erwacht im Horst',
  charterBanner: 'Freibrief: {name}',
  washoutWarning: 'Der Fluss steigt: eine Brücke wird gleich weggespült!',
  rockfallWarning: 'Steine lösen sich: ein Steinschlag geht gleich auf die Gleise nieder!',
  festivalBanner: 'Fest in {village}: bring {n} Ladungen hin!',
  roundJoins: 'Runde {round}: {village} kommt an die Strecke',
  roundBanner: 'Runde {round}',

  // Floating texts over the valley
  depotPop: 'Depot -{n}',
  giftsCost: 'Geschenke -{n}',
  losesFaith: '{village} verliert den Glauben!',
  feelsForgotten: '{village} fühlt sich vergessen',
  washedOut: 'Weggespült!',
  rockfall: 'Steinschlag!',
  switchPop: 'Weiche!',
  munch: 'Mampf!',
  gifts: 'Geschenke!',
  late: '{cargo} zu spät!',

  // The valley and the panel
  roost: 'Horst',
  orders: 'Aufträge',
  upgrades: 'Ausbau',
  remove: 'Abbauen',
  removing: 'Baut ab',
  plain: 'Schlicht',
  plainOn: 'Schlicht an',
  playAgain: 'Nochmal',
  coins: '{n} M',
  wingsMax: 'Flinke Flügel: max',
  wingsCost: 'Flinke Flügel {level}: {cost} M',
  hoardMax: 'Goldhort: max',
  hoardCost: 'Goldhort {level}: {cost} M',
  secondAwake: '2. Lindwurm: wach',
  secondRound: '2. Lindwurm: Runde {round}',
  secondCost: '2. Lindwurm: {cost} M',
  tapVillage: 'Dorf antippen',
  depotRound: 'Depot: Runde {round}',
  depotCost: 'Depot {n}: {cost} M',

  // Order cards
  tapToSend: 'Antippen',
  queued: 'Eingereiht',
  loading: 'Lädt...',
  onTheWay: 'Unterwegs',
  noTrack: 'Kein Gleis',
  route: '{from} → {to}',
  rushOrder: 'Eilauftrag',
  morePay: '+{n} % Lohn',

  // The HUD: the round and what each wyrm is doing
  festivalProgress: 'Fest: {n}/{goal} geliefert',
  roundProgress: 'Runde {round}: {n}/{goal} geliefert',
  roundCharter: '{progress}\n{charter}',
  wyrm: 'Lindwurm: {status}',
  wyrmN: 'Lindwurm {n}: {status}',
  throwingSwitch: 'stellt eine Weiche',
  waitingJunction: 'wartet an einer Weiche',
  eating: 'frisst im Horst',
  hungry: 'hungrig, auf dem Weg zum Horst',
  bringingGifts: 'bringt Geschenke nach {village}',
  settingOff: 'bricht auf',
  resting: 'ruht',
  hauling: 'bringt {cargo} nach {village}',
  loadingCargo: 'lädt {cargo}',
  offTo: 'unterwegs nach {village}',

  // The hint line under the valley
  hintRemove: 'Gleise antippen baut sie für die halben Kosten ab. Abbauen erneut zum Bauen.',
  hintPlain: 'Schlichte Gleise schließen nur ans Stück davor an. Vier Seiten ergeben eine Kreuzung.',
  hintDepot: 'Dorf antippen für ein Depot ({cost} M): Waren warten halb so schnell, laden sofort.',
  hintWashout: 'Eine Flut kommt: lege einen Umweg oder baue die Gleise danach neu.',
  hintRockfall: 'Ein Steinschlag kommt: lege einen Umweg oder baue die Gleise danach neu.',
  hintCourier: 'Ein Dorf schmollt: antippen schickt einen freien Lindwurm mit Geschenken ({cost} M).',
  hintSwitch: 'Weiche antippen stellt sie um: der Lindwurm fährt, wohin die Weichen ihn schicken.',
  hintBuild: 'Tippen oder ziehen legt Gleise: Wiese 2, Wald 4, Brücke 6, Tunnel 20. Dann Auftrag antippen.',

  // Charter pick, game over and the won festival
  pickCharter: 'Runde {round}: wähle den Freibrief der Runde',
  gameOver: 'Das letzte Herz der Strecke ist fort.\nDie Dörfer haben den Glauben an den Lindwurm verloren.\n\nRunde {round} erreicht, {n} geliefert',
  festivalWon: 'Das Fest in {village} ist ein Triumph!\n{n} geliefert, {hearts} von 3 Herzen übrig',
  medalLine: '{medal}medaille: Fest in {time}',
  bestLine: 'Beste auf {level}: {best}',
  nextGame: 'Nächstes Spiel: {boons}',
};

/** Texts that are the same in German. */
export const keepEnglish: (keyof typeof en)[] = ['bronze', 'gold', 'depotPop', 'roundCharter'];

export default de;
