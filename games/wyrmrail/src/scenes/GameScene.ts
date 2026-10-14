import Phaser from 'phaser';
import { settings } from '../../../../shared/settings';
import { CARGO_NAMES, COLS, ROOST, ROWS, VILLAGES, inGrid, key, neighbours, terrainAt, type Tile } from '../game/map';
import {
  buildTrack,
  buyUpgrade,
  canRemove,
  dispatch,
  newGame,
  openVillages,
  orderPay,
  removeTrack,
  routable,
  throwSwitch,
  tick,
  trackCost,
  upgradeCost,
} from '../game/sim';
import { POP_MS, roundGoal, type GameState, type Order } from '../game/state';
import { RAIL, WOOD } from '../art/palette';
import { LOAD_LIFT, PART_ORIGIN } from '../art/sprites';
import { PROP } from '../art/valley';
import { makeButton } from '../ui/Button';
import {
  BOARD,
  BUTTONS,
  FONT,
  HINT_Y,
  HUD_HEIGHT,
  ORDER_CARD,
  PANEL,
  PANEL_BUTTON,
  SEGMENT_GAPS,
  UI_DEPTH,
  VIEW,
  groundDepth,
  iso,
  tileAt,
  tileCenter,
} from './layout';

/** Longest simulated step, so a backgrounded tab doesn't jump the game forward. */
const MAX_STEP_MS = 250;

/** Where an order card is on screen; read by the playthrough test to tap it. */
export interface OrderSpot {
  id: number;
  x: number;
  y: number;
}

const textStyle = (size: number, color = '#f3e9d2') => ({
  fontFamily: FONT,
  fontSize: `${size}px`,
  color,
  stroke: '#1d1a14',
  strokeThickness: 4,
});

const STATUS_TEXT: Record<Order['status'], string> = {
  waiting: 'Tap to send the wyrm',
  queued: 'Queued',
  loading: 'Loading...',
  carrying: 'On the way',
};

type Button = ReturnType<typeof makeButton>;

export class GameScene extends Phaser.Scene {
  /** The game being played; read by the playthrough test. */
  state!: GameState;
  /** The order cards on the panel; read by the playthrough test. */
  orderSpots: OrderSpot[] = [];

  private removeMode = false;
  private lastFrame = 0;
  private dragTile: string | null = null;

  private hints!: Phaser.GameObjects.Graphics;
  private rails!: Phaser.GameObjects.Graphics;
  private trackKey = '';
  private stations: { sprite: Phaser.GameObjects.Image; label: Phaser.GameObjects.Text; round: number }[] = [];
  /** The pines on each forest tile, by tile key; hidden once track is laid through them. */
  private pines = new Map<string, Phaser.GameObjects.Image>();
  private markers: Phaser.GameObjects.Image[] = [];

  /** The head, three coils and two wagons, front to back. */
  private segments: Phaser.GameObjects.Image[] = [];
  private wings!: Phaser.GameObjects.Image;
  private wagonCargo: Phaser.GameObjects.Image[] = [];
  /** Where the head has been, newest first; the coils and the wagon follow it. */
  private trail: { x: number; y: number }[] = [];
  private headAngle = 0;

  private pops = new Map<number, Phaser.GameObjects.Text>();

  private coinsText!: Phaser.GameObjects.Text;
  private hearts: Phaser.GameObjects.Image[] = [];
  private roundText!: Phaser.GameObjects.Text;
  private wyrmText!: Phaser.GameObjects.Text;
  private hint!: Phaser.GameObjects.Text;

  private cards: Phaser.GameObjects.Container[] = [];
  private cardKey = '';
  private timers!: Phaser.GameObjects.Graphics;
  private wingsButton!: Button;
  private hoardButton!: Button;
  private removeButton!: Button;

  private banner!: Phaser.GameObjects.Container;
  private bannerText!: Phaser.GameObjects.Text;
  private bannerBox!: Phaser.GameObjects.Rectangle;
  private overLayer!: Phaser.GameObjects.Container;
  private overText!: Phaser.GameObjects.Text;

  constructor() {
    super('Game');
  }

  create() {
    this.state = newGame();
    this.removeMode = false;
    this.trackKey = '';
    this.cardKey = '';
    this.stations = [];
    this.pines.clear();
    this.markers = [];
    this.segments = [];
    this.cards = [];
    this.hearts = [];
    this.pops.clear();

    this.add.image(BOARD.x, BOARD.y, 'valley').setOrigin(0);
    this.rails = this.add.graphics().setDepth(1);
    this.hints = this.add.graphics().setDepth(2);
    this.createScenery();
    this.createStations();
    this.createWyrm();
    this.createHud();
    this.createPanel();
    this.createOverlays();

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.onGridPointer(p, true));
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => p.isDown && this.onGridPointer(p, false));
    this.input.on('pointerup', () => (this.dragTile = null));
    this.draw();
  }

  update(time: number) {
    const dt = this.lastFrame ? Math.min(time - this.lastFrame, MAX_STEP_MS) : 0;
    this.lastFrame = time;
    tick(this.state, dt);
    this.draw();
  }

  /**
   * A tap or drag on the valley lays track there, or takes it up while Remove track is on. A tap on
   * a junction throws its switch.
   */
  private onGridPointer(p: Phaser.Input.Pointer, down: boolean) {
    if (p.x < BOARD.x || p.x >= BOARD.x + BOARD.w || p.y < BOARD.y || p.y >= BOARD.y + BOARD.h) return;
    const t = tileAt(p.x, p.y);
    if (!inGrid(t)) return;
    if (!down && (this.dragTile === null || this.dragTile === key(t))) return;
    this.dragTile = key(t);
    if (this.removeMode) removeTrack(this.state, t);
    else if (!(down && throwSwitch(this.state, t))) buildTrack(this.state, t);
  }

  /** A prop standing on a tile, sorted with the wyrm by where it touches the ground. */
  private addProp(t: Tile, texture: string) {
    const { x, y } = tileCenter(t);
    return this.add.image(x, y, texture).setOrigin(PROP.x / PROP.w, PROP.y / PROP.h).setDepth(groundDepth(y));
  }

  /** The pines and the mountains. */
  private createScenery() {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const terrain = terrainAt(c, r);
        if (terrain === 'forest') this.pines.set(key({ c, r }), this.addProp({ c, r }, 'forest'));
        if (terrain === 'mountain') this.addProp({ c, r }, 'peak');
      }
    }
  }

  private createStations() {
    const add = (t: Tile, texture: string, name: string, round: number) => {
      const { x, y } = tileCenter(t);
      // Village cottages stand on the tile's back half, behind the wyrm passing through.
      const sprite = this.addProp(t, texture).setDepth(groundDepth(y) - (texture === 'roost' ? 0 : 12));
      const label = this.add.text(x, y + 16, name, textStyle(11)).setOrigin(0.5).setDepth(UI_DEPTH - 2);
      this.stations.push({ sprite, label, round });
    };
    add(ROOST, 'roost', 'Roost', 1);
    for (const v of VILLAGES) add(v, `village-${v.name}`, v.name, v.round);
  }

  private createWyrm() {
    const { x, y } = tileCenter(ROOST);
    // It starts curled up behind the Roost's cave mouth, out of sight.
    this.trail = [];
    const tail = SEGMENT_GAPS[SEGMENT_GAPS.length - 1];
    for (let i = 0; i <= tail; i++) this.trail.push({ x: x - i * 0.45, y: y - i * 0.22 });
    this.headAngle = 0;
    const part = (texture: string) => this.add.image(0, 0, texture).setOrigin(PART_ORIGIN.x, PART_ORIGIN.y);
    this.segments = [part('wyrm-head'), part('wyrm-coil-0'), part('wyrm-coil-1'), part('wyrm-coil-2'), part('wagon-v'), part('wagon-v')];
    this.wings = part('wyrm-wings');
    this.wagonCargo = [0, 1].map(() => this.add.image(0, 0, 'cargo-grain').setScale(0.7).setVisible(false));
  }

  private createHud() {
    this.add.rectangle(0, 0, VIEW.w, HUD_HEIGHT, 0x2c2018).setOrigin(0).setDepth(UI_DEPTH);
    this.add.rectangle(0, HUD_HEIGHT, VIEW.w, 4, 0x5a3f2a).setOrigin(0).setDepth(UI_DEPTH);
    this.add.image(22, 22, 'coin').setDepth(UI_DEPTH);
    this.coinsText = this.add.text(38, 22, '', textStyle(18, '#f3c64e')).setOrigin(0, 0.5).setDepth(UI_DEPTH);
    for (let i = 0; i < 3; i++) this.hearts.push(this.add.image(140 + i * 26, 22, 'heart').setDepth(UI_DEPTH));
    this.roundText = this.add.text(384, 22, '', textStyle(16)).setOrigin(0.5).setDepth(UI_DEPTH);
    this.wyrmText = this.add.text(950, 22, '', textStyle(14, '#c9e8c0')).setOrigin(1, 0.5).setDepth(UI_DEPTH);
    this.add.rectangle(0, BOARD.y + BOARD.h, BOARD.w, VIEW.h, 0x2c2018).setOrigin(0).setDepth(UI_DEPTH);
    this.hint = this.add.text(384, HINT_Y, '', textStyle(13, '#d8c7a6')).setOrigin(0.5).setDepth(UI_DEPTH);
  }

  private createPanel() {
    const left = PANEL.x - PANEL.w / 2 - 8;
    this.add.rectangle(left, PANEL.top, VIEW.w - left, VIEW.h - PANEL.top, 0x2c2018).setOrigin(0).setDepth(UI_DEPTH);
    this.add.rectangle(left, PANEL.top, 4, VIEW.h - PANEL.top, 0x5a3f2a).setOrigin(0).setDepth(UI_DEPTH);
    this.add.text(PANEL.x, 62, 'Orders', textStyle(16, '#f3c64e')).setOrigin(0.5).setDepth(UI_DEPTH);
    this.add.text(PANEL.x, 330, 'Upgrades', textStyle(14, '#f3c64e')).setOrigin(0.5).setDepth(UI_DEPTH);
    this.timers = this.add.graphics().setDepth(UI_DEPTH + 2);
    const button = (y: number, onClick: () => void) => {
      const b = makeButton(this, PANEL.x, y, PANEL.w, BUTTONS.h, '', onClick);
      b.container.setDepth(UI_DEPTH + 1);
      return b;
    };
    this.wingsButton = button(BUTTONS.wings, () => buyUpgrade(this.state, 'wings'));
    this.hoardButton = button(BUTTONS.hoard, () => buyUpgrade(this.state, 'hoard'));
    this.removeButton = button(BUTTONS.remove, () => (this.removeMode = !this.removeMode));
  }

  private createOverlays() {
    const mid = { x: BOARD.x + BOARD.w / 2, y: BOARD.y + 36 };
    this.bannerText = this.add.text(0, 0, '', textStyle(18, '#f3c64e')).setOrigin(0.5);
    const box = this.add.rectangle(0, 0, 10, 40, 0x1d1a14, 0.8).setStrokeStyle(2, 0xc9a040);
    this.banner = this.add.container(mid.x, mid.y, [box, this.bannerText]).setDepth(UI_DEPTH + 3).setVisible(false);
    this.bannerBox = box;

    const shade = this.add.rectangle(0, 0, BOARD.w, BOARD.h, 0x0e0a08, 0.7).setOrigin(0);
    this.overText = this.add.text(BOARD.w / 2, 220 - BOARD.y, '', { ...textStyle(20), align: 'center' }).setOrigin(0.5);
    const restart = makeButton(this, PANEL_BUTTON.x, PANEL_BUTTON.y - BOARD.y, 160, 44, 'Play again', () => this.scene.restart());
    this.overLayer = this.add.container(BOARD.x, BOARD.y, [shade, this.overText, restart.container]).setDepth(UI_DEPTH + 4).setVisible(false);
  }

  private draw() {
    const s = this.state;
    this.drawTrack();
    this.drawHints();
    for (const st of this.stations) {
      st.sprite.setVisible(st.round <= s.round);
      st.label.setVisible(st.round <= s.round);
    }
    this.drawMarkers();
    this.drawWyrm();
    this.drawPops();
    this.drawHud();
    this.drawPanel();
    if (s.banner) {
      this.bannerText.setText(s.banner.text);
      this.bannerBox.setSize(this.bannerText.width + 32, 40).setOrigin(0.5);
    }
    this.banner.setVisible(!!s.banner);
    if (s.phase === 'over' && !this.overLayer.visible) {
      this.overText.setText(`Three orders went undelivered.\nThe villages lost faith in the line.\n\nReached round ${s.round}, ${s.totalDelivered} delivered`);
    }
    this.overLayer.setVisible(s.phase === 'over');
  }

  /** The line's tiles: track, plus the open stations it runs into. */
  private lineTiles() {
    const s = this.state;
    return new Set([...s.track, key(ROOST), ...openVillages(s).map(key)]);
  }

  /** Redraws the rails when the track, the switches or the open villages change. */
  private drawTrack() {
    const s = this.state;
    const k = `${s.track.join(';')}|${s.round}|${Object.entries(s.switches).join(';')}`;
    if (k === this.trackKey) return;
    this.trackKey = k;
    for (const [tile, pines] of this.pines) pines.setVisible(!s.track.includes(tile));
    const g = this.rails.clear();
    const line = this.lineTiles();
    const tiles = [...s.track.map((k) => k.split(',').map(Number)), ...[ROOST, ...openVillages(s)].map((t) => [t.c, t.r])];
    // Each tile draws a half rail towards every arm. Ballast and bridges first, then sleepers, then rails.
    for (const pass of ['bed', 'sleepers', 'rails', 'switches'] as const) {
      for (const [c, r] of tiles) {
        const here = { c, r };
        const station = !s.track.includes(key(here));
        const arms = neighbours(here).filter((n) => s.track.includes(key(n)) || (!station && line.has(key(n))));
        const bridge = !station && terrainAt(c, r) === 'river';
        const closed = s.switches[key(here)];
        for (const n of arms) {
          const dc = n.c - c;
          const dr = n.r - r;
          // A point `t` of the way from the tile's middle to its edge towards `n`, `side` tiles across, `z` up.
          const at = (t: number, side: number, z = 0) => {
            const p = iso(c + 0.5 + dc * 0.5 * t + Math.abs(dr) * side, r + 0.5 + dr * 0.5 * t + Math.abs(dc) * side, z);
            return new Phaser.Math.Vector2(p.x, p.y);
          };
          const shut = closed === key(n);
          if (pass === 'bed') {
            g.fillStyle(bridge ? WOOD.base : RAIL.bed).fillPoints([at(0, -0.24), at(1, -0.24), at(1, 0.24), at(0, 0.24)], true);
            if (bridge) for (const side of [-0.25, 0.25]) g.lineStyle(2, WOOD.dark).lineBetween(at(-0.5, side).x, at(-0.5, side).y, at(1, side).x, at(1, side).y);
          }
          if (pass === 'sleepers') {
            for (const t of [0.12, 0.42, 0.72, 0.98]) {
              const a = at(t, -0.2, 0.5);
              const b = at(t, 0.2, 0.5);
              g.lineStyle(4.5, bridge ? WOOD.light : RAIL.sleeper).lineBetween(a.x, a.y, b.x, b.y);
            }
          }
          if (pass === 'rails') {
            for (const side of [-0.12, 0.12]) {
              const a = at(0, side, 1.5);
              const b = at(1, side, 1.5);
              g.lineStyle(3, 0x4c4b55).lineBetween(a.x, a.y + 1, b.x, b.y + 1);
              g.lineStyle(1.8, shut ? 0x8a8a94 : RAIL.shine, shut ? 0.7 : 1).lineBetween(a.x, a.y, b.x, b.y);
            }
          }
          if (pass === 'switches' && shut) {
            // A striped barrier across the arm the switch is set against.
            const a = at(0.62, -0.26, 5);
            const b = at(0.62, 0.26, 5);
            g.lineStyle(4, 0x3a2a1c).lineBetween(a.x, a.y + 1, b.x, b.y + 1);
            for (let i = 0; i < 4; i++) {
              const p = Phaser.Math.LinearXY(a, b, i / 4);
              const q = Phaser.Math.LinearXY(a, b, (i + 1) / 4);
              g.lineStyle(3, i % 2 ? 0xf7efd8 : 0xe8823a).lineBetween(p.x, p.y, q.x, q.y);
            }
            for (const end of [a, b]) g.lineStyle(1.5, 0x3a2a1c).lineBetween(end.x, end.y, end.x, end.y + 5);
          }
        }
        if (pass === 'switches' && closed) {
          // The lever on the junction's front corner.
          const foot = iso(c + 0.86, r + 0.86);
          g.fillStyle(0x1d1a14, 0.25).fillEllipse(foot.x + 3, foot.y + 1, 12, 5);
          g.fillStyle(0x4a3a2a).fillRect(foot.x - 2, foot.y - 22, 4, 22);
          g.lineStyle(4, 0xe8823a).lineBetween(foot.x, foot.y - 15, foot.x + 10, foot.y - 30);
          g.fillStyle(0xf2c14e).fillCircle(foot.x + 10, foot.y - 30, 4);
        }
      }
    }
  }

  /** Outlines where track can go (or, while removing, which track can be taken up). */
  private drawHints() {
    const s = this.state;
    const g = this.hints.clear();
    if (s.phase !== 'play') return;
    const diamond = (c: number, r: number) =>
      [iso(c + 0.1, r + 0.1), iso(c + 0.9, r + 0.1), iso(c + 0.9, r + 0.9), iso(c + 0.1, r + 0.9)].map((p) => new Phaser.Math.Vector2(p.x, p.y));
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const t = { c, r };
        if (this.removeMode) {
          if (canRemove(s, t)) g.lineStyle(2, 0xf0a050, 0.95).strokePoints(diamond(c, r), true);
          continue;
        }
        const cost = trackCost(s, t);
        if (cost === null) continue;
        const pts = diamond(c, r);
        g.fillStyle(0xfffff0, cost <= s.coins ? 0.12 : 0.05).fillPoints(pts, true);
        g.lineStyle(1.5, cost <= s.coins ? 0xfffff0 : 0x6a6070, cost <= s.coins ? 0.8 : 0.5).strokePoints(pts, true);
      }
    }
  }

  /** A cargo icon over each village with goods waiting for the wyrm. */
  private drawMarkers() {
    const s = this.state;
    const waiting = s.orders.filter((o) => o.status !== 'carrying');
    while (this.markers.length < waiting.length) this.markers.push(this.add.image(0, 0, 'cargo-grain').setDepth(4));
    const perVillage = new Map<number, number>();
    this.markers.forEach((m, i) => {
      const o = waiting[i];
      m.setVisible(!!o);
      if (!o) return;
      const n = perVillage.get(o.from) ?? 0;
      perVillage.set(o.from, n + 1);
      const { x, y } = tileCenter(VILLAGES[o.from]);
      m.setTexture(`cargo-${o.cargo}`).setPosition(x - 9 + n * 18, y - 68).setDepth(UI_DEPTH - 1);
    });
  }

  private drawWyrm() {
    const s = this.state;
    const w = s.wyrm;
    const a = tileCenter(w.at);
    const b = w.path.length ? tileCenter(w.path[0]) : a;
    const head = { x: a.x + (b.x - a.x) * w.progress, y: a.y + (b.y - a.y) * w.progress };
    if (w.path.length) this.headAngle = Math.atan2(b.y - a.y, b.x - a.x);
    const last = this.trail[0];
    const step = Math.hypot(head.x - last.x, head.y - last.y);
    // Keep a point every pixel of the head's way, so the body follows the track's corners.
    for (let i = Math.floor(step); i >= 1; i--) {
      this.trail.unshift({ x: head.x + ((last.x - head.x) * (i - 1)) / step, y: head.y + ((last.y - head.y) * (i - 1)) / step });
    }
    this.trail.length = Math.min(this.trail.length, SEGMENT_GAPS[SEGMENT_GAPS.length - 1] + 2);
    this.segments.forEach((seg, i) => {
      const gap = SEGMENT_GAPS[i];
      const p = i === 0 ? head : this.trail[Math.min(gap, this.trail.length - 1)];
      seg.setPosition(p.x, p.y).setDepth(groundDepth(p.y) + (i === 0 ? 0.5 : 0));
      // The head is drawn in profile: it looks the way the wyrm is going across the screen.
      if (i === 0 && w.path.length && Math.abs(b.x - a.x) > 0.5) seg.setFlipX(b.x < a.x);
      if (i < 4) return;
      // A wagon turns to lie along the track it is on: down-right is along the columns.
      const ahead = this.trail[Math.max(0, gap - 6)];
      const dx = ahead.x - p.x;
      const dy = ahead.y - p.y;
      const angle = dx || dy ? Math.atan2(dy, dx) : this.headAngle;
      seg.setTexture(Math.cos(angle) * Math.sin(angle) > 0 ? 'wagon-u' : 'wagon-v');
    });
    const coil = this.segments[1];
    this.wings.setPosition(coil.x, coil.y).setDepth(coil.depth + 0.2);
    const moving = w.path.length > 0 && w.switchMs <= 0;
    this.wings.setScale(1, moving && !settings.reduceMotion ? 0.75 + 0.25 * Math.sin(this.time.now / 90) : 1);
    // What the wagons carry: the orders loaded, first loaded in the front wagon.
    const carried = s.orders.filter((o) => o.status === 'carrying');
    this.wagonCargo.forEach((icon, i) => {
      const wagon = this.segments[4 + i];
      const o = carried[i];
      icon.setVisible(!!o).setPosition(wagon.x, wagon.y - LOAD_LIFT).setDepth(wagon.depth + 0.1);
      if (o) icon.setTexture(`cargo-${o.cargo}`);
    });
  }

  private drawPops() {
    const s = this.state;
    for (const p of s.pops) {
      let t = this.pops.get(p.id);
      if (!t) {
        t = this.add.text(0, 0, p.text, textStyle(16, p.color)).setOrigin(0.5).setDepth(UI_DEPTH - 1);
        this.pops.set(p.id, t);
      }
      const { x, y } = tileCenter({ c: p.x, r: p.y });
      const age = 1 - p.ms / POP_MS;
      t.setPosition(x, y - 20 - age * 30).setAlpha(Math.min(1, p.ms / 300));
    }
    for (const [id, t] of this.pops) {
      if (!s.pops.some((p) => p.id === id)) {
        t.destroy();
        this.pops.delete(id);
      }
    }
  }

  private drawHud() {
    const s = this.state;
    this.coinsText.setText(String(s.coins));
    this.hearts.forEach((h, i) => h.setTexture(i < s.hearts ? 'heart' : 'heart-empty'));
    this.roundText.setText(`Round ${s.round}: ${s.delivered}/${roundGoal(s.round)} delivered`);
    const job = s.orders.find((o) => o.id === s.wyrm.job?.order);
    const cargo = job ? CARGO_NAMES[job.cargo].toLowerCase() : '';
    this.wyrmText.setText(
      s.wyrm.switchMs > 0
        ? 'Wyrm: throwing a switch'
        : !job
          ? s.queue.length ? 'Wyrm: setting off' : 'Wyrm: resting'
          : job.status === 'carrying'
            ? `Wyrm: hauling ${cargo} to ${VILLAGES[job.to].name}`
            : job.status === 'loading'
              ? `Wyrm: loading ${cargo}`
              : `Wyrm: off to ${VILLAGES[job.from].name}`,
    );
    this.hint.setText(
      this.removeMode
        ? 'Tap track to take it up for half its cost. Tap Remove track again to lay track.'
        : Object.keys(s.switches).length
          ? 'Tap a junction to set its switch; the wyrm stops to throw one set against it.'
          : 'Tap or drag next to the line to lay track: grass 2, forest 4, bridge 6. Then tap an order.',
    );
  }

  private drawPanel() {
    const s = this.state;
    const k = `${s.upgrades.hoard}|` + s.orders.map((o) => `${o.id}:${o.status}:${o.status === 'waiting' && routable(s, o)}`).join(';');
    if (k !== this.cardKey) {
      this.cardKey = k;
      for (const c of this.cards) c.destroy();
      this.cards = s.orders.map((o, i) => this.makeCard(o, ORDER_CARD.y + i * (ORDER_CARD.h + ORDER_CARD.gap)));
      this.orderSpots = s.orders.map((o, i) => ({ id: o.id, x: PANEL.x, y: ORDER_CARD.y + i * (ORDER_CARD.h + ORDER_CARD.gap) }));
    }
    // The time left on each order, as a bar along the card's foot.
    const g = this.timers.clear();
    s.orders.forEach((o, i) => {
      const f = Math.max(0, o.timeLeftMs / o.totalMs);
      const y = ORDER_CARD.y + i * (ORDER_CARD.h + ORDER_CARD.gap) + ORDER_CARD.h / 2 - 9;
      const color = f > 0.5 ? 0x7bc85a : f > 0.25 ? 0xe8b040 : 0xe0584f;
      const blink = f < 0.25 && !settings.reduceMotion && Math.floor(this.time.now / 250) % 2 === 0;
      g.fillStyle(0x1d1a14).fillRect(PANEL.x - PANEL.w / 2 + 8, y, PANEL.w - 16, 5);
      g.fillStyle(color, blink ? 0.4 : 1).fillRect(PANEL.x - PANEL.w / 2 + 8, y, (PANEL.w - 16) * f, 5);
    });

    const cost = (u: 'wings' | 'hoard') => upgradeCost(s, u);
    const wings = cost('wings');
    const hoard = cost('hoard');
    this.wingsButton.setCaption(wings === null ? 'Swift wings: max' : `Swift wings ${s.upgrades.wings + 1}: ${wings}c`);
    this.wingsButton.setEnabled(wings !== null && wings <= s.coins);
    this.hoardButton.setCaption(hoard === null ? 'Golden hoard: max' : `Golden hoard ${s.upgrades.hoard + 1}: ${hoard}c`);
    this.hoardButton.setEnabled(hoard !== null && hoard <= s.coins);
    this.removeButton.setCaption(this.removeMode ? 'Removing track' : 'Remove track');
    this.removeButton.setLit(this.removeMode);
  }

  private makeCard(o: Order, y: number) {
    const s = this.state;
    const ok = o.status !== 'waiting' || routable(s, o);
    const bg = this.add
      .rectangle(0, 0, PANEL.w, ORDER_CARD.h, o.status === 'waiting' ? 0x3d2b1f : 0x2f4a2a)
      .setStrokeStyle(2, o.status === 'waiting' ? (ok ? 0xc9a040 : 0x6a6070) : 0x7bc85a);
    const left = -PANEL.w / 2 + 8;
    const icon = this.add.image(left + 12, -22, `cargo-${o.cargo}`);
    const title = this.add.text(left + 28, -30, CARGO_NAMES[o.cargo], textStyle(14, '#f3e9d2'));
    const pay = this.add.text(PANEL.w / 2 - 8, -30, `${orderPay(s, o)}c`, textStyle(14, '#f3c64e')).setOrigin(1, 0);
    const route = this.add.text(left, -10, `${VILLAGES[o.from].name} > ${VILLAGES[o.to].name}`, textStyle(11, '#d8c7a6'));
    const status = this.add.text(left, 6, ok ? STATUS_TEXT[o.status] : 'No track there yet', textStyle(11, ok ? '#c9e8c0' : '#a8957a'));
    const card = this.add.container(PANEL.x, y, [bg, icon, title, pay, route, status]).setDepth(UI_DEPTH + 1);
    bg.setInteractive({ useHandCursor: true }).on('pointerdown', () => dispatch(this.state, o.id));
    return card;
  }
}
