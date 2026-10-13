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
