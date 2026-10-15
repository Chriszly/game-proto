// The HUD pieces that sit outside the panel's buttons: the top bar with its three-pip age track,
// the deeds card, the horn toast and the minimap. Each is a small class the GameScene updates every
// frame; all of them are fixed to the screen (scroll factor 0).
import Phaser from 'phaser';
import { ARMY_DEED, BUILDINGS, DEEDS, FACTIONS, MAP_SIZE, RELICS, RESOURCES, TILE, type FactionId, type RelicId } from '../game/data';
import { DIRT, ROCK, WATER } from '../game/map';
import { AI, deedCount, monumentLeft, NEUTRAL, PLAYER, popCap, popUsed, type GameState, type Player } from '../game/sim';
import { WOOL } from '../art/figures';
import { hexNum, mix, SERIF, T } from '../art/stitch';
import { settings } from '../../../../shared/settings';
import { AGE_PIPS, DEED_CARD, MINI, STATUS_CARD, TOAST, TOP_SLOTS } from './layout';

const HUD_DEPTH = 9990;
const ink = (size: number, color: string = T.ink, bold = true): Phaser.Types.GameObjects.Text.TextStyle => ({
  fontFamily: SERIF,
  fontSize: `${size}px`,
  fontStyle: bold ? 'bold' : 'normal',
  color,
});

/** Thread-like dashes along a line in a Graphics: a run of short stitches. */
export function stitchLine(g: Phaser.GameObjects.Graphics, x0: number, y0: number, x1: number, y1: number, width: number, col: number, alpha = 1) {
  const len = Math.hypot(x1 - x0, y1 - y0);
  if (len < 0.5) return;
  const n = Math.max(1, Math.round(len / 2.75));
  g.lineStyle(width, col, alpha);
  for (let i = 0; i < n; i++) {
    const a = i / n;
    const b = Math.min(1, (i + 0.8) / n);
    g.lineBetween(x0 + (x1 - x0) * a, y0 + (y1 - y0) * a, x0 + (x1 - x0) * b, y0 + (y1 - y0) * b);
  }
}

/** A dashed (chain-stitch) ellipse. */
export function stitchEllipse(g: Phaser.GameObjects.Graphics, x: number, y: number, rx: number, ry: number, width: number, col: number) {
  const n = Math.max(12, Math.round((rx + ry) * 1.2));
  g.lineStyle(width, col, 1);
  for (let i = 0; i < n; i += 2) {
    const a0 = (i / n) * Math.PI * 2;
    const a1 = ((i + 1.4) / n) * Math.PI * 2;
    g.lineBetween(x + Math.cos(a0) * rx, y + Math.sin(a0) * ry, x + Math.cos(a1) * rx, y + Math.sin(a1) * ry);
  }
}

const fixed = <G extends Phaser.GameObjects.Components.ScrollFactor & Phaser.GameObjects.Components.Depth>(o: G, d = 1) => o.setScrollFactor(0).setDepth(HUD_DEPTH + d);

/** The top border: resources, population, the age track, the clock and the faction. */
export class TopBar {
  private values: Partial<Record<string, Phaser.GameObjects.Text>> = {};
  private labels: Partial<Record<string, Phaser.GameObjects.Text>> = {};
  private pips: Phaser.GameObjects.Graphics;
  private pipText: Phaser.GameObjects.Text[] = [];
  private boonIcon: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, faction: FactionId) {
    fixed(scene.add.image(0, 0, 'topbar').setOrigin(0, 0), 0);
    const slots: [string, number, string][] = [['wood', TOP_SLOTS.wood, 'WOOD'], ['food', TOP_SLOTS.food, 'FOOD'], ['ore', TOP_SLOTS.ore, 'ORE'], ['pop', TOP_SLOTS.pop, 'POP']];
    for (const [key, x, label] of slots) {
      fixed(scene.add.image(x + 8, 15, `icon-${key}`), 2);
      this.values[key] = fixed(scene.add.text(x + 19, 15, '', ink(14)).setOrigin(0, 0.5), 2);
      this.labels[key] = fixed(scene.add.text(x + 60, 16, label, ink(8.5, T.faded)).setOrigin(0, 0.5), 2);
    }
    fixed(scene.add.text(TOP_SLOTS.age, 15, 'AGE', ink(10)).setOrigin(0, 0.5), 2);
    this.pips = fixed(scene.add.graphics(), 2);
    ['I', 'II', 'III'].forEach((p, k) => this.pipText.push(fixed(scene.add.text(AGE_PIPS.x + k * AGE_PIPS.gap, AGE_PIPS.y, p, ink(7, T.ink)).setOrigin(0.5, 0.5), 3)));
    fixed(scene.add.image(TOP_SLOTS.clock + 8, 15, 'icon-clock'), 2);
    this.values.clock = fixed(scene.add.text(TOP_SLOTS.clock + 19, 15, '', ink(14)).setOrigin(0, 0.5), 2);
    fixed(scene.add.image(TOP_SLOTS.faction + 8, 15, `icon-banner-${faction}`), 2);
    fixed(scene.add.text(TOP_SLOTS.faction + 20, 15, FACTIONS[faction].name.toUpperCase(), ink(12.5, WOOL[faction].cloth)).setOrigin(0, 0.5), 2);
    this.boonIcon = fixed(scene.add.image(722, 15, 'icon-shield').setVisible(false), 2);
  }

  update(s: GameState) {
    const p = s.players[PLAYER];
    for (const r of RESOURCES) this.set(r, String(Math.floor(p.res[r])));
    this.set('pop', `${popUsed(s, PLAYER)}/${popCap(s, PLAYER)}`);
    const secs = Math.floor(s.time / 1000);
    this.values.clock!.setText(`${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`);
    // The age track: a pip per age, filled when reached; the next one fills as its deeds are done.
    const g = this.pips.clear();
    const part = p.age === 1 ? 0 : p.age === 2 ? deedCount(p) / 3 : 1;
    for (let k = 0; k < 3; k++) {
      const x = AGE_PIPS.x + k * AGE_PIPS.gap;
      const done = k < p.age;
      g.fillStyle(hexNum(done ? T.ochre : T.card), 1).fillCircle(x, AGE_PIPS.y, AGE_PIPS.r);
      if (k === p.age && part > 0) {
        g.lineStyle(2.4, hexNum(mix(T.ochre, T.card, 0.2)), 1);
        g.beginPath();
        g.arc(x, AGE_PIPS.y, AGE_PIPS.r - 1.4, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * part);
        g.strokePath();
      }
      stitchEllipse(g, x, AGE_PIPS.y, AGE_PIPS.r, AGE_PIPS.r, 0.9, hexNum(T.ink));
      this.pipText[k].setColor(done ? T.ink : T.faded);
    }
    if (p.boon) this.boonIcon.setTexture(p.boon === 'shieldwall' ? 'icon-shield' : 'icon-wheat').setVisible(true);
  }

  private set(key: string, v: string) {
    const t = this.values[key]!;
    t.setText(v);
    this.labels[key]?.setX(t.x + t.width + 3);
  }
}

/** The deeds for Age III, as a stitched card under the top bar. */
export class DeedCard {
  private title: Phaser.GameObjects.Text;
  private count: Phaser.GameObjects.Text;
  private rows: { name: Phaser.GameObjects.Text; sub: Phaser.GameObjects.Text }[] = [];
  private foot: Phaser.GameObjects.Text;
  private g: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene) {
    const { x, y, w } = DEED_CARD;
    fixed(scene.add.image(x - 2, y - 2, 'card-deeds').setOrigin(0, 0), 0);
    this.g = fixed(scene.add.graphics(), 1);
    this.title = fixed(scene.add.text(x + 9, y + 12, 'DEEDS FOR AGE III', ink(11.5, T.red)).setOrigin(0, 0.5), 2);
    this.count = fixed(scene.add.text(x + w - 9, y + 12, '', ink(12)).setOrigin(1, 0.5), 2);
    DEEDS.forEach((d, i) => {
      const ry = y + 32 + i * 16;
      this.rows.push({
        name: fixed(scene.add.text(x + 26, ry, d.name, ink(11)).setOrigin(0, 0.5), 2),
        sub: fixed(scene.add.text(x + w - 9, ry + 0.5, '', ink(9, T.faded, false)).setOrigin(1, 0.5), 2),
      });
    });
    this.foot = fixed(scene.add.text(x + 9, y + DEED_CARD.h - 11, '', { ...ink(9.5, T.indigo, false), fontStyle: 'italic' }).setOrigin(0, 0.5), 2);
  }

  update(s: GameState) {
    const p: Player = s.players[PLAYER];
    const { x, y, w } = DEED_CARD;
    const g = this.g.clear();
    stitchLine(g, x + 4, y + 22, x + w - 4, y + 22, 0.8, hexNum(T.ochre));
    const raid = s.raid && s.raid.target === PLAYER ? s.raid : null;
    const rows: { done: boolean; frac: number; sub: string }[] = [
      { done: p.deeds.age2, frac: p.age >= 2 ? 1 : 0, sub: '' },
      { done: p.deeds.army >= ARMY_DEED, frac: Math.min(1, p.deeds.army / ARMY_DEED), sub: `${Math.min(p.deeds.army, ARMY_DEED)} of ${ARMY_DEED}` },
      { done: p.deeds.raid, frac: raid ? raid.routed / raid.size : 0, sub: raid ? `${raid.routed} of ${raid.size} routed` : 'none yet' },
    ];
    rows.forEach((r, i) => {
      const ry = y + 32 + i * 16;
      g.fillStyle(hexNum(r.done ? T.green : T.card), 1).fillCircle(x + 15, ry, 5.5);
      stitchEllipse(g, x + 15, ry, 5.5, 5.5, 0.8, hexNum(T.ink));
      if (r.done) {
        g.lineStyle(1.5, hexNum(T.card), 1);
        g.beginPath();
        g.moveTo(x + 12, ry);
        g.lineTo(x + 14.5, ry + 2.5);
        g.lineTo(x + 18.5, ry - 2.5);
        g.strokePath();
      }
      this.rows[i].name.setColor(r.done ? '#5a5040' : T.ink);
      this.rows[i].sub.setText(r.done || i === 0 ? '' : r.sub);
      if (!r.done && i > 0) {
        stitchLine(g, x + 128, ry, x + 160, ry, 3, hexNum('#c8b890'));
        if (r.frac > 0) stitchLine(g, x + 128, ry, x + 128 + 32 * r.frac, ry, 3, hexNum(T.red));
      }
    });
    const n = deedCount(p);
    this.count.setText(`${n} / 3`);
    if (p.age >= 3) {
      this.title.setText('AGE III REACHED');
      this.foot.setText('Every soldier deals +2 damage');
    } else if (n === 3) this.foot.setText('Research Age III at the Town Center');
    else this.foot.setText('Then Age III: soldiers deal +2 damage');
  }

  contains(px: number, py: number) {
    return px >= DEED_CARD.x && px <= DEED_CARD.x + DEED_CARD.w && py >= DEED_CARD.y && py <= DEED_CARD.y + DEED_CARD.h;
  }
}

const RELIC_ICON: Record<RelicId, string> = { plenty: 'icon-wheat', valor: 'icon-sword', haste: 'icon-feather' };

/** Who holds each relic (a green ring for yours, the enemy's colour for theirs), and a standing Monument's count. */
export class StatusCard {
  private bg: Phaser.GameObjects.Image;
  private g: Phaser.GameObjects.Graphics;
  private icons: Phaser.GameObjects.Image[] = [];
  private held: Phaser.GameObjects.Text;
  private monument: Phaser.GameObjects.Text;
  private relics = Object.keys(RELICS) as RelicId[];
  /** The Monument line on show, for the test and the screenshots. */
  shown = '';

  constructor(scene: Phaser.Scene, private foeCloth: string) {
    const { x, y } = STATUS_CARD;
    this.bg = fixed(scene.add.image(x - 2, y - 2, 'card-status').setOrigin(0, 0), 0);
    this.g = fixed(scene.add.graphics(), 1);
    fixed(scene.add.text(x + 9, y + 15, 'RELICS', ink(11.5, T.red)).setOrigin(0, 0.5), 2);
    this.relics.forEach((r, i) => this.icons.push(fixed(scene.add.image(x + 84 + i * 26, y + 15, RELIC_ICON[r]), 2)));
    this.held = fixed(scene.add.text(x + STATUS_CARD.w - 9, y + 15.5, '', ink(9, T.faded, false)).setOrigin(1, 0.5), 2);
    this.monument = fixed(scene.add.text(x + 9, y + 38, '', ink(11, T.red)).setOrigin(0, 0.5), 2);
  }

  update(s: GameState) {
    const { x, y } = STATUS_CARD;
    const g = this.g.clear();
    let mine = 0;
    this.relics.forEach((r, i) => {
      const holder = s.camps.find((c) => c.relic === r)?.holder ?? null;
      if (holder === PLAYER) mine++;
      const col = holder === PLAYER ? T.green : holder === null ? '#c8b890' : this.foeCloth;
      stitchEllipse(g, x + 84 + i * 26, y + 15, 10, 10, holder === null ? 0.9 : 1.8, hexNum(col));
    });
    this.held.setText(`${mine} held`);
    const own = monumentLeft(s, PLAYER);
    const foe = monumentLeft(s, AI);
    const clock = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')}`;
    const line = own !== null && (foe === null || own <= foe) ? `YOUR MONUMENT · ${clock(own)} TO VICTORY` : foe !== null ? `ENEMY MONUMENT · ${clock(foe)} TO DESTROY IT` : '';
    this.shown = line;
    this.monument.setText(line).setColor(own !== null && line.startsWith('YOUR') ? T.green : T.red);
    this.bg.setTexture(line ? 'card-status-tall' : 'card-status');
    if (line) stitchLine(g, x + 4, y + 28, x + STATUS_CARD.w - 4, y + 28, 0.8, hexNum(T.ochre));
  }

  contains(px: number, py: number) {
    const h = this.shown ? STATUS_CARD.hMonument : STATUS_CARD.h;
    return px >= STATUS_CARD.x && px <= STATUS_CARD.x + STATUS_CARD.w && py >= STATUS_CARD.y && py <= STATUS_CARD.y + h;
  }
}

/** The horn toast: names a raid and points towards it; also carries short notices. */
export class Toast {
  private bg: Phaser.GameObjects.Image;
  private horn: Phaser.GameObjects.Image;
  private text: Phaser.GameObjects.Text;
  private arrow: Phaser.GameObjects.Graphics;
  /** The text on show, for the test. */
  shown = '';

  constructor(scene: Phaser.Scene) {
    this.bg = fixed(scene.add.image(TOAST.x, TOAST.y + TOAST.h / 2, 'card-toast'), 0);
    this.horn = fixed(scene.add.image(TOAST.x - TOAST.w / 2 + 18, TOAST.y + TOAST.h / 2, 'icon-horn'), 1);
    this.text = fixed(scene.add.text(TOAST.x, TOAST.y + TOAST.h / 2 + 0.5, '', ink(11, T.red)).setOrigin(0.5, 0.5), 1);
    this.arrow = fixed(scene.add.graphics({ x: TOAST.x + TOAST.w / 2 - 16, y: TOAST.y + TOAST.h / 2 }), 1);
    this.arrow.fillStyle(hexNum(T.red), 1).fillTriangle(-5, -6, 7, 0, -5, 6);
    this.arrow.lineStyle(0.8, hexNum(T.ink), 1).strokeTriangle(-5, -6, 7, 0, -5, 6);
    this.hide();
  }

  /** Shows a line; `pointAt` is the screen angle to the raid, or null for a plain notice. */
  show(text: string, pointAt: number | null) {
    this.shown = text;
    this.text.setText(text);
    this.bg.setVisible(true);
    this.text.setVisible(true);
    this.horn.setVisible(pointAt !== null);
    this.arrow.setVisible(pointAt !== null);
    if (pointAt !== null) this.arrow.setRotation(pointAt);
  }

  hide() {
    this.shown = '';
    this.bg.setVisible(false);
    this.text.setVisible(false);
    this.horn.setVisible(false);
    this.arrow.setVisible(false);
  }

  contains(px: number, py: number) {
    return this.bg.visible && Math.abs(px - TOAST.x) <= TOAST.w / 2 && py >= TOAST.y && py <= TOAST.y + TOAST.h;
  }
}

const MINI_COLOURS: Record<number, [number, number, number]> = {
  0: [207, 194, 154],
  [WATER]: [74, 95, 140],
  [ROCK]: [154, 154, 140],
  [DIRT]: [184, 149, 94],
};

const rgb = (c: string): [number, number, number] => {
  const n = hexNum(c);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

/** The minimap in the panel: the land as embroidered, fog, buildings, units, the view and raid pings. */
export class Minimap {
  private tex: Phaser.Textures.CanvasTexture;
  private small: HTMLCanvasElement;
  private data: ImageData;
  private g: Phaser.GameObjects.Graphics;
  private hint: Phaser.GameObjects.Text;
  private clock = 1e9;

  constructor(scene: Phaser.Scene, private terrain: Uint8Array, aiFaction: FactionId, faction: FactionId) {
    if (scene.textures.exists('minimap')) scene.textures.remove('minimap');
    this.tex = scene.textures.createCanvas('minimap', MINI.s, MINI.s)!;
    fixed(scene.add.image(MINI.x, MINI.y, 'minimap').setOrigin(0, 0), 1);
    this.small = document.createElement('canvas');
    this.small.width = MAP_SIZE;
    this.small.height = MAP_SIZE;
    this.data = new ImageData(MAP_SIZE, MAP_SIZE);
    this.g = fixed(scene.add.graphics(), 2);
    this.hint = fixed(scene.add.text(0, 0, '?', ink(10, T.indigo)).setOrigin(0.5, 0.5), 3);
    this.own = rgb(WOOL[faction].cloth);
    this.foe = rgb(WOOL[aiFaction].cloth);
  }

  private own: [number, number, number];
  private foe: [number, number, number];

  update(s: GameState, dt: number, view: Phaser.Geom.Rectangle) {
    this.clock += dt;
    if (this.clock >= 300) {
      this.clock = 0;
      this.paint(s);
    }
    const k = MINI.s / MAP_SIZE;
    const g = this.g.clear();
    // The camera's view, in ink thread.
    const vx = MINI.x + (view.x / TILE) * k;
    const vy = MINI.y + (view.y / TILE) * k;
    const vw = (view.width / TILE) * k;
    const vh = (view.height / TILE) * k;
    stitchLine(g, vx, vy, vx + vw, vy, 0.8, hexNum(T.ink));
    stitchLine(g, vx + vw, vy, vx + vw, vy + vh, 0.8, hexNum(T.ink));
    stitchLine(g, vx + vw, vy + vh, vx, vy + vh, 0.8, hexNum(T.ink));
    stitchLine(g, vx, vy + vh, vx, vy, 0.8, hexNum(T.ink));
    // The enemy's corner, marked until it has been seen.
    const foeTown = [...s.buildings.values()].find((b) => b.owner !== PLAYER && b.type === 'town');
    const seen = foeTown ? s.sight[foeTown.ty * MAP_SIZE + foeTown.tx] > 0 : true;
    if (foeTown && !seen) {
      const hx = MINI.x + (foeTown.tx + 2) * k;
      const hy = MINI.y + (foeTown.ty + 2) * k;
      stitchEllipse(g, hx, hy, 8, 8, 1, hexNum(T.indigo));
      this.hint.setPosition(hx, hy + 0.5).setVisible(true);
    } else this.hint.setVisible(false);
    // A raid pulses rings of running stitch where it is.
    const r = s.raid;
    if (r && r.target === PLAYER) {
      const px = MINI.x + r.x * k;
      const py = MINI.y + r.y * k;
      for (let i = 0; i < 3; i++) {
        const rad = settings.reduceMotion ? 4 + i * 4 : 3 + ((s.time / 60 + i * 6) % 18);
        const a = settings.reduceMotion ? 1 : 1 - (rad - 3) / 18;
        g.lineStyle(1.3, hexNum(T.red), a);
        const n = 14;
        for (let j = 0; j < n; j += 2) g.lineBetween(px + Math.cos((j / n) * 6.283) * rad, py + Math.sin((j / n) * 6.283) * rad, px + Math.cos(((j + 1.3) / n) * 6.283) * rad, py + Math.sin(((j + 1.3) / n) * 6.283) * rad);
      }
      g.fillStyle(hexNum(T.red), 1).fillCircle(px, py, 1.6);
    }
  }

  private paint(s: GameState) {
    const d = this.data.data;
    const fog = rgb(T.fog);
    for (let i = 0; i < MAP_SIZE * MAP_SIZE; i++) {
      const v = s.sight[i];
      let [r, g, b] = MINI_COLOURS[this.terrain[i]] ?? MINI_COLOURS[0];
      if (v === 0) [r, g, b] = fog;
      else if (v === 1) [r, g, b] = [(r + fog[0]) / 2, (g + fog[1]) / 2, (b + fog[2]) / 2];
      d[i * 4] = r;
      d[i * 4 + 1] = g;
      d[i * 4 + 2] = b;
      d[i * 4 + 3] = 255;
    }
    const put = (x: number, y: number, c: [number, number, number]) => {
      if (x < 0 || y < 0 || x >= MAP_SIZE || y >= MAP_SIZE) return;
      const i = (y * MAP_SIZE + x) * 4;
      d[i] = c[0];
      d[i + 1] = c[1];
      d[i + 2] = c[2];
    };
    const green: [number, number, number] = [78, 102, 64];
    const gold: [number, number, number] = [201, 154, 58];
    for (const n of s.nodes.values()) {
      if (s.sight[n.ty * MAP_SIZE + n.tx] === 0) continue;
      for (let j = 0; j < n.h; j++) for (let i = 0; i < n.w; i++) put(n.tx + i, n.ty + j, n.kind === 'mine' ? gold : green);
    }
    const wild: [number, number, number] = [122, 85, 48];
    const pale: [number, number, number] = [239, 228, 198];
    for (const c of s.camps) {
      if (c.claimed || s.sight[c.ty * MAP_SIZE + c.tx] === 0) continue;
      const col = c.holder === PLAYER ? this.own : c.holder === null ? (c.kind === 'relic' ? pale : gold) : this.foe;
      for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) put(c.tx + i, c.ty + j, col);
    }
    for (const b of s.buildings.values()) {
      // A Monument shows on every map once it is begun, as it does in the fog for everyone.
      if (b.owner !== PLAYER && b.type !== 'monument' && s.sight[b.ty * MAP_SIZE + b.tx] === 0) continue;
      const def = BUILDINGS[b.type];
      for (let j = 0; j < def.h; j++) for (let i = 0; i < def.w; i++) put(b.tx + i, b.ty + j, b.owner === PLAYER ? this.own : this.foe);
    }
    for (const u of s.units.values()) {
      const tx = Math.floor(u.x);
      const ty = Math.floor(u.y);
      if (u.owner !== PLAYER && s.sight[ty * MAP_SIZE + tx] !== 2) continue;
      const c = u.owner === PLAYER ? this.own : u.owner === NEUTRAL ? wild : this.foe;
      put(tx, ty, c);
      put(tx + 1, ty, c);
      put(tx, ty + 1, c);
      put(tx + 1, ty + 1, c);
    }
    this.small.getContext('2d')!.putImageData(this.data, 0, 0);
    const c = this.tex.getContext();
    c.imageSmoothingEnabled = true;
    c.clearRect(0, 0, MINI.s, MINI.s);
    c.drawImage(this.small, 0, 0, MINI.s, MINI.s);
    this.tex.refresh();
  }

  contains(px: number, py: number) {
    return px >= MINI.x && px < MINI.x + MINI.s && py >= MINI.y && py < MINI.y + MINI.s;
  }

  /** The world tile under a point on the minimap. */
  toTile(px: number, py: number) {
    return { x: ((px - MINI.x) / MINI.s) * MAP_SIZE, y: ((py - MINI.y) / MINI.s) * MAP_SIZE };
  }
}
