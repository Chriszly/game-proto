import Phaser from 'phaser';
import { settings } from '../../../../shared/settings';
import { SURVEYOR_FEET } from '../art/surveyor';
import { FOG_VARIANTS, SEA_FRAMES } from '../art/tiles';
import { loadGame, saveGame } from '../game/save';
import { buy, chartOf, frontier, islandCharted, newGame, returnToPort, sellChart, setSail, survey } from '../game/sim';
import { GRID, indexOf, maxSupplies, rankOf, type GameState } from '../game/state';
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
/** How long a newly revealed tile takes to fade in, and its coin value to float up. */
const REVEAL_MS = 300;
const POPUP_MS = 900;
/** How often the sea swaps frames. */
const WAVE_MS = 700;

const textStyle = (size: number, color = '#f3e9d2') => ({
  fontFamily: FONT,
  fontSize: `${size}px`,
  color,
  stroke: '#1a1216',
  strokeThickness: 3,
});
const inkStyle = (size: number, color = '#2a1d16') => ({ fontFamily: FONT, fontSize: `${size}px`, color });

/** A button's centre, for the playthrough test to tap. */
export interface Spot {
  x: number;
  y: number;
}

interface Popup {
  text: Phaser.GameObjects.Text;
  age: number;
}

export class GameScene extends Phaser.Scene {
  /** The game being played; read by the playthrough test. */
  state!: GameState;
  /** Where each button on screen is, by name (`return`, `sell`, `sail`, `buy-<upgrade>`). */
  spots: Record<string, Spot> = {};
  private tiles: Phaser.GameObjects.Image[] = [];
  /** When each tile was revealed, by the scene's clock, to fade it in. */
  private revealedAt = new Map<number, number>();
  private hints = new Map<number, Phaser.GameObjects.Image>();
  private glow!: Phaser.GameObjects.Graphics;
  private surveyor!: Phaser.GameObjects.Image;
  private walker = { x: 0, y: 0 };
  private popups: Popup[] = [];
  private panel!: {
    island: Phaser.GameObjects.Text;
    supplies: Phaser.GameObjects.Text;
    coins: Phaser.GameObjects.Text;
    chart: Phaser.GameObjects.Text;
    commission: Phaser.GameObjects.Text;
    bar: Phaser.GameObjects.Graphics;
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
    this.tiles = [];
    this.revealedAt.clear();
    this.hints.clear();
    this.popups = [];
    this.overlay = null;
    this.overlayKey = '';
    this.state = loadGame() ?? newGame();

    this.drawFrame();
    for (let y = 0; y < GRID.h; y++) {
      for (let x = 0; x < GRID.w; x++) {
        const c = tileCentre(x, y);
        this.tiles.push(this.add.image(c.x, c.y, this.textureOf(x, y)).setDepth(1));
      }
    }
    this.glow = this.add.graphics().setDepth(2);
    const start = tileCentre(this.state.surveyor.x, this.state.surveyor.y);
    this.walker = { ...start };
    this.surveyor = this.add.image(start.x, start.y + MAP.tile * 0.3, 'surveyor').setOrigin(0.5, SURVEYOR_FEET).setDepth(4);
    this.createPanel();

    this.input.on('pointermove', (p: Phaser.Input.Pointer) => (this.hover = this.tileAtScreen(p.x, p.y)));
    // A tap on a glowing tile surveys it. Taps on a button or the overlay are theirs alone.
    this.input.on('pointerdown', (p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (over.length > 0) return;
      const t = this.tileAtScreen(p.x, p.y);
      if (t && survey(this.state, t.x, t.y)) saveGame(this.state);
    });
  }

  update(time: number) {
    const dt = this.lastFrame === null ? 0 : Math.min(time - this.lastFrame, MAX_STEP_MS);
    this.lastFrame = time;
    this.clock += dt;

    this.syncTiles();
    this.moveSurveyor(dt);
    this.drawGlow();
    this.agePopups(dt);
    this.updatePanel();
    this.syncOverlay();
  }

  private tileAtScreen(sx: number, sy: number) {
    const x = Math.floor((sx - MAP.x) / MAP.tile);
    const y = Math.floor((sy - MAP.y) / MAP.tile);
    return x >= 0 && y >= 0 && x < GRID.w && y < GRID.h ? { x, y } : null;
  }

  private textureOf(x: number, y: number) {
    const tile = this.state.tiles[indexOf(x, y)];
    if (!tile.revealed) return `fog-${(x * 7 + y * 3) % FOG_VARIANTS}`;
    if (tile.terrain === 'sea') {
      // The sea rolls, a frame every WAVE_MS, staggered along the diagonals; still with reduced motion.
      const frame = settings.reduceMotion ? 0 : (Math.floor(this.clock / WAVE_MS) + x + y) % SEA_FRAMES;
      return frame === 0 ? 'tile-sea' : `tile-sea-${frame}`;
    }
    return `tile-${tile.terrain}`;
  }

  /** The wooden frame round the map, the sea beyond it, and the parchment side panel. */
  private drawFrame() {
    const g = this.add.graphics();
    g.fillStyle(0x1b2a3a).fillRect(0, 0, VIEW.w, VIEW.h);
    const w = GRID.w * MAP.tile;
    const h = GRID.h * MAP.tile;
    g.fillStyle(0x3b2416).fillRect(MAP.x - 8, MAP.y - 8, w + 16, h + 16);
    g.fillStyle(0x8a5a32).fillRect(MAP.x - 5, MAP.y - 5, w + 10, h + 10);
    g.fillStyle(0x5c3a21).fillRect(MAP.x - 2, MAP.y - 2, w + 4, h + 4);
    for (const [x, y] of [[MAP.x - 8, MAP.y - 8], [MAP.x + w, MAP.y - 8], [MAP.x - 8, MAP.y + h], [MAP.x + w, MAP.y + h]]) {
      g.fillStyle(0xc9a040).fillRect(x + 2, y + 2, 4, 4);
    }
    g.fillStyle(0x3b2416).fillRect(PANEL.x - 4, PANEL.y - 4, PANEL.w + 8, PANEL.h + 8);
    g.fillStyle(0xead6a6).fillRect(PANEL.x, PANEL.y, PANEL.w, PANEL.h);
    g.lineStyle(1, 0xb59a68).strokeRect(PANEL.x + 6, PANEL.y + 6, PANEL.w - 12, PANEL.h - 12);
  }

  private createPanel() {
    const left = PANEL.x + 18;
    const mid = PANEL.x + PANEL.w / 2;
    this.add.text(mid, PANEL.y + 22, 'MAPMAKER', inkStyle(24, '#5c3a21')).setOrigin(0.5, 0);
    const island = this.add.text(mid, PANEL.y + 54, '', inkStyle(15, '#5c3a21')).setOrigin(0.5, 0);
    this.add.image(left + 12, 112, 'icon-supplies');
    const supplies = this.add.text(left + 32, 102, '', inkStyle(17));
    const bar = this.add.graphics();
    this.add.image(left + 12, 170, 'icon-coin');
    const coins = this.add.text(left + 32, 160, '', inkStyle(17));
    this.add.image(left + 12, 208, 'icon-chart');
    const chart = this.add.text(left + 32, 198, '', inkStyle(15));
    const g = this.add.graphics();
    g.fillStyle(0xf5e8c6).fillRect(left - 4, 246, PANEL.w - 28, 112);
    g.lineStyle(2, 0xb59a68).strokeRect(left - 4, 246, PANEL.w - 28, 112);
    this.add.text(left + 6, 254, 'COMMISSION', inkStyle(14, '#8f6a24'));
    const commission = this.add.text(left + 6, 276, '', { ...inkStyle(15), wordWrap: { width: PANEL.w - 48 } });
    this.add.text(left, 372, 'Tap a glowing tile beside your map to survey it for one supply. Hills and peaks see further; the sea leads nowhere.', {
      ...inkStyle(13, '#5c3a21'),
      wordWrap: { width: PANEL.w - 36 },
      lineSpacing: 2,
    });
    makeButton(this, RETURN_BUTTON.x, RETURN_BUTTON.y, 'Return to port', () => {
      if (returnToPort(this.state)) saveGame(this.state);
    });
    this.spots.return = { ...RETURN_BUTTON };
    this.panel = { island, supplies, coins, chart, commission, bar };
  }

  private syncTiles() {
    const s = this.state;
    for (let y = 0; y < GRID.h; y++) {
      for (let x = 0; x < GRID.w; x++) {
        const i = indexOf(x, y);
        const tile = s.tiles[i];
        const img = this.tiles[i];
        const key = this.textureOf(x, y);
        if (img.texture.key !== key) {
          // A tile just revealed fades in and floats its coin value up.
          if (img.texture.key.startsWith('fog-') && tile.revealed) {
            this.revealedAt.set(i, this.clock);
            if (TERRAIN[tile.terrain].value > 0) this.popup(x, y, `+${TERRAIN[tile.terrain].value}`);
          }
          img.setTexture(key);
        }
        const born = this.revealedAt.get(i);
        if (born !== undefined) {
          const t = (this.clock - born) / REVEAL_MS;
          img.setAlpha(t >= 1 ? 1 : 0.35 + 0.65 * t);
          if (t >= 1) this.revealedAt.delete(i);
        }
        // With the Lodestone Compass, landmarks under fog show a gold star.
        const hinted = !tile.revealed && isLandmark(tile.terrain) && rankOf(s, 'compass') > 0;
        const hint = this.hints.get(i);
        if (hinted && !hint) {
          const c = tileCentre(x, y);
          this.hints.set(i, this.add.image(c.x, c.y, 'landmark-hint').setDepth(2).setAlpha(0.85));
        } else if (!hinted && hint) {
          hint.destroy();
          this.hints.delete(i);
        }
      }
    }
  }

  private popup(x: number, y: number, caption: string) {
    const c = tileCentre(x, y);
    const text = this.add.text(c.x, c.y - 6, caption, textStyle(15, '#f5e3a0')).setOrigin(0.5).setDepth(5);
    this.popups.push({ text, age: 0 });
  }

  private agePopups(dt: number) {
    for (const p of this.popups) {
      p.age += dt;
      p.text.y -= (dt / POPUP_MS) * 22;
      p.text.setAlpha(Math.max(0, 1 - p.age / POPUP_MS));
      if (p.age >= POPUP_MS) p.text.destroy();
    }
    this.popups = this.popups.filter((p) => p.age < POPUP_MS);
  }

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

  /** Outlines every tile that can be surveyed; the one under the pointer is lit. */
  private drawGlow() {
    this.glow.clear();
    if (this.state.phase !== 'survey' || this.state.supplies <= 0) return;
    const pulse = settings.reduceMotion ? 0.85 : 0.75 + 0.25 * Math.sin(this.clock / 260);
    for (const p of frontier(this.state)) {
      const x = MAP.x + p.x * MAP.tile;
      const y = MAP.y + p.y * MAP.tile;
      const lit = this.hover?.x === p.x && this.hover?.y === p.y;
      this.glow.fillStyle(lit ? 0xfff4d0 : 0xf5e3a0, lit ? 0.7 : 0.45 * pulse).fillRect(x + 2, y + 2, MAP.tile - 4, MAP.tile - 4);
      this.glow.lineStyle(3, lit ? 0x5c3a21 : 0xb8742a, lit ? 1 : pulse).strokeRect(x + 3, y + 3, MAP.tile - 6, MAP.tile - 6);
    }
  }

  private updatePanel() {
    const s = this.state;
    const max = maxSupplies(s);
    const set = (t: Phaser.GameObjects.Text, v: string) => t.text !== v && t.setText(v);
    set(this.panel.island, `Isle ${s.island} · Voyage ${s.voyage}`);
    set(this.panel.supplies, `Supplies ${s.supplies} / ${max}`);
    set(this.panel.coins, `Coins ${s.coins}`);
    const chart = chartOf(s);
    set(this.panel.chart, `This chart: ${s.surveyed.length} tiles\nworth ${chart.base + chart.ink} coins`);
    const c = s.commission;
    if (c) {
      const have = chart.counts[c.terrain] ?? 0;
      const name = c.need === 1 ? TERRAIN[c.terrain].name.toLowerCase() : TERRAIN[c.terrain].plural;
      set(
        this.panel.commission,
        `Chart ${c.need} ${name} on this voyage for +${c.bonus} coins.\n\nSo far ${Math.min(have, c.need)} / ${c.need}${have >= c.need ? '  Done!' : ''}`,
      );
    } else {
      set(this.panel.commission, 'No commission this voyage.');
    }
    const bar = this.panel.bar.clear();
    const left = PANEL.x + 18;
    const w = PANEL.w - 36;
    bar.fillStyle(0xb59a68).fillRect(left, 130, w, 10);
    bar.fillStyle(0x5a8f3a).fillRect(left, 130, Math.round((w * s.supplies) / max), 10);
    bar.lineStyle(1, 0x5c3a21).strokeRect(left, 130, w, 10);
  }

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
    const dim = this.add.rectangle(0, 0, VIEW.w, VIEW.h, 0x0d1117, 0.55).setOrigin(0).setInteractive();
    const top = OVERLAY.y - OVERLAY.h / 2;
    const frame = this.add.rectangle(OVERLAY.x, OVERLAY.y, OVERLAY.w + 10, OVERLAY.h + 10, 0x3b2416);
    const paper = this.add.rectangle(OVERLAY.x, OVERLAY.y, OVERLAY.w, OVERLAY.h, 0xead6a6).setStrokeStyle(2, 0xb59a68);
    const heading = this.add.text(OVERLAY.x, top + 18, title, inkStyle(22, '#5c3a21')).setOrigin(0.5, 0);
    c.add([dim, frame, paper, heading]);
    this.overlay = c;
    return c;
  }

  private showChart() {
    const s = this.state;
    const chart = s.chart!;
    const c = this.overlayBase(`Chart of Isle ${s.island}, voyage ${s.voyage}`);
    const top = OVERLAY.y - OVERLAY.h / 2;
    const left = OVERLAY.x - OVERLAY.w / 2 + 70;
    const right = OVERLAY.x + OVERLAY.w / 2 - 70;
    let y = top + 64;
    const row = (label: string, value: string, color = '#2a1d16') => {
      c.add(this.add.text(left + 30, y, label, inkStyle(16, color)));
      c.add(this.add.text(right, y, value, inkStyle(16, color)).setOrigin(1, 0));
      y += 25;
    };
    const kinds = CHART_ORDER.filter((t) => chart.counts[t]);
    if (kinds.length === 0) row('Nothing charted this voyage', '0');
    for (const t of kinds) {
      c.add(this.add.image(left + 10, y + 9, `tile-${t}`).setScale(0.5));
      const n = chart.counts[t]!;
      row(`${TERRAIN[t].name}  ${n} x ${TERRAIN[t].value}`, `${n * TERRAIN[t].value}`);
    }
    y += 6;
    if (chart.ink > 0) row('Fine Ink', `+${chart.ink}`);
    const com = s.commission;
    if (com) {
      const name = com.need === 1 ? TERRAIN[com.terrain].name.toLowerCase() : TERRAIN[com.terrain].plural;
      row(`Commission: ${com.need} ${name}`, chart.bonus > 0 ? `+${chart.bonus}` : 'missed', chart.bonus > 0 ? '#3b6a2a' : '#8a5a32');
    }
    y += 4;
    c.add(this.add.rectangle(OVERLAY.x, y, right - left, 2, 0x8a5a32).setOrigin(0.5, 0));
    y += 8;
    c.add(this.add.image(left + 10, y + 11, 'icon-coin'));
    c.add(this.add.text(left + 30, y, 'Sells for', inkStyle(20, '#5c3a21')));
    c.add(this.add.text(right, y, `${chart.total} coins`, inkStyle(20, '#5c3a21')).setOrigin(1, 0));
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
    c.add(this.add.image(OVERLAY.x - 120, top + 66, 'icon-coin'));
    c.add(
      this.add.text(OVERLAY.x - 100, top + 56, `Chart sold for ${s.lastSale}. Coins: ${s.coins}`, inkStyle(17)),
    );
    UPGRADE_IDS.forEach((id, n) => {
      const y = SHOP.y + n * SHOP.gap;
      const up = UPGRADES[id];
      const rank = rankOf(s, id);
      const cost = nextCost(id, rank);
      const pips = '●'.repeat(rank) + '○'.repeat(up.costs.length - rank);
      c.add(this.add.image(left + 12, y, `icon-${id}`));
      c.add(this.add.text(left + 34, y - 18, `${up.name} ${pips}`, inkStyle(16, '#5c3a21')));
      c.add(this.add.text(left + 34, y + 2, up.text, inkStyle(13)));
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
    const caption = islandCharted(s) ? 'Sail to a new isle' : 'Set sail';
    c.add(
      makeButton(this, OVERLAY_BUTTON.x, OVERLAY_BUTTON.y, caption, () => {
        if (setSail(this.state)) saveGame(this.state);
      }),
    );
    this.spots.sail = { ...OVERLAY_BUTTON };
  }
}
