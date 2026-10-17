import type { HowToPlay } from '../../../shared/howToPlay';

export const howToPlay: HowToPlay = {
  goal: 'Lead one of five factions, build a fleet and destroy all four rival hubs. If your own hub falls, you lose.',
  controls: [
    { input: 'Tap a faction card', action: 'Pick the faction you command before the battle' },
    { input: 'Tap a ship, or drag a box over ships', action: 'Select your combat ships' },
    { input: 'Tap empty space or an enemy', action: 'Move the selected ships there, or attack that target' },
    { input: 'Build button, then tap the map', action: 'Place a building near one of your hubs' },
    { input: 'Train and research buttons', action: 'Queue ships at your Barracks or hub, or research upgrades' },
    { input: 'Fall back button', action: 'Send the selected ships home to repair' },
    { input: 'Rivals on the top bar, or T', action: 'Open the rivals panel to accept truces or pay tribute' },
    { input: 'Arrow keys / WASD, H', action: 'Scroll the map; H centres it on your hub' },
  ],
  loop: [
    'Your harvesters mine crystal on their own and carry it back to your hub.',
    'Spend crystal on a Barracks to finish the first contract.',
    'Train warships at your Barracks and select them as a wing.',
    'Send scouts into the fog to find the relay beacon and hold it for crystal.',
    'Destroy enemy ships for salvage, then push into the rival bases.',
  ],
  tips: [
    'Five contracts come in turn, each paying crystal and a rank perk for the rest of the battle.',
    'A warship alone on the relay beacon takes it, and the owner earns 3 crystal a second while one stays there.',
    'Every enemy ship you destroy drops a gold shard worth 8 crystal.',
    'Ships inside a nebula fly slower but stay hidden until they fire or an enemy comes close.',
    'A ship with 3 kills becomes a Veteran and with 8 an Ace, hitting harder each time.',
    'Ships repair slowly beside a hub, outpost or Depot.',
    'Rivals hold off for about a minute and a quarter, then attack whoever last hit them.',
  ],
};
