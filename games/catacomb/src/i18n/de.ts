import type { Translation } from '../../../../shared/i18n';
import type en from './en';

/** Catacomb's texts in German. */
const de: Translation<typeof en> = {
  // Cards: names
  strikeCard: 'Schlag',
  defendCard: 'Abwehr',
  bashCard: 'Wuchthieb',
  cleaveCard: 'Spalten',
  twinStrikeCard: 'Doppelschlag',
  ironWallCard: 'Eisenwall',
  scoutCard: 'Erkunden',
  shieldBashCard: 'Schildstoß',
  heavyBlowCard: 'Schwerer Hieb',
  bandageCard: 'Verband',
  secondWindCard: 'Zweiter Atem',
  hamstringCard: 'Sehnenhieb',
  sunderCard: 'Brecher',
  poisonDartCard: 'Giftpfeil',
  whirlwindCard: 'Wirbelwind',
  fireballCard: 'Feuerball',
  vampBiteCard: 'Blutegel',
  fortressCard: 'Festung',
  toxicCloudCard: 'Giftwolke',
  warCryCard: 'Kriegsschrei',
  venomKnifeCard: 'Giftmesser',
  dodgeCard: 'Ausweichen',
  bulwarkCard: 'Bollwerk',
  thornsCard: 'Dornen',
  battleRageCard: 'Kampfrausch',
  venomVeilCard: 'Giftschleier',
  rustCard: 'Rost',
  woundCard: 'Wunde',
  doubtCard: 'Zweifel',

  // Cards: rules, built from these parts
  deal: '{damage} Schaden.',
  dealHits: '{damage} Schaden x{hits}.',
  dealAll: '{damage} Schaden an alle Feinde.',
  dealHitsAll: '{damage} Schaden x{hits} an alle Feinde.',
  apply: 'Verleiht {statuses}.',
  applyAll: 'Allen Feinden {statuses}.',
  and: '{a} und {b}',
  gainBlock: 'Erhalte {n} Block.',
  heal: 'Heile {n}.',
  gainEnergy: 'Erhalte {n} Energie.',
  draw: { one: 'Ziehe {n} Karte.', other: 'Ziehe {n} Karten.' },
  powerLead: 'Kraft.',
  bulwarkPower: 'Zu Beginn jedes Zuges {n} Block.',
  thornsPower: 'Wer dich trifft, erleidet {n} Schaden.',
  ragePower: 'Zu Beginn jedes Zuges {n} Stärke.',
  splashPower: 'Gift springt halb auf die anderen Feinde über.',
  curseLead: 'Fluch. Unspielbar.',
  rustCurse: 'Verstopft nur deine Hand.',
  woundCurse: 'Verliere {n} Leben beim Ziehen.',
  doubtCurse: 'Erste Karte je Zug kostet {n} mehr.',

  // Statuses
  weak: 'Schwäche',
  vulnerable: 'Verwundbar',
  poison: 'Gift',

  // Foes
  slimeFoe: 'Schleim',
  ratFoe: 'Riesenratte',
  skeletonFoe: 'Skelett',
  cultistFoe: 'Kultist',
  graveKnightFoe: 'Grabritter',
  bogWitchFoe: 'Moorhexe',
  boneKingFoe: 'Knochenkönig',
  ghoulFoe: 'Ghul',
  wraithFoe: 'Gespenst',
  spiderFoe: 'Grabspinne',
  mummyFoe: 'Mumie',
  gargoyleFoe: 'Wasserspeier',
  hollowQueenFoe: 'Hohle Königin',

  // Acts
  cryptAct: 'Die Gruft',
  tombsAct: 'Die versunkenen Gräber',

  // Heroes
  knightName: 'Ritter',
  knightText: 'Schwert und Schild, {hp} Leben',
  hunterName: 'Jäger',
  hunterText: 'Giftmesser und Ausweichen, {hp} Leben',

  // Flasks
  healFlask: 'Heiltrank',
  healFlaskText: 'Heile {n}.',
  energyFlask: 'Quecksilbertrank',
  energyFlaskText: 'Erhalte {n} Energie.',
  poisonFlask: 'Gifttrank',
  poisonFlaskText: 'Allen Feinden {n} Gift.',
  blockFlask: 'Steinhauttrank',
  blockFlaskText: 'Erhalte {n} Block.',
  drawFlask: 'Weitsichttrank',
  drawFlaskText: 'Ziehe {n} Karten.',

  // Relics
  oakWardName: 'Eichenschutz',
  oakWardText: 'Beginne jeden Zug mit {n} Block.',
  whetstoneName: 'Wetzstein',
  whetstoneText: 'Deine Angriffe verursachen {n} Schaden mehr pro Treffer.',
  emberLanternName: 'Glutlaterne',
  emberLanternText: 'Im ersten Zug jedes Kampfes {n} Energie mehr.',
  mendingMossName: 'Heilmoos',
  mendingMossText: 'Heile {n} nach jedem gewonnenen Kampf.',
  goldenIdolName: 'Goldener Götze',
  goldenIdolText: 'Kämpfe bringen anderthalbmal so viel Gold.',
  boneCharmName: 'Knochenamulett',
  boneCharmText: 'Jeder Feind beginnt jeden Kampf mit {n} Verwundbar.',
  venomGlandName: 'Giftdrüse',
  venomGlandText: 'Dein Gift ist um {n} stärker.',

  // Mystery rooms
  altarTitle: 'Ein blutbefleckter Altar',
  altarText: 'Alte Runen versprechen dem ein Geschenk, der den Stein nährt.',
  altarBleed: 'Bluten (-{n} Leben, eine seltene Karte)',
  altarWalk: 'Weitergehen',
  shrineTitle: 'Ein vergessener Schrein',
  shrineText: 'Ein rissiger Götze wacht über eine Schale voller Münzen.',
  shrinePray: 'Beten (2 zufällige Karten härten)',
  shrineLoot: 'Plündern (+{n} Gold, ein Zweifel-Fluch)',
  chestTitle: 'Eine angekettete Truhe',
  chestText: 'Kälte dringt aus dem Schloss. Drinnen klappert etwas Wertvolles.',
  chestOpen: 'Öffnen (ein Relikt, ein Rost-Fluch)',
  chestLeave: 'Stehen lassen',
  poolTitle: 'Ein stiller schwarzer Teich',
  poolText: 'Das Wasser ist kalt und seltsam klar.',
  poolDrink: 'Trinken (heile {n})',
  poolBathe: 'Baden (-{n} Leben, eine Karte härten)',

  // Depths
  depthFoes: 'Feinde +20 % Leben',
  depthRest: 'Lagerfeuer heilen nur 15 %',
  depthWound: 'Das Deck beginnt mit einer Wunde',
  depthMore: 'Feinde wieder +20 % Leben, je Tiefe mehr',
  depthNone: 'Das Verlies wie gewohnt',

  // Floating numbers
  strengthPop: '+{n} Stärke',
  blocked: 'Geblockt',
  cursedPop: 'Verflucht: {name}',

  // Notices on the map
  boneRelic: 'Zwischen den Knochen liegt: {name}. {text}',
  boneGold: 'Zwischen den Knochen liegen {n} Gold mehr.',
  boneFlask: '{notice} Dazu: {name}.',
  catchBreath: '{act}: Du kommst zu Atem (+{n} Leben)',
  temperedInto: '{from} gehärtet zu {to}',
  idolTempers: 'Der Götze härtet {names}',
  idolSilent: 'Der Götze schweigt',
  idolLoot: '+{n} Gold, und der Fluch {curse} des Götzen kommt in dein Deck',
  foundRelic: 'Gefunden: {name}. {text}',
  foundGold: '{n} Gold gefunden.',
  chestCurse: '{found} Der Fluch {curse} kommt in dein Deck.',
  healed: '{n} geheilt',
  waterTempers: 'Das Wasser härtet {name}',
  nothingHappens: 'Nichts geschieht',

  // The map
  enterHint: 'Tippe einen Raum an, um einzutreten',
  goOnHint: 'Tippe einen leuchtenden Raum an',

  // The fight
  endTurn: 'Zug beenden',
  drawPile: 'Nachziehstapel {n}',
  discardPile: 'Ablagestapel {n}',
  foesTurn: 'Zug der Feinde',
  victory: 'Sieg!',
  yourTurn: 'Dein Zug',
  drinkTip: '{name}: {text} Antippen zum Trinken, ohne Energie.',
  powerTip: '{name} (im Spiel): {text}',

  // Rewards
  skip: 'Überspringen',
  goldWon: '+{n} Gold. ',
  goldAndFlask: '+{n} Gold und {flask}. ',
  treasureReward: 'Ein Schatz! Nimm eine seltene Karte',
  altarReward: 'Der Altar trinkt. Nimm eine seltene Karte',
  eliteReward: 'Elite besiegt! {gold}Nimm eine seltene Karte',
  cardReward: '{gold}Wähle eine Karte für dein Deck',

  // The merchant
  merchant: 'Der Händler',
  leave: 'Gehen',
  sold: 'Verkauft',
  removeTitle: 'Karte entfernen',
  removeText: 'Nimm eine Karte für immer aus deinem Deck.',
  flaskSlots: 'Tränke: {n} von {slots} Plätzen belegt',

  // Panels
  continue: 'Weiter',
  temperButton: 'Karte härten',
  removeButton: 'Karte entfernen',
  chooseHero: 'Wähle deinen Helden',
  depth: 'Tiefe {n}',
  openDepths: 'Besiege die Hohle Königin, um die Tiefen darunter zu öffnen.',
  campfire: 'Ein stilles Lagerfeuer',
  campfireText: 'Ruhe am Feuer und heile {heal}, härte eine Karte, um sie zu verbessern, oder verbrenne eine, die du nicht mehr willst.\nLeben {hp} von {max}, Deck mit {deck} Karten.',
  restButton: 'Ruhen (+{n})',
  boneKingFalls: 'Der Knochenkönig fällt!',
  stairDown: '{notice}\nEine Treppe windet sich hinab ins Dunkel.',
  descend: 'Hinabsteigen',
  hollowQueenFalls: 'Die Hohle Königin fällt!',
  fallen: 'Du bist gefallen',
  atDepth: ' in Tiefe {n}',
  wonText: 'Du hast das Verlies{deep} mit {hp} Leben, {gold} Gold und einem Deck aus {deck} Karten bezwungen.\nTiefe {next} ist offen: {rules}',
  fellText: '{act}{deep}, Raum {room} von {rooms}, mit einem Deck aus {deck} Karten.',
  delveAgain: 'Erneut hinab',

  // The card picker
  burnPick: 'Karte verbrennen: Sie verlässt dein Deck für immer',
  temperPick: 'Karte härten: Sie wird für immer besser',
  sellPick: 'Der Händler nimmt dir eine Karte ab',
  back: 'Zurück',

  // The top bar
  deck: 'Deck {n}',
  campfireRoom: 'Lagerfeuer',
  treasureRoom: 'Schatz',
  merchantRoom: 'Händler',
  mysteryRoom: 'Rätsel',
  entrance: 'Eingang',
  roomOf: 'Raum {n} von {rooms}',
};

/** Texts that are the same in German. */
export const keepEnglish = ['deck'];

export default de;
