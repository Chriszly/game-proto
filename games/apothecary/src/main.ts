import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import { setupGame } from '../../../shared/setupGame';
import { setupScaling } from '../../../shared/scaling';

export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 540;

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#f2e8d0',
  pixelArt: false,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    // Step physics once per drawn frame with its real delta, so walking is as smooth as the chosen
    // frame rate rather than stepping at a fixed 60Hz.
    arcade: { debug: false, fixedStep: false },
  },
  scene: [BootScene, GameScene],
});
setupGame(game);
setupScaling(game);

// Handy for poking at state from the browser console during development.
if (import.meta.env.DEV) Object.assign(window, { game });
