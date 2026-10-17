/**
 * The full-screen panels drawn over the field: the hero select screen, the level-up cards and the
 * end of a run. Each is a list of HUD objects (scroll factor 0) the scene destroys when done, and
 * reports where its tappable rectangles are so the scene (and the playthrough test) can use them.
 */
import Phaser from 'phaser';
import { HEROES, HERO_IDS, schemeOf, type HeroId } from '../game/heroes';
import { clock, type GameState } from '../game/state';
import { CAPSTONES, FILLER, MAX_TIER, UPGRADES, capstoneFor, crossoverFor } from '../game/upgrades';
import { BOSSES, NODE_INFO, PLANETS, TRADE, planetLabel, type NodeKind } from '../game/planets';
import { priceOf } from '../game/voyage';
import type { Progress } from '../game/save';
import type { Vars } from '../../../../shared/i18n';
import { t } from '../i18n';
import { C, hex } from '../art/glow';
import { portraitKey } from '../art/sprites';
import {
  AGAIN, DEPTH, FONT, LEAVE, MAP, REROLL, VIEW, eventOptionRect, heroCardRect, levelCardRect, mapNodeRect, mapNodeSpot,
  tradeCardRect, type Rect,
} from '../scenes/layout';

/** A tappable rectangle and what it stands for. */
export interface Spot extends Rect {
  id: string;
}

type Obj = Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.ScrollFactor & Phaser.GameObjects.Components.Depth;

export class Panel {
  objects: Obj[] = [];
  spots: Spot[] = [];
  private frames: { g: Phaser.GameObjects.Graphics; rect: Rect; color: string; fill: string }[] = [];

  constructor(private scene: Phaser.Scene) {}

  add<T extends Obj>(o: T, depth = 0): T {
    o.setScrollFactor(0).setDepth(DEPTH.overlay + depth);
    this.objects.push(o);
    return o;
  }

  text(x: number, y: number, s: string, size: number, color: string, opts: { bold?: boolean; origin?: [number, number]; wrap?: number; align?: string; glow?: boolean } = {}) {
    const t = this.scene.add.text(x, y, s, {
      fontFamily: FONT,
      fontSize: `${size}px`,
      fontStyle: opts.bold ? 'bold' : 'normal',
      color,
      align: opts.align ?? 'left',
      wordWrap: opts.wrap ? { width: opts.wrap } : undefined,
    });
    t.setOrigin(...(opts.origin ?? [0, 0]));
    if (opts.glow) t.setShadow(0, 0, color, 10, false, true);
    return this.add(t, 2);
  }

  dim(alpha = 0.72) {
    const g = this.scene.add.graphics();
    g.fillStyle(hex(C.night), alpha).fillRect(0, 0, VIEW.w, VIEW.h);
    return this.add(g);
  }

  /** A glowing card frame that brightens while hovered. */
  frame(rect: Rect, color: string, fill = C.panel) {
    const g = this.add(this.scene.add.graphics(), 1);
    this.frames.push({ g, rect, color, fill });
    this.drawFrame(this.frames.length - 1, false);
    return g;
  }

  private drawFrame(i: number, hot: boolean) {
    const { g, rect, color, fill } = this.frames[i];
    const c = hex(color);
    g.clear();
    // A soft halo: a few widening, fading strokes.
    for (let k = 3; k >= 1; k--) {
      g.lineStyle(2 + k * 4, c, (hot ? 0.12 : 0.05) * (4 - k));
      g.strokeRoundedRect(rect.x, rect.y, rect.w, rect.h, 14);
    }
    g.fillStyle(hex(fill), 0.94).fillRoundedRect(rect.x, rect.y, rect.w, rect.h, 14);
    g.lineStyle(hot ? 2.5 : 1.5, c, hot ? 1 : 0.7).strokeRoundedRect(rect.x, rect.y, rect.w, rect.h, 14);
  }

  /** Highlights the frame under a point on the view. */
  hover(p: { x: number; y: number }) {
    this.frames.forEach((f, i) => {
      const hot = p.x >= f.rect.x && p.x <= f.rect.x + f.rect.w && p.y >= f.rect.y && p.y <= f.rect.y + f.rect.h;
      this.drawFrame(i, hot);
    });
  }

  destroy() {
    for (const o of this.objects) o.destroy();
    this.objects = [];
    this.spots = [];
    this.frames = [];
  }
}

/** The hero select screen: three soldier cards, all open. */
export function heroSelect(scene: Phaser.Scene, progress: Progress) {
  const p = new Panel(scene);
  p.dim(0.55);
  p.text(VIEW.w / 2, 30, 'RIFTBLADE', 40, '#9fd8ff', { bold: true, origin: [0.5, 0], glow: true });
  p.text(VIEW.w / 2, 80, t('selectSubtitle'), 15, C.muted, { origin: [0.5, 0] });
  HERO_IDS.forEach((id, i) => heroCard(p, scene, id, i, progress));
  const best = progress.bestMs > 0 ? t('longestRun', { time: clock(progress.bestMs) }) : t('chooseSoldier');
  p.text(VIEW.w / 2, VIEW.h - 22, `${best}  ·  ${t('tapCard')}`, 13, C.muted, { origin: [0.5, 0.5] });
  return p;
}

function heroCard(p: Panel, scene: Phaser.Scene, id: HeroId, i: number, progress: Progress) {
  const hero = HEROES[id];
  const sch = schemeOf(id);
  const r = heroCardRect(i);
  p.frame(r, sch.accent);
  p.spots.push({ id, ...r });
  const cx = r.x + r.w / 2;
  const portrait = scene.add.image(cx, r.y + 82, portraitKey(id)).setScale(0.92);
  p.add(portrait, 2);
  p.text(cx, r.y + 160, t(hero.name), 21, C.text, { bold: true, origin: [0.5, 0] });
  p.text(cx, r.y + 188, t(hero.weapon), 14, sch.accent, { origin: [0.5, 0] });
  p.text(cx, r.y + 212, t('heroStats', { hp: hero.maxHp, speed: hero.speed }), 12, C.muted, { origin: [0.5, 0] });
  const left = r.x + 18;
  const wrap = r.w - 36;
  p.text(left, r.y + 236, t(hero.blurb), 12.5, C.text, { wrap });
  p.text(left, r.y + 276, t('signatureLine', { name: t(hero.signature.name) }), 13, sch.accent, { bold: true });
  p.text(left, r.y + 294, t(hero.signature.text), 12, C.muted, { wrap });
  p.text(left, r.y + 318, t('pathsLine', { paths: hero.paths.map((pid) => t(UPGRADES[pid].name)).join(', ') }), 12, C.text, { wrap });
  const wins = progress.wins[id] ?? 0;
  const furthest = progress.furthest[id] ?? 0;
  if (wins > 0) p.text(r.x + r.w - 14, r.y + 12, t('wins', { n: wins }), 12, C.elite, { origin: [1, 0] });
  else if (furthest > 0) p.text(r.x + r.w - 14, r.y + 12, t('reached', { n: furthest, of: PLANETS.length }), 12, C.muted, { origin: [1, 0] });
  p.text(r.x + 14, r.y + 12, String(i + 1), 13, C.muted);
}

/** Colour of a card by kind. */
function kindColor(s: GameState, id: string) {
  if (id === FILLER.id) return C.heal;
  const def = UPGRADES[id];
  if (def.kind === 'path') return schemeOf(s.hero!).accent;
  return def.kind === 'pool' ? '#7df9ff' : '#b48cff';
}

/** The level-up: three cards over the paused run. */
export function levelUp(scene: Phaser.Scene, s: GameState) {
  const p = new Panel(scene);
  p.dim(0.6);
  const reward = s.rewardPicks > 0;
  p.text(VIEW.w / 2, 70, reward ? t('arenaReward') : t('levelTitle', { n: s.level }), 30, reward ? C.elite : C.shard, { bold: true, origin: [0.5, 0], glow: true });
  p.text(VIEW.w / 2, 108, `${reward ? t('freeTier') : t('chooseUpgrade')}  ·  ${t('tapCard')}`, 14, C.muted, { origin: [0.5, 0] });
  const choices = s.choices ?? [];
  choices.forEach((id, i) => {
    const r = levelCardRect(i, choices.length);
    const color = kindColor(s, id);
    p.frame(r, color);
    p.spots.push({ id, ...r });
    const cx = r.x + r.w / 2;
    const left = r.x + 16;
    const wrap = r.w - 32;
    if (id === FILLER.id) {
      p.text(cx, r.y + 22, t('supplies'), 11, color, { bold: true, origin: [0.5, 0] });
      p.text(cx, r.y + 48, t(FILLER.name), 22, C.text, { bold: true, origin: [0.5, 0] });
      p.text(left, r.y + 100, t(FILLER.text), 14, C.text, { wrap });
      return;
    }
    const def = UPGRADES[id];
    const rank = s.ranks[id] ?? 0;
    const kind = t(def.kind === 'path' ? HEROES[s.hero!].pathKind : def.kind === 'pool' ? 'poolKind' : 'gearKind');
    p.text(cx, r.y + 18, kind, 11, color, { bold: true, origin: [0.5, 0] });
    p.text(cx, r.y + 40, t(def.name), 21, C.text, { bold: true, origin: [0.5, 0] });
    // Tier pips: held tiers filled, the one this card gives ringed.
    const pips = scene.add.graphics();
    for (let t = 0; t < MAX_TIER; t++) {
      const x = cx - 44 + t * 22;
      const y = r.y + 80;
      if (t < rank) pips.fillStyle(hex(color), 1).fillCircle(x, y, 5);
      else if (t === rank) pips.lineStyle(2, hex(color), 1).strokeCircle(x, y, 5).fillStyle(hex(color), 0.35).fillCircle(x, y, 5);
      else pips.lineStyle(1, hex(C.muted), 0.6).strokeCircle(x, y, 5);
    }
    p.add(pips, 2);
    p.text(cx, r.y + 94, rank === 0 ? t('newUpgrade') : t('tier', { n: rank + 1 }), 12, rank === 0 ? C.elite : C.muted, { bold: true, origin: [0.5, 0] });
    p.text(left, r.y + 118, t(def.tiers[rank]), 15, C.text, { bold: true, wrap });
    p.text(left, r.y + 160, t(def.blurb), 12.5, C.muted, { wrap });
    const cross = crossoverFor(id);
    const partner = cross ? (cross.path === id ? cross.pool : cross.path) : null;
    const hints: string[] = [];
    if (cross && partner && (UPGRADES[partner].kind !== 'path' || UPGRADES[partner].hero === s.hero)) {
      const done = s.crossovers.includes(cross.id);
      hints.push(t(done ? 'crossoverDone' : 'crossoverWith', { partner: t(UPGRADES[partner].name), text: t(cross.text) }));
    }
    const cap = capstoneFor(id, s.hero!);
    if (cap && !s.capstones.includes(cap.id)) hints.push(t('capstoneHint', { name: t(cap.name), path: t(UPGRADES[cap.path].name), n: MAX_TIER, gear: t(UPGRADES[cap.gear].name) }));
    p.text(left, r.y + 206, hints.join('\n'), 11.5, '#c9b2ff', { wrap });
    p.text(r.x + 12, r.y + 10, String(i + 1), 12, C.muted);
  });
  return p;
}

/** The end of a run: won or fallen, with the numbers and a button to go again. */
export function endScreen(scene: Phaser.Scene, s: GameState, progress: Progress) {
  const p = new Panel(scene);
  p.dim(0.7);
  const won = s.phase === 'won';
  const color = won ? C.elite : C.danger;
  p.text(VIEW.w / 2, 120, t(won ? 'victory' : 'fallen'), 46, color, { bold: true, origin: [0.5, 0], glow: true });
  const hero = HEROES[s.hero!];
  const planet = PLANETS[s.planet];
  const vars = { hero: t(hero.name), planet: t(planet.name), n: s.planet + 1, of: PLANETS.length };
  p.text(VIEW.w / 2, 182, t(won ? BOSSES[planet.boss].beaten : s.arena ? 'fellArena' : 'fellOn', vars), 17, C.text, { origin: [0.5, 0] });
  const caps = s.capstones.map((id) => t(CAPSTONES.find((c) => c.id === id)!.name));
  const lines = [
    t('runStats', { time: clock(s.runMs), level: s.level, kills: s.kills, elites: s.elitesKilled }),
    caps.length ? t('capstonesLine', { names: caps.join(', ') }) : '',
    t('longestRun', { time: clock(progress.bestMs) }),
  ].filter(Boolean);
  p.text(VIEW.w / 2, 226, lines.join('\n'), 15, C.muted, { origin: [0.5, 0], align: 'center' });
  p.frame(AGAIN, color);
  p.spots.push({ id: 'again', ...AGAIN });
  p.text(AGAIN.x + AGAIN.w / 2, AGAIN.y + AGAIN.h / 2, t('runAgain'), 19, C.text, { bold: true, origin: [0.5, 0.5] });
  p.text(VIEW.w / 2, AGAIN.y + AGAIN.h + 20, t('orEnter'), 12, C.muted, { origin: [0.5, 0] });
  return p;
}

/** A faint field of stars behind the map, from a fixed pattern. */
function stars(p: Panel, scene: Phaser.Scene) {
  const g = p.add(scene.add.graphics(), 1);
  for (let i = 0; i < 90; i++) {
    const n = Math.sin(i * 127.1) * 43758.5453;
    const m = Math.sin(i * 311.7) * 24634.6345;
    const x = (n - Math.floor(n)) * VIEW.w;
    const y = (m - Math.floor(m)) * VIEW.h;
    g.fillStyle(0xcfe0ff, 0.15 + ((i * 37) % 10) / 25).fillCircle(x, y, i % 7 === 0 ? 1.6 : 1);
  }
  return g;
}

/** A planet on the map: a glowing disc in its own colours. */
function planetDisc(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number, i: number, dim: boolean) {
  const def = PLANETS[i];
  const rim = hex(def.ground.deco);
  for (let k = 3; k >= 1; k--) g.lineStyle(2 + k * 5, rim, (dim ? 0.03 : 0.06) * (4 - k)).strokeCircle(x, y, r);
  g.fillStyle(hex(def.ground.field), 1).fillCircle(x, y, r);
  g.fillStyle(rim, dim ? 0.1 : 0.2).fillCircle(x - r * 0.25, y - r * 0.2, r * 0.55);
  g.lineStyle(2, rim, dim ? 0.5 : 0.95).strokeCircle(x, y, r);
}

/** A node's icon: a coin for the trader, a crown for the arena, a green cross for rest, a spark for events. */
function nodeIcon(g: Phaser.GameObjects.Graphics, kind: NodeKind, x: number, y: number) {
  const c = hex(NODE_INFO[kind].color);
  g.lineStyle(3, c, 1);
  if (kind === 'trader') {
    g.strokeCircle(x, y, 11);
    g.lineBetween(x, y - 6, x, y + 6);
  } else if (kind === 'elite') {
    // A crown.
    const crown = [[-12, 8], [-12, -6], [-6, 1], [0, -10], [6, 1], [12, -6], [12, 8]];
    g.beginPath();
    crown.forEach(([dx, dy], i) => (i === 0 ? g.moveTo(x + dx, y + dy) : g.lineTo(x + dx, y + dy)));
    g.closePath();
    g.strokePath();
  } else if (kind === 'rest') {
    g.fillStyle(c, 1).fillRect(x - 3, y - 11, 6, 22).fillRect(x - 11, y - 3, 22, 6);
  } else {
    g.lineBetween(x, y - 12, x, y + 12);
    g.lineBetween(x - 12, y, x + 12, y);
    g.lineBetween(x - 7, y - 7, x + 7, y + 7);
    g.lineBetween(x + 7, y - 7, x - 7, y + 7);
  }
}

/** The star map between planets: two or three nodes to choose from. */
export function starMap(scene: Phaser.Scene, s: GameState) {
  const p = new Panel(scene);
  p.dim(0.9);
  stars(p, scene);
  const next = s.planet + 1;
  p.text(VIEW.w / 2, 26, t('starMap'), 30, '#9fd8ff', { bold: true, origin: [0.5, 0], glow: true });
  p.text(VIEW.w / 2, 64, t('mapSubtitle', { planet: t(PLANETS[s.planet].name), n: s.credits, keys: s.nodes.map((_, i) => i + 1).join(', ') }), 14, C.muted, { origin: [0.5, 0] });
  const g = p.add(scene.add.graphics(), 1);
  const n = s.nodes.length;
  // The routes: from the cleared planet through each node to the next.
  for (let i = 0; i < n; i++) {
    const spot = mapNodeSpot(i, n);
    g.lineStyle(2, hex(NODE_INFO[s.nodes[i]].color), 0.35);
    g.lineBetween(MAP.from.x + 50, MAP.from.y, spot.x - MAP.node.r, spot.y);
    g.lineBetween(spot.x + MAP.node.r + 210, spot.y, MAP.to.x - 60, MAP.to.y);
  }
  planetDisc(g, MAP.from.x, MAP.from.y, 50, s.planet, true);
  planetDisc(g, MAP.to.x, MAP.to.y, 60, next, false);
  p.text(MAP.from.x, MAP.from.y + 64, t('planetCleared', { planet: t(PLANETS[s.planet].name) }), 13, C.muted, { origin: [0.5, 0], align: 'center' });
  p.text(MAP.to.x, MAP.to.y + 74, t('nextPlanet', { planet: planetLabel(next) }), 14, C.text, { bold: true, origin: [0.5, 0], align: 'center' });
  p.text(MAP.to.x, MAP.to.y + 94, t(PLANETS[next].faction), 12.5, PLANETS[next].ground.deco, { origin: [0.5, 0] });
  s.nodes.forEach((kind, i) => {
    const info = NODE_INFO[kind];
    const r = mapNodeRect(i, n);
    const spot = mapNodeSpot(i, n);
    p.frame(r, info.color);
    p.spots.push({ id: kind, ...r });
    const icon = p.add(scene.add.graphics(), 2);
    icon.fillStyle(0x070b16, 1).fillCircle(spot.x, spot.y, MAP.node.r);
    icon.lineStyle(2, hex(info.color), 1).strokeCircle(spot.x, spot.y, MAP.node.r);
    nodeIcon(icon, kind, spot.x, spot.y);
    p.text(spot.x + MAP.node.r + 14, spot.y - 22, t(info.name), 18, C.text, { bold: true });
    p.text(spot.x + MAP.node.r + 14, spot.y + 2, t(info.text), 12, C.muted, { wrap: r.x + r.w - (spot.x + MAP.node.r + 14) - 10 });
    p.text(r.x + 10, r.y + 8, String(i + 1), 12, C.muted);
  });
  return p;
}

/** A plain button. */
function button(p: Panel, r: Rect, id: string, label: string, color: string, enabled = true) {
  p.frame(r, enabled ? color : C.muted);
  p.spots.push({ id, ...r });
  p.text(r.x + r.w / 2, r.y + r.h / 2, label, 16, enabled ? C.text : C.muted, { bold: true, origin: [0.5, 0.5] });
}

/** The trader: three offers bought with credits, a reroll and the way out. */
export function trader(scene: Phaser.Scene, s: GameState) {
  const p = new Panel(scene);
  p.dim(0.85);
  stars(p, scene);
  p.text(VIEW.w / 2, 40, t('traderTitle'), 30, NODE_INFO.trader.color, { bold: true, origin: [0.5, 0], glow: true });
  p.text(VIEW.w / 2, 80, t('traderSubtitle', { n: s.credits }), 14, C.muted, { origin: [0.5, 0] });
  s.offers.forEach((id, i) => {
    const r = tradeCardRect(i);
    const cx = r.x + r.w / 2;
    if (!id) {
      p.frame(r, C.muted, '#0b1222');
      p.spots.push({ id: 'sold', ...r });
      p.text(cx, r.y + r.h / 2, t('sold'), 18, C.muted, { origin: [0.5, 0.5] });
      return;
    }
    const def = UPGRADES[id];
    const rank = s.ranks[id] ?? 0;
    const price = priceOf(s, id);
    const can = s.credits >= price;
    const color = kindColor(s, id);
    p.frame(r, can ? color : C.muted);
    p.spots.push({ id, ...r });
    const kind = t(def.kind === 'path' ? 'pathKind' : def.kind === 'pool' ? 'poolKind' : 'gearKind');
    p.text(cx, r.y + 16, kind, 11, color, { bold: true, origin: [0.5, 0] });
    p.text(cx, r.y + 36, t(def.name), 19, C.text, { bold: true, origin: [0.5, 0] });
    p.text(cx, r.y + 64, rank === 0 ? t('newUpgrade') : t('tier', { n: rank + 1 }), 12, rank === 0 ? C.elite : C.muted, { bold: true, origin: [0.5, 0] });
    p.text(r.x + 14, r.y + 88, t(def.tiers[rank]), 14, C.text, { bold: true, wrap: r.w - 28 });
    p.text(r.x + 14, r.y + 132, t(def.blurb), 12, C.muted, { wrap: r.w - 28 });
    p.text(cx, r.y + r.h - 30, t('credits', { n: price }), 16, can ? NODE_INFO.trader.color : C.danger, { bold: true, origin: [0.5, 0] });
    p.text(r.x + 10, r.y + 8, String(i + 1), 12, C.muted);
  });
  button(p, REROLL, 'reroll', t('reroll', { n: TRADE.reroll }), NODE_INFO.trader.color, s.credits >= TRADE.reroll);
  button(p, LEAVE, 'leave', t('leave'), '#9fd8ff');
  return p;
}

/** An event: what happened and two ways to answer it. */
export function eventPanel(scene: Phaser.Scene, s: GameState) {
  const p = new Panel(scene);
  p.dim(0.85);
  stars(p, scene);
  const ev = s.event!;
  p.text(VIEW.w / 2, 70, t('eventTitle'), 14, NODE_INFO.event.color, { bold: true, origin: [0.5, 0] });
  p.text(VIEW.w / 2, 92, t(ev.title), 30, C.text, { bold: true, origin: [0.5, 0], glow: true });
  p.text(VIEW.w / 2, 150, t(ev.text), 15, C.muted, { origin: [0.5, 0], align: 'center', wrap: 600 });
  p.text(VIEW.w / 2, 252, t('tapAnswer'), 13, C.muted, { origin: [0.5, 0] });
  // The shrine's trade names the two abilities.
  const names: Vars = ev.lose && ev.gain ? { lose: t(UPGRADES[ev.lose].name), gain: t(UPGRADES[ev.gain].name) } : {};
  ev.options.forEach((o, i) => {
    const r = eventOptionRect(i);
    p.frame(r, i === 0 ? NODE_INFO.event.color : '#9fd8ff');
    p.spots.push({ id: `option-${i}`, ...r });
    p.text(r.x + 18, r.y + 14, `${i + 1}   ${t(o.label)}`, 18, C.text, { bold: true });
    p.text(r.x + 40, r.y + 44, t(o.text, names), 13.5, C.muted, { wrap: r.w - 60 });
  });
  return p;
}
