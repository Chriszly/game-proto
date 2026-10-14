import Phaser from 'phaser';
import { settings } from '../../../../shared/settings';
import { Backdrop, type BackdropInfo } from '../art/backdrop';
import { bakeComic } from '../art/comic';
import { bakeNightVision } from '../art/nightvision';
import { GEOM, HI, num, tex, type SpriteName } from '../art/paint';
import { THEMES, UPGRADE_COLORS, type Theme } from '../art/theme';
import { Pool } from '../game/pool';
import {
  BASE_STATS,
  BREAK_MS,
  BULLET,
  DRUM,
  ENEMIES,
  FRENZY,
  HERO,
  HUD_HEIGHT,
  MAX_COMPANIONS,
  PICKUP,
  REACH_Y,
  SPAWN_Y,
  SQUAD_SLOTS,
  UPGRADE_KINDS,
  UPGRADES,
  VIEW,
  applyUpgrade,
  blastDamage,
  isBossWave,
  planWave,
  waveTotal,
  type EnemyKind,
  type Spawn,
  type Stats,
  type UpgradeKind,
} from '../game/rules';
import { loadBest, loadStyle, saveBest, saveStyle, type ArtStyle } from '../game/save';
import { HUD_DEPTH, Hud } from './Hud';

const DEPTH = {
  ground: 0, sandbags: 5, splats: 8, ringUnder: 9, drums: 10, pickups: 11, enemies: 20, hero: 40,
  bullets: 45, muzzle: 46, fx: 47, bars: 50, overlay: 90, labels: 92, pops: 95, hud: HUD_DEPTH,
};
/** How long a fallen enemy's splat stays on the road, in ms. */
const SPLAT_MS = 900;
/** One BLAM! lettered over the squad every this many volleys (comic only). */
const BLAM_EVERY = 6;
/** A SPLUT! on every this many kills (comic only). */
const SPLUT_EVERY = 4;

interface Enemy {
  alive: boolean;
  id: number;
  kind: EnemyKind;
  hp: number;
  maxHp: number;
  x: number;
  y: number;
  /** Inside a fuel drum's blast ring this frame. */
  inBlast: boolean;
  sprite: Phaser.GameObjects.Image;
}

interface Pickup {
  alive: boolean;
  id: number;
  upgrade: UpgradeKind;
  hp: number;
  maxHp: number;
  x: number;
  y: number;
  sprite: Phaser.GameObjects.Image;
  label: Phaser.GameObjects.Image;
  hpText: Phaser.GameObjects.Text;
}

interface Drum {
  alive: boolean;
  id: number;
  hp: number;
  maxHp: number;
  x: number;
  y: number;
  /** How many zombies its blast would catch right now. */
  caught: number;
  sprite: Phaser.GameObjects.Image;
  ring: Phaser.GameObjects.Image;
  label: Phaser.GameObjects.Text;
}

interface Bullet {
  alive: boolean;
  x: number;
  y: number;
  /** Where it was last frame: hits are tested along the whole stretch it moved. */
  prevY: number;
  /** Targets it can still hit, and the ids of those it already went through. */
  hitsLeft: number;
  hit: number[];
  sprite: Phaser.GameObjects.Image;
}

interface Splat {
  alive: boolean;
  age: number;
  sprite: Phaser.GameObjects.Image;
}

/** A short-lived effect: a muzzle flash, a blast, a lettered sound, a streak burst or a hit number. */
interface Fx {
  alive: boolean;
  age: number;
  life: number;
  /** Rise speed in px/s, and how much it grows over its life. */
  rise: number;
  grow: number;
  baseScale: number;
  sprite: Phaser.GameObjects.Image;
  text: Phaser.GameObjects.Text;
}

/** What the game is doing: fighting a wave, the pause after one, or overrun. */
export type Phase = 'wave' | 'break' | 'over';

export interface GameState {
  wave: number;
  phase: Phase;
  kills: number;
  stats: Stats;
  /** How many of each pickup the hero has collected. */
  collected: Record<UpgradeKind, number>;
  /** The highest wave any run has reached (saved under `deadline-best`). */
  best: number;
  /** Zombies of this wave down so far, out of `waveTotal`. */
  fallen: number;
  waveTotal: number;
  /** Kills in quick succession, and the frenzy time left (0 when none runs). */
  streak: number;
  frenzyMs: number;
  frenzies: number;
  /** Fuel drums shot this run, and what the last one did. */
  drumsBlown: number;
  lastBlast: { caught: number; killed: number } | null;
}

export class GameScene extends Phaser.Scene {
  state!: GameState;
  player!: Phaser.GameObjects.Image;
  /** Where on the line the hero is walking to after a tap or drag, or null when standing. */
  pointerTarget: number | null = null;
  /** The companions at the hero's side, in the order of their `SQUAD_SLOTS` after the hero's. */
  squad: Phaser.GameObjects.Image[] = [];
  /** The art style the game is drawn in. */
  style: ArtStyle = 'comic';

  private enemies!: Pool<Enemy>;
  private pickups!: Pool<Pickup>;
  private drums!: Pool<Drum>;
  private bullets!: Pool<Bullet>;
  private splats!: Pool<Splat>;
  private fx!: Pool<Fx>;
  private nextId = 1;
  private plan: Spawn[] = [];
  private waveClock = 0;
  private fireClock = 0;
  private breakClock = 0;
  private sinceKill = Infinity;
  private volleys = 0;
  private runMs = 0;
  private bestAtStart = 0;
  private lastSecond = -1;

  /** Every image and the sprite it shows, so a style switch can swap all their textures. */
  private skins = new Map<Phaser.GameObjects.Image | Phaser.GameObjects.TileSprite, string>();
  private scan!: Phaser.GameObjects.Image;
  private grain!: Phaser.GameObjects.TileSprite;
  private bars!: Phaser.GameObjects.Graphics;
  private marks!: Phaser.GameObjects.Graphics;
  private hud!: Hud;
  private banner!: Phaser.GameObjects.Text;
  private overText: Phaser.GameObjects.GameObject[] = [];
  private keys!: { left: Phaser.Input.Keyboard.Key[]; right: Phaser.Input.Keyboard.Key[] };
  private static backdrop: Backdrop | null = null;

  constructor() {
    super('Game');
  }

  create() {
    this.bestAtStart = loadBest();
    this.state = {
      wave: 0,
      phase: 'wave',
      kills: 0,
      stats: { ...BASE_STATS },
      collected: Object.fromEntries(UPGRADE_KINDS.map((k) => [k, 0])) as Record<UpgradeKind, number>,
      best: this.bestAtStart,
      fallen: 0,
      waveTotal: 0,
      streak: 0,
      frenzyMs: 0,
      frenzies: 0,
      drumsBlown: 0,
      lastBlast: null,
    };
    this.pointerTarget = null;
    this.nextId = 1;
    this.fireClock = 0;
    this.sinceKill = Infinity;
    this.volleys = 0;
    this.runMs = 0;
    this.lastSecond = -1;
    this.squad = [];
    this.overText = [];
    this.skins.clear();
    this.style = loadStyle();
    this.bakeStyle(this.style);
    GameScene.backdrop ??= new Backdrop(() => this.game.canvas);

    this.skin(this.add.image(0, 0, '__DEFAULT'), 'ground').setDepth(DEPTH.ground);
    // Sandbags mark the hero's line: an enemy that gets to them has reached the hero.
    this.skin(this.add.image(0, REACH_Y, '__DEFAULT'), 'sandbags').setDepth(DEPTH.sandbags);
    // The hero's x is where their rifle is, so the bullets go up from under the spot that was tapped.
    this.player = this.skin(this.add.image(VIEW.w / 2, HERO.y, '__DEFAULT'), 'hero').setDepth(this.squadDepth(0));
    this.bars = this.add.graphics().setDepth(DEPTH.bars);
    this.marks = this.add.graphics().setDepth(DEPTH.labels);
    // The night-vision feed's scanlines and grain, over the picture but under its amber overlay.
    this.scan = this.add.image(0, 0, '__DEFAULT').setOrigin(0).setDepth(DEPTH.overlay);
    this.grain = this.add.tileSprite(0, 0, VIEW.w, VIEW.h, '__DEFAULT').setOrigin(0).setDepth(DEPTH.overlay + 1);

    const text = (depth: number) => this.add.text(0, 0, '', { resolution: 2 }).setOrigin(0.5).setDepth(depth).setVisible(false);
    this.enemies = new Pool<Enemy>(
      () => ({ alive: false, id: 0, kind: 'grunt', hp: 0, maxHp: 0, x: 0, y: 0, inBlast: false, sprite: this.add.image(0, 0, '__DEFAULT') }),
      (e) => e.sprite.setVisible(false),
    );
    this.pickups = new Pool<Pickup>(
      () => ({
        alive: false, id: 0, upgrade: 'rate', hp: 0, maxHp: 0, x: 0, y: 0,
        sprite: this.add.image(0, 0, '__DEFAULT').setDepth(DEPTH.pickups),
        label: this.add.image(0, 0, '__DEFAULT').setDepth(DEPTH.labels),
        hpText: text(DEPTH.labels),
      }),
      (p) => [p.sprite, p.label, p.hpText].forEach((o) => o.setVisible(false)),
    );
    this.drums = new Pool<Drum>(
      () => ({
        alive: false, id: 0, hp: 0, maxHp: 0, x: 0, y: 0, caught: 0,
        sprite: this.skin(this.add.image(0, 0, '__DEFAULT'), 'drum').setDepth(DEPTH.drums),
        ring: this.skin(this.add.image(0, 0, '__DEFAULT'), 'ring'),
        label: text(DEPTH.labels),
      }),
      (d) => [d.sprite, d.ring, d.label].forEach((o) => o.setVisible(false)),
    );
    this.bullets = new Pool<Bullet>(
      () => ({ alive: false, x: 0, y: 0, prevY: 0, hitsLeft: 0, hit: [], sprite: this.skin(this.add.image(0, 0, '__DEFAULT'), 'bullet').setDepth(DEPTH.bullets) }),
      (b) => b.sprite.setVisible(false),
    );
    this.splats = new Pool<Splat>(
      () => ({ alive: false, age: 0, sprite: this.skin(this.add.image(0, 0, '__DEFAULT'), 'splat').setDepth(DEPTH.splats) }),
      (s) => s.sprite.setVisible(false),
    );
    this.fx = new Pool<Fx>(
      () => ({ alive: false, age: 0, life: 0, rise: 0, grow: 0, baseScale: 1, sprite: this.add.image(0, 0, '__DEFAULT').setDepth(DEPTH.fx), text: text(DEPTH.pops) }),
      (f) => {
        f.sprite.setVisible(false);
        f.text.setVisible(false);
      },
    );

    this.hud = new Hud(this);
    this.banner = this.add.text(VIEW.w / 2, VIEW.h * 0.38, '', { resolution: 2, align: 'center' }).setOrigin(0.5).setDepth(DEPTH.hud).setAlpha(0);
    this.createInput();
    this.applyStyle();
    this.startWave(1);
  }

  /** The enemies in play, for the playthrough test. */
  liveEnemies() {
    return this.enemies.live().map(({ id, kind, hp, maxHp, x, y }) => ({ id, kind, hp, maxHp, x, y }));
  }

  /** The pickups in play: what they give, how many hits are left to open them and where they are. */
  livePickups() {
    return this.pickups.live().map(({ id, upgrade, hp, maxHp, x, y }) => ({ id, upgrade, hp, maxHp, x, y }));
  }

  /** The fuel drums on the road: hits left, where they are and how many zombies their blast would catch. */
  liveDrums() {
    return this.drums.live().map(({ id, hp, maxHp, x, y, caught }) => ({ id, hp, maxHp, x, y, caught }));
  }

  /** How many enemies of the wave have yet to come in. */
  enemiesToCome() {
    return this.plan.filter((s) => s.type === 'enemy').length;
  }

  // ---------- Art styles ----------

  /** Bakes a style's textures, once: the comic at boot, night vision the first time it is shown. */
  private bakeStyle(style: ArtStyle) {
    if (this.textures.exists(tex(style, 'ground'))) return;
    if (style === 'comic') bakeComic(this);
    else bakeNightVision(this);
  }

  /** Shows an image as one of the style's sprites and remembers it, so a switch can swap it. */
  private skin<T extends Phaser.GameObjects.Image>(img: T, name: string): T {
    this.skins.set(img, name);
    const geom = GEOM[(name.split('-')[0] in GEOM ? name.split('-')[0] : name) as SpriteName];
    img.setTexture(tex(this.style, name)).setOrigin(geom.ox / geom.w, geom.oy / geom.h).setScale(geom.w / img.frame.width);
    return img;
  }

  /** Switches between the comic and the night-vision feed, and saves the choice. */
  switchStyle() {
    this.style = this.style === 'comic' ? 'nv' : 'comic';
    saveStyle(this.style);
    this.bakeStyle(this.style);
    this.applyStyle();
  }

  private applyStyle() {
    const nv = this.style === 'nv', th = this.theme();
    for (const [img, name] of this.skins) {
      const geom = GEOM[(name.split('-')[0] in GEOM ? name.split('-')[0] : name) as SpriteName];
      img.setTexture(tex(this.style, name)).setOrigin(geom.ox / geom.w, geom.oy / geom.h);
    }
    this.scan.setTexture(nv ? tex('nv', 'scan') : '__DEFAULT').setVisible(nv);
    if (nv) this.grain.setTexture(tex('nv', 'grain')).setTileScale(1 / HI);
    this.grain.setVisible(nv).setAlpha(0.9);
    // In the comic the blast ring is painted on the road under the horde; in night vision it is
    // part of the overlay, over the scanlines.
    for (const d of this.drums.all) d.ring.setDepth(nv ? DEPTH.labels - 1 : DEPTH.ringUnder);
    for (const p of this.pickups.all) this.styleCrateText(p.hpText);
    for (const d of this.drums.all) this.styleDrumLabel(d.label);
    for (const f of this.fx.all) if (f.alive) this.fx.release(f);
    this.font(this.banner, 40, nv ? th.accent : '#ffe04a', nv ? { glow: th.accent } : { stroke: th.ink, sw: 8 });
    for (const t of this.overText) t.destroy();
    this.overText = [];
    if (this.state.phase === 'over') this.showGameOver();
    this.hud.setStyle(this.style);
    GameScene.backdrop?.setStyle(this.style);
    this.refreshBackdrop();
  }

  private theme(): Theme {
    return THEMES[this.style];
  }

  private font(t: Phaser.GameObjects.Text, size: number, color: string, o: { stroke?: string; sw?: number; glow?: string } = {}) {
    const th = this.theme();
    t.setFontFamily(th.font).setFontSize(`${size}px`).setFontStyle(th.fontStyle).setColor(color);
    t.setStroke(o.stroke ?? '#000000', o.stroke ? (o.sw ?? 3) : 0);
    if (o.glow) t.setShadow(0, 0, o.glow, 6, false, true);
    else t.setShadow(0, 0, '#000000', 0, false, false);
    return t;
  }

  private styleCrateText(t: Phaser.GameObjects.Text) {
    if (this.style === 'comic') this.font(t, 12, THEMES.comic.ink);
    else this.font(t, 13, '#ffffff', { glow: '#ffffff' });
  }

  private styleDrumLabel(t: Phaser.GameObjects.Text) {
    if (this.style === 'comic') this.font(t, 10, '#c03a1a');
    else this.font(t, 10, THEMES.nv.accent, { glow: THEMES.nv.accent });
  }

  // ---------- Input and waves ----------

  private createInput() {
    const kb = this.input.keyboard!;
    const K = Phaser.Input.Keyboard.KeyCodes;
    this.keys = {
      left: [kb.addKey(K.LEFT), kb.addKey(K.A)],
      right: [kb.addKey(K.RIGHT), kb.addKey(K.D)],
    };
    // V switches the art style, like the switch in the top bar.
    kb.addKey(K.V).on('down', () => this.switchStyle());
    // Tap or drag anywhere: the hero walks along their line to below that spot.
    const aim = (p: Phaser.Input.Pointer) => {
      if (this.state.phase === 'over') return;
      const [minX, maxX] = this.heroRange();
      this.pointerTarget = Phaser.Math.Clamp(p.worldX, minX, maxX);
    };
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.hud.onSwitch(p.worldX, p.worldY)) this.switchStyle();
      else if (this.state.phase === 'over') this.scene.restart();
      else aim(p);
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => p.isDown && !this.hud.onSwitch(p.downX, p.downY) && aim(p));
  }

  private startWave(wave: number) {
    this.state.wave = wave;
    this.state.phase = 'wave';
    this.state.fallen = 0;
    this.state.waveTotal = waveTotal(wave);
    this.plan = planWave(wave);
    this.waveClock = 0;
    if (wave > this.state.best) {
      this.state.best = wave;
      saveBest(wave);
    }
    this.showBanner(isBossWave(wave) ? `WAVE ${wave}\nBOSS INCOMING!` : isBossWave(wave + 1) ? `WAVE ${wave}\nBOSS NEXT WAVE` : `WAVE ${wave}`);
    this.refreshBackdrop();
  }

  private showBanner(text: string) {
    this.tweens.killTweensOf(this.banner);
    this.banner.setText(text).setAlpha(1);
    this.tweens.add({ targets: this.banner, alpha: 0, delay: 1200, duration: 400 });
  }

  update(_time: number, delta: number) {
    const dt = Math.min(delta, 100);
    this.animateFeed();
    if (this.state.phase === 'over') return;
    this.runMs += dt;
    this.moveHero(dt);
    this.spawn(dt);
    this.fire(dt);
    this.moveBullets(dt);
    if (this.moveEnemies(dt)) return;
    this.movePickups(dt);
    this.moveDrums(dt);
    this.hitTargets();
    this.tickFrenzy(dt);
    this.ageEffects(dt);
    this.checkWave(dt);
    this.drawBars();
    this.updateHud();
    const second = Math.floor(this.runMs / 1000);
    if (second !== this.lastSecond) {
      this.lastSecond = second;
      this.refreshBackdrop();
    }
  }

  /** The night-vision grain crawls and the feed flickers; both hold still with reduced motion. */
  private animateFeed() {
    if (this.style !== 'nv' || settings.reduceMotion) return;
    const f = this.game.loop.frame;
    this.grain.setTilePosition((f * 37) % 128, (f * 53) % 128);
    this.grain.setAlpha(0.75 + 0.25 * Math.abs(Math.sin(f * 0.7)));
    this.scan.setAlpha(0.92 + 0.08 * Math.sin(f * 1.3));
  }

  /**
   * How far left and right the hero can go: as far as `HERO.minX..HERO.maxX` allows for every rifle
   * in the squad, so companions never walk off the road or bunch up against its edge.
   */
  private heroRange(): [number, number] {
    const slots = SQUAD_SLOTS.slice(0, 1 + this.squad.length);
    return [HERO.minX - Math.min(...slots.map((s) => s.dx)), HERO.maxX - Math.max(...slots.map((s) => s.dx))];
  }

  /** Rows further back draw on top of the ones ahead of them, as they are closer to the camera. */
  private squadDepth(slot: number) {
    return DEPTH.hero + SQUAD_SLOTS[slot].dy / 100;
  }

  private moveHero(dt: number) {
    const left = this.keys.left.some((k) => k.isDown), right = this.keys.right.some((k) => k.isDown);
    const step = (HERO.speed * dt) / 1000;
    const [minX, maxX] = this.heroRange();
    if (this.pointerTarget !== null) this.pointerTarget = Phaser.Math.Clamp(this.pointerTarget, minX, maxX);
    if (left !== right) {
      this.pointerTarget = null;
      this.player.x += left ? -step : step;
    } else if (this.pointerTarget !== null) {
      const dx = this.pointerTarget - this.player.x;
      if (Math.abs(dx) <= step) {
        this.player.x = this.pointerTarget;
        this.pointerTarget = null;
      } else this.player.x += Math.sign(dx) * step;
    }
    this.player.x = Phaser.Math.Clamp(this.player.x, minX, maxX);
    this.squad.forEach((c, i) => c.setPosition(this.player.x + SQUAD_SLOTS[i + 1].dx, HERO.y + SQUAD_SLOTS[i + 1].dy));
  }

  private spawn(dt: number) {
    if (this.state.phase !== 'wave') return;
    this.waveClock += dt;
    while (this.plan.length && this.plan[0].at <= this.waveClock) {
      const s = this.plan.shift()!;
      if (s.type === 'enemy') {
        const e = this.enemies.take();
        Object.assign(e, { id: this.nextId++, kind: s.kind, hp: s.hp, maxHp: s.hp, x: s.x, y: SPAWN_Y, inBlast: false });
        this.skin(e.sprite, s.kind).setPosition(e.x, e.y).setVisible(true);
      } else if (s.type === 'pickup') {
        // Once every slot in the squad is filled, a companion crate brings extra damage instead.
        const upgrade = s.upgrade === 'companion' && this.state.stats.companions >= MAX_COMPANIONS ? 'damage' : s.upgrade;
        const p = this.pickups.take();
        Object.assign(p, { id: this.nextId++, upgrade, hp: s.hp, maxHp: s.hp, x: s.x, y: SPAWN_Y });
        this.skin(p.sprite, `crate-${upgrade}`).setVisible(true);
        this.skin(p.label, `label-${upgrade}`).setVisible(true);
        this.styleCrateText(p.hpText);
        p.hpText.setVisible(true);
      } else {
        const d = this.drums.take();
        Object.assign(d, { id: this.nextId++, hp: s.hp, maxHp: s.hp, x: s.x, y: SPAWN_Y, caught: 0 });
        d.ring.setDepth(this.style === 'nv' ? DEPTH.labels - 1 : DEPTH.ringUnder);
        this.styleDrumLabel(d.label);
        [d.sprite, d.ring, d.label].forEach((o) => o.setVisible(true));
      }
    }
  }

  /**
   * Fires a volley straight up every so often: one bullet from the hero and from each companion.
   * A frenzy fires `FRENZY.rate` times as fast.
   */
  private fire(dt: number) {
    this.fireClock += dt;
    const { pierce } = this.state.stats;
    const interval = this.state.stats.fireInterval / (this.state.frenzyMs > 0 ? FRENZY.rate : 1);
    while (this.fireClock >= interval) {
      this.fireClock -= interval;
      this.volleys++;
      for (let i = 0; i <= this.squad.length; i++) {
        const b = this.bullets.take();
        b.x = this.player.x + SQUAD_SLOTS[i].dx;
        b.y = b.prevY = HERO.y + SQUAD_SLOTS[i].dy - 30;
        b.hitsLeft = 1 + pierce;
        b.hit.length = 0;
        b.sprite.setPosition(b.x, b.y).setVisible(true);
        this.effect('muzzle', b.x, b.y, { life: 70 });
      }
      if (this.style === 'comic' && this.volleys % BLAM_EVERY === 0) {
        const side = (this.volleys / BLAM_EVERY) % 2 ? -1 : 1;
        const x = Phaser.Math.Clamp(this.player.x + side * 110, 110, VIEW.w - 110);
        this.effect('sfx-blam', x, REACH_Y - 50 - (this.volleys % 3) * 8, { life: 380, grow: 0.15, angle: side * 7 });
      }
    }
  }

  private moveBullets(dt: number) {
    for (const b of this.bullets.all) {
      if (!b.alive) continue;
      b.prevY = b.y;
      b.y -= (BULLET.speed * dt) / 1000;
      if (b.y < HUD_HEIGHT - 10) this.bullets.release(b);
      else b.sprite.y = b.y;
    }
  }

  /**
   * The horde walks down, each one veering towards the hero. Each aims a little to one side, so they
   * come as a crowd rather than in single file. Reaching the hero's line ends the game (and
   * returns true, so the rest of the frame is skipped).
   */
  private moveEnemies(dt: number): boolean {
    for (const e of this.enemies.all) {
      if (!e.alive) continue;
      const { speed, steer } = ENEMIES[e.kind];
      e.y += (speed * dt) / 1000;
      const aside = e.kind === 'boss' ? 0 : ((e.id * 53) % 81) - 40;
      const dx = this.player.x + aside - e.x, maxStep = (steer * dt) / 1000;
      e.x += Phaser.Math.Clamp(dx, -maxStep, maxStep);
      // A little shamble from side to side, the same for every frame rate (none when motion is reduced).
      const sway = settings.reduceMotion ? 0 : Math.sin((e.y + e.id * 37) / 9) * 1.5;
      e.sprite.setPosition(e.x + sway, e.y).setDepth(DEPTH.enemies + e.y / VIEW.h);
      if (e.y + ENEMIES[e.kind].radius >= REACH_Y) {
        this.gameOver();
        return true;
      }
    }
    return false;
  }

  private movePickups(dt: number) {
    for (const p of this.pickups.all) {
      if (!p.alive) continue;
      p.y += (PICKUP.speed * dt) / 1000;
      // A pickup nobody opened is lost behind the sandbags.
      if (p.y - PICKUP.halfSize > REACH_Y) {
        this.pickups.release(p);
        continue;
      }
      p.sprite.setPosition(p.x, p.y);
      p.label.setPosition(p.x, p.y + PICKUP.halfSize + 2);
      p.hpText.setPosition(p.x - (this.style === 'nv' ? 4 : 0), p.y - (this.style === 'nv' ? 1 : 10)).setText(String(p.hp));
    }
  }

  /** Zombies inside a drum's blast ring, by distance from the drum's centre. */
  private inBlast(d: { x: number; y: number }) {
    return this.enemies.all.filter((e) => e.alive && Math.hypot(e.x - d.x, e.y - d.y) <= DRUM.blastRadius);
  }

  /** Drums roll down; each one's ring and label preview how many zombies its blast would catch. */
  private moveDrums(dt: number) {
    for (const e of this.enemies.all) e.inBlast = false;
    for (const d of this.drums.all) {
      if (!d.alive) continue;
      d.y += (DRUM.speed * dt) / 1000;
      if (d.y - DRUM.halfSize > REACH_Y) {
        this.drums.release(d);
        continue;
      }
      const caught = this.inBlast(d);
      caught.forEach((e) => (e.inBlast = true));
      d.caught = caught.length;
      d.sprite.setPosition(d.x, d.y);
      d.ring.setPosition(d.x, d.y);
      const text = this.style === 'comic' ? `${d.caught} IN THE BLAST!` : `FUEL · ${d.caught} IN BLAST`;
      if (d.label.text !== text) d.label.setText(text);
      if (this.style === 'comic') d.label.setPosition(d.x, d.y - 33);
      else d.label.setPosition(d.x + 38, d.y + 30);
    }
  }

  private hitTargets() {
    const damage = this.state.stats.damage;
    for (const b of this.bullets.all) {
      if (!b.alive) continue;
      // Swept along the stretch from prevY up to y, so a long frame can't carry a bullet through a
      // target; the nearest ones (largest y) are hit first.
      const hits = this.enemies.all.filter((e) => {
        if (!e.alive || b.hit.includes(e.id)) return false;
        const r = ENEMIES[e.kind].radius + BULLET.radius;
        const nearY = Phaser.Math.Clamp(e.y, b.y, b.prevY);
        return (b.x - e.x) ** 2 + (nearY - e.y) ** 2 <= r * r;
      });
      hits.sort((a, c) => c.y - a.y);
      for (const e of hits) {
        b.hit.push(e.id);
        this.hurt(e, damage);
        if (--b.hitsLeft <= 0) break;
      }
      if (b.hitsLeft <= 0) {
        this.bullets.release(b);
        continue;
      }
      // Then the drums and crates in its way, square hit boxes.
      const boxes: (Drum | Pickup)[] = [...this.drums.all, ...this.pickups.all];
      for (const t of boxes) {
        if (!t.alive || b.hit.includes(t.id)) continue;
        const reach = ('upgrade' in t ? PICKUP.halfSize : DRUM.halfSize) + BULLET.radius;
        if (Math.abs(b.x - t.x) > reach || b.y > t.y + reach || b.prevY < t.y - reach) continue;
        b.hit.push(t.id);
        t.hp -= damage;
        if (t.hp <= 0) {
          if ('upgrade' in t) this.collect(t);
          else this.explode(t);
        }
        if (--b.hitsLeft <= 0) break;
      }
      if (b.hitsLeft <= 0) this.bullets.release(b);
    }
  }

  /** Takes hit points off an enemy, with a little damage number, and kills it at 0. */
  private hurt(e: Enemy, damage: number) {
    e.hp -= damage;
    const r = ENEMIES[e.kind].radius;
    this.effect('', e.x + r * 0.8 + 4, e.y - r * 0.4, { life: 520, rise: 36, text: `-${damage}` });
    if (e.hp <= 0) this.kill(e);
  }

  private kill(e: Enemy) {
    this.state.kills++;
    this.state.fallen++;
    // Kills close together build the streak; a full streak sets off a frenzy.
    this.state.streak = this.sinceKill <= FRENZY.gapMs || this.state.frenzyMs > 0 ? this.state.streak + 1 : 1;
    this.sinceKill = 0;
    if (this.state.streak >= FRENZY.kills && this.state.frenzyMs === 0) {
      this.state.frenzyMs = FRENZY.ms;
      this.state.frenzies++;
      this.showBanner(this.style === 'comic' ? 'FRENZY!\nDOUBLE FIRE!' : 'FRENZY\n2X FIRE');
    }
    const n = this.state.streak;
    if (n >= 3 && n % 3 === 0) this.effect('streak', e.x + 12, e.y + 2, { life: 700, text: `x${n}`, grow: 0.1 });
    const s = this.splats.take();
    s.age = 0;
    s.sprite.setPosition(e.x, e.y).setScale((e.kind === 'boss' ? 3 : e.kind === 'brute' ? 1.6 : 1) / HI).setAlpha(1).setVisible(true);
    if (this.style === 'comic' && this.state.kills % SPLUT_EVERY === 0) this.effect('sfx-splut', e.x - 30, e.y + 10, { life: 450, grow: 0.1, angle: -5 });
    this.enemies.release(e);
  }

  /** A fuel drum goes up: every zombie in its ring takes the blast. */
  private explode(d: Drum) {
    const caught = this.inBlast(d), dmg = blastDamage(this.state.wave);
    let killed = 0;
    for (const e of caught) {
      this.hurt(e, dmg);
      if (!e.alive) killed++;
    }
    this.state.drumsBlown++;
    this.state.lastBlast = { caught: caught.length, killed };
    // The blast swells out, or with reduced motion just shows at full size and fades.
    this.effect('blast', d.x, d.y, settings.reduceMotion ? { life: 520, baseScale: 0.8 } : { life: 520, grow: 0.5, baseScale: 0.55 });
    if (this.style === 'comic') this.effect('sfx-boom', d.x, d.y - 40, { life: 700, grow: 0.2 });
    this.drums.release(d);
  }

  private collect(p: Pickup) {
    // A companion crate that was already falling when the squad filled up brings damage instead.
    const upgrade = p.upgrade === 'companion' && this.state.stats.companions >= MAX_COMPANIONS ? 'damage' : p.upgrade;
    this.state.stats = applyUpgrade(this.state.stats, upgrade);
    this.state.collected[upgrade]++;
    if (upgrade === 'companion') this.addCompanions();
    const pop = this.add.text(this.player.x, HERO.y - 50, UPGRADES[upgrade].label.toUpperCase(), { resolution: 2 }).setOrigin(0.5).setDepth(DEPTH.hud);
    if (this.style === 'comic') this.font(pop, 18, UPGRADE_COLORS[upgrade], { stroke: THEMES.comic.ink, sw: 5 });
    else this.font(pop, 16, UPGRADE_COLORS[upgrade], { glow: UPGRADE_COLORS[upgrade] });
    this.tweens.add({ targets: pop, y: pop.y - 60, alpha: 0, duration: 1200, onComplete: () => pop.destroy() });
    this.pickups.release(p);
    this.refreshBackdrop();
  }

  /** Brings in companions until the squad matches the stats, each in the next free slot. */
  private addCompanions() {
    while (this.squad.length < this.state.stats.companions) {
      const slot = SQUAD_SLOTS[this.squad.length + 1];
      const c = this.skin(this.add.image(this.player.x + slot.dx, HERO.y + slot.dy, '__DEFAULT'), 'companion').setDepth(this.squadDepth(this.squad.length + 1));
      this.squad.push(c);
    }
    // A companion that joins near the road's edge pushes the squad back onto it.
    const [minX, maxX] = this.heroRange();
    this.player.x = Phaser.Math.Clamp(this.player.x, minX, maxX);
  }

  private tickFrenzy(dt: number) {
    this.sinceKill += dt;
    if (this.state.frenzyMs > 0) {
      this.state.frenzyMs = Math.max(0, this.state.frenzyMs - dt);
      if (this.state.frenzyMs === 0) this.state.streak = 0;
    } else if (this.sinceKill > FRENZY.gapMs) this.state.streak = 0;
  }

  /** Starts an effect: a sprite (by name, '' for none) and an optional text, fading over `life`. */
  private effect(name: string, x: number, y: number, o: { life: number; rise?: number; grow?: number; text?: string; angle?: number; baseScale?: number }) {
    if (name && !this.textures.exists(tex(this.style, name))) return;
    const f = this.fx.take();
    Object.assign(f, { age: 0, life: o.life, rise: o.rise ?? 0, grow: o.grow ?? 0, baseScale: o.baseScale ?? 1 });
    if (name) {
      this.skins.delete(f.sprite);
      this.skin(f.sprite, name).setPosition(x, y).setAngle(o.angle ?? 0).setScale(f.baseScale / HI).setAlpha(1).setVisible(true);
      f.sprite.setDepth(name === 'muzzle' ? DEPTH.muzzle : DEPTH.fx);
    }
    if (o.text) {
      const th = this.theme(), streak = name === 'streak';
      if (this.style === 'comic') this.font(f.text, streak ? 20 : 12, streak ? '#e8402a' : '#fff8e8', { stroke: th.ink, sw: streak ? 4 : 3 });
      else this.font(f.text, streak ? 20 : 11, streak ? th.accent : '#ffffff', { glow: streak ? th.accent : '#ffffff' });
      f.text.setText(o.text).setPosition(x, y - (streak ? 3 : 0)).setAlpha(1).setVisible(true);
    }
  }

  private ageEffects(dt: number) {
    for (const s of this.splats.all) {
      if (!s.alive) continue;
      s.age += dt;
      if (s.age >= SPLAT_MS) this.splats.release(s);
      else s.sprite.setAlpha(1 - s.age / SPLAT_MS);
    }
    for (const f of this.fx.all) {
      if (!f.alive) continue;
      f.age += dt;
      if (f.age >= f.life) {
        this.fx.release(f);
        continue;
      }
      const t = f.age / f.life, alpha = t < 0.6 ? 1 : 1 - (t - 0.6) / 0.4;
      if (f.sprite.visible) f.sprite.setAlpha(alpha).setScale((f.baseScale * (1 + f.grow * t)) / HI);
      if (f.text.visible) f.text.setAlpha(alpha).setY(f.text.y - (f.rise * dt) / 1000);
    }
  }

  /** A wave is cleared once every enemy in it has come in and fallen; the next one follows a short pause. */
  private checkWave(dt: number) {
    if (this.state.phase === 'wave') {
      if (this.enemiesToCome() === 0 && this.enemies.live().length === 0) {
        this.state.phase = 'break';
        this.breakClock = 0;
        this.showBanner(`WAVE ${this.state.wave} CLEARED!`);
      }
    } else if (this.state.phase === 'break') {
      this.breakClock += dt;
      if (this.breakClock >= BREAK_MS) this.startWave(this.state.wave + 1);
    }
  }

  /** Health bars over hurt enemies, the boss bar, and the marks on zombies a drum would catch. */
  private drawBars() {
    const g = this.bars.clear(), m = this.marks.clear(), th = this.theme(), comic = this.style === 'comic';
    // In the comic the marks under caught zombies are painted on the road; in night vision they
    // are part of the overlay.
    this.bars.setDepth(comic ? DEPTH.bars : DEPTH.labels);
    this.marks.setDepth(comic ? DEPTH.ringUnder + 0.5 : DEPTH.labels);
    for (const e of this.enemies.all) {
      if (!e.alive) continue;
      const r = ENEMIES[e.kind].radius;
      if (e.inBlast) {
        if (comic) {
          m.lineStyle(3.5, num(th.ink)).strokeEllipse(e.x, e.y + r * 0.9, (r + 4) * 2, 12);
          m.lineStyle(1.8, num('#ffb02a')).strokeEllipse(e.x, e.y + r * 0.9, (r + 4) * 2, 12);
        } else {
          const top = e.y - r - 11;
          m.lineStyle(1.4, num(th.accent)).strokeTriangle(e.x, top + 6, e.x + (r + 5) * 0.5, top, e.x - (r + 5) * 0.5, top);
        }
      }
      if (e.hp === e.maxHp) continue;
      const w = r * 2, top = e.y - r - 14;
      if (comic) {
        g.fillStyle(num('#fff8e8')).fillRect(e.x - r - 1, top - 1, w + 2, 7);
        g.lineStyle(1.4, num(th.ink)).strokeRect(e.x - r - 1, top - 1, w + 2, 7);
        g.fillStyle(num(th.hp)).fillRect(e.x - r + 0.5, top + 0.5, ((w - 1) * e.hp) / e.maxHp, 4);
      } else {
        g.lineStyle(1, num(th.text)).strokeRect(e.x - r - 1, top - 1, w + 2, 6);
        g.fillStyle(num(th.hp)).fillRect(e.x - r + 0.5, top + 0.5, ((w - 1) * e.hp) / e.maxHp, 3);
      }
    }
    // Drum labels sit on a balloon in the comic, on a dark tag in night vision.
    for (const d of this.drums.all) {
      if (!d.alive) continue;
      const w = d.label.width + 16;
      if (comic) {
        g.fillStyle(num('#fff8e8')).fillEllipse(d.x, d.y - 33, w + 8, 22);
        g.lineStyle(1.6, num(th.ink)).strokeEllipse(d.x, d.y - 33, w + 8, 22);
        g.fillStyle(num('#fff8e8')).fillTriangle(d.x - 3, d.y - 23, d.x + 4, d.y - 23, d.x + 1, d.y - 15);
        g.lineStyle(1.6, num(th.ink)).lineBetween(d.x - 3, d.y - 22, d.x + 1, d.y - 15).lineBetween(d.x + 1, d.y - 15, d.x + 4, d.y - 22);
      } else {
        g.fillStyle(num('#1e1204'), 0.8).fillRoundedRect(d.x + 38 - w / 2, d.y + 22, w, 15, 2);
        g.lineStyle(1, num(th.accent)).strokeRoundedRect(d.x + 38 - w / 2, d.y + 22, w, 15, 2);
      }
    }
    // A boss also gets a big bar along the top of the screen, under the progress strip.
    const boss = this.enemies.all.find((e) => e.alive && e.kind === 'boss');
    if (boss) {
      const y = HUD_HEIGHT + 32;
      if (comic) {
        g.fillStyle(num(th.ink)).fillRect(40, y, VIEW.w - 80, 14);
        g.fillStyle(num('#8a2a6a')).fillRect(42, y + 2, ((VIEW.w - 84) * boss.hp) / boss.maxHp, 10);
      } else {
        g.lineStyle(1, num(th.warn)).strokeRect(40, y, VIEW.w - 80, 12);
        g.fillStyle(num(th.warn), 0.85).fillRect(42, y + 2, ((VIEW.w - 84) * boss.hp) / boss.maxHp, 8);
      }
    }
  }

  private updateHud() {
    const s = this.state;
    this.hud.update({
      wave: s.wave,
      kills: s.kills,
      best: s.best,
      newBest: this.bestAtStart > 0 && s.best > this.bestAtStart,
      stats: s.stats,
      fallen: s.fallen,
      total: s.waveTotal,
      bossWave: isBossWave(s.wave),
      bossNext: isBossWave(s.wave + 1),
      nextBoss: this.nextBoss(),
      streak: s.streak,
      frenzyFill: s.frenzyMs > 0 ? s.frenzyMs / FRENZY.ms : Math.min(1, s.streak / FRENZY.kills),
      frenzyOn: s.frenzyMs > 0,
    });
  }

  private nextBoss() {
    let w = this.state.wave + 1;
    while (!isBossWave(w)) w++;
    return w;
  }

  private refreshBackdrop() {
    const s = this.state;
    if (!GameScene.backdrop || !s) return;
    const info: BackdropInfo = {
      wave: s.wave,
      best: s.best,
      kills: s.kills,
      over: s.phase === 'over',
      seconds: Math.floor(this.runMs / 1000),
      squad: s.stats.companions + 1,
      maxSquad: MAX_COMPANIONS + 1,
      damage: s.stats.damage,
      rate: `${(1000 / s.stats.fireInterval).toFixed(1)}/s`,
      pierce: s.stats.pierce,
      collected: s.collected,
      inbound: this.pickups ? this.pickups.live().map((p) => p.upgrade) : [],
      horde: this.enemies ? this.enemies.live().length : 0,
      bossWave: isBossWave(s.wave),
      bossNext: isBossWave(s.wave + 1),
      nextBoss: this.nextBoss(),
    };
    GameScene.backdrop.refresh(info);
  }

  private gameOver() {
    this.state.phase = 'over';
    this.state.frenzyMs = 0;
    this.pointerTarget = null;
    this.updateHud();
    this.showGameOver();
    this.refreshBackdrop();
  }

  private showGameOver() {
    const th = this.theme(), comic = this.style === 'comic';
    const shade = this.add.rectangle(0, 0, VIEW.w, VIEW.h, comic ? 0x15121a : 0x000000, comic ? 0.55 : 0.6).setOrigin(0).setDepth(DEPTH.hud + 1);
    const title = this.add.text(VIEW.w / 2, VIEW.h * 0.4, comic ? 'OVERRUN!' : 'FEED LOST: OVERRUN', { resolution: 2 }).setOrigin(0.5).setDepth(DEPTH.hud + 2);
    if (comic) this.font(title, 52, '#e8402a', { stroke: th.ink, sw: 9 });
    else this.font(title, 30, th.warn, { glow: th.warn });
    const best = this.state.wave >= this.state.best && this.bestAtStart < this.state.wave ? 'A new best!' : `Best: wave ${this.state.best}`;
    const info = this.add
      .text(VIEW.w / 2, VIEW.h * 0.4 + 70, `Reached wave ${this.state.wave} with ${this.state.kills} kills\n${best}\n\nTap to try again`, { resolution: 2, align: 'center' })
      .setOrigin(0.5, 0)
      .setDepth(DEPTH.hud + 2);
    this.font(info, 20, comic ? '#fff8e8' : th.text, comic ? { stroke: th.ink, sw: 5 } : { glow: th.text });
    this.overText = [shade, title, info];
  }
}
