import Phaser from 'phaser';
import { settings } from '../../../../shared/settings';
import { splitHudCamera, viewPoint } from '../../../../shared/scaling';
import { HEROES, schemeOf, type HeroId } from '../game/heroes';
import { HERO_R, RUN_MS, clock, freshState, statsOf, type GameState, type Phase } from '../game/state';
import { choose, phalanxSpots, shieldHalf, startRun, suppressorHalf, suppressorLength, tick } from '../game/sim';
import { UPGRADES, MAX_TIER } from '../game/upgrades';
import { loadProgress, recordRun, type Progress } from '../game/save';
import { C, hex } from '../art/glow';
import { heroKey } from '../art/sprites';
import { Panel, endScreen, heroSelect, levelUp } from '../ui/panels';
import { BOSS_BAR, CENTER, DEPTH, FONT, HP_BAR, KIT, LEVEL, SIG_BUTTON, TIMER, VIEW, XP_BAR, inside } from './layout';

/** A pool of images for one kind of thing on the field, reused frame to frame. */
class Pool {
  private items: Phaser.GameObjects.Image[] = [];
  private used = 0;
  constructor(private scene: Phaser.Scene, private depth: number, private add = false) {}

  begin() {
    this.used = 0;
  }

  next(key: string, x: number, y: number) {
    let im = this.items[this.used];
    if (!im) {
      im = this.scene.add.image(x, y, key).setDepth(this.depth);
      // Glowing things add their light, so overlapping halos never darken each other.
      if (this.add) im.setBlendMode(Phaser.BlendModes.ADD);
      this.items.push(im);
    } else {
      if (im.texture.key !== key) im.setTexture(key);
      im.setPosition(x, y).setVisible(true).setRotation(0).setScale(1).setAlpha(1).setFlipX(false).setOrigin(0.5);
    }
    this.used += 1;
    return im;
  }

  end() {
    for (let i = this.used; i < this.items.length; i++) this.items[i].setVisible(false);
  }
}

/** The hero art's centre within its texture (see HERO_BOX in sprites.ts). */
const HERO_ORIGIN = { x: 0.5, y: 52 / 120 };

/** Cheap repeatable noise for the ground's decorations (Math.random is left to the rules). */
function hash(x: number, y: number, k = 0) {
  const n = Math.sin(x * 127.1 + y * 311.7 + k * 74.7) * 43758.5453;
  return n - Math.floor(n);
}

export class GameScene extends Phaser.Scene {
  /** The run (read by the playthrough test). */
  state: GameState = freshState();
  /** The panel showing (hero select, level-up or end of run) and where its cards are. */
  panel: Panel | null = null;
  private shownPhase: Phase | null = null;
  private shownChoices: string[] | null = null;
  private progress: Progress = loadProgress();

  private ground!: Phaser.GameObjects.Graphics;
  private under!: Phaser.GameObjects.Graphics;
  private over!: Phaser.GameObjects.Graphics;
  private hud!: Phaser.GameObjects.Graphics;
  private pools!: Record<'pickups' | 'enemies' | 'allies' | 'bolts', Pool>;
  private hero!: Phaser.GameObjects.Image;
  private popTexts: Phaser.GameObjects.Text[] = [];
  private texts!: Record<'timer' | 'level' | 'hp' | 'kit' | 'sig' | 'sigKey' | 'boss', Phaser.GameObjects.Text>;

  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  /** Whether a pointer is held on the field to walk, and the signature asked for this frame. */
  private walking = false;
  private sigQueued = false;

  constructor() {
    super('Game');
  }

  create() {
    this.state = freshState();
    this.panel = null;
    this.shownPhase = null;
    this.progress = loadProgress();
    // The world camera follows the hero; the HUD (scroll factor 0) gets a fixed camera.
    splitHudCamera(this);
    this.ground = this.add.graphics().setDepth(DEPTH.ground);
    this.under = this.add.graphics().setDepth(DEPTH.under);
    this.over = this.add.graphics().setDepth(DEPTH.over);
    this.pools = {
      pickups: new Pool(this, DEPTH.pickups),
      enemies: new Pool(this, DEPTH.enemies, true),
      allies: new Pool(this, DEPTH.allies),
      bolts: new Pool(this, DEPTH.bolts, true),
    };
    this.hero = this.add.image(0, 0, heroKey('rook')).setOrigin(HERO_ORIGIN.x, HERO_ORIGIN.y).setDepth(DEPTH.hero).setVisible(false);
    this.hud = this.add.graphics().setScrollFactor(0).setDepth(DEPTH.hud);
    const text = (x: number, y: number, size: number, color: string, origin: [number, number], bold = false) =>
      this.add
        .text(x, y, '', { fontFamily: FONT, fontSize: `${size}px`, color, fontStyle: bold ? 'bold' : 'normal' })
        .setOrigin(...origin)
        .setScrollFactor(0)
        .setDepth(DEPTH.hud + 1);
    this.texts = {
      timer: text(TIMER.x, TIMER.y, 28, C.text, [0.5, 0.5], true),
      level: text(LEVEL.x, LEVEL.y, 18, C.text, [1, 0.5], true),
      hp: text(HP_BAR.x, HP_BAR.y + HP_BAR.h + 4, 12, C.muted, [0, 0]),
      kit: text(KIT.x, KIT.y, 11.5, C.muted, [0, 0]).setLineSpacing(2),
      sig: text(SIG_BUTTON.x, SIG_BUTTON.y - 6, 11, C.text, [0.5, 0.5], true),
      sigKey: text(SIG_BUTTON.x, SIG_BUTTON.y + 10, 10, C.muted, [0.5, 0.5]),
      boss: text(BOSS_BAR.x + BOSS_BAR.w / 2, BOSS_BAR.y - 9, 12, C.boss, [0.5, 0.5], true),
    };
    this.texts.timer.setShadow(0, 0, '#5fa8ff', 8, false, true);

    const kb = this.input.keyboard!;
    this.keys = kb.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE,ONE,TWO,THREE,ENTER') as Record<string, Phaser.Input.Keyboard.Key>;
    this.keys.SPACE.on('down', () => (this.sigQueued = true));
    this.keys.ONE.on('down', () => this.pickIndex(0));
    this.keys.TWO.on('down', () => this.pickIndex(1));
    this.keys.THREE.on('down', () => this.pickIndex(2));
    this.keys.ENTER.on('down', () => {
      if (this.state.phase === 'won' || this.state.phase === 'lost') this.backToSelect();
    });
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.pointerDown(p));
    this.input.on('pointerup', () => (this.walking = false));
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => this.panel?.hover(viewPoint(p)));
    this.syncPanel();
  }

  // -------------------------------------------------------------------------------------------
  // Input

  private pointerDown(pointer: Phaser.Input.Pointer) {
    const v = viewPoint(pointer);
    const s = this.state;
    if (s.phase === 'run') {
      const d = Math.hypot(v.x - SIG_BUTTON.x, v.y - SIG_BUTTON.y);
      if (d <= SIG_BUTTON.r) this.sigQueued = true;
      else this.walking = true;
      return;
    }
    const spot = this.panel?.spots.find((r) => inside(v, r));
    if (!spot) return;
    if (s.phase === 'select') this.begin(spot.id as HeroId);
    else if (s.phase === 'levelup') this.pickIndex(this.panel!.spots.indexOf(spot));
    else this.backToSelect();
  }

  private pickIndex(i: number) {
    const s = this.state;
    if (s.phase === 'select') {
      const id = this.panel?.spots[i]?.id;
      if (id) this.begin(id as HeroId);
    } else if (s.phase === 'levelup') choose(s, i);
  }

  private begin(id: HeroId) {
    startRun(this.state, id);
    this.hero.setTexture(heroKey(id)).setVisible(true);
    this.walking = false;
    this.sigQueued = false;
  }

  private backToSelect() {
    this.state = freshState();
    this.hero.setVisible(false);
  }

  /** The way to walk: the keys, else toward a pointer held on the field. */
  private moveInput() {
    const k = this.keys;
    let mx = (k.D.isDown || k.RIGHT.isDown ? 1 : 0) - (k.A.isDown || k.LEFT.isDown ? 1 : 0);
    let my = (k.S.isDown || k.DOWN.isDown ? 1 : 0) - (k.W.isDown || k.UP.isDown ? 1 : 0);
    if (mx || my) {
      const len = Math.hypot(mx, my);
      return { mx: mx / len, my: my / len };
    }
    const pointer = this.input.activePointer;
    if (this.walking && pointer.isDown) {
      const world = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      const p = this.state.player;
      const dx = world.x - p.x;
      const dy = world.y - p.y;
      const d = Math.hypot(dx, dy);
      if (d > 10) {
        // Full speed from 40 px out; closer, slower, so a tap just next to the hero nudges.
        const k2 = Math.min(1, d / 40) / d;
        mx = dx * k2;
        my = dy * k2;
      }
    } else this.walking = false;
    return { mx, my };
  }

  // -------------------------------------------------------------------------------------------
  // The frame

  update(_time: number, delta: number) {
    const s = this.state;
    if (s.phase === 'run') {
      const move = this.moveInput();
      tick(s, delta, { ...move, signature: this.sigQueued });
      this.sigQueued = false;
    }
    if (s.phase !== this.shownPhase || s.choices !== this.shownChoices) this.syncPanel();
    this.draw();
  }

  /** Shows the panel for the phase the run is in. */
  private syncPanel() {
    const s = this.state;
    this.panel?.destroy();
    this.panel = null;
    if ((s.phase === 'won' || s.phase === 'lost') && this.shownPhase !== s.phase) {
      this.progress = recordRun(s.hero!, s.time, s.phase === 'won');
    }
    if (s.phase === 'select') this.panel = heroSelect(this, this.progress);
    else if (s.phase === 'levelup') this.panel = levelUp(this, s);
    else if (s.phase === 'won' || s.phase === 'lost') this.panel = endScreen(this, s, this.progress);
    this.shownPhase = s.phase;
    this.shownChoices = s.choices;
    this.walking = false;
  }

  private draw() {
    const s = this.state;
    const p = s.player;
    const cam = this.cameras.main;
    cam.centerOn(p.x, p.y);
    this.drawGround(p.x, p.y);
    this.under.clear();
    this.over.clear();
    for (const pool of Object.values(this.pools)) pool.begin();
    if (s.hero) this.drawRun(s);
    for (const pool of Object.values(this.pools)) pool.end();
    this.drawHud(s);
  }

  /** The Dune world: a dark navy field, a faint grid and amber dune ridges, endless in every way. */
  private drawGround(cx: number, cy: number) {
    const g = this.ground;
    g.clear();
    const x0 = cx - VIEW.w / 2 - 40;
    const y0 = cy - VIEW.h / 2 - 40;
    const x1 = cx + VIEW.w / 2 + 40;
    const y1 = cy + VIEW.h / 2 + 40;
    const step = 48;
    g.lineStyle(1, 0x508cff, 0.07);
    for (let x = Math.floor(x0 / step) * step; x <= x1; x += step) g.lineBetween(x, y0, x, y1);
    for (let y = Math.floor(y0 / step) * step; y <= y1; y += step) g.lineBetween(x0, y, x1, y);
    const cell = 320;
    const dune = hex(C.dune);
    for (let gx = Math.floor(x0 / cell); gx <= Math.floor(x1 / cell); gx++) {
      for (let gy = Math.floor(y0 / cell); gy <= Math.floor(y1 / cell); gy++) {
        const bx = gx * cell;
        const by = gy * cell;
        // Two dune ridges per cell, as gentle waves.
        for (let k = 0; k < 2; k++) {
          const sx = bx + hash(gx, gy, k) * cell * 0.6;
          const sy = by + hash(gx, gy, k + 3) * cell;
          const len = 120 + hash(gx, gy, k + 5) * 140;
          const amp = 8 + hash(gx, gy, k + 7) * 14;
          g.lineStyle(2, dune, 0.09 + hash(gx, gy, k + 9) * 0.05);
          g.beginPath();
          for (let i = 0; i <= 12; i++) {
            const x = sx + (len * i) / 12;
            const y = sy + Math.sin((i / 12) * Math.PI * 1.6 + k) * amp;
            if (i === 0) g.moveTo(x, y);
            else g.lineTo(x, y);
          }
          g.strokePath();
        }
        // Sand specks and the odd rock.
        g.fillStyle(dune, 0.16);
        for (let k = 0; k < 6; k++) g.fillCircle(bx + hash(gx, gy, k + 11) * cell, by + hash(gx, gy, k + 17) * cell, 1.2);
        if (hash(gx, gy, 23) > 0.55) {
          const rx = bx + hash(gx, gy, 29) * cell;
          const ry = by + hash(gx, gy, 31) * cell;
          const rr = 8 + hash(gx, gy, 37) * 14;
          g.lineStyle(1.5, dune, 0.22);
          g.beginPath();
          for (let i = 0; i <= 6; i++) {
            const a = (i / 6) * Math.PI * 2;
            const k2 = 0.7 + hash(gx + i, gy, 41) * 0.4;
            const x = rx + Math.cos(a) * rr * k2;
            const y = ry + Math.sin(a) * rr * k2 * 0.7;
            if (i === 0) g.moveTo(x, y);
            else g.lineTo(x, y);
          }
          g.strokePath();
        }
      }
    }
  }

  private drawRun(s: GameState) {
    const p = s.player;
    const sch = schemeOf(s.hero!);
    const accent = hex(sch.accent);
    const u = this.under;
    const o = this.over;
    const still = settings.reduceMotion;
    const stats = statsOf(s);

    // Under everything: pickup reach, fire, cones, bomb markers and shadows.
    u.lineStyle(1, hex(C.shard), 0.08).strokeCircle(p.x, p.y, stats.pickup);
    for (const f of s.fires) {
      const k = Math.min(1, f.ms / 600);
      u.fillStyle(0xff7a2e, 0.18 * k).fillCircle(f.x, f.y, f.r);
      u.fillStyle(0xffd36b, 0.22 * k).fillCircle(f.x, f.y, f.r * 0.5);
    }
    const coneLen = suppressorLength(s);
    if (coneLen > 0) {
      const half = suppressorHalf(s);
      u.fillStyle(accent, 0.1);
      u.slice(p.x, p.y, coneLen, p.aim - half, p.aim + half, false).fillPath();
      u.lineStyle(1.5, accent, 0.35);
      u.slice(p.x, p.y, coneLen, p.aim - half, p.aim + half, false).strokePath();
    }
    for (const b of s.bombs) {
      const prog = 1 - b.ms / b.maxMs;
      const color = b.kind === 'crate' || b.kind === 'orbital' ? hex(C.heal) : 0xffb347;
      u.lineStyle(1.5, color, 0.25 + 0.4 * prog).strokeCircle(b.x, b.y, b.r);
      u.fillStyle(color, 0.06 + 0.1 * prog).fillCircle(b.x, b.y, b.r * prog);
    }

    // Pickups and shards.
    const pk = this.pools.pickups;
    for (const sh of s.shards) pk.next(sh.value >= 5 ? 'rb-shard-big' : 'rb-shard', sh.x, sh.y);
    for (const k of s.pickups) pk.next(k.kind === 'chest' ? 'rb-chest' : 'rb-medkit', k.x, k.y);
    for (const b of s.bombs) {
      if (b.kind === 'charge') pk.next('rb-charge', b.x, b.y);
      else if (b.kind === 'grenade' || b.kind === 'frag') {
        const t = 1 - b.ms / b.maxMs;
        const arc = Math.sin(Math.min(1, t * 1.4) * Math.PI) * 40;
        const k = Math.min(1, t * 1.4);
        pk.next('rb-grenade', b.fromX + (b.x - b.fromX) * k, b.fromY + (b.y - b.fromY) * k - arc).setScale(b.kind === 'frag' ? 1.4 : 1);
      } else if (b.kind === 'crate' || b.kind === 'orbital') {
        const t = b.ms / b.maxMs;
        pk.next(b.turret ? 'rb-sentry' : 'rb-crate', b.x, b.y - t * 260).setAlpha(1 - t * 0.5);
      }
    }

    // Droids.
    const en = this.pools.enemies;
    for (const e of s.enemies) {
      let key = 'rb-clanker';
      if (e.kind === 'boss') key = 'rb-boss';
      else if (e.kind === 'rollerbomb') key = `rb-roller${e.elite ? '-elite' : ''}${e.mode !== 'walk' ? '-armed' : ''}`;
      else if (e.elite) key = 'rb-clanker-elite';
      const im = en.next(key, e.x, e.y);
      if (e.kind === 'boss') im.setRotation(Math.atan2(p.y - e.y, p.x - e.x));
      else if (e.kind === 'rollerbomb' && e.mode === 'rush' && !still) im.setRotation(s.time / 80);
      if (e.flashMs > 0 && !still) im.setScale(1.15);
      if (e.stunMs > 0) im.setAlpha(0.6);
    }

    // Allies.
    const al = this.pools.allies;
    for (const a of s.allies) {
      const key = a.kind === 'trooper' ? 'rb-trooper' : a.kind === 'brother' ? 'rb-brother' : a.kind === 'sentry' ? 'rb-sentry' : 'rb-drone';
      const im = al.next(key, a.x, a.y);
      if (a.kind === 'trooper' || a.kind === 'brother') im.setOrigin(HERO_ORIGIN.x, HERO_ORIGIN.y).setFlipX(Math.cos(a.aim) < 0);
      else if (a.kind === 'sentry') {
        im.setFlipX(Math.cos(a.aim) < 0);
        if (a.lifeMs < 1500) im.setAlpha(0.5 + 0.5 * (a.lifeMs / 1500));
      }
    }

    // The hero, on its shadow.
    this.pools.pickups.next('rb-shadow', p.x, p.y + 27);
    const bob = p.moving && !still ? Math.sin(s.time / 90) * 1.5 : 0;
    const face = s.hero === 'bram' ? p.aim : p.moving ? p.facing : p.aim;
    this.hero.setPosition(p.x, p.y + bob).setFlipX(Math.cos(face) < 0).setAlpha(p.dashMs > 0 ? 0.6 : 1);

    // Bolts.
    const bo = this.pools.bolts;
    for (const b of s.bullets) {
      const im = bo.next(`rb-bolt-${b.color}`, b.x, b.y);
      im.setRotation(Math.atan2(b.vy, b.vx));
    }

    // Over everything: shields, blasts and rings.
    if (s.hero === 'tr9' && (s.ranks['riot-shield'] ?? 0) > 0) {
      const half = shieldHalf(s);
      o.lineStyle(5, accent, 0.25).beginPath().arc(p.x, p.y, HERO_R + 12, p.facing - half, p.facing + half).strokePath();
      o.lineStyle(2.5, accent, 0.9).beginPath().arc(p.x, p.y, HERO_R + 12, p.facing - half, p.facing + half).strokePath();
    }
    if (s.capstones.includes('phalanx')) {
      for (const spot of phalanxSpots(s)) {
        o.lineStyle(3, accent, 0.9).beginPath().arc(spot.x, spot.y, 14, spot.a - 1, spot.a + 1).strokePath();
      }
    }
    if (p.sigActiveMs > 0) {
      const color = s.hero === 'tr9' ? accent : hex(sch.bolt);
      o.lineStyle(6, color, 0.15).strokeCircle(p.x, p.y, 30);
      o.lineStyle(2, color, 0.8).strokeCircle(p.x, p.y, 30);
    }
    if (p.hurtMs > 0) o.lineStyle(2, hex(C.danger), (p.hurtMs / 450) * 0.8).strokeCircle(p.x, p.y, 24);
    for (const b of s.blasts) {
      const t = 1 - b.ms / b.maxMs;
      const r = b.r * (0.35 + 0.65 * Math.min(1, t * 1.6));
      const c = hex(b.color);
      o.fillStyle(c, 0.16 * (1 - t)).fillCircle(b.x, b.y, r);
      o.lineStyle(8, c, 0.18 * (1 - t)).strokeCircle(b.x, b.y, r);
      o.lineStyle(2.5, c, 0.9 * (1 - t)).strokeCircle(b.x, b.y, r);
    }

    // Floating words: unlocks, chests, the boss.
    s.pops.forEach((pop, i) => {
      let t = this.popTexts[i];
      if (!t) {
        t = this.add.text(0, 0, '', { fontFamily: FONT, fontSize: '15px', fontStyle: 'bold', color: '#ffffff' }).setOrigin(0.5).setDepth(DEPTH.pops);
        this.popTexts.push(t);
      }
      const age = 2200 - pop.ms;
      t.setText(pop.text).setColor(pop.color).setVisible(true);
      t.setPosition(p.x, p.y - 44 - i * 20 - (still ? 0 : age * 0.012)).setAlpha(Math.min(1, pop.ms / 400));
    });
    for (let i = s.pops.length; i < this.popTexts.length; i++) this.popTexts[i].setVisible(false);
  }

  private drawHud(s: GameState) {
    const g = this.hud;
    g.clear();
    const playing = s.hero !== null;
    for (const t of Object.values(this.texts)) t.setVisible(playing);
    if (!playing) return;
    const p = s.player;
    const sch = schemeOf(s.hero!);
    // XP across the top.
    g.fillStyle(0x0d1426, 0.9).fillRect(XP_BAR.x, XP_BAR.y, XP_BAR.w, XP_BAR.h);
    g.fillStyle(hex(C.xp), 1).fillRect(XP_BAR.x, XP_BAR.y, XP_BAR.w * Math.min(1, s.xp / s.xpNext), XP_BAR.h);
    // Health.
    const hpK = Math.max(0, p.hp / p.maxHp);
    g.fillStyle(0x0d1426, 0.85).fillRoundedRect(HP_BAR.x - 2, HP_BAR.y - 2, HP_BAR.w + 4, HP_BAR.h + 4, 4);
    g.fillStyle(hpK > 0.35 ? hex(C.hp) : hex(C.danger), 1).fillRoundedRect(HP_BAR.x, HP_BAR.y, Math.max(2, HP_BAR.w * hpK), HP_BAR.h, 3);
    g.lineStyle(1, hex(C.hp), 0.5).strokeRoundedRect(HP_BAR.x - 2, HP_BAR.y - 2, HP_BAR.w + 4, HP_BAR.h + 4, 4);
    this.texts.hp.setText(`${Math.ceil(p.hp)} / ${p.maxHp}   ·   ${s.kills} droids`);
    // The kit held.
    const lines = Object.entries(s.ranks).map(([id, rank]) => {
      const pips = '●'.repeat(rank) + '○'.repeat(MAX_TIER - rank);
      return `${pips}  ${UPGRADES[id].name}`;
    });
    this.texts.kit.setText(lines.join('\n'));
    if (lines.length) {
      const b = this.texts.kit.getBounds();
      g.fillStyle(0x070b16, 0.6).fillRoundedRect(KIT.x - 6, KIT.y - 4, b.width + 12, b.height + 8, 6);
    }
    // Clock and level.
    const boss = s.enemies.find((e) => e.kind === 'boss');
    this.texts.timer.setText(s.bossSpawned ? 'BOSS' : clock(Math.min(s.time, RUN_MS))).setColor(s.bossSpawned ? C.boss : C.text);
    this.texts.level.setText(`LV ${s.level}`);
    this.texts.boss.setVisible(!!boss);
    if (boss) {
      this.texts.boss.setText('GRINDER CRAWLER');
      g.fillStyle(0x0d1426, 0.9).fillRect(BOSS_BAR.x, BOSS_BAR.y, BOSS_BAR.w, BOSS_BAR.h);
      g.fillStyle(hex(C.boss), 1).fillRect(BOSS_BAR.x, BOSS_BAR.y, BOSS_BAR.w * Math.max(0, boss.hp / boss.maxHp), BOSS_BAR.h);
      g.lineStyle(1, hex(C.boss), 0.6).strokeRect(BOSS_BAR.x, BOSS_BAR.y, BOSS_BAR.w, BOSS_BAR.h);
    }
    // The signature button: a ring that fills as it charges.
    const hero = HEROES[s.hero!];
    const accent = hex(sch.accent);
    const total = hero.signature.cooldownMs * statsOf(s).cooldown;
    const charge = 1 - Math.min(1, p.sigMs / total);
    const ready = p.sigMs <= 0;
    const { x, y, r } = SIG_BUTTON;
    g.fillStyle(0x0d1426, 0.8).fillCircle(x, y, r);
    g.lineStyle(4, 0x2a3550, 1).strokeCircle(x, y, r - 4);
    g.lineStyle(4, accent, ready ? 1 : 0.7).beginPath().arc(x, y, r - 4, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * charge).strokePath();
    if (ready) g.lineStyle(10, accent, 0.18).strokeCircle(x, y, r - 2);
    this.texts.sig.setText(hero.signature.name).setColor(ready ? C.text : C.muted);
    this.texts.sigKey.setText(ready ? 'SPACE' : `${Math.ceil(p.sigMs / 1000)} s`);
  }

  /** The hero's position on screen (always the middle of the view), for the test. */
  get heroOnScreen() {
    return { ...CENTER };
  }
}
