import type { Translation } from '../../../../shared/i18n';
import type en from './en';

/** TinctureTinker's texts in German. */
const de: Translation<typeof en> = {
  // Ingredients: name, and a count of them in a sentence ("3 wheat kept in the pantry")
  wheatName: 'Weizen',
  wheatCount: { one: '{n} Weizen', other: '{n} Weizen' },
  mandrakeName: 'Alraune',
  mandrakeCount: { one: '{n} Alraune', other: '{n} Alraunen' },
  sageName: 'Salbei',
  sageCount: { one: '{n} Salbei', other: '{n} Salbei' },
  emberName: 'Glutsalz',
  emberCount: { one: '{n} Glutsalz', other: '{n} Glutsalz' },
  moonpetalName: 'Mondblüte',
  moonpetalCount: { one: '{n} Mondblüte', other: '{n} Mondblüten' },

  // Potions
  healingDraught: 'Heiltrank',
  sleepingTonic: 'Schlaftonikum',
  mandrakeTincture: 'Alraunentinktur',
  goldenElixir: 'Goldelixier',
  moonlitPhilter: 'Mondscheinphilter',
  amberCordial: 'Bernsteinlikör',
  starlightElixir: 'Sternenlichtelixier',
  philosophersDraught: 'Trank der Weisen',

  // Ranks
  apprentice: 'Tüftlerlehrling',
  journeyman: 'Tüftlergeselle',
  master: 'Tüftlermeister',
  grandMaster: 'Großmeister',
  royalTitle: 'Hofapotheker',

  // Workbench upgrades: name and what one level does
  handsName: 'Ruhige Hände',
  handsWhat: '+1 Zug in jedem Auftrag',
  catalystName: 'Starke Katalysatoren',
  catalystWhat: 'Katalysatoren räumen auch ihre Spalte',
  bloomName: 'Blütenstart',
  bloomWhat: 'jedes Brett beginnt mit einer Blüte',

  // Bench tools: name on the button and tip in the caption
  benchTools: 'Werkzeuge',
  stirName: 'Rühren',
  stirTip: 'Rühren: 3 Züge mehr für diesen Auftrag',
  siftName: 'Sieben',
  siftTip: 'Sieben: eine Reihe des Bretts neu würfeln',
  pestleName: 'Stößel',
  pestleTip: 'Stößel: ein Feld, ein Glas oder ein Spezialfeld zerstoßen, ohne Zug',
  funnelName: 'Trichter',
  funnelTip: 'Trichter: zwei beliebige Felder tauschen, ohne Zug',
  toolTip: '{tip} ({cost} Münzen)',

  // Captions
  captionTip: 'Vier in einer Reihe brauen einen Katalysator (räumt seine Reihe); ein L oder T eine Blüte (räumt 3x3)',
  captionBlockers: 'Ein Treffer neben einem verkorkten Glas öffnet es; Harz hält ein Feld für einen Treffer fest',
  captionMould: 'Schimmel wächst nach jedem Zug auf ein Nachbarfeld, außer ein Treffer berührt ihn und schrubbt ihn weg',
  captionRoyal: 'Ein königlicher Auftrag: drei Tränke nacheinander auf einem Brett, die Züge bleiben',
  captionTwin: 'Zwei Kunden teilen sich Brett und Züge; wer zuerst bedient wird, zahlt {coins} Münzen mehr',
  captionSift: 'Sieben: tippe eine Reihe an, um sie für {cost} Münzen neu zu würfeln, oder tippe Sieben, um es wegzulegen',
  captionPestle: 'Stößel: tippe ein Feld an, um es für {cost} Münzen zu zerstoßen, oder tippe Stößel, um ihn wegzulegen',
  captionFunnel: 'Trichter: tippe ein Feld und dann ein beliebiges anderes an, um sie für {cost} Münzen zu tauschen',
  captionFunnelTo: 'Trichter: tippe jetzt das Feld zum Tauschen an (das erste noch einmal lässt es los)',
  captionHerbs: 'Der Kräuterladen: {cost} Münzen je Zutat, bis zu {max} jeder Sorte im Vorrat',
  captionPantry: 'Der Vorrat gab {list} zum Start dazu',
  captionExam: 'Eine Gildenprüfung: jedes Mal dasselbe Brett; verkaufe mit {stars} Sternen für ein Siegel',
  captionRichMoves: 'Ein reicher Auftrag: {share} % mehr Münzen für {moves} Züge weniger',
  captionRichBlockers: 'Ein reicher Auftrag: {share} % mehr Münzen für {blockers} Gläser und Harz mehr',
  captionRichBlockersMould: 'Ein reicher Auftrag: {share} % mehr Münzen für {blockers} Gläser und Harz mehr und einen Schimmelfleck mehr',
  captionForbid: 'Ohne {kind} in diesem Auftrag: ein Tausch, der es trifft, kostet einen Zug',
  captionRush: 'Eilauftrag: {moves} Züge weniger als sonst und {coins} Münzen mehr',
  captionPickRichMoves: 'Ein reicher Auftrag zahlt {share} % mehr, für {moves} Züge weniger',
  captionPickRichBlockers: 'Ein reicher Auftrag zahlt {share} % mehr, für {blockers} Gläser und Harz mehr',
  captionPickRichBlockersMould: 'Ein reicher Auftrag zahlt {share} % mehr, für {blockers} Gläser und Harz mehr und einen Schimmelfleck mehr',
  captionExamRetry: 'Die Prüfung beginnt jedes Mal auf demselben Brett',
  and: '{a} und {b}',

  // Notes over the board
  served: '{potion} geliefert!',
  servedFast: '{potion} geliefert! +{coins} Münzen fürs Tempo beim Verkauf',
  nextStage: 'Stufe {stage}: jetzt {potion}',

  // The order label
  examTitle: 'Gildenprüfung {n}',
  crownsLast: 'Letzter Auftrag der Krone',
  royalCommission: 'Königlicher Auftrag',
  twinTitle: 'Auftrag {n}: zwei Kunden',
  orderTitle: 'Auftrag {n}',
  potionNumber: 'Nr. {n}',
  paysPass: 'Zahlt {price} Münzen beim Bestehen',
  paysRich: 'Zahlt {price} Münzen: reich',
  pays: 'Zahlt {price} Münzen',
  perMove: '+{n} pro übrigem Zug',
  examLine: 'Mit {stars} Sternen verkaufen: {moves}+ Züge übrig',
  stageLine: 'Stufe {stage} von {stages}: die Züge bleiben',
  twinLine: 'und {potion} für Kunde 2',
  rushLine: 'Eilauftrag: {moves} Züge weniger, +{coins} Münzen',
  forbidLine: 'Ohne {kind}: ein Treffer kostet einen Zug',
  needFor: '{kind} ({potion})',
  moves: 'Züge {n}',
  stars3: '3 Sterne bei {n}+ übrigen Zügen',
  stars2: '2 Sterne bei {n}+ übrigen Zügen',
  stars1: '1 Stern für jeden Verkauf',
  pantry: 'Vorrat',

  // The rank ribbon
  nextRank: 'Danach: {rank}, ein neues Rezept',
  guildSeals: 'Gildensiegel',
  allRecipes: 'Alle Rezepte frei: nun der Auftrag der Krone',

  // The result card
  outOfMoves: 'Keine Züge mehr',
  potionUnfinished: '{potion} wurde nicht fertig.',
  royalUnfinished: 'Der königliche Auftrag wurde nicht fertig.',
  twinUnfinished: 'Die beiden Aufträge wurden nicht fertig.',
  noSeal: 'Diesmal kein Siegel.',
  noStars: 'Diesmal keine Sterne.',
  tryAgain: 'Noch einmal',
  backToOrders: 'Zu den Aufträgen',
  modestOrder: 'Schlichter Auftrag',
  richOrder: 'Reicher Auftrag',
  workbench: 'Werkbank',
  herbalist: 'Kräuterladen',
  examFailed: 'Prüfung nicht bestanden',
  examFailedText: {
    one: 'Verkauft mit {n} Zug übrig: die Gilde wollte {stars} Sterne ({need}+ Züge übrig).',
    other: 'Verkauft mit {n} Zügen übrig: die Gilde wollte {stars} Sterne ({need}+ Züge übrig).',
  },
  examPassed: 'Prüfung bestanden!',
  allSeals: 'Alle Gildensiegel verdient: {seals} von {exams}',
  seal: 'Gildensiegel {seals} von {exams}',
  earned: { one: '+{price} Münzen, +{bonus} für {n} übrigen Zug', other: '+{price} Münzen, +{bonus} für {n} übrige Züge' },
  speedBonus: '+{n}, weil {potion} zuerst fertig war',
  keptInPantry: '{list} in den Vorrat gelegt',
  crownedRank: '{title}! {n} Sterne insgesamt',
  newRank: 'Jetzt {rank}! Neues Rezept: {potion}',
  moreToRank: { one: '{n} Stern: noch {more} bis {rank}', other: '{n} Sterne: noch {more} bis {rank}' },
  royalStars: '{n} Sterne insgesamt als {title}',
  everyRecipe: '{n} Sterne, und alle Rezepte frei',
  crownFilled: 'Letzter Auftrag der Krone erfüllt!',
  royalFilled: 'Königlicher Auftrag erfüllt!',
  twinFilled: 'Beide Kunden bedient!',
  sold: '{potion} verkauft!',

  // The herbalist and the workbench
  coinsToSpend: { one: '{n} Münze zum Ausgeben', other: '{n} Münzen zum Ausgeben' },
  buyFor: 'Kaufen für {cost}',
  buyHerb: 'Kauf: {cost}',
  full: 'Voll',
  nextOrder: 'gefragt',
  bought: 'Gekauft',
  back: 'Zurück',
};

export default de;

/** Texts that are the same in German, so the translation check doesn't flag them. */
export const keepEnglish: (keyof typeof en)[] = ['needFor'];
