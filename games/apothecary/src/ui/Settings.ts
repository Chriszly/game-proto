import Phaser from 'phaser';
import { INK, WOOD } from '../art/palette';
import { FRAME_RATES, frameRate, physicsRate, setFrameRate } from '../frameCap';

const WIDTH = 360;
const TEXT = { fontFamily: 'monospace', fontSize: '12px', color: '#f3e9d2' };
const BUTTON = { ...TEXT, backgroundColor: '#5c3a21', padding: { x: 6, y: 4 } };
const CHOSEN = '#8f6a24';

/**
 * A panel over the middle of the screen with the game's settings: the frame rate, and starting a
 * new game. The scene closes it on a tap outside the panel. Its parts are not in a container,
 * because taps on a container's children miss once the camera has scrolled.
 */
export class Settings {
  private parts: (Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Visible)[];
  private rates: { text: Phaser.GameObjects.Text; fps: (typeof FRAME_RATES)[number] }[] = [];

  constructor(scene: Phaser.Scene, depth: number, onNewGame: () => void) {
    const { width, height } = scene.scale;
    const h = 178;
    const cx = width / 2;
    const top = (height - h) / 2;
    // Taps on the panel itself keep it open.
    const bg = scene.add
      .rectangle(cx, top + h / 2, WIDTH, h, WOOD.dark)
      .setStrokeStyle(3, INK)
      .setInteractive()
      .on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, e: Phaser.Types.Input.EventData) => e.stopPropagation());
    const inner = scene.add.rectangle(cx, top + h / 2, WIDTH - 10, h - 10).setStrokeStyle(1, WOOD.light);
    const parts: (Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Visible)[] = [bg, inner];
    const button = (x: number, y: number, label: string, onTap: () => void) => {
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

    parts.push(scene.add.text(cx, top + 14, 'Settings', { ...TEXT, fontSize: '14px', color: '#e6c766' }).setOrigin(0.5, 0));
    parts.push(scene.add.text(cx, top + 44, 'Frame rate (FPS)', TEXT).setOrigin(0.5, 0));
    const step = (WIDTH - 60) / (FRAME_RATES.length - 1);
    FRAME_RATES.forEach((fps, i) => {
      const text = button(-WIDTH / 2 + 30 + i * step, 64, String(fps), () => {
        setFrameRate(fps);
        scene.physics.world.setFPS(physicsRate());
        this.update();
      });
      this.rates.push({ text, fps });
    });
    button(0, 108, 'New game', onNewGame);
    parts.push(scene.add.text(cx, top + 146, 'Tap outside to close', { ...TEXT, fontSize: '11px', color: '#bfae8e' }).setOrigin(0.5, 0));

    for (const part of parts) (part as unknown as Phaser.GameObjects.Image).setScrollFactor(0).setDepth(depth).setVisible(false);
    this.parts = parts;
    this.update();
  }

  get visible() {
    return this.parts[0].visible;
  }

  toggle(open = !this.visible) {
    for (const part of this.parts) part.setVisible(open);
  }

  /** Marks the chosen frame rate. */
  private update() {
    for (const { text, fps } of this.rates) text.setBackgroundColor(fps === frameRate() ? CHOSEN : BUTTON.backgroundColor);
  }
}
