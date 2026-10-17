import Phaser from 'phaser';
import { fit } from '../art/paint';
import { COIN } from '../i18n';

/** The coin's height against the text's font size. */
const COIN_SIZE = 0.85;

/**
 * Lays the painted gold coin over each coin slot in `text` (`{coin}` in a translated text, which
 * leaves an em space), so amounts read as a number and a coin, never a currency's name. The coins
 * follow the text's place, visibility, alpha, depth and container after every update, and only
 * measure again when the text changes.
 */
export function coined<T extends Phaser.GameObjects.Text>(text: T): T {
  const { scene } = text;
  const coins: Phaser.GameObjects.Image[] = [];
  let laid: string | null = null;
  let spots: Phaser.Types.Math.Vector2Like[] = [];
  const sync = () => {
    if (text.text !== laid) {
      laid = text.text;
      spots = coinSpots(text);
      const scale = (COIN_SIZE * fontSize(text)) / 12;
      while (coins.length < spots.length) {
        const coin = fit(scene.add.image(0, 0, 'coin'), scale);
        text.parentContainer?.add(coin);
        coins.push(coin);
      }
    }
    coins.forEach((coin, i) => {
      const spot = spots[i];
      coin.setVisible(!!spot && text.visible);
      if (!spot || !text.visible) return;
      coin
        .setPosition(text.x + (spot.x! - text.displayOriginX) * text.scaleX, text.y + (spot.y! - text.displayOriginY) * text.scaleY)
        .setAlpha(text.alpha)
        .setDepth(text.depth + 0.001)
        .setScrollFactor(text.scrollFactorX, text.scrollFactorY);
      coin.cameraFilter = text.cameraFilter;
    });
  };
  scene.events.on(Phaser.Scenes.Events.POST_UPDATE, sync);
  text.once(Phaser.GameObjects.Events.DESTROY, () => {
    scene.events.off(Phaser.Scenes.Events.POST_UPDATE, sync);
    for (const coin of coins) coin.destroy();
  });
  return text;
}

const fontSize = (text: Phaser.GameObjects.Text) => parseFloat(String(text.style.fontSize)) || 16;

/**
 * Where each coin slot's middle is drawn within the text, in its own pixels: the lines laid out
 * as Phaser's `updateText` does (`GetTextSize`), then each slot measured along its line.
 */
function coinSpots(text: Phaser.GameObjects.Text): Phaser.Types.Math.Vector2Like[] {
  if (!text.text.includes(COIN)) return [];
  const { style, context } = text;
  const pad = { left: text.padding.left ?? 0, right: text.padding.right ?? 0, top: text.padding.top ?? 0 };
  const lines = text.getWrappedText(text.text);
  style.syncFont(text.canvas, context);
  const measure = (s: string) => context.measureText(s).width;
  const wrapped = style.wordWrapWidth || style.wordWrapCallback ? measure(' ') : 0;
  const widths = lines.map((line) => Math.ceil(style.strokeThickness + measure(line) - wrapped));
  const textWidth = Math.max(text.width - pad.left - pad.right, ...widths);
  const metrics = style.getTextMetrics();
  const lineHeight = metrics.fontSize + style.strokeThickness + text.lineSpacing;
  const spots: Phaser.Types.Math.Vector2Like[] = [];
  lines.forEach((line, i) => {
    let left = style.strokeThickness / 2;
    if (style.align === 'right') left += textWidth - widths[i];
    else if (style.align === 'center') left += (textWidth - widths[i]) / 2;
    const baseline = style.strokeThickness / 2 + i * lineHeight + metrics.ascent;
    for (let at = line.indexOf(COIN); at >= 0; at = line.indexOf(COIN, at + 1)) {
      spots.push({ x: pad.left + left + measure(line.slice(0, at)) + measure(COIN) / 2, y: pad.top + baseline - fontSize(text) * 0.36 });
    }
  });
  return spots;
}
