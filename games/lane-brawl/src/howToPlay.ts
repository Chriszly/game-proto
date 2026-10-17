import type { HowToPlay } from '../../../shared/howToPlay';

export const howToPlay: HowToPlay = {
  goal: 'Lead your team of five down the lanes and destroy the red Nexus. If your own Nexus falls first, you lose.',
  controls: [
    { input: 'Click or tap the ground', action: 'Walk there' },
    { input: 'Click or tap an enemy', action: 'Walk to it and attack it' },
    { input: 'Hold Q, W, E or R, then let go', action: 'Aim an ability while held and cast it at the cursor' },
    { input: 'Click an ability box', action: 'Cast that ability at the cursor' },
    { input: 'D, H, V, or their buttons', action: 'Dash, drink the Healing Flask, or plant a Vision Ward' },
    { input: 'T, or Recall', action: 'Channel 4 seconds, then return to your Nexus' },
    { input: 'B, or Shop (Esc closes it)', action: 'Open the shop and buy items' },
    { input: '1, 2 or 3, or click a card', action: 'Keep one of the upgrades a new level offers' },
  ],
  loop: [
    'Pick a champion card to start the match.',
    'Walk down a lane and land last hits on red minions for gold.',
    'Fight red champions and complete the objective on the card under the top bar.',
    'Level up, pick an upgrade, and recall home to shop for items.',
    'Topple the towers and an inhibitor, then destroy the red Nexus.',
  ],
  tips: [
    'Standing still makes your champion attack whatever enemy comes in reach.',
    'The minion your next hit would kill gets a gold outline, and a streak of last hits pays more.',
    'Towers shoot minions first, but hitting an enemy champion under a tower draws its fire.',
    'Jungle camps give gold and XP, and the brutes give a 60-second buff.',
    'Your R ability unlocks at level 3.',
    'Wins with a champion raise its mastery, which adds a third upgrade card to its early levels.',
    'Tall grass hides you from enemies until you attack, and the fog hides what your team cannot see.',
    'Standing inside the ring round your own Nexus heals you quickly.',
  ],
};
