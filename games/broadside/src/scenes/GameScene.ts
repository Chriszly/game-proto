import Phaser from 'phaser';
import { SHIP_LOOKS } from '../art/art';
import { loadBestWave, saveBestWave } from '../game/save';
import { buy, repair, setSail, tick } from '../game/sim';
import { ARC, ISLANDS, newRun, offset, stats, type GameState, type Ship } from '../game/state';
import { makeButton } from '../ui/Button';
import { Harbor, type HarborAction } from '../ui/Harbor';
import { pinToScreen } from '../ui/screen';
import { FONT, HELM, HUD_HEIGHT, UI_DEPTH, VIEW } from './layout';

/** Longest simulated step, so a backgrounded tab doesn't jump the battle forward. */
const MAX_STEP_MS = 250;
/** How often each ship leaves a puff of foam in its wake. */
const WAKE_EVERY_MS = 90;
const WAKE_MS = 1400;
const HP_BAR_W = 34;

const textStyle = (size: number, color = '#f3e9d2') => ({
  fontFamily: FONT,
  fontSize: `${size}px`,
  color,
  stroke: '#0c1820',
  strokeThickness: 3,
});

export class GameScene extends Phaser.Scene {
  /** The run being played; read by the playthrough test. */
  state!: GameState;
  /** The harbor panel; the playthrough test reads where its buttons are to tap one. */
  harbor!: Harbor;
  private ships = new Map<number, Phaser.GameObjects.Image>();
  private balls = new Map<number, Phaser.GameObjects.Image>();
  private loot = new Map<number, Phaser.GameObjects.Image>();
  private sinking = new Map<number, Phaser.GameObjects.Image>();
  private floaters = new Map<number, Phaser.GameObjects.Text>();
  private wakes: { x: number; y: number; ms: number; size: number }[] = [];
  private water!: Phaser.GameObjects.TileSprite;
  private islands: { image: Phaser.GameObjects.Image; x: number; y: number }[] = [];
  /**
   * Where the player's ship is drawn. The sea wraps at its edges but this does not: it follows
   * the ship's every move, so the camera never jumps when the ship crosses an edge. Everything
   * else is drawn at its nearest copy around the player (see `place`).
   */
  private view = { x: 0, y: 0 };
  /** The player's position in the sea last frame, to move `view` by. */
  private lastPlayer = { x: 0, y: 0 };
  private arcs!: Phaser.GameObjects.Graphics;
  private bars!: Phaser.GameObjects.Graphics;
  private fx!: Phaser.GameObjects.Graphics;
  private hud!: Phaser.GameObjects.Graphics;
  private helmButtons!: Record<'port' | 'starboard', Phaser.GameObjects.Arc>;
  private waveText!: Phaser.GameObjects.Text;
  private goldText!: Phaser.GameObjects.Text;
  private infoText!: Phaser.GameObjects.Text;
  private banner!: Phaser.GameObjects.Text;
  private gameOver!: Phaser.GameObjects.Container;
  private gameOverText!: Phaser.GameObjects.Text;
  private keys!: Record<'left' | 'right' | 'a' | 'd', Phaser.Input.Keyboard.Key>;
  /** The helm button held down by the pointer, if any. */
  private pointerHelm: -1 | 0 | 1 = 0;
  private clock = 0;
  private lastWake = 0;
  private lastFrame: number | null = null;

  constructor() {
    super('Game');
  }

  create() {
    for (const map of [this.ships, this.balls, this.loot, this.sinking, this.floaters]) map.clear();
    this.wakes = [];
    this.helmLabels = [];
    this.lastFrame = null;
    this.state = newRun(loadBestWave());
    this.view = { x: this.state.player.x, y: this.state.player.y };
    this.lastPlayer = { ...this.view };

    // The water fills the screen and scrolls with the camera, so it never runs out at an edge.
    this.water = this.add.tileSprite(0, 0, VIEW.w, VIEW.h, 'water').setOrigin(0).setScrollFactor(0);
    this.islands = ISLANDS.map((i) => ({ image: this.add.image(i.x, i.y, i.key).setDepth(1), x: i.x, y: i.y }));
    this.arcs = this.add.graphics().setDepth(2);
    this.fx = this.add.graphics().setDepth(5);
    this.bars = this.add.graphics().setDepth(UI_DEPTH - 20);
    this.cameras.main.setRoundPixels(true);

    this.createHud();
    this.createHelm();
    this.harbor = new Harbor(this, (id) => this.harborAction(id));
    this.createGameOver();
    const kb = this.input.keyboard!;
    this.keys = {
      left: kb.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
      right: kb.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
      a: kb.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      d: kb.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
  }

  update(time: number) {
    // Game time from the frame's own timestamp rather than Phaser's smoothed delta, which holds
    // every step to 16ms while the page is not in focus.
    const dt = this.lastFrame === null ? 0 : Phaser.Math.Clamp(time - this.lastFrame, 0, MAX_STEP_MS);
    this.lastFrame = time;
    const s = this.state;
    const phase = s.phase;
    const left = this.keys.left.isDown || this.keys.a.isDown;
    const right = this.keys.right.isDown || this.keys.d.isDown;
    s.helm = left !== right ? (left ? -1 : 1) : this.pointerHelm;
    tick(s, dt);
    if (s.phase !== phase && (s.phase === 'harbor' || s.phase === 'over')) saveBestWave(s.bestWave);
    this.clock += dt;

    this.followPlayer();
    const cam = this.cameras.main;
    this.water.tilePositionX = cam.scrollX + this.clock / 160;
    this.water.tilePositionY = cam.scrollY + Math.sin(this.clock / 2000) * 6;
    for (const i of this.islands) {
      const at = this.place(i);
      i.image.setPosition(at.x, at.y);
    }
    this.drawWakes(dt);
    this.drawShips();
    this.drawBalls();
    this.drawLoot();
    this.drawEffects();
    this.drawArcs();
    this.drawHud();
    this.harbor.show(s.phase === 'harbor' ? s : null);
    this.gameOver.setVisible(s.phase === 'over');
    if (s.phase === 'over') {
      this.gameOverText.setText(
        `Your ship went down on wave ${s.wave}.\n${s.sunk} ships sunk and ${s.plundered} gold plundered this run.\nBest wave beaten: ${s.bestWave}.`,
      );
    }
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
        sprite = this.add.image(0, 0, `ship-${ship.kind}`).setDepth(4);
        this.ships.set(ship.id, sprite);
      }
      // A gentle roll on the swell.
      const roll = Math.sin(this.clock / 420 + ship.id) * 0.03;
      const at = this.place(ship);
      sprite.setPosition(at.x, at.y).setRotation(ship.heading + roll);
      if (ship.hitMs > 0) sprite.setTint(0xff8060).setTintMode(Phaser.TintModes.FILL);
      else sprite.clearTint();
      if (ship.kind !== 'player') this.drawHpBar(ship);
    }
    for (const [id, sprite] of this.ships) {
      if (seen.has(id)) continue;
      sprite.destroy();
      this.ships.delete(id);
    }
  }

  private drawHpBar(ship: Ship) {
    if (ship.hp >= ship.maxHp) return;
    const at = this.place(ship);
    const x = Math.round(at.x - HP_BAR_W / 2);
    const y = Math.round(at.y - SHIP_LOOKS[ship.kind].length / 2 - 12);
    const fill = Math.round((HP_BAR_W - 2) * Phaser.Math.Clamp(ship.hp / ship.maxHp, 0, 1));
    this.bars.fillStyle(0x0c1820).fillRect(x, y, HP_BAR_W, 5);
    this.bars.fillStyle(0x3a3a40).fillRect(x + 1, y + 1, HP_BAR_W - 2, 3);
    this.bars.fillStyle(0xe0584f).fillRect(x + 1, y + 1, fill, 3);
  }

  /** Foam left behind each ship's stern, fading as it spreads. */
  private drawWakes(dt: number) {
    const s = this.state;
    const sailing = s.phase === 'break' || s.phase === 'fighting';
    if (sailing && this.clock - this.lastWake >= WAKE_EVERY_MS) {
      this.lastWake = this.clock;
      for (const ship of [s.player, ...s.enemies]) {
        const back = SHIP_LOOKS[ship.kind].length / 2;
        this.wakes.push({ x: ship.x - Math.cos(ship.heading) * back, y: ship.y - Math.sin(ship.heading) * back, ms: WAKE_MS, size: SHIP_LOOKS[ship.kind].beam / 4 });
      }
    }
    for (const w of this.wakes) w.ms -= dt;
    this.wakes = this.wakes.filter((w) => w.ms > 0);
  }

  private drawBalls() {
    const seen = new Set<number>();
    for (const b of this.state.balls) {
      seen.add(b.id);
      let sprite = this.balls.get(b.id);
      if (!sprite) {
        sprite = this.add.image(0, 0, 'ball').setDepth(6);
        this.balls.set(b.id, sprite);
      }
      const at = this.place(b);
      sprite.setPosition(at.x, at.y);
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
      let sprite = this.loot.get(l.id);
      if (!sprite) {
        sprite = this.add.image(0, 0, 'loot').setDepth(3);
        this.loot.set(l.id, sprite);
      }
      // Bobbing on the water, and blinking in its last few seconds before it sinks.
      const fading = l.ms < 4000 && Math.floor(this.clock / 200) % 2 === 0;
      const at = this.place(l);
      sprite.setPosition(at.x, at.y + Math.sin(this.clock / 300 + l.id) * 2).setAlpha(fading ? 0.4 : 1);
    }
    for (const [id, sprite] of this.loot) {
      if (seen.has(id)) continue;
      sprite.destroy();
      this.loot.delete(id);
    }
  }

  private drawEffects() {
    const g = this.fx;
    g.clear();
    for (const w of this.wakes) {
      const t = 1 - w.ms / WAKE_MS;
      const at = this.place(w);
      g.fillStyle(0xe8f4f8, 0.3 * (1 - t)).fillCircle(at.x, at.y, w.size * (0.6 + t));
    }
    const sinking = new Set<number>();
    const floaters = new Set<number>();
    for (const fx of this.state.effects) {
      const t = 1 - fx.ms / fx.total;
      const e = { ...fx, ...this.place(fx) };
      if (e.kind === 'smoke') {
        g.fillStyle(0xd8d8d0, 0.7 * (1 - t)).fillCircle(e.x, e.y, 4 + t * 10);
      } else if (e.kind === 'splash') {
        g.lineStyle(2, 0xe8f4f8, 0.8 * (1 - t)).strokeCircle(e.x, e.y, 3 + t * 9);
        g.fillStyle(0xe8f4f8, 0.6 * (1 - t)).fillCircle(e.x, e.y, 3 * (1 - t) + 1);
      } else if (e.kind === 'hit') {
        g.fillStyle(0xffb040, 0.9 * (1 - t)).fillCircle(e.x, e.y, 4 + t * 8);
        g.fillStyle(0x6a5a50, 0.6 * (1 - t)).fillCircle(e.x + 4, e.y - 3 - t * 8, 3 + t * 6);
      } else if (e.kind === 'sink' && e.ship) {
        sinking.add(e.id);
        let sprite = this.sinking.get(e.id);
        if (!sprite) {
          sprite = this.add.image(e.x, e.y, `ship-${e.ship}`).setDepth(3).setTint(0x405060).setTintMode(Phaser.TintModes.MULTIPLY);
          this.sinking.set(e.id, sprite);
        }
        sprite.setPosition(e.x, e.y).setRotation((e.heading ?? 0) + t * 0.6).setScale(1 - t * 0.5).setAlpha(1 - t);
        g.lineStyle(2, 0xe8f4f8, 0.6 * (1 - t)).strokeCircle(e.x, e.y, 10 + t * 30);
      } else if (e.kind === 'coins') {
        floaters.add(e.id);
        let text = this.floaters.get(e.id);
        if (!text) {
          text = this.add.text(e.x, e.y, `+${e.gold} gold`, textStyle(14, '#f3c64e')).setOrigin(0.5).setDepth(UI_DEPTH - 10);
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

  /** Faint wedges out of each side of the player's ship: where its broadsides reach. */
  private drawArcs() {
    const g = this.arcs;
    g.clear();
    const s = this.state;
    if (s.phase !== 'fighting' && s.phase !== 'break') return;
    const p = { ...s.player, ...this.view };
    const range = stats(s).range;
    for (const side of [1, -1]) {
      const out = p.heading + (side * Math.PI) / 2;
      const ready = p.reload[side === 1 ? 'starboard' : 'port'] <= 0;
      g.fillStyle(0xffffff, ready ? 0.07 : 0.03).slice(p.x, p.y, range, out - ARC, out + ARC).fillPath();
    }
  }

  private createHud() {
    this.hud = this.add.graphics().setDepth(UI_DEPTH).setScrollFactor(0);
    const text = (x: number, y: number, size: number, color?: string) =>
      this.add.text(x, y, '', textStyle(size, color)).setDepth(UI_DEPTH + 1).setScrollFactor(0);
    this.waveText = text(16, 10, 18, '#f3c64e');
    text(124, 12, 14).setText('Hull');
    this.goldText = text(390, 12, 14, '#f3c64e');
    this.infoText = text(VIEW.w - 16, 12, 14).setOrigin(1, 0);
    this.banner = text(VIEW.w / 2, 170, 40, '#f3c64e').setOrigin(0.5).setAlign('center');
  }

  private drawHud() {
    const s = this.state;
    const g = this.hud;
    g.clear();
    g.fillStyle(0x2c2018, 0.92).fillRect(0, 0, VIEW.w, HUD_HEIGHT);
    g.fillStyle(0x5a3f2a).fillRect(0, HUD_HEIGHT - 3, VIEW.w, 3);
    this.waveText.setText(`Wave ${s.wave}`);

    // The hull's health, and under it how loaded each broadside is.
    const hx = 170;
    const hw = 200;
    g.fillStyle(0x0c1820).fillRect(hx, 10, hw, 14);
    g.fillStyle(0x3a3a40).fillRect(hx + 2, 12, hw - 4, 10);
    g.fillStyle(0x5cb85c).fillRect(hx + 2, 12, Math.round((hw - 4) * Phaser.Math.Clamp(s.player.hp / s.player.maxHp, 0, 1)), 10);
    const reload = stats(s).reloadMs;
    for (const [i, side] of (['port', 'starboard'] as const).entries()) {
      const loaded = 1 - s.player.reload[side] / reload;
      g.fillStyle(0x3a3a40).fillRect(hx + i * (hw / 2 + 2), 27, hw / 2 - 2, 5);
      g.fillStyle(loaded >= 1 ? 0xf3c64e : 0xa08850).fillRect(hx + i * (hw / 2 + 2), 27, Math.round((hw / 2 - 2) * loaded), 5);
    }
    this.goldText.setText(`Gold ${s.gold}`);
    this.infoText.setText(`Ships left ${s.toSpawn.length + s.enemies.length}   Sunk ${s.sunk}   Best wave ${s.bestWave}`);

    const breaking = s.phase === 'break';
    this.banner.setVisible(breaking).setText(`Wave ${s.wave}\nEnemy sails sighted!`).setAlpha(breaking ? Math.min(1, s.breakMs / 500) : 0);

    this.drawPointers();
    const sailing = s.phase === 'break' || s.phase === 'fighting';
    for (const [side, button] of Object.entries(this.helmButtons)) {
      const held = s.helm === (side === 'port' ? -1 : 1);
      button.setVisible(sailing).setFillStyle(held ? 0x8a5a32 : 0x2c2018, held ? 0.85 : 0.55);
    }
    for (const label of this.helmLabels) label.setVisible(sailing);
  }

  /** Arrows at the edge of the screen toward enemy ships (red) and loot (gold) out of sight. */
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
      // Where the line toward the target leaves the screen, kept clear of the top bar.
      const hx = VIEW.w / 2 - 18;
      const hy = (VIEW.h - HUD_HEIGHT) / 2 - 18;
      const k = Math.min(hx / Math.abs(Math.cos(a) || 1e-6), hy / Math.abs(Math.sin(a) || 1e-6));
      const px = VIEW.w / 2 + Math.cos(a) * k;
      const py = HUD_HEIGHT + (VIEW.h - HUD_HEIGHT) / 2 + Math.sin(a) * k;
      const tip = (d: number, off: number) => ({ x: px + Math.cos(a + off) * d, y: py + Math.sin(a + off) * d });
      g.fillStyle(color, 0.9).fillTriangle(tip(10, 0).x, tip(10, 0).y, tip(8, 2.4).x, tip(8, 2.4).y, tip(8, -2.4).x, tip(8, -2.4).y);
    };
    for (const e of this.state.enemies) mark(e, 0xe0584f);
    for (const l of this.state.loot) mark(l, 0xf3c64e);
  }

  private helmLabels: Phaser.GameObjects.Text[] = [];

  /** Two big buttons, held down to put the helm over to port or starboard, as on a phone. */
  private createHelm() {
    const make = (side: 'port' | 'starboard', dir: -1 | 1) => {
      const { x, y } = HELM[side];
      const button = this.add.circle(x, y, HELM.r, 0x2c2018, 0.55).setStrokeStyle(3, 0xc9a040).setDepth(UI_DEPTH).setScrollFactor(0);
      button.setInteractive().on('pointerdown', () => (this.pointerHelm = dir));
      const arrow = this.add.text(x, y - 8, dir < 0 ? '<' : '>', textStyle(40, '#f3e9d2')).setOrigin(0.5).setDepth(UI_DEPTH + 1).setScrollFactor(0);
      const label = this.add.text(x, y + 26, side === 'port' ? 'Port' : 'Starboard', textStyle(12)).setOrigin(0.5).setDepth(UI_DEPTH + 1).setScrollFactor(0);
      this.helmLabels.push(arrow, label);
      return button;
    };
    this.helmButtons = { port: make('port', -1), starboard: make('starboard', 1) };
    this.input.on('pointerup', () => (this.pointerHelm = 0));
    this.input.on('gameout', () => (this.pointerHelm = 0));
  }

  private createGameOver() {
    const dim = this.add.rectangle(VIEW.w / 2, VIEW.h / 2, VIEW.w, VIEW.h, 0x081420, 0.7).setInteractive();
    const panel = this.add.rectangle(VIEW.w / 2, VIEW.h / 2, 560, 280, 0x2c2018).setStrokeStyle(4, 0x8a5a32);
    const title = this.add.text(VIEW.w / 2, VIEW.h / 2 - 100, 'Sunk!', textStyle(30, '#e0584f')).setOrigin(0.5);
    this.gameOverText = this.add
      .text(VIEW.w / 2, VIEW.h / 2 - 20, '', { fontFamily: FONT, fontSize: '16px', color: '#f1e3c6', align: 'center' })
      .setOrigin(0.5);
    const again = makeButton(this, VIEW.w / 2, VIEW.h / 2 + 90, 'Sail again', () => this.scene.restart());
    this.gameOver = pinToScreen(this.add.container(0, 0, [dim, panel, title, this.gameOverText, again.button]))
      .setDepth(UI_DEPTH + 20)
      .setVisible(false);
  }
}
