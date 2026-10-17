/**
 * The full-screen panels drawn over the field: the hero select screen, the level-up cards and the
 * end of a run. Each is a list of HUD objects (scroll factor 0) the scene destroys when done, and
 * reports where its tappable rectangles are so the scene (and the playthrough test) can use them.
 */
import Phaser from 'phaser';
import { HEROES, HERO_IDS, schemeOf, type HeroId } from '../game/heroes';
import { clock, type GameState } from '../game/state';
import { CAPSTONES, FILLER, MAX_TIER, UPGRADES, capstoneFor, crossoverFor } from '../game/upgrades';
import type { Progress } from '../game/save';
import { C, hex } from '../art/glow';
import { portraitKey } from '../art/sprites';
import { AGAIN, DEPTH, FONT, VIEW, heroCardRect, levelCardRect, type Rect } from '../scenes/layout';

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
  p.text(VIEW.w / 2, 80, 'The Dune world  ·  survive 5:00, then destroy the Grinder Crawler', 15, C.muted, { origin: [0.5, 0] });
  HERO_IDS.forEach((id, i) => heroCard(p, scene, id, i, progress));
  const best = progress.bestMs > 0 ? `Longest run ${clock(progress.bestMs)}` : 'Choose your soldier';
  p.text(VIEW.w / 2, VIEW.h - 22, `${best}  ·  tap a card or press 1, 2 or 3`, 13, C.muted, { origin: [0.5, 0.5] });
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
  p.text(cx, r.y + 160, hero.name, 21, C.text, { bold: true, origin: [0.5, 0] });
  p.text(cx, r.y + 188, hero.weapon, 14, sch.accent, { origin: [0.5, 0] });
  p.text(cx, r.y + 212, `Health ${hero.maxHp}  ·  Speed ${hero.speed}`, 12, C.muted, { origin: [0.5, 0] });
  const left = r.x + 18;
  const wrap = r.w - 36;
  p.text(left, r.y + 236, hero.blurb, 12.5, C.text, { wrap });
  p.text(left, r.y + 276, `Signature: ${hero.signature.name}`, 13, sch.accent, { bold: true });
  p.text(left, r.y + 294, hero.signature.text, 12, C.muted, { wrap });
  p.text(left, r.y + 318, `Paths: ${hero.paths.map((pid) => UPGRADES[pid].name).join(', ')}`, 12, C.text, { wrap });
  const wins = progress.wins[id] ?? 0;
  if (wins > 0) p.text(r.x + r.w - 14, r.y + 12, `${wins} win${wins === 1 ? '' : 's'}`, 12, C.elite, { origin: [1, 0] });
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
  p.text(VIEW.w / 2, 70, `LEVEL ${s.level}`, 30, C.shard, { bold: true, origin: [0.5, 0], glow: true });
  p.text(VIEW.w / 2, 108, 'Choose one upgrade  ·  tap a card or press 1, 2 or 3', 14, C.muted, { origin: [0.5, 0] });
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
      p.text(cx, r.y + 22, 'SUPPLIES', 11, color, { bold: true, origin: [0.5, 0] });
      p.text(cx, r.y + 48, FILLER.name, 22, C.text, { bold: true, origin: [0.5, 0] });
      p.text(left, r.y + 100, FILLER.text, 14, C.text, { wrap });
      return;
    }
    const def = UPGRADES[id];
    const rank = s.ranks[id] ?? 0;
    const kind = def.kind === 'path' ? `${HEROES[s.hero!].name.split(' ').pop()!.toUpperCase()} PATH` : def.kind === 'pool' ? 'BLASTER POOL' : 'GEAR';
    p.text(cx, r.y + 18, kind, 11, color, { bold: true, origin: [0.5, 0] });
    p.text(cx, r.y + 40, def.name, 21, C.text, { bold: true, origin: [0.5, 0] });
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
    p.text(cx, r.y + 94, rank === 0 ? 'NEW' : `Tier ${rank + 1}`, 12, rank === 0 ? C.elite : C.muted, { bold: true, origin: [0.5, 0] });
    p.text(left, r.y + 118, def.tiers[rank], 15, C.text, { bold: true, wrap });
    p.text(left, r.y + 160, def.blurb, 12.5, C.muted, { wrap });
    const cross = crossoverFor(id);
    const partner = cross ? (cross.path === id ? cross.pool : cross.path) : null;
    const hints: string[] = [];
    if (cross && partner && (UPGRADES[partner].kind !== 'path' || UPGRADES[partner].hero === s.hero)) {
      const done = s.crossovers.includes(cross.id);
      hints.push(`${done ? 'Crossover' : 'With'} ${UPGRADES[partner].name}: ${cross.text}`);
    }
    const cap = capstoneFor(id, s.hero!);
    if (cap && !s.capstones.includes(cap.id)) hints.push(`Capstone ${cap.name}: ${UPGRADES[cap.path].name} tier 5 + ${UPGRADES[cap.gear].name}`);
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
  p.text(VIEW.w / 2, 120, won ? 'VICTORY' : 'FALLEN', 46, color, { bold: true, origin: [0.5, 0], glow: true });
  const hero = HEROES[s.hero!];
  p.text(VIEW.w / 2, 182, won ? `${hero.name} broke the Grinder Crawler.` : `${hero.name} fell on the Dune world.`, 17, C.text, { origin: [0.5, 0] });
  const caps = s.capstones.map((id) => CAPSTONES.find((c) => c.id === id)!.name);
  const lines = [
    `Time ${clock(s.time)}   ·   Level ${s.level}   ·   ${s.kills} droids   ·   ${s.elitesKilled} elites`,
    caps.length ? `Capstones: ${caps.join(', ')}` : '',
    `Longest run ${clock(progress.bestMs)}`,
  ].filter(Boolean);
  p.text(VIEW.w / 2, 226, lines.join('\n'), 15, C.muted, { origin: [0.5, 0], align: 'center' });
  p.frame(AGAIN, color);
  p.spots.push({ id: 'again', ...AGAIN });
  p.text(AGAIN.x + AGAIN.w / 2, AGAIN.y + AGAIN.h / 2, 'Run again', 19, C.text, { bold: true, origin: [0.5, 0.5] });
  p.text(VIEW.w / 2, AGAIN.y + AGAIN.h + 20, 'or press Enter', 12, C.muted, { origin: [0.5, 0] });
  return p;
}
