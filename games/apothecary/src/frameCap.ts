import type Phaser from 'phaser';

/** The frame rates the settings offer. */
export const FRAME_RATES = [30, 60, 144, 160, 240, 320] as const;
export type FrameRate = (typeof FRAME_RATES)[number];

const KEY = 'apothecary-fps';
const DEFAULT: FrameRate = 60;
/**
 * Frames that come up to this early still run, so a display whose frames jitter, or that runs a hair
 * faster than the cap, keeps them all.
 */
const SLACK_MS = 1;

/** The chosen frame rate, kept apart from the save so a new game keeps it. */
function loadFrameRate(): FrameRate {
  try {
    const saved = Number(localStorage.getItem(KEY));
    return FRAME_RATES.find((fps) => fps === saved) ?? DEFAULT;
  } catch {
    return DEFAULT;
  }
}

let fps = loadFrameRate();

export const frameRate = () => fps;

/** How often physics steps: with every frame, but never under 60 times a second. */
export const physicsRate = () => Math.max(60, fps);

export function setFrameRate(rate: FrameRate) {
  fps = rate;
  try {
    localStorage.setItem(KEY, String(rate));
  } catch {
    // Storage can be blocked (private mode); the setting lasts until the page closes.
  }
}

/**
 * Caps how often the game updates and draws at the chosen frame rate. Animation frames that come
 * sooner are skipped, so a 144Hz display set to 60 plays at 60 FPS; a cap above the display's rate
 * changes nothing. Phaser's own `fps.limit` is not used because it hands the time left over after
 * each step to the next one as well, which makes the game run fast; here the skipped frames simply
 * count towards the next step's delta.
 */
export function capFrameRate(game: Phaser.Game) {
  const loop = game.loop;
  const step = loop.step.bind(loop);
  let next = -Infinity;
  loop.step = (time: number) => {
    if (time < next - SLACK_MS) return;
    const interval = 1000 / fps;
    // Behind by more than a frame (a hidden tab, a slow frame, a higher cap), or a frame early: count
    // again from now. Otherwise keep to the schedule, so skipped frames don't lower the frame rate.
    next = time - next > interval || time < next ? time + interval : next + interval;
    step(time);
  };
}
