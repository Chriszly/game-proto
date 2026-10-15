import Phaser from 'phaser';
import { settings } from '../../../../shared/settings';
import { Backdrop, type BackdropInfo } from '../art/backdrop';
import { bakeComic } from '../art/comic';
import { bakeNightVision } from '../art/nightvision';
import { GEOM, GRAIN_TILE, geomOf, num, tex } from '../art/paint';
import { ACID_COLOR, CRATE_COLORS, SHIELD_COLOR, THEMES, UPGRADE_COLORS, type Theme } from '../art/theme';
import { Pool } from '../game/pool';
import {
  ACID_SLOW,
  BASE_STATS,
  BOSS,
  BREAK_MS,
  BULLET,
  DRUM,
  ENEMIES,
  FLAMER,
  FRENZY,
  HERO,
  HUD_HEIGHT,
  KIT_COSTS,
  LANES,
  MAX_COMPANIONS,
  MEDKIT,
  PICKUP,
  REACH_Y,
  SCRAP,
  SHOTGUN,
  SPAWN_Y,
  SPITTER,
  SQUAD_SLOTS,
  SUPPLIES,
  UPGRADE_KINDS,
  UPGRADES,
  VIEW,
  WALL,
  applyUpgrade,
  blastDamage,
  bossMove,
  isBossWave,
  laneAt,
  planWave,
  riotShield,
  supplyPick,
  toughness,
  waveTotal,
  type BossMove,
  type CrateKind,
  type EnemyKind,
  type Spawn,
  type Stats,
  type SupplyKind,
  type UpgradeKind,
} from '../game/rules';
import { loadBest, loadKit, loadScrap, loadStyle, saveBest, saveKit, saveScrap, saveStyle, type ArtStyle } from '../game/save';
import { HUD_DEPTH, Hud } from './Hud';

const DEPTH = {
  ground: 0, sandbags: 5, splats: 8, acid: 8.5, ringUnder: 9, drums: 10, pickups: 11, enemies: 20, hero: 40,
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
  /** A riot zombie's shield points left (0 for every other kind, or once it broke). */
  shield: number;
  maxShield: number;
  /** A spitter's clock towards its next glob. */
  clock: number;
  sprite: Phaser.GameObjects.Image;
}

interface Pickup {
  alive: boolean;
  id: number;
  upgrade: CrateKind;
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
  /** Its speed across and up (a shotgun's outer bullets fan out; the rest go straight up). */
  vx: number;
  vy: number;
  /** Where it was last frame: hits are tested along the whole stretch it moved. */
  prevX: number;
  prevY: number;
  /** Fired with pierce: it goes past a riot zombie's shield. */
  pierces: boolean;
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

/**
 * A glob of acid in flight (from a spitter or a boss) and then the puddle it leaves on the squad's
 * line. `flight` counts down to the landing, `life` the puddle's time left after it.
 */
interface Acid {
  alive: boolean;
  x: number;
  r: number;
  fromX: number;
  fromY: number;
  flight: number;
  flightMs: number;
  life: number;
  sprite: Phaser.GameObjects.Image;
  glob: Phaser.GameObjects.Image;
}

/** A sandbag wall across a lane, holding its zombies back until `ms` runs out. */
interface Wall {
  alive: boolean;
  lane: number;
  ms: number;
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

/** What the game is doing: fighting a wave, the pause after one, picking a boss's supply drop, or overrun. */
export type Phase = 'wave' | 'break' | 'supply' | 'over';

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
  /** Scrap earned this run, and the scrap banked before it (saved together under `deadline-scrap`). */
  scrap: number;
  bank: number;
  /** The starting crates this run began with, and those bought on the game over screen for the next. */
  startKit: UpgradeKind[];
  nextKit: UpgradeKind[];
  /** Sandbag walls in hand, and whether the next tap on the road places one. */
  sandbags: number;
  placing: boolean;
  walls: number;
  /** From the supply drops: extra shotgun pairs, flame bursts and medkits left. */
  pellets: number;
  flames: number;
  medkits: number;
  /** The three supplies on offer while the phase is 'supply', and every one picked this run. */
  offer: SupplyKind[];
  supplies: SupplyKind[];
  /** The hero stands in acid, so the squad fires slower. */
  inAcid: boolean;
  /** The boss's move being wound up or under way, and how many it has made. */
  bossMove: BossMove | null;
  bossMoves: number;
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
  private acids!: Pool<Acid>;
  private walls!: Pool<Wall>;
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
  /** The boss's clock towards its next move, and the move being wound up or under way. */
  private bossClock = 0;
  private bossAct: { move: BossMove; ms: number; acting: boolean; tx: number; fromX: number; fromY: number } | null = null;
  private flameClock = 0;
  /** The press that is down started on a button, so dragging it doesn't move the hero. */
  private pressOnUi = false;

  /** Every image and the sprite it shows, so a style switch can swap all their textures. */
  private skins = new Map<Phaser.GameObjects.Image | Phaser.GameObjects.TileSprite, string>();
  private scan!: Phaser.GameObjects.Image;
  private grain!: Phaser.GameObjects.TileSprite;
  private bars!: Phaser.GameObjects.Graphics;
  private marks!: Phaser.GameObjects.Graphics;
  private hud!: Hud;
  private banner!: Phaser.GameObjects.Text;
  private overText: Phaser.GameObjects.GameObject[] = [];
  /** The supply drop's cards, and the game over screen's kit buttons, as tap boxes. */
  private supplyUi: Phaser.GameObjects.GameObject[] = [];
  private cards: { kind: SupplyKind; x: number; y: number; w: number; h: number }[] = [];
  private shop: { kind: UpgradeKind; x: number; y: number; w: number; h: number }[] = [];
  private bossCall!: Phaser.GameObjects.Text;
  private placeHint!: Phaser.GameObjects.Text;
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
      scrap: 0,
      bank: loadScrap(),
      startKit: loadKit(),
      nextKit: [],
      sandbags: 0,
      placing: false,
      walls: 0,
      pellets: 0,
      flames: 0,
      medkits: 0,
      offer: [],
      supplies: [],
      inAcid: false,
      bossMove: null,
      bossMoves: 0,
    };
    // The starting crates bought last run are spent now.
    saveKit([]);
    for (const kind of this.state.startKit) this.state.stats = applyUpgrade(this.state.stats, kind);
    this.bossClock = 0;
    this.bossAct = null;
    this.flameClock = 0;
    this.pressOnUi = false;
    this.supplyUi = [];
    this.cards = [];
    this.shop = [];
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

    const text = (depth: number) => this.add.text(0, 0, '').setOrigin(0.5).setDepth(depth).setVisible(false);
    this.enemies = new Pool<Enemy>(
      () => ({ alive: false, id: 0, kind: 'grunt', hp: 0, maxHp: 0, x: 0, y: 0, inBlast: false, shield: 0, maxShield: 0, clock: 0, sprite: this.add.image(0, 0, '__DEFAULT') }),
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
      () => ({ alive: false, x: 0, y: 0, vx: 0, vy: 0, prevX: 0, prevY: 0, pierces: false, hitsLeft: 0, hit: [], sprite: this.skin(this.add.image(0, 0, '__DEFAULT'), 'bullet').setDepth(DEPTH.bullets) }),
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

    this.acids = new Pool<Acid>(
      () => ({
        alive: false, x: 0, r: 0, fromX: 0, fromY: 0, flight: 0, flightMs: 0, life: 0,
        sprite: this.skin(this.add.image(0, 0, '__DEFAULT'), 'acid').setDepth(DEPTH.acid),
        glob: this.skin(this.add.image(0, 0, '__DEFAULT'), 'glob').setDepth(DEPTH.bullets),
      }),
      (a) => [a.sprite, a.glob].forEach((o) => o.setVisible(false)),
    );
    this.walls = new Pool<Wall>(
      () => ({ alive: false, lane: 0, ms: 0, sprite: this.skin(this.add.image(0, 0, '__DEFAULT'), 'wall').setDepth(DEPTH.enemies + WALL.y / VIEW.h) }),
      (w) => w.sprite.setVisible(false),
    );
    // Starting crates bought with scrap: a companion one brings its soldier in at once.
    this.addCompanions();

    this.hud = new Hud(this);
    this.banner = this.add.text(VIEW.w / 2, VIEW.h * 0.38, '', { align: 'center' }).setOrigin(0.5).setDepth(DEPTH.hud).setAlpha(0);
    this.bossCall = this.add.text(0, 0, '').setOrigin(0.5).setDepth(DEPTH.pops).setVisible(false);
    this.placeHint = this.add.text(VIEW.w / 2, WALL.y - 70, '', { align: 'center' }).setOrigin(0.5).setDepth(DEPTH.pops).setVisible(false);
    this.createInput();
    this.applyStyle();
    this.startWave(1);
  }

  /** The enemies in play, for the playthrough test. */
  liveEnemies() {
    return this.enemies.live().map(({ id, kind, hp, maxHp, x, y, shield }) => ({ id, kind, hp, maxHp, x, y, shield }));
  }

  /** The acid on the squad's line: where, how wide, and whether it has landed yet. */
  liveAcid() {
    return this.acids.live().map(({ x, r, flight, life }) => ({ x, r, landed: flight <= 0, life }));
  }

  /** The sandbag walls standing: their lane and the time they have left. */
  liveWalls() {
    return this.walls.live().map(({ lane, ms }) => ({ lane, ms }));
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
    const geom = geomOf(name);
    img.setTexture(tex(this.style, name)).setOrigin(geom.ox / geom.w, geom.oy / geom.h).setScale(this.unit(img));
    return img;
  }

  /** The scale that shows a skinned image's texture at its box's size, however finely it was painted. */
  private unit(img: Phaser.GameObjects.Image) {
    const name = this.skins.get(img);
    return name ? geomOf(name).w / img.frame.width : 1;
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
      const geom = geomOf(name);
      img.setTexture(tex(this.style, name)).setOrigin(geom.ox / geom.w, geom.oy / geom.h);
    }
    this.scan.setTexture(nv ? tex('nv', 'scan') : '__DEFAULT').setVisible(nv);
    if (nv) this.grain.setTexture(tex('nv', 'grain')).setTileScale(GRAIN_TILE / this.grain.frame.width);
    this.grain.setVisible(nv).setAlpha(0.9);
    // In the comic the blast ring is painted on the road under the horde; in night vision it is
    // part of the overlay, over the scanlines.
    for (const d of this.drums.all) d.ring.setDepth(nv ? DEPTH.labels - 1 : DEPTH.ringUnder);
    for (const p of this.pickups.all) this.styleCrateText(p.hpText);
    for (const d of this.drums.all) this.styleDrumLabel(d.label);
    for (const f of this.fx.all) if (f.alive) this.fx.release(f);
    this.font(this.banner, 40, nv ? th.accent : '#ffe04a', nv ? { glow: th.accent } : { stroke: th.ink, sw: 8 });
    this.font(this.bossCall, nv ? 16 : 20, nv ? th.warn : '#ffe04a', nv ? { glow: th.warn } : { stroke: th.ink, sw: 6 });
    this.font(this.placeHint, nv ? 14 : 16, nv ? th.accent : '#fff8e8', nv ? { glow: th.accent } : { stroke: th.ink, sw: 5 });
    for (const t of this.overText) t.destroy();
    this.overText = [];
    if (this.state.phase === 'over') this.showGameOver();
    if (this.state.phase === 'supply') this.showSupply();
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
    // S drops a sandbag wall in the hero's lane; 1, 2 and 3 pick a supply.
    kb.addKey(K.S).on('down', () => this.state.phase !== 'over' && this.state.phase !== 'supply' && this.placeWall(laneAt(this.player.x)));
    [K.ONE, K.TWO, K.THREE].forEach((code, i) => kb.addKey(code).on('down', () => this.state.phase === 'supply' && this.pickSupply(this.state.offer[i])));
    // Tap or drag anywhere: the hero walks along their line to below that spot.
    const aim = (p: Phaser.Input.Pointer) => {
      if (this.state.phase === 'over' || this.state.phase === 'supply') return;
      const [minX, maxX] = this.heroRange();
      this.pointerTarget = Phaser.Math.Clamp(p.worldX, minX, maxX);
    };
    const inBox = (x: number, y: number, b: { x: number; y: number; w: number; h: number }) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      const { worldX: x, worldY: y } = p, s = this.state;
      this.pressOnUi = true;
      if (this.hud.onSwitch(x, y)) this.switchStyle();
      else if (s.phase === 'over') {
        const button = this.shop.find((b) => inBox(x, y, b));
        if (button) this.buyKit(button.kind);
        else this.scene.restart();
      } else if (s.phase === 'supply') {
        const card = this.cards.find((c) => inBox(x, y, c));
        if (card) this.pickSupply(card.kind);
      } else if (this.hud.onKit(x, y) && (s.sandbags > 0 || s.placing)) s.placing = !s.placing;
      else if (s.placing) {
        // A tap on the road puts the wall in that lane; anywhere else puts the sandbags away.
        if (y > HUD_HEIGHT + 30 && y < REACH_Y) this.placeWall(laneAt(x));
        s.placing = false;
      } else {
        this.pressOnUi = false;
        aim(p);
      }
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => p.isDown && !this.pressOnUi && aim(p));
  }

  private startWave(wave: number) {
    this.state.wave = wave;
    this.state.phase = 'wave';
    this.state.fallen = 0;
    this.state.waveTotal = waveTotal(wave);
    this.plan = planWave(wave);
    this.waveClock = 0;
    this.bossClock = 0;
    this.bossAct = null;
    this.state.bossMove = null;
    this.state.bossMoves = 0;
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
    // Nothing moves while the game is over or a supply drop is being picked.
    if (this.state.phase === 'over' || this.state.phase === 'supply') return;
    this.runMs += dt;
    this.moveHero(dt);
    this.spawn(dt);
    this.fire(dt);
    this.moveBullets(dt);
    this.tickBoss(dt);
    if (this.moveEnemies(dt)) return;
    this.movePickups(dt);
    this.moveDrums(dt);
    this.moveAcid(dt);
    this.moveWalls(dt);
    this.hitTargets();
    this.tickFlamer(dt);
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
        this.addEnemy(s.kind, s.hp, s.x, SPAWN_Y);
      } else if (s.type === 'pickup') {
        // Once every slot in the squad is filled, a companion crate brings extra damage instead.
        const upgrade: CrateKind = s.upgrade === 'companion' && this.state.stats.companions >= MAX_COMPANIONS ? 'damage' : s.upgrade;
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

  private addEnemy(kind: EnemyKind, hp: number, x: number, y: number) {
    const e = this.enemies.take();
    const shield = kind === 'riot' ? riotShield(this.state.wave) : 0;
    Object.assign(e, { id: this.nextId++, kind, hp, maxHp: hp, x, y, inBlast: false, shield, maxShield: shield, clock: SPITTER.everyMs - SPITTER.firstMs });
    this.skin(e.sprite, kind).setPosition(e.x, e.y).setVisible(true);
    return e;
  }

  /**
   * Fires a volley every so often: one bullet straight up from the hero and from each companion, and
   * with the shotgun pairs of bullets fanning out from the hero's rifle. A frenzy fires
   * `FRENZY.rate` times as fast; standing in acid, `ACID_SLOW` times slower.
   */
  private fire(dt: number) {
    this.fireClock += dt;
    const { pierce } = this.state.stats;
    const interval = (this.state.stats.fireInterval / (this.state.frenzyMs > 0 ? FRENZY.rate : 1)) * (this.state.inAcid ? ACID_SLOW : 1);
    const shoot = (x: number, y: number, angle: number) => {
      const b = this.bullets.take();
      b.x = b.prevX = x;
      b.y = b.prevY = y;
      b.vx = Math.sin(angle) * BULLET.speed;
      b.vy = Math.cos(angle) * BULLET.speed;
      b.hitsLeft = 1 + pierce;
      b.pierces = pierce > 0;
      b.hit.length = 0;
      b.sprite.setPosition(b.x, b.y).setRotation(angle).setVisible(true);
    };
    while (this.fireClock >= interval) {
      this.fireClock -= interval;
      this.volleys++;
      for (let i = 0; i <= this.squad.length; i++) {
        const x = this.player.x + SQUAD_SLOTS[i].dx, y = HERO.y + SQUAD_SLOTS[i].dy - 30;
        shoot(x, y, 0);
        if (i === 0) for (let k = 1; k <= this.state.pellets; k++) [-1, 1].forEach((side) => shoot(x, y, side * k * SHOTGUN.angle));
        this.effect('muzzle', x, y, { life: 70 });
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
      b.prevX = b.x;
      b.prevY = b.y;
      b.x += (b.vx * dt) / 1000;
      b.y -= (b.vy * dt) / 1000;
      if (b.y < HUD_HEIGHT - 10 || b.x < 0 || b.x > VIEW.w) this.bullets.release(b);
      else b.sprite.setPosition(b.x, b.y);
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
      const { speed, steer, radius } = ENEMIES[e.kind];
      // A boss winding up a move stands still, and a charge moves it on its own (`tickBoss`).
      const bossBusy = e.kind === 'boss' && this.bossAct !== null;
      // A sandbag wall in its lane holds a zombie back; a boss smashes through it.
      const wall = this.walls.all.find((w) => w.alive && w.lane === laneAt(e.x) && e.y < WALL.y && e.y + radius >= WALL.y - 14);
      if (wall && e.kind === 'boss') this.smashWall(wall);
      const held = !!wall && e.kind !== 'boss';
      if (!bossBusy && !held) {
        e.y += (speed * dt) / 1000;
        // A spitter stops at its range and lobs acid from there.
        if (e.kind === 'spitter' && e.y >= SPITTER.standY) {
          e.y = SPITTER.standY;
          e.clock += dt;
          if (e.clock >= SPITTER.everyMs) {
            e.clock = 0;
            this.lobAcid(e.x, e.y - 4, SPITTER.poolRadius, SPITTER.warnMs, SPITTER.poolMs);
          }
        } else {
          const aside = e.kind === 'boss' ? 0 : ((e.id * 53) % 81) - 40;
          const dx = this.player.x + aside - e.x, maxStep = (steer * dt) / 1000;
          e.x += Phaser.Math.Clamp(dx, -maxStep, maxStep);
        }
      }
      // A little shamble from side to side, the same for every frame rate (none when motion is reduced).
      const sway = settings.reduceMotion || e.kind === 'boss' ? 0 : Math.sin((e.y + e.id * 37) / 9) * 1.5;
      e.sprite.setPosition(e.x + sway, e.y).setDepth(DEPTH.enemies + e.y / VIEW.h);
      if (e.y + radius >= REACH_Y) {
        // A medkit gets the squad through one breach; without one, it's over.
        if (this.state.medkits > 0) this.useMedkit();
        else {
          this.gameOver();
          return true;
        }
      }
    }
    return false;
  }

  /** The squad patches up and throws back every zombie near the line. */
  private useMedkit() {
    this.state.medkits--;
    for (const e of this.enemies.all) {
      if (!e.alive || e.y < REACH_Y - MEDKIT.reach) continue;
      e.y -= MEDKIT.push;
      e.sprite.setY(e.y);
    }
    if (this.bossAct?.acting) this.endBossMove();
    this.showBanner(this.style === 'comic' ? 'MEDKIT!\nTHE LINE HOLDS!' : 'MEDKIT USED\nLINE HOLDS');
  }

  /** Every so often a boss winds up a move (shown for `BOSS.warnMs`), then makes it. */
  private tickBoss(dt: number) {
    const boss = this.enemies.all.find((e) => e.alive && e.kind === 'boss');
    if (!boss) {
      if (this.bossAct) this.endBossMove();
      return;
    }
    const a = this.bossAct;
    if (!a) {
      this.bossClock += dt;
      if (this.bossClock < (this.state.bossMoves === 0 ? BOSS.firstMs : BOSS.everyMs)) return;
      const move = bossMove(this.state.wave, this.state.bossMoves++);
      // It aims at where the hero stands now; the warning shows where, so they can get out of the way.
      const tx = Phaser.Math.Clamp(this.player.x, LANES[0].x0 + 40, LANES[2].x1 - 40);
      this.bossAct = { move, ms: 0, acting: false, tx, fromX: boss.x, fromY: boss.y };
      this.state.bossMove = move;
      const call = { charge: ['CHARGE!', 'CHARGE INBOUND'], spit: ['ACID SPIT!', 'ACID INBOUND'], call: ['ROAAAR!', 'PACK CALLED'] }[move];
      this.bossCall.setText(call[this.style === 'comic' ? 0 : 1]).setVisible(true);
      return;
    }
    a.ms += dt;
    this.bossCall.setPosition(boss.x, boss.y - ENEMIES.boss.radius - 46);
    if (!a.acting) {
      if (a.ms < BOSS.warnMs) return;
      a.ms = 0;
      if (a.move === 'charge') {
        a.acting = true;
        a.fromX = boss.x;
        a.fromY = boss.y;
        return;
      }
      if (a.move === 'spit') this.lobAcid(boss.x, boss.y - 20, BOSS.spitRadius, 400, BOSS.poolMs, a.tx);
      else this.callPack(boss);
      this.endBossMove();
      return;
    }
    // The charge: across the lanes to where the hero stood, and further down.
    const t = Math.min(1, a.ms / BOSS.chargeMs);
    boss.x = a.fromX + (a.tx - a.fromX) * t;
    boss.y = a.fromY + BOSS.chargeDrop * t;
    if (t >= 1) this.endBossMove();
  }

  private endBossMove() {
    this.bossAct = null;
    this.bossClock = 0;
    this.state.bossMove = null;
    this.bossCall.setVisible(false);
  }

  /** The boss calls a pack of runners out round it; they join the wave's count. */
  private callPack(boss: Enemy) {
    const hp = Math.round(ENEMIES.runner.hp * toughness(this.state.wave));
    for (let i = 0; i < BOSS.pack; i++) {
      const x = Phaser.Math.Clamp(boss.x + (i - (BOSS.pack - 1) / 2) * 30, LANES[0].x0 + 10, LANES[2].x1 - 10);
      this.addEnemy('runner', hp, x, boss.y + 26 + (i % 2) * 12);
    }
    this.state.waveTotal += BOSS.pack;
  }

  /** Lobs a glob of acid from x, y at the hero's line (where the hero stands, or at `tx`). */
  private lobAcid(x: number, y: number, r: number, flightMs: number, poolMs: number, tx = this.player.x) {
    const a = this.acids.take();
    Object.assign(a, { x: tx, r, fromX: x, fromY: y, flight: flightMs, flightMs, life: poolMs });
    a.glob.setPosition(x, y).setVisible(true);
    a.sprite.setPosition(tx, HERO.y + 6).setScale((GEOM.acid.w / a.sprite.frame.width) * (r / 78)).setAlpha(1).setVisible(false);
  }

  /** Globs fly in an arc and land as puddles; the hero standing in one slows the squad's fire. */
  private moveAcid(dt: number) {
    let inAcid = false;
    for (const a of this.acids.all) {
      if (!a.alive) continue;
      if (a.flight > 0) {
        a.flight -= dt;
        const t = 1 - Math.max(0, a.flight) / a.flightMs;
        a.glob.setPosition(a.fromX + (a.x - a.fromX) * t, a.fromY + (HERO.y - a.fromY) * t - Math.sin(t * Math.PI) * 60);
        if (a.flight <= 0) {
          a.glob.setVisible(false);
          a.sprite.setVisible(true);
        }
        continue;
      }
      a.life -= dt;
      if (a.life <= 0) {
        this.acids.release(a);
        continue;
      }
      a.sprite.setAlpha(Math.min(1, a.life / 500));
      if (Math.abs(this.player.x - a.x) <= a.r) inAcid = true;
    }
    this.state.inAcid = inAcid;
  }

  /** Drops a sandbag wall across a lane (or tops up the one already there). */
  private placeWall(lane: number) {
    if (this.state.sandbags <= 0) return;
    this.state.sandbags--;
    this.state.walls++;
    let w = this.walls.all.find((o) => o.alive && o.lane === lane);
    if (!w) {
      w = this.walls.take();
      w.lane = lane;
      const { x0, x1 } = LANES[lane];
      // Skinned before it is stretched to the lane, as `skin` sets the scale.
      this.skin(w.sprite, 'wall').setPosition((x0 + x1) / 2, WALL.y).setVisible(true);
      w.sprite.setScale(w.sprite.scaleX * ((x1 - x0) / GEOM.wall.w), w.sprite.scaleY);
    }
    w.ms = WALL.ms;
    w.sprite.setAlpha(1);
    this.state.placing = false;
  }

  private moveWalls(dt: number) {
    for (const w of this.walls.all) {
      if (!w.alive) continue;
      w.ms -= dt;
      if (w.ms <= 0) this.walls.release(w);
      else w.sprite.setAlpha(Math.min(1, w.ms / 600));
    }
  }

  private smashWall(w: Wall) {
    this.effect('', w.sprite.x, WALL.y - 20, { life: 600, rise: 30, text: this.style === 'comic' ? 'CRUNCH!' : 'WALL DOWN' });
    this.walls.release(w);
  }

  /** A flame burst goes off on its own when a zombie gets close to the sandbags. */
  private tickFlamer(dt: number) {
    this.flameClock = Math.max(0, this.flameClock - dt);
    if (this.state.flames <= 0 || this.flameClock > 0) return;
    const close = this.enemies.all.some((e) => e.alive && e.y + ENEMIES[e.kind].radius >= REACH_Y - FLAMER.trigger);
    if (!close) return;
    this.state.flames--;
    this.flameClock = FLAMER.cooldownMs;
    const caught = this.enemies.all.filter((e) => e.alive && e.y >= REACH_Y - FLAMER.reach);
    for (const e of caught) this.hurt(e, FLAMER.damage(this.state.wave));
    this.effect('flame', VIEW.w / 2, REACH_Y, settings.reduceMotion ? { life: 700 } : { life: 700, grow: 0.08 });
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
      const sx = b.x - b.prevX, sy = b.y - b.prevY, len2 = sx * sx + sy * sy || 1;
      const hits = this.enemies.all.filter((e) => {
        if (!e.alive || b.hit.includes(e.id)) return false;
        const r = ENEMIES[e.kind].radius + BULLET.radius;
        // The point of this frame's stretch nearest the enemy.
        const t = Phaser.Math.Clamp(((e.x - b.prevX) * sx + (e.y - b.prevY) * sy) / len2, 0, 1);
        return (b.prevX + sx * t - e.x) ** 2 + (b.prevY + sy * t - e.y) ** 2 <= r * r;
      });
      hits.sort((a, c) => c.y - a.y);
      for (const e of hits) {
        b.hit.push(e.id);
        // A riot shield stops a bullet without pierce, and takes the hit itself.
        if (e.shield > 0 && !b.pierces) this.chipShield(e, damage);
        else this.hurt(e, damage);
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
        const nearX = Phaser.Math.Clamp(t.x, Math.min(b.x, b.prevX), Math.max(b.x, b.prevX));
        if (Math.abs(nearX - t.x) > reach || b.y > t.y + reach || b.prevY < t.y - reach) continue;
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

  /** A bullet on a riot shield: it chips the shield, and the shield breaks at 0. */
  private chipShield(e: Enemy, damage: number) {
    e.shield = Math.max(0, e.shield - damage);
    const r = ENEMIES[e.kind].radius;
    if (e.shield > 0) {
      if (this.volleys % 3 === 0) this.effect('', e.x, e.y + r, { life: 360, rise: 20, text: this.style === 'comic' ? 'CLANG' : 'BLOCK' });
      return;
    }
    this.skin(e.sprite, 'riot-bare');
    this.effect('', e.x, e.y - r - 10, { life: 700, rise: 30, text: this.style === 'comic' ? 'SHIELD BUSTED!' : 'SHIELD DOWN' });
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
    this.state.scrap += SCRAP[e.kind];
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
    s.sprite.setPosition(e.x, e.y).setScale(((e.kind === 'boss' ? 3 : e.kind === 'brute' ? 1.6 : e.kind === 'crawler' ? 0.7 : 1) * GEOM.splat.w) / s.sprite.frame.width).setAlpha(1).setVisible(true);
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
    this.pickups.release(p);
    // A sandbag crate goes into the kit, to be placed in a lane.
    if (p.upgrade === 'sandbag') {
      this.state.sandbags++;
      this.pop(this.style === 'comic' ? 'SANDBAGS! TAP TO PLACE' : 'SANDBAGS +1', CRATE_COLORS.sandbag);
      return;
    }
    // A companion crate that was already falling when the squad filled up brings damage instead.
    const upgrade = p.upgrade === 'companion' && this.state.stats.companions >= MAX_COMPANIONS ? 'damage' : p.upgrade;
    this.state.stats = applyUpgrade(this.state.stats, upgrade);
    this.state.collected[upgrade]++;
    if (upgrade === 'companion') this.addCompanions();
    this.pop(UPGRADES[upgrade].label.toUpperCase(), UPGRADE_COLORS[upgrade]);
    this.refreshBackdrop();
  }

  /** A word that pops up over the squad and floats away. */
  private pop(text: string, color: string) {
    const pop = this.add.text(this.player.x, HERO.y - 50, text).setOrigin(0.5).setDepth(DEPTH.hud);
    if (this.style === 'comic') this.font(pop, 18, color, { stroke: THEMES.comic.ink, sw: 5 });
    else this.font(pop, 16, color, { glow: color });
    pop.setX(Phaser.Math.Clamp(this.player.x, pop.width / 2 + 8, VIEW.w - pop.width / 2 - 8));
    this.tweens.add({ targets: pop, y: pop.y - 60, alpha: 0, duration: 1200, onComplete: () => pop.destroy() });
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
      this.skin(f.sprite, name).setPosition(x, y).setAngle(o.angle ?? 0).setScale(f.baseScale * this.unit(f.sprite)).setAlpha(1).setVisible(true);
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
      if (f.sprite.visible) f.sprite.setAlpha(alpha).setScale(f.baseScale * (1 + f.grow * t) * this.unit(f.sprite));
      if (f.text.visible) f.text.setAlpha(alpha).setY(f.text.y - (f.rise * dt) / 1000);
    }
  }

  /** A wave is cleared once every enemy in it has come in and fallen; the next one follows a short pause. */
  private checkWave(dt: number) {
    if (this.state.phase === 'wave') {
      if (this.enemiesToCome() === 0 && this.enemies.live().length === 0) {
        this.state.phase = 'break';
        this.breakClock = 0;
        this.state.placing = false;
        // The wave's scrap is banked.
        saveScrap(this.state.bank + this.state.scrap);
        this.showBanner(`WAVE ${this.state.wave} CLEARED!`);
        // A boss leaves a supply drop behind: the game waits for a pick.
        if (isBossWave(this.state.wave)) {
          this.state.phase = 'supply';
          this.state.offer = supplyPick();
          this.showSupply();
        }
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
      // A riot shield's points, in blue under the health bar.
      if (e.shield > 0 && e.shield < e.maxShield) {
        const sw = r * 2, sy = e.y + r + 4;
        g.fillStyle(num(comic ? th.ink : '#020a05'), 0.8).fillRect(e.x - r - 1, sy - 1, sw + 2, 5);
        g.fillStyle(num(SHIELD_COLOR)).fillRect(e.x - r, sy, (sw * e.shield) / e.maxShield, 3);
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
    // Where acid is about to land: a ring on the squad's line.
    for (const a of this.acids.all) {
      if (!a.alive || a.flight <= 0) continue;
      const col = num(comic ? ACID_COLOR : th.warn);
      if (comic) g.lineStyle(4, num(th.ink)).strokeEllipse(a.x, HERO.y + 6, a.r * 2, a.r * 0.72);
      g.lineStyle(2, col).strokeEllipse(a.x, HERO.y + 6, a.r * 2, a.r * 0.72);
    }
    // A boss winding up a move shows what is coming and where.
    const act = this.bossAct, boss = this.enemies.all.find((e) => e.alive && e.kind === 'boss');
    if (act && boss && !act.acting) {
      // Orange, never red: a red ring with a line through it would read as a red crosshair.
      const col = num(comic ? '#ff9a2a' : th.warn), dy = BOSS.chargeDrop;
      if (act.move === 'charge') {
        // The path of the lunge, and where it ends.
        if (comic) g.lineStyle(9, num(th.ink)).lineBetween(boss.x, boss.y, act.tx, boss.y + dy);
        g.lineStyle(5, col, 0.9).lineBetween(boss.x, boss.y, act.tx, boss.y + dy);
        // Where it lands: an arrowhead at the end of the path.
        const ang = Math.atan2(dy, act.tx - boss.x), hx = act.tx, hy = boss.y + dy, k = 16;
        const p1 = { x: hx - Math.cos(ang - 0.5) * k, y: hy - Math.sin(ang - 0.5) * k }, p2 = { x: hx - Math.cos(ang + 0.5) * k, y: hy - Math.sin(ang + 0.5) * k };
        g.fillStyle(col).fillTriangle(hx, hy, p1.x, p1.y, p2.x, p2.y);
        if (comic) g.lineStyle(2, num(th.ink)).strokeTriangle(hx, hy, p1.x, p1.y, p2.x, p2.y);
      } else if (act.move === 'spit') {
        const r = BOSS.spitRadius;
        if (comic) g.lineStyle(4, num(th.ink)).strokeEllipse(act.tx, HERO.y + 6, r * 2, r * 0.72);
        g.lineStyle(2, num(comic ? ACID_COLOR : th.warn)).strokeEllipse(act.tx, HERO.y + 6, r * 2, r * 0.72);
      } else {
        g.lineStyle(comic ? 3 : 1.5, col).strokeCircle(boss.x, boss.y, ENEMIES.boss.radius + 14);
      }
    }
    // Placing a sandbag wall: every lane lights up, with where its wall would stand.
    if (this.state.placing) {
      const col = num(comic ? '#ffd23f' : th.accent);
      for (const l of LANES) {
        g.fillStyle(col, 0.1).fillRect(l.x0 + 3, HUD_HEIGHT + 30, l.x1 - l.x0 - 6, REACH_Y - HUD_HEIGHT - 40);
        g.lineStyle(2, col, 0.8).strokeRect(l.x0 + 3, WALL.y - 14, l.x1 - l.x0 - 6, 28);
      }
    }
    this.placeHint.setText(this.style === 'comic' ? 'TAP A LANE FOR\nTHE SANDBAG WALL!' : 'SELECT LANE\nFOR SANDBAG WALL').setVisible(this.state.placing);
    // A boss also gets a big bar along the top of the screen, under the progress strip.
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
      sandbags: s.sandbags,
      placing: s.placing,
      flames: s.flames,
      medkits: s.medkits,
      pellets: s.pellets,
      inAcid: s.inAcid,
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
      inbound: this.pickups ? this.pickups.live().flatMap((p) => (p.upgrade === 'sandbag' ? [] : [p.upgrade])) : [],
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
    this.state.placing = false;
    this.pointerTarget = null;
    this.bossCall.setVisible(false);
    // The run's scrap goes in the bank, to spend on starting crates for the next run.
    this.state.bank += this.state.scrap;
    saveScrap(this.state.bank);
    this.updateHud();
    this.showGameOver();
    this.refreshBackdrop();
  }

  private showGameOver() {
    const th = this.theme(), comic = this.style === 'comic', s = this.state;
    const shade = this.add.rectangle(0, 0, VIEW.w, VIEW.h, comic ? 0x15121a : 0x000000, comic ? 0.6 : 0.65).setOrigin(0).setDepth(DEPTH.hud + 1);
    const title = this.add.text(VIEW.w / 2, 250, comic ? 'OVERRUN!' : 'FEED LOST: OVERRUN').setOrigin(0.5).setDepth(DEPTH.hud + 2);
    if (comic) this.font(title, 52, '#e8402a', { stroke: th.ink, sw: 9 });
    else this.font(title, 30, th.warn, { glow: th.warn });
    const best = s.wave >= s.best && this.bestAtStart < s.wave ? 'A new best!' : `Best: wave ${s.best}`;
    const info = this.add
      .text(VIEW.w / 2, 310, `Reached wave ${s.wave} with ${s.kills} kills\n${best}\nScrap +${s.scrap}  ·  banked ${s.bank}`, { align: 'center' })
      .setOrigin(0.5, 0)
      .setDepth(DEPTH.hud + 2);
    const body = (t: Phaser.GameObjects.Text, size: number, color = comic ? '#fff8e8' : th.text) =>
      this.font(t, size, color, comic ? { stroke: th.ink, sw: 5 } : { glow: color });
    body(info, 20);
    // The scrap shop: starting crates for the next run, each bought once, tapped again to refund.
    const head = this.add.text(VIEW.w / 2, 440, comic ? 'SPEND SCRAP: START THE NEXT RUN WITH...' : 'NEXT RUN LOADOUT (SCRAP)').setOrigin(0.5).setDepth(DEPTH.hud + 2);
    body(head, 14, comic ? '#ffe04a' : th.accent);
    const g = this.add.graphics().setDepth(DEPTH.hud + 2);
    const objs: Phaser.GameObjects.GameObject[] = [shade, title, info, head, g];
    this.shop = [];
    UPGRADE_KINDS.forEach((kind, i) => {
      const w = 220, h = 54, x = i % 2 ? VIEW.w / 2 + 8 : VIEW.w / 2 - 8 - w, y = 466 + Math.floor(i / 2) * (h + 14);
      const bought = s.nextKit.includes(kind), afford = bought || s.bank >= KIT_COSTS[kind];
      const col = UPGRADE_COLORS[kind];
      if (comic) {
        g.fillStyle(num(th.ink)).fillRect(x + 4, y + 4, w, h);
        g.fillStyle(num(bought ? col : afford ? '#fff8e8' : '#8a8494')).fillRect(x, y, w, h);
        g.lineStyle(2.5, num(th.ink)).strokeRect(x, y, w, h);
        g.fillStyle(num(col)).fillRect(x + 8, y + 8, 12, h - 16);
        g.lineStyle(1.4, num(th.ink)).strokeRect(x + 8, y + 8, 12, h - 16);
      } else {
        g.fillStyle(num(bought ? col : '#020a05'), bought ? 0.3 : 0.8).fillRoundedRect(x, y, w, h, 3);
        g.lineStyle(1.5, num(afford ? col : th.muted), afford ? 1 : 0.5).strokeRoundedRect(x, y, w, h, 3);
        g.fillStyle(num(col)).fillRect(x + 8, y + 10, 5, h - 20);
      }
      const ink = comic ? th.ink : afford ? th.text : th.muted;
      const name = this.add.text(x + 30, y + 17, UPGRADES[kind].label.toUpperCase()).setOrigin(0, 0.5).setDepth(DEPTH.hud + 3);
      this.font(name, 14, ink, comic ? {} : { glow: ink });
      const cost = this.add.text(x + 30, y + 38, bought ? (comic ? 'BOUGHT! TAP TO REFUND' : 'LOADED · TAP TO REFUND') : `${KIT_COSTS[kind]} SCRAP`).setOrigin(0, 0.5).setDepth(DEPTH.hud + 3);
      this.font(cost, 11, comic ? th.ink : afford ? th.accent : th.muted);
      objs.push(name, cost);
      this.shop.push({ kind, x, y, w, h });
    });
    const again = this.add.text(VIEW.w / 2, 640, 'Tap anywhere else to try again').setOrigin(0.5).setDepth(DEPTH.hud + 2);
    body(again, 20);
    objs.push(again);
    this.overText = objs;
  }

  /** Buys a starting crate for the next run with banked scrap, or refunds it. */
  private buyKit(kind: UpgradeKind) {
    const s = this.state;
    if (s.nextKit.includes(kind)) {
      s.nextKit = s.nextKit.filter((k) => k !== kind);
      s.bank += KIT_COSTS[kind];
    } else if (s.bank >= KIT_COSTS[kind]) {
      s.nextKit = [...s.nextKit, kind];
      s.bank -= KIT_COSTS[kind];
    } else return;
    saveScrap(s.bank);
    saveKit(s.nextKit);
    for (const t of this.overText) t.destroy();
    this.showGameOver();
  }

  /** The supply drop after a boss: three cards to pick one from. */
  private showSupply() {
    for (const o of this.supplyUi) o.destroy();
    this.tweens.killTweensOf(this.banner);
    this.banner.setAlpha(0);
    const th = this.theme(), comic = this.style === 'comic';
    const shade = this.add.rectangle(0, 0, VIEW.w, VIEW.h, comic ? 0x15121a : 0x000000, comic ? 0.5 : 0.55).setOrigin(0).setDepth(DEPTH.hud + 1);
    const title = this.add.text(VIEW.w / 2, 300, comic ? 'SUPPLY DROP!\nPICK ONE' : 'SUPPLY DROP\nSELECT ONE', { align: 'center' }).setOrigin(0.5).setDepth(DEPTH.hud + 2);
    if (comic) this.font(title, 34, '#ffe04a', { stroke: th.ink, sw: 8 });
    else this.font(title, 26, th.accent, { glow: th.accent });
    const g = this.add.graphics().setDepth(DEPTH.hud + 2);
    this.supplyUi = [shade, title, g];
    this.cards = [];
    this.state.offer.forEach((kind, i) => {
      const w = 160, h = 230, x = 18 + i * (w + 11), y = 370;
      if (comic) {
        g.fillStyle(num(th.ink)).fillRect(x + 5, y + 5, w, h);
        g.fillStyle(num('#fff8e8')).fillRect(x, y, w, h);
        g.lineStyle(3, num(th.ink)).strokeRect(x, y, w, h);
        g.fillStyle(num('#ffd23f')).fillRect(x, y, w, 30);
        g.lineStyle(2, num(th.ink)).lineBetween(x, y + 30, x + w, y + 30);
      } else {
        g.fillStyle(num('#020a05'), 0.85).fillRoundedRect(x, y, w, h, 4);
        g.lineStyle(1.5, num(th.accent)).strokeRoundedRect(x, y, w, h, 4);
      }
      const key = this.add.text(x + w / 2, y + 15, `${i + 1}`).setOrigin(0.5).setDepth(DEPTH.hud + 3);
      this.font(key, 14, comic ? th.ink : th.accent, comic ? {} : { glow: th.accent });
      const icon = this.add.image(x + w / 2, y + 82, tex(this.style, `supply-${kind}`)).setDepth(DEPTH.hud + 3);
      icon.setScale((GEOM.supply.w / icon.frame.width) * 1.1);
      const name = this.add.text(x + w / 2, y + 136, SUPPLIES[kind].label.toUpperCase()).setOrigin(0.5).setDepth(DEPTH.hud + 3);
      this.font(name, comic ? 17 : 15, comic ? th.ink : th.text, comic ? {} : { glow: th.text });
      const detail = this.add.text(x + w / 2, y + 156, SUPPLIES[kind].detail, { align: 'center' }).setOrigin(0.5, 0).setDepth(DEPTH.hud + 3);
      this.font(detail, 11, comic ? th.ink : th.muted);
      this.supplyUi.push(key, icon, name, detail);
      this.cards.push({ kind, x, y, w, h });
    });
  }

  private pickSupply(kind: SupplyKind | undefined) {
    const s = this.state;
    if (!kind || s.phase !== 'supply') return;
    if (kind === 'shotgun') s.pellets = Math.min(SHOTGUN.maxPairs, s.pellets + 1);
    else if (kind === 'flamer') s.flames += FLAMER.charges;
    else if (kind === 'medkit') s.medkits++;
    else s.sandbags += 2;
    s.supplies.push(kind);
    s.offer = [];
    for (const o of this.supplyUi) o.destroy();
    this.supplyUi = [];
    this.cards = [];
    s.phase = 'break';
    this.breakClock = 0;
    this.pop(SUPPLIES[kind].label.toUpperCase(), this.style === 'comic' ? '#ffe04a' : this.theme().accent);
  }
}
