import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import { VIEW } from './game/rules';
import { setupGame } from '../../../shared/setupGame';
import { howToPlay } from './howToPlay';
import { setupScaling } from '../../../shared/scaling';

// A portrait battlefield, like a phone held upright; wider screens show it centred.
const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: VIEW.w,
  height: VIEW.h,
  backgroundColor: '#14110f',
  pixelArt: false,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, GameScene],
});
setupGame(game, { howToPlay });
setupScaling(game);

// Handy for poking at state from the browser console during development.
if (import.meta.env.DEV) Object.assign(window, { game });
