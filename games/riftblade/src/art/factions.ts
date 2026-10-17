/**
 * The textures of the three later factions and their bosses, in the same Glow Vector style as the
 * Scrap droids: the Swamp world's wild beasts (lime), the Ice world's Iron Dominion (periwinkle and
 * white) and the Lava world's Hollow cult (violet and ember gold). All face right; the scene flips
 * them toward the hero. Plus the escort droid, credit chips and the hostile bolts.
 */
import Phaser from 'phaser';
import { C, beam, glow, outline, paint, shade, shape, type Ctx } from './glow';

/** A gold ring around an elite. */
function eliteRing(ctx: Ctx, cx: number, cy: number, r: number) {
  outline(ctx, () => ctx.arc(cx, cy, r, 0, Math.PI * 2), C.elite, 2.5, 14);
}

function dot(ctx: Ctx, x: number, y: number, r: number, color: string, blur = 6) {
  ctx.save();
  glow(ctx, color, blur);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** A mire rat: a long low body, a pointed snout, a whip tail and one bright eye. `k` scales it. */
function mirerat(ctx: Ctx, cx: number, cy: number, k: number, elite: boolean) {
  if (elite) eliteRing(ctx, cx, cy, 13 * k);
  outline(ctx, () => {
    ctx.moveTo(cx - 8 * k, cy + 1 * k);
    ctx.quadraticCurveTo(cx - 15 * k, cy - 4 * k, cx - 19 * k, cy + 3 * k);
  }, C.beast, 1.5 * k, 5);
  shape(ctx, () => {
    ctx.moveTo(cx + 12 * k, cy);
    ctx.quadraticCurveTo(cx + 4 * k, cy - 7 * k, cx - 7 * k, cy - 4 * k);
    ctx.quadraticCurveTo(cx - 11 * k, cy + 1 * k, cx - 6 * k, cy + 5 * k);
    ctx.quadraticCurveTo(cx + 4 * k, cy + 6 * k, cx + 12 * k, cy);
  }, '#16200a', C.beast, 8);
  // Ears and the eye.
  outline(ctx, () => {
    ctx.moveTo(cx + 1 * k, cy - 5 * k);
    ctx.lineTo(cx - 1 * k, cy - 9 * k);
    ctx.lineTo(cx - 3 * k, cy - 5 * k);
  }, C.beast, 1.5 * k, 4);
  dot(ctx, cx + 5 * k, cy - 2 * k, 1.6 * k, '#f4ffd0');
}

/** A spitter toad: squat and wide, two eyes on top and a glowing throat sac. */
function toad(ctx: Ctx, cx: number, cy: number, k: number, elite: boolean) {
  if (elite) eliteRing(ctx, cx, cy, 17 * k);
  shape(ctx, () => {
    ctx.moveTo(cx - 14 * k, cy + 9 * k);
    ctx.quadraticCurveTo(cx - 16 * k, cy - 6 * k, cx - 2 * k, cy - 8 * k);
    ctx.quadraticCurveTo(cx + 14 * k, cy - 9 * k, cx + 14 * k, cy + 4 * k);
    ctx.quadraticCurveTo(cx + 12 * k, cy + 10 * k, cx - 14 * k, cy + 9 * k);
  }, '#1a220c', C.toad, 9);
  // Legs.
  outline(ctx, () => {
    ctx.moveTo(cx - 11 * k, cy + 7 * k);
    ctx.lineTo(cx - 16 * k, cy + 12 * k);
    ctx.moveTo(cx + 9 * k, cy + 7 * k);
    ctx.lineTo(cx + 14 * k, cy + 12 * k);
  }, C.toad, 1.8 * k, 4);
  for (const ex of [-3, 6]) {
    shape(ctx, () => ctx.arc(cx + ex * k, cy - 8 * k, 3.6 * k, 0, Math.PI * 2), '#1a220c', C.toad, 6);
    dot(ctx, cx + (ex + 0.8) * k, cy - 8 * k, 1.5 * k, '#ffffff', 3);
  }
  dot(ctx, cx + 9 * k, cy + 3 * k, 3.4 * k, C.beast, 10);
}

/** A line trooper of the Iron Dominion: a square helmet with a visor slit, pauldrons and a rifle. */
function linetrooper(ctx: Ctx, cx: number, cy: number, k: number, elite: boolean) {
  if (elite) eliteRing(ctx, cx, cy, 16 * k);
  shape(ctx, () => ctx.roundRect(cx - 7 * k, cy - 1 * k, 14 * k, 12 * k, 3 * k), '#141a30', C.iron, 7);
  shape(ctx, () => ctx.roundRect(cx - 10 * k, cy - 2 * k, 6 * k, 6 * k, 2 * k), '#1c2440', C.iron, 4);
  shape(ctx, () => ctx.roundRect(cx - 6 * k, cy - 12 * k, 12 * k, 11 * k, 2.5 * k), '#1c2440', C.ironLight, 7);
  ctx.save();
  glow(ctx, C.ironLight, 6);
  ctx.fillStyle = C.ironLight;
  ctx.fillRect(cx - 4 * k, cy - 8 * k, 9 * k, 2 * k);
  ctx.restore();
  ctx.fillStyle = '#3a4466';
  ctx.fillRect(cx + 2 * k, cy + 4 * k, 12 * k, 2.6 * k);
}

/** A walker gunner: a boxy hull on two legs with twin barrels. */
function walker(ctx: Ctx, cx: number, cy: number, k: number, elite: boolean) {
  if (elite) eliteRing(ctx, cx, cy, 24 * k);
  outline(ctx, () => {
    ctx.moveTo(cx - 6 * k, cy + 6 * k);
    ctx.lineTo(cx - 11 * k, cy + 13 * k);
    ctx.lineTo(cx - 8 * k, cy + 19 * k);
    ctx.moveTo(cx + 6 * k, cy + 6 * k);
    ctx.lineTo(cx + 11 * k, cy + 13 * k);
    ctx.lineTo(cx + 8 * k, cy + 19 * k);
  }, C.iron, 2.5 * k, 5);
  shape(ctx, () => ctx.roundRect(cx - 14 * k, cy - 12 * k, 26 * k, 20 * k, 5 * k), '#141a30', C.iron, 10);
  for (const by of [-6, 1]) shape(ctx, () => ctx.roundRect(cx + 10 * k, cy + by * k, 13 * k, 4 * k, 1.5 * k), '#2a3354', C.ironLight, 4);
  ctx.save();
  glow(ctx, C.ironLight, 8);
  ctx.fillStyle = C.ironLight;
  ctx.fillRect(cx - 9 * k, cy - 7 * k, 12 * k, 3 * k);
  ctx.restore();
}

/** An ash acolyte: a hooded triangle with two ember eyes. */
function acolyte(ctx: Ctx, cx: number, cy: number, k: number, elite: boolean) {
  if (elite) eliteRing(ctx, cx, cy, 15 * k);
  shape(ctx, () => {
    ctx.moveTo(cx, cy - 12 * k);
    ctx.quadraticCurveTo(cx + 9 * k, cy - 4 * k, cx + 10 * k, cy + 10 * k);
    ctx.lineTo(cx - 10 * k, cy + 10 * k);
    ctx.quadraticCurveTo(cx - 9 * k, cy - 4 * k, cx, cy - 12 * k);
  }, '#1a0f24', C.hollow, 9);
  ctx.fillStyle = '#05030a';
  ctx.beginPath();
  ctx.ellipse(cx + 1 * k, cy - 3 * k, 5 * k, 4 * k, 0, 0, Math.PI * 2);
  ctx.fill();
  dot(ctx, cx - 1 * k, cy - 3 * k, 1.3 * k, C.ember, 6);
  dot(ctx, cx + 3 * k, cy - 3 * k, 1.3 * k, C.ember, 6);
}

/** A fallen knight: a crested helm, plated body and a long blade (its shield is drawn by the scene). */
function knight(ctx: Ctx, cx: number, cy: number, k: number, elite: boolean) {
  if (elite) eliteRing(ctx, cx, cy, 20 * k);
  beam(ctx, cx + 4 * k, cy + 6 * k, cx + 18 * k, cy - 10 * k, C.ember, 2.4 * k, 8);
  shape(ctx, () => ctx.roundRect(cx - 9 * k, cy - 2 * k, 18 * k, 15 * k, 4 * k), '#1a0f24', C.hollow, 8);
  shape(ctx, () => {
    ctx.arc(cx, cy - 6 * k, 7 * k, Math.PI, 0);
    ctx.lineTo(cx + 7 * k, cy);
    ctx.lineTo(cx - 7 * k, cy);
    ctx.closePath();
  }, '#241433', C.hollow, 8);
  outline(ctx, () => {
    ctx.moveTo(cx - 6 * k, cy - 12 * k);
    ctx.quadraticCurveTo(cx - 2 * k, cy - 19 * k, cx + 5 * k, cy - 15 * k);
  }, C.ember, 2 * k, 6);
  ctx.save();
  glow(ctx, C.ember, 6);
  ctx.fillStyle = C.ember;
  ctx.fillRect(cx - 1 * k, cy - 7 * k, 7 * k, 1.8 * k);
  ctx.restore();
}

/** The Bog Mother: a huge swamp toad-thing, a ring of eyes and glowing sacs on her back. */
function bogMother(ctx: Ctx, w: number, h: number) {
  const cx = w / 2;
  const cy = h / 2;
  for (const [dx, dy] of [[-44, 36], [36, 40], [-50, -30], [40, -36]]) {
    outline(ctx, () => {
      ctx.moveTo(cx + dx * 0.5, cy + dy * 0.5);
      ctx.quadraticCurveTo(cx + dx * 1.1, cy + dy * 0.7, cx + dx * 1.15, cy + dy * 1.05);
    }, C.beast, 5, 8);
  }
  shape(ctx, () => ctx.ellipse(cx, cy, 64, 54, 0, 0, Math.PI * 2), '#141c08', C.beast, 18);
  shape(ctx, () => ctx.ellipse(cx + 2, cy + 4, 46, 36, 0, 0, Math.PI * 2), '#1c2a0c', shade(C.beast, -0.25), 6);
  for (const [sx, sy, sr] of [[-22, -16, 9], [10, -26, 7], [-30, 14, 7], [4, 18, 10], [26, -4, 6]]) dot(ctx, cx + sx, cy + sy, sr, C.toad, 14);
  for (let i = 0; i < 5; i++) {
    const a = -0.9 + i * 0.45;
    const ex = cx + Math.cos(a) * 52;
    const ey = cy + Math.sin(a) * 42;
    shape(ctx, () => ctx.arc(ex, ey, 6, 0, Math.PI * 2), '#141c08', C.beast, 6);
    dot(ctx, ex + 1.5, ey, 2.4, '#ffffff', 4);
  }
}

/** The Siege Walker: a square hull on four jointed legs, an artillery tube on top. */
function siegeWalker(ctx: Ctx, w: number, h: number) {
  const cx = w / 2;
  const cy = h / 2;
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    outline(ctx, () => {
      ctx.moveTo(cx + sx * 26, cy + sy * 24);
      ctx.lineTo(cx + sx * 58, cy + sy * 46);
      ctx.lineTo(cx + sx * 66, cy + sy * 72);
    }, C.iron, 6, 10);
    shape(ctx, () => ctx.arc(cx + sx * 58, cy + sy * 46, 7, 0, Math.PI * 2), '#141a30', C.ironLight, 6);
    shape(ctx, () => ctx.roundRect(cx + sx * 66 - 9, cy + sy * 72 - 5, 18, 10, 3), '#141a30', C.iron, 6);
  }
  shape(ctx, () => ctx.roundRect(cx - 44, cy - 38, 88, 76, 12), '#121830', C.iron, 18);
  ctx.save();
  ctx.strokeStyle = shade(C.iron, -0.3);
  ctx.lineWidth = 2;
  ctx.strokeRect(cx - 32, cy - 26, 64, 52);
  ctx.restore();
  shape(ctx, () => ctx.arc(cx - 4, cy, 20, 0, Math.PI * 2), '#1c2440', C.ironLight, 10);
  shape(ctx, () => ctx.roundRect(cx + 10, cy - 7, 48, 14, 4), '#1c2440', C.ironLight, 8);
  dot(ctx, cx - 4, cy, 7, C.ironLight, 14);
}

/** The Hollow Champion: a tall hooded swordsman, ember eyes and a long blade; `burning` for phase two. */
function champion(ctx: Ctx, w: number, h: number, burning: boolean) {
  const cx = w / 2;
  const cy = h / 2 + 6;
  const rim = burning ? '#ff8a3c' : C.hollow;
  if (burning) {
    for (let i = 0; i < 7; i++) {
      const x = cx - 24 + i * 8;
      outline(ctx, () => {
        ctx.moveTo(x, cy + 30);
        ctx.quadraticCurveTo(x - 4, cy + 10, x + (i % 2 ? 3 : -3), cy - 14 - (i % 3) * 6);
      }, '#ffb347', 2, 10);
    }
  }
  beam(ctx, cx + 10, cy + 6, cx + 54, cy - 30, C.ember, 4, 14);
  shape(ctx, () => {
    ctx.moveTo(cx, cy - 40);
    ctx.quadraticCurveTo(cx + 22, cy - 22, cx + 24, cy + 32);
    ctx.lineTo(cx - 24, cy + 32);
    ctx.quadraticCurveTo(cx - 22, cy - 22, cx, cy - 40);
  }, '#160c20', rim, 18);
  ctx.fillStyle = '#05030a';
  ctx.beginPath();
  ctx.ellipse(cx + 3, cy - 16, 11, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  dot(ctx, cx, cy - 16, 2.4, C.ember, 10);
  dot(ctx, cx + 8, cy - 16, 2.4, C.ember, 10);
  outline(ctx, () => {
    ctx.moveTo(cx - 18, cy + 4);
    ctx.lineTo(cx + 18, cy + 4);
  }, C.ember, 2, 6);
}

/** Every texture of the later factions, the escort droid, credits and hostile bolts. */
export function bakeFactions(scene: Phaser.Scene) {
  const both = (key: string, size: number, draw: (ctx: Ctx, cx: number, cy: number, k: number, elite: boolean) => void) => {
    paint(scene, key, size, size, (ctx) => draw(ctx, size / 2, size / 2, 1, false));
    const big = Math.ceil(size * 1.7);
    paint(scene, `${key}-elite`, big, big, (ctx) => draw(ctx, big / 2, big / 2, 1.6, true));
  };
  both('rb-mirerat', 44, mirerat);
  both('rb-toad', 44, toad);
  both('rb-linetrooper', 40, linetrooper);
  both('rb-walker', 60, walker);
  both('rb-acolyte', 38, acolyte);
  both('rb-knight', 50, knight);
  paint(scene, 'rb-boss-bogmother', 170, 150, (ctx) => bogMother(ctx, 170, 150));
  paint(scene, 'rb-boss-siege', 180, 180, (ctx) => siegeWalker(ctx, 180, 180));
  paint(scene, 'rb-boss-champion', 130, 110, (ctx) => champion(ctx, 130, 110, false));
  paint(scene, 'rb-boss-champion-burning', 130, 110, (ctx) => champion(ctx, 130, 110, true));

  // Hostile bolts: a lime glob, a periwinkle volley bolt and a pale heavy slug.
  paint(scene, 'rb-bolt-glob', 26, 26, (ctx) => {
    shape(ctx, () => ctx.arc(13, 13, 7, 0, Math.PI * 2), '#26340a', C.beast, 12);
    dot(ctx, 11, 11, 2.5, C.toad, 4);
  });
  paint(scene, 'rb-bolt-volley', 30, 16, (ctx) => beam(ctx, 7, 8, 23, 8, C.iron, 4, 10));
  paint(scene, 'rb-bolt-slug', 32, 20, (ctx) => {
    shape(ctx, () => ctx.roundRect(8, 5, 18, 10, 5), '#1c2440', C.ironLight, 12);
  });

  // The stranded droid that escorts the hero for a planet: a little turret on a hover ring.
  paint(scene, 'rb-escort', 36, 36, (ctx) => {
    outline(ctx, () => ctx.ellipse(18, 22, 13, 4.5, 0, 0, Math.PI * 2), '#7df9ff', 1.5, 6);
    shape(ctx, () => ctx.roundRect(10, 9, 16, 13, 4), '#132a33', '#e6fbff', 10);
    shape(ctx, () => ctx.roundRect(24, 13, 9, 4, 1.5), '#132a33', '#7df9ff', 4);
    dot(ctx, 16, 14, 2.4, '#7df9ff', 6);
    outline(ctx, () => {
      ctx.moveTo(14, 9);
      ctx.lineTo(11, 3);
    }, '#e6fbff', 1.5, 4);
  });
  // A credit chip: a gold hexagon.
  paint(scene, 'rb-credits', 26, 26, (ctx) => {
    shape(ctx, () => {
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
        if (i === 0) ctx.moveTo(13 + Math.cos(a) * 8, 13 + Math.sin(a) * 8);
        else ctx.lineTo(13 + Math.cos(a) * 8, 13 + Math.sin(a) * 8);
      }
      ctx.closePath();
    }, '#2a2210', C.credits, 12);
    ctx.fillStyle = C.credits;
    ctx.fillRect(11.5, 9, 3, 8);
  });
}
