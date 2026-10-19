import Phaser from 'phaser';
import { settings } from '../../../../shared/settings';
import { DAY_MS, weatherFor, type GameState, type Weather } from '../game/state';

// Today's weather and the evening light over a yard, the apothecary's or a town shop's.

/** The evening light: from this share of the day on, deepening to this alpha at dusk. */
const DUSK_FROM = 0.6;
const DUSK_ALPHA = 0.45;
/** How many rain streaks and heat waves are in view at once. */
const RAIN_STREAKS = 140;
const HEAT_WAVES = 22;
const TINTS: Record<Weather, [number, number]> = { mild: [0, 0], rain: [0x2a3a58, 0.22], fair: [0xffd870, 0.08], drought: [0xe0782a, 0.14] };

/**
 * Today's weather over a yard of `world`'s size: a grey-blue dusk and falling rain on a rainy day, a
 * warm haze with heat rising in wavy lines in a drought, a little golden light on a fair day, and
 * nothing on a mild one; and the evening light deepening towards dusk. It is drawn in the world at
 * `depth`, across what the main camera sees. With reduced motion the tint stays and nothing moves.
 * Returns the view to run every frame.
 */
export function addWeather(scene: Phaser.Scene, world: { w: number; h: number }, depth: number, state: () => GameState) {
  const tint = scene.add.rectangle(0, 0, world.w, world.h, 0, 0).setOrigin(0).setDepth(depth);
  const fx = scene.add.graphics().setDepth(depth + 0.1);
  // Evening light over the last part of the day: warm at first, then deepening towards dusk.
  const dusk = scene.add.rectangle(0, 0, world.w, world.h, 0, 0).setOrigin(0).setDepth(depth + 0.05);
  // Where each streak or wave starts, spread evenly but not in rows: a fixed scatter, so the weather
  // never touches Math.random.
  const scatter = (i: number, k: number) => ((Math.sin(i * 12.9898 + k * 78.233) * 43758.5453) % 1 + 1) % 1;
  return () => {
    const { contract } = state();
    const weather = weatherFor(contract.day);
    const [color, alpha] = TINTS[weather];
    tint.setFillStyle(color, alpha);
    const evening = Phaser.Math.Clamp((1 - contract.dayLeft / DAY_MS - DUSK_FROM) / (1 - DUSK_FROM), 0, 1);
    const light = Phaser.Display.Color.Interpolate.ColorWithColor(Phaser.Display.Color.ValueToColor(0xe8903a), Phaser.Display.Color.ValueToColor(0x1c2050), 1, evening);
    dusk.setFillStyle(Phaser.Display.Color.GetColor(light.r, light.g, light.b), evening * DUSK_ALPHA);
    fx.clear();
    if (settings.reduceMotion || (weather !== 'rain' && weather !== 'drought')) return;
    const view = scene.cameras.main.worldView;
    const now = scene.time.now;
    if (weather === 'rain') {
      // Streaks falling fast and slanting a little, wrapping round the view.
      fx.lineStyle(1.2, 0xc8d8f0, 0.55);
      for (let i = 0; i < RAIN_STREAKS; i++) {
        const x = view.x + scatter(i, 1) * (view.width + 40) - 20;
        const fall = (scatter(i, 2) * view.height + now * (0.55 + scatter(i, 3) * 0.25)) % (view.height + 30);
        const y = view.y + fall - 15;
        fx.lineBetween(x, y, x - 3, y + 12);
      }
    } else {
      // Heat: faint wavy lines drifting up from the ground.
      fx.lineStyle(1.4, 0xfff0c8, 0.3);
      for (let i = 0; i < HEAT_WAVES; i++) {
        const x = view.x + scatter(i, 4) * view.width;
        const rise = (scatter(i, 5) * view.height + now * 0.04) % view.height;
        const y = view.y + view.height - rise;
        fx.beginPath();
        for (let k = 0; k <= 8; k++) {
          const px = x + k * 5, py = y + Math.sin(k * 0.9 + now / 300 + i) * 2.5;
          if (k === 0) fx.moveTo(px, py);
          else fx.lineTo(px, py);
        }
        fx.strokePath();
      }
    }
  };
}
