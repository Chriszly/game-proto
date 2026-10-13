import Phaser from 'phaser';

export type Palette = Record<string, number>;

/** Bakes a character grid ('.' = transparent) into a texture, one texture pixel per character. */
export function bakePixelArt(scene: Phaser.Scene, key: string, rows: string[], palette: Palette) {
  const g = scene.add.graphics();
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const color = palette[row[x]];
      if (color === undefined) continue;
      g.fillStyle(color, 1);
      g.fillRect(x, y, 1, 1);
    }
  });
  g.generateTexture(key, rows[0].length, rows.length);
  g.destroy();
}
