import type Phaser from 'phaser';

/** Frames that come up to this early still run, so a 60Hz display whose frames jitter keeps them all. */
const SLACK_MS = 1;

/**
 * Caps how often the game updates and draws at `fps`. Animation frames that come sooner are skipped,
 * so a 120Hz or 144Hz display plays at 60 FPS. Phaser's own `fps.limit` is not used because it hands
 * the time left over after each step to the next one as well, which makes the game run fast; here
 * the skipped frames simply count towards the next step's delta.
 */
export function capFrameRate(game: Phaser.Game, fps: number) {
  const interval = 1000 / fps;
  const loop = game.loop;
  const step = loop.step.bind(loop);
  let next = -Infinity;
  loop.step = (time: number) => {
    if (time < next - SLACK_MS) return;
    // Behind by more than a frame (a hidden tab, a slow frame): start counting again from now.
    next = time - next > interval ? time + interval : next + interval;
    step(time);
  };
}
