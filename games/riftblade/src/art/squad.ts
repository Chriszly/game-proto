/**
 * Commander Elara Voss and Triad-77 in Glow Vector, drawn from their scheme like the other heroes
 * (facing right), plus their allies: Elara's rebel commandos, medic and speeder bike, Triad-77's
 * single battle droids (standing and fallen), rolling shield droid and command droid. Also the
 * drop pod of TR-9's Drop Squad and the dark placeholder of a locked hero card. No red cross
 * anywhere: Elara's medic carries a plain green satchel.
 */
import Phaser from 'phaser';
import { schemeOf, type HeroId, type HeroScheme } from '../game/heroes';
import { beam, glow, outline, paint, shade, shape, type Ctx } from './glow';

const INK = '#0b0f1c';
const SKIN = '#d9a77f';

function pistol(ctx: Ctx, x: number, y: number, w: number) {
  ctx.fillStyle = '#2c3140';
  ctx.fillRect(x, y - 3, w, 6);
  ctx.fillRect(x, y, 6, 9);
  ctx.fillStyle = '#4a5266';
  ctx.fillRect(x, y - 3, w, 2);
}

/** Elara Voss: a field jacket rimmed in her colour with an open collar, dark hair tied back, a headset and a long pistol. */
function elara(ctx: Ctx, x: number, y: number, z: number, bolts: boolean, sch: HeroScheme) {
  const mark = sch.mark ?? shade(sch.accent, -0.2);
  shape(ctx, () => ctx.roundRect(x - 22, y + 10, 44, 52, 10), sch.body, sch.accent, 10, z);
  // An open collar: cream lapels in a V, and a dark belt with a brass buckle.
  ctx.fillStyle = mark;
  ctx.beginPath();
  ctx.moveTo(x - 16, y + 12);
  ctx.lineTo(x, y + 34);
  ctx.lineTo(x + 16, y + 12);
  ctx.lineTo(x + 8, y + 12);
  ctx.lineTo(x, y + 24);
  ctx.lineTo(x - 8, y + 12);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = shade(sch.body, -0.45);
  ctx.fillRect(x - 22, y + 44, 44, 6);
  ctx.fillStyle = '#ffd36b';
  ctx.fillRect(x - 4, y + 44, 8, 6);
  // Head, hair and a bun behind.
  shape(ctx, () => ctx.arc(x - 18, y - 22, 8, 0, Math.PI * 2), '#2a1c16', '#2a1c16', 0, z);
  shape(ctx, () => ctx.arc(x, y - 14, 17, 0, Math.PI * 2), SKIN, sch.accent, 6, z);
  shape(ctx, () => {
    ctx.arc(x, y - 17, 18, Math.PI * 1.0, Math.PI * 2.0);
    ctx.lineTo(x + 12, y - 20);
    ctx.lineTo(x - 18, y - 6);
    ctx.closePath();
  }, '#2a1c16', '#2a1c16', 0, z);
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(x + 4, y - 12, 2.6, 0, Math.PI * 2);
  ctx.arc(x + 12, y - 12, 2.6, 0, Math.PI * 2);
  ctx.fill();
  // The headset: an ear piece and a mic arm.
  ctx.fillStyle = '#3a4050';
  ctx.fillRect(x - 15, y - 17, 6, 10);
  ctx.strokeStyle = '#3a4050';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - 12, y - 7);
  ctx.quadraticCurveTo(x - 6, y + 1, x + 4, y - 1);
  ctx.stroke();
  pistol(ctx, x + 18, y + 30, 34);
  if (bolts) beam(ctx, x + 56, y + 30, x + 92, y + 30, sch.bolt, 4, 22, z);
}

/** One skinny battle droid of Triad-77: a long head with a slit eye, a thin body and stick legs, a blaster held out. */
export function droid(ctx: Ctx, x: number, y: number, z: number, sch: HeroScheme) {
  const rim = sch.mark ?? '#8a93a6';
  outline(ctx, () => {
    ctx.moveTo(x - 2, y + 4);
    ctx.lineTo(x - 8, y + 26);
    ctx.moveTo(x + 2, y + 4);
    ctx.lineTo(x + 8, y + 26);
    ctx.moveTo(x, y - 14);
    ctx.lineTo(x + 16, y - 8);
  }, sch.body, 3, 4, z);
  shape(ctx, () => ctx.roundRect(x - 4, y - 22, 8, 28, 3), sch.body, rim, 6, z);
  shape(ctx, () => ctx.roundRect(x - 6, y - 38, 18, 12, 6), sch.body, rim, 6, z);
  ctx.save();
  glow(ctx, '#9fe8ff', 8, z);
  ctx.fillStyle = '#9fe8ff';
  ctx.fillRect(x + 2, y - 34, 9, 3);
  ctx.restore();
  ctx.fillStyle = '#2c3140';
  ctx.fillRect(x + 14, y - 11, 12, 4);
}

/** Triad-77 as one unit (the portrait): a droid behind and two in front. */
function triad(ctx: Ctx, x: number, y: number, z: number, bolts: boolean, sch: HeroScheme) {
  const k = 1.25;
  for (const [dx, dy] of [[2, -8], [-36, 14], [30, 14]]) {
    ctx.save();
    ctx.translate(x + dx, y + dy);
    ctx.scale(k, k);
    droid(ctx, 0, 0, z * k, sch);
    ctx.restore();
  }
  if (bolts) {
    beam(ctx, x + 36, y - 20, x + 58, y - 26, sch.bolt, 3, 18, z);
    beam(ctx, x + 64, y + 2, x + 90, y + 2, sch.bolt, 3, 18, z);
  }
}

/** Draws Elara Voss or Triad-77 at (x, y) in art units, facing right (`sprites.ts` hands them here). */
export function drawSquadHero(ctx: Ctx, id: HeroId, x: number, y: number, z: number, bolts: boolean, sch: HeroScheme) {
  if (id === 'elara') elara(ctx, x, y, z, bolts, sch);
  else triad(ctx, x, y, z, bolts, sch);
}

/** A rebel commando of Elara's (or her medic, with a green satchel and no symbol): a cap, a rifle. */
export function rebel(ctx: Ctx, x: number, y: number, z: number, medic: boolean) {
  const sch = schemeOf('elara');
  const body = medic ? '#6d7a86' : '#56603f';
  shape(ctx, () => ctx.roundRect(x - 22, y + 10, 44, 50, 10), body, sch.accent, 8, z);
  shape(ctx, () => ctx.arc(x, y - 12, 16, 0, Math.PI * 2), SKIN, sch.accent, 4, z);
  shape(ctx, () => {
    ctx.arc(x, y - 16, 17, Math.PI, 0);
    ctx.lineTo(x + 26, y - 14);
    ctx.lineTo(x - 17, y - 14);
    ctx.closePath();
  }, medic ? '#e6dac2' : '#3f4a2e', medic ? '#e6dac2' : '#3f4a2e', 0, z);
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(x + 5, y - 10, 2.4, 0, Math.PI * 2);
  ctx.arc(x + 12, y - 10, 2.4, 0, Math.PI * 2);
  ctx.fill();
  if (medic) shape(ctx, () => ctx.roundRect(x - 30, y + 26, 18, 20, 4), '#1f6b3c', '#7dffa0', 6, z);
  else pistol(ctx, x + 14, y + 30, 40);
}

export function bakeSquad(scene: Phaser.Scene) {
  const tri = schemeOf('triad');
  const elaraSch = schemeOf('elara');
  paint(scene, 'rb-droid', 34, 40, (ctx) => {
    ctx.scale(0.5, 0.5);
    droid(ctx, 30, 44, 0.5, tri);
  });
  // A fallen droid: its parts on the ground, dim.
  paint(scene, 'rb-droid-down', 34, 24, (ctx) => {
    ctx.globalAlpha = 0.7;
    ctx.save();
    ctx.translate(17, 14);
    ctx.rotate(Math.PI / 2.4);
    ctx.scale(0.45, 0.45);
    droid(ctx, 0, 0, 0.45, { ...tri, body: '#7c8394' });
    ctx.restore();
  });
  // Elara's speeder bike, pointing right: a long hull, a rider's head and a glowing drive.
  paint(scene, 'rb-bike', 52, 26, (ctx) => {
    beam(ctx, 4, 13, 12, 13, elaraSch.bolt, 4, 10);
    shape(ctx, () => ctx.roundRect(10, 8, 36, 10, 5), '#3a3026', elaraSch.accent, 8);
    ctx.fillStyle = '#2c3140';
    ctx.fillRect(40, 5, 3, 16);
    shape(ctx, () => ctx.arc(26, 7, 5, 0, Math.PI * 2), '#3f4a2e', elaraSch.accent, 4);
  });
  // A rolling shield droid: a ball with a pale blue shield plate.
  paint(scene, 'rb-shieldbot', 32, 32, (ctx) => {
    shape(ctx, () => ctx.arc(16, 16, 9, 0, Math.PI * 2), tri.body, '#9fe8ff', 8);
    outline(ctx, () => ctx.arc(16, 16, 13, -1.1, 1.1), '#9fe8ff', 3, 8);
    ctx.fillStyle = '#9fe8ff';
    ctx.fillRect(14, 12, 6, 3);
  });
  // The command droid: a hovering head with a dish and a wide eye.
  paint(scene, 'rb-command', 34, 34, (ctx) => {
    outline(ctx, () => {
      ctx.moveTo(17, 10);
      ctx.lineTo(17, 3);
    }, tri.body, 2, 4);
    shape(ctx, () => ctx.arc(17, 3, 3, 0, Math.PI * 2), '#9fe8ff', '#9fe8ff', 6);
    shape(ctx, () => ctx.roundRect(6, 10, 22, 14, 6), tri.body, '#9fe8ff', 10);
    ctx.save();
    glow(ctx, '#9fe8ff', 8);
    ctx.fillStyle = '#9fe8ff';
    ctx.fillRect(10, 15, 14, 4);
    ctx.restore();
    outline(ctx, () => ctx.ellipse(17, 28, 9, 2.5, 0, 0, Math.PI * 2), '#9fe8ff', 1.5, 6);
  });
  // TR-9's drop pod, falling: a capsule with an orange rim and a hot base.
  const tr9 = schemeOf('tr9');
  paint(scene, 'rb-pod', 28, 38, (ctx) => {
    shape(ctx, () => {
      ctx.moveTo(14, 2);
      ctx.quadraticCurveTo(26, 6, 24, 24);
      ctx.lineTo(14, 32);
      ctx.lineTo(4, 24);
      ctx.quadraticCurveTo(2, 6, 14, 2);
      ctx.closePath();
    }, tr9.body, tr9.accent, 10);
    ctx.fillStyle = tr9.accent;
    ctx.fillRect(9, 12, 10, 4);
    beam(ctx, 14, 32, 14, 37, '#ffd36b', 4, 10);
  });
  // A locked hero: a dark silhouette with a question mark, the same for every hero.
  paint(scene, 'rb-locked', 64, 76, (ctx) => {
    shape(ctx, () => ctx.arc(32, 22, 14, 0, Math.PI * 2), '#141b2b', '#2a3550', 6);
    shape(ctx, () => {
      ctx.moveTo(8, 72);
      ctx.quadraticCurveTo(10, 40, 32, 40);
      ctx.quadraticCurveTo(54, 40, 56, 72);
      ctx.closePath();
    }, '#141b2b', '#2a3550', 6);
    ctx.fillStyle = '#3a4766';
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('?', 32, 24);
  });
}
