import Phaser from 'phaser';
import { formatNumber } from '../../../../shared/i18n';
import { viewSize } from '../../../../shared/scaling';
import { INK, SERIF, fit, resOf } from '../art/paint';
import { BUBBLE_TAIL, cardInset, cardTexture, type CardKind } from '../art/ui';
import { saveState } from '../game/save';
import type { GameState } from '../game/state';

// What the town map and the town shops' scenes share: their top bar, cards and the way between
// scenes. Every scene loads the game from the save when it starts, so leaving one saves first.

export const TOWN_UI_DEPTH = 10_000;
export const TOWN_HUD_H = 44;
export const TOWN_TEXT = { fontFamily: SERIF, fontSize: '17px', fontStyle: 'bold', color: INK };
export const AUTOSAVE_MS = 3_000;

/** A card image centred on (x, y) by its card, not by its shadow or a bubble's tail. */
export function townCard(scene: Phaser.Scene, x: number, y: number, kind: CardKind, w: number, h: number) {
  const key = cardTexture(scene, kind, w, h);
  const img = fit(scene.add.image(x, y, key));
  const inset = cardInset(kind);
  const texH = img.height / resOf(key);
  const cardH = texH - 2 * inset - (kind === 'bubble' ? BUBBLE_TAIL : 0);
  return img.setOrigin(0.5, (inset + cardH / 2) / texH);
}

const stop = (_p: Phaser.Input.Pointer, _x: number, _y: number, e: Phaser.Types.Input.EventData) => e.stopPropagation();

/**
 * The top bar: the purse at the left, a title in the middle and a button at the right that leads
 * on (`back`). Returns a function that shows the purse; call it every frame.
 */
export function townTopBar(scene: Phaser.Scene, state: () => GameState, title: string, back: { label: string; onTap: () => void }) {
  const { width } = viewSize(scene);
  const parts: Phaser.GameObjects.GameObject[] = [];
  parts.push(fit(scene.add.image(0, 0, cardTexture(scene, 'bar', width, TOWN_HUD_H))).setOrigin(0).setInteractive().on('pointerdown', stop));
  parts.push(fit(scene.add.image(26, TOWN_HUD_H / 2 - 1, 'coin'), 1.6));
  const coins = scene.add.text(42, TOWN_HUD_H / 2 - 1, '', TOWN_TEXT).setOrigin(0, 0.5);
  parts.push(coins);
  parts.push(scene.add.text(width / 2, TOWN_HUD_H / 2, title, TOWN_TEXT).setOrigin(0.5));
  const label = scene.add.text(0, TOWN_HUD_H / 2, back.label, { ...TOWN_TEXT, fontSize: '14px' }).setOrigin(0.5);
  const w = Math.round(label.width + 22);
  label.setX(width - 16 - w / 2);
  const button = townCard(scene, label.x, TOWN_HUD_H / 2, 'button', w, 28)
    .setInteractive({ useHandCursor: true })
    .on('pointerdown', (p: Phaser.Input.Pointer, x: number, y: number, e: Phaser.Types.Input.EventData) => {
      stop(p, x, y, e);
      back.onTap();
    });
  parts.push(button, label);
  parts.forEach((part, i) => (part as unknown as Phaser.GameObjects.Image).setDepth(TOWN_UI_DEPTH + i * 0.01).setScrollFactor(0));
  return () => coins.setText(formatNumber(state().coins));
}

/**
 * Saves the game and starts another scene with the live state as its scene data, so the session
 * goes on even where the save could not be written (storage blocked or full).
 */
export function leaveFor(scene: Phaser.Scene, state: GameState, key: string, data?: object) {
  saveState(state);
  scene.scene.start(key, { ...data, state });
}

/** Saves every `AUTOSAVE_MS`, on hiding the tab and on leaving the page, until the scene shuts down. */
export function keepSaving(scene: Phaser.Scene, state: () => GameState) {
  const save = () => saveState(state());
  const onHide = () => {
    if (document.visibilityState === 'hidden') save();
  };
  scene.time.addEvent({ delay: AUTOSAVE_MS, loop: true, callback: save });
  document.addEventListener('visibilitychange', onHide);
  window.addEventListener('pagehide', save);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    document.removeEventListener('visibilitychange', onHide);
    window.removeEventListener('pagehide', save);
  });
}
