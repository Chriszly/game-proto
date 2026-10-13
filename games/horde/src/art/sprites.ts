import Phaser from 'phaser';
import { UPGRADE_KINDS, type UpgradeKind } from '../game/rules';

// Placeholder pixel art, baked into textures at startup so the prototype needs no asset files.
// Each sprite is a character grid ('.' = transparent); a dark outline is added around it when baked.

type Palette = Record<string, number>;

const OUTLINE = 0x15110e;

/** Bakes a character grid into a texture, each character a `scale` x `scale` block, outlined. */
function bake(scene: Phaser.Scene, key: string, rows: string[], palette: Palette, scale = 3) {
  const h = rows.length + 2, w = rows[0].length + 2;
  const at = (x: number, y: number) => (y >= 1 && y <= rows.length && x >= 1 && x <= rows[0].length ? rows[y - 1][x - 1] : '.');
  const g = scene.add.graphics();
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const c = at(x, y);
      let color: number | undefined;
      if (c !== '.') color = palette[c];
      else if ([at(x - 1, y), at(x + 1, y), at(x, y - 1), at(x, y + 1)].some((n) => n !== '.')) color = OUTLINE;
      if (color !== undefined) g.fillStyle(color, 1).fillRect(x * scale, y * scale, scale, scale);
    }
  }
  if (scene.textures.exists(key)) scene.textures.remove(key);
  g.generateTexture(key, w * scale, h * scale);
  g.destroy();
}

/** The hero seen from behind, rifle raised, as the horde comes at them. */
const HERO = [
  '...........b....',
  '...........b....',
  '.....HHHH..b....',
  '....HhhhhH.b....',
  '....HhhhhH.b....',
  '....HHHHHH.b....',
  '.....ssss..b....',
  '..UUUUUUUUsbs...',
  '.UuPPPPPPuUbU...',
  '.UuPpPPpPuUU....',
  '.UuPPPPPPuU.....',
  '.s.PPPPPP.......',
  '...UUUUUU.......',
  '...UU..UU.......',
  '...UU..UU.......',
  '...BB..BB.......',
];
/** Where across the hero's texture the rifle is, as a fraction of its width (outline included). */
export const HERO_RIFLE_X = (1 + 11 + 0.5) / (HERO[0].length + 2);
const HERO_PALETTE: Palette = {
  H: 0x3d5229, h: 0x56713a, s: 0xd9a46f, U: 0x5d6b3a, u: 0x46512b,
  P: 0x6b4a2b, p: 0x8a6438, b: 0x22201e, B: 0x2a2018,
};

const GRUNT = [
  '....gggg....',
  '...gGGGGg...',
  '...GrGGrG...',
  '...GGmmGG...',
  '....GGGG....',
  '.GGTTTTTTGG.',
  'G..TttTTT..G',
  '...TTTtTT...',
  '...TTTTTT...',
  '...PP..PP...',
  '...PP..PP...',
  '...ff..ff...',
];
const GRUNT_PALETTE: Palette = {
  g: 0x7fa35a, G: 0x6b8f4a, r: 0xff3b2f, m: 0x2b1a14,
  T: 0x6e5a4a, t: 0x8a3b30, P: 0x3a3a4e, f: 0x52703a,
};

const RUNNER = [
  '...yyy...',
  '..yYYYy..',
  '..YrYrY..',
  '..YYmYY..',
  'Y..YYY..Y',
  '.YTTTTTY.',
  '..TTtTT..',
  '..TTTTT..',
  '..P...P..',
  '.P.....P.',
  '.f.....f.',
];
const RUNNER_PALETTE: Palette = { y: 0xc9c27a, Y: 0xa9a35e, r: 0xff5a2f, m: 0x2b1a14, T: 0x4b5d6e, t: 0x8a3b30, P: 0x2e2e3a, f: 0x8f8a4f };

const BRUTE = [
  '.....pppppp.....',
  '....pPPPPPPp....',
  '....PrrPPrrP....',
  '....PPPmmPPP....',
  '....PPmmmmPP....',
  '..PPPPPPPPPPPP..',
  '.PPTTTTTTTTTTPP.',
  'PPTTTTtTTTTTTTPP',
  'PP.TTTTTTttTT.PP',
  'PP.TTTTTTTTTT.PP',
  'pp.TTTTTTTTTT.pp',
  '...TTTTTTTTTT...',
  '...LLLL..LLLL...',
  '...LLLL..LLLL...',
  '...LLLL..LLLL...',
  '...ppp....ppp...',
];
const BRUTE_PALETTE: Palette = { p: 0x8a7a9a, P: 0x6f6280, r: 0xff3b2f, m: 0x2b1a14, T: 0x5a3b2a, t: 0x8a3b30, L: 0x3a3048 };

const BOSS = [
  '.h..................h.',
  '.hh................hh.',
  '..hh..cccccccccc..hh..',
  '...hhcCCCCCCCCCCchh...',
  '....cCCCCCCCCCCCCc....',
  '....CCrrrCCCCrrrCC....',
  '....CCryrCCCCryrCC....',
  '....CCCCCCCCCCCCCC....',
  '....CCCmmmmmmmmCCC....',
  '....CCCmwmwwmwmCCC....',
  '.....CCCCCCCCCCCC.....',
  '..CCCCCCCCCCCCCCCCCC..',
  '.CCAAAAAAAAAAAAAAAACC.',
  'CCCAAAAAAaAAAAAAAAACCC',
  'CC.AAAAAAAAAAAAaAAA.CC',
  'CC.AAAAAaAAAAAAAAAA.CC',
  'CC.AAAAAAAAAAAAAAAA.CC',
  'cc.AAAAAAAAAaAAAAAA.cc',
  '...AAAAAAAAAAAAAAAA...',
  '...LLLLLL....LLLLLL...',
  '...LLLLLL....LLLLLL...',
  '...LLLLLL....LLLLLL...',
  '...cccccc....cccccc...',
];
const BOSS_PALETTE: Palette = {
  h: 0xe8dcc0, c: 0xb34a3a, C: 0x8f3328, r: 0xffd23f, y: 0xfff4b0, m: 0x2b1010, w: 0xe8dcc0,
  A: 0x3d2a24, a: 0x5c4034, L: 0x2a1c18,
};

const BULLET = ['y', 'Y', 'Y', 'o'];
const BULLET_PALETTE: Palette = { y: 0xfff4b0, Y: 0xffd23f, o: 0xff8a2f };

/** Each upgrade's colour, on its crate's band and its label. */
export const UPGRADE_COLORS: Record<UpgradeKind, number> = {
  rate: 0xffd23f,
  damage: 0xff5a4a,
  multishot: 0x4ab0ff,
  pierce: 0x6ae06a,
};

const CRATE = [
  'WWWWWWWWWWWWWW',
  'WwwwwwwwwwwwwW',
  'WwWwwwwwwwwWwW',
  'WwwWwwwwwwWwwW',
  'BBBBBBBBBBBBBB',
  'BBBBBBBBBBBBBB',
  'BBBBBBBBBBBBBB',
  'BBBBBBBBBBBBBB',
  'WwwWwwwwwwWwwW',
  'WwWwwwwwwwwWwW',
  'WwwwwwwwwwwwwW',
  'WWWWWWWWWWWWWW',
];

const SANDBAG = [
  '.SSSSSS.',
  'SssssssS',
  'SssssssS',
  'SSSSSSSS',
];
const SANDBAG_PALETTE: Palette = { S: 0x8f7a52, s: 0xb39b6a };

/** A splat left for a moment where an enemy fell. */
const SPLAT = [
  '..g...g..',
  '.ggg.ggg.',
  'gggGGGggg',
  '.gGGGGGg.',
  'ggGGGGGgg',
  '.ggGGGgg.',
  '..g.g.g..',
];

export function bakeSprites(scene: Phaser.Scene) {
  bake(scene, 'hero', HERO, HERO_PALETTE);
  bake(scene, 'grunt', GRUNT, GRUNT_PALETTE);
  bake(scene, 'runner', RUNNER, RUNNER_PALETTE);
  bake(scene, 'brute', BRUTE, BRUTE_PALETTE);
  bake(scene, 'boss', BOSS, BOSS_PALETTE, 4);
  bake(scene, 'bullet', BULLET, BULLET_PALETTE, 3);
  for (const kind of UPGRADE_KINDS) bake(scene, `crate-${kind}`, CRATE, { W: 0x6b4a2b, w: 0x9a6c3e, B: UPGRADE_COLORS[kind] });
  bake(scene, 'sandbag', SANDBAG, SANDBAG_PALETTE);
  bake(scene, 'splat', SPLAT, { g: 0x4f6b35, G: 0x3b5228 }, 3);
  bakeGround(scene);
}

/** One screen-wide strip of the road the horde comes down, tiled and scrolled to look like a march. */
function bakeGround(scene: Phaser.Scene) {
  const w = 540, h = 240;
  const g = scene.add.graphics();
  g.fillStyle(0x3b3a2c).fillRect(0, 0, w, h);
  // Rubble at the roadside.
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 90; i++) {
    const x = rand() < 0.5 ? rand() * 70 : w - rand() * 70;
    g.fillStyle(rand() < 0.5 ? 0x4c4a38 : 0x2e2d22).fillRect(Math.floor(x / 3) * 3, Math.floor((rand() * h) / 3) * 3, 6, 3);
  }
  // The road, with cracks, a kerb and lane dashes.
  g.fillStyle(0x2c2c30).fillRect(60, 0, w - 120, h);
  g.fillStyle(0x6a6658).fillRect(54, 0, 6, h).fillRect(w - 60, 0, 6, h);
  for (let i = 0; i < 40; i++) g.fillStyle(rand() < 0.5 ? 0x34343a : 0x252529).fillRect(66 + Math.floor((rand() * (w - 140)) / 3) * 3, Math.floor((rand() * h) / 3) * 3, 3 + Math.floor(rand() * 3) * 3, 3);
  g.fillStyle(0xb8a45a);
  for (let y = 0; y < h; y += 80) {
    g.fillRect(w / 3 - 3, y + 10, 6, 40);
    g.fillRect((2 * w) / 3 - 3, y + 10, 6, 40);
  }
  if (scene.textures.exists('ground')) scene.textures.remove('ground');
  g.generateTexture('ground', w, h);
  g.destroy();
}
