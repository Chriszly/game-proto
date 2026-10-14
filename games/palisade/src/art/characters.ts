import Phaser from 'phaser';
import type { EnemyKind } from '../game/enemies';
import { facet, gem, line, ngon, paint, poly, rect, softShadow, type Pt } from './lowpoly';

// The ranger, the foes and the missiles as faceted low-poly figures, each part a flat-shaded
// pyramid lit from the top left, with a soft shadow on the road to the lower right. A figure is a
// rig: a list of parts in local units with the feet at 0,0 and up negative. Foes face left, towards
// the barricade; the ranger faces right. Each foe has two walk frames (its legs apart and together).

type Rig = { m: string; p?: Pt[]; c?: Pt; r?: number }[];

const PAL: Record<string, string> = {
  skin: '#79b24a', skinD: '#5a8d36', tunic: '#8b5a32', belt: '#4c3020', eye: '#ffd84a', steel: '#c9d2dc', boot: '#3d2b1d',
  cloth: '#5e4532', leather: '#86522c', iron: '#7d8590', bone: '#efe5c9', wood: '#93653a', plate: '#4a4f62', plateL: '#5d6379',
  tabard: '#5b2f66', plume: '#b8343c', shield: '#2f4f8a', gold: '#e5b53a', cloakD: '#245c34', cloak: '#3a8a46',
  trousers: '#4f4766', face: '#e3ad84', fletch: '#efe7d4', eyeD: '#2a1c14', gemP: '#9b4fd1',
};

const RIGS: Record<'hero' | 'goblin' | 'orc' | 'knight', Rig> = {
  goblin: [
    { m: 'skinD', p: [[3, 0], [11, 0], [10, -22], [3, -22]] },
    { m: 'skinD', p: [[14, -44], [20, -42], [22, -26], [16, -24]] },
    { m: 'skin', p: [[-11, 0], [-2, 0], [-3, -22], [-11, -22]] },
    { m: 'tunic', p: [[-15, -18], [15, -18], [12, -46], [-12, -46]] },
    { m: 'belt', p: [[-14, -24], [14, -24], [14, -29], [-14, -29]] },
    { m: 'skinD', p: [[10, -62], [30, -76], [14, -54]] },
    { m: 'skin', p: [[-17, -52], [-15, -68], [-4, -76], [9, -72], [13, -58], [7, -47], [-8, -45]] },
    { m: 'skin', p: [[-14, -64], [-34, -74], [-16, -57]] },
    { m: 'eye', p: [[-12, -63], [-6, -64], [-6, -59], [-12, -59]] },
    { m: 'eye', p: [[-2, -63], [3, -63], [3, -59], [-2, -59]] },
    { m: 'skin', p: [[-12, -44], [-5, -41], [-16, -27], [-22, -31]] },
    { m: 'steel', p: [[-22, -30], [-17, -27], [-31, -10], [-35, -13]] },
  ],
  orc: [
    { m: 'boot', p: [[4, 0], [19, 0], [17, -9], [4, -9]] },
    { m: 'cloth', p: [[4, -8], [16, -8], [15, -30], [4, -30]] },
    { m: 'skinD', p: [[17, -62], [28, -58], [30, -34], [20, -34]] },
    { m: 'boot', p: [[-18, 0], [-3, 0], [-3, -9], [-16, -9]] },
    { m: 'cloth', p: [[-15, -8], [-3, -8], [-4, -30], [-15, -30]] },
    { m: 'leather', p: [[-21, -27], [21, -27], [23, -64], [-21, -66]] },
    { m: 'belt', p: [[-21, -27], [21, -27], [21, -35], [-21, -35]] },
    { m: 'skin', p: [[-19, -66], [-21, -82], [-12, -92], [6, -92], [13, -82], [11, -66], [-2, -62]] },
    { m: 'iron', p: [[-23, -82], [-15, -98], [2, -103], [14, -94], [15, -82]] },
    { m: 'bone', p: [[-18, -70], [-15, -78], [-13, -70]] },
    { m: 'eye', p: [[-16, -84], [-9, -84], [-9, -80], [-16, -80]] },
    { m: 'iron', p: [[-25, -60], [-8, -68], [-3, -57], [-23, -51]] },
    { m: 'skin', p: [[-15, -60], [-6, -55], [-23, -79], [-29, -75]] },
    { m: 'wood', p: [[-28, -70], [-24, -73], [-31, -116], [-35, -114]] },
    { m: 'steel', p: [[-32, -108], [-50, -122], [-52, -100], [-33, -98]] },
  ],
  knight: [
    { m: 'plate', p: [[4, 0], [16, 0], [15, -34], [4, -34]] },
    { m: 'plate', p: [[-15, 0], [-3, 0], [-4, -34], [-15, -34]] },
    { m: 'steel', p: [[14, -62], [19, -64], [33, -108], [28, -110]] },
    { m: 'gold', p: [[9, -63], [24, -58], [25, -63], [10, -68]] },
    { m: 'plateL', p: [[-21, -31], [21, -31], [21, -72], [-19, -74]] },
    { m: 'tabard', p: [[-12, -31], [11, -31], [9, -62], [-10, -62]] },
    { m: 'plate', p: [[-17, -72], [-19, -94], [-7, -104], [10, -102], [17, -90], [15, -72]] },
    { m: 'eye', p: [[-19, -88], [-5, -88], [-5, -84], [-19, -84]] },
    { m: 'plume', p: [[2, -102], [10, -116], [24, -114], [31, -100], [15, -97]] },
    { m: 'shield', p: [[-38, -66], [-15, -66], [-15, -38], [-26, -24], [-38, -38]] },
    { m: 'gold', c: [-26.5, -48], r: 6 },
  ],
  hero: [
    { m: 'cloakD', p: [[-28, -28], [-6, -22], [-4, -102], [-24, -98]] },
    { m: 'boot', p: [[-17, 0], [-2, 0], [-2, -11], [-15, -11]] },
    { m: 'boot', p: [[4, 0], [20, 0], [17, -11], [4, -11]] },
    { m: 'trousers', p: [[-15, -10], [-3, -10], [-3, -42], [-15, -42]] },
    { m: 'trousers', p: [[4, -10], [16, -10], [15, -42], [4, -42]] },
    { m: 'leather', p: [[-27, -70], [-17, -104], [-10, -102], [-20, -66]] },
    { m: 'fletch', p: [[-17, -104], [-22, -114], [-13, -108]] },
    { m: 'fletch', p: [[-12, -103], [-12, -114], [-8, -104]] },
    { m: 'tunic', p: [[-17, -38], [17, -38], [15, -86], [-15, -88]] },
    { m: 'belt', p: [[-17, -48], [17, -48], [17, -55], [-17, -55]] },
    { m: 'cloak', p: [[-19, -84], [-23, -110], [-8, -128], [11, -126], [19, -110], [17, -92], [4, -84]] },
    { m: 'face', p: [[1, -93], [1, -115], [13, -115], [17, -105], [13, -93]] },
    { m: 'eyeD', p: [[8, -109], [12, -109], [12, -105], [8, -105]] },
    { m: 'tunic', p: [[8, -82], [14, -84], [42, -76], [40, -69]] },
    { m: 'face', p: [[38, -78], [46, -78], [46, -70], [38, -70]] },
  ],
};

/**
 * The three bosses share one hulking body: a pot belly, long arms, a small head with tusks, and
 * each their own colours, headgear and weapon.
 */
function bossRig(kind: 'troll' | 'ogre' | 'giant'): { rig: Rig; pal: Record<string, string> } {
  const pal = {
    troll: { skin: '#6f9a4a', skinD: '#4f7434', hide: '#6a4a2c', gear: '#e5b53a', gearD: '#b8862c', weapon: '#7a5230', tip: '#9aa4ae' },
    ogre: { skin: '#c08a5c', skinD: '#94643e', hide: '#4a3a5a', gear: '#7d8590', gearD: '#555c66', weapon: '#6a4426', tip: '#d8e0e8' },
    giant: { skin: '#8fb6d8', skinD: '#6488ac', hide: '#e8eef4', gear: '#c8ecff', gearD: '#7fbde6', weapon: '#a9dcf4', tip: '#ffffff' },
  }[kind];
  const body: Rig = [
    { m: 'skinD', p: [[6, 0], [28, 0], [26, -42], [8, -42]] },
    { m: 'skinD', p: [[24, -104], [40, -96], [42, -54], [28, -52]] },
    { m: 'skin', p: [[-26, 0], [-4, 0], [-6, -42], [-24, -42]] },
    { m: 'skinD', p: [[-30, 0], [-2, 0], [-4, -8], [-28, -8]] },
    { m: 'hide', p: [[-30, -34], [28, -34], [24, -54], [-28, -54]] },
    { m: 'skin', p: [[-36, -50], [32, -50], [38, -92], [22, -114], [-22, -116], [-38, -94]] },
    { m: 'skin', p: [[-26, -110], [-28, -128], [-16, -142], [4, -142], [14, -130], [12, -112]] },
    { m: 'skinD', p: [[-28, -126], [-36, -121], [-25, -117]] },
    { m: 'bone', p: [[-23, -116], [-21, -125], [-17, -116]] },
    { m: 'bone', p: [[-9, -114], [-7, -123], [-4, -114]] },
    { m: 'eye', p: [[-21, -131], [-14, -131], [-14, -127], [-21, -127]] },
  ];
  const head: Rig =
    kind === 'troll'
      ? [
          { m: 'gear', p: [[-24, -140], [-26, -160], [-16, -150], [-7, -165], [2, -150], [11, -160], [11, -140]] },
          { m: 'gemP', c: [-7, -146], r: 3.5 },
        ]
      : kind === 'ogre'
        ? [
            { m: 'gear', p: [[-28, -128], [-24, -148], [-8, -156], [8, -150], [16, -130]] },
            { m: 'bone', p: [[-24, -146], [-40, -160], [-36, -170], [-22, -152]] },
            { m: 'bone', p: [[10, -146], [22, -164], [26, -158], [16, -140]] },
          ]
        : [
            { m: 'gear', p: [[-24, -140], [-28, -168], [-18, -150], [-10, -176], [-2, -150], [8, -170], [12, -140]] },
            { m: 'gearD', p: [[-10, -176], [-2, -150], [-10, -146]] },
          ];
  const weapon: Rig =
    kind === 'ogre'
      ? [
          { m: 'weapon', p: [[-44, -60], [-38, -58], [-46, -168], [-52, -166]] },
          { m: 'tip', p: [[-50, -160], [-80, -170], [-84, -134], [-50, -140]] },
          { m: 'tip', p: [[-48, -160], [-30, -156], [-30, -144], [-48, -144]] },
        ]
      : [
          { m: 'weapon', p: [[-50, -62], [-38, -58], [-46, -150], [-66, -146]] },
          { m: 'tip', p: [[-64, -140], [-74, -144], [-64, -132]] },
          { m: 'tip', p: [[-50, -146], [-48, -158], [-42, -146]] },
          { m: 'tip', p: [[-62, -116], [-72, -116], [-62, -108]] },
        ];
  const arm: Rig = [{ m: 'skin', p: [[-30, -106], [-12, -98], [-34, -58], [-48, -64]] }];
  return { rig: [...body, ...head, ...weapon, ...arm], pal: { ...PAL, ...pal } };
}

/** How big each figure is drawn: view pixels per rig unit. */
const SCALE: Record<'hero' | EnemyKind, number> = { hero: 0.5, goblin: 0.61, orc: 0.57, knight: 0.55, troll: 0.78, ogre: 0.8, giant: 0.84 };

/** Where a figure's feet are in its texture (as an origin) and how tall it stands, in view pixels. */
export interface Figure {
  originX: number;
  originY: number;
  height: number;
}
export const FIGURES: Partial<Record<string, Figure>> = {};

export const foeTexture = (kind: EnemyKind, frame: number) => `foe-${kind}-${frame}`;

export function bakeCharacters(scene: Phaser.Scene) {
  bakeFigure(scene, 'hero', RIGS.hero, PAL, SCALE.hero, drawBow);
  for (const kind of ['goblin', 'orc', 'knight'] as const) {
    for (const frame of [0, 1]) bakeFigure(scene, foeTexture(kind, frame), stride(RIGS[kind], frame), PAL, SCALE[kind]);
  }
  for (const kind of ['troll', 'ogre', 'giant'] as const) {
    const { rig, pal } = bossRig(kind);
    for (const frame of [0, 1]) bakeFigure(scene, foeTexture(kind, frame), stride(rig, frame), pal, SCALE[kind]);
  }
}

/** The second walk frame: the legs (parts below the hips) stepped together. */
function stride(rig: Rig, frame: number): Rig {
  if (frame === 0) return rig;
  return rig.map((part) => {
    if (!part.p || part.p.some(([, y]) => y < -44)) return part;
    const cx = part.p.reduce((s, [x]) => s + x, 0) / part.p.length;
    const dx = cx < 0 ? 5 : -5;
    return { ...part, p: part.p.map(([x, y]) => [x + dx * (1 + y / 44), y] as Pt) };
  });
}

function bakeFigure(scene: Phaser.Scene, key: string, rig: Rig, pal: Record<string, string>, k: number, extra?: (ctx: CanvasRenderingContext2D) => void) {
  const pts = rig.flatMap((part) => part.p ?? [part.c!]);
  if (extra) pts.push([62, -120], [62, -24]);
  const minX = Math.min(...pts.map((p) => p[0])) - 6;
  const maxX = Math.max(...pts.map((p) => p[0])) + 30;
  const minY = Math.min(...pts.map((p) => p[1])) - 8;
  const maxY = 14;
  const w = (maxX - minX) * k;
  const h = (maxY - minY) * k;
  paint(scene, key, w, h, (ctx) => {
    ctx.scale(k, k);
    ctx.translate(-minX, -minY);
    // A soft shadow on the road, falling to the lower right.
    const r = Math.max(28, (maxX - minX - 36) * 0.55);
    softShadow(ctx, () => poly(ctx, ngon(r * 0.35, 3, r, 9, 12), '#2a1808'), 3 / k, 0.4);
    for (const part of rig) {
      const shape = part.c ? ngon(part.c[0], part.c[1], part.r!, part.r!, 8) : part.p!;
      if (part.m === 'eye') {
        ctx.save();
        ctx.shadowColor = '#ffcf3a';
        ctx.shadowBlur = 6;
        poly(ctx, shape, pal.eye);
        ctx.restore();
        continue;
      }
      facet(ctx, shape, pal[part.m], { k: 1.2 });
    }
    extra?.(ctx);
  });
  FIGURES[key] = { originX: (-minX * k) / w, originY: (-minY * k) / h, height: -(minY + 8) * k };
}

/** The ranger's bow, drawn and nocked. */
function drawBow(ctx: CanvasRenderingContext2D) {
  const t: Pt = [44, -116];
  const g: Pt = [62, -72];
  const b: Pt = [44, -28];
  const pull: Pt = [26, -72];
  line(ctx, [t, pull, b], '#f3ead2', 2);
  const limb = (a: Pt, c: Pt) => {
    const m: Pt = [(a[0] + c[0]) / 2 + 6, (a[1] + c[1]) / 2];
    poly(ctx, [a, m, c, [c[0] + 6, c[1]], [m[0] + 7, m[1]], [a[0] + 6, a[1]]], '#a8743f');
    poly(ctx, [m, c, [c[0] + 6, c[1]], [m[0] + 7, m[1]]], '#6e4826');
  };
  limb(t, g);
  limb(b, g);
  poly(ctx, rect(g[0] - 3, g[1] - 8, 9, 16), '#4c3020');
  line(ctx, [pull, [g[0] + 26, g[1]]], '#d9c49c', 3);
  poly(ctx, [[g[0] + 26, g[1] - 5], [g[0] + 40, g[1]], [g[0] + 26, g[1] + 5]], '#c9d2dc');
}

/** Arrows (plain, fire and frost), the fireball, and the Arrow Rain shaft. */
export function bakeMissiles(scene: Phaser.Scene) {
  const arrow = (key: string, glow: string | null, head: string, headD: string) =>
    paint(scene, key, 44, 16, (ctx) => {
      ctx.translate(30, 8);
      ctx.scale(0.5, 0.5);
      if (glow) {
        ctx.globalAlpha = 0.5;
        poly(ctx, [[-56, -2], [-10, -1], [-10, 1], [-56, 2]], glow);
        ctx.globalAlpha = 1;
      }
      poly(ctx, rect(-28, -2, 34, 4), '#d7b98a');
      poly(ctx, [[-30, -1], [-38, -8], [-26, -2]], '#efe7d4');
      poly(ctx, [[-30, 1], [-38, 8], [-26, 2]], '#b8ad96');
      if (glow) {
        ctx.shadowColor = glow;
        ctx.shadowBlur = 10;
      }
      poly(ctx, [[6, -6], [20, 0], [6, 6]], head);
      poly(ctx, [[6, 0], [20, 0], [6, 6]], headD);
    });
  arrow('arrow', null, '#e2e8ee', '#8e98a4');
  arrow('arrow-fire', '#ff9a2a', '#ffd27a', '#f08a24');
  arrow('arrow-frost', '#7fd0ff', '#e8f8ff', '#6aaee0');
  paint(scene, 'fireball', 48, 28, (ctx) => {
    ctx.translate(34, 14);
    ctx.scale(0.5, 0.5);
    ctx.shadowColor = '#ff8a1e';
    ctx.shadowBlur = 16;
    for (let i = 0; i < 4; i++) {
      const tx = -26 - i * 10;
      const s = 12 - i * 2.4;
      ctx.globalAlpha = 0.85 - i * 0.18;
      poly(ctx, ngon(tx, i % 2 ? 3 : -3, s, s * 0.8, 5, i), i < 2 ? '#ff9b2f' : '#e0512a');
    }
    ctx.globalAlpha = 1;
    gem(ctx, 0, 0, 20, 8, 0.2, '#e8541c', '#ffe08a');
    poly(ctx, ngon(-5, -5, 7, 7, 5), '#fff4c8');
  });
  paint(scene, 'rain-arrow', 12, 40, (ctx) => {
    ctx.translate(6, 0);
    poly(ctx, rect(-1, 6, 2, 26), '#fff2c4');
    poly(ctx, [[-4, 30], [0, 39], [4, 30]], '#ffffff');
    poly(ctx, [[-1, 6], [-5, 0], [-1, 10]], '#ffe08a');
    poly(ctx, [[1, 6], [5, 0], [1, 10]], '#e5b53a');
  });
  // A faceted shard for death puffs and splinters of the Arrow Rain landing.
  paint(scene, 'shard', 16, 14, (ctx) => facet(ctx, ngon(8, 7, 7, 6, 5, 0.4), '#d8d2c8', { edge: false }));
}
