import Phaser from 'phaser';
import { MAT, bake, disk, edge, limb, poly, ring, type Canvas } from './facets';

// The things that move on the course, in low-poly: a goblin with a club, walking towards the knight,
// and a bat flapping in at head height. Both face left, towards the knight; GameScene flips a goblin
// walking the other way. Each has two frames. Art is drawn in units of `K` screen pixels.

const K = 2;

/** A goblin, 14x18 units: `goblin-0` and `goblin-1` are the two steps of its walk. */
function goblin(scene: Phaser.Scene) {
  for (const frame of [0, 1]) {
    bake(scene, `goblin-${frame}`, 14 * K, 18 * K, (g: Canvas) => {
      // Legs, the far one shaded; in step 1 they stride apart.
      const far = frame ? 4 : 5;
      const near = frame ? 11 : 9;
      limb(g, MAT.goblin.shade, [6, 13], [far, 16.5], 2.2, K);
      limb(g, MAT.goblin.mid, [9, 13], [near, 16.5], 2.2, K);
      for (const x of [far, near]) poly(g, [[x - 1.8, 16.2], [x + 1.8, 16.2], [x + 1.8, 17.6], [x - 1.8, 17.6]], MAT.wood.dark, K);
      // A ragged tunic, lit on the left and shaded on the right, with a belt and buckle.
      poly(g, [[4.5, 8], [8, 8], [8, 14], [4.5, 14]], MAT.wood.mid, K);
      poly(g, [[8, 8], [11.5, 8], [11.5, 14], [8, 14]], MAT.wood.shade, K);
      poly(g, [[4.5, 11], [11.5, 11], [11.5, 12], [4.5, 12]], MAT.wood.dark, K);
      poly(g, [[7.6, 10.6], [8.4, 10.6], [8.4, 12.4], [7.6, 12.4]], MAT.gold.mid, K);
      // The arm that holds the club, in front of the tunic.
      limb(g, MAT.goblin.mid, [5, 9], [3, 10.5], 1.8, K);
      // Head with long ears, a big nose, yellow eyes and tusks, looking left.
      poly(g, [[3, 3.5], [0.5, 1.5], [3.2, 5.2]], MAT.goblin.shade, K);
      poly(g, [[10, 3.4], [12.6, 1.4], [10.4, 5.2]], MAT.goblin.shade, K);
      disk(g, MAT.goblin, 6.5, 4.5, 4, 3.8, K, 8);
      poly(g, [[2.6, 4.6], [0.6, 5.8], [2.8, 6.4]], MAT.goblin.lit, K);
      poly(g, [[4.3, 3.2], [5.6, 3.2], [5.6, 4.6], [4.3, 4.6]], MAT.gold.lit, K);
      poly(g, [[7.3, 3.2], [8.6, 3.2], [8.6, 4.6], [7.3, 4.6]], MAT.gold.lit, K);
      poly(g, [[4.8, 3.5], [5.2, 3.5], [5.2, 4.2], [4.8, 4.2]], 0x1a1216, K);
      poly(g, [[7.7, 3.5], [8.1, 3.5], [8.1, 4.2], [7.7, 4.2]], 0x1a1216, K);
      poly(g, [[4.5, 6.2], [5.2, 7.2], [5.6, 6.2]], MAT.steel.lit, K);
      poly(g, [[7.4, 6.2], [8, 7.2], [8.4, 6.2]], MAT.steel.lit, K);
      // The club, raised in front: a wooden haft with an iron-banded head.
      const clubY = frame ? 5 : 4;
      limb(g, MAT.wood.mid, [2, clubY + 6], [2, clubY + 1.5], 1.4, K);
      poly(g, [[0.6, clubY], [3.6, clubY + 0.4], [3.2, clubY + 3.6], [0.6, clubY + 3.4]], MAT.wood.lit, K);
      poly(g, [[0.6, clubY + 1.4], [3.4, clubY + 1.6], [3.4, clubY + 2.2], [0.6, clubY + 2.0]], MAT.steel.mid, K);
      edge(g, [[0.6, clubY], [3.6, clubY + 0.4], [3.2, clubY + 3.6], [0.6, clubY + 3.4]], K, 1);
    });
  }
}

/** A bat, 20x11 units: `bat-0` with its wings up and `bat-1` with them down. */
function bat(scene: Phaser.Scene) {
  for (const frame of [0, 1]) {
    bake(scene, `bat-${frame}`, 20 * K, 11 * K, (g: Canvas) => {
      // Each wing is two flat facets, lit on the leading edge and shaded behind it; the far wing is
      // mirrored on the body's other side.
      const wing = (side: 1 | -1) => {
        const m = (x: number) => 10 + side * (x - 10);
        if (frame === 0) {
          poly(g, [[m(8.5), 4.2], [m(0.5), 0], [m(3.5), 5.2]], MAT.bat.lit, K);
          poly(g, [[m(8.5), 4.2], [m(3.5), 5.2], [m(5), 7], [m(8), 6.8]], MAT.bat.shade, K);
        } else {
          poly(g, [[m(8.5), 4.8], [m(0.5), 10.5], [m(3.5), 6.2]], MAT.bat.lit, K);
          poly(g, [[m(8.5), 4.8], [m(3.5), 6.2], [m(5.5), 7.2], [m(8.2), 6.6]], MAT.bat.shade, K);
        }
      };
      wing(1);
      wing(-1);
      // Body and ears, with two gold eyes and fangs.
      disk(g, MAT.bat, 10, 5.5, 3.5, 3, K, 8);
      poly(g, [[8.5, 3], [9, 0.5], [10, 2.8]], MAT.bat.mid, K);
      poly(g, [[10, 2.8], [11, 0.5], [11.5, 3]], MAT.bat.mid, K);
      poly(g, [[8.4, 4], [9.2, 4], [9.2, 4.8], [8.4, 4.8]], MAT.gold.lit, K);
      poly(g, [[10.8, 4], [11.6, 4], [11.6, 4.8], [10.8, 4.8]], MAT.gold.lit, K);
      poly(g, [[9, 6.4], [9.5, 7.3], [10, 6.4]], MAT.steel.lit, K);
      poly(g, [[10.5, 6.4], [11, 7.3], [11.5, 6.4]], MAT.steel.lit, K);
      edge(g, ring(10, 5.5, 3.5, 3, 8), K, 1);
    });
  }
}

export function bakeFoes(scene: Phaser.Scene) {
  goblin(scene);
  bat(scene);
}
