import Phaser from 'phaser';
import { settings } from '../../../../shared/settings';
import { CARGO_NAMES, COLS, ROOST, ROWS, VILLAGES, key, neighbours, terrainAt, type Tile } from '../game/map';
import { buildTrack, buyUpgrade, canRemove, dispatch, newGame, openVillages, removeTrack, routable, tick, trackCost, upgradeCost } from '../game/sim';
import { POP_MS, roundGoal, type GameState, type Order } from '../game/state';
import { RAIL, WOOD } from '../art/palette';
import { makeButton } from '../ui/Button';
import {
  BUTTONS,
  FONT,
  GRID,
  HINT_Y,
  HUD_HEIGHT,
  ORDER_CARD,
  PANEL,
  PANEL_BUTTON,
  SEGMENT_GAP,
  UI_DEPTH,
  VIEW,
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
  private markers: Phaser.GameObjects.Image[] = [];

  private segments: Phaser.GameObjects.Image[] = [];
  private wings!: Phaser.GameObjects.Image;
  private wagonCargo!: Phaser.GameObjects.Image;
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
    this.markers = [];
    this.segments = [];
    this.cards = [];
    this.hearts = [];
    this.pops.clear();

    this.add.image(GRID.x, GRID.y, 'map-bg').setOrigin(0);
    this.rails = this.add.graphics().setDepth(1);
    this.hints = this.add.graphics().setDepth(2);
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

  /** A tap or drag on the grid lays track there, or takes it up while Remove track is on. */
  private onGridPointer(p: Phaser.Input.Pointer, down: boolean) {
    const t = { c: Math.floor((p.x - GRID.x) / GRID.tile), r: Math.floor((p.y - GRID.y) / GRID.tile) };
    if (t.c < 0 || t.r < 0 || t.c >= COLS || t.r >= ROWS) return;
    if (!down && (this.dragTile === null || this.dragTile === key(t))) return;
    this.dragTile = key(t);
    if (this.removeMode) removeTrack(this.state, t);
    else buildTrack(this.state, t);
  }

  private createStations() {
    const add = (t: Tile, texture: string, name: string, round: number) => {
      const { x, y } = tileCenter(t);
      const sprite = this.add.image(x, y, texture).setDepth(3);
      const label = this.add.text(x, y + 30, name, textStyle(12)).setOrigin(0.5).setDepth(3);
      this.stations.push({ sprite, label, round });
    };
    add(ROOST, 'roost', 'Roost', 1);
    for (const v of VILLAGES) add(v, `village-${v.name}`, v.name, v.round);
  }

  private createWyrm() {
    const { x, y } = tileCenter(ROOST);
    // It starts curled up below the Roost, head in the cave.
    this.trail = [];
    for (let i = 0; i <= 3 * SEGMENT_GAP; i++) this.trail.push({ x, y: y + i });
    this.headAngle = -Math.PI / 2;
    const wagon = this.add.image(0, 0, 'wagon').setDepth(5);
    const coil2 = this.add.image(0, 0, 'wyrm-coil').setDepth(5);
    const coil1 = this.add.image(0, 0, 'wyrm-coil').setDepth(5);
    this.wings = this.add.image(0, 0, 'wyrm-wings').setDepth(5);
    const head = this.add.image(0, 0, 'wyrm-head').setDepth(5);
    this.segments = [head, coil1, coil2, wagon];
    this.wagonCargo = this.add.image(0, 0, 'cargo-grain').setDepth(5).setScale(0.8).setVisible(false);
  }

  private createHud() {
    this.add.rectangle(0, 0, VIEW.w, HUD_HEIGHT, 0x2c2018).setOrigin(0).setDepth(UI_DEPTH);
    this.add.rectangle(0, HUD_HEIGHT, VIEW.w, 4, 0x5a3f2a).setOrigin(0).setDepth(UI_DEPTH);
    this.add.image(22, 22, 'coin').setDepth(UI_DEPTH);
    this.coinsText = this.add.text(38, 22, '', textStyle(18, '#f3c64e')).setOrigin(0, 0.5).setDepth(UI_DEPTH);
    for (let i = 0; i < 3; i++) this.hearts.push(this.add.image(140 + i * 26, 22, 'heart').setDepth(UI_DEPTH));
    this.roundText = this.add.text(384, 22, '', textStyle(16)).setOrigin(0.5).setDepth(UI_DEPTH);
    this.wyrmText = this.add.text(950, 22, '', textStyle(14, '#c9e8c0')).setOrigin(1, 0.5).setDepth(UI_DEPTH);
    this.add.rectangle(0, GRID.y + ROWS * GRID.tile, COLS * GRID.tile, VIEW.h, 0x2c2018).setOrigin(0).setDepth(UI_DEPTH);
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
    const mid = { x: (COLS * GRID.tile) / 2, y: GRID.y + 60 };
    this.bannerText = this.add.text(0, 0, '', textStyle(18, '#f3c64e')).setOrigin(0.5);
    const box = this.add.rectangle(0, 0, 10, 40, 0x1d1a14, 0.8).setStrokeStyle(2, 0xc9a040);
    this.banner = this.add.container(mid.x, mid.y, [box, this.bannerText]).setDepth(UI_DEPTH + 3).setVisible(false);
    this.bannerBox = box;

    const shade = this.add.rectangle(0, 0, COLS * GRID.tile, ROWS * GRID.tile, 0x0e0a08, 0.7).setOrigin(0);
    this.overText = this.add.text(COLS * GRID.tile / 2, 220 - GRID.y, '', { ...textStyle(20), align: 'center' }).setOrigin(0.5);
    const restart = makeButton(this, PANEL_BUTTON.x, PANEL_BUTTON.y - GRID.y, 160, 44, 'Play again', () => this.scene.restart());
    this.overLayer = this.add.container(GRID.x, GRID.y, [shade, this.overText, restart.container]).setDepth(UI_DEPTH + 4).setVisible(false);
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

  /** Redraws the rails when the track or the open villages change. */
  private drawTrack() {
    const s = this.state;
    const k = `${s.track.join(';')}|${s.round}`;
    if (k === this.trackKey) return;
    this.trackKey = k;
    const g = this.rails.clear();
    const line = this.lineTiles();
    const half = GRID.tile / 2;
    const tiles = [...s.track.map((k) => k.split(',').map(Number)), ...[ROOST, ...openVillages(s)].map((t) => [t.c, t.r])];
    // Beds and bridges first, then sleepers, then the rails on top.
    for (const pass of ['bed', 'sleepers', 'rails'] as const) {
      for (const [c, r] of tiles) {
        const station = !s.track.includes(`${c},${r}`);
        const { x, y } = tileCenter({ c, r });
        const arms = neighbours({ c, r }).filter((n) => s.track.includes(key(n)) || (!station && line.has(key(n))));
        if (station && !arms.length) continue;
        const bridge = !station && terrainAt(c, r) === 'river';
        if (pass === 'bed' && !station) g.fillStyle(bridge ? WOOD.base : RAIL.bed).fillRect(x - 15, y - 15, 30, 30);
        for (const n of arms) {
          const dx = n.c - c;
          const dy = n.r - r;
          // Works out the arm's box in screen space: from `a` to `b` pixels out from the centre.
          const box = (a: number, b: number, w: number, color: number, offset = 0) => {
            const lo = Math.min(a * (dx || dy), b * (dx || dy));
            const len = Math.abs(b - a);
            if (dx) g.fillStyle(color).fillRect(x + lo, y - w / 2 + offset, len, w);
            else g.fillStyle(color).fillRect(x - w / 2 + offset, y + lo, w, len);
          };
          const start = station ? 22 : 0;
          // On a corner the rails bend: each one starts where it meets its partner on the other arm.
          const other = arms.length === 2 ? arms.find((m) => m !== n)! : null;
          const bend = other && (dx ? other.r !== r : other.c !== c) ? (dx ? other.r - r : other.c - c) : 0;
          if (pass === 'bed') box(start, half, 30, bridge ? WOOD.base : RAIL.bed);
          if (pass === 'sleepers') {
            for (let d = start + 6; d < half; d += 10) box(d, d + 4, bridge ? 30 : 26, bridge ? WOOD.light : RAIL.sleeper);
            if (bridge) for (const off of [-14, 14]) box(-16, half, 3, WOOD.dark, off);
          }
          if (pass === 'rails') {
            for (const off of [-9, 9]) {
              const from = station ? start : bend ? off * bend - 1.5 : -10.5;
              box(from, half, 3, RAIL.iron, off);
              box(from, half, 1, RAIL.shine, off - 1);
            }
          }
        }
      }
    }
  }

  /** Outlines where track can go (or, while removing, which track can be taken up). */
  private drawHints() {
    const s = this.state;
    const g = this.hints.clear();
    if (s.phase !== 'play') return;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const t = { c, r };
        const x = GRID.x + c * GRID.tile + 4;
        const y = GRID.y + r * GRID.tile + 4;
        if (this.removeMode) {
          if (canRemove(s, t)) g.lineStyle(2, 0xf0a050, 0.9).strokeRect(x, y, GRID.tile - 8, GRID.tile - 8);
          continue;
        }
        const cost = trackCost(s, t);
        if (cost === null) continue;
        g.lineStyle(2, cost <= s.coins ? 0xfff2b0 : 0x6a6070, 0.4).strokeRect(x, y, GRID.tile - 8, GRID.tile - 8);
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
      m.setTexture(`cargo-${o.cargo}`).setPosition(x - 14 + n * 18, y - 34);
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
    this.trail.length = Math.min(this.trail.length, 3 * SEGMENT_GAP + 2);
    this.segments.forEach((seg, i) => {
      const p = i === 0 ? head : this.trail[Math.min(i * SEGMENT_GAP, this.trail.length - 1)];
      const ahead = i === 0 ? null : this.trail[Math.max(0, i * SEGMENT_GAP - 6)];
      const angle = ahead && (ahead.x !== p.x || ahead.y !== p.y) ? Math.atan2(ahead.y - p.y, ahead.x - p.x) : this.headAngle;
      seg.setPosition(p.x, p.y).setRotation(angle);
    });
    const coil = this.segments[1];
    this.wings.setPosition(coil.x, coil.y).setRotation(coil.rotation);
    const moving = w.path.length > 0;
    this.wings.setScale(1, moving && !settings.reduceMotion ? 0.75 + 0.25 * Math.sin(this.time.now / 90) : 1);
    const wagon = this.segments[3];
    const carried = s.orders.find((o) => o.id === w.job?.order && o.status === 'carrying');
    this.wagonCargo.setVisible(!!carried).setPosition(wagon.x, wagon.y);
    if (carried) this.wagonCargo.setTexture(`cargo-${carried.cargo}`);
  }

  private drawPops() {
    const s = this.state;
    for (const p of s.pops) {
      let t = this.pops.get(p.id);
      if (!t) {
        t = this.add.text(0, 0, p.text, textStyle(16, p.color)).setOrigin(0.5).setDepth(6);
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
      !job ? (s.queue.length ? 'Wyrm: setting off' : 'Wyrm: resting') : job.status === 'carrying' ? `Wyrm: hauling ${cargo} to ${VILLAGES[job.to].name}` : job.status === 'loading' ? `Wyrm: loading ${cargo}` : `Wyrm: off to ${VILLAGES[job.from].name}`,
    );
    this.hint.setText(
      this.removeMode
        ? 'Tap track to take it up for half its cost. Tap Remove track again to lay track.'
        : 'Tap or drag next to the line to lay track: grass 2, forest 4, bridge 6. Then tap an order.',
    );
  }

  private drawPanel() {
    const s = this.state;
    const k = s.orders.map((o) => `${o.id}:${o.status}:${o.status === 'waiting' && routable(s, o)}`).join(';');
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
    const pay = this.add.text(PANEL.w / 2 - 8, -30, `${o.pay}c`, textStyle(14, '#f3c64e')).setOrigin(1, 0);
    const route = this.add.text(left, -10, `${VILLAGES[o.from].name} > ${VILLAGES[o.to].name}`, textStyle(11, '#d8c7a6'));
    const status = this.add.text(left, 6, ok ? STATUS_TEXT[o.status] : 'No track there yet', textStyle(11, ok ? '#c9e8c0' : '#a8957a'));
    const card = this.add.container(PANEL.x, y, [bg, icon, title, pay, route, status]).setDepth(UI_DEPTH + 1);
    bg.setInteractive({ useHandCursor: true }).on('pointerdown', () => dispatch(this.state, o.id));
    return card;
  }
}
