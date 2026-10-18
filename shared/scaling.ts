import Phaser from 'phaser';
import { t } from './i18n';

/**
 * Keeps a game sharp and well placed on every screen, from an upright phone to a 4K monitor.
 *
 * A game is designed at a fixed view (960x540, or 540x960 for an upright game) and Phaser's FIT
 * mode stretches it to the window. Left alone, the canvas has only that many pixels, so on a big or
 * high-density screen the browser blows the picture up 2 to 4 times and it goes soft. Here the
 * canvas gets `renderScale` times the pixels instead, and every camera is zoomed by the same factor,
 * so the game keeps its own coordinates, layout and input while drawing at the screen's real
 * resolution.
 *
 * A game opts in by calling `setupScaling(game)` right after `setupGame(game)`. Then:
 * - `this.scale.width` and `height`, `pointer.x` and `y` and camera sizes are canvas pixels, which
 *   are `renderScale` times game pixels. Lay out with `viewSize(scene)` instead of `scene.scale`,
 *   and read a pointer on the screen with `viewPoint(pointer)`. Read positions in the world through `pointer.worldX` and
 *   `worldY`, `camera.getWorldPoint` and `camera.worldView` rather than raw scroll values.
 * - Every camera starts zoomed by `renderScale` from its top-left corner (origin 0), so a camera
 *   that never scrolls, and objects with a scroll factor of 0, look as they did unzoomed. A camera
 *   that scrolls, follows or has bounds needs Phaser's usual origin back: `scrollingCamera(camera)`.
 *   Keep objects with a scroll factor of 0 off such a camera, since Phaser zooms them around the
 *   middle of the camera: `splitHudCamera(scene)` draws them with a second camera that doesn't scroll.
 * - A game that zooms a camera itself multiplies its own zoom by `renderScale`.
 * - Texts are drawn at `renderScale` unless they set their own `resolution`.
 * - Art painted into canvases stays as sharp as its canvas; paint it `renderScale` times bigger to
 *   keep it crisp (see `sharpRes`).
 * - On a phone held the wrong way for the game, a hint to turn it covers the paused game.
 *
 * With `setupScaling(game, { fill: true })` the view also takes the screen's shape instead of
 * leaving bars at its sides: it keeps the designed size as its smallest and grows the other way,
 * up to 2.4:1 for a wide game (960 to 1296 wide on an ultrawide or sideways phone, 540 to 720 tall
 * on a 4:3 tablet) and the same turned round for an upright game. The shape is picked once, when
 * the game starts, from the window (on a phone, either way round). A game that fills lays out
 * against `viewSize(scene)` rather than its designed size: it paints its background over the whole
 * view, pins its bars and buttons to the view's edges and centres its play area, which
 * `viewFrame(scene)` gives as the designed-size rectangle in the middle of the view.
 */

/** Canvas pixels per game pixel; 1 until `setupScaling` runs. */
export let renderScale = 1;

/** The most canvas pixels per game pixel: enough for a 4K screen. */
const MAX_SCALE = 4;
/** The most when Phaser draws without WebGL, which is much slower per pixel. */
const MAX_CANVAS_SCALE = 2;
/** The longest side, in pixels, of a texture `sharpRes` lets a game paint. */
const MAX_TEXTURE = 4096;
/** The longest a filling view grows, as a share of its shorter side: an ultrawide monitor. */
const MAX_ASPECT = 2.4;
/** The squarest a filling view gets: a 4:3 tablet. */
const MIN_ASPECT = 4 / 3;

export interface ScalingOptions {
  /** Grow the view to the screen's shape instead of leaving bars at its sides. */
  fill?: boolean;
}

/**
 * Opts a game into sharp scaling. Call it right after `setupGame(game)`, before any scene starts.
 */
export function setupScaling(game: Phaser.Game, { fill = false }: ScalingOptions = {}) {
  const design = { w: Number(game.config.width), h: Number(game.config.height) };
  const apply = () => {
    const view = fill ? fillView(design.w, design.h, game) : design;
    const canvasRenderer = game.config.renderType === Phaser.CANVAS || game.renderer?.type === Phaser.CANVAS;
    renderScale = pickRenderScale(view.w, view.h, canvasRenderer ? MAX_CANVAS_SCALE : MAX_SCALE);
    if (renderScale !== 1 || view !== design) game.scale.setGameSize(view.w * renderScale, view.h * renderScale);
  };
  // Phaser boots right away once the page has loaded, which it has when a module script runs.
  if (game.renderer) apply();
  else game.events.once(Phaser.Core.Events.BOOT, apply);
  zoomNewCameras();
  sharpenTexts();
  addTurnHint(game, design.w >= design.h);
}

/**
 * The view for a game designed at `w` x `h` that takes the window's shape: the designed size,
 * grown along one side to match the window, between 4:3 and 2.4:1. On a touch screen the window is
 * taken the way round the game wants, so a phone that starts turned the wrong way still fits once
 * it is turned.
 */
export function fillView(w: number, h: number, game?: Phaser.Game) {
  const parent = game?.scale.parent as HTMLElement | undefined;
  let ww = parent?.clientWidth || window.innerWidth;
  let wh = parent?.clientHeight || window.innerHeight;
  if (window.matchMedia('(pointer: coarse)').matches && ww > wh !== w > h) [ww, wh] = [wh, ww];
  // A desktop window turned the other way round from the game just keeps the designed size.
  if (ww > wh !== w > h) return { w, h };
  const long = Math.max(w, h);
  const short = Math.min(w, h);
  const designed = long / short;
  const wanted = Phaser.Math.Clamp(Math.max(ww, wh) / Math.min(ww, wh), MIN_ASPECT, MAX_ASPECT);
  // A longer screen grows the long side, a squarer one the short side, to whole even pixels.
  const even = (n: number) => 2 * Math.round(n / 2);
  const grownLong = wanted > designed ? even(short * wanted) : long;
  const grownShort = wanted < designed ? even(long / wanted) : short;
  return w >= h ? { w: grownLong, h: grownShort } : { w: grownShort, h: grownLong };
}

/**
 * The canvas pixels per game pixel this screen needs: the device pixels the view covers at the
 * largest it can be shown (the whole screen, either way round), rounded up to a whole number so
 * every game pixel covers the same number of canvas pixels.
 */
export function pickRenderScale(w: number, h: number, max = MAX_SCALE) {
  const dpr = window.devicePixelRatio || 1;
  const sw = window.screen.width * dpr;
  const sh = window.screen.height * dpr;
  const fit = Math.max(Math.min(sw / w, sh / h), Math.min(sh / w, sw / h));
  // A screen a touch bigger than a whole multiple (a 1924px wide window) doesn't need the next one.
  return Phaser.Math.Clamp(Math.ceil(fit - 0.05), 1, max);
}

/**
 * The resolution to paint a `w` x `h` texture at, for art meant to be painted at `res` on a screen
 * that needs no scaling. A bigger screen gets up to `res` times `renderScale`: enough for the
 * screen with half again to spare for a camera zoomed in, but no more, since painting and loading
 * big canvases slows the start. It is held to a texture size every device can load.
 */
export function sharpRes(w: number, h: number, res = 1) {
  const wanted = Math.min(res * renderScale, Math.max(res, 1.5 * renderScale));
  return Math.min(wanted, Math.max(res, MAX_TEXTURE / Math.max(w, h)));
}

/** The size of the game's view in game pixels: what `scene.scale` gives in canvas pixels. */
export function viewSize(scene: Phaser.Scene) {
  return { width: scene.scale.width / renderScale, height: scene.scale.height / renderScale };
}

/**
 * The game's designed size as a rectangle in the middle of its view, in game pixels: the whole
 * view unless it fills a screen of another shape (see `ScalingOptions.fill`). Centre a play area
 * that was laid out for the designed size by placing it at this rectangle's `x` and `y`.
 */
export function viewFrame(scene: Phaser.Scene) {
  const { width, height } = viewSize(scene);
  const w = Math.min(width, Number(scene.game.config.width));
  const h = Math.min(height, Number(scene.game.config.height));
  return new Phaser.Geom.Rectangle(Math.round((width - w) / 2), Math.round((height - h) / 2), w, h);
}

/**
 * Gives a camera that scrolls, follows or has bounds Phaser's usual origin (its middle), which
 * Phaser's follow and bounds rely on. Position it with `startFollow`, `centerOn` and `setBounds`,
 * and read what it shows from `worldView`.
 */
export function scrollingCamera(camera: Phaser.Cameras.Scene2D.Camera) {
  return camera.setOrigin(0.5);
}

/** A pointer's position in game pixels on the screen (not the world), from the canvas's top-left. */
export function viewPoint(pointer: { x: number; y: number }) {
  return { x: pointer.x / renderScale, y: pointer.y / renderScale };
}

/**
 * Adds a camera that never scrolls over a scene's main camera and moves every object with a
 * scroll factor of 0 (a top bar, a panel) onto it, so the main camera can scroll, follow and keep
 * Phaser's middle origin. Objects are sorted again before every frame, so ones made later follow.
 */
export function splitHudCamera(scene: Phaser.Scene) {
  const world = scrollingCamera(scene.cameras.main);
  const hud = scene.cameras.add();
  const sort = () => {
    for (const obj of scene.children.list) {
      const fixed = (obj as unknown as { scrollFactorX?: number }).scrollFactorX === 0;
      obj.cameraFilter = fixed ? world.id : hud.id;
    }
  };
  scene.events.on(Phaser.Scenes.Events.PRE_RENDER, sort);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.events.off(Phaser.Scenes.Events.PRE_RENDER, sort));
  return hud;
}

let patched = false;

/** Every camera a scene adds, its main camera included, starts zoomed by `renderScale`. */
function zoomNewCameras() {
  if (patched) return;
  patched = true;
  const manager = Phaser.Cameras.Scene2D.CameraManager.prototype;
  const add = manager.add;
  manager.add = function (this: Phaser.Cameras.Scene2D.CameraManager, ...args: Parameters<typeof add>) {
    const camera = add.apply(this, args);
    // Zoomed from its top-left corner, so it shows the same part of the world as unzoomed, and
    // objects with a scroll factor of 0 (a top bar, a panel) stay where they were placed.
    if (renderScale !== 1) camera.setZoom(renderScale).setOrigin(0);
    return camera;
  };
}

/** Texts are drawn at `renderScale` unless they ask for a resolution of their own. */
function sharpenTexts() {
  const factory = Phaser.GameObjects.GameObjectFactory.prototype;
  const text = factory.text;
  if ((text as { sharp?: boolean }).sharp) return;
  const sharp = function (this: Phaser.GameObjects.GameObjectFactory, x: number, y: number, content: string | string[], style?: Phaser.Types.GameObjects.Text.TextStyle) {
    return text.call(this, x, y, content, { resolution: renderScale, ...style });
  };
  factory.text = Object.assign(sharp, { sharp: true });
}

/**
 * On a phone or tablet held the wrong way for the game (upright for a wide game, sideways for a
 * tall one), covers the page with a hint to turn it and pauses the game until it is turned back.
 * The view would otherwise use about a quarter of the screen.
 */
function addTurnHint(game: Phaser.Game, wide: boolean) {
  const touch = window.matchMedia('(pointer: coarse)');
  const upright = window.matchMedia('(orientation: portrait)');
  const hint = document.createElement('div');
  hint.className = 'turn-hint';
  hint.setAttribute('role', 'alert');
  hint.style.cssText =
    'position:fixed;inset:0;z-index:20;display:none;flex-direction:column;align-items:center;justify-content:center;' +
    'gap:16px;padding:24px;text-align:center;font:600 18px system-ui,sans-serif;color:#f3e9d2;background:rgba(20,16,12,0.92)';
  // A phone outline, turned the way the game wants it.
  const [pw, ph] = wide ? [56, 32] : [32, 56];
  hint.innerHTML =
    `<svg viewBox="0 0 64 64" width="72" height="72" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true">` +
    `<rect x="${32 - pw / 2}" y="${32 - ph / 2}" width="${pw}" height="${ph}" rx="5"/>` +
    `<path d="M14 10a26 26 0 0 1 36 0M50 10l1 7-7-1"/></svg>` +
    `<div>${t(wide ? 'turnSideways' : 'turnUpright')}</div>`;
  document.body.append(hint);
  let shown = false;
  const update = () => {
    const wrong = touch.matches && upright.matches === wide;
    if (wrong === shown) return;
    shown = wrong;
    hint.style.display = wrong ? 'flex' : 'none';
    if (wrong) game.pause();
    else {
      // Don't count the time spent turned away as one long frame.
      game.loop.resetDelta();
      game.resume();
    }
  };
  upright.addEventListener('change', update);
  touch.addEventListener('change', update);
  update();
}
