import type { Translation } from '../../../../shared/i18n';
import type en from './en';

/** Bearclaw Saga's texts in German. */
const de: Translation<typeof en> = {
  // Kapitel
  huntTitle: 'Die Jagd',
  huntGoal: 'Jage im Wald nahe dem Dorf',
  raidTitle: 'Der Überfall',
  raidGoal: 'Verteidige das Dorf',
  wakeTitle: 'Erwachen',
  wakeGoal: 'Finde heraus, was passiert ist',
  trailTitle: 'Spurensuche',
  trailGoal: 'Folge den Spuren (E: genauer ansehen)',
  forestTitle: 'Das Waldgebiet',
  forestGoal: 'Folge dem Kult durch den Wald',
  bossTitle: 'Ulfgar, der Wolf-Oberste',
  bossGoal: 'Besiege Ulfgar',
  endTitle: 'Die Reiter des Jarls',
  endGoal: 'Hör die Schildmaid an',

  // Sprecher
  bjarnName: 'Bjarn',
  fatherName: 'Vater',
  skarnName: 'Skarn',
  ratatoskrName: 'Ratatoskr',
  torvaldName: 'Torvald',
  ulfgarName: 'Ulfgar',
  sigrunName: 'Sigrun',

  // Die Jagd
  hunt1: 'Frischer Schnee. Vater will einen Keiler für das Fest heute Abend.',
  hunt2: 'Die Spuren führen nach Osten, zwischen die Tannen.',
  hunt3: 'Rauch über dem Dorf ... das ist kein Herdfeuer!',

  // Der Überfall
  raid1: 'Bjarn! Der Kult ist hier. Steh mir bei!',
  raid2: 'Da kommen noch mehr. Rücken an Rücken!',
  raid3: 'Fischer und Holzfäller. Ist das alles, was der Norden noch hat?',
  raid4: 'Verschwinde aus meinem Dorf!',
  raid5: 'Mutig. Und dumm.',
  raid6: 'VATER!',
  raid7: 'Brennt alles nieder. Lasst niemanden übrig, der uns gesehen hat.',

  // Erwachen
  wake1: 'Oh! Es atmet. Gut, gut. Ich wollte mir gerade deine Stiefel nehmen.',
  wake2: 'Wo ... wo bin ich? Warum bin ich voller Blut? Es ist nicht meins.',
  wake3: 'Ratatoskr, Bote des Weltenbaums, zu Diensten. Ich trage Neuigkeiten den Stamm hinauf und hinunter.',
  wake4: 'Und die Neuigkeit ist: Irgendetwas hat die Angreifer letzte Nacht in Stücke gerissen.',
  wake5: 'Folge den Spuren. Ich komme mit. Niemand tratscht besser als ich.',

  // Spurensuche
  clueTorn1: 'Angreifer. Oder was von ihnen übrig ist. Krallenspuren, so breit wie meine Hand ... breiter.',
  clueTorn2: 'Im Dorf heißt es, ein Geisterbär sei aus den Hügeln gekommen.',
  cluePaws1: 'Tatzenspuren. Riesig. Und hier ... die nackten Fußspuren eines Mannes, genau da, wo die Tatzen enden.',
  cluePaws2: 'Komisch. Die Füße sehen ungefähr nach deiner Größe aus.',
  clueHut1: 'Die alte Köhlerhütte. Von innen aufgerissen.',
  clueHut2: 'Ich erinnere mich an ein Brüllen. Und dann an nichts.',
  torvald1: 'Ruhig, Junge. Du siehst aus, als wärst du aus einem Grab gekrochen. Bjarn? Der Sohn deiner Mutter?',
  torvald2: 'Ich kannte sie ein wenig. Sie hatte denselben Blick, wenn die Wölfe heulten.',
  torvald3: 'Was immer du letzte Nacht gesehen hast, du musst auf den Beinen bleiben. Ich zeig dir etwas.',
  torvald4: 'Heb die Deckung genau dann, wenn der Schlag trifft, nicht vorher. Das ist eine Parade. Zeig es mir zweimal.',
  torvald5: 'Gut. Nimm diese Kräuter und lern, sie richtig zu kochen. Sie heilen mehr, als du denkst.',
  torvald6: 'Der Kult ist nach Westen gezogen, in den Wald. Dort herrscht ihr Wolf-Oberster Ulfgar.',

  // Das Waldgebiet
  forest1: 'Neues aus dem Dorf: Sie halten dich für tot. Manche sagen, der Bär hat dich geholt.',
  forest2: 'Die Reiter des Jarls fragen nach einem Riesenbären. Haakon selbst, heißt es.',
  forest3: 'Wolfsspuren, und Kultstiefel daneben. Die Lichtung ist nah.',

  // Ulfgar
  boss1: 'Du bist also der, der meine Brüder im Dorf zerfleischt hat. Ein Holzfällerwelpe?',
  boss2: 'Skarn wird dein Fell wollen. Ich bringe es ihm selbst.',
  boss3: 'Genug! Sieh, was der Kult aus mir gemacht hat!',
  boss4: 'Das sind viele Zähne! Zu schnell für einen Bären, zu stark für einen Menschen ... was liegt dazwischen?',
  boss5: 'Die Bestie ... ich spüre sie. Diesmal rufe ich sie.',
  boss6: 'Kein ... Ritual ... es liegt dir im Blut ... Skarn hatte recht ...',

  // Ende der Version
  end1: 'Halt! Im Namen von Jarl Haakon.',
  end2: 'Ulfgar, tot? Wir jagen ihn seit einem Jahr.',
  end3: 'Ich bin Sigrun, Schildmaid des Jarls. Haakon braucht Männer, die so etwas können. Reitest du mit uns gegen den Kult?',
  end4: 'Skarn hat meinen Vater getötet. Wo er ist, da gehe ich hin.',
  endCardTitle: 'Ende der ersten spielbaren Version',
  endCardText: 'Akt 1 geht mit den Kriegern von Jarl Haakon weiter.',
  playAgain: 'Neu beginnen',

  // Hinweise
  hintMove: 'A / D oder Pfeiltasten: gehen',
  hintAttack: 'J: zuschlagen',
  hintDefend: 'K halten: blocken. Kurz vor dem Treffer blocken ist eine Parade. L oder Umschalt: ausweichen.',
  hintRage: 'Treffer füllen deine Wut. Läuft sie über, bricht die Bestie hervor.',
  hintGrief: 'Die Wut steigt. Du kannst sie nicht zurückhalten.',
  hintTrail: 'E: Spuren genauer ansehen',
  hintDrill: 'Pariere Torvalds Stock: kurz vor dem Treffer blocken ({n} von 2)',
  hintShift: 'Q: den Hybriden rufen und zurück. Rote Angriffe lassen sich nicht blocken: ausweichen!',
  hintHerbs: 'Geh über Kräuter, um zu heilen. Der Bär heilt sich stattdessen durch schwere Hiebe.',
  toastRecipes: 'Torvalds Rezepte: Kräuter heilen mehr',
  toastWolfTrail: 'Versiegelter Skill freigeschaltet: Wolfsfährte',
  toastShift: 'Du kannst den Hybriden jetzt bewusst rufen',
  parry: 'Parade!',
  tooEarly: 'Zu früh',
  guardBroken: 'Deckung gebrochen',
  fallen: 'Du bist gefallen',
  tryAgain: 'Nochmal',
  look: 'E: ansehen',

  // HUD
  health: 'Leben',
  stamina: 'Ausdauer',
  rage: 'Wut',
  human: 'Mensch',
  hybrid: 'Hybrid',
  bear: 'Bär',
  outburst: 'Ausbruch',
  exhausted: 'Erschöpft',
  btnStrike: 'Schlag',
  btnBlock: 'Block',
  btnDodge: 'Rolle',
  btnShift: 'Wandel',
  btnUse: 'Nutzen',
};

/** Names, and words that are the same in German. */
export const keepEnglish: (keyof typeof en)[] = ['bjarnName', 'skarnName', 'ratatoskrName', 'torvaldName', 'ulfgarName', 'sigrunName', 'hybrid', 'btnBlock'];

export default de;
