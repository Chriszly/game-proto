import Phaser from 'phaser';
import { settings } from '../../../../shared/settings';
import { CANVAS, NAME_COLOR, TINT, paintFog, paintTerrain, placeNames } from '../art/map';
import { BLUE, GOLD_DARK, GREEN, GREY, HI, INK, MAGENTA, RULE, SHEET, SLATE, TRACK, VELLUM, hex } from '../art/paint';
import { SURVEYOR_ORIGIN } from '../art/surveyor';
import { loadGame, saveGame } from '../game/save';
import {
  buy,
  chartOf,
  frontier,
  isleProgress,
  islandCharted,
  milestonesDue,
  newGame,
  returnToPort,
  sellChart,
  setSail,
  survey,
  valueOf,
} from '../game/sim';
import { GRID, MILESTONES, SELL_BACK, indexOf, maxSupplies, rankOf, type GameState, type Point, type Tile } from '../game/state';
import { CHART_ORDER, TERRAIN, isLandmark } from '../game/terrain';
import { UPGRADES, UPGRADE_IDS, nextCost } from '../game/upgrades';
import { makeButton } from '../ui/Button';
import {
  FONT,
  MAP,
  OVERLAY,
  OVERLAY_BUTTON,
  PANEL,
  RETURN_BUTTON,
  BUTTON,
  SHOP,
  SMALL_BUTTON,
  UI_DEPTH,
  VIEW,
  tileCentre,
} from './layout';

/** Longest step between frames, so a backgrounded tab doesn't jump the animations. */
const MAX_STEP_MS = 100;
/** How fast the surveyor walks between tiles, in screen pixels a second. */
const WALK_SPEED = 260;
/** How long a newly charted tile's blank paper takes to fade, and a value chip to float up. */
const REVEAL_MS = 300;
const POPUP_MS = 900;
/** How long the panel's live chart inks new tiles in magenta. */
const FRESH_MS = 1800;
/**
 * The lookout's viewshed: the sight ring sweeps out over RING_MS, the tiles' values gather into the
 * tally from GATHER_AT over GATHER_MS, and the whole thing fades out from HOLD_MS over FADE_MS.
 */
const RING_MS = 500;
const GATHER_AT = 1000;
const GATHER_MS = 350;
const HOLD_MS = 2800;
const FADE_MS = 400;

const SHEET_RECT = { x: 8, y: 12, w: 632, h: 518 };
const MAP_W = GRID.w * MAP.tile;
const MAP_H = GRID.h * MAP.tile;
/** The panel's left and right text edges. */
const PL = PANEL.x + 18;
const PR = PANEL.x + PANEL.w - 18;

interface TextOpts {
  size: number;
  weight?: number;
  color?: string;
  italic?: boolean;
  ls?: number;
  stroke?: boolean;
  wrap?: number;
}

/** A button's centre, for the playthrough test to tap. */
export interface Spot {
  x: number;
  y: number;
}

interface Popup {
  chip: Phaser.GameObjects.Container;
  age: number;
}

/** A lookout's reveal: the ring, a chip per tile and the tally they gather into. */
interface Sweep {
  age: number;
  centre: Spot;
  radius: number;
  tiles: { p: Spot; dist: number; value: number; chip: Phaser.GameObjects.Container }[];
  total: number;
  tally: Phaser.GameObjects.Container;
  tallyCount: Phaser.GameObjects.Text;
  tallyAt: Spot;
  below: boolean;
}

export class GameScene extends Phaser.Scene {
  /** The game being played; read by the playthrough test. */
  state!: GameState;
  /** Where each button on screen is, by name (`return`, `sell`, `sail`, `buy-<upgrade>`). */
  spots: Record<string, Spot> = {};
  private terrainTex!: Phaser.Textures.CanvasTexture;
  private fogTex!: Phaser.Textures.CanvasTexture;
  /** The tiles the island art was painted from, and which of them were charted when the fog was. */
  private paintedTiles: Tile[] | null = null;
  private known: boolean[] = [];
  private fading: { img: Phaser.GameObjects.Image; age: number }[] = [];
  private names: { text: Phaser.GameObjects.Text; tile: Point }[] = [];
  private hints = new Map<number, Phaser.GameObjects.Container>();
  /** When each tile was charted, by the scene's clock, for the panel's live chart. */
  private freshAt = new Map<number, number>();
  private glow!: Phaser.GameObjects.Graphics;
  private ring!: Phaser.GameObjects.Graphics;
  private hoverPill!: Phaser.GameObjects.Container;
  private surveyor!: Phaser.GameObjects.Image;
  private walker = { x: 0, y: 0 };
  private popups: Popup[] = [];
  private sweep: Sweep | null = null;
  private header!: { isle: Phaser.GameObjects.Text; sheet: Phaser.GameObjects.Text };
  private panel!: {
    isle: Phaser.GameObjects.Text;
    atlas: Phaser.GameObjects.Text;
    atlasIcon: Phaser.GameObjects.Image;
    supplies: Phaser.GameObjects.Text;
    max: Phaser.GameObjects.Text;
    unused: Phaser.GameObjects.Text;
    coins: Phaser.GameObjects.Text;
    tiles: Phaser.GameObjects.Text;
    worth: Phaser.GameObjects.Text;
    order: Phaser.GameObjects.Text;
    commission: Phaser.GameObjects.Text;
    soFar: Phaser.GameObjects.Text;
    done: Phaser.GameObjects.Text;
    swatches: Phaser.GameObjects.Image[];
    isleLabel: Phaser.GameObjects.Text;
    pct: Phaser.GameObjects.Text;
    marks: Phaser.GameObjects.Text[];
    turnBack: Phaser.GameObjects.Text;
    tag: Phaser.GameObjects.Container;
    tagText: Phaser.GameObjects.Text;
    live: Phaser.GameObjects.Graphics;
  };
  private overlay: Phaser.GameObjects.Container | null = null;
  private overlayKey = '';
  private hover: { x: number; y: number } | null = null;
  private clock = 0;
  private lastFrame: number | null = null;

  constructor() {
    super('Game');
  }

  create() {
    this.paintedTiles = null;
    this.known = [];
    this.fading = [];
    this.names = [];
    this.hints.clear();
    this.freshAt.clear();
    this.popups = [];
    this.sweep = null;
    this.overlay = null;
    this.overlayKey = '';
    this.state = loadGame() ?? newGame();

    this.drawSheet();
    this.terrainTex = this.canvasTexture('island-terrain');
    this.fogTex = this.canvasTexture('island-fog');
    this.add.image(MAP.x, MAP.y, 'island-terrain').setOrigin(0).setScale(1 / HI).setDepth(1);
    this.add.image(MAP.x, MAP.y, 'island-fog').setOrigin(0).setScale(1 / HI).setDepth(2);
    this.bakeVellum();
    this.drawNeatLine();
    this.glow = this.add.graphics().setDepth(4);
    this.ring = this.add.graphics().setDepth(5);
    const start = tileCentre(this.state.surveyor.x, this.state.surveyor.y);
    this.walker = { ...start };
    this.surveyor = this.add
      .image(start.x, start.y + MAP.tile * 0.3, 'surveyor')
      .setOrigin(SURVEYOR_ORIGIN.x, SURVEYOR_ORIGIN.y)
      .setScale(1 / HI)
      .setDepth(6);
    this.hoverPill = this.pill(0, 0, '−1 supply', 58, 13, 7.5).setDepth(8).setVisible(false);
    this.createPanel();
    this.syncIsland();

    this.input.on('pointermove', (p: Phaser.Input.Pointer) => (this.hover = this.tileAtScreen(p.x, p.y)));
    // A tap on a survey station surveys it. Taps on a button or the overlay are theirs alone.
    this.input.on('pointerdown', (p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (over.length > 0) return;
      const t = this.tileAtScreen(p.x, p.y);
      if (!t) return;
      const before = this.state.surveyed.length;
      if (!survey(this.state, t.x, t.y)) return;
      saveGame(this.state);
      this.announce(t, this.state.surveyed.slice(before));
    });
  }

  update(time: number) {
    const dt = this.lastFrame === null ? 0 : Math.min(time - this.lastFrame, MAX_STEP_MS);
    this.lastFrame = time;
    this.clock += dt;

    this.syncIsland();
    this.ageFades(dt);
    this.moveSurveyor(dt);
    this.drawGlow();
    this.agePopups(dt);
    this.ageSweep(dt);
    this.updatePanel();
    this.syncOverlay();
  }

  // ---- Helpers.

  private text(x: number, y: number, s: string, o: TextOpts) {
    const style: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: FONT,
      fontSize: `${o.size}px`,
      fontStyle: `${o.italic ? 'italic ' : ''}${o.weight ?? 600}`,
      color: o.color ?? INK,
      resolution: 2,
    };
    if (o.stroke) {
      style.stroke = SHEET;
      style.strokeThickness = 3;
    }
    if (o.wrap) style.wordWrap = { width: o.wrap };
    const t = this.add.text(x, y, s, style);
    if (o.ls) t.setLetterSpacing(o.ls);
    return t;
  }

  /** A rounded magenta label with white type, centred on (x, y). */
  private pill(x: number, y: number, caption: string, w: number, h: number, size: number) {
    const g = this.add.graphics();
    g.fillStyle(hex(MAGENTA)).fillRoundedRect(-w / 2, -h / 2, w, h, h / 2);
    const t = this.text(0, 0, caption, { size, weight: 800, color: '#ffffff' }).setOrigin(0.5);
    return this.add.container(x, y, [g, t]);
  }

  /** A value chip: "+N" in magenta on white with a magenta rim, centred on (x, y). */
  private chip(x: number, y: number, caption: string) {
    const g = this.add.graphics();
    g.fillStyle(hex(SHEET)).fillRoundedRect(-8.5, -5.5, 17, 11, 3);
    g.lineStyle(0.75, hex(MAGENTA)).strokeRoundedRect(-8.5, -5.5, 17, 11, 3);
    const t = this.text(0, 0, caption, { size: 7, weight: 800, color: MAGENTA }).setOrigin(0.5);
    return this.add.container(x, y, [g, t]).setDepth(7);
  }

  private canvasTexture(key: string) {
    if (this.textures.exists(key)) this.textures.remove(key);
    return this.textures.createCanvas(key, CANVAS.w, CANVAS.h)!;
  }

  /** One tile of blank drafting paper, laid over a tile as it is charted and faded out. */
  private bakeVellum() {
    if (this.textures.exists('vellum')) return;
    const c = document.createElement('canvas');
    c.width = c.height = MAP.tile * HI;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = VELLUM;
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.strokeStyle = 'rgba(120,130,140,0.16)';
    ctx.beginPath();
    for (let k = 0; k <= c.width; k += 20) {
      ctx.moveTo(k + 0.5, 0);
      ctx.lineTo(k + 0.5, c.height);
      ctx.moveTo(0, k + 0.5);
      ctx.lineTo(c.width, k + 0.5);
    }
    ctx.stroke();
    this.textures.addCanvas('vellum', c);
  }

  private tileAtScreen(sx: number, sy: number) {
    const x = Math.floor((sx - MAP.x) / MAP.tile);
    const y = Math.floor((sy - MAP.y) / MAP.tile);
    return x >= 0 && y >= 0 && x < GRID.w && y < GRID.h ? { x, y } : null;
  }

  // ---- The sheet.

  /** The drafting table, the survey sheet with its header, scale bar, north arrow and grid labels, and the panel card. */
  private drawSheet() {
    const g = this.add.graphics();
    g.fillStyle(0xdfe3e0).fillRect(0, 0, VIEW.w, VIEW.h);
    g.lineStyle(1, 0x506e78, 0.1);
    for (let x = 0; x < VIEW.w; x += 12) g.lineBetween(x + 0.5, 0, x + 0.5, VIEW.h);
    for (let y = 0; y < VIEW.h; y += 12) g.lineBetween(0, y + 0.5, VIEW.w, y + 0.5);
    for (const r of [SHEET_RECT, PANEL]) {
      for (let k = 1; k <= 4; k++) g.fillStyle(0x000000, 0.035).fillRect(r.x - k + 1, r.y - k + 3 + k, r.w + 2 * k - 2, r.h + 2 * k - 2);
    }
    g.fillStyle(hex(SHEET)).fillRect(SHEET_RECT.x, SHEET_RECT.y, SHEET_RECT.w, SHEET_RECT.h);
    g.fillStyle(0xffffff).fillRect(PANEL.x, PANEL.y, PANEL.w, PANEL.h);
    g.fillStyle(hex(INK)).fillRect(PANEL.x, PANEL.y, PANEL.w, 4);

    const isle = this.text(24, 31, '', { size: 15, weight: 800, ls: 2 }).setOrigin(0, 0.5);
    const sheet = this.text(86, 32, '', { size: 9, weight: 600, color: '#5b6670', ls: 1 }).setOrigin(0, 0.5);
    this.header = { isle, sheet };
    // Scale bar: two tiles in half-tile steps.
    const sx = 500;
    for (let k = 0; k < 4; k++) g.fillStyle(k % 2 ? hex(SHEET) : hex(INK)).fillRect(sx + k * 20, 32.5, 20, 5);
    g.lineStyle(0.75, hex(INK)).strokeRect(sx, 32.5, 80, 5);
    this.text(sx, 25, '0', { size: 7, weight: 500 }).setOrigin(0.5);
    this.text(sx + 80, 25, '2 tiles', { size: 7, weight: 500 }).setOrigin(0.5);
    // North arrow.
    const nx = 609;
    const ny = 33;
    g.fillStyle(hex(INK)).fillTriangle(nx, ny - 13, nx + 5.5, ny + 6, nx, ny + 2);
    g.lineStyle(0.75, hex(INK)).strokeTriangle(nx, ny - 13, nx - 5.5, ny + 6, nx, ny + 2);
    this.text(nx, ny + 13, 'N', { size: 7, weight: 800 }).setOrigin(0.5);
    // Grid letters along the top and numbers down the side.
    for (let x = 0; x < GRID.w; x++) {
      this.text(MAP.x + (x + 0.5) * MAP.tile, MAP.y - 8, String.fromCharCode(65 + x), { size: 7, color: '#7a858e' }).setOrigin(0.5);
    }
    for (let y = 0; y < GRID.h; y++) {
      this.text(MAP.x - 9, MAP.y + (y + 0.5) * MAP.tile, String(y + 1), { size: 7, color: '#7a858e' }).setOrigin(0.5);
    }
  }

  /** The neat line round the map: a heavy inner rule and a fine outer one. */
  private drawNeatLine() {
    const g = this.add.graphics().setDepth(3);
    g.lineStyle(1.5, hex(INK)).strokeRect(MAP.x - 0.75, MAP.y - 0.75, MAP_W + 1.5, MAP_H + 1.5);
    g.lineStyle(0.5, hex(INK)).strokeRect(MAP.x - 4.25, MAP.y - 4.25, MAP_W + 8.5, MAP_H + 8.5);
  }

  /**
   * Keeps the island art in step with the state: paints a new island when the tiles change (a new
   * isle or a load), and repaints the fog when tiles are charted, fading their paper out.
   */
  private syncIsland() {
    const s = this.state;
    if (s.tiles !== this.paintedTiles) {
      this.paintedTiles = s.tiles;
      paintTerrain(this.terrainTex.context, s.tiles);
      this.terrainTex.refresh();
      for (const n of this.names) n.text.destroy();
      this.names = placeNames(s.tiles, s.island, s.port).map((n) => {
        const c = tileCentre(n.tile.x, n.tile.y);
        const style: TextOpts =
          n.kind === 'water'
            ? { size: 11, weight: 500, italic: true, ls: 3 }
            : n.kind === 'height' || n.kind === 'port'
              ? { size: 7.5, weight: n.kind === 'height' ? 600 : 500, italic: n.kind === 'port' }
              : n.kind === 'ruin'
                ? { size: 8, weight: 500, italic: true }
                : { size: n.kind === 'wood' ? 9 : 9.5, weight: 600, italic: true };
        const text = this.text(c.x + n.dx, c.y + n.dy, n.text, { ...style, color: NAME_COLOR[n.kind], stroke: true })
          .setOrigin(0.5)
          .setDepth(3);
        return { text, tile: n.tile };
      });
      for (const h of this.hints.values()) h.destroy();
      this.hints.clear();
      this.known = [];
    }
    const changed = s.tiles.some((t, i) => t.revealed !== this.known[i]);
    if (changed) {
      const first = this.known.length === 0;
      s.tiles.forEach((t, i) => {
        if (!t.revealed || this.known[i] || first) return;
        const x = i % GRID.w;
        const y = Math.floor(i / GRID.w);
        const img = this.add.image(MAP.x + x * MAP.tile, MAP.y + y * MAP.tile, 'vellum').setOrigin(0).setScale(1 / HI).setDepth(2);
        this.fading.push({ img, age: 0 });
        this.freshAt.set(i, this.clock);
      });
      this.known = s.tiles.map((t) => t.revealed);
      paintFog(this.fogTex.context, s.tiles);
      this.fogTex.refresh();
      for (const n of this.names) n.text.setVisible(s.tiles[indexOf(n.tile.x, n.tile.y)].revealed);
    }
    // With the Lodestone Compass, landmarks under the paper show a gold rose and a guess.
    s.tiles.forEach((tile, i) => {
      const hinted = !tile.revealed && isLandmark(tile.terrain) && rankOf(s, 'compass') > 0;
      const hint = this.hints.get(i);
      if (hinted && !hint) {
        const c = tileCentre(i % GRID.w, Math.floor(i / GRID.w));
        const star = this.add.image(0, 0, 'landmark-hint').setScale(1 / HI);
        const label = this.text(0, 17, tile.terrain === 'village' ? 'village?' : 'ruins?', {
          size: 7.5,
          italic: true,
          color: GOLD_DARK,
          stroke: true,
        }).setOrigin(0.5);
        this.hints.set(i, this.add.container(c.x, c.y, [star, label]).setDepth(4));
      } else if (!hinted && hint) {
        hint.destroy();
        this.hints.delete(i);
      }
    });
  }

  private ageFades(dt: number) {
    for (const f of this.fading) {
      f.age += dt;
      f.img.setAlpha(Math.max(0, 1 - f.age / REVEAL_MS));
      if (f.age >= REVEAL_MS) f.img.destroy();
    }
    this.fading = this.fading.filter((f) => f.age < REVEAL_MS);
  }

  // ---- What a survey shows.

  /**
   * After a survey: a lookout (hills or a peak) that charted more than its own tile sweeps its sight
   * ring and gathers the values into one tally; any other tile floats its value up.
   */
  private announce(tapped: Point, fresh: Point[]) {
    const terrain = this.state.tiles[indexOf(tapped.x, tapped.y)].terrain;
    if ((terrain === 'hills' || terrain === 'mountain') && fresh.length > 1) {
      this.startSweep(tapped, fresh);
      return;
    }
    for (const p of fresh) {
      const v = TERRAIN[this.state.tiles[indexOf(p.x, p.y)].terrain].value;
      if (v <= 0) continue;
      const c = tileCentre(p.x, p.y);
      this.popups.push({ chip: this.chip(c.x, c.y - 4, `+${v}`), age: 0 });
    }
  }

  private agePopups(dt: number) {
    for (const p of this.popups) {
      p.age += dt;
      if (!settings.reduceMotion) p.chip.y -= (dt / POPUP_MS) * 12;
      p.chip.setAlpha(Math.max(0, Math.min(1, 2 - (2 * p.age) / POPUP_MS)));
      if (p.age >= POPUP_MS) p.chip.destroy();
    }
    this.popups = this.popups.filter((p) => p.age < POPUP_MS);
  }

  private startSweep(tapped: Point, fresh: Point[]) {
    this.endSweep();
    const s = this.state;
    const centre = tileCentre(tapped.x, tapped.y);
    const tiles = fresh.map((p) => {
      const c = tileCentre(p.x, p.y);
      const value = TERRAIN[s.tiles[indexOf(p.x, p.y)].terrain].value;
      const chip = this.chip(c.x + 11.5, c.y - 9.5, `+${value}`).setAlpha(0);
      return { p: c, dist: Math.hypot(c.x - centre.x, c.y - centre.y), value, chip };
    });
    const radius = Math.max(...tiles.map((t) => t.dist)) + MAP.tile * 0.55;
    const total = valueOf(s, fresh);
    // The tally sits above the ring, or below it near the top of the sheet.
    let ty = centre.y - radius - 24;
    const below = ty - 14 < MAP.y + 2;
    if (below) ty = Math.min(centre.y + radius + 24, MAP.y + MAP_H - 16);
    const tx = Phaser.Math.Clamp(centre.x + 5, MAP.x + 82, MAP.x + MAP_W - 82);
    const g = this.add.graphics();
    g.fillStyle(hex(MAGENTA)).fillRoundedRect(-80, -13.5, 160, 27, 4);
    const label = this.text(-71, 0, 'VIEWSHED', { size: 8, weight: 800, color: '#ffd9ec', ls: 1.5 }).setOrigin(0, 0.5);
    const count = this.text(-11, 0, `${fresh.length} tiles`, { size: 10, weight: 600, color: '#ffffff' }).setOrigin(0, 0.5);
    const sum = this.text(71, 0, '+0', { size: 15, weight: 900, color: '#ffffff' }).setOrigin(1, 0.5);
    const tally = this.add.container(tx, ty, [g, label, count, sum]).setDepth(7).setAlpha(0);
    this.sweep = { age: 0, centre, radius, tiles, total, tally, tallyCount: sum, tallyAt: { x: tx, y: ty }, below };
  }

  private endSweep() {
    if (!this.sweep) return;
    for (const t of this.sweep.tiles) t.chip.destroy();
    this.sweep.tally.destroy();
    this.sweep = null;
    this.ring.clear();
  }

  /** Plays the viewshed: ring out, chips in, values gathered into the tally, then a fade. */
  private ageSweep(dt: number) {
    const sw = this.sweep;
    if (!sw) return;
    sw.age += dt;
    const still = settings.reduceMotion;
    const t = sw.age;
    const fade = t < HOLD_MS ? 1 : Math.max(0, 1 - (t - HOLD_MS) / FADE_MS);
    if (fade <= 0) {
      this.endSweep();
      return;
    }
    const grow = still ? 1 : 1 - Math.pow(1 - Math.min(1, t / RING_MS), 3);
    const r = sw.radius * grow;
    const g = this.ring.clear();
    g.fillStyle(hex(MAGENTA), 0.07 * fade).fillCircle(sw.centre.x, sw.centre.y, r);
    // A dotted ring.
    const dots = Math.max(8, Math.floor((Math.PI * 2 * r) / 4.5));
    g.fillStyle(hex(MAGENTA), fade);
    for (let k = 0; k < dots; k++) {
      const a = (k / dots) * Math.PI * 2;
      g.fillCircle(sw.centre.x + Math.cos(a) * r, sw.centre.y + Math.sin(a) * r, 0.9);
    }
    const tallyOn = still || t >= GATHER_AT;
    if (tallyOn) {
      sw.tally.setAlpha(fade);
      const edge = sw.below ? sw.tallyAt.y - 13.5 : sw.tallyAt.y + 13.5;
      const ringEdge = sw.below ? sw.centre.y + r : sw.centre.y - r;
      g.lineStyle(1, hex(MAGENTA), fade).lineBetween(sw.centre.x, edge, sw.centre.x, ringEdge);
    }
    let gathered = 0;
    sw.tiles.forEach((tile, n) => {
      const reached = r >= tile.dist;
      if (reached) g.fillStyle(hex(MAGENTA), fade).fillCircle(tile.p.x, tile.p.y, 1.75);
      const home = { x: tile.p.x + 11.5, y: tile.p.y - 9.5 };
      if (still) {
        tile.chip.setAlpha(fade);
        gathered += tile.value;
        return;
      }
      // Each chip leaves for the tally a little after the one before it.
      const leave = GATHER_AT + n * 40;
      const k = Math.min(1, Math.max(0, (t - leave) / GATHER_MS));
      if (k >= 1) {
        tile.chip.setAlpha(0);
        gathered += tile.value;
        return;
      }
      const e = k * k * (3 - 2 * k);
      gathered += tile.value * e;
      tile.chip.setPosition(home.x + (sw.tallyAt.x + 50 - home.x) * e, home.y + (sw.tallyAt.y - home.y) * e);
      tile.chip.setAlpha(reached ? 1 - k * 0.6 : 0);
    });
    const shown = still || t > GATHER_AT + sw.tiles.length * 40 + GATHER_MS ? sw.total : gathered;
    const caption = `+${Math.round(shown)}`;
    if (sw.tallyCount.text !== caption) sw.tallyCount.setText(caption);
  }

  // ---- The surveyor and the survey stations.

  private moveSurveyor(dt: number) {
    const target = tileCentre(this.state.surveyor.x, this.state.surveyor.y);
    const dx = target.x - this.walker.x;
    const dy = target.y - this.walker.y;
    const d = Math.hypot(dx, dy);
    const step = (WALK_SPEED * dt) / 1000;
    if (d <= step || d > MAP.tile * 6) {
      // Arrived, or sailed home to the port: stand on the tile.
      this.walker = { ...target };
    } else {
      this.walker.x += (dx / d) * step;
      this.walker.y += (dy / d) * step;
    }
    const walking = d > step && d <= MAP.tile * 6;
    this.surveyor.setTexture(walking && Math.floor(this.clock / 140) % 2 === 1 ? 'surveyor-step' : 'surveyor');
    if (dx !== 0 && walking) this.surveyor.setFlipX(dx < 0);
    this.surveyor.setPosition(this.walker.x, this.walker.y + MAP.tile * 0.3);
    this.surveyor.setVisible(this.state.phase === 'survey');
  }

  /** Marks every tile that can be surveyed as a magenta survey station; the one under the pointer is lit. */
  private drawGlow() {
    const g = this.glow.clear();
    this.hoverPill.setVisible(false);
    if (this.state.phase !== 'survey' || this.state.supplies <= 0) return;
    const pulse = settings.reduceMotion ? 0.5 : 0.5 + 0.5 * Math.sin(this.clock / 300);
    const m = hex(MAGENTA);
    for (const p of frontier(this.state)) {
      const x = MAP.x + p.x * MAP.tile + 3;
      const y = MAP.y + p.y * MAP.tile + 3;
      const w = MAP.tile - 6;
      const lit = this.hover?.x === p.x && this.hover?.y === p.y;
      g.fillStyle(m, lit ? 0.16 : 0.04 + 0.05 * pulse).fillRect(x, y, w, w);
      if (lit) {
        g.lineStyle(1.75, m).strokeRect(x, y, w, w);
      } else {
        g.lineStyle(1, m);
        dashedRect(g, x, y, w, w, 5, 3);
      }
      const c = tileCentre(p.x, p.y);
      g.fillStyle(lit ? m : hex(SHEET)).fillTriangle(c.x, c.y - 5, c.x + 5, c.y + 3.5, c.x - 5, c.y + 3.5);
      g.lineStyle(1, m).strokeTriangle(c.x, c.y - 5, c.x + 5, c.y + 3.5, c.x - 5, c.y + 3.5);
      g.fillStyle(lit ? 0xffffff : m).fillCircle(c.x, c.y + 0.75, 1);
      if (lit) this.hoverPill.setPosition(c.x, c.y + 15.5).setVisible(true);
    }
  }

  // ---- The panel.

  private createPanel() {
    const label = (x: number, y: number, s: string) => this.text(x, y, s, { size: 8.5, weight: 700, color: GREY, ls: 1.5 }).setOrigin(0, 0.5);
    const g = this.add.graphics();
    const rule = (y: number) => g.fillStyle(hex(RULE)).fillRect(PL, y, PR - PL, 1);
    this.text(PL, 52, 'MAPMAKER', { size: 24, weight: 900, ls: 1 }).setOrigin(0, 0.5);
    this.add.image(PR - 9, 52, 'logo').setScale(1 / HI);
    const isle = this.text(PL, 76, '', { size: 9, weight: 700, color: GREY, ls: 1.5 }).setOrigin(0, 0.5);
    const atlas = this.text(PR, 76, '', { size: 8.5, weight: 700, color: GREY, ls: 1 }).setOrigin(1, 0.5);
    const atlasIcon = this.add.image(PR - 60, 76, 'atlas-empty').setScale(1 / HI);
    rule(91);
    label(PL, 107, 'SUPPLIES');
    const supplies = this.text(PL, 129, '', { size: 22, weight: 800 }).setOrigin(0, 0.5);
    const max = this.text(PL + 15, 132, '', { size: 12, weight: 600, color: GREY }).setOrigin(0, 0.5);
    const unused = this.text(PL + 55, 152, `unused: ${SELL_BACK}c each on return`, { size: 8, weight: 600, color: MAGENTA }).setOrigin(0, 0.5);
    rule(163);
    label(PL, 178, 'COINS');
    const coins = this.text(PL, 199, '', { size: 22, weight: 800 }).setOrigin(0, 0.5);
    label(PL + 95, 178, 'THIS CHART');
    const tiles = this.text(PL + 95, 196, '', { size: 13, weight: 700 }).setOrigin(0, 0.5);
    const worth = this.text(PL + 95, 212, '', { size: 11, weight: 600, color: SLATE }).setOrigin(0, 0.5);
    rule(230);
    // The commission: a work order.
    const bw = PR - PL;
    g.lineStyle(1, hex(INK)).strokeRect(PL, 246, bw, 112);
    g.fillStyle(hex(INK)).fillRect(PL, 246, bw, 20);
    this.text(PL + 9, 256.5, 'COMMISSION', { size: 8.5, weight: 800, color: '#ffffff', ls: 2 }).setOrigin(0, 0.5);
    const order = this.text(PR - 9, 256.5, '', { size: 7.5, weight: 600, color: '#aab3ba', ls: 1 }).setOrigin(1, 0.5);
    const commission = this.text(PL + 9, 274, '', { size: 12, weight: 600, wrap: 180 });
    const swatches = [0, 1, 2, 3].map((k) => this.add.image(PL + 16.5 + k * 19, 327, 'swatch-forest').setScale(0.94 / HI));
    const soFar = this.text(PL + 70, 327, '', { size: 12, weight: 700 }).setOrigin(0, 0.5);
    const done = this.text(PR - 51, 327, 'Done!', { size: 12, weight: 800, color: GREEN }).setOrigin(0, 0.5);
    // The isle goal.
    const isleLabel = label(PL, 375, '');
    const pct = this.text(PR, 376, '', { size: 17, weight: 800 }).setOrigin(1, 0.5);
    const marks = MILESTONES.map((m) =>
      this.text(PL + (bw * m.pct) / 100, 411, m.atlas ? 'Atlas page' : `+${m.coins}c`, { size: 8.5, weight: 700, color: MAGENTA }).setOrigin(
        m.pct === 100 ? 1 : 0.5,
        0.5,
      ),
    );
    rule(425);
    const turnBack = this.text(RETURN_BUTTON.x, 442, '', { size: 9, weight: 600, color: SLATE }).setOrigin(0.5);
    makeButton(
      this,
      RETURN_BUTTON.x,
      RETURN_BUTTON.y,
      'Return to port',
      () => {
        if (returnToPort(this.state)) saveGame(this.state);
      },
      BUTTON,
      true,
      'left',
    );
    const tag = this.pill(RETURN_BUTTON.x + BUTTON.w / 2 - 32, RETURN_BUTTON.y, '', 48, 22, 12);
    const tagText = tag.list[1] as Phaser.GameObjects.Text;
    this.spots.return = { ...RETURN_BUTTON };
    const live = this.add.graphics();
    this.panel = {
      isle,
      atlas,
      atlasIcon,
      supplies,
      max,
      unused,
      coins,
      tiles,
      worth,
      order,
      commission,
      soFar,
      done,
      swatches,
      isleLabel,
      pct,
      marks,
      turnBack,
      tag,
      tagText,
      live,
    };
  }

  private updatePanel() {
    const s = this.state;
    const p = this.panel;
    const max = maxSupplies(s);
    const set = (t: Phaser.GameObjects.Text, v: string) => t.text !== v && t.setText(v);
    set(this.header.isle, `ISLE ${s.island}`);
    this.header.sheet.setX(24 + this.header.isle.width + 14);
    set(this.header.sheet, `SURVEY SHEET ${s.voyage - s.isleStart + 1}  ·  SCALE 1 : 40`);
    set(p.isle, `ISLE ${s.island} · VOYAGE ${s.voyage}`);
    const pages = s.atlas.length;
    set(p.atlas, pages === 0 ? 'ATLAS 0' : `ATLAS ${pages}`);
    p.atlas.setColor(pages ? INK : GREY);
    p.atlasIcon.setTexture(pages ? 'atlas' : 'atlas-empty').setX(PR - p.atlas.width - 10);
    set(p.supplies, `${s.supplies}`);
    set(p.max, `/ ${max}`);
    p.max.setX(PL + p.supplies.width + 3);
    set(p.coins, `${s.coins}`);
    const chart = s.chart ?? chartOf(s);
    set(p.tiles, `${s.surveyed.length} tiles`);
    set(p.worth, `worth ${chart.base + chart.ink}c`);

    const g = p.live.clear();
    // Supply pips, with the unused ones bracketed in magenta while they can still sell back.
    const pipX = PL + 55;
    const pitch = (PR - pipX + 3) / max;
    const pw = Math.max(2, pitch - 3);
    for (let k = 0; k < max; k++) g.fillStyle(k < s.supplies ? hex(INK) : hex(TRACK)).fillRect(pipX + k * pitch, 120, pw, 15);
    const selling = s.phase === 'survey' && s.supplies > 0;
    p.unused.setVisible(selling);
    if (selling) {
      const end = pipX + (s.supplies - 1) * pitch + pw;
      g.lineStyle(1, hex(MAGENTA));
      g.beginPath();
      g.moveTo(pipX, 140);
      g.lineTo(pipX, 144);
      g.lineTo(end, 144);
      g.lineTo(end, 140);
      g.strokePath();
    }
    // The live chart: every charted tile, the newest inked in magenta.
    const cs = 3;
    const ox = PR - GRID.w * cs;
    const oy = 176;
    g.fillStyle(hex(VELLUM)).fillRect(ox - 2, oy - 2, GRID.w * cs + 4, GRID.h * cs + 4);
    s.tiles.forEach((t, i) => {
      if (!t.revealed) return;
      const born = this.freshAt.get(i);
      const fresh = born !== undefined && this.clock - born < FRESH_MS;
      if (born !== undefined && !fresh) this.freshAt.delete(i);
      g.fillStyle(hex(fresh ? MAGENTA : TINT[t.terrain])).fillRect(ox + (i % GRID.w) * cs, oy + Math.floor(i / GRID.w) * cs, cs, cs);
    });
    g.lineStyle(0.75, hex(INK)).strokeRect(ox - 2, oy - 2, GRID.w * cs + 4, GRID.h * cs + 4);

    // The commission.
    const c = s.commission;
    set(p.order, `WO-${String(s.voyage).padStart(2, '0')}`);
    if (c) {
      const have = Math.min(chart.counts[c.terrain] ?? 0, c.need);
      const name = c.need === 1 ? TERRAIN[c.terrain].name.toLowerCase() : TERRAIN[c.terrain].plural;
      set(p.commission, `Chart ${c.need} ${name} on this voyage for +${c.bonus} coins.`);
      p.swatches.forEach((img, k) => {
        img.setVisible(k < c.need);
        if (img.texture.key !== `swatch-${c.terrain}`) img.setTexture(`swatch-${c.terrain}`);
        img.setAlpha(k < have ? 1 : 0.28);
      });
      set(p.soFar, `So far ${have} / ${c.need}`);
      p.soFar.setX(PL + 9 + c.need * 19 + 6).setVisible(true);
      const met = have >= c.need;
      p.done.setVisible(met);
      if (met) {
        const bx = PR - 70;
        g.lineStyle(1.5, hex(GREEN)).strokeRect(bx, 320.5, 13, 13);
        g.beginPath();
        g.moveTo(bx + 2.5, 327);
        g.lineTo(bx + 5.5, 330.5);
        g.lineTo(bx + 11, 323);
        g.strokePath();
      }
    } else {
      set(p.commission, 'No commission this voyage.');
      p.swatches.forEach((img) => img.setVisible(false));
      p.soFar.setVisible(false);
      p.done.setVisible(false);
    }

    // The isle goal: the share charted, with its milestones.
    const { pct } = isleProgress(s);
    set(p.isleLabel, `ISLE ${s.island} SURVEYED`);
    set(p.pct, `${pct}%`);
    const bw = PR - PL;
    const by = 390;
    g.fillStyle(hex(TRACK)).fillRect(PL, by, bw, 8);
    g.fillStyle(hex(BLUE)).fillRect(PL, by, (bw * pct) / 100, 8);
    for (let k = 0; k <= 20; k++) g.fillStyle(hex(INK)).fillRect(PL + (bw * k) / 20 - 0.25, by + 8, 0.5, k % 5 ? 2.5 : 4.5);
    const due = milestonesDue(s).length;
    MILESTONES.forEach((m, k) => {
      const mx = PL + (bw * m.pct) / 100;
      const paid = k < s.milestones;
      const reached = !paid && k < s.milestones + due;
      const col = paid ? hex(GREY) : reached ? hex(INK) : hex(MAGENTA);
      g.fillStyle(col).fillTriangle(mx, by - 1, mx - 4, by - 7, mx + 4, by - 7);
      const caption = m.atlas ? (paid ? 'Atlas page ✓' : 'Atlas page') : paid ? `+${m.coins}c ✓` : `+${m.coins}c`;
      // Reached on this voyage: paid with the chart, so it prints in ink until then.
      set(p.marks[k], caption);
      p.marks[k].setColor(paid ? GREY : reached ? INK : MAGENTA);
      p.marks[k].setOrigin(m.pct === 100 ? 1 : 0.5, 0.5);
    });
    // Keep the two right-hand labels apart once they carry ticks.
    const [, second, last] = p.marks;
    const room = last.x - last.width - 6;
    second.setX(Math.min(PL + (bw * MILESTONES[1].pct) / 100, room - second.width / 2));

    // Turning back early: what the unused supplies would sell back for now.
    const back = s.phase === 'survey' ? Math.min(s.supplies * SELL_BACK, chart.base) : 0;
    const capped = s.phase === 'survey' && back < s.supplies * SELL_BACK;
    p.tag.setVisible(back > 0);
    set(p.tagText, `+${back}c`);
    set(
      p.turnBack,
      s.phase !== 'survey' || s.supplies === 0
        ? ''
        : back === 0
          ? `Unused supplies sell back for ${SELL_BACK}c, up to the chart's worth`
          : capped
          ? `Turn back now: ${s.supplies} unused × ${SELL_BACK}c, up to the chart's ${chart.base}c`
          : `Turn back now: ${s.supplies} unused × ${SELL_BACK}c`,
    );
  }

  // ---- Overlays.

  /** Rebuilds the chart or harbor overlay when what it shows changes. */
  private syncOverlay() {
    const s = this.state;
    const key = s.phase === 'survey' ? '' : `${s.phase}:${s.coins}:${JSON.stringify(s.ranks)}`;
    if (key === this.overlayKey) return;
    this.overlayKey = key;
    this.overlay?.destroy();
    this.overlay = null;
    for (const name of Object.keys(this.spots)) if (name !== 'return') delete this.spots[name];
    if (s.phase === 'chart') this.showChart();
    if (s.phase === 'harbor') this.showHarbor();
  }

  private overlayBase(title: string) {
    const c = this.add.container(0, 0).setDepth(UI_DEPTH);
    // The dim covers the whole screen and swallows taps, so the map can't be surveyed behind it.
    const dim = this.add.rectangle(0, 0, VIEW.w, VIEW.h, hex(INK), 0.38).setOrigin(0).setInteractive();
    const left = OVERLAY.x - OVERLAY.w / 2;
    const top = OVERLAY.y - OVERLAY.h / 2;
    const g = this.add.graphics();
    for (let k = 1; k <= 4; k++) g.fillStyle(0x000000, 0.05).fillRect(left - k, top + 2, OVERLAY.w + 2 * k, OVERLAY.h + 2 * k);
    g.fillStyle(0xffffff).fillRect(left, top, OVERLAY.w, OVERLAY.h);
    g.fillStyle(hex(INK)).fillRect(left, top, OVERLAY.w, 4);
    g.fillStyle(hex(RULE)).fillRect(left + 24, top + 44, OVERLAY.w - 48, 1);
    const heading = this.text(left + 24, top + 26, title.toUpperCase(), { size: 14, weight: 800, ls: 2 }).setOrigin(0, 0.5);
    const logo = this.add.image(left + OVERLAY.w - 33, top + 26, 'logo').setScale(1 / HI);
    c.add([dim, g, heading, logo]);
    this.overlay = c;
    return c;
  }

  private showChart() {
    const s = this.state;
    const chart = s.chart!;
    const c = this.overlayBase(`Chart of Isle ${s.island} · Voyage ${s.voyage}`);
    const top = OVERLAY.y - OVERLAY.h / 2;
    const left = OVERLAY.x - OVERLAY.w / 2 + 60;
    const right = OVERLAY.x + OVERLAY.w / 2 - 60;
    type Row = { icon?: string; label: string; value: string; color?: string };
    const rows: Row[] = [];
    const kinds = CHART_ORDER.filter((t) => chart.counts[t]);
    if (kinds.length === 0) rows.push({ label: 'Nothing charted this voyage', value: '0' });
    for (const t of kinds) {
      const n = chart.counts[t]!;
      rows.push({ icon: `swatch-${t}`, label: `${TERRAIN[t].name}   ${n} × ${TERRAIN[t].value}`, value: `${n * TERRAIN[t].value}` });
    }
    if (chart.ink > 0) rows.push({ label: 'Fine Ink', value: `+${chart.ink}` });
    const com = s.commission;
    if (com) {
      const name = com.need === 1 ? TERRAIN[com.terrain].name.toLowerCase() : TERRAIN[com.terrain].plural;
      rows.push({
        label: `Commission: ${com.need} ${name}`,
        value: chart.bonus > 0 ? `+${chart.bonus}` : 'missed',
        color: chart.bonus > 0 ? GREEN : GREY,
      });
    }
    if (chart.unused > 0) {
      const capped = chart.sellBack < chart.unused * SELL_BACK;
      rows.push({
        label: `Unused supplies   ${chart.unused} × ${SELL_BACK}${capped ? ' (up to the tiles)' : ''}`,
        value: `+${chart.sellBack}`,
        color: MAGENTA,
      });
    }
    MILESTONES.slice(s.milestones, s.milestones + chart.milestones).forEach((m) =>
      rows.push(
        m.atlas
          ? { icon: 'atlas', label: `Atlas page: Isle ${s.island} charted in full`, value: 'bound', color: MAGENTA }
          : { label: `Isle ${s.island} ${m.pct}% surveyed`, value: `+${m.coins}`, color: MAGENTA },
      ),
    );
    const room = OVERLAY_BUTTON.y - 60 - (top + 62);
    const rowH = Math.min(24, room / rows.length);
    let y = top + 62;
    for (const r of rows) {
      const color = r.color ?? INK;
      if (r.icon) c.add(this.add.image(left + 8, y + rowH / 2, r.icon).setScale(1 / HI));
      c.add(this.text(left + 24, y + rowH / 2, r.label, { size: 11.5, weight: 600, color }).setOrigin(0, 0.5));
      c.add(this.text(right, y + rowH / 2, r.value, { size: 11.5, weight: 700, color }).setOrigin(1, 0.5));
      y += rowH;
    }
    y += 6;
    const g = this.add.graphics();
    g.fillStyle(hex(INK)).fillRect(left, y, right - left, 1.5);
    c.add(g);
    y += 16;
    c.add(this.text(left, y, 'Sells for', { size: 15, weight: 800 }).setOrigin(0, 0.5));
    c.add(this.text(right, y, `${chart.total} coins`, { size: 15, weight: 800 }).setOrigin(1, 0.5));
    c.add(
      makeButton(this, OVERLAY_BUTTON.x, OVERLAY_BUTTON.y, 'Sell chart', () => {
        if (sellChart(this.state)) saveGame(this.state);
      }),
    );
    this.spots.sell = { ...OVERLAY_BUTTON };
  }

  private showHarbor() {
    const s = this.state;
    const c = this.overlayBase('The harbor');
    const top = OVERLAY.y - OVERLAY.h / 2;
    const left = OVERLAY.x - OVERLAY.w / 2 + 34;
    const right = OVERLAY.x + OVERLAY.w / 2 - 34;
    c.add(this.text(left, top + 62, `Chart sold for ${s.lastSale} coins.`, { size: 12, weight: 600, color: SLATE }).setOrigin(0, 0.5));
    c.add(this.text(right, top + 62, `Coins ${s.coins}`, { size: 15, weight: 800 }).setOrigin(1, 0.5));
    const g = this.add.graphics();
    c.add(g);
    UPGRADE_IDS.forEach((id, n) => {
      const y = SHOP.y + n * SHOP.gap;
      const up = UPGRADES[id];
      const rank = rankOf(s, id);
      const cost = nextCost(id, rank);
      g.fillStyle(hex(RULE)).fillRect(left, y - SHOP.gap / 2, right - left, 1);
      c.add(this.add.image(left + 14, y, `icon-${id}`).setScale(1 / HI));
      const name = this.text(left + 36, y - 9, up.name, { size: 12.5, weight: 800 }).setOrigin(0, 0.5);
      c.add(name);
      up.costs.forEach((_, k) => {
        const px = left + 36 + name.width + 10 + k * 9;
        if (k < rank) g.fillStyle(hex(MAGENTA)).fillRect(px, y - 12.5, 6, 7);
        else g.lineStyle(1, hex(MAGENTA)).strokeRect(px + 0.5, y - 12, 5, 6);
      });
      c.add(this.text(left + 36, y + 8, up.text, { size: 10.5, weight: 500, color: SLATE }).setOrigin(0, 0.5));
      const label = cost === null ? 'Max' : `${cost}c`;
      const can = cost !== null && s.coins >= cost;
      c.add(
        makeButton(
          this,
          SHOP.buyX,
          y,
          label,
          () => {
            if (buy(this.state, id)) saveGame(this.state);
          },
          SMALL_BUTTON,
          can,
        ),
      );
      this.spots[`buy-${id}`] = { x: SHOP.buyX, y };
    });
    // The atlas: one bound page per isle charted in full.
    const by = OVERLAY_BUTTON.y;
    c.add(this.text(left, by - 8, 'ATLAS', { size: 8.5, weight: 700, color: GREY, ls: 1.5 }).setOrigin(0, 0.5));
    const pages = s.atlas.length;
    if (pages === 0) {
      c.add(this.text(left, by + 7, 'Chart an isle in full', { size: 9.5, weight: 500, color: SLATE }).setOrigin(0, 0.5));
    } else {
      s.atlas.slice(-6).forEach((_, k) => c.add(this.add.image(left + 8 + k * 14, by + 8, 'atlas').setScale(1 / HI)));
      const shown = Math.min(pages, 6);
      c.add(this.text(left + 4 + shown * 14, by + 8, `${pages} page${pages > 1 ? 's' : ''}`, { size: 10, weight: 700 }).setOrigin(0, 0.5));
    }
    const { pct } = isleProgress(s);
    c.add(this.text(right, by - 8, `ISLE ${s.island}`, { size: 8.5, weight: 700, color: GREY, ls: 1.5 }).setOrigin(1, 0.5));
    c.add(this.text(right, by + 7, `${pct}% surveyed`, { size: 10, weight: 700, color: pct === 100 ? MAGENTA : INK }).setOrigin(1, 0.5));
    const caption = islandCharted(s) ? 'Sail to a new isle' : 'Set sail';
    c.add(
      makeButton(this, OVERLAY_BUTTON.x, OVERLAY_BUTTON.y, caption, () => {
        if (!setSail(this.state)) return;
        saveGame(this.state);
        this.endSweep();
        // The surveyor starts the voyage at the port, not walking back from the last tile.
        this.walker = tileCentre(this.state.port.x, this.state.port.y);
      }),
    );
    this.spots.sail = { ...OVERLAY_BUTTON };
  }
}

/** Strokes a rectangle in dashes, in the graphics' current line style. */
function dashedRect(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, dash: number, gap: number) {
  const edge = (x1: number, y1: number, x2: number, y2: number) => {
    const len = Math.hypot(x2 - x1, y2 - y1);
    for (let d = 0; d < len; d += dash + gap) {
      const e = Math.min(len, d + dash);
      g.lineBetween(x1 + ((x2 - x1) * d) / len, y1 + ((y2 - y1) * d) / len, x1 + ((x2 - x1) * e) / len, y1 + ((y2 - y1) * e) / len);
    }
  };
  edge(x, y, x + w, y);
  edge(x + w, y, x + w, y + h);
  edge(x + w, y + h, x, y + h);
  edge(x, y + h, x, y);
}
