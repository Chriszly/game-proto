import Phaser from 'phaser';

/**
 * Keeps a container and everything in it fixed on screen while the camera follows the ship, for
 * drawing and for taps. Container.setScrollFactor's own `updateChildren` skips children whose
 * scroll factor was never set, so each child is set here.
 */
export function pinToScreen<T extends Phaser.GameObjects.Container>(container: T): T {
  container.setScrollFactor(0);
  for (const child of container.list) {
    if (child instanceof Phaser.GameObjects.Container) pinToScreen(child);
    else (child as unknown as Phaser.GameObjects.Components.ScrollFactor).setScrollFactor(0);
  }
  return container;
}

/** Shrinks `text` to at most `max` pixels wide (a long translation, or a long line of news), never growing it. */
export function fitWidth<T extends Phaser.GameObjects.Text>(text: T, max: number): T {
  return text.setScale(Math.min(1, max / Math.max(1, text.width)));
}
