import type { HowToPlay } from '../../../shared/howToPlay';

export const howToPlay: HowToPlay = {
  goal: "Sink wave after wave of enemy ships, and the admiral's flagship at wave 20 to win. The run ends when your hull is sunk.",
  controls: [
    { input: 'Hold the Port wheel, or Left arrow / A', action: 'Turn to the left (the ship always sails on)' },
    { input: 'Hold the Starboard wheel, or Right arrow / D', action: 'Turn to the right' },
    { input: 'Hold Port guns or Q, then let go', action: 'Aim and charge the port broadside, then fire it' },
    { input: 'Hold Starboard guns or E, then let go', action: 'Aim and charge the starboard broadside, then fire it' },
    { input: 'Tap Scuttle the prize', action: 'Sink your newest prize at once for twice her loot' },
    {
      input: 'Tap a card or a row at the harbor',
      action: 'Keep a perk, buy an upgrade, patch the hull, hire sailors or keep a prize as a consort',
    },
    { input: 'Tap Port or Starboard under the ledger', action: "Load that side's guns with the next kind of shot" },
    { input: 'Tap Set sail, or from wave 6 a course', action: 'Leave the harbor for the next wave: the Merchant lane or a Hunter patrol' },
  ],
  loop: [
    "Read the captain's order and the wind for the wave, then steer to close on an enemy.",
    "Turn side-on, hold that side's fire control to charge, and let go when the arc reaches the foe.",
    'Sail over the barrels of plunder that sunk ships leave behind, or board a crippled ship as a prize.',
    'Sink every ship of the wave and the ship puts into harbor.',
    'Keep one of three perks, spend your gold on upgrades and repairs, load your shot and set sail.',
  ],
  tips: [
    'A longer hold fires further and harder: a full one-second charge reaches the full range and hits 50% harder.',
    'Each side reloads on its own, so swing round and fire the other side while one reloads.',
    'Chain shot slows a ship, and grapeshot fires a fan that slows its reload and kills its crew.',
    'Sail alongside a ship under a fifth of its hull for a moment to take her as a prize that fights for you.',
    "Running onto an island's sand costs you 8 hull, but islands also make cover to fight round.",
    'The sea has no edge: sail off one side and you come back in on the other.',
    'Keep a prize as a consort at the harbor and she sails on with you from wave to wave, for a wage.',
    'On a convoy wave, see the merchantman safe to her island for her cargo: the sloops and fireships hunt her.',
    'Medals from each run buy a head start for the next one on the "Sunk!" panel.',
  ],
};
