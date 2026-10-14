import Phaser from 'phaser';
import {
  ABILITY_KEYS,
  AbilityDef,
  AbilityKey,
  BASE,
  CHAMPIONS,
  ChampionDef,
  ITEMS,
  ItemDef,
  LANES,
  MAX_LEVEL,
  SIDE_COLOR,
  STREAK,
  Team,
  TOWERS,
  UPGRADES,
  Vec,
  WORLD,
  XP_FOR_LEVEL,
  upgradeById,
} from '../game/data';
import { Fx, GameState, Phase, Unit, createGame, dist, getUnit } from '../game/state';
import { buy, cast, chooseUpgrade, commandAttack, commandMove, tick } from '../game/sim';
import {
  BOAR,
  BOAR_CELL,
  CHAMP_CELL,
  COIN,
  MINION_CELL,
  MINION_OUTLINE,
  NEXUS_CELL,
  RES,
  RUBBLE,
  RUBBLE_CELL,
  TOWER_CELL,
  bakeUnits,
  champKey,
  dirFor,
  frameName,
  minionKey,
  nexusKey,
  towerKey,
} from '../art/bake';
import { MAP_KEY, paintMap } from '../art/map';
import { PoseName } from '../art/models';
import { byDifficulty, settings } from '../../../../shared/settings';
import {
  BOTTOM_BAR,
  END_PANEL,
  FONT,
  MINIMAP,
  OBJECTIVE_CARD,
  PLAY_AGAIN,
  PORTRAIT,
  SHOP_BUTTON,
  SHOP_PANEL,
  STREAK_CHIP,
  TOP_BAR,
  UPGRADE_PANEL,
  VIEW,
  abilityBox,
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
const FOOT = { champion: 9, minion: 5, camp: 8, tower: 12, nexus: 16 } as const;
/** How far above the feet the top of each kind's figure is, for bars and markers. */
const HEAD = { champion: 56, minion: 32, camp: 34, tower: 104, nexus: 104 } as const;

const noop = () => undefined;
/** The size of the map's tiles, in pixels. */
const MAP_TILE = 400;

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
  if (item.atk) parts.push(`+${item.atk}% attack speed`);
  if (item.cdr) parts.push(`-${item.cdr}% cooldowns`);
  return parts.join(', ');
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
  private used = new Set<string>();
  private keys!: Record<AbilityKey | 'B' | 'ESC' | 'ONE' | 'TWO', Phaser.Input.Keyboard.Key>;

  constructor() {
    super('Game');
  }

  create() {
    const t0 = performance.now();
    const unitsMs = bakeUnits(this);
    paintMap(this);
    if (import.meta.env.DEV) console.info(`Lane Brawl art baked in ${Math.round(performance.now() - t0)} ms (units ${Math.round(unitsMs)} ms)`);
    this.paintPickBackdrop();
    this.cameras.main.setBounds(0, 0, WORLD.w, WORLD.h);
    // The map in tiles, so only the ones in view are drawn.
    for (let y = 0; y < WORLD.h; y += MAP_TILE) {
      for (let x = 0; x < WORLD.w; x += MAP_TILE) {
        const frame = `${x},${y}`;
        this.textures.get(MAP_KEY).add(frame, 0, x, y, Math.min(MAP_TILE, WORLD.w - x), Math.min(MAP_TILE, WORLD.h - y));
        this.mapTiles.push(this.add.image(x, y, MAP_KEY, frame).setOrigin(0, 0).setDepth(0));
      }
    }
    this.groundG = this.add.graphics().setDepth(1);
    this.topG = this.add.graphics().setDepth(4);
    this.hudG = this.add.graphics().setDepth(10).setScrollFactor(0);
    this.pickBg = this.add.image(0, 0, 'lb-pick-bg').setOrigin(0, 0).setScrollFactor(0).setDepth(9);
    this.portrait = this.add.image(0, 0, champKey('warden', 'blue'), frameName(2, 'idle')).setScrollFactor(0).setDepth(11).setVisible(false);
    CHAMPIONS.forEach((c, i) => {
      const r = pickCard(i);
      this.pickImages.push(
        this.add
          .image(r.x + r.w / 2, r.y + 100, champKey(c.id, 'blue'), frameName(2, 'idle'))
          .setOrigin(0.5, CHAMP_CELL.footY / CHAMP_CELL.h)
          .setScale(0.85)
          .setScrollFactor(0)
          .setDepth(11),
      );
    });

    this.keys = this.input.keyboard!.addKeys('Q,W,E,R,B,ESC,ONE,TWO') as typeof this.keys;
    for (const k of ABILITY_KEYS) this.keys[k].on('down', () => this.castAtCursor(k));
    this.keys.B.on('down', () => this.toggleShop());
    this.keys.ESC.on('down', () => this.setShop(false));
    this.keys.ONE.on('down', () => this.pickUpgrade(0));
    this.keys.TWO.on('down', () => this.pickUpgrade(1));

    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      this.lastWorld = { x: p.worldX, y: p.worldY };
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
    if (s) this.collectFx(s, frameMs);
    this.followPlayer(frameMs);
    this.used.clear();
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
    if (offer > 0) [0, 1].forEach((i) => this.zones.push({ ...upgradeCard(i), run: () => this.pickUpgrade(i) }));
    if (this.shopOpen) {
      this.zones.push({ ...SHOP_PANEL, run: noop });
      ITEMS.forEach((item, i) => this.zones.push({ ...shopRow(i), run: () => this.player() && this.state && buy(this.player()!, item.id) }));
    }
  }

  private onPointerDown(p: Phaser.Input.Pointer) {
    // The zones are searched newest first, so a card over a bar wins.
    const hit = [...this.zones].reverse().find((z) => p.x >= z.x && p.x <= z.x + z.w && p.y >= z.y && p.y <= z.y + z.h);
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
    // Reduced motion drops the rings and lines but keeps the last-hit coins, which carry the gold.
    for (const f of s.fx) if (!settings.reduceMotion || f.kind === 'coin') this.liveFx.push({ f, left: f.ms });
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

  /** The pick screen's backdrop: faceted slate, painted once. */
  private paintPickBackdrop() {
    if (this.textures.exists('lb-pick-bg')) return;
    const c = document.createElement('canvas');
    c.width = VIEW.w;
    c.height = VIEW.h;
    const ctx = c.getContext('2d')!;
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
    const cam = this.cameras.main;
    for (const tile of this.mapTiles) {
      tile.setVisible(tile.x < cam.scrollX + VIEW.w && tile.x + MAP_TILE > cam.scrollX && tile.y < cam.scrollY + VIEW.h && tile.y + MAP_TILE > cam.scrollY);
    }
    const g = this.groundG;
    const top = this.topG;
    g.clear();
    top.clear();
    const s = this.state;
    const seen = new Set<number>();
    if (s) {
      const me = this.player();
      for (const u of s.units) {
        if (u.dead && u.kind !== 'tower') continue;
        seen.add(u.id);
        this.drawGround(g, u, s);
        this.placeSprite(u, s);
      }
      for (const u of s.units) if (!u.dead) this.drawBar(top, u, me);
      this.drawObjectiveMarker(top, s);
      for (const p of s.projectiles) {
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

  private drawGround(g: Phaser.GameObjects.Graphics, u: Unit, s: GameState) {
    if (u.dead) return;
    const fy = u.y + FOOT[u.kind];
    const r = u.kind === 'tower' ? 30 : u.kind === 'nexus' ? 54 : u.radius;
    // A soft shadow cast to the bottom right.
    g.fillStyle(0x0b1a0e, 0.18).fillEllipse(u.x + r * 0.35, fy + r * 0.12, r * 2.5, r * 1.2);
    g.fillStyle(0x0b1a0e, 0.18).fillEllipse(u.x + r * 0.25, fy + r * 0.08, r * 1.9, r * 0.9);
    if (u.kind === 'champion' || u.kind === 'minion' || u.kind === 'camp') {
      // The team ring under the feet: blue, red, or gold for the jungle.
      const color = col(SIDE_COLOR[u.side]);
      const w = r * 2.2, h = r * 1.25;
      g.lineStyle(u.kind === 'minion' ? 2 : 3, color, 0.95).strokeEllipse(u.x, fy, w, h);
      g.fillStyle(color, 0.16).fillEllipse(u.x, fy, w, h);
      if (u.player) g.lineStyle(1.5, 0xffffff, 0.9).strokeEllipse(u.x, fy, w + 10, h + 6);
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
      case 'camp':
        key = BOAR;
        frame = frameName(dirFor(u.facing), pose(10) === 'c0' ? 'idle' : pose(10));
        cell = BOAR_CELL;
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
    sp.main.setTexture(key, frame).setOrigin(0.5, cell.footY / cell.h).setPosition(u.x, fy).setDepth(depth).setVisible(true);
    const marked = s.lastHitMark === u.id && u.kind === 'minion' && u.side === 'red';
    sp.outline.setVisible(marked);
    if (marked) sp.outline.setTexture(MINION_OUTLINE, frame).setOrigin(0.5, cell.footY / cell.h).setPosition(u.x, fy).setDepth(depth - 0.0001);
    const flash = !settings.reduceMotion && u.flash > 0 && !u.dead;
    sp.flash.setVisible(flash);
    if (flash) sp.flash.setTexture(key, frame).setOrigin(0.5, cell.footY / cell.h).setPosition(u.x, fy).setDepth(depth + 0.0001).setAlpha(0.4 * (u.flash / 120));
  }

  /** A health bar above a unit. Shield shows as a pale strip over the health. */
  private drawBar(g: Phaser.GameObjects.Graphics, u: Unit, me: Unit | null) {
    if (u.kind === 'minion' && u.hp >= u.maxHp) return;
    const w = u.kind === 'nexus' ? 90 : u.kind === 'tower' ? 64 : u.kind === 'minion' ? 30 : 50;
    const h = u.kind === 'minion' ? 4 : 6;
    const x = u.x - w / 2;
    const y = u.y + FOOT[u.kind] - HEAD[u.kind] - 10;
    const ratio = Math.max(0, u.hp / u.maxHp);
    const own = me !== null && u.side === me.side;
    g.fillStyle(col(UI.edge), 0.9).fillRect(x - 1, y - 1, w + 2, h + 2);
    g.fillStyle(0x2a2f3a, 1).fillRect(x, y, w, h);
    const fill = own ? '#62d86f' : u.side === 'neutral' ? SIDE_COLOR.neutral : '#ec5a48';
    g.fillStyle(col(fill), 1).fillRect(x, y, w * ratio, h);
    g.fillStyle(0xffffff, 0.25).fillRect(x, y, w * ratio, 1.5);
    if (u.shield > 0) g.fillStyle(0xd6efff, 1).fillRect(x, y - 3, Math.min(w, (u.shield / u.maxHp) * w), 2);
    if (u.kind === 'champion') {
      // The level in a small slate badge at the bar's left.
      g.fillStyle(col(UI.slateDark), 1).fillRect(x - 13, y - 3, 12, 12);
      this.t(`lvl-${u.id}`, x - 7, y - 3, String(u.level), 9, UI.text, 'center', true, true);
    }
    if (u.stunMs > 0) this.t(`stun-${u.id}`, u.x, y - 16, 'STUN', 9, UI.gold, 'center', true, true);
  }

  /** A gold marker over the objective's target, with the reward, and a dashed ring round it. */
  private drawObjectiveMarker(g: Phaser.GameObjects.Graphics, s: GameState) {
    const o = s.objective;
    const t = o && getUnit(s, o.target);
    if (!o || !t || t.dead) return;
    const fy = t.y + FOOT[t.kind];
    const bob = settings.reduceMotion ? 0 : Math.sin(s.time / 220) * 3;
    const y = fy - HEAD[t.kind] - 18 + bob;
    const label = `OBJECTIVE · +${o.gold}g`;
    const w = 128;
    g.fillStyle(col(UI.slateDark), 0.92).fillRect(t.x - w / 2, y - 22, w, 18);
    g.lineStyle(1.5, col(UI.gold), 1).strokeRect(t.x - w / 2, y - 22, w, 18);
    g.fillStyle(col(UI.gold), 1).fillTriangle(t.x - 6, y - 4, t.x + 6, y - 4, t.x, y + 4);
    this.t('obj-marker', t.x, y - 20, label, 11, UI.gold, 'center', true, true);
    const r = t.kind === 'tower' ? 44 : t.kind === 'nexus' ? 70 : t.radius + 14;
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
    this.t('title', VIEW.w / 2, 34, 'LANE BRAWL', 40, UI.gold, 'center', true);
    this.t('sub', VIEW.w / 2, 90, 'Pick your champion. Four allies fill the other roles; five champions fight you on red.', 13, UI.dim, 'center');
    CHAMPIONS.forEach((c, i) => {
      const r = pickCard(i);
      this.panel(g, r.x, r.y, r.w, r.h, UI.card);
      g.fillStyle(col(c.color), 1).fillRect(r.x + 2, r.y + 2, r.w - 4, 4);
      g.fillStyle(col('#3b7be8'), 0.25).fillEllipse(r.x + r.w / 2, r.y + 100, 80, 24);
      g.lineStyle(2, col('#3b7be8'), 0.9).strokeEllipse(r.x + r.w / 2, r.y + 100, 80, 24);
      this.t(`pick-name-${i}`, r.x + r.w / 2, r.y + 118, c.name, 17, UI.text, 'center', true);
      this.t(`pick-role-${i}`, r.x + r.w / 2, r.y + 139, c.role.toUpperCase(), 10, c.color, 'center', true);
      c.abilities.forEach((ab, j) => {
        this.t(`pick-key-${i}-${j}`, r.x + 14, r.y + 158 + j * 16, ab.key, 11, UI.gold, 'left', true);
        this.t(`pick-ab-${i}-${j}`, r.x + 28, r.y + 158 + j * 16, ab.name, 11, UI.dim);
      });
    });
    this.t('hint', VIEW.w / 2, 404, 'Click a champion to start. Click the ground to walk, an enemy to attack.', 12, UI.dim, 'center');
    this.t('hint2', VIEW.w / 2, 424, 'Q W E R cast at the cursor. B opens the shop at your Nexus. 1 or 2 picks an upgrade.', 12, UI.dim, 'center');
  }

  private drawPlaying(g: Phaser.GameObjects.Graphics, s: GameState) {
    const me = this.player();
    if (!me || !me.champ) return;
    this.drawTopBar(g, s, me);
    // The shop panel covers the objective card, so the card steps aside while it is open.
    if (!this.shopOpen) this.drawObjectiveCard(g, s);
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
      .setScale(0.6)
      .setAlpha(me.dead ? 0.4 : 1)
      .setVisible(true);
    const bx = P.x + 82;
    const bw = P.w - 92;
    this.t('name', bx, P.y + 6, c.name, 15, UI.text, 'left', true);
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
    const owned = me.items.map((id) => ITEMS.find((i) => i.id === id)?.name ?? id);
    this.t('items', bx, P.y + 54, owned.length ? owned.slice(0, 2).join(', ') + (owned.length > 2 ? ` +${owned.length - 2}` : '') : 'No items yet', 10, UI.dim);
    this.t('dead', bx, P.y + 72, me.dead ? `Respawn in ${Math.ceil((me.respawnAt - s.time) / 1000)}s` : c.role, 11, me.dead ? UI.red : UI.dim, 'left', true);
    this.t('lasthits', bx, P.y + 89, `Last hits ${s.lastHits}  best x${s.bestStreak}`, 10, UI.muted);

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
      case 'bolt':
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
    for (const u of s.units) {
      if (u.dead) continue;
      if (u.kind === 'nexus') g.fillStyle(col(SIDE_COLOR[u.side as Team]), 1).fillCircle(mx(u.x), my(u.y), 5);
      else if (u.kind === 'champion') g.fillStyle(col(SIDE_COLOR[u.side as Team]), 1).fillCircle(mx(u.x), my(u.y), u.player ? 3.5 : 2.5);
      else if (u.kind === 'minion') g.fillStyle(col(SIDE_COLOR[u.side as Team]), 0.85).fillRect(mx(u.x) - 0.75, my(u.y) - 0.75, 1.5, 1.5);
      else if (u.kind === 'camp') g.fillStyle(col(SIDE_COLOR.neutral), 0.8).fillCircle(mx(u.x), my(u.y), 2);
    }
    // The view and the player.
    const cam = this.cameras.main;
    g.lineStyle(1, 0xffffff, 0.7).strokeRect(mx(cam.scrollX), my(cam.scrollY), VIEW.w * k, VIEW.h * k);
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
    this.t('shop-note', p.x + 16, p.y + 36, atBase ? `Gold ${Math.floor(me.gold)}. Click an item to buy it.` : 'Return to your Nexus to buy items.', 11, atBase ? UI.dim : UI.red);
    ITEMS.forEach((item, i) => {
      const r = shopRow(i);
      const has = me.items.includes(item.id);
      const afford = me.gold >= item.cost;
      this.panel(g, r.x, r.y, r.w, r.h, has ? '#2a3140' : '#3a4660');
      // A gem icon tinted by what the item gives.
      const tint = item.dmg ? '#ff8a5c' : item.armor ? '#b9c3cf' : item.hp ? '#62d86f' : item.speed ? '#7fb6ff' : item.atk ? '#f2c14e' : '#c49bff';
      const cx = r.x + 22, cy = r.y + r.h / 2;
      g.fillStyle(col(UI.edge), 1).fillPoints([new Phaser.Math.Vector2(cx, cy - 13), new Phaser.Math.Vector2(cx + 12, cy), new Phaser.Math.Vector2(cx, cy + 13), new Phaser.Math.Vector2(cx - 12, cy)], true);
      g.fillStyle(col(tint), has ? 0.4 : 1).fillPoints([new Phaser.Math.Vector2(cx, cy - 11), new Phaser.Math.Vector2(cx + 10, cy), new Phaser.Math.Vector2(cx, cy + 11), new Phaser.Math.Vector2(cx - 10, cy)], true);
      g.fillStyle(0xffffff, has ? 0.15 : 0.4).fillTriangle(cx, cy - 11, cx - 10, cy, cx, cy);
      this.t(`shop-name-${i}`, r.x + 42, r.y + 8, item.name, 14, has ? UI.muted : UI.text, 'left', true);
      this.t(`shop-desc-${i}`, r.x + 42, r.y + 29, describe(item), 11, UI.dim);
      const price = has ? 'Owned' : `${item.cost}g`;
      this.t(`shop-price-${i}`, r.x + r.w - 12, r.y + 16, price, 14, has ? UI.muted : afford ? UI.gold : UI.red, 'right', true);
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
    this.t('end-stats', VIEW.w / 2, p.y + 94, `Objectives ${s.objectivesDone}   Last hits ${s.lastHits}   Best streak x${s.bestStreak}`, 11, UI.muted, 'center');
    this.panel(g, PLAY_AGAIN.x, PLAY_AGAIN.y, PLAY_AGAIN.w, PLAY_AGAIN.h, '#4a5876');
    this.t('again-label', PLAY_AGAIN.x + PLAY_AGAIN.w / 2, PLAY_AGAIN.y + 12, 'Play again', 16, UI.text, 'center', true);
  }
}
