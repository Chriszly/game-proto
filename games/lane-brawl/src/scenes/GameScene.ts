import Phaser from 'phaser';
import { ABILITY_KEYS, AbilityKey, BASE, CAMPS, CHAMPIONS, ChampionDef, ITEMS, ItemDef, LANES, SIDE_COLOR, Shape, Team, Vec, WORLD, XP_FOR_LEVEL, MAX_LEVEL, TOWERS } from '../game/data';
import { Fx, GameState, Phase, Unit, createGame, getUnit, dist } from '../game/state';
import { buy, cast, commandAttack, commandMove, tick } from '../game/sim';
import { byDifficulty, settings } from '../../../../shared/settings';
import {
  BOTTOM_BAR,
  END_PANEL,
  FONT,
  MINIMAP,
  PLAY_AGAIN,
  PORTRAIT,
  SHOP_BUTTON,
  SHOP_PANEL,
  TOP_BAR,
  VIEW,
  abilityBox,
  pickCard,
  shopRow,
} from './layout';

/** Simulation step in ms. Each frame runs as many steps as the time since the last frame needs. */
const STEP = 16;
/** Red's units deal this much damage, by difficulty. */
const ENEMY_DAMAGE = byDifficulty(0.8, 1, 1.25);

interface Zone {
  x: number;
  y: number;
  w: number;
  h: number;
  run: () => void;
}

/** A visual still on screen, with the ms it has left. */
interface LiveFx {
  f: Fx;
  left: number;
}

const noop = () => undefined;

/** A CSS hex colour as a number Phaser's Graphics take. */
function col(hex: string): number {
  return parseInt(hex.slice(1), 16);
}

function describe(item: ItemDef): string {
  const parts: string[] = [];
  if (item.dmg) parts.push(`+${item.dmg} damage`);
  if (item.armor) parts.push(`+${item.armor} armor`);
  if (item.hp) parts.push(`+${item.hp} health`);
  if (item.speed) parts.push(`+${item.speed} speed`);
  return parts.join(', ');
}

/** The polygon points of a champion's shape, centred on (x, y). Null for a circle. */
function shapePoints(shape: Shape, x: number, y: number, r: number): Phaser.Math.Vector2[] | null {
  const pts = shapeVecs(shape, x, y, r);
  return pts && pts.map((p) => new Phaser.Math.Vector2(p.x, p.y));
}

function shapeVecs(shape: Shape, x: number, y: number, r: number): Vec[] | null {
  const around = (n: number, start: number, scale = 1) =>
    Array.from({ length: n }, (_, i) => {
      const a = start + (i * 2 * Math.PI) / n;
      return { x: x + Math.cos(a) * r * scale, y: y + Math.sin(a) * r * scale };
    });
  switch (shape) {
    case 'hex':
      return around(6, 0);
    case 'tri':
      return around(3, -Math.PI / 2);
    case 'diamond':
      return around(4, 0, 1.2);
    case 'square':
      return [
        { x: x - r * 0.85, y: y - r * 0.85 },
        { x: x + r * 0.85, y: y - r * 0.85 },
        { x: x + r * 0.85, y: y + r * 0.85 },
        { x: x - r * 0.85, y: y + r * 0.85 },
      ];
    case 'circle':
      return null;
  }
}

export class GameScene extends Phaser.Scene {
  /** The match in progress, or null on the pick screen. Read by the playthrough test. */
  state: GameState | null = null;
  private shopOpen = false;
  private acc = 0;
  private lastWorld: Vec = { x: BASE.blue.x, y: BASE.blue.y };
  private zones: Zone[] = [];
  private zoneKey = '';
  private liveFx: LiveFx[] = [];
  private mapG!: Phaser.GameObjects.Graphics;
  private unitG!: Phaser.GameObjects.Graphics;
  private fxG!: Phaser.GameObjects.Graphics;
  private hudG!: Phaser.GameObjects.Graphics;
  private texts = new Map<string, Phaser.GameObjects.Text>();
  private used = new Set<string>();
  private keys!: Record<AbilityKey | 'B' | 'ESC', Phaser.Input.Keyboard.Key>;

  constructor() {
    super('Game');
  }

  create() {
    this.cameras.main.setBounds(0, 0, WORLD.w, WORLD.h);
    this.mapG = this.add.graphics();
    this.drawMap();
    this.unitG = this.add.graphics().setDepth(1);
    this.fxG = this.add.graphics().setDepth(2);
    this.hudG = this.add.graphics().setDepth(10).setScrollFactor(0);

    this.keys = this.input.keyboard!.addKeys('Q,W,E,R,B,ESC') as Record<AbilityKey | 'B' | 'ESC', Phaser.Input.Keyboard.Key>;
    for (const k of ABILITY_KEYS) this.keys[k].on('down', () => this.castAtCursor(k));
    this.keys.B.on('down', () => this.toggleShop());
    this.keys.ESC.on('down', () => this.setShop(false));

    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      this.lastWorld = { x: p.worldX, y: p.worldY };
    });
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.onPointerDown(p));
    this.cameras.main.centerOn(BASE.blue.x + 300, BASE.blue.y - 200);
    this.refreshZones();
  }

  update(_time: number, delta: number) {
    const s = this.state;
    if (s && s.phase === 'playing') {
      this.acc += Math.min(delta, 250);
      while (this.acc >= STEP) {
        tick(s, STEP);
        this.acc -= STEP;
      }
    }
    if (s) this.collectFx(s, delta);
    this.followPlayer(delta);
    this.drawWorld();
    this.drawHud();
    this.refreshZones();
  }

  private startMatch(def: ChampionDef) {
    this.state = createGame(def, ENEMY_DAMAGE);
    this.shopOpen = false;
    this.liveFx = [];
    this.lastWorld = { x: BASE.blue.x + 70, y: BASE.blue.y - 40 };
    this.cameras.main.centerOn(BASE.blue.x + 70, BASE.blue.y - 40);
  }

  private resetToPick() {
    this.state = null;
    this.shopOpen = false;
    this.liveFx = [];
    this.cameras.main.centerOn(WORLD.w / 2, WORLD.h / 2);
  }

  private get phase(): Phase {
    return this.state ? this.state.phase : 'pick';
  }

  private player(): Unit | null {
    return this.state ? getUnit(this.state, this.state.player) : null;
  }

  private setShop(open: boolean) {
    this.shopOpen = open;
  }

  private toggleShop() {
    if (this.phase !== 'playing') return;
    this.setShop(!this.shopOpen);
  }

  private castAtCursor(key: AbilityKey) {
    const p = this.player();
    if (this.state && p) cast(this.state, p, key, this.lastWorld);
  }

  /** The zones the pointer can press, rebuilt when the screen they belong to changes. */
  private refreshZones() {
    const key = `${this.phase}|${this.shopOpen}`;
    if (key === this.zoneKey) return;
    this.zoneKey = key;
    this.zones = [];
    const phase = this.phase;
    if (phase === 'pick') {
      CHAMPIONS.forEach((def, i) => this.zones.push({ ...pickCard(i), run: () => this.startMatch(def) }));
      return;
    }
    if (phase === 'won' || phase === 'lost') {
      this.zones.push({ ...PLAY_AGAIN, run: () => this.resetToPick() });
      return;
    }
    // The bars block presses so a click on the HUD never walks the champion.
    this.zones.push({ ...TOP_BAR, run: noop }, { ...BOTTOM_BAR, run: noop });
    this.zones.push({ ...SHOP_BUTTON, run: () => this.toggleShop() });
    ABILITY_KEYS.forEach((k, i) => this.zones.push({ ...abilityBox(i), run: () => this.castAtCursor(k) }));
    if (this.shopOpen) {
      ITEMS.forEach((item, i) => this.zones.push({ ...shopRow(i), run: () => this.player() && this.state && buy(this.player()!, item.id) }));
      this.zones.push({ ...SHOP_PANEL, run: noop });
    }
  }

  private onPointerDown(p: Phaser.Input.Pointer) {
    const hit = this.zones.find((z) => p.x >= z.x && p.x <= z.x + z.w && p.y >= z.y && p.y <= z.y + z.h);
    if (hit) {
      hit.run();
      this.refreshZones();
      return;
    }
    if (this.phase !== 'playing' || !this.state) return;
    const w = { x: p.worldX, y: p.worldY };
    this.lastWorld = w;
    const me = this.player();
    if (!me) return;
    let foe: Unit | null = null;
    let best = Infinity;
    for (const u of this.state.units) {
      if (u.dead || u.side === me.side) continue;
      const d = dist(u, w);
      if (d <= u.radius + 12 && d < best) {
        foe = u;
        best = d;
      }
    }
    if (foe) commandAttack(this.state, foe.id);
    else commandMove(this.state, w);
  }

  /** Takes the visuals the sim raised this frame and ages the ones on screen. */
  private collectFx(s: GameState, delta: number) {
    if (!settings.reduceMotion) for (const f of s.fx) this.liveFx.push({ f, left: f.ms });
    s.fx.length = 0;
    for (const l of this.liveFx) l.left -= delta;
    this.liveFx = this.liveFx.filter((l) => l.left > 0);
  }

  private followPlayer(delta: number) {
    const me = this.player();
    if (!me) return;
    const cam = this.cameras.main;
    const cx = cam.scrollX + VIEW.w / 2;
    const cy = cam.scrollY + VIEW.h / 2;
    const k = settings.reduceMotion ? 1 : Math.min(1, delta / 120);
    cam.centerOn(cx + (me.x - cx) * k, cy + (me.y - cy) * k);
  }

  private drawMap() {
    const g = this.mapG;
    g.fillStyle(col('#3f7d4e'), 1).fillRect(0, 0, WORLD.w, WORLD.h);
    g.fillStyle(col('#326a43'), 1);
    for (const c of CAMPS) g.fillCircle(c.x, c.y, 120);
    for (const lane of Object.values(LANES)) {
      g.lineStyle(110, col('#c8b07a'), 1);
      g.beginPath();
      g.moveTo(lane[0].x, lane[0].y);
      for (const p of lane.slice(1)) g.lineTo(p.x, p.y);
      g.strokePath();
    }
    for (const team of ['blue', 'red'] as Team[]) {
      g.fillStyle(col(SIDE_COLOR[team]), 0.18).fillCircle(BASE[team].x, BASE[team].y, 260);
    }
    g.lineStyle(6, col('#24472e'), 1).strokeRect(0, 0, WORLD.w, WORLD.h);
  }

  private drawWorld() {
    const g = this.unitG;
    g.clear();
    const s = this.state;
    if (!s) return;
    const me = this.player();
    for (const u of s.units) {
      if (u.dead) continue;
      this.drawUnit(g, u);
    }
    for (const u of s.units) {
      if (u.dead) continue;
      this.drawBar(g, u, me);
    }
    for (const p of s.projectiles) {
      g.fillStyle(col(p.color), 1).fillCircle(p.x, p.y, 6);
    }

    const fx = this.fxG;
    fx.clear();
    for (const { f, left } of this.liveFx) {
      const alpha = Math.max(0, left / f.ms);
      if (f.kind === 'ring') {
        fx.lineStyle(4, col(f.color), alpha).strokeCircle(f.x, f.y, f.r);
      } else {
        fx.lineStyle(4, col(f.color), alpha).lineBetween(f.x, f.y, f.x2, f.y2);
      }
    }
  }

  private drawUnit(g: Phaser.GameObjects.Graphics, u: Unit) {
    const outline = col(SIDE_COLOR[u.side]);
    switch (u.kind) {
      case 'nexus':
        g.fillStyle(outline, 1).fillCircle(u.x, u.y, u.radius);
        g.fillStyle(0xffffff, 0.25).fillCircle(u.x, u.y, u.radius * 0.55);
        return;
      case 'tower':
        g.fillStyle(outline, 1).fillRect(u.x - u.radius, u.y - u.radius, u.radius * 2, u.radius * 2);
        g.lineStyle(3, 0x1d2430, 1).strokeRect(u.x - u.radius, u.y - u.radius, u.radius * 2, u.radius * 2);
        g.fillStyle(0xffffff, 0.8).fillCircle(u.x, u.y, 6);
        return;
      case 'minion':
        g.fillStyle(outline, 1).fillCircle(u.x, u.y, u.radius);
        g.lineStyle(2, 0x1d2430, 1).strokeCircle(u.x, u.y, u.radius);
        return;
      case 'camp':
        g.fillStyle(col('#7a5c3a'), 1).fillCircle(u.x, u.y, u.radius);
        g.lineStyle(3, col(SIDE_COLOR.neutral), 1).strokeCircle(u.x, u.y, u.radius);
        return;
      case 'champion': {
        const c = u.champ!;
        const pts = shapePoints(c.shape, u.x, u.y, u.radius);
        g.fillStyle(col(c.color), 1);
        g.lineStyle(4, outline, 1);
        if (pts) {
          g.fillPoints(pts, true);
          g.strokePoints(pts, true, true);
        } else {
          g.fillCircle(u.x, u.y, u.radius);
          g.strokeCircle(u.x, u.y, u.radius);
        }
        if (u.player) g.lineStyle(2, 0xffffff, 1).strokeCircle(u.x, u.y, u.radius + 6);
        return;
      }
    }
  }

  /** A health bar above a unit. Shield shows as a pale strip past the health. */
  private drawBar(g: Phaser.GameObjects.Graphics, u: Unit, me: Unit | null) {
    if (u.kind === 'minion' && u.hp >= u.maxHp) return;
    const w = Math.max(28, u.radius * 2 + 10);
    const x = u.x - w / 2;
    const y = u.y - u.radius - (u.kind === 'nexus' ? 60 : 14);
    const ratio = Math.max(0, u.hp / u.maxHp);
    const own = me !== null && u.side === me.side;
    g.fillStyle(0x1d2430, 1).fillRect(x, y, w, 5);
    g.fillStyle(own ? col('#6fe07f') : u.side === 'neutral' ? col(SIDE_COLOR.neutral) : col('#e0553f'), 1).fillRect(x, y, w * ratio, 5);
    if (u.shield > 0) g.fillStyle(0xbfe6ff, 1).fillRect(x, y - 3, Math.min(w, (u.shield / u.maxHp) * w), 2);
  }

  private t(key: string, x: number, y: number, str: string, size: number, color = '#f2f5fa', align: 'left' | 'center' | 'right' = 'left') {
    let obj = this.texts.get(key);
    if (!obj) {
      obj = this.add.text(0, 0, '', { fontFamily: FONT, fontSize: `${size}px`, color }).setScrollFactor(0).setDepth(11);
      this.texts.set(key, obj);
    }
    const xo = align === 'center' ? 0.5 : align === 'right' ? 1 : 0;
    obj.setOrigin(xo, 0).setPosition(x, y).setVisible(true).setColor(color);
    if (obj.text !== str) obj.setText(str);
    this.used.add(key);
  }

  private drawHud() {
    const g = this.hudG;
    g.clear();
    this.used.clear();
    if (this.phase === 'pick') this.drawPick(g);
    else if (this.state) this.drawPlaying(g, this.state);
    for (const [key, obj] of this.texts) if (!this.used.has(key)) obj.setVisible(false);
  }

  private drawPick(g: Phaser.GameObjects.Graphics) {
    g.fillStyle(col('#0e1420'), 1).fillRect(0, 0, VIEW.w, VIEW.h);
    this.t('title', VIEW.w / 2, 40, 'LANE BRAWL', 36, '#f2f5fa', 'center');
    this.t('sub', VIEW.w / 2, 92, 'Pick your champion. Your four allies fill the other roles, and five NPC champions fight you.', 13, '#9fb0c8', 'center');
    CHAMPIONS.forEach((c, i) => {
      const r = pickCard(i);
      g.fillStyle(col('#1f2a3c'), 1).fillRect(r.x, r.y, r.w, r.h);
      g.lineStyle(2, col(c.color), 1).strokeRect(r.x, r.y, r.w, r.h);
      const pts = shapePoints(c.shape, r.x + r.w / 2, r.y + 44, 26);
      g.fillStyle(col(c.color), 1);
      if (pts) g.fillPoints(pts, true);
      else g.fillCircle(r.x + r.w / 2, r.y + 44, 26);
      this.t(`pick-name-${i}`, r.x + r.w / 2, r.y + 86, c.name, 18, '#f2f5fa', 'center');
      this.t(`pick-role-${i}`, r.x + r.w / 2, r.y + 112, c.role, 12, '#9fb0c8', 'center');
      c.abilities.forEach((ab, j) => {
        this.t(`pick-ab-${i}-${j}`, r.x + 12, r.y + 138 + j * 20, `${ab.key} ${ab.name}`, 11, '#d9e2f0');
      });
    });
    this.t('hint', VIEW.w / 2, 410, 'Click a champion to start. Click the ground to walk, an enemy to attack.', 12, '#9fb0c8', 'center');
    this.t('hint2', VIEW.w / 2, 430, 'Q W E R cast at the cursor. B opens the shop at your Nexus.', 12, '#9fb0c8', 'center');
  }

  private drawPlaying(g: Phaser.GameObjects.Graphics, s: GameState) {
    const me = this.player();
    if (!me || !me.champ) return;
    const c = me.champ;

    // Top bar: gold, time and the two Nexus health levels.
    g.fillStyle(col('#121826'), 0.92).fillRect(TOP_BAR.x, TOP_BAR.y, TOP_BAR.w, TOP_BAR.h);
    const mins = Math.floor(s.time / 60000);
    const secs = Math.floor((s.time % 60000) / 1000);
    this.t('gold', 12, 9, `Gold ${Math.floor(me.gold)}`, 14, '#f4d35e');
    this.t('clock', VIEW.w / 2, 9, `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`, 14, '#f2f5fa', 'center');
    const nexus = (team: Team) => s.units.find((u) => u.kind === 'nexus' && u.side === team)!;
    const pct = (u: Unit) => `${Math.max(0, Math.ceil((u.hp / u.maxHp) * 100))}%`;
    this.t('nexus-red', VIEW.w - 12, 9, `Red Nexus ${pct(nexus('red'))}`, 13, '#e0553f', 'right');
    this.t('nexus-blue', VIEW.w / 2 - 150, 9, `Blue Nexus ${pct(nexus('blue'))}`, 13, '#6aa8ff', 'right');

    // Bottom bar: the champion, its health and experience, the abilities and the shop.
    g.fillStyle(col('#121826'), 0.92).fillRect(BOTTOM_BAR.x, BOTTOM_BAR.y, BOTTOM_BAR.w, BOTTOM_BAR.h);
    g.fillStyle(col('#1f2a3c'), 1).fillRect(PORTRAIT.x, PORTRAIT.y, PORTRAIT.w, PORTRAIT.h);
    const icon = shapePoints(c.shape, 38, 452, 16);
    g.fillStyle(col(c.color), 1);
    if (icon) g.fillPoints(icon, true);
    else g.fillCircle(38, 452, 16);
    this.t('name', 62, 430, `${c.name}  Lv ${me.level}`, 13);
    g.fillStyle(0x0c1018, 1).fillRect(62, 450, 150, 9);
    g.fillStyle(col('#6fe07f'), 1).fillRect(62, 450, 150 * Math.max(0, me.hp / me.maxHp), 9);
    const xpFloor = XP_FOR_LEVEL[me.level - 1] ?? 0;
    const xpNext = XP_FOR_LEVEL[me.level] ?? XP_FOR_LEVEL[MAX_LEVEL - 1];
    const xpRatio = me.level >= MAX_LEVEL ? 1 : (me.xp - xpFloor) / (xpNext - xpFloor);
    g.fillStyle(0x0c1018, 1).fillRect(62, 464, 150, 5);
    g.fillStyle(col('#f4d35e'), 1).fillRect(62, 464, 150 * Math.max(0, Math.min(1, xpRatio)), 5);
    const owned = me.items.map((id) => ITEMS.find((i) => i.id === id)?.name ?? id).join(', ');
    this.t('items', 62, 476, owned || 'No items yet', 10, '#9fb0c8');
    this.t('dead', 62, 500, me.dead ? `Respawn in ${Math.ceil((me.respawnAt - s.time) / 1000)}s` : `${c.role}`, 11, me.dead ? '#e0553f' : '#9fb0c8');

    ABILITY_KEYS.forEach((k, i) => {
      const ab = c.abilities[i];
      const box = abilityBox(i);
      const locked = me.level < ab.level;
      g.fillStyle(col('#1f2a3c'), 1).fillRect(box.x, box.y, box.w, box.h);
      g.lineStyle(2, col(locked ? '#3a4658' : c.color), 1).strokeRect(box.x, box.y, box.w, box.h);
      const cd = me.cds[k];
      if (cd > 0) g.fillStyle(0x000000, 0.6).fillRect(box.x, box.y, box.w, box.h * (cd / ab.cd));
      this.t(`ab-${k}`, box.x + 4, box.y + 3, k, 14, locked ? '#6b7a90' : '#f2f5fa');
      this.t(`abn-${k}`, box.x + 4, box.y + 22, ab.name.slice(0, 9), 8, '#9fb0c8');
      const label = locked ? `Lv${ab.level}` : cd > 0 ? `${Math.ceil(cd / 1000)}` : '';
      this.t(`abcd-${k}`, box.x + box.w / 2, box.y + 38, label, 14, '#f2f5fa', 'center');
    });
    g.fillStyle(col('#2c3a52'), 1).fillRect(SHOP_BUTTON.x, SHOP_BUTTON.y, SHOP_BUTTON.w, SHOP_BUTTON.h);
    this.t('shop-label', SHOP_BUTTON.x + SHOP_BUTTON.w / 2, SHOP_BUTTON.y + 20, 'Shop [B]', 13, '#f2f5fa', 'center');

    this.drawMinimap(g, s, me);
    if (this.shopOpen) this.drawShop(g, me);
    if (s.phase !== 'playing') this.drawEnd(g, s);
  }

  private drawMinimap(g: Phaser.GameObjects.Graphics, s: GameState, me: Unit) {
    const m = MINIMAP;
    const k = m.w / WORLD.w;
    const mx = (x: number) => m.x + x * k;
    const my = (y: number) => m.y + y * k;
    g.fillStyle(col('#1c2b1e'), 1).fillRect(m.x, m.y, m.w, m.h);
    g.lineStyle(1, col('#c8b07a'), 0.8);
    for (const lane of Object.values(LANES)) {
      g.beginPath();
      g.moveTo(mx(lane[0].x), my(lane[0].y));
      for (const p of lane.slice(1)) g.lineTo(mx(p.x), my(p.y));
      g.strokePath();
    }
    for (const t of TOWERS) {
      const dead = s.units.find((u) => u.kind === 'tower' && u.x === t.x && u.y === t.y)?.dead;
      if (!dead) g.fillStyle(col(SIDE_COLOR[t.team]), 1).fillRect(mx(t.x) - 2, my(t.y) - 2, 4, 4);
    }
    for (const u of s.units) {
      if (u.dead) continue;
      if (u.kind === 'nexus') g.fillStyle(col(SIDE_COLOR[u.side as Team]), 1).fillCircle(mx(u.x), my(u.y), 4);
      else if (u.kind === 'champion') g.fillStyle(col(SIDE_COLOR[u.side as Team]), 1).fillCircle(mx(u.x), my(u.y), u.player ? 3.5 : 2.5);
      else if (u.kind === 'minion') g.fillStyle(col(SIDE_COLOR[u.side as Team]), 0.8).fillRect(mx(u.x), my(u.y), 1.5, 1.5);
    }
    g.lineStyle(1, 0xffffff, 0.8).strokeCircle(mx(me.x), my(me.y), 6);
  }

  private drawShop(g: Phaser.GameObjects.Graphics, me: Unit) {
    const p = SHOP_PANEL;
    g.fillStyle(col('#141b28'), 1).fillRect(p.x, p.y, p.w, p.h);
    g.lineStyle(2, col('#3a4658'), 1).strokeRect(p.x, p.y, p.w, p.h);
    this.t('shop-title', p.x + 16, p.y + 14, 'Shop', 16, '#f2f5fa');
    const atBase = Math.hypot(me.x - BASE.blue.x, me.y - BASE.blue.y) <= 700 || (me.side === 'red' && Math.hypot(me.x - BASE.red.x, me.y - BASE.red.y) <= 700);
    this.t('shop-note', p.x + 16, p.y + 38, atBase ? `Gold ${Math.floor(me.gold)}. Click an item to buy it.` : 'Return to your Nexus to buy items.', 11, atBase ? '#9fb0c8' : '#e0553f');
    ITEMS.forEach((item, i) => {
      const r = shopRow(i);
      const has = me.items.includes(item.id);
      const afford = me.gold >= item.cost;
      g.fillStyle(col('#1f2a3c'), 1).fillRect(r.x, r.y, r.w, r.h);
      this.t(`shop-name-${i}`, r.x + 12, r.y + 8, item.name, 14, has ? '#6b7a90' : '#f2f5fa');
      this.t(`shop-desc-${i}`, r.x + 12, r.y + 28, describe(item), 11, '#9fb0c8');
      const price = has ? 'Owned' : `${item.cost} gold`;
      this.t(`shop-price-${i}`, r.x + r.w - 12, r.y + 16, price, 13, has ? '#6b7a90' : afford ? '#f4d35e' : '#e0553f', 'right');
    });
  }

  private drawEnd(g: Phaser.GameObjects.Graphics, s: GameState) {
    g.fillStyle(0x000000, 0.6).fillRect(0, 0, VIEW.w, VIEW.h);
    const p = END_PANEL;
    g.fillStyle(col('#141b28'), 1).fillRect(p.x, p.y, p.w, p.h);
    g.lineStyle(2, col('#3a4658'), 1).strokeRect(p.x, p.y, p.w, p.h);
    const won = s.winner === 'blue';
    this.t('end-title', VIEW.w / 2, p.y + 24, won ? 'Victory' : 'Defeat', 32, won ? '#6fe07f' : '#e0553f', 'center');
    this.t('end-sub', VIEW.w / 2, p.y + 74, won ? 'The red Nexus has fallen.' : 'Your Nexus has fallen.', 13, '#9fb0c8', 'center');
    g.fillStyle(col('#2c3a52'), 1).fillRect(PLAY_AGAIN.x, PLAY_AGAIN.y, PLAY_AGAIN.w, PLAY_AGAIN.h);
    this.t('again-label', PLAY_AGAIN.x + PLAY_AGAIN.w / 2, PLAY_AGAIN.y + 14, 'Play again', 15, '#f2f5fa', 'center');
  }
}
