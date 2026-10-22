/**
 * Bearclaw Saga's texts in British English, the source `de.ts` and `en-US.ts` translate (see
 * `shared/i18n.ts`). The story (`game/story.ts`), the scene and the HUD ask for them by these keys.
 */
const en = {
  // Chapters: the banner when one starts, and the objective line top right
  huntTitle: 'The Hunt',
  huntGoal: 'Hunt in the woods near the village',
  raidTitle: 'The Raid',
  raidGoal: 'Defend the village',
  wakeTitle: 'Awakening',
  wakeGoal: 'Find out what happened',
  trailTitle: 'The Trail',
  trailGoal: 'Follow the tracks (E: look closer)',
  forestTitle: 'The Forest',
  forestGoal: 'Follow the cult through the forest',
  bossTitle: 'Ulfgar, the Wolf Chief',
  bossGoal: 'Defeat Ulfgar',
  endTitle: 'Riders of the Jarl',
  endGoal: 'Hear out the shield-maiden',

  // Speakers
  bjarnName: 'Bjarn',
  fatherName: 'Father',
  skarnName: 'Skarn',
  ratatoskrName: 'Ratatoskr',
  torvaldName: 'Torvald',
  ulfgarName: 'Ulfgar',
  sigrunName: 'Sigrun',

  // The hunt
  hunt1: 'The snow is fresh. Father wants a boar for the feast tonight.',
  hunt2: 'The tracks lead east, into the firs.',
  hunt3: 'Smoke over the village... that is no hearth fire!',

  // The raid
  raid1: 'Bjarn! The cult is here. Stand with me!',
  raid2: 'There are more of them. Keep your back to mine!',
  raid3: 'Fishermen and woodcutters. Is this all the north has left?',
  raid4: 'Get out of my village!',
  raid5: 'Brave. And foolish.',
  raid6: 'FATHER!',
  raid7: 'Burn it all. Leave no one who saw us.',

  // Waking up
  wake1: 'Oh! It is breathing. Good, good. I was about to claim your boots.',
  wake2: 'Where... where am I? Why am I covered in blood? It isn’t mine.',
  wake3: 'Ratatoskr, messenger of the World Tree, at your service. I carry news up and down the trunk.',
  wake4: 'And the news is: something tore the raiders to pieces last night.',
  wake5: 'Follow the tracks. I’ll come along. Nobody tells better gossip than me.',

  // The trail
  clueTorn1: 'Raiders. Or what is left of them. Claw marks as wide as my hand... wider.',
  clueTorn2: 'The village says a ghost bear came down from the hills.',
  cluePaws1: 'Paw prints. Huge. And here... a man’s bare footprints, right where the paw prints end.',
  cluePaws2: 'Funny. Those feet look about your size.',
  clueHut1: 'The old charcoal hut. Torn open from the inside.',
  clueHut2: 'I remember a roar. And then nothing.',
  torvald1: 'Easy, lad. You look like you crawled out of a grave. Bjarn? Your mother’s boy?',
  torvald2: 'I knew her, a little. She had the same look in her eyes when the wolves howled.',
  torvald3: 'Whatever you saw last night, you’ll need to stay on your feet. Let me show you something.',
  torvald4: 'Raise your guard just as the blow lands, not before. That’s a parry. Show me twice.',
  torvald5: 'Good. Take these herbs, and learn to boil them right. They mend more than you’d think.',
  torvald6: 'The cult went west, into the forest. Their wolf chief Ulfgar rules there.',

  // The forest
  forest1: 'News from the village: they think you’re dead. Some say the bear took you.',
  forest2: 'The Jarl’s riders are asking about a giant bear. Haakon himself, they say.',
  forest3: 'Wolf tracks, and cult boots beside them. The clearing is close.',

  // Ulfgar
  boss1: 'So you’re the one who butchered my brothers in the village. A woodcutter’s whelp?',
  boss2: 'Skarn will want your hide. I’ll bring it to him myself.',
  boss3: 'Enough! See what the cult made of me!',
  boss4: 'That is a lot of teeth! Too fast for a bear, too strong for a man... what lies in between?',
  boss5: 'The beast... I can feel it. This time I call it.',
  boss6: 'Not... a ritual... it is in your blood... Skarn was right...',

  // The end of the version
  end1: 'Stand down! By order of Jarl Haakon.',
  end2: 'Ulfgar, dead? We have hunted him for a year.',
  end3: 'I am Sigrun, shield-maiden of the Jarl. Haakon needs men who can do this. Will you ride with us against the cult?',
  end4: 'Skarn killed my father. Wherever he is, that is where I am going.',
  endCardTitle: 'End of the first playable version',
  endCardText: 'Act 1 goes on with Jarl Haakon’s warriors.',
  playAgain: 'Play again',

  // Hints and toasts
  hintMove: 'A / D or arrows: walk',
  hintAttack: 'J: strike',
  hintDefend: 'K held: block. Block just before a hit lands to parry. L or Shift: dodge roll.',
  hintRage: 'Hits fill your rage. When it overflows, the beast breaks out.',
  hintGrief: 'Rage is rising. You cannot hold it back.',
  hintTrail: 'E: look closer at the tracks',
  hintDrill: 'Parry Torvald’s stick: block just before it lands ({n} of 2)',
  hintShift: 'Q: call the hybrid, and back. Red attacks cannot be blocked: dodge them.',
  hintHerbs: 'Walk over herbs to heal. The bear heals by its heavy blows instead.',
  toastRecipes: 'Torvald’s recipes: herbs heal more',
  toastWolfTrail: 'Sealed skill unlocked: Wolf’s Trail',
  toastShift: 'You can call the hybrid at will',
  parry: 'Parry!',
  tooEarly: 'Too early',
  guardBroken: 'Guard broken',
  fallen: 'You fell',
  tryAgain: 'Try again',
  look: 'E: look',

  // HUD
  health: 'Health',
  stamina: 'Stamina',
  rage: 'Rage',
  human: 'Human',
  hybrid: 'Hybrid',
  bear: 'Bear',
  outburst: 'Outburst',
  exhausted: 'Exhausted',
  btnStrike: 'Strike',
  btnBlock: 'Block',
  btnDodge: 'Dodge',
  btnShift: 'Shift',
  btnUse: 'Use',
};

export default en;
