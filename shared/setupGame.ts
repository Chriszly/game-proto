import Phaser from 'phaser';
import { settings } from './settings';

/** Frames that come up to this early still run, so a display whose frames jitter keeps them all. */
const SLACK_MS = 1;

/**
 * Applies the hub's settings that work the same in every game: the frame cap, the FPS readout and
 * reduced motion. Every game calls this right after creating its `Phaser.Game`.
 */
export function setupGame(game: Phaser.Game) {
  capFrameRate(game, settings.fps);
  if (settings.showFps) showFps(game);
  if (settings.reduceMotion) reduceMotion();
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
  // target frame time (1000/60ms by default). Raise that to twice the cap's frame time for a low cap,
  // so it or an uneven display doesn't slow the game down, but never lower it for a high cap: a
  // 60Hz display set to 320 would then play at a third of the speed in those frames.
  const target = loop as unknown as { _target: number };
  target._target = Math.max(2 * interval, target._target);
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
    const fps = Math.round(game.loop.actualFps);
    if (label.textContent !== `${fps} FPS`) label.textContent = `${fps} FPS`;
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
