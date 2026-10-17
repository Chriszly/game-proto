/**
 * Wyrmrail's texts in British English, the source `de.ts` and `en-US.ts` translate (see
 * `shared/i18n.ts`). The tables in `game/` name their texts by these keys. Village names are
 * names, not texts: they stay the same in every language.
 */
const en = {
  // Cargo: the name on an order card, and the same word inside a sentence
  grain: 'Grain',
  grainLower: 'grain',
  tools: 'Tools',
  toolsLower: 'tools',
  timber: 'Timber',
  timberLower: 'timber',
  ore: 'Ore',
  oreLower: 'ore',
  fish: 'Fish',
  fishLower: 'fish',
  flour: 'Flour',
  flourLower: 'flour',
  planks: 'Planks',
  planksLower: 'planks',
  iron: 'Iron',
  ironLower: 'iron',
  passengers: 'Passengers',
  passengersLower: 'passengers',

  // Charters: name and card text
  fairName: 'Fair',
  fairText: '{cargo} pays double, every deadline a quarter shorter',
  rushName: 'Rush orders',
  rushText: 'Every order pays half again, deadlines a third shorter',
  patientName: 'Patient villages',
  patientText: 'Deadlines half as long again, pay a quarter less',
  railsName: 'Cheap rails',
  railsText: 'Track costs half, every order pays a fifth less',
  busyName: 'Busy season',
  busyText: 'Orders come in twice as often, pay a tenth less',
  feastName: 'Feast',
  feastText: 'The wyrms never go hungry, every order pays a tenth less',

  // Festival medals and the boons they bring the next game
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
  headStart: 'Head start',
  swiftStart: 'Swift start',
  earlyRiser: 'Early riser',

  // Banners
  startBanner: 'Lay track from the Roost to Millbrook and Ashford',
  medalBoons: 'Medal boons: {boons}',
  secondWyrmWakes: 'A second wyrm wakes in the Roost',
  charterBanner: 'Charter: {name}',
  washoutWarning: 'The river is rising: a bridge is about to wash out!',
  rockfallWarning: 'Stones are loosening: a rockfall is coming down on the track!',
  festivalBanner: 'Festival at {village}: bring it {n} loads!',
  roundJoins: 'Round {round}: {village} joins the line',
  roundBanner: 'Round {round}',

  // Floating texts over the valley
  depotPop: 'Depot -{n}',
  giftsCost: 'Gifts -{n}',
  losesFaith: '{village} loses faith!',
  feelsForgotten: '{village} feels forgotten',
  washedOut: 'Washed out!',
  rockfall: 'Rockfall!',
  switchPop: 'Switch!',
  munch: 'Munch!',
  gifts: 'Gifts!',
  late: '{cargo} late!',

  // The valley and the panel
  roost: 'Roost',
  orders: 'Orders',
  upgrades: 'Upgrades',
  remove: 'Remove',
  removing: 'Removing',
  plain: 'Plain',
  plainOn: 'Plain on',
  playAgain: 'Play again',
  coins: '{n}c',
  wingsMax: 'Swift wings: max',
  wingsCost: 'Swift wings {level}: {cost}c',
  hoardMax: 'Golden hoard: max',
  hoardCost: 'Golden hoard {level}: {cost}c',
  secondAwake: 'Second wyrm: awake',
  secondRound: 'Second wyrm: round {round}',
  secondCost: 'Second wyrm: {cost}c',
  tapVillage: 'Tap a village',
  depotRound: 'Depot: round {round}',
  depotCost: 'Depot {n}: {cost}c',

  // Order cards
  tapToSend: 'Tap to send',
  queued: 'Queued',
  loading: 'Loading...',
  onTheWay: 'On the way',
  noTrack: 'No track yet',
  route: '{from} > {to}',
  rushOrder: 'rush order',
  morePay: '+{n}% pay',

  // The HUD: the round and what each wyrm is doing
  festivalProgress: 'Festival: {n}/{goal} delivered',
  roundProgress: 'Round {round}: {n}/{goal} delivered',
  roundCharter: '{progress}\n{charter}',
  wyrm: 'Wyrm: {status}',
  wyrmN: 'Wyrm {n}: {status}',
  throwingSwitch: 'throwing a switch',
  waitingJunction: 'waiting at a junction',
  eating: 'eating at the Roost',
  hungry: 'hungry, off to the Roost',
  bringingGifts: 'bringing gifts to {village}',
  settingOff: 'setting off',
  resting: 'resting',
  hauling: 'hauling {cargo} to {village}',
  loadingCargo: 'loading {cargo}',
  offTo: 'off to {village}',

  // The hint line under the valley
  hintRemove: 'Tap track to take it up for half its cost. Tap Remove again to lay track.',
  hintPlain: 'Plain track joins only the piece it continues. Track on all four sides makes a crossing.',
  hintDepot: 'Tap a village for a depot ({cost}c): its goods wait at half speed and load at once.',
  hintWashout: 'A washout is coming: lay a way round it, or rebuild the track after.',
  hintRockfall: 'A rockfall is coming: lay a way round it, or rebuild the track after.',
  hintCourier: 'A village is sulking: tap it to send a free wyrm with gifts ({cost}c).',
  hintSwitch: 'Tap a junction to set its switch: the wyrm goes the way the switches send it.',
  hintBuild: 'Tap or drag to lay track: grass 2, forest 4, bridge 6, tunnel 20. Then tap an order.',

  // Charter pick, game over and the won festival
  pickCharter: "Round {round}: pick the round's charter",
  gameOver: "The line's last heart is gone.\nThe villages lost faith in the wyrm.\n\nReached round {round}, {n} delivered",
  festivalWon: 'The festival at {village} is a triumph!\n{n} delivered, {hearts} of 3 hearts left',
  medalLine: '{medal} medal: festival in {time}',
  bestLine: 'Best on {level}: {best}',
  nextGame: 'Next game: {boons}',
};

export default en;
