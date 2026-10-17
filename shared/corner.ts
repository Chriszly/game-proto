import { settings, updateSettings } from './settings';
import { t } from './i18n';
import { setVolumes, ui, unlockAudio } from './audio';

/** The key that mutes every sound and turns it back on, on any screen. */
const SOUND_KEY = 'm';

let bar: HTMLDivElement | null = null;

/**
 * The row of buttons in the bottom left corner of every game: full screen, sound and pause, in that
 * order (`setupGame.ts` and `startScreen.ts` add them). It keeps 12px clear of the edges, plus the
 * screen's safe area where a phone reports one, so rounded corners and notches never cut a button.
 */
export function cornerBar() {
  if (bar) return bar;
  const style = document.createElement('style');
  style.textContent = `
.game-corner { position: fixed; z-index: 10; display: flex; gap: 6px;
  left: calc(12px + env(safe-area-inset-left, 0px)); bottom: calc(12px + env(safe-area-inset-bottom, 0px)); }
.corner-button { width: 30px; height: 30px; padding: 5px; cursor: pointer; color: #f3e9d2; background: rgba(0, 0, 0, 0.55);
  border: 1px solid rgba(243, 233, 210, 0.35); border-radius: 3px; }
.corner-button[hidden] { display: none; }
`;
  document.head.append(style);
  bar = document.createElement('div');
  bar.className = 'game-corner';
  document.body.append(bar);
  return bar;
}

let muted = settings.muted;
const listeners: (() => void)[] = [];

function setMuted(on: boolean) {
  muted = on;
  setVolumes({ muted });
  updateSettings({ muted });
  for (const listener of listeners) listener();
}

const SPEAKER = '<path d="M2 6h3l4-3v10l-4-3H2z" fill="currentColor" stroke="none"/>';
const WAVES = '<path d="M11 5.5a3.5 3.5 0 0 1 0 5M12.5 3.5a6 6 0 0 1 0 9"/>';
const MUTED = '<path d="M11 6l4 4M15 6l-4 4"/>';

/** The sound button, beside full screen, and the M key: a tap mutes every sound or turns it back on. */
export function addSoundButton() {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'sound-button corner-button';
  const draw = () => {
    const text = t(muted ? 'soundOnButton' : 'soundOffButton');
    button.title = text;
    button.setAttribute('aria-label', text);
    button.setAttribute('aria-pressed', String(muted));
    button.innerHTML =
      '<svg viewBox="0 0 16 16" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" ' +
      `stroke-linecap="round" aria-hidden="true">${SPEAKER}${muted ? MUTED : WAVES}</svg>`;
  };
  listeners.push(draw);
  draw();
  const toggle = () => {
    unlockAudio();
    setMuted(!muted);
    ui('click');
  };
  button.addEventListener('click', () => {
    toggle();
    // A focused button is clicked by Space and Enter, which games use, so let go of the focus.
    button.blur();
  });
  window.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() !== SOUND_KEY || e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
    toggle();
  });
  cornerBar().append(button);
}

/** The pause screen's music and effects volumes, saved to the hub's settings as they move. */
export function volumeSliders() {
  return (['music', 'effects'] as const).flatMap((key) => {
    const label = document.createElement('label');
    label.textContent = t(key === 'music' ? 'musicVolume' : 'effectsVolume');
    const input = document.createElement('input');
    input.type = 'range';
    input.min = '0';
    input.max = '100';
    input.step = '5';
    input.value = String(settings[key]);
    input.className = `volume-${key}`;
    label.htmlFor = input.id = `game-volume-${key}`;
    input.addEventListener('input', () => {
      const value = Number(input.value);
      setVolumes({ [key]: value });
      updateSettings({ [key]: value });
    });
    // Moving a volume turns the sound on, since a muted game would play nothing to hear it by.
    input.addEventListener('change', () => {
      if (muted) setMuted(false);
      if (key === 'effects') ui('coin');
    });
    return [label, input];
  });
}
