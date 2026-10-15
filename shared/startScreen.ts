import Phaser from 'phaser';
import { settings } from './settings';

/** The key that pauses the game and resumes it. Esc is left to the games, some of which close panels with it. */
const PAUSE_KEY = 'p';

/**
 * Covers the page while the game starts up, then shows a start screen, and gives every game a
 * pause screen:
 * - Loading: from the moment the game is created until the first scene after Boot (or the only
 *   scene, in a game without one) has drawn, so the player never looks at a blank page while the
 *   art is baked. The game waits for the page to show it before its first step, which may be a
 *   long one.
 * - Start: the game's icon, its name and a Start button over its first drawn frame. The scenes
 *   stand paused until Start is pressed (or Enter or Space), so nothing happens unseen. Under
 *   browser automation it is skipped (see `skipStart`).
 * - Pause: a button next to full screen, the P key, or leaving the tab pauses every running scene
 *   and shows Resume and a link back to all games. P, Enter, Space or Esc resume.
 * While a screen is up, keys go to it and not to the game.
 */
export function addStartScreen(game: Phaser.Game) {
  injectStyles();
  const overlay = document.createElement('div');
  overlay.className = 'game-overlay loading';
  overlay.innerHTML =
    '<div class="game-overlay-card">' +
    `<img class="game-overlay-icon" alt="" src="${iconUrl()}">` +
    `<div class="game-overlay-title">${escapeHtml(document.title)}</div>` +
    '<div class="game-overlay-loading" role="status">Loading<span>.</span><span>.</span><span>.</span></div>' +
    '<button type="button" class="game-overlay-button game-start-button">Start</button>' +
    '<button type="button" class="game-overlay-button game-resume-button">Resume</button>' +
    '<div class="game-overlay-hint"></div>' +
    '<a class="game-overlay-hub" href="../../">All games</a>' +
    '</div>';
  document.body.append(overlay);
  const startButton = overlay.querySelector<HTMLButtonElement>('.game-start-button')!;
  const resumeButton = overlay.querySelector<HTMLButtonElement>('.game-resume-button')!;
  const hint = overlay.querySelector<HTMLDivElement>('.game-overlay-hint')!;

  const pauseButton = document.createElement('button');
  pauseButton.type = 'button';
  pauseButton.className = 'pause-button';
  pauseButton.title = 'Pause (P)';
  pauseButton.setAttribute('aria-label', 'Pause (P)');
  pauseButton.innerHTML =
    '<svg viewBox="0 0 16 16" width="18" height="18" fill="currentColor" aria-hidden="true">' +
    '<rect x="3" y="2" width="3.5" height="12"/><rect x="9.5" y="2" width="3.5" height="12"/></svg>';
  // Beside the full screen button when there is one.
  pauseButton.style.left = document.fullscreenEnabled ? '38px' : '4px';
  pauseButton.hidden = true;
  document.body.append(pauseButton);

  type Mode = 'loading' | 'start' | 'paused' | 'playing';
  let mode: Mode = 'loading';
  /** The scenes this pause stopped, to start again on resume, and none the game paused itself. */
  let held: Phaser.Scene[] = [];

  const show = (next: Mode) => {
    mode = next;
    overlay.className = `game-overlay ${next}`;
    overlay.hidden = next === 'playing';
    pauseButton.hidden = next !== 'playing';
    hint.textContent =
      next === 'start' ? 'Press P to pause' : next === 'paused' ? 'Press P, Space or Esc to play on' : '';
    const button = next === 'start' ? startButton : next === 'paused' ? resumeButton : null;
    button?.focus({ preventScroll: true });
  };

  const hold = () => {
    held = game.scene.getScenes(true);
    // Through the scenes' systems, at once: the scene plugin would queue it for the next step.
    for (const scene of held) scene.sys.pause();
    game.sound.pauseAll();
  };
  const play = () => {
    for (const scene of held) if (scene.sys.isPaused()) scene.sys.resume();
    held = [];
    game.sound.resumeAll();
    show('playing');
    // A focused button is clicked by Space and Enter, which games use, so let go of the focus.
    (document.activeElement as HTMLElement | null)?.blur();
  };
  const pause = () => {
    if (mode !== 'playing') return;
    hold();
    show('paused');
  };

  // Ready once a scene other than Boot has drawn: its first frame stays on screen behind Start.
  const onRender = () => {
    if (!game.scene.getScenes(true).some((scene) => scene.sys.settings.key !== 'Boot')) return;
    game.events.off(Phaser.Core.Events.POST_RENDER, onRender);
    if (skipStart()) return show('playing');
    hold();
    show('start');
  };
  game.events.on(Phaser.Core.Events.POST_RENDER, onRender);
  holdFirstStep(game);

  startButton.addEventListener('click', play);
  resumeButton.addEventListener('click', play);
  pauseButton.addEventListener('click', pause);

  // Captured on window, before the game's own listeners, so a screen that is up keeps its keys.
  window.addEventListener(
    'keydown',
    (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const key = e.key.toLowerCase();
      if (mode === 'playing') {
        if (key === PAUSE_KEY && !e.repeat) {
          e.stopPropagation();
          pause();
        }
        return;
      }
      // Full screen still works from any screen.
      if (key === 'f') return;
      e.stopPropagation();
      if (e.repeat) return;
      const go = key === 'enter' || key === ' ';
      if ((mode === 'start' && go) || (mode === 'paused' && (go || key === PAUSE_KEY || key === 'escape'))) {
        e.preventDefault();
        play();
      }
    },
    { capture: true },
  );
  window.addEventListener('keyup', (e) => mode !== 'playing' && e.stopPropagation(), { capture: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pause();
  });
}

/**
 * Skips the game's steps until the page has drawn once with the loading screen up, since the
 * first steps bake the art and draw nothing until they are done.
 */
function holdFirstStep(game: Phaser.Game) {
  const loop = game.loop;
  const step = loop.step.bind(loop);
  let shown = false;
  // A callback two animation frames on runs after the first frame with the screen was drawn.
  requestAnimationFrame(() => requestAnimationFrame(() => (shown = true)));
  loop.step = (time: number) => {
    if (shown) step(time);
  };
}

/**
 * Under browser automation (the playthroughs) the game starts at once, without waiting on Start,
 * so no game's test needs to know about the start screen. A test that checks the start screen
 * itself sets `window.showStartScreen` first.
 */
function skipStart() {
  return navigator.webdriver && !(window as { showStartScreen?: boolean }).showStartScreen;
}

/** The game's favicon, the bear with its prop. */
function iconUrl() {
  return document.querySelector<HTMLLinkElement>('link[rel="icon"]')?.href ?? '';
}

function escapeHtml(text: string) {
  return text.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
}

function injectStyles() {
  const style = document.createElement('style');
  style.textContent = `
.game-overlay { position: fixed; inset: 0; z-index: 9; display: flex; align-items: center; justify-content: center;
  padding: 16px; font: 16px system-ui, sans-serif; color: #f3e9d2; background: rgba(20, 16, 12, 0.6); }
.game-overlay[hidden] { display: none; }
.game-overlay.loading { background: #1b1410; }
.game-overlay-card { display: flex; flex-direction: column; align-items: center; gap: 12px; min-width: 200px;
  padding: 24px 32px; text-align: center; background: rgba(20, 16, 12, 0.85);
  border: 1px solid rgba(243, 233, 210, 0.35); border-radius: 8px; }
.game-overlay.loading .game-overlay-card { background: none; border-color: transparent; }
.game-overlay-icon { width: 64px; height: 64px; }
.game-overlay-title { font-size: 26px; font-weight: 700; letter-spacing: 0.02em; }
.game-overlay.paused .game-overlay-title::after { content: ' \\00b7  Paused'; font-weight: 400; }
.game-overlay-loading span { animation: game-overlay-dot 1.2s infinite; }
.game-overlay-loading span:nth-child(2) { animation-delay: 0.2s; }
.game-overlay-loading span:nth-child(3) { animation-delay: 0.4s; }
@keyframes game-overlay-dot { 0%, 60%, 100% { opacity: 1; } 30% { opacity: 0.2; } }
.game-overlay-button { min-width: 160px; padding: 10px 24px; font: 700 20px system-ui, sans-serif; cursor: pointer;
  color: #1b1410; background: #f0a830; border: 2px solid #f3e9d2; border-radius: 6px; }
.game-overlay-button:hover, .game-overlay-button:focus-visible { background: #ffc04d; outline: none; }
.game-overlay-hint { font-size: 13px; opacity: 0.7; }
.game-overlay-hint:empty { display: none; }
.game-overlay-hub { font-size: 14px; color: #f3e9d2; }
.game-overlay:not(.loading) .game-overlay-loading,
.game-overlay:not(.start) .game-start-button,
.game-overlay:not(.paused) .game-resume-button,
.game-overlay:not(.paused) .game-overlay-hub { display: none; }
.pause-button { position: fixed; bottom: 4px; z-index: 10; width: 30px; height: 30px; padding: 5px; cursor: pointer;
  color: #f3e9d2; background: rgba(0, 0, 0, 0.55); border: 1px solid rgba(243, 233, 210, 0.35); border-radius: 3px; }
.pause-button[hidden] { display: none; }
${settings.reduceMotion ? '.game-overlay-loading span { animation: none; }' : ''}
`;
  document.head.append(style);
}
