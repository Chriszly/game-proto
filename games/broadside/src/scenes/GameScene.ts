import Phaser from 'phaser';
import { settings } from '../../../../shared/settings';
import { HI, SHIP_LOOKS } from '../art/art';
import { ORDERS } from '../game/orders';
import { loadBestWave, saveBestWave } from '../game/save';
import { ENEMIES } from '../game/ships';
import { buy, detourCourse, repair, setSail, tick } from '../game/sim';
import { ARC, ISLANDS, newRun, offset, radiusOf, reachOf, stats, type GameState, type Ship, type Side } from '../game/state';
import { makeButton } from '../ui/Button';
import { Harbor, type HarborAction } from '../ui/Harbor';
import { pinToScreen } from '../ui/screen';
import { FIRE, FONT, HELM, HUD_HEIGHT, ORDER_CARD, UI_DEPTH, VIEW } from './layout';

/** Longest simulated step, so a backgrounded tab doesn't jump the battle forward. */
const MAX_STEP_MS = 250;
/** How often each ship leaves a stroke of foam in its wake. */
const WAKE_EVERY_MS = 90;
const WAKE_MS = 1400;
const HP_BAR_W = 40;
const SIDES: Side[] = ['port', 'starboard'];

const INK = 0x2b2118;
const CREAM = 0xf6ecd2;
const OCHRE = 0xc9902e;
const WASH = 0xd6a03c;

const textStyle = (size: number, color = '#2b2118', fontStyle = 'normal', stroke?: string, strokeThickness = 0) => ({
  fontFamily: FONT,
  fontSize: `${size}px`,
  fontStyle,
  color,
  resolution: 2,
  ...(stroke ? { stroke, strokeThickness } : {}),
});

/** What a pointer is holding down. */
type Control = 'helm-port' | 'helm-starboard' | 'fire-port' | 'fire-starboard';

export class GameScene extends Phaser.Scene {
  /** The run being played; read by the playthrough test. */
  state!: GameState;
  /** The harbor panel; the playthrough test reads where its buttons are to tap one. */
  harbor!: Harbor;
  private ships = new Map<number, Phaser.GameObjects.Image>();
  private balls = new Map<number, Phaser.GameObjects.Image>();
  private loot = new Map<number, { barrel: Phaser.GameObjects.Image; label: Phaser.GameObjects.Text }>();
  private sinking = new Map<number, Phaser.GameObjects.Image>();
  private floaters = new Map<number, Phaser.GameObjects.Text>();
  private wakes: { x: number; y: number; heading: number; ms: number; size: number }[] = [];
  private sea!: Phaser.GameObjects.TileSprite;
  /**
   * Where the player's ship is drawn. The sea wraps at its edges but this does not: it follows
   * the ship's every move, so the camera never jumps when the ship crosses an edge. Everything
   * else is drawn at its nearest copy around the player (see `place`).
   */
  private view = { x: 0, y: 0 };
  /** The player's position in the sea last frame, to move `view` by. */
  private lastPlayer = { x: 0, y: 0 };
  private arcs!: Phaser.GameObjects.Graphics;
  private course!: Phaser.GameObjects.Graphics;
  private wakeLines!: Phaser.GameObjects.Graphics;
  private bars!: Phaser.GameObjects.Graphics;
  private fx!: Phaser.GameObjects.Graphics;
  private labels!: Phaser.GameObjects.Graphics;
  private hud!: Phaser.GameObjects.Graphics;
  private controls!: Phaser.GameObjects.Graphics;
  private aimLabel!: Phaser.GameObjects.Text;
  private courseLabel!: Phaser.GameObjects.Text;
  private helmImages!: Record<Side, Phaser.GameObjects.Image>;
  private fireImages!: Record<Side, Phaser.GameObjects.Image>;
  private fireCaptions!: Record<Side, Phaser.GameObjects.Text>;
  private controlHits: Phaser.GameObjects.Arc[] = [];
  private waveText!: Phaser.GameObjects.Text;
  private hullText!: Phaser.GameObjects.Text;
  private goldText!: Phaser.GameObjects.Text;
  private infoText!: Phaser.GameObjects.Text;
  private bannerTitle!: Phaser.GameObjects.Text;
  private bannerSub!: Phaser.GameObjects.Text;
  private orderCard!: Phaser.GameObjects.Container;
  private orderSeal!: Phaser.GameObjects.Image;
  private orderHead!: Phaser.GameObjects.Text;
  private orderTitle!: Phaser.GameObjects.Text;
  private orderDesc!: Phaser.GameObjects.Text;
  private gameOver!: Phaser.GameObjects.Container;
  private gameOverText!: Phaser.GameObjects.Text;
  private keys!: Record<'left' | 'right' | 'a' | 'd' | 'q' | 'e', Phaser.Input.Keyboard.Key>;
  /** Which control each pointer (finger or mouse) is holding down. */
  private held = new Map<number, Control>();
  /** A fire control pressed since the last frame, so even a tap shorter than a frame fires. */
  private tapped: Record<Side, boolean> = { port: false, starboard: false };
  private clock = 0;
  private lastWake = 0;
  private lastFrame: number | null = null;

  constructor() {
    super('Game');
  }

  create() {
    for (const map of [this.ships, this.balls, this.sinking, this.floaters]) map.clear();
    this.loot.clear();
    this.wakes = [];
    this.held.clear();
    this.tapped = { port: false, starboard: false };
    this.controlHits = [];
    this.lastFrame = null;
    this.state = newRun(loadBestWave());
    this.view = { x: this.state.player.x, y: this.state.player.y };
    this.lastPlayer = { ...this.view };

    // The chart is the whole sea; it fills the screen and scrolls with the camera, repeating where
    // the sea wraps.
    this.sea = this.add.tileSprite(0, 0, VIEW.w, VIEW.h, 'sea').setOrigin(0).setScrollFactor(0);
    this.arcs = this.add.graphics().setDepth(2);
    this.course = this.add.graphics().setDepth(2.5);
    this.wakeLines = this.add.graphics().setDepth(3);
    this.fx = this.add.graphics().setDepth(5);
    this.labels = this.add.graphics().setDepth(7);
    this.aimLabel = this.add.text(0, 0, '', textStyle(13, '#6a4410', 'bold italic')).setOrigin(0.5).setDepth(8);
    this.courseLabel = this.add.text(0, 0, '', textStyle(12, '#2b2118', 'bold italic', '#f0e2c0', 4)).setOrigin(0.5).setDepth(8);
    this.bars = this.add.graphics().setDepth(UI_DEPTH - 40);
    this.add.image(0, 0, 'frame').setOrigin(0).setScrollFactor(0).setDepth(UI_DEPTH - 30);

    this.createHud();
    this.createOrderCard();
    this.createControls();
    this.harbor = new Harbor(this, (id) => this.harborAction(id));
    this.createGameOver();
    const kb = this.input.keyboard!;
    const K = Phaser.Input.Keyboard.KeyCodes;
    this.keys = {
      left: kb.addKey(K.LEFT),
      right: kb.addKey(K.RIGHT),
      a: kb.addKey(K.A),
      d: kb.addKey(K.D),
      q: kb.addKey(K.Q),
      e: kb.addKey(K.E),
    };
  }

  update(time: number) {
    // Game time from the frame's own timestamp rather than Phaser's smoothed delta, which holds
    // every step to 16ms while the page is not in focus.
    const dt = this.lastFrame === null ? 0 : Phaser.Math.Clamp(time - this.lastFrame, 0, MAX_STEP_MS);
    this.lastFrame = time;
    const s = this.state;
    const phase = s.phase;
    this.readInput();
    tick(s, dt);
    if (s.phase !== phase && (s.phase === 'harbor' || s.phase === 'over')) saveBestWave(s.bestWave);
    this.clock += dt;

    this.followPlayer();
    const cam = this.cameras.main;
    this.sea.tilePositionX = cam.scrollX;
    this.sea.tilePositionY = cam.scrollY;
    this.drawWakes(dt);
    this.drawCourses();
    this.drawShips();
    this.drawBalls();
    this.drawLoot();
    this.drawEffects();
    this.drawArcs();
    this.drawHud();
    this.drawControls();
    this.harbor.show(s.phase === 'harbor' ? s : null);
    this.gameOver.setVisible(s.phase === 'over');
    if (s.phase === 'over') {
      this.gameOverText.setText(
        `Your ship went down on wave ${s.wave}.\n${s.sunk} ships sunk and ${s.plundered} gold plundered this run.\nBest wave beaten: ${s.bestWave}.`,
      );
    }
  }

  /** Writes the helm and the fire controls into the state, from the keys and the pointers. */
  private readInput() {
    const s = this.state;
    const holding = new Set(this.held.values());
    const pointerHelm = holding.has('helm-port') === holding.has('helm-starboard') ? 0 : holding.has('helm-port') ? -1 : 1;
    const left = this.keys.left.isDown || this.keys.a.isDown;
    const right = this.keys.right.isDown || this.keys.d.isDown;
    s.helm = left !== right ? (left ? -1 : 1) : pointerHelm;
    const sailing = s.phase === 'break' || s.phase === 'fighting';
    s.aim.port = sailing && (this.keys.q.isDown || holding.has('fire-port') || this.tapped.port);
    s.aim.starboard = sailing && (this.keys.e.isDown || holding.has('fire-starboard') || this.tapped.starboard);
    this.tapped = { port: false, starboard: false };
  }

  /** Moves `view` along with the player's ship and centres the camera on it. */
  private followPlayer() {
    const { dx, dy } = offset(this.lastPlayer, this.state.player);
    this.view.x += dx;
    this.view.y += dy;
    this.lastPlayer = { x: this.state.player.x, y: this.state.player.y };
    this.cameras.main.setScroll(Math.round(this.view.x - VIEW.w / 2), Math.round(this.view.y - VIEW.h / 2));
  }

  /**
   * Where to draw something at `p` on the sea: its copy nearest the player's ship, which is the
   * one on screen. The sea is bigger than the screen, so only one copy can ever be in sight.
   */
  private place(p: { x: number; y: number }) {
    const { dx, dy } = offset(this.state.player, p);
    return { x: this.view.x + dx, y: this.view.y + dy };
  }

  private harborAction(id: HarborAction) {
    if (id === 'sail') setSail(this.state);
    else if (id === 'repair') repair(this.state);
    else buy(this.state, id);
  }

  private drawShips() {
    const s = this.state;
    const seen = new Set<number>();
    this.bars.clear();
    for (const ship of [s.player, ...s.enemies]) {
      seen.add(ship.id);
      let sprite = this.ships.get(ship.id);
      if (!sprite) {
        sprite = this.add.image(0, 0, `ship-${ship.kind}`).setScale(1 / HI).setDepth(4);
        this.ships.set(ship.id, sprite);
      }
      // A gentle roll on the swell.
      const roll = settings.reduceMotion ? 0 : Math.sin(this.clock / 420 + ship.id) * 0.03;
      const at = this.place(ship);
      sprite.setPosition(at.x, at.y).setRotation(ship.heading + roll);
      // Reduce motion holds the hull still rather than flashing it on a hit.
      if (ship.hitMs > 0 && !settings.reduceMotion) sprite.setTint(0xffc090).setTintMode(Phaser.TintModes.MULTIPLY);
      else sprite.clearTint();
      if (ship.kind !== 'player') this.drawHpBar(ship);
      if (ship.slowMs > 0) this.drawSlowed(ship);
    }
    for (const [id, sprite] of this.ships) {
      if (seen.has(id)) continue;
      sprite.destroy();
      this.ships.delete(id);
    }
  }

  /** An enemy's hull, as a little scale bar over it once it has been hit. */
  private drawHpBar(ship: Ship) {
    if (ship.hp >= ship.maxHp) return;
    const at = this.place(ship);
    const x = Math.round(at.x - HP_BAR_W / 2);
    const y = Math.round(at.y - SHIP_LOOKS[ship.kind].length / 2 - 14);
    const fill = (HP_BAR_W - 2) * Phaser.Math.Clamp(ship.hp / ship.maxHp, 0, 1);
    const g = this.bars;
    g.fillStyle(0xf3e6c4).fillRect(x, y, HP_BAR_W, 5);
    g.fillStyle(0xb04634, 0.9).fillRect(x + 1, y + 1, fill, 3);
    g.lineStyle(0.75, INK).strokeRect(x, y, HP_BAR_W, 5);
    for (let k = 1; k < 4; k++) g.lineBetween(x + (k * HP_BAR_W) / 4, y, x + (k * HP_BAR_W) / 4, y + 5);
  }

  /** A ship slowed by chain shot: a dotted ring of tangled rigging round it. */
  private drawSlowed(ship: Ship) {
    const at = this.place(ship);
    const r = radiusOf(ship) + 7;
    const g = this.bars;
    g.fillStyle(0x7a5410, 0.9);
    const turn = settings.reduceMotion ? 0 : this.clock / 900;
    for (let k = 0; k < 18; k++) {
      const a = (k / 18) * Math.PI * 2 + turn;
      g.fillCircle(at.x + Math.cos(a) * r, at.y + Math.sin(a) * r, k % 3 === 0 ? 1.8 : 1.1);
    }
  }

  /** Engraved foam lines spreading from each ship's stern. */
  private drawWakes(dt: number) {
    const s = this.state;
    const sailing = s.phase === 'break' || s.phase === 'fighting';
    if (sailing && this.clock - this.lastWake >= WAKE_EVERY_MS) {
      this.lastWake = this.clock;
      for (const ship of [s.player, ...s.enemies]) {
        const back = SHIP_LOOKS[ship.kind].length * 0.45;
        this.wakes.push({
          x: ship.x - Math.cos(ship.heading) * back,
          y: ship.y - Math.sin(ship.heading) * back,
          heading: ship.heading,
          ms: WAKE_MS,
          size: SHIP_LOOKS[ship.kind].beam * 0.3,
        });
      }
    }
    for (const w of this.wakes) w.ms -= dt;
    this.wakes = this.wakes.filter((w) => w.ms > 0);
    const g = this.wakeLines;
    g.clear();
    for (const w of this.wakes) {
      const t = 1 - w.ms / WAKE_MS;
      const at = this.place(w);
      const spread = w.size * (1 + t * 2.2);
      const cx = Math.cos(w.heading);
      const cy = Math.sin(w.heading);
      g.lineStyle(1, INK, 0.5 * (1 - t));
      for (const side of [-1, 1]) {
        const x = at.x - cy * spread * side;
        const y = at.y + cx * spread * side;
        g.lineBetween(x - cx * 3, y - cy * 3, x + cx * 3, y + cy * 3);
      }
    }
  }

  /** The dotted course of each enemy sailing round an island, with an arrow at its end. */
  private drawCourses() {
    const s = this.state;
    const g = this.course;
    g.clear();
    let labelled = false;
    this.courseLabel.setVisible(false);
    if (s.phase !== 'fighting') return;
    for (const e of s.enemies) {
      const pts = detourCourse(s, e);
      if (pts.length < 2) continue;
      const at = this.place(e);
      const screen = pts.map((p) => ({ x: at.x + p.x - e.x, y: at.y + p.y - e.y }));
      g.fillStyle(INK, 0.75);
      let n = 0;
      for (let i = 1; i < screen.length; i++) {
        const a = screen[i - 1];
        const b = screen[i];
        const len = Math.hypot(b.x - a.x, b.y - a.y);
        for (let d = i === 1 ? 26 : 0; d < len; d += 9) {
          const k = d / len;
          g.fillCircle(a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k, n++ % 4 === 0 ? 2 : 1.3);
        }
      }
      const end = screen[screen.length - 1];
      const prev = screen[screen.length - 2];
      const dir = Math.atan2(end.y - prev.y, end.x - prev.x);
      g.lineStyle(1.5, INK, 0.85);
      g.beginPath();
      g.moveTo(end.x + Math.cos(dir + 2.6) * 10, end.y + Math.sin(dir + 2.6) * 10);
      g.lineTo(end.x + Math.cos(dir) * 3, end.y + Math.sin(dir) * 3);
      g.lineTo(end.x + Math.cos(dir - 2.6) * 10, end.y + Math.sin(dir - 2.6) * 10);
      g.strokePath();
      if (!labelled) {
        labelled = true;
        // Written beside the middle of the course, on the side away from the island.
        const mid = screen[Math.floor(screen.length / 2)];
        const isle = this.place(ISLANDS[e.detour!.island]);
        const away = Math.atan2(mid.y - isle.y, mid.x - isle.x);
        const name = ENEMIES[e.kind as keyof typeof ENEMIES].name;
        this.courseLabel
          .setText(`${name} steers round the island`)
          .setPosition(mid.x + Math.cos(away) * 22, mid.y + Math.sin(away) * 16)
          .setVisible(true);
      }
    }
  }

  private drawBalls() {
    const seen = new Set<number>();
    const g = this.fx;
    g.clear();
    for (const b of this.state.balls) {
      seen.add(b.id);
      let sprite = this.balls.get(b.id);
      if (!sprite) {
        sprite = this.add.image(0, 0, `shot-${b.shot ?? 'round'}`).setScale(1 / HI).setDepth(6);
        if (b.shot === 'powder') sprite.setOrigin(0.75, 0.5);
        this.balls.set(b.id, sprite);
      }
      const at = this.place(b);
      const dir = Math.atan2(b.vy, b.vx);
      // Chain shot tumbles as it flies.
      const spin = b.shot === 'chain' && !settings.reduceMotion ? Math.sin(this.clock / 90 + b.id) * 0.9 : 0;
      sprite.setPosition(at.x, at.y).setRotation(dir + spin);
      // Engraved motion lines behind the shot.
      const cx = Math.cos(dir);
      const cy = Math.sin(dir);
      g.lineStyle(0.75, INK, 0.5);
      for (const o of b.shot === 'grape' ? [0] : [-2.5, 2.5]) {
        g.lineBetween(at.x - cx * 7 - cy * o, at.y - cy * 7 + cx * o, at.x - cx * 18 - cy * o, at.y - cy * 18 + cx * o);
      }
    }
    for (const [id, sprite] of this.balls) {
      if (seen.has(id)) continue;
      sprite.destroy();
      this.balls.delete(id);
    }
  }

  private drawLoot() {
    const seen = new Set<number>();
    for (const l of this.state.loot) {
      seen.add(l.id);
      let item = this.loot.get(l.id);
      if (!item) {
        item = {
          barrel: this.add.image(0, 0, 'loot').setScale(1 / HI).setDepth(3),
          label: this.add.text(0, 0, 'Plunder', textStyle(11, '#2b2118', 'bold italic', '#f0e2c0', 3)).setOrigin(0.5).setDepth(3),
        };
        this.loot.set(l.id, item);
      }
      // Bobbing on the water, and blinking in its last few seconds before it sinks (held faded
      // instead with reduce motion).
      const fading = l.ms < 4000 && (settings.reduceMotion || Math.floor(this.clock / 200) % 2 === 0);
      const at = this.place(l);
      const bob = settings.reduceMotion ? 0 : Math.sin(this.clock / 300 + l.id) * 1.5;
      item.barrel.setPosition(at.x, at.y + bob).setAlpha(fading ? 0.4 : 1);
      item.label.setPosition(at.x, at.y + 22).setAlpha(fading ? 0.4 : 1);
    }
    for (const [id, item] of this.loot) {
      if (seen.has(id)) continue;
      item.barrel.destroy();
      item.label.destroy();
      this.loot.delete(id);
    }
  }

  /** A billow of cannon smoke: overlapping circles, outlined in ink where they meet the chart. */
  private cloud(x: number, y: number, r: number, alpha: number) {
    const g = this.fx;
    const puffs: [number, number, number][] = [[0, 0, r], [r * 0.75, -r * 0.3, r * 0.7], [-r * 0.7, -r * 0.2, r * 0.75], [r * 0.2, r * 0.6, r * 0.7], [-r * 0.45, r * 0.5, r * 0.6]];
    g.lineStyle(1.6, INK, alpha);
    for (const [dx, dy, pr] of puffs) g.strokeCircle(x + dx, y + dy, pr);
    g.fillStyle(0xfaf4e4, alpha);
    for (const [dx, dy, pr] of puffs) g.fillCircle(x + dx, y + dy, pr);
    g.lineStyle(0.6, INK, alpha * 0.35);
    g.beginPath();
    g.arc(x + r * 0.3, y + r * 0.35, r * 0.55, Math.PI, Math.PI * 1.5);
    g.strokePath();
  }

  private drawEffects() {
    const g = this.fx;
    const sinking = new Set<number>();
    const floaters = new Set<number>();
    for (const fx of this.state.effects) {
      const t = 1 - fx.ms / fx.total;
      const e = { ...fx, ...this.place(fx) };
      if (e.kind === 'smoke') {
        const out = e.heading ?? 0;
        const drift = 5 + t * 12;
        this.cloud(e.x + Math.cos(out) * drift, e.y + Math.sin(out) * drift, 4 + t * 6, Math.min(1, (1 - t) * 2.5));
      } else if (e.kind === 'splash') {
        const a = 1 - t;
        g.lineStyle(0.9, INK, a);
        for (let k = 0; k < 7; k++) {
          const ang = -Math.PI + (k / 6) * Math.PI;
          g.lineBetween(e.x + Math.cos(ang) * 3, e.y + Math.sin(ang) * 1.5, e.x + Math.cos(ang) * (6 + t * 4), e.y + Math.sin(ang) * (6 + t * 3));
        }
        g.strokeEllipse(e.x, e.y + 1, 18 + t * 8, 6 + t * 3);
      } else if (e.kind === 'hit') {
        const a = 1 - t;
        g.lineStyle(0.9, INK, a);
        for (let k = 0; k < 12; k++) {
          const ang = (k / 12) * Math.PI * 2 + 0.13;
          const r = (k % 2 ? 12 : 8) * (0.6 + t * 0.6);
          g.lineBetween(e.x + Math.cos(ang) * 3, e.y + Math.sin(ang) * 3, e.x + Math.cos(ang) * r, e.y + Math.sin(ang) * r);
        }
        g.fillStyle(OCHRE, a).fillCircle(e.x, e.y, 3.5);
        g.lineStyle(0.75, INK, a).strokeCircle(e.x, e.y, 3.5);
      } else if (e.kind === 'sink' && e.ship) {
        sinking.add(e.id);
        let sprite = this.sinking.get(e.id);
        if (!sprite) {
          sprite = this.add.image(e.x, e.y, `ship-${e.ship}`).setDepth(3).setTint(0x9a8460).setTintMode(Phaser.TintModes.MULTIPLY);
          this.sinking.set(e.id, sprite);
        }
        sprite.setPosition(e.x, e.y).setRotation((e.heading ?? 0) + t * 0.6).setScale((1 - t * 0.5) / HI).setAlpha(1 - t);
        g.lineStyle(1, INK, 0.6 * (1 - t));
        g.strokeEllipse(e.x, e.y, 20 + t * 60, 10 + t * 30);
        g.strokeEllipse(e.x, e.y, 10 + t * 36, 5 + t * 18);
      } else if (e.kind === 'coins') {
        floaters.add(e.id);
        let text = this.floaters.get(e.id);
        if (!text) {
          text = this.add.text(e.x, e.y, `+${e.gold} gold`, textStyle(15, '#6a4410', 'bold italic', '#f6ecd2', 4)).setOrigin(0.5).setDepth(UI_DEPTH - 50);
          this.floaters.set(e.id, text);
        }
        text.setPosition(e.x, e.y - 16 - t * 22).setAlpha(1 - t);
      }
    }
    for (const [map, seen] of [[this.sinking, sinking], [this.floaters, floaters]] as const) {
      for (const [id, obj] of map as Map<number, Phaser.GameObjects.Components.Visible & Phaser.GameObjects.GameObject>) {
        if (seen.has(id)) continue;
        obj.destroy();
        map.delete(id);
      }
    }
  }

  /**
   * The broadsides' firing arcs. At rest each is a dotted ink wedge out to the guns' full reach
   * (fainter while reloading). Held, it becomes an ochre wash out to the reach of the charge so
   * far, with a sextant scale along its rim that the charge fills.
   */
  private drawArcs() {
    const g = this.arcs;
    const lg = this.labels;
    g.clear();
    lg.clear();
    this.aimLabel.setVisible(false);
    const s = this.state;
    if (s.phase !== 'fighting' && s.phase !== 'break') return;
    const p = { ...s.player, ...this.view };
    const full = stats(s).range;
    const at = (a: number, r: number) => ({ x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r });
    for (const side of SIDES) {
      const out = p.heading + (side === 'starboard' ? Math.PI / 2 : -Math.PI / 2);
      const a0 = out - ARC;
      const a1 = out + ARC;
      const charge = s.charge[side];
      const loaded = p.reload[side] <= 0;
      if (charge === null && !s.aim[side]) {
        g.fillStyle(INK, loaded ? 0.6 : 0.25);
        for (const a of [a0, a1]) for (let d = 30; d < full; d += 9) g.fillCircle(at(a, d).x, at(a, d).y, 1.1);
        const steps = Math.round((full * ARC * 2) / 9);
        for (let k = 0; k <= steps; k++) {
          const q = at(a0 + ((a1 - a0) * k) / steps, full);
          g.fillCircle(q.x, q.y, 1.1);
        }
        continue;
      }
      const c = charge ?? 0;
      const reach = reachOf(full, c);
      g.fillStyle(WASH, 0.1).slice(p.x, p.y, reach * 0.55, a0, a1).fillPath();
      g.fillStyle(WASH, 0.24).slice(p.x, p.y, reach, a0, a1).fillPath();
      g.lineStyle(1.1, INK, 0.9);
      g.lineBetween(p.x, p.y, at(a0, reach).x, at(a0, reach).y);
      g.lineBetween(p.x, p.y, at(a1, reach).x, at(a1, reach).y);
      // The rim: a graduated band the charge fills in ochre, like the scale of a sextant.
      const r0 = reach;
      const r1 = reach + 12;
      g.lineStyle(12, CREAM, 0.95).beginPath().arc(p.x, p.y, (r0 + r1) / 2, a0, a1).strokePath();
      if (c > 0) g.lineStyle(8, OCHRE, 1).beginPath().arc(p.x, p.y, (r0 + r1) / 2, a0, a0 + (a1 - a0) * c).strokePath();
      g.lineStyle(1, INK, 1);
      g.beginPath().arc(p.x, p.y, r0, a0, a1).strokePath();
      g.beginPath().arc(p.x, p.y, r1, a0, a1).strokePath();
      for (let k = 0; k <= 40; k++) {
        const a = a0 + ((a1 - a0) * k) / 40;
        const l = k % 10 === 0 ? 12 : k % 5 === 0 ? 8 : 4;
        g.lineStyle(k % 10 === 0 ? 1 : 0.5, INK, 1).lineBetween(at(a, r1).x, at(a, r1).y, at(a, r1 - l).x, at(a, r1 - l).y);
      }
      // How far a full charge reaches, dotted, while it is still building.
      if (c < 1) {
        g.fillStyle(INK, 0.45);
        const steps = Math.round((full * ARC * 2) / 8);
        for (let k = 0; k <= steps; k++) {
          const q = at(a0 + ((a1 - a0) * k) / steps, full + 6);
          g.fillCircle(q.x, q.y, 0.8);
        }
      }
      // A label on a little cream ribbon just off the start of the rim.
      const label = !loaded ? 'Loading...' : c >= 1 ? 'Let go to fire!' : `Hold to aim: ${Math.round(c * 100)}%`;
      const spot = at(a0 - 0.05, reach + 30);
      this.aimLabel.setText(label).setPosition(spot.x, spot.y).setVisible(true);
      const w = this.aimLabel.width / 2 + 12;
      const pts = [
        { x: spot.x - w - 7, y: spot.y },
        { x: spot.x - w, y: spot.y - 10 },
        { x: spot.x + w, y: spot.y - 10 },
        { x: spot.x + w + 7, y: spot.y },
        { x: spot.x + w, y: spot.y + 10 },
        { x: spot.x - w, y: spot.y + 10 },
      ];
      lg.fillStyle(CREAM, 1).fillPoints(pts as Phaser.Math.Vector2[], true);
      lg.lineStyle(1, INK, 1).strokePoints(pts as Phaser.Math.Vector2[], true);
    }
  }

  private createHud() {
    this.add.image(0, 0, 'hud-bar').setOrigin(0).setScale(1 / HI).setScrollFactor(0).setDepth(UI_DEPTH);
    this.hud = this.add.graphics().setDepth(UI_DEPTH + 1).setScrollFactor(0);
    const text = (x: number, y: number, size: number, color: string, fontStyle: string) =>
      this.add.text(x, y, '', textStyle(size, color, fontStyle)).setDepth(UI_DEPTH + 2).setScrollFactor(0);
    this.waveText = text(62, 19, 18, '#2b2118', 'bold').setOrigin(0.5);
    text(128, 20, 15, '#2b2118', 'bold italic').setOrigin(0, 0.5).setText('Hull');
    this.hullText = text(268, 16, 11, '#2b2118', 'bold').setOrigin(0.5).setStroke('#f6ecd2', 3);
    this.goldText = text(414, 21, 17, '#6a4410', 'bold').setOrigin(0, 0.5);
    this.infoText = text(VIEW.w - 20, 21, 15, '#2b2118', 'bold italic').setOrigin(1, 0.5);
    this.bannerTitle = this.add
      .text(VIEW.w / 2, 168, '', textStyle(44, '#2b2118', 'bold', '#f0e2c0', 7))
      .setOrigin(0.5)
      .setDepth(UI_DEPTH + 2)
      .setScrollFactor(0);
    this.bannerSub = this.add
      .text(VIEW.w / 2, 212, 'Enemy sails sighted!', textStyle(22, '#6a4410', 'bold italic', '#f0e2c0', 6))
      .setOrigin(0.5)
      .setDepth(UI_DEPTH + 2)
      .setScrollFactor(0);
  }

  /** The captain's order for the wave: a note pinned under the top bar, sealed in blue wax. */
  private createOrderCard() {
    const { x, y } = ORDER_CARD;
    const card = this.add.image(0, 0, 'order-card').setOrigin(0).setScale(1 / HI);
    this.orderSeal = this.add.image(28, 33, 'seal-chain').setScale(1 / HI);
    this.orderHead = this.add.text(54, 15, '', textStyle(11, '#6a4410', 'bold italic')).setOrigin(0, 0.5);
    this.orderTitle = this.add.text(54, 32, '', textStyle(16, '#2b2118', 'bold')).setOrigin(0, 0.5);
    this.orderDesc = this.add.text(54, 49, '', textStyle(11, '#5a4a38', 'italic')).setOrigin(0, 0.5);
    this.orderCard = pinToScreen(this.add.container(x, y, [card, this.orderSeal, this.orderHead, this.orderTitle, this.orderDesc])).setDepth(UI_DEPTH - 5);
  }

  private drawHud() {
    const s = this.state;
    const g = this.hud;
    g.clear();
    this.waveText.setText(`Wave ${s.wave}`);

    // The hull as a scale bar, and under it how loaded each broadside is.
    const hx = 168;
    const hw = 200;
    const fill = (hw - 3) * Phaser.Math.Clamp(s.player.hp / s.player.maxHp, 0, 1);
    g.fillStyle(CREAM).fillRect(hx, 9, hw, 13);
    g.fillStyle(0x5a8c50, 0.85).fillRect(hx + 1.5, 10.5, fill, 10);
    g.lineStyle(0.5, 0x1e3c1e, 0.45);
    for (let x = hx + 2; x < hx + 1.5 + fill - 6; x += 3) g.lineBetween(x, 10.5, x + 6, 20.5);
    g.lineStyle(1, INK).strokeRect(hx, 9, hw, 13);
    for (let k = 1; k < 12; k++) g.lineStyle(0.6, INK).lineBetween(hx + (k * hw) / 12, 9, hx + (k * hw) / 12, k % 3 ? 12 : 14);
    this.hullText.setText(`${Math.max(0, Math.ceil(s.player.hp))} / ${s.player.maxHp}`);
    const reload = stats(s).reloadMs;
    for (const [i, side] of SIDES.entries()) {
      const loaded = Phaser.Math.Clamp(1 - s.player.reload[side] / reload, 0, 1);
      const x = hx + i * (hw / 2 + 2);
      const w = hw / 2 - 2;
      g.fillStyle(CREAM).fillRect(x, 26, w, 5);
      g.fillStyle(loaded >= 1 ? OCHRE : 0x8a6a40, loaded >= 1 ? 1 : 0.6).fillRect(x, 26, w * loaded, 5);
      g.lineStyle(0.6, INK).strokeRect(x, 26, w, 5);
    }
    this.goldText.setText(`Gold ${s.gold}`);
    this.infoText.setText(`Ships left ${s.toSpawn.length + s.enemies.length}   ❦   Sunk ${s.sunk}   ❦   Best wave ${s.bestWave}`);

    const breaking = s.phase === 'break';
    const fade = breaking ? Math.min(1, s.breakMs / 500) : 0;
    this.bannerTitle.setVisible(breaking).setText(`Wave ${s.wave}`).setAlpha(fade);
    this.bannerSub.setVisible(breaking).setAlpha(fade);

    const sailing = s.phase === 'break' || s.phase === 'fighting';
    this.orderCard.setVisible(sailing);
    const order = ORDERS[s.order];
    this.orderSeal.setTexture(`seal-${s.order}`);
    this.orderHead.setText(`Captain's order, wave ${s.wave}`);
    this.orderTitle.setText(order.title);
    this.orderDesc.setText(order.desc);

    this.drawPointers();
  }

  /** Arrows at the edge of the screen toward enemy ships (rust) and loot (ochre) out of sight. */
  private drawPointers() {
    const g = this.hud;
    const cam = this.cameras.main;
    const view = new Phaser.Geom.Rectangle(cam.scrollX, cam.scrollY, VIEW.w, VIEW.h);
    const cx = view.centerX;
    const cy = view.centerY;
    // Each arrow points the shortest way to its target, which may be over an edge of the sea.
    const mark = (target: { x: number; y: number }, color: number) => {
      const { x, y } = this.place(target);
      if (view.contains(x, y)) return;
      const a = Math.atan2(y - cy, x - cx);
      // Where the line toward the target leaves the screen, kept clear of the top bar and frame.
      const hx = VIEW.w / 2 - 22;
      const hy = (VIEW.h - HUD_HEIGHT) / 2 - 22;
      const k = Math.min(hx / Math.abs(Math.cos(a) || 1e-6), hy / Math.abs(Math.sin(a) || 1e-6));
      const px = VIEW.w / 2 + Math.cos(a) * k;
      const py = HUD_HEIGHT + (VIEW.h - HUD_HEIGHT) / 2 + Math.sin(a) * k;
      const tip = (d: number, off: number) => ({ x: px + Math.cos(a + off) * d, y: py + Math.sin(a + off) * d });
      const pts = [tip(12, 0), tip(9, 2.4), tip(4, Math.PI), tip(9, -2.4)];
      g.fillStyle(color, 0.95).fillPoints(pts as Phaser.Math.Vector2[], true);
      g.lineStyle(1, INK, 1).strokePoints(pts as Phaser.Math.Vector2[], true);
    };
    for (const e of this.state.enemies) mark(e, 0x9a4a30);
    for (const l of this.state.loot) mark(l, OCHRE);
  }

  /**
   * The helm wheels in the bottom corners, held to turn, and above each a fire control, held to
   * aim and charge that side's broadside and let go to fire. Every pointer remembers what it
   * pressed, so one thumb can hold the helm while the other fires.
   */
  private createControls() {
    const pinned = <T extends Phaser.GameObjects.Components.ScrollFactor & Phaser.GameObjects.Components.Depth>(o: T, depth: number) => {
      o.setScrollFactor(0);
      o.setDepth(depth);
      return o;
    };
    const hit = (x: number, y: number, r: number, control: Control) => {
      const area = pinned(this.add.circle(x, y, r, 0x000000, 0), UI_DEPTH + 3);
      area.setInteractive().on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        this.held.set(pointer.id, control);
        if (control === 'fire-port') this.tapped.port = true;
        if (control === 'fire-starboard') this.tapped.starboard = true;
      });
      this.controlHits.push(area);
    };
    this.helmImages = {} as Record<Side, Phaser.GameObjects.Image>;
    this.fireImages = {} as Record<Side, Phaser.GameObjects.Image>;
    this.fireCaptions = {} as Record<Side, Phaser.GameObjects.Text>;
    for (const side of SIDES) {
      const h = HELM[side];
      this.helmImages[side] = pinned(this.add.image(h.x, h.y, `helm-${side}`).setScale(1 / HI), UI_DEPTH);
      hit(h.x, h.y, HELM.r, `helm-${side}`);
      const f = FIRE[side];
      this.fireImages[side] = pinned(this.add.image(f.x, f.y, `fire-${side}`).setScale(1 / HI), UI_DEPTH);
      this.fireCaptions[side] = pinned(this.add.text(f.x, f.y - FIRE.r - 16, '', textStyle(12, '#6a4410', 'bold italic', '#f0e2c0', 4)).setOrigin(0.5), UI_DEPTH + 2);
      hit(f.x, f.y, FIRE.r, `fire-${side}`);
    }
    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => this.held.delete(pointer.id));
    this.input.on('gameout', () => this.held.clear());
    this.controls = this.add.graphics().setScrollFactor(0).setDepth(UI_DEPTH + 1);
  }

  private drawControls() {
    const s = this.state;
    const sailing = s.phase === 'break' || s.phase === 'fighting';
    const g = this.controls;
    g.clear();
    for (const hitArea of this.controlHits) hitArea.setVisible(sailing);
    const reloadMs = stats(s).reloadMs;
    for (const side of SIDES) {
      const turning = s.helm === (side === 'port' ? -1 : 1);
      this.helmImages[side].setVisible(sailing).setTexture(`helm-${side}${turning ? '-held' : ''}`);
      const aiming = s.aim[side];
      this.fireImages[side].setVisible(sailing).setTexture(`fire-${side}${aiming ? '-held' : ''}`);
      const charge = s.charge[side];
      const loaded = s.player.reload[side] <= 0;
      const caption = !aiming ? 'Hold to fire' : !loaded ? 'Loading...' : (charge ?? 0) >= 1 ? 'Let go!' : `Charge ${Math.round((charge ?? 0) * 100)}%`;
      this.fireCaptions[side].setVisible(sailing).setText(caption);
      if (!sailing) continue;
      const { x, y } = FIRE[side];
      const R = FIRE.r + 6;
      // Reloading: a thin brown arc of how loaded the guns are.
      if (!loaded) {
        const done = Phaser.Math.Clamp(1 - s.player.reload[side] / reloadMs, 0, 1);
        g.lineStyle(3, 0x8a6a40, 0.8).beginPath().arc(x, y, R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * done).strokePath();
      }
      if (charge === null) continue;
      // Charging: an ochre ring round the held button on a graduated scale.
      g.lineStyle(9, WASH, 0.35).strokeCircle(x, y, R);
      g.lineStyle(6, OCHRE, 1).beginPath().arc(x, y, R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0.001, charge)).strokePath();
      g.lineStyle(0.75, INK, 1).strokeCircle(x, y, R);
      for (let k = 0; k < 36; k++) {
        const a = (k / 36) * Math.PI * 2;
        g.lineBetween(x + Math.cos(a) * (R - 4), y + Math.sin(a) * (R - 4), x + Math.cos(a) * (R + 4), y + Math.sin(a) * (R + 4));
      }
    }
  }

  private createGameOver() {
    const dim = this.add.rectangle(VIEW.w / 2, VIEW.h / 2, VIEW.w, VIEW.h, 0x3a2a18, 0.5).setInteractive();
    const panel = this.add.image(VIEW.w / 2, VIEW.h / 2, 'panel-over');
    const title = this.add.text(VIEW.w / 2, VIEW.h / 2 - 98, 'Sunk!', textStyle(34, '#2b2118', 'bold')).setOrigin(0.5);
    this.gameOverText = this.add
      .text(VIEW.w / 2, VIEW.h / 2 - 18, '', { ...textStyle(16, '#3a2c20', 'italic'), align: 'center', lineSpacing: 6 })
      .setOrigin(0.5);
    const again = makeButton(this, VIEW.w / 2, VIEW.h / 2 + 88, 'Sail again', () => this.scene.restart());
    this.gameOver = pinToScreen(this.add.container(0, 0, [dim, panel, title, this.gameOverText, again.button]))
      .setDepth(UI_DEPTH + 20)
      .setVisible(false);
  }
}
