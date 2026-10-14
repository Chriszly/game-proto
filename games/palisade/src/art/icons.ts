import Phaser from 'phaser';
import type { EnemyKind } from '../game/enemies';
import type { RelicId } from '../game/relics';
import type { Icon } from '../game/upgrades';
import { facet, gem, line, ngon, paint, poly, rect, softShadow, type Pt } from './lowpoly';

// Low-poly pictures for the upgrades (56 x 56, on the level-up cards and in the skill book), the
// relics, the relic chest, the boss marks on the wave track, and the Arrow Rain button.

type Ctx = CanvasRenderingContext2D;
const S = 56;

export const iconTexture = (icon: Icon) => `icon-${icon}`;
export const relicTexture = (id: RelicId) => `relic-${id}`;
export const bossNodeTexture = (kind: EnemyKind) => `node-${kind}`;

/** An arrow from a to b: shaft, fletching and a steel head. */
function arrow(ctx: Ctx, a: Pt, b: Pt, w = 3, head = '#e2e8ee', headD = '#8e98a4') {
  const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  line(ctx, [a, b], '#d7b98a', w);
  const f = (d: number, side: number): Pt => [a[0] + c * d - s * side, a[1] + s * d + c * side];
  poly(ctx, [f(0, 0), f(-3, -6), f(9, 0)], '#efe7d4');
  poly(ctx, [f(0, 0), f(-3, 6), f(9, 0)], '#b8ad96');
  const t = (d: number, side: number): Pt => [b[0] + c * d - s * side, b[1] + s * d + c * side];
  poly(ctx, [t(-2, -w - 3), t(10, 0), t(-2, 0)], head);
  poly(ctx, [t(-2, 0), t(10, 0), t(-2, w + 3)], headD);
}

function flame(ctx: Ctx, x: number, y: number, s: number) {
  poly(ctx, [[x, y - 22 * s], [x + 12 * s, y - 4 * s], [x + 9 * s, y + 12 * s], [x - 9 * s, y + 12 * s], [x - 12 * s, y - 4 * s]], '#ff8a2a');
  poly(ctx, [[x, y - 22 * s], [x + 12 * s, y - 4 * s], [x + 9 * s, y + 12 * s], [x, y + 2 * s]], '#e0512a');
  poly(ctx, [[x, y - 8 * s], [x + 6 * s, y + 4 * s], [x, y + 12 * s], [x - 6 * s, y + 4 * s]], '#ffe07a');
}

function crystal(ctx: Ctx, x: number, y: number, r: number, rot: number) {
  for (let i = 0; i < 6; i++) {
    const a = rot + (i / 6) * Math.PI * 2;
    const tip: Pt = [x + Math.cos(a) * r, y + Math.sin(a) * r];
    const l: Pt = [x + Math.cos(a - 0.35) * r * 0.35, y + Math.sin(a - 0.35) * r * 0.35];
    const rr: Pt = [x + Math.cos(a + 0.35) * r * 0.35, y + Math.sin(a + 0.35) * r * 0.35];
    poly(ctx, [[x, y], l, tip], '#e8f8ff');
    poly(ctx, [[x, y], tip, rr], '#6aaee0');
  }
  gem(ctx, x, y, r * 0.3, 6, rot, '#3a6aa0', '#a8dcf8');
}

function bolt(ctx: Ctx, x: number, y: number, s: number) {
  const pts: Pt[] = [[x + 4 * s, y - 20 * s], [x - 8 * s, y + 2 * s], [x + 1 * s, y + 2 * s], [x - 5 * s, y + 20 * s], [x + 10 * s, y - 4 * s], [x + 1 * s, y - 4 * s]];
  ctx.save();
  ctx.shadowColor = '#9d8cff';
  ctx.shadowBlur = 8;
  poly(ctx, pts, '#d9d2ff');
  ctx.restore();
  poly(ctx, [pts[0], pts[1], pts[2]], '#ffffff');
}

const ICONS: Record<Icon, (ctx: Ctx) => void> = {
  bow: (ctx) => {
    const t: Pt = [20, 6];
    const g: Pt = [34, 28];
    const b: Pt = [20, 50];
    line(ctx, [t, [12, 28], b], '#f3ead2', 1.5);
    for (const [a, c] of [[t, g], [b, g]] as [Pt, Pt][]) {
      const m: Pt = [(a[0] + c[0]) / 2 + 4, (a[1] + c[1]) / 2];
      poly(ctx, [a, m, c, [c[0] + 4, c[1]], [m[0] + 5, m[1]], [a[0] + 4, a[1]]], '#c08a50');
      poly(ctx, [m, c, [c[0] + 4, c[1]], [m[0] + 5, m[1]]], '#6e4826');
    }
    poly(ctx, rect(g[0] - 2, g[1] - 5, 6, 10), '#4c3020');
    arrow(ctx, [10, 28], [44, 28]);
  },
  tip: (ctx) => {
    line(ctx, [[8, 48], [30, 26]], '#d7b98a', 4);
    poly(ctx, [[26, 22], [48, 8], [34, 30]], '#f2f6fa');
    poly(ctx, [[34, 30], [48, 8], [38, 34]], '#8e98a4');
    poly(ctx, [[22, 26], [26, 22], [34, 30], [30, 34]], '#5c6068');
  },
  volley: (ctx) => {
    arrow(ctx, [6, 14], [40, 14]);
    arrow(ctx, [10, 28], [46, 28]);
    arrow(ctx, [6, 42], [40, 42]);
  },
  pierce: (ctx) => {
    for (const x of [20, 34]) {
      facet(ctx, ngon(x, 28, 7, 16, 6), '#8a5a32', { k: 1.3 });
    }
    arrow(ctx, [4, 28], [48, 28], 3);
  },
  eye: (ctx) => {
    poly(ctx, [[4, 28], [18, 16], [38, 16], [52, 28], [38, 40], [18, 40]], '#f1e8d0');
    poly(ctx, [[4, 28], [52, 28], [38, 40], [18, 40]], '#c9bfa4');
    gem(ctx, 28, 28, 10, 8, 0.2, '#b8862c', '#ffe48a');
    poly(ctx, ngon(28, 28, 4, 4, 6), '#2a1c14');
    poly(ctx, ngon(25, 25, 2, 2, 4), '#ffffff');
  },
  fire: (ctx) => {
    flame(ctx, 28, 30, 1.2);
  },
  frost: (ctx) => crystal(ctx, 28, 28, 22, Math.PI / 6),
  blast: (ctx) => {
    const star = ngon(28, 28, 24, 24, 16, 0).map((p, i) => (i % 2 ? ([28 + (p[0] - 28) * 0.55, 28 + (p[1] - 28) * 0.55] as Pt) : p));
    poly(ctx, star, '#f09a3a');
    poly(ctx, star.map(([x, y]) => [28 + (x - 28) * 0.6, 28 + (y - 28) * 0.6] as Pt), '#f8d460');
    gem(ctx, 28, 30, 9, 7, 0.3, '#24222a', '#5d5a6a');
  },
  fireball: (ctx) => {
    for (let i = 0; i < 4; i++) {
      ctx.globalAlpha = 0.9 - i * 0.18;
      poly(ctx, ngon(22 - i * 6, 34 + i * 4, 9 - i * 1.5, 7 - i, 5, i), i < 2 ? '#ff9b2f' : '#e0512a');
    }
    ctx.globalAlpha = 1;
    gem(ctx, 34, 24, 14, 8, 0.2, '#e8541c', '#ffe08a');
    poly(ctx, ngon(30, 20, 5, 5, 5), '#fff4c8');
  },
  storm: (ctx) => {
    facet(ctx, ngon(28, 14, 20, 9, 8), '#8d93a8', { edge: false });
    bolt(ctx, 28, 34, 1);
  },
  barricade: (ctx) => {
    for (const [y, d] of [[16, 1], [30, -1], [44, 1]]) {
      const a: Pt = [10, y + 8 * d];
      const b: Pt = [46, y - 8 * d];
      line(ctx, [a, b], '#a8743f', 4);
      poly(ctx, [[b[0] - 2, b[1] - 3], [b[0] + 6, b[1] - 2 * d], [b[0] - 2, b[1] + 3]], '#f3d7aa');
    }
    poly(ctx, rect(23, 4, 5, 48), '#c48c56');
    poly(ctx, rect(28, 4, 5, 48), '#6a4426');
  },
  book: (ctx) => {
    poly(ctx, [[8, 12], [28, 16], [28, 48], [8, 44]], '#3a6aa0');
    poly(ctx, [[28, 16], [48, 12], [48, 44], [28, 48]], '#2a4f7a');
    poly(ctx, [[11, 14], [27, 18], [27, 44], [11, 41]], '#f1e8d0');
    poly(ctx, [[29, 18], [45, 14], [45, 41], [29, 44]], '#d8cfb4');
    for (let i = 0; i < 4; i++) line(ctx, [[14, 22 + i * 5], [24, 24 + i * 5]], '#8a7a5a', 1);
    gem(ctx, 37, 28, 5, 4, 0, '#b8862c', '#ffe48a');
  },
  mend: (ctx) => {
    // A plank and a hammer.
    poly(ctx, [[6, 40], [44, 26], [48, 34], [10, 48]], '#c99260');
    poly(ctx, [[10, 48], [48, 34], [48, 37], [11, 51]], '#7a5230');
    line(ctx, [[18, 10], [38, 34]], '#93653a', 4);
    poly(ctx, [[8, 14], [20, 2], [28, 10], [16, 22]], '#9aa4ae');
    poly(ctx, [[16, 22], [28, 10], [30, 13], [18, 25]], '#5d5a6a');
  },
};

const RELIC_ICONS: Record<RelicId, (ctx: Ctx) => void> = {
  oakheart: (ctx) => {
    facet(ctx, [[28, 6], [40, 14], [46, 28], [40, 42], [28, 50], [16, 42], [10, 28], [16, 14]], '#5f9a45', { k: 1.4 });
    line(ctx, [[28, 10], [28, 48]], '#2d5e2c', 2);
    poly(ctx, ngon(28, 30, 7, 9, 6), '#a8743f', '#4c3020', 1);
  },
  feather: (ctx) => {
    poly(ctx, [[12, 50], [22, 30], [36, 10], [46, 6], [42, 18], [30, 36]], '#f1e8d0');
    poly(ctx, [[12, 50], [30, 36], [42, 18], [46, 6], [38, 26], [24, 42]], '#b8a888');
    line(ctx, [[10, 52], [44, 10]], '#6e4826', 1.5);
  },
  quiver: (ctx) => {
    for (const dx of [-6, 0, 6]) line(ctx, [[24 + dx, 30], [30 + dx, 6]], '#d7b98a', 2);
    for (const dx of [-6, 0, 6]) poly(ctx, [[30 + dx, 6], [26 + dx, 10], [33 + dx, 11]], '#efe7d4');
    facet(ctx, [[16, 22], [36, 22], [34, 52], [18, 52]], '#86522c', { k: 1.4 });
    poly(ctx, rect(16, 26, 20, 4), '#e5b53a');
  },
  crown: (ctx) => {
    facet(ctx, [[8, 44], [8, 18], [18, 30], [28, 12], [38, 30], [48, 18], [48, 44]], '#e5b53a', { k: 1.4 });
    poly(ctx, rect(8, 40, 40, 6), '#b8862c');
    gem(ctx, 28, 34, 4, 6, 0, '#5b2f66', '#c25bd1');
  },
  drum: (ctx) => {
    facet(ctx, [[10, 20], [46, 20], [44, 46], [12, 46]], '#a8743f', { k: 1.3 });
    poly(ctx, ngon(28, 20, 18, 6, 10), '#f1e8d0', '#8a5a32', 1.5);
    for (let i = 0; i < 4; i++) line(ctx, [[12 + i * 10, 24], [18 + i * 10, 44]], '#e5b53a', 1.5);
    line(ctx, [[34, 4], [44, 16]], '#6e4826', 2.5);
  },
  banner: (ctx) => {
    line(ctx, [[14, 6], [14, 52]], '#6e4826', 3);
    facet(ctx, [[16, 8], [46, 8], [40, 22], [46, 36], [16, 36]], '#e0512a', { k: 1.3, edge: false });
    flame(ctx, 28, 24, 0.5);
  },
};

export function bakeIcons(scene: Phaser.Scene) {
  for (const [icon, draw] of Object.entries(ICONS)) paint(scene, iconTexture(icon as Icon), S, S, draw);
  for (const [id, draw] of Object.entries(RELIC_ICONS)) paint(scene, relicTexture(id as RelicId), S, S, draw);
  // The relic chest, closed and thrown open.
  for (const open of [false, true]) {
    paint(scene, open ? 'chest-open' : 'chest', 48, 40, (ctx) => {
      softShadow(ctx, () => poly(ctx, rect(10, 30, 36, 8), '#000000'), 2, 0.4);
      if (open) {
        ctx.save();
        ctx.shadowColor = '#ffd23a';
        ctx.shadowBlur = 12;
        poly(ctx, [[10, 22], [38, 22], [44, 2], [4, 2]], 'rgba(255,224,122,0.55)');
        ctx.restore();
        poly(ctx, [[8, 20], [12, 6], [36, 6], [40, 20]], '#5e3f24');
      }
      facet(ctx, [[6, 20], [42, 20], [42, 36], [6, 36]], '#8a5a2c', { k: 1.3 });
      if (!open) facet(ctx, [[6, 20], [10, 8], [38, 8], [42, 20]], '#b57a3e', { k: 1.3 });
      poly(ctx, rect(6, 19, 36, 3), '#e5b53a');
      poly(ctx, rect(21, 17, 6, 9), '#ffd36a');
    });
  }
  // The boss marks at the end of the wave track: a hexagon with the boss's headgear.
  const marks: Record<'troll' | 'ogre' | 'giant', [string, string, (ctx: Ctx) => void]> = {
    troll: ['#5b2f66', '#c25bd1', (ctx) => poly(ctx, [[9, 26], [8, 13], [15, 19], [20, 9], [25, 19], [32, 13], [31, 26]], '#ffd36a')],
    ogre: ['#4a3a2a', '#d08a4a', (ctx) => {
      poly(ctx, [[10, 26], [12, 16], [20, 12], [28, 16], [30, 26]], '#aab2bc');
      poly(ctx, [[12, 16], [5, 8], [9, 6], [15, 14]], '#efe5c9');
      poly(ctx, [[28, 16], [35, 8], [31, 6], [25, 14]], '#efe5c9');
    }],
    giant: ['#24486a', '#7fbde6', (ctx) => poly(ctx, [[9, 26], [7, 10], [14, 18], [20, 5], [26, 18], [33, 10], [31, 26]], '#e8f8ff')],
  };
  for (const [kind, [fill, edge, draw]] of Object.entries(marks)) {
    paint(scene, bossNodeTexture(kind as EnemyKind), 40, 40, (ctx) => {
      poly(ctx, ngon(20, 20, 19, 19, 6, Math.PI / 6), fill, edge, 2);
      draw(ctx);
    });
  }
  // The Arrow Rain button: an octagon gem with three falling arrows, gold when charged.
  for (const ready of [false, true]) {
    paint(scene, ready ? 'rain-ready' : 'rain-charging', 64, 64, (ctx) => {
      const c = 32;
      if (ready) {
        ctx.save();
        ctx.shadowColor = '#ffcf4a';
        ctx.shadowBlur = 10;
        poly(ctx, ngon(c, c, 28, 28, 8, Math.PI / 8), '#e5b53a');
        ctx.restore();
      }
      gem(ctx, c, c, 28, 8, Math.PI / 8, ready ? '#b07a1a' : '#3a404c', ready ? '#ffe48a' : '#7a8294');
      facet(ctx, ngon(c, c, 21, 21, 8, Math.PI / 8), '#2b3242', { edge: false, off: 0.05 });
      ctx.globalAlpha = ready ? 1 : 0.55;
      for (const dx of [-8, 0, 8]) {
        ctx.save();
        ctx.translate(c + dx, c - 3 + Math.abs(dx) * 0.4);
        ctx.rotate(1.2);
        poly(ctx, rect(-10, -1, 15, 2), '#f1e3bf');
        poly(ctx, [[5, -3], [11, 0], [5, 3]], '#ffd36a');
        poly(ctx, [[-10, -0.5], [-13, -3.5], [-7, -0.5]], '#ffffff');
        ctx.restore();
      }
    });
  }
  // The streak's flame and the skill book's little red book, for the HUD.
  paint(scene, 'hud-flame', 20, 26, (ctx) => flame(ctx, 10, 13, 0.55));
  paint(scene, 'hud-book', 22, 20, (ctx) => {
    poly(ctx, [[1, 3], [11, 5], [11, 19], [1, 17]], '#c8503a');
    poly(ctx, [[11, 5], [21, 3], [21, 17], [11, 19]], '#93382a');
  });
}
