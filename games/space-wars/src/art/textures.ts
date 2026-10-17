// Bakes the art once at boot: every faction's ships at FACINGS headings (one sprite sheet per ship),
// its buildings, the crystal clusters, the relay beacon, salvage shards, exhaust flames and the
// map's painted backdrop, all onto 2D canvases added with textures.addCanvas.

import Phaser from 'phaser';
import { renderScale, sharpRes } from '../../../../shared/scaling';
import { FACTIONS, type Role, type UnitId } from '../game/factions';
import type { MapLayout } from '../game/map';
import { ARENA } from '../game/arena';
import { hashRandom, scale, type Mesh } from './mesh';
import { FACTION_ART, PROP_MATS, beaconModel, crystalCluster, rockModel, shardModel } from './models';
import { css, reach, renderMesh, rgb, sparkle, type Materials } from './render3d';

/** Headings baked per ship; the sprite turns the last few degrees between them. */
export const FACINGS = 16;
/**
 * Sprites are baked at this many canvas pixels per display pixel, so they stay crisp when scaled
 * up: the screen's `renderScale`, held between 2 and MAX_RES (set by `bakeAll`). Draw them at `1 / RES`.
 */
export let RES = 2;
/** Baking 320 ship frames at 4 (a 4K screen) takes about twice as long as at 3 and looks the same. */
const MAX_RES = 3;
/** Ship sheets lay their FACINGS frames out in rows of this many, to keep big sheets loadable. */
const SHEET_COLUMNS = 4;
/** Buildings are seen turned a little, for a three-quarter look. */
const BUILDING_YAW = -0.4;
const OUTLINE = '#2a140c';
/** Models are drawn this much bigger than their hit circles, so they read at phone size. */
export const SHIP_ZOOM = 1.25;
const BUILDING_ZOOM = 1.35;
const CRYSTAL_ZOOM = 1.5;
const grow = (mesh: Mesh, k: number) => scale(mesh, [k, k, k]);

const UNIT_TYPES: UnitId[] = ['harvester', 'scout', 'gunship', 'heavy'];
const ROLES: Role[] = ['hub', 'depot', 'barracks', 'turret'];

export const shipKey = (faction: number, type: UnitId) => `sw-ship-${faction}-${type}`;
export const buildingKey = (faction: number, role: Role) => `sw-bld-${faction}-${role}`;
export const flameKey = (faction: number) => `sw-flame-${faction}`;
export const CRYSTAL_KEYS = ['sw-crystal-0', 'sw-crystal-1', 'sw-crystal-2'];
export const BEACON_KEY = 'sw-beacon';
export const SHARD_KEY = 'sw-shard';
export const BACKDROP_KEY = 'sw-backdrop';
export const SPARK_KEY = 'sw-spark';
export const GLOW_KEY = 'sw-glow';
export const GLOW_BLUE_KEY = 'sw-glow-blue';

/** The frame index whose heading is closest to `angle`, and the turn left over to rotate by. */
export function facing(angle: number): { frame: number; rest: number } {
  const step = (Math.PI * 2) / FACINGS;
  const k = Math.round(angle / step);
  return { frame: ((k % FACINGS) + FACINGS) % FACINGS, rest: angle - k * step };
}

const scratch: HTMLCanvasElement[] = [];
/** A reused work canvas (0 for the model, 1 for its ink outline), cleared to w by h. */
function scratchCanvas(k: number, w: number, h: number) {
  scratch[k] ??= document.createElement('canvas');
  scratch[k].width = w;
  scratch[k].height = h;
  return scratch[k];
}

/**
 * Paints one model into the box (x, y, size) of `ctx` with a dark ink outline round its
 * silhouette, like a printed cover. Returns the highlight for a glint.
 */
function paintModel(ctx: CanvasRenderingContext2D, mesh: Mesh, mats: Materials, x: number, y: number, w: number, h: number, yaw: number, ox: number, oy: number, glint: boolean) {
  const s = scratchCanvas(0, w, h);
  const sc = s.getContext('2d')!;
  const hit = renderMesh(sc, mesh, mats, { yaw, scale: RES, cx: ox, cy: oy });
  // The ink outline: the silhouette in dark brown, nudged round in eight directions underneath.
  const ink = scratchCanvas(1, w, h);
  const ic = ink.getContext('2d')!;
  ic.drawImage(s, 0, 0);
  ic.globalCompositeOperation = 'source-in';
  ic.fillStyle = OUTLINE;
  ic.fillRect(0, 0, w, h);
  const d = RES * 0.75;
  for (const [dx, dy] of [[-d, 0], [d, 0], [0, -d], [0, d], [-d, -d], [d, d], [-d, d], [d, -d]]) ctx.drawImage(ink, x + dx, y + dy);
  ctx.drawImage(s, x, y);
  if (glint && hit) sparkle(ctx, x + hit.x, y + hit.y, 3.2 * RES, 0.9);
}

/** Bakes a ship as a sheet of FACINGS frames, one per heading, frame k facing k * 360 / FACINGS degrees. */
function bakeShip(scene: Phaser.Scene, key: string, mesh: Mesh, mats: Materials) {
  const { r, z } = reach(mesh);
  const size = Math.ceil((r + z + 4) * 2 * RES);
  const canvas = document.createElement('canvas');
  canvas.width = size * SHEET_COLUMNS;
  canvas.height = size * Math.ceil(FACINGS / SHEET_COLUMNS);
  const ctx = canvas.getContext('2d')!;
  const at = (k: number) => [(k % SHEET_COLUMNS) * size, Math.floor(k / SHEET_COLUMNS) * size];
  for (let k = 0; k < FACINGS; k++) {
    const [x, y] = at(k);
    paintModel(ctx, mesh, mats, x, y, size, size, (k / FACINGS) * Math.PI * 2, size / 2, size / 2, k % 2 === 0);
  }
  const tex = scene.textures.addCanvas(key, canvas)!;
  for (let k = 0; k < FACINGS; k++) tex.add(k, 0, at(k)[0], at(k)[1], size, size);
}

/** Bakes a single-view model (a building or a prop), its ground point at the frame's centre. */
function bakeStill(scene: Phaser.Scene, key: string, mesh: Mesh, mats: Materials, yaw = BUILDING_YAW) {
  const { r, z } = reach(mesh);
  const size = Math.ceil((r + z + 4) * 2 * RES);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  paintModel(canvas.getContext('2d')!, mesh, mats, 0, 0, size, size, yaw, size / 2, size / 2, true);
  scene.textures.addCanvas(key, canvas);
}

/** A long airbrushed exhaust flame, pointing left from its right end (the engine). */
function bakeFlame(scene: Phaser.Scene, key: string, outer: number, inner: number) {
  const w = 64 * RES;
  const h = 14 * RES;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  const layer = (color: number, half: number, alpha: number) => {
    const g = ctx.createLinearGradient(w, 0, 0, 0);
    g.addColorStop(0, css(rgb(color), alpha));
    g.addColorStop(0.45, css(rgb(color), alpha * 0.55));
    g.addColorStop(1, css(rgb(color), 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(w, h / 2 - half);
    ctx.quadraticCurveTo(w * 0.35, h / 2 - half * 0.5, 0, h / 2);
    ctx.quadraticCurveTo(w * 0.35, h / 2 + half * 0.5, w, h / 2 + half);
    ctx.closePath();
    ctx.fill();
  };
  layer(outer, h * 0.48, 0.75);
  layer(0xffb050, h * 0.3, 0.85);
  layer(inner, h * 0.16, 1);
  scene.textures.addCanvas(key, canvas);
}

/** Soft round glows: a gold one for shards and the beacon, a blue one under crystal. */
function bakeGlow(scene: Phaser.Scene) {
  const glow = (key: string, stops: [number, string][]) => {
    const s = 64;
    const canvas = document.createElement('canvas');
    canvas.width = s;
    canvas.height = s;
    const ctx = canvas.getContext('2d')!;
    const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    for (const [at, color] of stops) g.addColorStop(at, color);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
    scene.textures.addCanvas(key, canvas);
  };
  glow(GLOW_KEY, [[0, 'rgba(255,246,220,1)'], [0.35, 'rgba(255,214,120,0.6)'], [1, 'rgba(255,160,60,0)']]);
  glow(GLOW_BLUE_KEY, [[0, 'rgba(170,230,255,0.9)'], [0.4, 'rgba(70,150,255,0.45)'], [1, 'rgba(40,90,255,0)']]);
  const sp = document.createElement('canvas');
  sp.width = 32;
  sp.height = 32;
  sparkle(sp.getContext('2d')!, 16, 16, 15);
  scene.textures.addCanvas(SPARK_KEY, sp);
}

/** Bakes every faction's ships and buildings and the props, once per page. */
export function bakeAll(scene: Phaser.Scene) {
  if (scene.textures.exists(SHARD_KEY)) return;
  RES = Phaser.Math.Clamp(renderScale, 2, MAX_RES);
  // Every faction's heavy is drawn at the same size: as long as the Iron Dominion battleship.
  const heavyReach = reach(FACTION_ART.ironDominion().units.heavy).r;
  FACTIONS.forEach((def, f) => {
    const art = FACTION_ART[def.name]();
    for (const type of UNIT_TYPES) {
      const k = type === 'heavy' ? heavyReach / reach(art.units.heavy).r : 1;
      bakeShip(scene, shipKey(f, type), grow(art.units[type], SHIP_ZOOM * k), art.mats);
    }
    for (const role of ROLES) bakeStill(scene, buildingKey(f, role), grow(art.buildings[role], BUILDING_ZOOM), art.mats);
    bakeFlame(scene, flameKey(f), art.flame[0], art.flame[1]);
  });
  CRYSTAL_KEYS.forEach((key, k) => bakeStill(scene, key, grow(crystalCluster(k + 1), CRYSTAL_ZOOM), PROP_MATS, 0.3 + k));
  bakeStill(scene, BEACON_KEY, grow(beaconModel(), BUILDING_ZOOM), PROP_MATS, 0.5);
  bakeStill(scene, SHARD_KEY, grow(shardModel(), 1.2), PROP_MATS, 0.4);
  bakeGlow(scene);
}

/**
 * Paints the battlefield's backdrop for one map: an airbrushed violet sky, glowing nebulae, a
 * ringed planet, stars with sparkle glints and the asteroid fields (rendered as 3D rocks).
 * Returns the canvas pixels it painted per battlefield pixel, to draw it at `1 /` that.
 */
export function bakeBackdrop(scene: Phaser.Scene, layout: MapLayout) {
  if (scene.textures.exists(BACKDROP_KEY)) scene.textures.remove(BACKDROP_KEY);
  const res = sharpRes(ARENA.w, ARENA.h);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(ARENA.w * res);
  canvas.height = Math.round(ARENA.h * res);
  const ctx = canvas.getContext('2d')!;
  ctx.scale(res, res);
  const sky = ctx.createLinearGradient(0, 0, ARENA.w * 0.3, ARENA.h);
  sky.addColorStop(0, '#1c0f36');
  sky.addColorStop(0.45, '#33195a');
  sky.addColorStop(0.8, '#4a2058');
  sky.addColorStop(1, '#2a1238');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, ARENA.w, ARENA.h);
  // A broad magenta glow across the middle, like the airbrushed haze behind a cover's title.
  const haze = ctx.createRadialGradient(ARENA.w * 0.55, ARENA.h * 0.45, 0, ARENA.w * 0.55, ARENA.h * 0.45, ARENA.w * 0.6);
  haze.addColorStop(0, 'rgba(190,70,150,0.28)');
  haze.addColorStop(1, 'rgba(190,70,150,0)');
  ctx.fillStyle = haze;
  ctx.fillRect(0, 0, ARENA.w, ARENA.h);
  // Nebulae in the cover's palette: magenta, tangerine, teal and violet hazes.
  const hazes = [0xc0408a, 0xe07a3a, 0x2a8a9a, 0x7a4ad0];
  layout.nebulae.forEach((n, k) => {
    const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r * 1.4);
    g.addColorStop(0, css(rgb(hazes[k % hazes.length]), 0.36));
    g.addColorStop(0.5, css(rgb(hazes[k % hazes.length]), 0.14));
    g.addColorStop(1, css(rgb(hazes[k % hazes.length]), 0));
    ctx.fillStyle = g;
    ctx.fillRect(n.x - n.r * 1.4, n.y - n.r * 1.4, n.r * 2.8, n.r * 2.8);
  });
  paintPlanet(ctx, 820, 990, 190);
  paintMoon(ctx, 1010, 70, 34);
  for (const s of layout.stars) {
    ctx.fillStyle = `rgba(255,248,230,${s.a * 0.9})`;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.a > 0.9 ? 1.3 : 0.9, 0, Math.PI * 2);
    ctx.fill();
    if (s.a > 0.97) sparkle(ctx, s.x, s.y, 7, 0.85);
  }
  // Asteroids, lit like the ships, with a soft shadow under each.
  layout.rocks.forEach((k, i) => {
    const mesh = rockModel(k.r, i + 1);
    const size = Math.ceil(k.r * 2.6 + 8) * 2;
    const tmp = document.createElement('canvas');
    tmp.width = Math.ceil(size * res);
    tmp.height = tmp.width;
    renderMesh(tmp.getContext('2d')!, mesh, PROP_MATS, { yaw: i * 1.7, scale: res, cx: tmp.width / 2, cy: tmp.width / 2 });
    ctx.fillStyle = 'rgba(10,4,20,0.35)';
    ctx.beginPath();
    ctx.ellipse(k.x + k.r * 0.25, k.y + k.r * 0.35, k.r * 0.95, k.r * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.drawImage(tmp, k.x - size / 2, k.y - size / 2, size, size);
  });
  ctx.strokeStyle = 'rgba(255,200,120,0.35)';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, ARENA.w - 2, ARENA.h - 2);
  scene.textures.addCanvas(BACKDROP_KEY, canvas);
  return res;
}

/** A banded orange gas giant with a tilted ring, airbrushed, half off the edge of the map. */
function paintPlanet(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  const ringPath = (rx: number, ry: number, back: boolean) => {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, -0.22, back ? Math.PI : 0, back ? Math.PI * 2 : Math.PI);
  };
  ctx.save();
  ctx.lineWidth = 10;
  ctx.strokeStyle = 'rgba(240,200,150,0.35)';
  ringPath(r * 1.9, r * 0.42, true);
  ctx.stroke();
  ctx.restore();
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.clip();
  const body = ctx.createLinearGradient(x - r, y - r, x + r, y + r);
  body.addColorStop(0, '#ffcf7a');
  body.addColorStop(0.5, '#e8762e');
  body.addColorStop(1, '#7a2a1e');
  ctx.fillStyle = body;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  const rand = hashRandom(7);
  for (let k = 0; k < 9; k++) {
    const by = y - r + (k + 0.5) * ((r * 2) / 9) + (rand() - 0.5) * 8;
    ctx.fillStyle = k % 2 ? 'rgba(255,230,180,0.18)' : 'rgba(120,40,20,0.2)';
    ctx.beginPath();
    ctx.ellipse(x, by, r * 1.1, 6 + rand() * 9, -0.22, 0, Math.PI * 2);
    ctx.fill();
  }
  const shade = ctx.createRadialGradient(x - r * 0.4, y - r * 0.4, r * 0.2, x, y, r * 1.05);
  shade.addColorStop(0, 'rgba(255,240,200,0.25)');
  shade.addColorStop(0.7, 'rgba(0,0,0,0)');
  shade.addColorStop(1, 'rgba(30,0,30,0.55)');
  ctx.fillStyle = shade;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.restore();
  ctx.save();
  ctx.lineWidth = 10;
  ctx.strokeStyle = 'rgba(250,215,165,0.55)';
  ringPath(r * 1.9, r * 0.42, false);
  ctx.stroke();
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(200,120,60,0.6)';
  ringPath(r * 1.7, r * 0.36, false);
  ctx.stroke();
  ctx.restore();
}

function paintMoon(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  const g = ctx.createRadialGradient(x - r * 0.4, y - r * 0.4, r * 0.1, x, y, r);
  g.addColorStop(0, '#f6e6d0');
  g.addColorStop(0.6, '#b89aa8');
  g.addColorStop(1, '#4a3050');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}
