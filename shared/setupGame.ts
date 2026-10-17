import Phaser from 'phaser';
import { settings } from './settings';
import { language, setLanguage, t } from './i18n';
import { addStartScreen } from './startScreen';
import type { HowToPlay } from './howToPlay';
import { countPlay } from './playCount';

/** Frames that come up to this early still run, so a display whose frames jitter keeps them all. */
const SLACK_MS = 1;

/**
 * Applies the hub's settings that work the same in every game: the frame cap, the FPS readout and
 * reduced motion. Every game calls this right after creating its `Phaser.Game`. Full screen is
 * here too, as a button in the bottom left corner and the F key, in every game, and so are the
 * loading, start and pause screens (`startScreen.ts`), with the game's How to play behind a button on
 * the start and pause screens when it passes `howToPlay` (`howToPlay.ts`). It also counts the play
 * on the game's public play counter (`playCount.ts`).
 */
export function setupGame(game: Phaser.Game, options: { howToPlay?: HowToPlay } = {}) {
  setLanguage(language());
  capFrameRate(game, settings.fps);
  if (settings.showFps) showFps(game);
  if (settings.reduceMotion) reduceMotion();
  addFullscreen();
  addStartScreen(game, options.howToPlay);
  countPlay();
}

/**
 * A button in the bottom left corner, and the F key, that take the page into full screen and back.
 * Browsers that cannot do full screen on the page (iPhones, for one) get neither.
 */
function addFullscreen() {
  if (!document.fullscreenEnabled) return;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'fullscreen-button';
  button.style.cssText =
    'position:fixed;bottom:4px;left:4px;z-index:10;width:30px;height:30px;padding:5px;cursor:pointer;' +
    'color:#f3e9d2;background:rgba(0,0,0,0.55);border:1px solid rgba(243,233,210,0.35);border-radius:3px';
  button.innerHTML =
    '<svg viewBox="0 0 16 16" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">' +
    '<path d="M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4"/></svg>';
  const label = (on: boolean) => {
    const text = t(on ? 'exitFullScreenButton' : 'fullScreenButton');
    button.title = text;
    button.setAttribute('aria-label', text);
    button.setAttribute('aria-pressed', String(on));
  };
  label(false);
  const toggle = () => {
    const request = document.fullscreenElement
      ? document.exitFullscreen()
      : document.documentElement.requestFullscreen();
    // A refused request (no user gesture, or the browser says no) just leaves the page as it is.
    request.catch(() => {});
  };
  button.addEventListener('click', () => {
    toggle();
    // A focused button is clicked by Space and Enter, which games use, so let go of the focus.
    button.blur();
  });
  window.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() !== 'f' || e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
    toggle();
  });
  document.addEventListener('fullscreenchange', () => label(document.fullscreenElement !== null));
  document.body.append(button);
}

/**
 * Caps how often the game updates and draws at `fps`. Animation frames that come sooner are
 * skipped, so a 144Hz display set to 60 plays at 60 FPS; a cap above the display's rate changes
 * nothing. Phaser's own `fps.limit` is not used because it hands the time left over after each step
 * to the next one as well, which makes the game run fast; here the skipped frames simply count
 * towards the next step's delta.
 */
function capFrameRate(game: Phaser.Game, fps: number) {
  const loop = game.loop;
  const step = loop.step.bind(loop);
  const interval = 1000 / fps;
  // While starting up, after a refocus and while out of focus, Phaser cuts each delta down to its
  // target frame time (1000/60ms by default). Raise that to twice the cap's frame time, and never
  // below twice Phaser's own, so a low cap, a high cap on a slower display or a hitch in those
  // frames doesn't slow the game down.
  const target = loop as unknown as { _target: number };
  target._target = Math.max(2 * interval, 2 * target._target);
  loop.targetFps = 1000 / target._target;
  let next = -Infinity;
  loop.step = (time: number) => {
    if (time < next - SLACK_MS) return;
    // Behind by more than a frame (a hidden tab, a slow frame, a higher cap): count again from now.
    next = time - next > interval ? time + interval : next + interval;
    step(time);
  };
}

/** A small readout of the frame rate the game reaches, over the bottom right corner of the page. */
function showFps(game: Phaser.Game) {
  const label = document.createElement('div');
  label.className = 'fps-readout';
  label.style.cssText =
    'position:fixed;bottom:4px;right:4px;z-index:10;padding:2px 6px;pointer-events:none;' +
    'font:12px ui-monospace,monospace;color:#f3e9d2;background:rgba(0,0,0,0.55)';
  document.body.append(label);
  game.events.on(Phaser.Core.Events.POST_RENDER, () => {
    const text = t('fpsReadout', { fps: Math.round(game.loop.actualFps) });
    if (label.textContent !== text) label.textContent = text;
  });
}

/** Turns every camera's shake and flash into no-ops, so no game needs its own check. */
function reduceMotion() {
  const camera = Phaser.Cameras.Scene2D.Camera.prototype;
  camera.shake = function () {
    return this;
  };
  camera.flash = function () {
    return this;
  };
}
