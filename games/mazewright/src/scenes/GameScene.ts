import Phaser from 'phaser';
import { playMusic, playSting, ui } from '../../../../shared/audio';
import { viewFrame, viewSize } from '../../../../shared/scaling';
import { settings } from '../../../../shared/settings';
import { SFX, SONG } from '../audio';
import { distances, route } from '../game/grid';
import { cellOf, MAPS, type MapDef } from '../game/maps';
import { loadPouch, loadRecords, noteRecord, pouchOf, savePouch, type Records } from '../game/save';
import {
  beamCells, bestFace, build, canStartWave, newGame, nextUpgrade, sell, sellValue, startWave, step, towerAt, turn, upgrade, wouldBlock,
  type Game, type GameEvent, type Refusal, type Tower,
} from '../game/sim';
import { DIRS } from '../game/grid';
import { ALWAYS, COLS, FOE, POUCH_PICKS, ROWS, SECOND_GATE, TOWER, TOWERS, WAVES, type FoeKind, type TowerKind } from '../game/rules';
import { t, type TextKey } from '../i18n';
import * as art from './art';
import { C } from './art';
import { BACK_BUTTON, BAR_H, CARDS, CELL, CHIPS, DEPTH, GRID, PANEL, SPEED_BUTTON, TIP_X, TOOLS, VIEW, WAVE_BUTTON } from './layout';

/** A spot the test can tap, by its centre in view pixels. */
type Spot = { x: number; y: number; w: number; h: number };
type Hit = { x: number; y: number; w: number; h: number; onTap: () => void; enabled: boolean };

/** The game runs in fixed steps of this many seconds, so it plays the same on every frame rate. */
const STEP = 1 / 60;
/** The longest frame the game catches up on, so a stalled tab doesn't jump. */
const MAX_FRAME = 0.1;
const FONT = '"Trebuchet MS", "Segoe UI", sans-serif';
const css = (c: number) => `#${c.toString(16).padStart(6, '0')}`;

/** Something drawn for a moment: a pulse, a boom, a hit, a bolt, a flame, a beam, spores, a coin or a note. */
interface Flash {
  kind: 'pulse' | 'boom' | 'hit' | 'bolt' | 'flame' | 'beam' | 'puff' | 'coin' | 'note';
  x: number;
  y: number;
  r: number;
  /** A bolt's points; a flame's heading and half-width; a beam's far end. */
  points?: { x: number; y: number }[];
  angle?: number;
  cone?: number;
  x2?: number;
  y2?: number;
  age: number;
  life: number;
  text?: string;
  /** The text drawn for a coin or a note, made once and dropped with the flash. */
  label?: Phaser.GameObjects.Text;
}

/**
 * Mazewright's only scene: the garden picker and a game. It turns taps and keys into the actions
 * of `game/sim.ts`, steps the game in fixed steps, draws the board, the foes and the bars, and
 * drains `game.events` for sound, effects and records.
 */
export class GameScene extends Phaser.Scene {
  screen: 'menu' | 'play' = 'menu';
  state: Game | null = null;
  records!: Records;
  tool: TowerKind = 'hedge';
  /** The towers this run can plant, picked under the garden cards: hedge, bow and up to four more. */
  pouch: TowerKind[] = [];
  /** The tower whose panel is open, by its cell. */
  selected = -1;
  speed = 1;
  /** Spots for the test: every button on screen by id, centred, in view pixels. */
  buttons: Record<string, Spot> = {};
  /** The grid's top-left corner and cell size in view pixels, for the test. */
  grid = { x: GRID.x, y: GRID.y, cell: CELL };

  private vw = VIEW.w;
  private vh = VIEW.h;
  private fx = 0;
  private fy = 0;
  private lawnG!: Phaser.GameObjects.Graphics;
  private boardG!: Phaser.GameObjects.Graphics;
  private fxG!: Phaser.GameObjects.Graphics;
  private hudG!: Phaser.GameObjects.Graphics;
  private texts: Phaser.GameObjects.Text[] = [];
  private hits: Hit[] = [];
  private boardDirty = true;
  private hudKey = '';
  private acc = 0;
  private lastTime = 0;
  private hover = -1;
  private painting = false;
  private lastPainted = -1;
  /** The route preview for the hovered cell, made once per cell and board. */
  private preview: { cell: number; version: number; tool: TowerKind; blocks: boolean; face: number; routes: number[][] } | null = null;
  private version = 0;
  private flashes: Flash[] = [];
  private banner: { text: string; left: number } | null = null;
  /** Foe kinds already met in this game, to name each new one once. */
  private seen = new Set<FoeKind>();

  constructor() {
    super('Game');
  }

  create() {
    this.records = loadRecords();
    this.pouch = loadPouch();
    this.lawnG = this.add.graphics().setDepth(DEPTH.lawn);
    this.boardG = this.add.graphics().setDepth(DEPTH.board);
    this.fxG = this.add.graphics().setDepth(DEPTH.fx);
    this.hudG = this.add.graphics().setDepth(DEPTH.hud);
    this.fit();
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.onDown(p.worldX, p.worldY));
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => this.onMove(p.worldX, p.worldY, p.isDown));
    this.input.on('pointerup', () => (this.painting = false));
    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => this.onKey(e));
    const onResize = () => this.fit();
    this.scale.on(Phaser.Scale.Events.RESIZE, onResize);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off(Phaser.Scale.Events.RESIZE, onResize));
  }

  /** Reads the view's size and puts the grid in the middle of its frame. */
  private fit() {
    ({ width: this.vw, height: this.vh } = viewSize(this));
    ({ x: this.fx, y: this.fy } = viewFrame(this));
    this.grid = { x: this.fx + GRID.x, y: this.fy + GRID.y, cell: CELL };
    this.drawLawn();
    this.boardDirty = true;
    this.hudKey = '';
  }

  // -------------------------------------------------------------------------------------------
  // The loop

  update(time: number) {
    const dt = Math.min(MAX_FRAME, this.lastTime ? (time - this.lastTime) / 1000 : 0);
    this.lastTime = time;
    const g = this.state;
    if (g && this.screen === 'play') {
      this.acc += dt * this.speed;
      while (this.acc >= STEP) {
        this.acc -= STEP;
        step(g, STEP);
        this.drain(g);
      }
      if (this.selected >= 0 && !towerAt(g, this.selected)) this.selected = -1;
    }
    for (const f of this.flashes) f.age += dt;
    for (const f of this.flashes) if (f.age >= f.life) f.label?.destroy();
    this.flashes = this.flashes.filter((f) => f.age < f.life);
    if (this.banner && (this.banner.left -= dt) <= 0) this.banner = null;
    playMusic(SONG, this.musicPart());
    if (this.boardDirty) this.drawBoard();
    this.drawFx();
    this.drawHud();
  }

  private musicPart() {
    const g = this.state;
    if (!g || this.screen !== 'play' || g.phase !== 'wave') return 'calm';
    return g.foes.some((f) => f.kind === 'queen') || g.spawns.some((s) => s.kind === 'queen') ? 'boss' : 'battle';
  }

  /** Sound, effects and records for what happened in the last step. */
  private drain(g: Game) {
    for (const e of g.events) this.onEvent(g, e);
    g.events.length = 0;
  }

  private onEvent(g: Game, e: GameEvent) {
    const px = (x: number) => this.grid.x + x * CELL;
    const py = (y: number) => this.grid.y + y * CELL;
    switch (e.type) {
      case 'built':
        SFX(e.kind === 'hedge' ? 'plant' : 'build');
        this.changed();
        break;
      case 'refused':
        if (e.reason !== 'taken') this.refused(e.cell, e.reason);
        break;
      case 'upgraded':
        SFX('upgrade');
        this.changed();
        break;
      case 'sold':
        SFX('sell');
        this.changed();
        break;
      case 'shot':
        if (e.kind !== 'frost') SFX(e.kind as Exclude<TowerKind, 'hedge' | 'frost' | 'beehive' | 'apple'>);
        break;
      case 'bolt':
        this.flash({ kind: 'bolt', x: 0, y: 0, r: 0, life: 0.25, points: e.points.map((p) => ({ x: px(p.x), y: py(p.y) })) });
        break;
      case 'flame':
        this.flash({ kind: 'flame', x: px(e.x), y: py(e.y), r: e.r * CELL, angle: e.angle, cone: e.cone, life: 0.35 });
        break;
      case 'beam':
        this.flash({ kind: 'beam', x: px(e.x), y: py(e.y), x2: px(e.x2), y2: py(e.y2), r: 0, life: 0.3 });
        break;
      case 'puff':
        this.flash({ kind: 'puff', x: px(e.x), y: py(e.y), r: 9, life: 0.5 });
        break;
      case 'apples': {
        SFX('apples');
        const m = this.mid(e.cell);
        this.flash({ kind: 'coin', x: m.x, y: m.y, r: 0, life: 1.2, text: `+${e.gold}` });
        break;
      }
      case 'pulse':
        SFX('frost');
        this.flash({ kind: 'pulse', x: px(e.x), y: py(e.y), r: e.r * CELL, life: 0.4 });
        break;
      case 'boom':
        this.flash({ kind: 'boom', x: px(e.x), y: py(e.y), r: (e.r + 0.3) * CELL, life: 0.35 });
        break;
      case 'hit':
        this.flash({ kind: 'hit', x: px(e.x), y: py(e.y), r: 6, life: 0.15 });
        break;
      case 'kill':
        SFX('pop');
        this.flash({ kind: 'coin', x: px(e.x), y: py(e.y), r: 0, life: 0.8, text: `+${e.gold}` });
        break;
      case 'leak':
        SFX('leak');
        break;
      case 'chewing':
        SFX('chew');
        this.say(t('chewing'));
        this.changed();
        break;
      case 'chewed':
        SFX('chew');
        this.changed();
        break;
      case 'wave': {
        SFX('horn');
        const kinds = WAVES[e.wave - 1].map(([k]) => k);
        const fresh = kinds.find((k) => !this.seen.has(k));
        for (const k of kinds) this.seen.add(k);
        if (fresh) this.say(t(`new_${fresh}` as TextKey));
        else if (e.wave === SECOND_GATE) this.say(t('secondBurrow'));
        else this.say(t('waveBanner', { n: e.wave }));
        if (e.wave === SECOND_GATE) this.changed();
        break;
      }
      case 'cleared':
        SFX('cleared');
        if (g.phase !== 'won') this.say(t('cleared', { n: e.wave, gold: e.gold }));
        noteRecord(this.records, g.map.id, e.wave, false);
        break;
      case 'won':
        playSting(SONG, 'win');
        noteRecord(this.records, g.map.id, g.wave, true);
        break;
      case 'lost':
        playSting(SONG, 'lose');
        noteRecord(this.records, g.map.id, g.wave - 1, false);
        break;
    }
  }

  private changed() {
    this.version++;
    this.boardDirty = true;
  }

  private flash(f: Omit<Flash, 'age'>) {
    this.flashes.push({ ...f, age: 0 });
  }

  private clearFlashes() {
    for (const f of this.flashes) f.label?.destroy();
    this.flashes = [];
  }

  private say(text: string) {
    this.banner = { text, left: 3 };
  }

  private refused(cell: number, reason: Exclude<Refusal, 'taken'>) {
    ui('refuse');
    const [x, y] = cellOf(cell);
    for (const f of this.flashes) if (f.kind === 'note') f.label?.destroy();
    this.flashes = this.flashes.filter((f) => f.kind !== 'note');
    this.flash({ kind: 'note', x: this.grid.x + (x + 0.5) * CELL, y: this.grid.y + (y + 0.5) * CELL, r: 0, life: 1.8, text: t(`refuse_${reason}`) });
  }

  // -------------------------------------------------------------------------------------------
  // Input

  private onDown(x: number, y: number) {
    for (let i = this.hits.length - 1; i >= 0; i--) {
      const h = this.hits[i];
      if (x < h.x || y < h.y || x >= h.x + h.w || y >= h.y + h.h) continue;
      if (h.enabled) {
        ui('click');
        h.onTap();
      } else ui('refuse');
      this.hudKey = '';
      return;
    }
    const g = this.state;
    if (!g || this.screen !== 'play' || g.phase === 'won' || g.phase === 'lost') return;
    const cell = this.cellAt(x, y);
    if (cell < 0) {
      this.selected = -1;
      return;
    }
    if (towerAt(g, cell)) {
      this.selected = this.selected === cell ? -1 : cell;
      this.hudKey = '';
      return;
    }
    if (this.selected >= 0) {
      this.selected = -1;
      this.hudKey = '';
      return;
    }
    this.painting = true;
    this.lastPainted = cell;
    this.place(cell);
  }

  private onMove(x: number, y: number, down: boolean) {
    const cell = this.cellAt(x, y);
    this.hover = cell;
    const g = this.state;
    if (!this.painting || !down || !g || cell < 0 || cell === this.lastPainted) return;
    this.lastPainted = cell;
    if (!g.blocked[cell]) this.place(cell);
  }

  private place(cell: number) {
    const g = this.state!;
    build(g, cell, this.tool);
    this.drain(g);
  }

  private onKey(e: KeyboardEvent) {
    if (this.screen !== 'play' || !this.state) return;
    const n = Number(e.key);
    if (n >= 1 && n <= this.pouch.length) this.pickTool(this.pouch[n - 1]);
    else if (e.key === ' ') this.sendWave();
    else if (e.key.toLowerCase() === 'f') this.speed = this.speed === 1 ? 2 : 1;
    else if (e.key === 'Escape') this.selected = -1;
    else return;
    e.preventDefault();
    this.hudKey = '';
  }

  private pickTool(kind: TowerKind) {
    this.tool = kind;
    this.selected = -1;
  }

  private sendWave() {
    const g = this.state;
    if (!g || !canStartWave(g)) return ui('refuse');
    startWave(g);
    this.drain(g);
  }

  /** The cell under a point in view pixels, or -1 off the grid. */
  private cellAt(x: number, y: number) {
    const cx = Math.floor((x - this.grid.x) / CELL);
    const cy = Math.floor((y - this.grid.y) / CELL);
    return cx < 0 || cy < 0 || cx >= COLS || cy >= ROWS ? -1 : cy * COLS + cx;
  }

  /** Puts a tower into the pouch or takes it out; hedge and bow always stay. */
  private togglePouch(kind: TowerKind) {
    const picked = this.pouch.includes(kind);
    this.pouch = pouchOf(picked ? this.pouch.filter((k) => k !== kind) : [...this.pouch, kind]);
    savePouch(this.pouch);
  }

  private start(map: MapDef) {
    this.state = newGame(map.id);
    this.screen = 'play';
    this.tool = 'hedge';
    this.selected = -1;
    this.speed = 1;
    this.acc = 0;
    this.clearFlashes();
    this.seen.clear();
    this.banner = null;
    this.changed();
    this.drawLawn();
  }

  private toMenu() {
    this.screen = 'menu';
    this.state = null;
    this.clearFlashes();
    this.banner = null;
    this.changed();
    this.drawLawn();
  }

  // -------------------------------------------------------------------------------------------
  // Drawing

  private mid(cell: number) {
    const [x, y] = cellOf(cell);
    return { x: this.grid.x + (x + 0.5) * CELL, y: this.grid.y + (y + 0.5) * CELL };
  }

  private drawLawn() {
    const g = this.lawnG.clear();
    g.fillStyle(C.lawn, 1);
    g.fillRect(0, 0, this.vw, this.vh);
    if (this.screen === 'play') {
      art.lawn(g, this.grid.x, this.grid.y, GRID.w, GRID.h, COLS, ROWS, CELL);
      art.flowers(g, this.grid.x + 6, this.grid.y + 6, GRID.w - 12, GRID.h - 12);
    } else art.flowers(g, 8, 8, this.vw - 16, this.vh - 16);
  }

  /** Rocks, hedges, towers, burrows and the cottage: redrawn when the board changes. */
  private drawBoard() {
    this.boardDirty = false;
    const g = this.boardG.clear();
    const s = this.state;
    if (!s || this.screen !== 'play') return;
    for (const rock of s.map.rocks) {
      const m = this.mid(rock[1] * COLS + rock[0]);
      art.rock(g, m.x, m.y);
    }
    s.gates.forEach((cell, i) => {
      const m = this.mid(cell);
      art.burrow(g, m.x, m.y, i === 0 || s.wave >= SECOND_GATE);
    });
    const goal = this.mid(s.goal);
    art.cottage(g, goal.x, goal.y);
  }

  /** Everything that moves, every frame: towers (they turn), routes, foes, shots and effects. */
  private drawFx() {
    const g = this.fxG.clear();
    const s = this.state;
    if (!s || this.screen !== 'play') return;
    const chewing = new Map<number, number>();
    for (const f of s.foes) if (f.chew) chewing.set(f.chew.cell, 1 - f.chew.left / 3);
    // Routes first, under everything.
    const pv = this.previewFor(s);
    const routes = pv && !pv.blocks ? pv.routes : s.gates.map((gate) => route(s.dist, gate));
    routes.forEach((cells, i) => {
      const live = i === 0 || s.wave >= SECOND_GATE - 1;
      art.dotted(g, cells.map((c) => this.mid(c)), C.route, live ? 0.85 : 0.4);
    });
    // The moths' straight line, once moths have been met.
    if (this.seen.has('moth')) s.gates.forEach((gate) => art.dotted(g, [this.mid(gate), this.mid(s.goal)], C.moth, 0.45, 1.6, 8));
    for (const tw of s.towers) {
      const m = this.mid(tw.cell);
      if (chewing.has(tw.cell)) art.chewedHedge(g, m.x, m.y, chewing.get(tw.cell)!);
      else art.tower(g, tw.kind, m.x, m.y, tw.level, tw.aim);
    }
    // The hovered tile: a ghost of the tool, its reach, or the no-entry ring.
    if (pv) {
      const m = this.mid(pv.cell);
      if (pv.blocks) art.noEntry(g, m.x, m.y);
      else {
        art.tower(g, this.tool, m.x, m.y, 1, Math.atan2(DIRS[pv.face][1], DIRS[pv.face][0]), 0.45);
        this.drawReach(g, s, this.tool, pv.cell, pv.face, 0.7, false);
      }
    }
    const picked = this.selected >= 0 ? towerAt(s, this.selected) : undefined;
    if (picked) {
      const m = this.mid(picked.cell);
      g.lineStyle(3, C.gold, 1);
      g.strokeRoundedRect(m.x - 20, m.y - 20, 40, 40, 8);
      this.drawReach(g, s, picked.kind, picked.cell, picked.face, 0.85, true);
    }
    // Ground foes, then moths above them.
    for (const flying of [false, true]) {
      for (const f of s.foes) {
        const def = FOE[f.kind];
        if (!!def.flies !== flying) continue;
        const x = this.grid.x + f.x * CELL;
        const y = this.grid.y + f.y * CELL;
        const r = def.size * CELL;
        art.foe(g, f.kind, x, y, f.angle, r, { chilled: s.clock < f.slowUntil, burning: s.clock < f.burnUntil, poisoned: s.clock < f.poisonUntil });
        if (f.hp < f.maxHp) art.healthBar(g, x, y - r - 9, f.hp / f.maxHp);
      }
    }
    for (const shot of s.shots) {
      const x = this.grid.x + shot.x * CELL;
      const y = this.grid.y + shot.y * CELL;
      if (shot.kind !== 'cannon') {
        const a = Math.atan2(shot.ty - shot.y, shot.tx - shot.x);
        const len = { bow: 7, crossbow: 10, whirligig: 4 }[shot.kind];
        g.lineStyle(shot.kind === 'crossbow' ? 3 : 2, shot.kind === 'crossbow' ? 0x5a3417 : shot.kind === 'whirligig' ? 0xffe066 : 0xefe3c8, 1);
        g.lineBetween(x - Math.cos(a) * len, y - Math.sin(a) * len, x, y);
      } else {
        g.fillStyle(0x2b2b2b, 1);
        g.fillCircle(x, y, 4.5);
      }
    }
    this.drawFlashes(g);
  }

  /** A tower's reach: a circle, a bonfire's cone, a sunglass's line or a beehive's ring of tiles. */
  private drawReach(g: Phaser.GameObjects.Graphics, s: Game, kind: TowerKind, cell: number, face: number, alpha: number, fill: boolean) {
    const def = TOWER[kind];
    const m = this.mid(cell);
    const light = 0xfff3c4;
    if (kind === 'sunglass') {
      g.fillStyle(light, fill ? 0.22 : 0.16);
      for (const c of beamCells(s, cell, face)) {
        const b = this.mid(c);
        g.fillRect(b.x - CELL / 2 + 4, b.y - CELL / 2 + 4, CELL - 8, CELL - 8);
      }
    } else if (kind === 'bonfire') {
      const a = Math.atan2(DIRS[face][1], DIRS[face][0]);
      g.fillStyle(0xffb36b, fill ? 0.25 : 0.16);
      g.slice(m.x, m.y, def.range * CELL, a - def.cone!, a + def.cone!, false);
      g.fillPath();
      g.lineStyle(2, light, alpha);
      g.slice(m.x, m.y, def.range * CELL, a - def.cone!, a + def.cone!, false);
      g.strokePath();
    } else if (kind === 'beehive') {
      g.lineStyle(2, C.gold, alpha);
      g.strokeRoundedRect(m.x - CELL * 1.5, m.y - CELL * 1.5, CELL * 3, CELL * 3, 8);
    } else if (def.range) {
      if (fill) {
        g.fillStyle(light, 0.1);
        g.fillCircle(m.x, m.y, def.range * CELL);
      }
      art.dashedCircle(g, m.x, m.y, def.range * CELL, light, alpha);
    }
  }

  private drawFlashes(g: Phaser.GameObjects.Graphics) {
    const still = settings.reduceMotion;
    for (const f of this.flashes) {
      const k = f.age / f.life;
      if (f.kind === 'pulse') {
        g.lineStyle(3, C.frost, 0.7 * (1 - k));
        g.strokeCircle(f.x, f.y, still ? f.r : f.r * (0.3 + 0.7 * k));
      } else if (f.kind === 'boom') {
        g.fillStyle(0xffd27a, 0.5 * (1 - k));
        g.fillCircle(f.x, f.y, still ? f.r : f.r * (0.5 + 0.5 * k));
      } else if (f.kind === 'bolt') {
        const pts = f.points!;
        for (const [width, colour] of [[4, 0x6fd3ff], [1.6, 0xfffbe0]] as const) {
          g.lineStyle(width, colour, 0.9 * (1 - k));
          for (let i = 1; i < pts.length; i++) g.lineBetween(pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y);
        }
      } else if (f.kind === 'flame') {
        const r = still ? f.r : f.r * (0.5 + 0.5 * k);
        g.fillStyle(0xff8a2a, 0.45 * (1 - k));
        g.slice(f.x, f.y, r, f.angle! - f.cone!, f.angle! + f.cone!, false);
        g.fillPath();
        g.fillStyle(0xffd24a, 0.5 * (1 - k));
        g.slice(f.x, f.y, r * 0.6, f.angle! - f.cone! * 0.6, f.angle! + f.cone! * 0.6, false);
        g.fillPath();
      } else if (f.kind === 'beam') {
        g.lineStyle(6, 0xfff6b0, 0.45 * (1 - k));
        g.lineBetween(f.x, f.y, f.x2!, f.y2!);
        g.lineStyle(2, 0xffffff, 0.9 * (1 - k));
        g.lineBetween(f.x, f.y, f.x2!, f.y2!);
      } else if (f.kind === 'puff') {
        g.fillStyle(0xa6d96a, 0.55 * (1 - k));
        const r = still ? f.r : f.r * (0.6 + 0.6 * k);
        for (const [a, b] of [[-0.5, 0], [0.5, -0.3], [0, 0.5]]) g.fillCircle(f.x + a * r, f.y + b * r, r * 0.6);
      } else if (f.kind === 'hit') {
        g.fillStyle(0xffffff, 0.7 * (1 - k));
        g.fillCircle(f.x, f.y, f.r);
      } else if (f.kind === 'coin') {
        f.label ??= this.add.text(0, 0, f.text!, { fontFamily: FONT, fontSize: '13px', color: css(C.gold), fontStyle: 'bold', stroke: '#3e2a1a', strokeThickness: 3 }).setOrigin(0.5).setDepth(DEPTH.fx);
        f.label.setPosition(f.x, f.y - 14 - (still ? 0 : k * 16)).setAlpha(1 - k * k);
      } else {
        art.noEntry(g, f.x, f.y);
        if (!f.label) {
          const text = this.add.text(0, 0, f.text!, { fontFamily: FONT, fontSize: '14px', color: '#ffe2c2', fontStyle: 'bold', backgroundColor: '#140e08dd', padding: { x: 10, y: 6 } });
          const right = f.x + 30 + text.width < this.grid.x + GRID.w;
          f.label = text.setPosition(right ? f.x + 26 : f.x - 26 - text.width, Math.max(this.grid.y, f.y - text.height / 2)).setDepth(DEPTH.panel);
        }
      }
    }
  }

  /** The route preview for the hovered tile, when it is free and nothing else is picked. */
  private previewFor(s: Game) {
    const cell = this.hover;
    if (cell < 0 || this.selected >= 0 || s.blocked[cell] || cell === s.goal || s.gates.includes(cell) || s.phase === 'won' || s.phase === 'lost') return null;
    if (this.preview?.cell === cell && this.preview.version === this.version && this.preview.tool === this.tool) return this.preview;
    const blocks = wouldBlock(s, cell);
    let routes: number[][] = [];
    if (!blocks) {
      const blocked = s.blocked.slice();
      blocked[cell] = 2;
      const dist = distances(blocked, s.goal);
      routes = s.gates.map((gate) => route(dist, gate));
    }
    const face = TOWER[this.tool].faces ? bestFace(s, cell, this.tool) : 0;
    this.preview = { cell, version: this.version, tool: this.tool, blocks, face, routes };
    return this.preview;
  }

  // -------------------------------------------------------------------------------------------
  // Bars, buttons and panels

  private text(x: number, y: number, s: string, size: number, colour: string, origin = 0, bold = true) {
    const text = this.add.text(x, y, s, { fontFamily: FONT, fontSize: `${size}px`, color: colour, fontStyle: bold ? 'bold' : 'normal' });
    text.setOrigin(origin, 0.5).setDepth(DEPTH.panel);
    this.texts.push(text);
    return text;
  }

  private button(id: string, x: number, y: number, w: number, h: number, label: string, onTap: () => void, opts: { enabled?: boolean; on?: boolean; fill?: number; size?: number; sub?: string } = {}) {
    const enabled = opts.enabled ?? true;
    const g = this.hudG;
    g.fillStyle(opts.fill ?? 0xffffff, opts.fill !== undefined ? (enabled ? 1 : 0.45) : opts.on ? 0.2 : 0.08);
    g.fillRoundedRect(x, y, w, h, 7);
    if (opts.on) {
      g.lineStyle(2, C.gold, 1);
      g.strokeRoundedRect(x, y, w, h, 7);
    }
    const dark = opts.fill !== undefined;
    const colour = dark ? '#2b1d10' : css(C.cream);
    if (opts.sub) {
      this.text(x + w / 2, y + h / 2 - 7, label, opts.size ?? 13, colour, 0.5).setAlpha(enabled ? 1 : 0.6);
      this.text(x + w / 2, y + h / 2 + 8, opts.sub, 11, dark ? '#2b1d10' : css(C.gold), 0.5, false).setAlpha(enabled ? 1 : 0.6);
    } else this.text(x + w / 2, y + h / 2, label, opts.size ?? 14, colour, 0.5).setAlpha(enabled ? 1 : 0.6);
    this.hits.push({ x, y, w, h, onTap, enabled });
    this.buttons[id] = { x: x + w / 2, y: y + h / 2, w, h };
  }

  /** Redraws the bars, buttons, panels and banners when what they show has changed. */
  private drawHud() {
    const s = this.state;
    const key = JSON.stringify([
      this.screen, this.vw, this.vh, this.tool, this.pouch, this.selected, this.speed, this.banner?.text,
      s && [s.wave, s.phase, s.gold, s.lives, s.spawns.length > 0, s.foes.length > 0, s.dist[s.gates[0]], s.dist[s.gates[1]], this.version],
    ]);
    if (key === this.hudKey) return;
    this.hudKey = key;
    for (const t of this.texts) t.destroy();
    this.texts = [];
    this.hits = [];
    this.buttons = {};
    this.hudG.clear();
    if (this.screen === 'menu' || !s) return this.drawMenu();
    this.drawBars(s);
    const picked = this.selected >= 0 ? towerAt(s, this.selected) : undefined;
    if (picked) this.drawPanel(s, picked);
    if (this.banner) {
      const text = this.text(this.vw / 2, this.grid.y + GRID.h - 22, this.banner.text, 16, css(C.cream), 0.5);
      text.setBackgroundColor('#3e2a1acc').setPadding(14, 7, 14, 7);
    }
    if (s.phase === 'won' || s.phase === 'lost') this.drawOver(s);
  }

  private drawBars(s: Game) {
    const g = this.hudG;
    const { vw, vh } = this;
    g.fillStyle(C.bar, 1);
    g.fillRect(0, 0, vw, BAR_H);
    g.fillRect(0, vh - BAR_H, vw, BAR_H);
    const cy = BAR_H / 2;
    this.text(16, cy, t('wave', { n: s.wave, total: WAVES.length }), 16, css(C.cream));
    this.text(172, cy, `◆ ${s.gold}`, 16, css(C.gold));
    this.text(262, cy, `♥ ${s.lives}`, 16, css(C.life));
    const a = s.dist[s.gates[0]];
    const b = s.dist[s.gates[1]];
    this.text(342, cy, s.wave >= SECOND_GATE - 1 ? t('routeTwo', { a, b }) : t('routeOne', { n: a }), 13, css(C.cream), 0, false);
    const backX = vw - 16 - BACK_BUTTON.w;
    this.button('gardens', backX, (BAR_H - BACK_BUTTON.h) / 2, BACK_BUTTON.w, BACK_BUTTON.h, t('gardens'), () => this.toMenu(), { size: 13 });
    // The picked tool's use, in the top bar.
    const tipX = this.fx + TIP_X;
    if (backX - 12 - tipX > 120) this.text(tipX, cy, t(`${this.tool}Text` as TextKey), 12, css(C.cream), 0, false).setWordWrapWidth(backX - 12 - tipX).setLineSpacing(-2);

    const by = vh - BAR_H + (BAR_H - TOOLS.h) / 2;
    this.pouch.forEach((kind, i) => {
      const x = TOOLS.x + i * (TOOLS.w + TOOLS.gap);
      this.button(`tool-${kind}`, x, by, TOOLS.w, TOOLS.h, t(`${kind}Name` as TextKey), () => this.pickTool(kind), {
        on: this.tool === kind, sub: `◆ ${TOWER[kind].cost}`, enabled: s.gold >= TOWER[kind].cost || this.tool === kind, size: 12,
      });
    });
    const wx = vw - 16 - WAVE_BUTTON.w;
    const ready = canStartWave(s);
    const label = !ready ? t('incoming') : s.foes.length > 0 ? t('nextEarly', { n: 5 }) : t('startWave', { n: s.wave + 1 });
    this.button('wave', wx, by, WAVE_BUTTON.w, WAVE_BUTTON.h, label, () => this.sendWave(), { enabled: ready, fill: C.gold });
    this.button('speed', wx - 8 - SPEED_BUTTON.w, by, SPEED_BUTTON.w, SPEED_BUTTON.h, t('speed', { n: this.speed }), () => (this.speed = this.speed === 1 ? 2 : 1), { on: this.speed === 2 });
  }

  private drawPanel(s: Game, tw: Tower) {
    const g = this.hudG;
    const m = this.mid(tw.cell);
    const faces = TOWER[tw.kind].faces;
    const h = faces ? PANEL.turnH : PANEL.h;
    const x = Phaser.Math.Clamp(m.x - PANEL.w / 2, 8, this.vw - PANEL.w - 8);
    const above = m.y - 24 - h > BAR_H + 4;
    const y = above ? m.y - 24 - h : m.y + 24;
    g.fillStyle(0x000000, 0.25);
    g.fillRoundedRect(x + 2, y + 3, PANEL.w, h, 9);
    g.fillStyle(C.bar, 0.96);
    g.fillRoundedRect(x, y, PANEL.w, h, 9);
    const name = t(`${tw.kind}Name` as TextKey);
    this.text(x + 12, y + 16, tw.kind === 'hedge' ? name : `${name} · ${t('level', { n: tw.level })}`, 14, css(C.cream));
    const cost = nextUpgrade(tw);
    const bw = PANEL.w - 24;
    if (tw.kind !== 'hedge') {
      this.button('upgrade', x + 12, y + 32, bw, 28, cost === null ? t('topLevel') : t('upgrade', { n: `◆ ${cost}` }), () => {
        upgrade(s, tw.cell);
        this.drain(s);
      }, { enabled: cost !== null && s.gold >= cost, fill: C.gold, size: 13 });
    } else this.text(x + 12, y + 46, t('hedgeText'), 12, css(C.cream), 0, false);
    this.button('sell', x + 12, y + 64, bw, 28, t('sell', { n: `◆ ${sellValue(tw)}` }), () => {
      sell(s, tw.cell);
      this.drain(s);
      this.selected = -1;
    }, { size: 13 });
    if (faces) this.button('turn', x + 12, y + 96, bw, 28, t('turn'), () => {
      turn(s, tw.cell);
      this.changed();
    }, { size: 13 });
  }

  private drawOver(s: Game) {
    const g = this.hudG;
    g.fillStyle(0x1e140b, 0.55);
    g.fillRect(0, 0, this.vw, this.vh);
    const w = 440;
    const h = 200;
    const x = (this.vw - w) / 2;
    const y = (this.vh - h) / 2;
    g.fillStyle(C.bar, 1);
    g.fillRoundedRect(x, y, w, h, 14);
    const won = s.phase === 'won';
    this.text(this.vw / 2, y + 44, t(won ? 'won' : 'lost'), 26, css(won ? C.gold : C.cream), 0.5);
    this.text(this.vw / 2, y + 88, won ? t('wonText', { n: s.lives }) : t('lostText', { n: s.wave }), 15, css(C.cream), 0.5, false);
    this.button('again', x + 40, y + 128, 170, 40, t('again'), () => this.start(s.map), { fill: C.gold });
    this.button('gardens', x + w - 210, y + 128, 170, 40, t('gardens'), () => this.toMenu());
  }

  private drawMenu() {
    const g = this.hudG;
    const { fx, fy } = this;
    this.text(this.vw / 2, fy + 62, t('title'), 44, css(C.cream), 0.5).setStroke('#2e6b2b', 8);
    this.text(this.vw / 2, fy + 112, t('tagline'), 16, '#2d3b1f', 0.5);
    this.text(this.vw / 2, fy + 148, t('pickGarden'), 14, '#2d3b1f', 0.5, false);
    MAPS.forEach((map, i) => {
      const cx = fx + CARDS.xs[i];
      const x = cx - CARDS.w / 2;
      const y = fy + CARDS.y - CARDS.h / 2 + 40;
      g.fillStyle(C.shadow, 0.25);
      g.fillRoundedRect(x + 3, y + 5, CARDS.w, CARDS.h, 14);
      g.fillStyle(C.bar, 1);
      g.fillRoundedRect(x, y, CARDS.w, CARDS.h, 14);
      // A small plan of the garden: its rocks, burrows and cottage.
      const cell = 10;
      const mx = cx - (COLS * cell) / 2;
      const my = y + 16;
      g.fillStyle(C.lawn, 1);
      g.fillRoundedRect(mx - 4, my - 4, COLS * cell + 8, ROWS * cell + 8, 6);
      g.fillStyle(C.rock, 1);
      for (const [rx, ry] of map.rocks) g.fillRoundedRect(mx + rx * cell + 1, my + ry * cell + 1, cell - 2, cell - 2, 2);
      g.fillStyle(C.soil, 1);
      for (const [gx, gy] of map.gates) g.fillCircle(mx + (gx + 0.5) * cell, my + (gy + 0.5) * cell, 5);
      g.fillStyle(0xc2573f, 1);
      g.fillTriangle(mx + map.goal[0] * cell, my + (map.goal[1] + 0.9) * cell, mx + (map.goal[0] + 0.5) * cell, my + map.goal[1] * cell - 2, mx + (map.goal[0] + 1) * cell, my + (map.goal[1] + 0.9) * cell);
      this.text(cx, my + ROWS * cell + 26, t(`${map.id}Name` as TextKey), 20, css(C.cream), 0.5);
      this.text(cx, my + ROWS * cell + 56, t(`${map.id}Text` as TextKey), 13, css(C.cream), 0.5, false).setWordWrapWidth(CARDS.w - 28).setAlign('center');
      const r = this.records[map.id];
      this.text(cx, y + CARDS.h - 22, r.won ? t('bestWon') : r.wave > 0 ? t('best', { n: r.wave }) : t('notPlayed'), 13, css(C.gold), 0.5);
      this.hits.push({ x, y, w: CARDS.w, h: CARDS.h, onTap: () => this.start(map), enabled: true });
      this.buttons[`map-${map.id}`] = { x: cx, y: y + CARDS.h / 2, w: CARDS.w, h: CARDS.h };
    });
    // The pouch: hedge and bow always come, and up to four of these.
    const kinds = TOWERS.filter((k) => !ALWAYS.includes(k));
    const picks = this.pouch.length - ALWAYS.length;
    this.text(this.vw / 2, fy + CHIPS.labelY, t('pouch', { n: POUCH_PICKS, left: POUCH_PICKS - picks }), 13, '#2d3b1f', 0.5);
    const rowW = kinds.length * (CHIPS.w + CHIPS.gap) - CHIPS.gap;
    kinds.forEach((kind, i) => {
      const on = this.pouch.includes(kind);
      const x = (this.vw - rowW) / 2 + i * (CHIPS.w + CHIPS.gap);
      g.fillStyle(C.bar, 1);
      g.fillRoundedRect(x, fy + CHIPS.y, CHIPS.w, CHIPS.h, 7);
      this.button(`pouch-${kind}`, x, fy + CHIPS.y, CHIPS.w, CHIPS.h, t(`${kind}Name` as TextKey), () => this.togglePouch(kind), {
        on, enabled: on || picks < POUCH_PICKS, sub: `◆ ${TOWER[kind].cost}`, size: 12,
      });
    });
  }
}
