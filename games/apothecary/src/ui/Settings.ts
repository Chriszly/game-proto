import Phaser from 'phaser';
import { INK, SERIF, fit } from '../art/paint';
import { cardTexture } from '../art/ui';
import { settings } from '../../../../shared/settings';

const WIDTH = 360;
const TEXT = { fontFamily: SERIF, fontSize: '13px', color: INK };
const BUTTON = { ...TEXT, fontSize: '14px', fontStyle: 'bold' };

/**
 * A panel over the middle of the screen that shows the hub's settings this game runs with (they are
 * changed on the hub page) and starts a new game. The scene closes it on a tap outside the panel. Its parts are not in a container,
 * because taps on a container's children miss once the camera has scrolled.
 */
export class Settings {
  private parts: (Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Visible)[];

  constructor(scene: Phaser.Scene, depth: number, onNewGame: () => void) {
    const { width, height } = scene.scale;
    const h = 178;
    const cx = width / 2;
    const top = (height - h) / 2;
    // Taps on the panel itself keep it open.
    const bg = fit(scene.add.image(cx, top + h / 2, cardTexture(scene, 'panel', WIDTH, h)))
      .setInteractive()
      .on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, e: Phaser.Types.Input.EventData) => e.stopPropagation());
    const parts: (Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Visible)[] = [bg];
    const button = (x: number, y: number, label: string, onTap: () => void) => {
      parts.push(fit(scene.add.image(cx + x, top + 14 + y, cardTexture(scene, 'button', 96, 26))));
      const text = scene.add
        .text(cx + x, top + 14 + y, label, BUTTON)
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, e: Phaser.Types.Input.EventData) => {
          e.stopPropagation();
          onTap();
        });
      parts.push(text);
      return text;
    };

    parts.push(scene.add.text(cx, top + 14, 'Settings', { ...TEXT, fontSize: '15px', fontStyle: 'bold', color: '#7a4a10' }).setOrigin(0.5, 0));
    const difficulty = settings.difficulty[0].toUpperCase() + settings.difficulty.slice(1);
    parts.push(scene.add.text(cx, top + 44, `Difficulty: ${difficulty}   Frame rate: ${settings.fps} FPS`, TEXT).setOrigin(0.5, 0));
    parts.push(scene.add.text(cx, top + 64, 'Change these on the hub page', { ...TEXT, fontSize: '12px', fontStyle: 'italic', color: '#6a5440' }).setOrigin(0.5, 0));
    button(0, 108, 'New game', onNewGame);
    parts.push(scene.add.text(cx, top + 146, 'Tap outside to close', { ...TEXT, fontSize: '12px', fontStyle: 'italic', color: '#6a5440' }).setOrigin(0.5, 0));

    for (const part of parts) (part as unknown as Phaser.GameObjects.Image).setScrollFactor(0).setDepth(depth).setVisible(false);
    this.parts = parts;
  }

  get visible() {
    return this.parts[0].visible;
  }

  toggle(open = !this.visible) {
    for (const part of this.parts) part.setVisible(open);
  }
}
