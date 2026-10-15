import Phaser from 'phaser';
import {
  ABILITY_KEYS,
  ACTIVES,
  ActiveDef,
  BEAST,
  BUFFS,
  BUSHES,
  AbilityDef,
  AbilityKey,
  BASE,
  CHAMPIONS,
  ChampionDef,
  ITEMS,
  ItemDef,
  LANES,
  RIVER,
  MAX_LEVEL,
  SIDE_COLOR,
  STREAK,
  Team,
  TOWERS,
  UPGRADES,
  Vec,
  WORLD,
  XP_FOR_LEVEL,
  MAX_ITEMS,
  upgradeById,
  bushAt,
} from '../game/data';
import { Fx, GameState, Phase, Unit, createGame, dist, getUnit } from '../game/state';
import { buy, cast, chooseUpgrade, commandAttack, commandMove, hiddenFrom, invulnerable, priceFor, stealthed, tick, useActive, viewers } from '../game/sim';
import { championName, shortName } from '../game/names';
import {
  BEAST_CELL,
  BEAST_KEY,
  INHIB_CELL,
  BOAR,
  BOAR_CELL,
  BRUTE_CELL,
  CHAMP_CELL,
  COIN,
  MINION_CELL,
  MINION_OUTLINE,
  NEXUS_CELL,
  RES,
  RUBBLE,
  RUBBLE_CELL,
  TOWER_CELL,
  WATCH_CELL,
  WOLF,
  WOLF_CELL,
  bakeChampions,
  bakeUnits,
  bruteKey,
  champKey,
  dirFor,
  frameName,
  inhibKey,
  minionKey,
  nexusKey,
  pickKey,
  towerKey,
  watchKey,
} from '../art/bake';
import { MAP_KEY, MAP_RES, paintMap } from '../art/map';
import { PoseName } from '../art/models';
import { byDifficulty, settings } from '../../../../shared/settings';
import { sharpRes, splitHudCamera, viewPoint } from '../../../../shared/scaling';
import {
  BOTTOM_BAR,
  END_PANEL,
  FONT,
  MINIMAP,
  OBJECTIVE_CARD,
  PLAY_AGAIN,
  PORTRAIT,
  REROLL,
  SHOP_BUTTON,
  SHOP_PANEL,
  STREAK_CHIP,
  TOP_BAR,
  UPGRADE_PANEL,
  VIEW,
  abilityBox,
  activeButton,
  buffChip,
  buffStrip,
  pickCard,
  shopRow,
  upgradeCard,
} from './layout';

/** Simulation step in ms. Each frame runs as many steps as the time since the last frame needs. */
const STEP = 16;
/** Red's units deal this much damage, by difficulty. */
const ENEMY_DAMAGE = byDifficulty(0.8, 1, 1.25);

/** The slate and gold of the HUD. */
const UI = {
  slate: '#2b3344',
  slateLight: '#465169',
  slateDark: '#161b25',
  edge: '#0c0f15',
  card: '#343e53',
  gold: '#f2c14e',
  goldDeep: '#b8862f',
  text: '#f4f1e8',
  dim: '#a7b1c4',
  muted: '#6e7a8f',
  green: '#7fe08a',
  red: '#ff7a66',
  blue: '#7fb6ff',
};

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

/** The images that draw one unit: its figure, the last-hit outline behind it and a hit flash over it. */
interface UnitSprite {
  main: Phaser.GameObjects.Image;
  outline: Phaser.GameObjects.Image;
  flash: Phaser.GameObjects.Image;
  lastWalk: number;
  movedAt: number;
}

/** Where a unit's feet are drawn, below the centre of its hitbox, by kind. */
const FOOT = { champion: 9, minion: 5, camp: 8, beast: 10, tower: 12, inhibitor: 10, nexus: 16, watchstone: 10 } as const;
/** How far above the feet the top of each kind's figure is, for bars and markers. */
const HEAD = { champion: 56, minion: 32, camp: 34, beast: 84, tower: 104, inhibitor: 62, nexus: 104, watchstone: 62 } as const;
/** The top of a unit's figure above its feet: a brute stands taller than a boar, a pup lower. */
function headOf(u: Unit): number {
  if (u.kind !== 'camp') return HEAD[u.kind];
  return u.campKind === 'ember' || u.campKind === 'moss' ? 70 : u.campKind === 'pup' ? 22 : HEAD.camp;
}
/** The fog of war's grid: one cell per this many world pixels. */
const FOG_CELL = 20;
const FOG_COLS = Math.ceil(WORLD.w / FOG_CELL);
const FOG_ROWS = Math.ceil(WORLD.h / FOG_CELL);
/** How dark the fog is where blue sees nothing (0..1), and the shades it is drawn in. */
const FOG_ALPHA = 0.72;
const FOG_STEPS = 10;

const noop = () => undefined;
/** The size of the map's tiles, in pixels. */
const MAP_TILE = 400;

/** A CSS hex colour as a number Phaser's Graphics take. */
function col(hex: string): number {
  return parseInt(hex.slice(1), 16);
}

function describe(item: ItemDef): string {
  const parts: string[] = [];
  const active = ACTIVES.find((a) => a.id === item.active);
  if (item.dmg) parts.push(`+${item.dmg} damage`);
  if (item.armor) parts.push(`+${item.armor} armor`);
  if (item.hp) parts.push(`+${item.hp} health`);
  if (item.speed) parts.push(`+${item.speed} speed`);
  if (item.atk) parts.push(`+${item.atk}% attack speed`);
  if (item.cdr) parts.push(`-${item.cdr}% cooldowns`);
  if (active) parts.push(active.id === 'dash' ? `[${active.key}] dash ${active.range}px` : `[${active.key}] heal ${active.heal}`);
  return parts.join(', ');
}

/** The gem colour of an item, by what it gives. */
function itemTint(item: ItemDef): string {
  if (item.active === 'flask') return '#62d86f';
  return item.dmg ? '#ff8a5c' : item.armor ? '#b9c3cf' : item.hp ? '#e0556f' : item.speed ? '#7fb6ff' : item.atk ? '#f2c14e' : '#c49bff';
}

function clock(ms: number) {
  const t = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
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
  private groundG!: Phaser.GameObjects.Graphics;
  private topG!: Phaser.GameObjects.Graphics;
  private hudG!: Phaser.GameObjects.Graphics;
  private sprites = new Map<number, UnitSprite>();
  private mapTiles: Phaser.GameObjects.Image[] = [];
  private portrait!: Phaser.GameObjects.Image;
  private pickImages: Phaser.GameObjects.Image[] = [];
  private pickBg!: Phaser.GameObjects.Image;
  private texts = new Map<string, Phaser.GameObjects.Text>();
  /** The names on the pick cards, drawn anew each time the pick screen opens. */
  private pickNames: string[] = [];
  /** The pick card under the pointer, or -1. */
  private hoverPick = -1;
  /** The fog of war: how much each cell is hidden from blue (0 clear, 1 hidden), and its images. */
  private fog = new Float32Array(FOG_COLS * FOG_ROWS);
  private fogG!: Phaser.GameObjects.Graphics;
  private fogMini!: Phaser.GameObjects.Graphics;
  private used = new Set<string>();
  private keys!: Record<AbilityKey | 'B' | 'D' | 'H' | 'ESC' | 'ONE' | 'TWO', Phaser.Input.Keyboard.Key>;

  constructor() {
    super('Game');
  }

  create() {
    const t0 = performance.now();
    const unitsMs = bakeUnits(this);
    paintMap(this);
    if (import.meta.env.DEV) console.info(`Lane Brawl art baked in ${Math.round(performance.now() - t0)} ms (units ${Math.round(unitsMs)} ms)`);
    this.paintPickBackdrop();
    // The world camera follows the champion; the HUD (scroll factor 0) gets a fixed camera.
    splitHudCamera(this);
    this.cameras.main.setBounds(0, 0, WORLD.w, WORLD.h);
    // The map in tiles, so only the ones in view are drawn.
    for (let y = 0; y < WORLD.h; y += MAP_TILE) {
      for (let x = 0; x < WORLD.w; x += MAP_TILE) {
        const frame = `${x},${y}`;
        const w = Math.min(MAP_TILE, WORLD.w - x);
        const h = Math.min(MAP_TILE, WORLD.h - y);
        this.textures.get(MAP_KEY).add(frame, 0, Math.round(x * MAP_RES), Math.round(y * MAP_RES), Math.round(w * MAP_RES), Math.round(h * MAP_RES));
        this.mapTiles.push(this.add.image(x, y, MAP_KEY, frame).setOrigin(0, 0).setDisplaySize(w, h).setDepth(0));
      }
    }
    this.groundG = this.add.graphics().setDepth(1);
    this.topG = this.add.graphics().setDepth(4);
    this.hudG = this.add.graphics().setDepth(10).setScrollFactor(0);
    this.pickBg = this.add.image(0, 0, 'lb-pick-bg').setOrigin(0, 0).setDisplaySize(VIEW.w, VIEW.h).setScrollFactor(0).setDepth(9);
    this.portrait = this.add.image(0, 0, pickKey('warden'), frameName(2, 'idle')).setScrollFactor(0).setDepth(11).setVisible(false);
    CHAMPIONS.forEach((c, i) => {
      const r = pickCard(i);
      this.pickImages.push(
        this.add
          .image(r.x + r.w / 2, r.y + 56, pickKey(c.id), frameName(2, 'idle'))
          .setOrigin(0.5, CHAMP_CELL.footY / CHAMP_CELL.h)
          .setScale(0.85 / RES)
          .setScrollFactor(0)
          .setDepth(11),
      );
    });
    this.rollNames();
    // The fog of war, over the world (above the figures, under the bars) and over the minimap.
    this.fogG = this.add.graphics().setDepth(3.6);
    this.fogMini = this.add.graphics().setScrollFactor(0).setDepth(10.5);

    this.keys = this.input.keyboard!.addKeys('Q,W,E,R,B,D,H,ESC,ONE,TWO') as typeof this.keys;
    for (const k of ABILITY_KEYS) this.keys[k].on('down', () => this.castAtCursor(k));
    for (const a of ACTIVES) this.keys[a.key].on('down', () => this.activeAtCursor(a));
    this.keys.B.on('down', () => this.toggleShop());
    this.keys.ESC.on('down', () => this.setShop(false));
    this.keys.ONE.on('down', () => this.pickUpgrade(0));
    this.keys.TWO.on('down', () => this.pickUpgrade(1));

    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      this.lastWorld = this.worldAt(p);
      const v = viewPoint(p);
      this.hoverPick = CHAMPIONS.findIndex((_, i) => {
        const r = pickCard(i);
        return v.x >= r.x && v.x <= r.x + r.w && v.y >= r.y && v.y <= r.y + r.h;
      });
    });
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.onPointerDown(p));
    this.cameras.main.centerOn(BASE.blue.x + 300, BASE.blue.y - 200);
    this.refreshZones();
  }

  update() {
    // Everything runs on the frame's own clock time, not Phaser's smoothed delta: Phaser clamps the
    // delta for its first 120 frames, so how long the page took to start would otherwise change how
    // fast a match begins, where the camera is and so where a click lands.
    const frameMs = Math.min(this.game.loop.rawDelta, 250);
    const s = this.state;
    if (s && s.phase === 'playing') {
      this.acc += frameMs;
      while (this.acc >= STEP) {
        tick(s, STEP);
        this.acc -= STEP;
      }
    }
    if (s) this.updateFog(s);
    if (s) this.collectFx(s, frameMs);
    this.followPlayer(frameMs);
    this.used.clear();
    this.drawWorld();
    this.drawHud();
    this.refreshZones();
  }

  /** New names for the champions on the pick cards. */
  private rollNames() {
    const taken: string[] = [];
    this.pickNames = CHAMPIONS.map((c) => {
      const name = championName(c.id, Math.random, taken);
      taken.push(name);
      return name;
    });
  }

  private startMatch(def: ChampionDef) {
    this.state = createGame(def, ENEMY_DAMAGE, { playerName: this.pickNames[CHAMPIONS.indexOf(def)] });
    // Each champion in the match gets its sheet in its team's colours, once.
    const ms = bakeChampions(
      this,
      this.state.units.filter((u) => u.champ).map((u) => ({ id: u.champ!.id, team: u.side === 'red' ? ('red' as const) : ('blue' as const) })),
    );
    if (import.meta.env.DEV) console.info(`Lane Brawl champions baked in ${Math.round(ms)} ms`);
    this.shopOpen = false;
    this.liveFx = [];
    this.lastWorld = { x: BASE.blue.x + 70, y: BASE.blue.y - 40 };
    this.cameras.main.centerOn(BASE.blue.x + 70, BASE.blue.y - 40);
  }

  private resetToPick() {
    this.state = null;
    this.rollNames();
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

  private activeAtCursor(a: ActiveDef) {
    const p = this.player();
    if (this.state && p) useActive(this.state, p, a.id, this.lastWorld);
  }

  private pickUpgrade(choice: number) {
    if (this.state && this.phase === 'playing') chooseUpgrade(this.state, choice);
  }

  /** The zones the pointer can press, rebuilt when the screen they belong to changes. */
  private refreshZones() {
    const offer = this.state?.upgradeOffers.length ?? 0;
    const key = `${this.phase}|${this.shopOpen}|${offer > 0}`;
    if (key === this.zoneKey) return;
    this.zoneKey = key;
    this.zones = [];
    const phase = this.phase;
    if (phase === 'pick') {
      CHAMPIONS.forEach((def, i) => this.zones.push({ ...pickCard(i), run: () => this.startMatch(def) }));
      this.zones.push({ ...REROLL, run: () => this.rollNames() });
      return;
    }
    if (phase === 'won' || phase === 'lost') {
      this.zones.push({ ...PLAY_AGAIN, run: () => this.resetToPick() });
      return;
    }
    // The bars and the objective card block presses so a click on the HUD never walks the champion.
    this.zones.push({ ...TOP_BAR, run: noop }, { ...BOTTOM_BAR, run: noop }, { ...OBJECTIVE_CARD, run: noop });
    this.zones.push({ ...SHOP_BUTTON, run: () => this.toggleShop() });
    ABILITY_KEYS.forEach((k, i) => this.zones.push({ ...abilityBox(i), run: () => this.castAtCursor(k) }));
    ACTIVES.forEach((a, i) => this.zones.push({ ...activeButton(i), run: () => this.activeAtCursor(a) }));
    if (offer > 0) [0, 1].forEach((i) => this.zones.push({ ...upgradeCard(i), run: () => this.pickUpgrade(i) }));
    if (this.shopOpen) {
      this.zones.push({ ...SHOP_PANEL, run: noop });
      ITEMS.forEach((item, i) => this.zones.push({ ...shopRow(i), run: () => this.player() && this.state && buy(this.player()!, item.id) }));
    }
  }

  /** The world point under a pointer, through the world camera (the HUD camera sits on top). */
  private worldAt(pointer: Phaser.Input.Pointer) {
    const w = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    return { x: w.x, y: w.y };
  }

  /** The part of the world in view, in world pixels, where the camera will show it this frame. */
  private viewRect() {
    const mid = this.cameras.main.midPoint;
    const x = Phaser.Math.Clamp(mid.x - VIEW.w / 2, 0, WORLD.w - VIEW.w);
    const y = Phaser.Math.Clamp(mid.y - VIEW.h / 2, 0, WORLD.h - VIEW.h);
    return { x, y, w: VIEW.w, h: VIEW.h };
  }

  private onPointerDown(pointer: Phaser.Input.Pointer) {
    const p = viewPoint(pointer);
    // The zones are searched newest first, so a card over a bar wins.
    const hit = [...this.zones].reverse().find((z) => p.x >= z.x && p.x <= z.x + z.w && p.y >= z.y && p.y <= z.y + z.h);
    if (hit) {
      hit.run();
      this.refreshZones();
      return;
    }
    if (this.phase !== 'playing' || !this.state) return;
    const w = this.worldAt(pointer);
    this.lastWorld = w;
    const me = this.player();
    if (!me) return;
    let foe: Unit | null = null;
    let best = Infinity;
    for (const u of this.state.units) {
      if (u.dead || u.side === me.side || hiddenFrom(this.state, me.side, u)) continue;
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
    // Reduced motion drops the rings and lines but keeps the last-hit coins, which carry the gold.
    // Effects out in the fog stay unseen, like the units that raised them.
    for (const f of s.fx) if ((!settings.reduceMotion || f.kind === 'coin') && !this.fogged(f.x, f.y)) this.liveFx.push({ f, left: f.ms });
    s.fx.length = 0;
    for (const l of this.liveFx) l.left -= delta;
    this.liveFx = this.liveFx.filter((l) => l.left > 0);
  }

  /**
   * Works out the fog of war over blue's view from the sight of every blue unit, and paints it
   * into the fog's small canvas: one pixel per cell, dark where blue sees nothing, with soft edges.
   */
  private updateFog(s: GameState) {
    const cols = FOG_COLS, rows = FOG_ROWS;
    const edge = new Float32Array(cols * rows).fill(1e9);
    for (const v of viewers(s, 'blue')) {
      const c0 = Math.max(0, Math.floor((v.x - v.r) / FOG_CELL) - 1), c1 = Math.min(cols - 1, Math.ceil((v.x + v.r) / FOG_CELL) + 1);
      const r0 = Math.max(0, Math.floor((v.y - v.r) / FOG_CELL) - 1), r1 = Math.min(rows - 1, Math.ceil((v.y + v.r) / FOG_CELL) + 1);
      for (let r = r0; r <= r1; r++) {
        const dy = (r + 0.5) * FOG_CELL - v.y;
        for (let c = c0; c <= c1; c++) {
          const dx = (c + 0.5) * FOG_CELL - v.x;
          const d = Math.sqrt(dx * dx + dy * dy) - v.r;
          if (d < edge[r * cols + c]) edge[r * cols + c] = d;
        }
      }
    }
    // Clear inside sight, fully fogged a little past its edge, a soft ramp between.
    for (let i = 0; i < edge.length; i++) this.fog[i] = Math.max(0, Math.min(1, (edge[i] + 30) / 90));
  }

  /** The fog at a world point, blended smoothly between the cells around it. */
  private fogAt(x: number, y: number): number {
    const fx = Math.max(0, Math.min(FOG_COLS - 1.001, x / FOG_CELL - 0.5));
    const fy = Math.max(0, Math.min(FOG_ROWS - 1.001, y / FOG_CELL - 0.5));
    const c = Math.floor(fx), r = Math.floor(fy), tx = fx - c, ty = fy - r;
    const f = this.fog, i = r * FOG_COLS + c;
    const top = f[i] + (f[i + 1] - f[i]) * tx;
    const bottom = f[i + FOG_COLS] + (f[i + FOG_COLS + 1] - f[i + FOG_COLS]) * tx;
    return top + (bottom - top) * ty;
  }

  /**
   * Paints the fog over a rectangle of the world in squares of `step` world pixels, onto `g` at
   * `scale` px per world pixel from (ox, oy): one rectangle per run of squares of the same shade.
   */
  private paintFog(g: Phaser.GameObjects.Graphics, x0: number, y0: number, w: number, h: number, step: number, ox: number, oy: number, scale: number) {
    const cols = Math.ceil(w / step), rows = Math.ceil(h / step);
    for (let r = 0; r < rows; r++) {
      const y = y0 + r * step;
      let start = 0;
      let shade = -1;
      for (let c = 0; c <= cols; c++) {
        const k = c < cols ? Math.round(this.fogAt(x0 + (c + 0.5) * step, y + step / 2) * FOG_STEPS) : -1;
        if (k === shade) continue;
        if (shade > 0) {
          g.fillStyle(0x0a101c, (shade / FOG_STEPS) * FOG_ALPHA);
          g.fillRect(ox + (x0 + start * step) * scale, oy + y * scale, (c - start) * step * scale, step * scale);
        }
        start = c;
        shade = k;
      }
    }
  }

  /** Whether a world point lies in the fog for blue. */
  private fogged(x: number, y: number): boolean {
    if (!this.state) return false;
    const c = Math.floor(x / FOG_CELL), r = Math.floor(y / FOG_CELL);
    return (this.fog[r * FOG_COLS + c] ?? 0) > 0.6;
  }

  private followPlayer(delta: number) {
    const me = this.player();
    if (!me) return;
    const cam = this.cameras.main;
    const v = this.viewRect();
    const cx = v.x + v.w / 2;
    const cy = v.y + v.h / 2;
    const k = settings.reduceMotion ? 1 : Math.min(1, delta / 120);
    cam.centerOn(cx + (me.x - cx) * k, cy + (me.y - cy) * k);
  }

  /** The pick screen's backdrop: faceted slate, painted once. */
  private paintPickBackdrop() {
    if (this.textures.exists('lb-pick-bg')) return;
    const res = sharpRes(VIEW.w, VIEW.h);
    const c = document.createElement('canvas');
    c.width = Math.round(VIEW.w * res);
    c.height = Math.round(VIEW.h * res);
    const ctx = c.getContext('2d')!;
    ctx.scale(c.width / VIEW.w, c.height / VIEW.h);
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const cell = 60;
    for (let y = 0; y < VIEW.h + cell; y += cell) {
      for (let x = 0; x < VIEW.w + cell; x += cell) {
        for (const half of [0, 1]) {
          const k = 0.85 + rnd() * 0.3 - (y / VIEW.h) * 0.25;
          const v = Math.round(36 * k), g = Math.round(44 * k), b = Math.round(60 * k);
          ctx.fillStyle = `rgb(${v},${g},${b})`;
          ctx.strokeStyle = ctx.fillStyle;
          ctx.beginPath();
          if (half) {
            ctx.moveTo(x, y);
            ctx.lineTo(x + cell, y);
            ctx.lineTo(x + cell, y + cell);
          } else {
            ctx.moveTo(x, y);
            ctx.lineTo(x + cell, y + cell);
            ctx.lineTo(x, y + cell);
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
      }
    }
    this.textures.addCanvas('lb-pick-bg', c);
  }

  // -------------------------------------------------------------------------------------------
  // The world: shadows and rings on the ground, figures sorted by depth, bars and effects on top.

  private drawWorld() {
    const v = this.viewRect();
    for (const tile of this.mapTiles) {
      tile.setVisible(tile.x < v.x + v.w && tile.x + MAP_TILE > v.x && tile.y < v.y + v.h && tile.y + MAP_TILE > v.y);
    }
    const g = this.groundG;
    const top = this.topG;
    g.clear();
    top.clear();
    const s = this.state;
    const seen = new Set<number>();
    this.fogG.clear();
    this.fogMini.clear();
    if (s) {
      const step = 10;
      const x0 = Math.floor(v.x / step) * step, y0 = Math.floor(v.y / step) * step;
      this.paintFog(this.fogG, x0, y0, v.x + v.w - x0, v.y + v.h - y0, step, 0, 0, 1);
      if (s.phase === 'playing') this.paintFog(this.fogMini, 0, 0, WORLD.w, WORLD.h, FOG_CELL, MINIMAP.x, MINIMAP.y, MINIMAP.w / WORLD.w);
    }
    if (s) {
      const me = this.player();
      this.drawZones(g, s);
      for (const u of s.units) {
        if (u.dead && u.kind !== 'tower' && u.kind !== 'inhibitor') continue;
        // A red champion hiding in a bush is not drawn at all.
        if (hiddenFrom(s, 'blue', u)) continue;
        seen.add(u.id);
        this.drawGround(g, u, s);
        this.placeSprite(u, s);
      }
      for (const u of s.units) if (!u.dead && !hiddenFrom(s, 'blue', u)) this.drawBar(top, u, s, me);
      this.drawObjectiveMarker(top, s);
      for (const p of s.projectiles) {
        if (this.fogged(p.x, p.y)) continue;
        const speed = Math.hypot(p.vx, p.vy) || 1;
        const dx = p.vx / speed, dy = p.vy / speed;
        const y = p.y - 20;
        const tail = p.width >= 28 ? 22 : 15;
        top.lineStyle(7, col(p.color), 0.25).lineBetween(p.x - dx * tail * 1.5, y - dy * tail * 1.5, p.x, y);
        top.lineStyle(3, col(p.color), 1).lineBetween(p.x - dx * tail, y - dy * tail, p.x, y);
        top.fillStyle(0xffffff, 1).fillCircle(p.x, y, 3);
      }
      this.drawFx(top);
    }
    for (const [id, sp] of this.sprites) {
      if (seen.has(id)) continue;
      sp.main.destroy();
      sp.outline.destroy();
      sp.flash.destroy();
      this.sprites.delete(id);
    }
  }

  /** The patches zone abilities leave on the ground, pulsing in their caster's colour. */
  private drawZones(g: Phaser.GameObjects.Graphics, s: GameState) {
    for (const z of s.zones) {
      if (this.fogged(z.x, z.y)) continue;
      const fade = Math.min(1, z.left / 400, (z.ms - z.left) / 200 + 0.3);
      const pulse = settings.reduceMotion ? 0 : Math.sin(s.time / 140) * 0.05;
      g.fillStyle(col(z.color), (0.2 + pulse) * fade).fillEllipse(z.x, z.y, z.r * 2, z.r * 1.2);
      g.lineStyle(3, col(z.color), 0.8 * fade).strokeEllipse(z.x, z.y, z.r * 2, z.r * 1.2);
      g.lineStyle(1.5, col(z.color), 0.5 * fade).strokeEllipse(z.x, z.y, z.r * 1.3, z.r * 0.78);
    }
  }

  private drawGround(g: Phaser.GameObjects.Graphics, u: Unit, s: GameState) {
    if (u.dead) return;
    if (u.kind === 'watchstone') {
      // The ring a team takes it within, and how far along a capture is.
      const color = u.side === 'neutral' ? SIDE_COLOR.neutral : SIDE_COLOR[u.side];
      g.lineStyle(2, col(color), 0.5).strokeEllipse(u.x, u.y + 8, 300 * 0.98, 300 * 0.58);
      if (u.capture) {
        const k = Math.min(1, u.capture.ms / 3000);
        g.lineStyle(5, col(SIDE_COLOR[u.capture.team]), 1).beginPath();
        g.arc(u.x, u.y - 72, 14, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false);
        g.strokePath();
      }
      return;
    }
    const fy = u.y + FOOT[u.kind];
    const r = u.kind === 'tower' ? 30 : u.kind === 'nexus' ? 54 : u.kind === 'inhibitor' ? 26 : u.radius;
    // A soft shadow cast to the bottom right.
    g.fillStyle(0x0b1a0e, 0.18).fillEllipse(u.x + r * 0.35, fy + r * 0.12, r * 2.5, r * 1.2);
    g.fillStyle(0x0b1a0e, 0.18).fillEllipse(u.x + r * 0.25, fy + r * 0.08, r * 1.9, r * 0.9);
    if (u.kind === 'champion' || u.kind === 'minion' || u.kind === 'camp' || u.kind === 'beast') {
      // The team ring under the feet: blue, red, or gold for the jungle.
      const color = col(SIDE_COLOR[u.side]);
      // Minions the beast empowered glow violet; super minions get a wider gold-trimmed ring.
      if (u.kind === 'minion' && u.side !== 'neutral' && s.beastBuff[u.side] > s.time) g.fillStyle(0xb98cff, 0.35).fillEllipse(u.x, fy, r * 3.4, r * 1.9);
      if (u.kind === 'minion' && u.power > 1) g.fillStyle(col(UI.gold), 0.3).fillEllipse(u.x, fy, r * 3.2, r * 1.8).lineStyle(2.5, col(UI.gold), 1).strokeEllipse(u.x, fy, r * 3.2, r * 1.8);
      const w = r * 2.2, h = r * 1.25;
      g.lineStyle(u.kind === 'minion' ? 2 : 3, color, 0.95).strokeEllipse(u.x, fy, w, h);
      g.fillStyle(color, 0.16).fillEllipse(u.x, fy, w, h);
      if (u.player) g.lineStyle(1.5, 0xffffff, 0.9).strokeEllipse(u.x, fy, w + 10, h + 6);
      // A jungle buff or an ability's buff glows round the feet in its colour.
      u.buffs.forEach((b, i) => g.lineStyle(2, col(b.color), 0.85).strokeEllipse(u.x, fy, w + 16 + i * 8, h + 10 + i * 5));
    }
    if (invulnerable(s, u)) {
      // A shimmering ward round a structure that can't be hurt yet.
      const rr = u.kind === 'nexus' ? 70 : 34;
      g.lineStyle(2, col(SIDE_COLOR[u.side]), 0.55).strokeEllipse(u.x, fy - 2, rr * 2, rr * 1.15);
      g.fillStyle(col(SIDE_COLOR[u.side]), 0.08).fillEllipse(u.x, fy - 2, rr * 2, rr * 1.15);
    }
    if (s.lastHitMark === u.id) g.lineStyle(2.5, col(UI.gold), 1).strokeEllipse(u.x, fy, r * 3, r * 1.75);
  }

  private spriteFor(u: Unit): UnitSprite {
    let sp = this.sprites.get(u.id);
    if (!sp) {
      const mk = () => this.add.image(0, 0, COIN).setScale(1 / RES);
      sp = { main: mk(), outline: mk().setVisible(false), flash: mk().setBlendMode(Phaser.BlendModes.ADD).setVisible(false), lastWalk: u.walk, movedAt: -1e9 };
      this.sprites.set(u.id, sp);
    }
    return sp;
  }

  private placeSprite(u: Unit, s: GameState) {
    const sp = this.spriteFor(u);
    const fy = u.y + FOOT[u.kind];
    let key: string;
    let frame = 'idle';
    let cell: { w: number; h: number; footY: number };
    if (u.walk !== sp.lastWalk) {
      sp.lastWalk = u.walk;
      sp.movedAt = s.time;
    }
    const pose = (step: number): PoseName => {
      if (u.castMs > 0) return 'c0';
      if (u.swing > 0) return u.swing > 120 ? 'a0' : 'a1';
      if (s.time - sp.movedAt < 120 && u.stunMs <= 0) return `w${Math.floor(u.walk / step) % 4}` as PoseName;
      return 'idle';
    };
    const team = u.side === 'red' ? 'red' : 'blue';
    switch (u.kind) {
      case 'champion':
        key = champKey(u.champ!.id, team);
        frame = frameName(dirFor(u.facing), pose(11));
        cell = CHAMP_CELL;
        break;
      case 'minion':
        key = minionKey(team);
        frame = frameName(dirFor(u.facing), pose(8));
        cell = MINION_CELL;
        break;
      case 'camp': {
        const brute = u.campKind === 'ember' || u.campKind === 'moss';
        const wolf = u.campKind === 'wolf' || u.campKind === 'pup';
        key = brute ? bruteKey(u.campKind as 'ember' | 'moss') : wolf ? WOLF : BOAR;
        frame = frameName(dirFor(u.facing), pose(10) === 'c0' ? 'idle' : pose(10));
        cell = brute ? BRUTE_CELL : wolf ? WOLF_CELL : BOAR_CELL;
        break;
      }
      case 'watchstone':
        key = watchKey(u.side);
        cell = WATCH_CELL;
        break;
      case 'beast':
        key = BEAST_KEY;
        frame = frameName(dirFor(u.facing), pose(14) === 'c0' ? 'idle' : pose(14));
        cell = BEAST_CELL;
        break;
      case 'inhibitor':
        key = u.dead ? RUBBLE : inhibKey(team);
        cell = u.dead ? RUBBLE_CELL : INHIB_CELL;
        break;
      case 'tower':
        key = u.dead ? RUBBLE : towerKey(team);
        cell = u.dead ? RUBBLE_CELL : TOWER_CELL;
        break;
      default:
        key = nexusKey(team);
        cell = NEXUS_CELL;
    }
    const depth = 2 + fy / WORLD.h;
    // Super minions stand taller; the player's allies in a bush show through the grass.
    const scale = (u.kind === 'minion' && u.power > 1 ? 1.5 : u.kind === 'inhibitor' && u.dead ? 0.7 : u.campKind === 'pup' ? 0.72 : 1) / RES;
    const inBush = u.kind === 'champion' && u.side === 'blue' && bushAt(u) >= 0;
    // Blue's champions in a bush or in stealth show through, half seen.
    const ghost = u.kind === 'champion' && u.side === 'blue' && stealthed(u) ? 0.38 : inBush ? 0.6 : 1;
    sp.main.setTexture(key, frame).setOrigin(0.5, cell.footY / cell.h).setPosition(u.x, fy).setDepth(depth).setScale(scale).setAlpha(ghost).setVisible(true);
    const marked = s.lastHitMark === u.id && u.kind === 'minion' && u.side === 'red';
    sp.outline.setVisible(marked);
    if (marked) sp.outline.setTexture(MINION_OUTLINE, frame).setOrigin(0.5, cell.footY / cell.h).setPosition(u.x, fy).setDepth(depth - 0.0001);
    const flash = !settings.reduceMotion && u.flash > 0 && !u.dead;
    sp.flash.setVisible(flash);
    if (flash) sp.flash.setTexture(key, frame).setOrigin(0.5, cell.footY / cell.h).setPosition(u.x, fy).setDepth(depth + 0.0001).setScale(scale).setAlpha(0.4 * (u.flash / 120));
  }

  /** A health bar above a unit. Shield shows as a pale strip over the health. */
  private drawBar(g: Phaser.GameObjects.Graphics, u: Unit, s: GameState, me: Unit | null) {
    if (u.kind === 'minion' && u.hp >= u.maxHp) return;
    const w = u.kind === 'nexus' ? 90 : u.kind === 'tower' || u.kind === 'beast' ? 64 : u.kind === 'inhibitor' ? 50 : u.kind === 'minion' ? 30 : 50;
    const h = u.kind === 'minion' ? 4 : 6;
    const x = u.x - w / 2;
    if (u.kind === 'watchstone') return;
    const y = u.y + FOOT[u.kind] - headOf(u) - 10;
    const ratio = Math.max(0, u.hp / u.maxHp);
    const own = me !== null && u.side === me.side;
    g.fillStyle(col(UI.edge), 0.9).fillRect(x - 1, y - 1, w + 2, h + 2);
    g.fillStyle(0x2a2f3a, 1).fillRect(x, y, w, h);
    const fill = invulnerable(s, u) ? '#8a93a6' : own ? '#62d86f' : u.side === 'neutral' ? SIDE_COLOR.neutral : '#ec5a48';
    g.fillStyle(col(fill), 1).fillRect(x, y, w * ratio, h);
    g.fillStyle(0xffffff, 0.25).fillRect(x, y, w * ratio, 1.5);
    if (u.shield > 0) g.fillStyle(0xd6efff, 1).fillRect(x, y - 3, Math.min(w, (u.shield / u.maxHp) * w), 2);
    if (u.kind === 'champion') {
      // The level in a small slate badge at the bar's left.
      g.fillStyle(col(UI.slateDark), 1).fillRect(x - 13, y - 3, 12, 12);
      this.t(`lvl-${u.id}`, x - 7, y - 3, String(u.level), 9, UI.text, 'center', true, true);
      // The champion's own name over its bar.
      this.t(`cname-${u.id}`, u.x, y - 15, u.player ? shortName(u.name) : shortName(u.name), 10, u.side === 'red' ? '#ffb4a8' : '#cfe1ff', 'center', true, true);
    }
    if (u.stunMs > 0) this.t(`stun-${u.id}`, u.x, y - (u.kind === 'champion' ? 28 : 16), 'STUN', 9, UI.gold, 'center', true, true);
  }

  /** A gold marker over the objective's target, with the reward, and a dashed ring round it. */
  private drawObjectiveMarker(g: Phaser.GameObjects.Graphics, s: GameState) {
    const o = s.objective;
    const t = o && getUnit(s, o.target);
    if (!o || !t || t.dead || hiddenFrom(s, 'blue', t)) return;
    const fy = t.y + FOOT[t.kind];
    const bob = settings.reduceMotion ? 0 : Math.sin(s.time / 220) * 3;
    const y = fy - headOf(t) - (t.kind === 'champion' ? 30 : 18) + bob;
    const label = `OBJECTIVE · +${o.gold}g`;
    const w = 128;
    g.fillStyle(col(UI.slateDark), 0.92).fillRect(t.x - w / 2, y - 22, w, 18);
    g.lineStyle(1.5, col(UI.gold), 1).strokeRect(t.x - w / 2, y - 22, w, 18);
    g.fillStyle(col(UI.gold), 1).fillTriangle(t.x - 6, y - 4, t.x + 6, y - 4, t.x, y + 4);
    this.t('obj-marker', t.x, y - 20, label, 11, UI.gold, 'center', true, true);
    const r = t.kind === 'tower' ? 44 : t.kind === 'nexus' ? 70 : t.kind === 'beast' ? 62 : t.radius + 14;
    const n = 16;
    g.lineStyle(2, col(UI.gold), 0.9);
    for (let i = 0; i < n; i += 1) {
      const a0 = (i / n) * Math.PI * 2 + s.time / (settings.reduceMotion ? Infinity : 1500);
      const a1 = a0 + Math.PI / n;
      g.beginPath();
      g.moveTo(t.x + Math.cos(a0) * r, fy + Math.sin(a0) * r * 0.58);
      g.lineTo(t.x + Math.cos(a1) * r, fy + Math.sin(a1) * r * 0.58);
      g.strokePath();
    }
  }

  private drawFx(g: Phaser.GameObjects.Graphics) {
    let coins = 0;
    for (const { f, left } of this.liveFx) {
      const alpha = Math.max(0, left / f.ms);
      if (f.kind === 'ring') {
        g.lineStyle(4, col(f.color), alpha).strokeEllipse(f.x, f.y, f.r * 2, f.r * 1.2);
      } else if (f.kind === 'line') {
        g.lineStyle(4, col(f.color), alpha).lineBetween(f.x, f.y - 20, f.x2, f.y2 - 20);
      } else if (f.kind === 'arc') {
        g.lineStyle(5, col(f.color), alpha).beginPath();
        g.arc(f.x, f.y - 18, f.r, f.a - 0.9, f.a + 0.9, false);
        g.strokePath();
      } else {
        // The last-hit coin: it pops up and fades, with the gold it paid.
        const k = 1 - left / f.ms;
        const rise = settings.reduceMotion ? 18 : 14 + k * 30;
        const x = f.x;
        const y = f.y - rise - 18;
        this.coin(g, x - 16, y + 7, 7, Math.min(1, alpha * 2));
        this.t(`coin-${coins++}`, x - 6, y - 2, `+${f.gold}g`, 15, UI.gold, 'left', true, true, Math.min(1, alpha * 2));
      }
    }
  }

  /** A faceted gold coin drawn with the Graphics. */
  private coin(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number, alpha = 1) {
    const pts = (rr: number) => Array.from({ length: 8 }, (_, i) => new Phaser.Math.Vector2(x + Math.cos((i * Math.PI) / 4 + Math.PI / 8) * rr, y + Math.sin((i * Math.PI) / 4 + Math.PI / 8) * rr));
    g.fillStyle(0x7a5418, alpha).fillPoints(pts(r + 1.2), true);
    g.fillStyle(col(UI.goldDeep), alpha).fillPoints(pts(r), true);
    g.fillStyle(col(UI.gold), alpha).fillPoints(pts(r * 0.68), true);
    g.fillStyle(0xfff0b0, alpha * 0.9).fillTriangle(x - r * 0.6, y - r * 0.2, x - r * 0.2, y - r * 0.6, x, y);
  }

  // -------------------------------------------------------------------------------------------
  // The HUD: bevelled slate panels, gold trim, a system font.

  private t(key: string, x: number, y: number, str: string, size: number, color = UI.text, align: 'left' | 'center' | 'right' = 'left', bold = false, world = false, alpha = 1) {
    let obj = this.texts.get(key);
    if (!obj) {
      obj = this.add.text(0, 0, '', { fontFamily: FONT, fontSize: `${size}px`, color, fontStyle: bold ? 'bold' : 'normal' });
      obj.setScrollFactor(world ? 1 : 0).setDepth(world ? 6 : 12);
      if (world) obj.setStroke('#1a1408', 3);
      this.texts.set(key, obj);
    }
    const xo = align === 'center' ? 0.5 : align === 'right' ? 1 : 0;
    // Only touch what changed: a new colour or string re-renders the text's canvas.
    if (obj.originX !== xo) obj.setOrigin(xo, 0);
    obj.setPosition(x, y).setVisible(true).setAlpha(alpha);
    if (obj.style.color !== color) obj.setColor(color);
    if (obj.text !== str) obj.setText(str);
    this.used.add(key);
  }

  /** A bevelled panel: a dark rim, a lit top-left edge and a shaded bottom-right edge. */
  private panel(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, fill = UI.slate, alpha = 1) {
    g.fillStyle(col(UI.edge), alpha).fillRect(x - 1, y - 1, w + 2, h + 2);
    g.fillStyle(col(UI.slateDark), alpha).fillRect(x, y, w, h);
    g.fillStyle(col(UI.slateLight), alpha).fillRect(x, y, w - 2, h - 2);
    g.fillStyle(col(fill), alpha).fillRect(x + 2, y + 2, w - 4, h - 4);
  }

  /** A gold-framed box, as round the abilities and the upgrade badges. */
  private goldFrame(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, bright: boolean) {
    g.fillStyle(col(UI.edge), 1).fillRect(x - 1, y - 1, w + 2, h + 2);
    g.fillStyle(col(bright ? UI.gold : UI.goldDeep), 1).fillRect(x, y, w, h);
    g.fillStyle(col('#7a5418'), 1).fillRect(x + 2, y + 2, w - 2, h - 2);
    g.fillStyle(col('#1d2330'), 1).fillRect(x + 3, y + 3, w - 6, h - 6);
  }

  private drawHud() {
    const g = this.hudG;
    g.clear();
    const pick = this.phase === 'pick';
    this.pickBg.setVisible(pick);
    this.pickImages.forEach((img) => img.setVisible(pick));
    this.portrait.setVisible(false);
    if (pick) this.drawPick(g);
    else if (this.state) this.drawPlaying(g, this.state);
    for (const [key, obj] of this.texts) if (!this.used.has(key)) obj.setVisible(false);
  }

  private drawPick(g: Phaser.GameObjects.Graphics) {
    this.t('title', VIEW.w / 2, 12, 'LANE BRAWL', 32, UI.gold, 'center', true);
    this.t('sub', VIEW.w / 2, 52, 'Pick your champion, from knights and witches to gunslingers, automatons and beasts. Four join you; five fight you.', 12, UI.dim, 'center');
    CHAMPIONS.forEach((c, i) => {
      const r = pickCard(i);
      const hover = this.hoverPick === i;
      this.panel(g, r.x, r.y, r.w, r.h, hover ? '#3a4660' : UI.card);
      g.fillStyle(col(c.color), 1).fillRect(r.x + 2, r.y + 2, r.w - 4, 4);
      g.fillStyle(col('#3b7be8'), 0.25).fillEllipse(r.x + r.w / 2, r.y + 56, 50, 14);
      g.lineStyle(2, col('#3b7be8'), 0.9).strokeEllipse(r.x + r.w / 2, r.y + 56, 50, 14);
      const name = this.pickNames[i] ?? c.name;
      this.t(`pick-name-${i}`, r.x + r.w / 2, r.y + 60, name, name.length > 18 ? 11 : 12, UI.text, 'center', true);
      this.t(`pick-role-${i}`, r.x + r.w / 2, r.y + 75, `${c.name} · ${c.role}`.toUpperCase(), 9, c.color, 'center', true);
      this.t(`pick-pas-${i}`, r.x + r.w / 2, r.y + 87, c.passive.name, 10, UI.gold, 'center', true);
      this.t(`pick-desc-${i}`, r.x + r.w / 2, r.y + 100, c.passive.desc, 9, UI.dim, 'center');
    });
    const b = REROLL;
    this.panel(g, b.x, b.y, b.w, b.h, '#3a4660');
    this.t('reroll', b.x + b.w / 2, b.y + 5, 'New names', 12, UI.text, 'center', true);
    const h = CHAMPIONS[this.hoverPick];
    this.t('pick-blurb', VIEW.w / 2, 471, h ? `${this.pickNames[this.hoverPick] ?? h.name}, ${h.name.toLowerCase()}: ${h.blurb.toLowerCase()}` : 'Point at a card to learn more about its champion.', 12, h ? h.color : UI.muted, 'center', true);
    this.t('hint', VIEW.w / 2, 491, 'Click a champion to start. Click the ground to walk, an enemy to attack. Q W E R cast at the cursor, D and H use item actives.', 11, UI.dim, 'center');
    this.t('hint2', VIEW.w / 2, 506, 'B opens the shop at your Nexus, 1 or 2 picks an upgrade. You only see what your team sees: the rest lies in the fog.', 11, UI.dim, 'center');
    this.t('hint3', VIEW.w / 2, 521, 'Slay the brutes for buffs, take the watchstones on the river for sight, and the guardian beast for stronger minions.', 11, UI.dim, 'center');
  }

  private drawPlaying(g: Phaser.GameObjects.Graphics, s: GameState) {
    const me = this.player();
    if (!me || !me.champ) return;
    this.drawTopBar(g, s, me);
    // The shop panel covers the objective card, so the card steps aside while it is open.
    if (!this.shopOpen) {
      this.drawObjectiveCard(g, s);
      this.drawBuffs(g, s);
      this.drawNotice(g, s);
    }
    this.drawBottomBar(g, s, me);
    this.drawMinimap(g, s, me);
    if (this.shopOpen) this.drawShop(g, me);
    if (s.phase !== 'playing') this.drawEnd(g, s);
  }

  private drawTopBar(g: Phaser.GameObjects.Graphics, s: GameState, me: Unit) {
    this.panel(g, TOP_BAR.x, TOP_BAR.y, TOP_BAR.w, TOP_BAR.h);
    this.coin(g, 20, 17, 8);
    this.t('gold', 34, 8, `${Math.floor(me.gold)}`, 16, UI.gold, 'left', true);
    // The last-hit streak chip.
    if (s.streak > 0) {
      const c = STREAK_CHIP;
      const hot = s.streak >= STREAK.at;
      g.fillStyle(col(UI.edge), 1).fillRect(c.x - 1, c.y - 1, c.w + 2, c.h + 2);
      g.fillStyle(col(hot ? '#6b4f17' : '#3a4256'), 1).fillRect(c.x, c.y, c.w, c.h);
      g.lineStyle(1, col(hot ? UI.gold : UI.goldDeep), 1).strokeRect(c.x + 1, c.y + 1, c.w - 2, c.h - 2);
      g.fillStyle(col(UI.gold), 1).fillPoints(
        [[6, 0], [1, 9], [5, 9], [3, 16], [10, 6], [6, 6], [8, 0]].map(([x, y]) => new Phaser.Math.Vector2(c.x + 6 + x, c.y + 3 + y)),
        true,
      );
      this.t('streak', c.x + 22, c.y + 4, hot ? `x${s.streak} streak +${Math.round(STREAK.bonus * 100)}%` : `x${s.streak} streak`, 11, hot ? UI.gold : UI.text, 'left', true);
    }
    const nexus = (team: Team) => s.units.find((u) => u.kind === 'nexus' && u.side === team)!;
    const pct = (u: Unit) => `${Math.max(0, Math.ceil((u.hp / u.maxHp) * 100))}%`;
    this.t('nexus-blue', 232, 9, `Blue Nexus ${pct(nexus('blue'))}`, 14, UI.blue, 'left', true);
    this.t('nexus-red', VIEW.w - 12, 9, `Red Nexus ${pct(nexus('red'))}`, 14, UI.red, 'right', true);
    // The clock in its own sunken box.
    g.fillStyle(col(UI.edge), 1).fillRect(VIEW.w / 2 - 38, 3, 76, 28);
    g.fillStyle(col('#1b212d'), 1).fillRect(VIEW.w / 2 - 37, 4, 74, 26);
    const mins = Math.floor(s.time / 60000);
    const secs = Math.floor((s.time % 60000) / 1000);
    this.t('clock', VIEW.w / 2, 8, `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`, 16, UI.text, 'center', true);
  }

  private drawObjectiveCard(g: Phaser.GameObjects.Graphics, s: GameState) {
    const c = OBJECTIVE_CARD;
    this.panel(g, c.x, c.y, c.w, c.h, UI.slate, 0.94);
    g.fillStyle(col(UI.gold), 1).fillRect(c.x + 3, c.y + 4, 3, c.h - 8);
    const o = s.objective;
    if (o) {
      const t = getUnit(s, o.target);
      const progress = t ? 1 - Math.max(0, t.hp) / t.maxHp : 1;
      this.t('obj-head', c.x + 14, c.y + 6, 'OBJECTIVE', 10, UI.gold, 'left', true);
      this.t('obj-time', c.x + c.w - 10, c.y + 6, `${clock(o.endsAt - s.time)} left`, 10, UI.dim, 'right', true);
      this.t('obj-title', c.x + 14, c.y + 20, o.title, 14, UI.text, 'left', true);
      g.fillStyle(0x151a24, 1).fillRect(c.x + 14, c.y + 46, 92, 6);
      g.fillStyle(col(UI.gold), 1).fillRect(c.x + 14, c.y + 46, 92 * progress, 6);
      this.t('obj-reward', c.x + c.w - 10, c.y + 42, o.banner ? `+${o.gold}g + Siege banner` : `+${o.gold}g`, 11, UI.gold, 'right', true);
    } else {
      const last = s.lastObjective;
      this.t('obj-head', c.x + 14, c.y + 6, last ? (last.done ? 'OBJECTIVE DONE' : 'OBJECTIVE MISSED') : 'OBJECTIVE', 10, last && !last.done ? UI.muted : UI.green, 'left', true);
      this.t('obj-title', c.x + 14, c.y + 20, last ? last.title : '', 14, UI.dim, 'left', true);
      this.t('obj-reward', c.x + 14, c.y + 42, `Next goal in ${clock(s.nextObjectiveAt - s.time)}${last?.done ? `   +${last.gold}g paid` : ''}`, 11, UI.dim, 'left');
    }
    if (s.time < s.siegeUntil) {
      const y = c.y + c.h + 6;
      g.fillStyle(col(UI.edge), 1).fillRect(c.x - 1, y - 1, 182, 20);
      g.fillStyle(col('#6b4f17'), 1).fillRect(c.x, y, 180, 18);
      g.fillStyle(col(UI.gold), 1).fillTriangle(c.x + 8, y + 3, c.x + 18, y + 3, c.x + 8, y + 10);
      g.fillStyle(col(UI.goldDeep), 1).fillRect(c.x + 7, y + 3, 1.5, 13);
      this.t('siege', c.x + 24, y + 3, `Siege banner +25% vs towers ${clock(s.siegeUntil - s.time)}`, 10, UI.gold, 'left', true);
    }
  }

  /** A chip for each team whose minions the guardian beast empowered, with the time left. */
  private drawBuffs(g: Phaser.GameObjects.Graphics, s: GameState) {
    let i = 0;
    for (const team of ['blue', 'red'] as Team[]) {
      const left = s.beastBuff[team] - s.time;
      if (left <= 0) continue;
      const c = buffChip(i++);
      g.fillStyle(col(UI.edge), 1).fillRect(c.x - 1, c.y - 1, c.w + 2, c.h + 2);
      g.fillStyle(col('#3b2f5c'), 1).fillRect(c.x, c.y, c.w, c.h);
      g.lineStyle(1, col(SIDE_COLOR[team]), 1).strokeRect(c.x + 1, c.y + 1, c.w - 2, c.h - 2);
      // A small violet crystal, the beast's.
      const cx = c.x + 12, cy = c.y + c.h / 2;
      g.fillStyle(0xb98cff, 1).fillPoints([new Phaser.Math.Vector2(cx, cy - 7), new Phaser.Math.Vector2(cx + 5, cy), new Phaser.Math.Vector2(cx, cy + 7), new Phaser.Math.Vector2(cx - 5, cy)], true);
      g.fillStyle(0xffffff, 0.45).fillTriangle(cx, cy - 7, cx - 5, cy, cx, cy);
      this.t(`buff-${team}`, c.x + 24, c.y + 4, `${team === 'blue' ? 'Your' : 'Red'} minions empowered ${clock(left)}`, 10, team === 'blue' ? UI.blue : UI.red, 'left', true);
    }
  }

  /** The newest notice (the beast woke, an inhibitor fell, a gank), for four seconds. */
  private drawNotice(g: Phaser.GameObjects.Graphics, s: GameState) {
    const n = s.notices[s.notices.length - 1];
    if (!n || s.time - n.at > 4000) return;
    const alpha = Math.min(1, (4000 - (s.time - n.at)) / 500);
    const w = Math.min(440, 40 + n.text.length * 6.4);
    const x = VIEW.w / 2 - w / 2, y = 42;
    g.fillStyle(col(UI.edge), 0.9 * alpha).fillRect(x - 1, y - 1, w + 2, 24);
    g.fillStyle(col(UI.slateDark), 0.92 * alpha).fillRect(x, y, w, 22);
    g.fillStyle(col(n.color), alpha).fillRect(x, y, 3, 22);
    g.fillStyle(col(n.color), alpha).fillRect(x + w - 3, y, 3, 22);
    this.t('notice', VIEW.w / 2, y + 4, n.text, 12, UI.text, 'center', true, false, alpha);
  }

  private drawBottomBar(g: Phaser.GameObjects.Graphics, s: GameState, me: Unit) {
    const c = me.champ!;
    this.panel(g, BOTTOM_BAR.x, BOTTOM_BAR.y, BOTTOM_BAR.w, BOTTOM_BAR.h);
    // The champion: a portrait figure, name, level, health and experience.
    const P = PORTRAIT;
    this.panel(g, P.x, P.y, P.w, P.h, UI.card);
    g.fillStyle(col('#3b7be8'), 0.25).fillEllipse(P.x + 40, P.y + 92, 56, 18);
    g.lineStyle(2, col('#3b7be8'), 0.9).strokeEllipse(P.x + 40, P.y + 92, 56, 18);
    this.portrait
      .setTexture(champKey(c.id, 'blue'), frameName(2, me.castMs > 0 ? 'c0' : me.swing > 0 ? 'a1' : 'idle'))
      .setOrigin(0.5, CHAMP_CELL.footY / CHAMP_CELL.h)
      .setPosition(P.x + 40, P.y + 92)
      .setScale(1.2 / RES)
      .setAlpha(me.dead ? 0.4 : 1)
      .setVisible(true);
    const bx = P.x + 82;
    const bw = P.w - 92;
    this.t('name', bx, P.y + 6, shortName(me.name), 15, UI.text, 'left', true);
    this.t('lv', P.x + P.w - 10, P.y + 8, `Lv ${me.level}`, 12, UI.gold, 'right', true);
    g.fillStyle(0x151a24, 1).fillRect(bx, P.y + 28, bw, 11);
    g.fillStyle(col('#62d86f'), 1).fillRect(bx, P.y + 28, bw * Math.max(0, me.hp / me.maxHp), 11);
    g.fillStyle(0xffffff, 0.25).fillRect(bx, P.y + 28, bw * Math.max(0, me.hp / me.maxHp), 2);
    this.t('hp', bx + bw / 2, P.y + 28, `${Math.max(0, Math.ceil(me.hp))} / ${me.maxHp}`, 9, UI.text, 'center', true);
    const xpFloor = XP_FOR_LEVEL[me.level - 1] ?? 0;
    const xpNext = XP_FOR_LEVEL[me.level] ?? XP_FOR_LEVEL[MAX_LEVEL - 1];
    const xpRatio = me.level >= MAX_LEVEL ? 1 : (me.xp - xpFloor) / (xpNext - xpFloor);
    g.fillStyle(0x151a24, 1).fillRect(bx, P.y + 43, bw, 5);
    g.fillStyle(col(UI.gold), 1).fillRect(bx, P.y + 43, bw * Math.max(0, Math.min(1, xpRatio)), 5);
    // The bag: six slots, each owned item a gem in its colour.
    for (let i = 0; i < MAX_ITEMS; i++) {
      const x = bx + i * 20, y = P.y + 52;
      g.fillStyle(col(UI.edge), 1).fillRect(x, y, 17, 17);
      g.fillStyle(col('#1d2330'), 1).fillRect(x + 1, y + 1, 15, 15);
      const item = ITEMS.find((it) => it.id === me.items[i]);
      if (!item) continue;
      const cx = x + 8.5, cy = y + 8.5;
      g.fillStyle(col(itemTint(item)), 1).fillPoints([new Phaser.Math.Vector2(cx, cy - 6), new Phaser.Math.Vector2(cx + 6, cy), new Phaser.Math.Vector2(cx, cy + 6), new Phaser.Math.Vector2(cx - 6, cy)], true);
      g.fillStyle(0xffffff, 0.4).fillTriangle(cx, cy - 6, cx - 6, cy, cx, cy);
      if (item.from) g.lineStyle(1, col(UI.gold), 1).strokeRect(x + 1, y + 1, 15, 15);
    }
    this.t('dead', bx, P.y + 72, me.dead ? `Respawn in ${Math.ceil((me.respawnAt - s.time) / 1000)}s` : `${c.name} · ${c.passive.name}`, 11, me.dead ? UI.red : UI.dim, 'left', true);
    this.t('lasthits', bx, P.y + 89, `K ${me.kills}  D ${me.deaths}  Last hits ${s.lastHits}`, 10, UI.muted);
    this.drawBuffStrip(g, me);

    // Q, W, E, R.
    const offer = s.upgradeOffers[0];
    const offered = offer ? offer.options.map((id) => upgradeById(id)?.key) : [];
    ABILITY_KEYS.forEach((k, i) => {
      const ab = c.abilities[i];
      const box = abilityBox(i);
      const locked = me.level < ab.level;
      const marked = offered.includes(k);
      this.goldFrame(g, box.x, box.y, box.w, box.h, marked);
      if (locked) g.fillStyle(0x0d1018, 0.7).fillRect(box.x + 3, box.y + 3, box.w - 6, box.h - 6);
      this.abilityIcon(g, ab, box.x + box.w / 2, box.y + box.h / 2 - 2, locked ? 0.35 : 1, c.color);
      const cd = me.cds[k];
      if (cd > 0) g.fillStyle(0x000000, 0.6).fillRect(box.x + 3, box.y + 3, box.w - 6, (box.h - 6) * (cd / ab.cd));
      this.t(`ab-${k}`, box.x + 6, box.y + 4, k, 12, locked ? UI.muted : UI.text, 'left', true);
      this.t(`abn-${k}`, box.x + box.w / 2, box.y + box.h - 15, ab.name.length > 10 ? ab.name.split(' ')[0] : ab.name, 9, UI.dim, 'center', true);
      const label = locked ? `Lv${ab.level}` : cd > 0 ? `${Math.ceil(cd / 1000)}` : '';
      this.t(`abcd-${k}`, box.x + box.w / 2, box.y + 14, label, 18, UI.text, 'center', true);
      // Chosen upgrades as gold pips, and a gold diamond on an ability the offer would change.
      const pips = me.upgrades.filter((id) => upgradeById(id)?.key === k).length;
      for (let p = 0; p < pips; p++) g.fillStyle(col(UI.gold), 1).fillRect(box.x + box.w - 9 - p * 6, box.y + box.h - 9, 4, 4);
      if (marked) {
        const dx = box.x + box.w - 6, dy = box.y - 2;
        g.fillStyle(col(UI.edge), 1).fillPoints([new Phaser.Math.Vector2(dx, dy - 9), new Phaser.Math.Vector2(dx + 9, dy), new Phaser.Math.Vector2(dx, dy + 9), new Phaser.Math.Vector2(dx - 9, dy)], true);
        g.fillStyle(col(UI.gold), 1).fillPoints([new Phaser.Math.Vector2(dx, dy - 7), new Phaser.Math.Vector2(dx + 7, dy), new Phaser.Math.Vector2(dx, dy + 7), new Phaser.Math.Vector2(dx - 7, dy)], true);
        g.fillStyle(0x7a5418, 1).fillTriangle(dx - 3, dy + 2, dx + 3, dy + 2, dx, dy - 3);
      }
    });

    // The shop button.
    const sb = SHOP_BUTTON;
    this.panel(g, sb.x, sb.y, sb.w, sb.h, this.shopOpen ? '#4a5876' : '#33405a');
    this.coin(g, sb.x + 20, sb.y + 23, 10);
    this.t('shop-label', sb.x + 36, sb.y + 10, 'Shop', 16, UI.text, 'left', true);
    this.t('shop-key', sb.x + 36, sb.y + 31, '[B]', 11, UI.dim, 'left', true);

    // The item actives: Dash (Phase Boots) on D, Flask on H (F is the hub's full screen key).
    ACTIVES.forEach((a, i) => {
      const r = activeButton(i);
      const owned = me.items.some((id) => ITEMS.find((it) => it.id === id)?.active === a.id);
      const cd = me.activeCds[a.id] ?? 0;
      this.goldFrame(g, r.x, r.y, r.w, r.h, false);
      const cx = r.x + r.w / 2 + 6, cy = r.y + r.h / 2 + 2;
      const alpha = owned ? 1 : 0.3;
      if (a.id === 'dash') {
        g.fillStyle(col(UI.blue), alpha).fillPoints([new Phaser.Math.Vector2(cx - 9, cy - 3), new Phaser.Math.Vector2(cx + 1, cy - 3), new Phaser.Math.Vector2(cx + 1, cy - 8), new Phaser.Math.Vector2(cx + 10, cy), new Phaser.Math.Vector2(cx + 1, cy + 8), new Phaser.Math.Vector2(cx + 1, cy + 3), new Phaser.Math.Vector2(cx - 9, cy + 3)], true);
      } else {
        // A round flask of green tonic with a cork.
        g.fillStyle(col('#cfe9ff'), alpha * 0.8).fillCircle(cx, cy + 2, 8);
        g.fillStyle(col('#62d86f'), alpha).fillCircle(cx, cy + 3, 6.5);
        g.fillStyle(col('#cfe9ff'), alpha * 0.8).fillRect(cx - 2.5, cy - 9, 5, 6);
        g.fillStyle(col('#8a5d36'), alpha).fillRect(cx - 3, cy - 11, 6, 3);
      }
      if (owned && cd > 0) g.fillStyle(0x000000, 0.6).fillRect(r.x + 3, r.y + 3, r.w - 6, (r.h - 6) * (cd / a.cd));
      this.t(`act-${a.id}`, r.x + 5, r.y + 3, a.key, 11, owned ? UI.text : UI.muted, 'left', true);
      if (owned && cd > 0) this.t(`actcd-${a.id}`, r.x + r.w / 2, r.y + 11, `${Math.ceil(cd / 1000)}`, 14, UI.text, 'center', true);
    });

    // The upgrade choice, or what the next level brings.
    const up = UPGRADE_PANEL;
    if (offer) {
      this.goldFrame(g, up.x, up.y, up.w, up.h, true);
      this.t('up-head', up.x + 8, up.y + 6, `LEVEL ${offer.level} · CHOOSE AN UPGRADE`, 9, UI.gold, 'left', true);
      offer.options.forEach((id, i) => {
        const u = upgradeById(id)!;
        const r = upgradeCard(i);
        this.panel(g, r.x, r.y, r.w, r.h, '#3a4660');
        g.fillStyle(col(UI.goldDeep), 1).fillRect(r.x + 5, r.y + 8, 24, 26);
        g.fillStyle(col(UI.gold), 1).fillRect(r.x + 6, r.y + 9, 22, 24);
        this.t(`up-key-${i}`, r.x + 17, r.y + 13, u.key, 14, '#3a2a08', 'center', true);
        this.t(`up-name-${i}`, r.x + 36, r.y + 6, u.name, 12, UI.text, 'left', true);
        this.t(`up-desc-${i}`, r.x + 36, r.y + 23, u.desc, 9, UI.dim);
        this.t(`up-num-${i}`, r.x + r.w - 6, r.y + 6, String(i + 1), 9, UI.muted, 'right', true);
      });
    } else {
      this.panel(g, up.x, up.y, up.w, up.h, UI.slate);
      const next = me.level < MAX_LEVEL ? UPGRADES[c.id]?.[me.level - 1] : undefined;
      this.t('up-head', up.x + 10, up.y + 8, 'UPGRADES', 9, UI.goldDeep, 'left', true);
      const chosen = me.upgrades.map((id) => upgradeById(id)?.name ?? id);
      this.t('up-chosen', up.x + 10, up.y + 26, chosen.length ? chosen.join('\n') : 'None yet', 10, chosen.length ? UI.text : UI.muted, 'left', true);
      this.t('up-next', up.x + 10, up.y + up.h - 18, next ? `Next at level ${me.level + 1}` : 'All levels reached', 9, UI.muted);
    }
  }

  /** The buffs the player's champion carries, as chips above the portrait with the time left. */
  private drawBuffStrip(g: Phaser.GameObjects.Graphics, me: Unit) {
    me.buffs.slice(0, 4).forEach((b, i) => {
      const r = buffStrip(i);
      g.fillStyle(col(UI.edge), 0.9).fillRect(r.x - 1, r.y - 1, r.w + 2, r.h + 2);
      g.fillStyle(col(UI.slateDark), 0.92).fillRect(r.x, r.y, r.w, r.h);
      g.fillStyle(col(b.color), 1).fillRect(r.x, r.y, 4, r.h);
      const label = b.id === 'ember' || b.id === 'moss' ? BUFFS[b.id].name : b.id;
      this.t(`bstrip-${i}`, r.x + 8, r.y + 3, `${label.length > 9 ? label.split(' ')[0] : label} ${Math.ceil(b.ms / 1000)}s`, 10, UI.text, 'left', true);
    });
  }

  /** A small icon for an ability, by what it does. */
  private abilityIcon(g: Phaser.GameObjects.Graphics, ab: AbilityDef, x: number, y: number, alpha: number, color: string) {
    const c = col(color);
    const V = (px: number, py: number) => new Phaser.Math.Vector2(x + px, y + py);
    switch (ab.kind) {
      case 'burst': {
        for (let i = 0; i < 8; i++) {
          const a = (i * Math.PI) / 4;
          g.fillStyle(i % 2 ? col(UI.gold) : c, alpha).fillTriangle(x + Math.cos(a - 0.25) * 6, y + Math.sin(a - 0.25) * 6, x + Math.cos(a + 0.25) * 6, y + Math.sin(a + 0.25) * 6, x + Math.cos(a) * 15, y + Math.sin(a) * 15);
        }
        g.fillStyle(c, alpha).fillCircle(x, y, 6);
        g.fillStyle(0xffffff, alpha * 0.5).fillCircle(x - 2, y - 2, 2.5);
        break;
      }
      case 'ally':
        g.fillStyle(col('#cfe9ff'), alpha).fillPoints([V(0, -13), V(11, -8), V(9, 5), V(0, 13), V(-9, 5), V(-11, -8)], true);
        g.fillStyle(c, alpha).fillPoints([V(0, -10), V(8, -6), V(6.5, 4), V(0, 10), V(-6.5, 4), V(-8, -6)], true);
        g.fillStyle(0xffffff, alpha * 0.4).fillPoints([V(0, -10), V(-8, -6), V(-6.5, 4), V(0, 10)], true);
        break;
      case 'dash':
        g.fillStyle(col(UI.gold), alpha).fillPoints([V(-13, -4), V(2, -4), V(2, -11), V(14, 0), V(2, 11), V(2, 4), V(-13, 4)], true);
        g.fillStyle(c, alpha).fillPoints([V(-13, 0), V(2, 0), V(2, 4), V(-13, 4)], true);
        break;
      case 'buff':
        // Three rising chevrons.
        for (let i = 0; i < 3; i++) {
          const yy = y + 9 - i * 8;
          g.fillStyle(i === 2 ? col(UI.gold) : c, alpha).fillPoints([V(-11, yy + 3 - y), V(0, yy - 5 - y), V(11, yy + 3 - y), V(11, yy + 7 - y), V(0, yy - 1 - y), V(-11, yy + 7 - y)], true);
        }
        break;
      case 'zone':
        // A patch on the ground with motes rising from it.
        g.fillStyle(c, alpha * 0.45).fillEllipse(x, y + 6, 30, 14);
        g.lineStyle(2, c, alpha).strokeEllipse(x, y + 6, 30, 14);
        for (const [dx, dy, r] of [[-6, -4, 2.5], [3, -10, 3], [8, -2, 2], [-1, -15, 2]]) g.fillStyle(dx < 0 ? c : col(UI.gold), alpha).fillCircle(x + dx, y + dy, r);
        break;
      case 'bolt':
        if (ab.pull) {
          // A barbed hook on a line.
          g.lineStyle(2, col('#d9c79a'), alpha).lineBetween(x - 12, y + 12, x + 4, y - 4);
          g.lineStyle(3, c, alpha).beginPath();
          g.arc(x + 4, y + 2, 7, -Math.PI / 2, Math.PI * 0.6, false);
          g.strokePath();
          g.fillStyle(c, alpha).fillTriangle(x + 2, y - 11, x + 9, y - 3, x - 1, y - 2);
          break;
        }
        g.lineStyle(3, col('#d9c79a'), alpha).lineBetween(x - 11, y + 11, x + 7, y - 7);
        g.fillStyle(c, alpha).fillTriangle(x + 13, y - 13, x + 2, y - 8, x + 8, y - 2);
        g.fillStyle(col(UI.gold), alpha).fillTriangle(x - 12, y + 12, x - 12, y + 5, x - 5, y + 12);
        break;
    }
  }

  private drawMinimap(g: Phaser.GameObjects.Graphics, s: GameState, me: Unit) {
    const m = MINIMAP;
    this.panel(g, m.x - 4, m.y - 4, m.w + 8, m.h + 8, UI.slate);
    const k = m.w / WORLD.w;
    const mx = (x: number) => m.x + x * k;
    const my = (y: number) => m.y + y * k;
    g.fillStyle(col('#3f7a3a'), 1).fillRect(m.x, m.y, m.w, m.h);
    g.lineStyle(4, col('#3a7ea3'), 0.95).lineBetween(mx(RIVER.from.x), my(RIVER.from.y), mx(RIVER.to.x), my(RIVER.to.y));
    g.lineStyle(3, col('#d2b483'), 0.95);
    for (const lane of Object.values(LANES)) {
      g.beginPath();
      g.moveTo(mx(lane[0].x), my(lane[0].y));
      for (const p of lane.slice(1)) g.lineTo(mx(p.x), my(p.y));
      g.strokePath();
    }
    for (const t of TOWERS) {
      const dead = s.units.find((u) => u.kind === 'tower' && u.x === t.x && u.y === t.y)?.dead;
      if (!dead) {
        g.fillStyle(col(UI.edge), 1).fillRect(mx(t.x) - 3, my(t.y) - 3, 6, 6);
        g.fillStyle(col(SIDE_COLOR[t.team]), 1).fillRect(mx(t.x) - 2, my(t.y) - 2, 4, 4);
      }
    }
    // Bushes as dark patches, and the beast's pit.
    for (const b of BUSHES) g.fillStyle(col('#24481f'), 0.9).fillEllipse(mx(b.x), my(b.y), b.rx * 2 * k, b.ry * 2 * k);
    g.lineStyle(1, 0xb98cff, 0.6).strokeCircle(mx(BEAST.x), my(BEAST.y), 5);
    for (const u of s.units) {
      if (u.dead || hiddenFrom(s, 'blue', u)) continue;
      if (u.kind === 'beast') {
        const cx = mx(u.x), cy = my(u.y);
        g.fillStyle(col(UI.edge), 1).fillPoints([new Phaser.Math.Vector2(cx, cy - 6), new Phaser.Math.Vector2(cx + 6, cy), new Phaser.Math.Vector2(cx, cy + 6), new Phaser.Math.Vector2(cx - 6, cy)], true);
        g.fillStyle(0xb98cff, 1).fillPoints([new Phaser.Math.Vector2(cx, cy - 4.5), new Phaser.Math.Vector2(cx + 4.5, cy), new Phaser.Math.Vector2(cx, cy + 4.5), new Phaser.Math.Vector2(cx - 4.5, cy)], true);
      } else if (u.kind === 'inhibitor') {
        g.fillStyle(col(UI.edge), 1).fillCircle(mx(u.x), my(u.y), 3);
        g.fillStyle(col(SIDE_COLOR[u.side as Team]), 1).fillCircle(mx(u.x), my(u.y), 2);
      } else if (u.kind === 'nexus') g.fillStyle(col(SIDE_COLOR[u.side as Team]), 1).fillCircle(mx(u.x), my(u.y), 5);
      else if (u.kind === 'champion') g.fillStyle(col(SIDE_COLOR[u.side as Team]), 1).fillCircle(mx(u.x), my(u.y), u.player ? 3.5 : 2.5);
      else if (u.kind === 'minion') g.fillStyle(col(SIDE_COLOR[u.side as Team]), 0.85).fillRect(mx(u.x) - 0.75, my(u.y) - 0.75, 1.5, 1.5);
      else if (u.kind === 'camp' && u.campKind !== 'pup') g.fillStyle(col(u.campKind === 'ember' ? BUFFS.ember.color : u.campKind === 'moss' ? BUFFS.moss.color : SIDE_COLOR.neutral), 0.9).fillCircle(mx(u.x), my(u.y), 2);
      else if (u.kind === 'watchstone') {
        const cx = mx(u.x), cy = my(u.y);
        g.fillStyle(col(UI.edge), 1).fillRect(cx - 3, cy - 3, 6, 6);
        g.fillStyle(col(u.side === 'neutral' ? SIDE_COLOR.neutral : SIDE_COLOR[u.side]), 1).fillRect(cx - 2, cy - 2, 4, 4);
      }
    }
    // The view and the player.
    const v = this.viewRect();
    g.lineStyle(1, 0xffffff, 0.7).strokeRect(mx(v.x), my(v.y), VIEW.w * k, VIEW.h * k);
    g.lineStyle(1, 0xffffff, 0.9).strokeCircle(mx(me.x), my(me.y), 5);
    // A gold star on the objective.
    const o = s.objective;
    const t = o && getUnit(s, o.target);
    if (t && !t.dead) {
      const cx = mx(t.x), cy = my(t.y);
      const star = (r: number) =>
        Array.from({ length: 10 }, (_, i) => {
          const a = -Math.PI / 2 + (i * Math.PI) / 5;
          const rr = i % 2 ? r * 0.45 : r;
          return new Phaser.Math.Vector2(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
        });
      g.fillStyle(col(UI.edge), 1).fillPoints(star(8), true);
      g.fillStyle(col(UI.gold), 1).fillPoints(star(6.5), true);
    }
  }

  private drawShop(g: Phaser.GameObjects.Graphics, me: Unit) {
    const p = SHOP_PANEL;
    this.panel(g, p.x, p.y, p.w, p.h, UI.slate);
    g.fillStyle(col(UI.gold), 1).fillRect(p.x + 2, p.y + 2, p.w - 4, 3);
    this.t('shop-title', p.x + 16, p.y + 12, 'Shop', 18, UI.gold, 'left', true);
    const atBase = Math.hypot(me.x - BASE.blue.x, me.y - BASE.blue.y) <= 700;
    const note = atBase ? `Gold ${Math.floor(me.gold)}. Bag ${me.items.length}/${MAX_ITEMS}. Parts you own build into bigger items and come off their price.` : 'Return to your Nexus to buy items.';
    this.t('shop-note', p.x + 16, p.y + 36, note, 11, atBase ? UI.dim : UI.red);
    ITEMS.forEach((item, i) => {
      const r = shopRow(i);
      const has = me.items.includes(item.id);
      const price = priceFor(me, item);
      const parts = (item.from ?? []).filter((id) => me.items.includes(id));
      const fits = me.items.length - parts.length < MAX_ITEMS;
      const afford = me.gold >= price;
      this.panel(g, r.x, r.y, r.w, r.h, has ? '#2a3140' : item.from ? '#41496a' : '#3a4660');
      // Items that build from parts get a gold top edge.
      if (item.from) g.fillStyle(col(has ? UI.goldDeep : UI.gold), 1).fillRect(r.x + 2, r.y + 2, r.w - 4, 2);
      const cx = r.x + 18, cy = r.y + 20;
      g.fillStyle(col(UI.edge), 1).fillPoints([new Phaser.Math.Vector2(cx, cy - 12), new Phaser.Math.Vector2(cx + 11, cy), new Phaser.Math.Vector2(cx, cy + 12), new Phaser.Math.Vector2(cx - 11, cy)], true);
      g.fillStyle(col(itemTint(item)), has ? 0.4 : 1).fillPoints([new Phaser.Math.Vector2(cx, cy - 10), new Phaser.Math.Vector2(cx + 9, cy), new Phaser.Math.Vector2(cx, cy + 10), new Phaser.Math.Vector2(cx - 9, cy)], true);
      g.fillStyle(0xffffff, has ? 0.15 : 0.4).fillTriangle(cx, cy - 10, cx - 9, cy, cx, cy);
      this.t(`shop-name-${i}`, r.x + 34, r.y + 7, item.name, 12, has ? UI.muted : UI.text, 'left', true);
      const label = has ? 'Owned' : !fits ? 'Bag full' : `${price}g`;
      this.t(`shop-price-${i}`, r.x + 34, r.y + 23, label, 11, has || !fits ? UI.muted : afford ? UI.gold : UI.red, 'left', true);
      if (!has && parts.length) this.t(`shop-save-${i}`, r.x + r.w - 8, r.y + 23, `-${item.cost - price}g parts`, 9, UI.green, 'right', true);
      this.t(`shop-desc-${i}`, r.x + 10, r.y + 44, describe(item), 10, UI.dim);
      const into = ITEMS.filter((it) => it.from?.includes(item.id));
      const recipe = item.from
        ? `From ${item.from.map((id) => ITEMS.find((it) => it.id === id)?.name ?? id).join(' + ')}`
        : into.length === 1
          ? `Builds into ${into[0].name}`
          : into.length
            ? `Builds into ${into.length} items`
            : 'Active item';
      this.t(`shop-recipe-${i}`, r.x + 10, r.y + 64, recipe, 9, item.from ? UI.gold : UI.muted, 'left', !!item.from);
    });
  }

  private drawEnd(g: Phaser.GameObjects.Graphics, s: GameState) {
    g.fillStyle(0x000000, 0.6).fillRect(0, 0, VIEW.w, VIEW.h);
    const p = END_PANEL;
    this.panel(g, p.x, p.y, p.w, p.h, UI.slate);
    g.fillStyle(col(UI.gold), 1).fillRect(p.x + 2, p.y + 2, p.w - 4, 3);
    const won = s.winner === 'blue';
    this.t('end-title', VIEW.w / 2, p.y + 22, won ? 'Victory' : 'Defeat', 34, won ? UI.green : UI.red, 'center', true);
    this.t('end-sub', VIEW.w / 2, p.y + 72, won ? 'The red Nexus has fallen.' : 'Your Nexus has fallen.', 13, UI.dim, 'center');
    this.t('end-stats', VIEW.w / 2, p.y + 94, `${this.player()?.kills ?? 0} kills, ${this.player()?.deaths ?? 0} deaths   Objectives ${s.objectivesDone}   Last hits ${s.lastHits}   Best streak x${s.bestStreak}   Beasts ${s.beastKills.blue}`, 11, UI.muted, 'center');
    this.panel(g, PLAY_AGAIN.x, PLAY_AGAIN.y, PLAY_AGAIN.w, PLAY_AGAIN.h, '#4a5876');
    this.t('again-label', PLAY_AGAIN.x + PLAY_AGAIN.w / 2, PLAY_AGAIN.y + 12, 'Play again', 16, UI.text, 'center', true);
  }
}
