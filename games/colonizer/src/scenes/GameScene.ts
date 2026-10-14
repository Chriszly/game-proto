import Phaser from 'phaser';
import {
  BOONS,
  BUILD_ORDER,
  BUILDINGS,
  FACTIONS,
  MAP_SIZE,
  TECHS,
  TILE,
  UNITS,
  unitFor,
  type BoonId,
  type BuildingId,
  type FactionId,
  type Resource,
} from '../game/data';
import { generateMap, idx } from '../game/map';
import {
  PLAYER,
  affordable,
  canPlace,
  chooseBoon,
  createGame,
  deedsDone,
  entityAt,
  issue,
  placeBuilding,
  popCap,
  popUsed,
  research,
  say,
  tick,
  train,
  visible,
  type Building,
  type GameState,
  type Unit,
} from '../game/sim';
import { think } from '../game/planner';
import { byDifficulty, settings } from '../../../../shared/settings';
import { FEET, FRAME, WOOL } from '../art/figures';
import { BUILDING_TOP, CHUNK, paintChunk, TREE_TOP } from '../art/scenery';
import { hexNum, SERIF, T } from '../art/stitch';
import { buildingKey, figKey, TREE_VARIANTS } from './BootScene';
import { Effects } from './fx';
import { DeedCard, Minimap, stitchEllipse, stitchLine, Toast, TopBar } from './hud';
import { BOON, BUTTONS, PANEL_Y, SEL, TOP_H } from './layout';

const SCROLL_PX_PER_S = 520;
/** How long a raid's horn toast stays up, in game time. */
const RAID_TOAST_MS = 10_000;
const FOG_RES = 256;

interface Hud {
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

const text = (size: number, color: string = T.ink, bold = false): Phaser.Types.GameObjects.Text.TextStyle => ({
  fontFamily: SERIF,
  fontSize: `${size}px`,
  fontStyle: bold ? 'bold' : 'normal',
  color,
});

/** A match of Colonizer: the world, its sprites, the selection and the bottom panel. */
export class GameScene extends Phaser.Scene {
  /** The rules; the test reads it, the scene changes it only through sim functions. */
  state!: GameState;
  /** Selected own units and buildings, by id. */
  selected = new Set<number>();
  /** Control groups, 1 to 9, by key. */
  groups = new Map<number, number[]>();
  /** A building waiting for a place on the map. */
  placing: BuildingId | null = null;
  /** The next click attack-moves the selected army. */
  attackMode = false;
  /** Whether the bottom panel shows the build list. */
  buildMenu = false;
  /** Buttons in the bottom panel (and the boon cards), in screen coordinates, for the test and for hit-testing. */
  hud: Hud[] = [];
  /** Drop-off badges shown for the player, newest last, such as '+10 wood'. */
  popLog: string[] = [];
  /** Raid toasts shown, newest last. */
  toastLog: string[] = [];
  /** The horn toast, whose `shown` is the line on screen. */
  toast!: Toast;

  private faction!: FactionId;
  private aiFaction!: FactionId;
  private unitSprites = new Map<number, Phaser.GameObjects.Image>();
  private buildingSprites = new Map<number, Phaser.GameObjects.Image>();
  private nodeSprites = new Map<number, Phaser.GameObjects.Image>();
  private chunks = new Set<number>();
  private terrain!: Uint8Array;
  private rings!: Phaser.GameObjects.Graphics;
  private fogTex!: Phaser.Textures.CanvasTexture;
  private fogMask!: HTMLCanvasElement;
  private fogData!: ImageData;
  private lastSight = new Uint8Array(MAP_SIZE * MAP_SIZE).fill(255);
  private needle!: Phaser.GameObjects.Image;
  private needleClock = 0;
  private ghost: Phaser.GameObjects.Image | null = null;
  private dragStart: { x: number; y: number } | null = null;
  private dragBox!: Phaser.GameObjects.Graphics;
  private fx!: Effects;
  private top!: TopBar;
  private deeds!: DeedCard;
  private mini!: Minimap;
  private lastRaid = 0;
  private raidToastUntil = 0;
  private selTitle!: Phaser.GameObjects.Text;
  private selInfo!: Phaser.GameObjects.Text;
  private selBig!: Phaser.GameObjects.Image;
  private selFigs: Phaser.GameObjects.Image[] = [];
  private selG!: Phaser.GameObjects.Graphics;
  private endPanel: Phaser.GameObjects.Container | null = null;
  private buttonObjects: Phaser.GameObjects.GameObject[] = [];
  private panelKey = '';
  private arrows!: Record<'up' | 'down' | 'left' | 'right', Phaser.Input.Keyboard.Key>;

  constructor() {
    super('Game');
  }

  init(data: { faction?: FactionId; aiFaction?: FactionId }) {
    this.faction = data.faction ?? 'ember';
    this.aiFaction = data.aiFaction ?? 'tide';
    this.selected = new Set();
    this.groups = new Map();
    this.placing = null;
    this.attackMode = false;
    this.buildMenu = false;
    this.hud = [];
    this.popLog = [];
    this.toastLog = [];
    this.unitSprites = new Map();
    this.buildingSprites = new Map();
    this.nodeSprites = new Map();
    this.chunks = new Set();
    this.lastSight = new Uint8Array(MAP_SIZE * MAP_SIZE).fill(255);
    this.ghost = null;
    this.endPanel = null;
    this.buttonObjects = [];
    this.panelKey = '';
    this.selFigs = [];
    this.lastRaid = 0;
    this.raidToastUntil = 0;
  }

  create() {
    const map = generateMap();
    this.terrain = map.terrain;
    // The difficulty sets how fast the AI gathers; Normal is the game as designed.
    this.state = createGame(this.faction, this.aiFaction, byDifficulty(0.75, 1, 1.25), map);
    const town = [...this.state.buildings.values()].find((b) => b.owner === PLAYER && b.type === 'town')!;
    const world = MAP_SIZE * TILE;
    this.cameras.main.setBounds(0, 0, world, world);
    this.cameras.main.setBackgroundColor(T.linen);
    this.cameras.main.centerOn(town.tx * TILE + 64, town.ty * TILE + 64);

    // Each match has its own ground; drop the last match's chunks, then paint those in view.
    for (const key of this.textures.getTextureKeys()) if (key.startsWith('ground-')) this.textures.remove(key);
    this.paintGround();

    // Fog: unworked linen, masked by what the player has seen, at 2 px a tile and scaled up softly.
    if (this.textures.exists('fog')) this.textures.remove('fog');
    this.fogTex = this.textures.createCanvas('fog', FOG_RES, FOG_RES)!;
    this.fogMask = document.createElement('canvas');
    this.fogMask.width = MAP_SIZE;
    this.fogMask.height = MAP_SIZE;
    this.fogData = new ImageData(MAP_SIZE, MAP_SIZE);
    this.add.image(0, 0, 'fog').setOrigin(0, 0).setScale((MAP_SIZE * TILE) / FOG_RES).setDepth(5000);
    this.needle = this.add.image(0, 0, 'needle').setOrigin(40 / 56, 9 / 56).setDepth(5001).setVisible(false);
    this.rings = this.add.graphics().setDepth(4950);
    this.dragBox = this.add.graphics().setDepth(4960);
    this.fx = new Effects(this);

    this.buildHud();
    this.input.mouse?.disableContextMenu();
    this.input.on('pointerdown', this.onPointerDown, this);
    this.input.on('pointermove', this.onPointerMove, this);
    this.input.on('pointerup', this.onPointerUp, this);
    this.input.keyboard?.on('keydown', this.onKey, this);
    this.arrows = this.input.keyboard!.addKeys({ up: 'UP', down: 'DOWN', left: 'LEFT', right: 'RIGHT' }) as unknown as Record<'up' | 'down' | 'left' | 'right', Phaser.Input.Keyboard.Key>;

    this.selectOwn([town.id]);
  }

  update(_time: number, delta: number) {
    const dt = Math.min(delta, 250);
    if (this.state.winner === null) {
      tick(this.state, dt);
      think(this.state, dt);
    }
    this.scroll(dt);
    this.paintGround();
    this.syncSprites();
    this.drainEvents();
    this.fx.update(dt);
    this.renderFog(dt);
    this.renderRings();
    this.top.update(this.state);
    this.deeds.update(this.state);
    this.mini.update(this.state, dt, this.cameras.main.worldView);
    this.renderToast();
    this.renderPanel();
    this.renderGhost();
    if (this.state.winner !== null && !this.endPanel) this.showEnd();
  }

  /** Converts a screen point (in the 960x540 game space) to a world point. */
  toWorld(x: number, y: number) {
    const p = this.cameras.main.getWorldPoint(x, y);
    return { x: p.x / TILE, y: p.y / TILE };
  }

  /** The screen point, in game space, of a world tile. */
  toScreen(tx: number, ty: number) {
    const cam = this.cameras.main;
    return { x: tx * TILE - cam.scrollX, y: ty * TILE - cam.scrollY };
  }

  // ----------------------------------------------------------- ground, sprites and fog

  /** Paints the ground chunks the camera can see, a few at a time. */
  private paintGround() {
    const v = this.cameras.main.worldView;
    const span = CHUNK * TILE;
    const n = MAP_SIZE / CHUNK;
    let budget = 4;
    for (let cy = Math.max(0, Math.floor(v.y / span)); cy <= Math.min(n - 1, Math.floor((v.bottom - 1) / span)); cy++)
      for (let cx = Math.max(0, Math.floor(v.x / span)); cx <= Math.min(n - 1, Math.floor((v.right - 1) / span)); cx++) {
        const key = cy * n + cx;
        if (this.chunks.has(key) || budget-- <= 0) continue;
        this.chunks.add(key);
        const tex = `ground-${cx}-${cy}`;
        this.textures.addCanvas(tex, paintChunk(this.terrain, cx, cy));
        this.add.image(cx * span, cy * span, tex).setOrigin(0, 0).setDepth(-10);
      }
  }

  /** The frame a unit shows now, from what it is doing. */
  private frameOf(u: Unit) {
    const s = this.state;
    const still = settings.reduceMotion;
    const t = s.time + u.id * 53;
    const def = UNITS[u.type];
    const work = [0, 0, 0, 1, 2, 2, 2];
    if (def.role === 'villager') {
      if (u.act === 'gather') return `${u.carry === 'wood' ? 'chop' : u.carry === 'ore' ? 'mine' : 'reap'}-${still ? 0 : work[Math.floor(t / 110) % work.length]}`;
      if (u.act === 'build') return `build-${still ? 0 : work[Math.floor(t / 110) % work.length]}`;
      if (u.amount > 0 && u.carry) return `carry-${u.carry}-${u.act === 'walk' && !still ? Math.floor(t / 140) % 4 : 0}`;
      if (u.act === 'walk') return `walk-${still ? 0 : Math.floor(t / 140) % 4}`;
      return 'idle-0';
    }
    const since = s.time - u.struck;
    if (u.act === 'fight' || since < def.cooldown * 0.3) {
      if (still) return 'attack-0';
      // Right after a blow: the follow-through; then the wind-up, then the swing coming in.
      const p = since / def.cooldown;
      return `attack-${p < 0.3 ? 2 : p < 0.7 ? 0 : 1}`;
    }
    if (u.act === 'walk') return `walk-${still ? 0 : Math.floor(t / (def.role === 'cavalry' ? 100 : 130)) % 4}`;
    return 'idle-0';
  }

  private syncSprites() {
    const s = this.state;
    for (const [id, img] of this.unitSprites) {
      if (!s.units.has(id)) {
        img.destroy();
        this.unitSprites.delete(id);
      }
    }
    for (const u of s.units.values()) {
      let img = this.unitSprites.get(u.id);
      if (!img) {
        img = this.add.image(0, 0, figKey(u.type, s.players[u.owner].faction), 'idle-0').setOrigin(FEET.x / FRAME, FEET.y / FRAME);
        this.unitSprites.set(u.id, img);
      }
      const seen = u.owner === PLAYER || visible(s, Math.floor(u.x), Math.floor(u.y));
      img.setVisible(seen);
      if (!seen) continue;
      img.setFrame(this.frameOf(u));
      img.setFlipX(u.face < 0);
      img.setPosition(u.x * TILE, u.y * TILE);
      img.setDepth(u.y * TILE + 2);
    }

    for (const [id, img] of this.buildingSprites) {
      if (!s.buildings.has(id)) {
        img.destroy();
        this.buildingSprites.delete(id);
      }
    }
    for (const b of s.buildings.values()) {
      let img = this.buildingSprites.get(b.id);
      if (!img) {
        img = this.add.image(0, 0, buildingKey(s.players[b.owner].faction, b.type)).setOrigin(0, 0);
        this.buildingSprites.set(b.id, img);
      }
      const def = BUILDINGS[b.type];
      const seen = b.owner === PLAYER || s.sight[idx(b.tx, b.ty)] >= 1;
      img.setVisible(seen);
      img.setPosition(b.tx * TILE, b.ty * TILE - BUILDING_TOP);
      img.setDepth((b.ty + def.h) * TILE);
      img.setAlpha(b.built ? 1 : 0.5);
    }

    for (const [id, img] of this.nodeSprites) {
      if (!s.nodes.has(id)) {
        img.destroy();
        this.nodeSprites.delete(id);
      }
    }
    for (const n of s.nodes.values()) {
      let img = this.nodeSprites.get(n.id);
      if (!img) {
        const key = n.kind === 'tree' ? `tree-${n.id % TREE_VARIANTS}` : n.kind === 'bush' ? 'bush' : 'mine';
        img = this.add.image(n.tx * TILE, n.ty * TILE - (n.kind === 'tree' ? TREE_TOP : 0), key).setOrigin(0, 0);
        img.setDepth((n.ty + n.h) * TILE - 1);
        this.nodeSprites.set(n.id, img);
      }
      img.setVisible(s.sight[idx(n.tx, n.ty)] >= 1);
    }
  }

  /** Turns what the sim reported this tick into sparks, numbers and drop-off badges. */
  private drainEvents() {
    const s = this.state;
    for (const e of s.events) {
      if (!visible(s, Math.floor(e.x), Math.floor(e.y))) continue;
      if (e.t === 'hit') this.fx.hit(e.x, e.y, e.fromX, e.fromY, e.dmg, e.ranged);
      else if (e.owner === PLAYER) {
        this.fx.drop(e.x, e.y, e.res, e.n);
        this.popLog.push(`+${e.n} ${e.res}`);
        if (this.popLog.length > 20) this.popLog.shift();
      }
    }
    s.events.length = 0;
  }

  private renderFog(dt: number) {
    const s = this.state;
    let changed = false;
    for (let i = 0; i < s.sight.length; i++)
      if (s.sight[i] !== this.lastSight[i]) {
        changed = true;
        break;
      }
    if (changed) {
      this.lastSight.set(s.sight);
      const px = this.fogData.data;
      for (let i = 0; i < MAP_SIZE * MAP_SIZE; i++) {
        const v = s.sight[i];
        px[i * 4 + 3] = v === 2 ? 0 : v === 1 ? 120 : 255;
      }
      this.fogMask.getContext('2d')!.putImageData(this.fogData, 0, 0);
      const c = this.fogTex.getContext();
      c.globalCompositeOperation = 'source-over';
      c.clearRect(0, 0, FOG_RES, FOG_RES);
      c.drawImage(this.textures.get('fog-pattern').getSourceImage() as HTMLCanvasElement, 0, 0, FOG_RES, FOG_RES);
      c.globalCompositeOperation = 'destination-in';
      c.imageSmoothingEnabled = true;
      c.drawImage(this.fogMask, 0, 0, FOG_RES, FOG_RES);
      c.globalCompositeOperation = 'source-over';
      this.fogTex.refresh();
    }
    // The needle sits at the edge of the known land nearest the middle of the view.
    this.needleClock -= dt;
    if (this.needleClock > 0) return;
    this.needleClock = 1500;
    const v = this.cameras.main.worldView;
    const cx = (v.x + v.width / 2) / TILE;
    const cy = (v.y + (PANEL_Y - TOP_H) / 2) / TILE;
    let best: { x: number; y: number; d: number } | null = null;
    for (let ty = Math.max(1, Math.floor(v.y / TILE) + 3); ty < Math.min(MAP_SIZE - 1, Math.floor((v.y + PANEL_Y) / TILE) - 2); ty++)
      for (let tx = Math.max(1, Math.floor(v.x / TILE) + 2); tx < Math.min(MAP_SIZE - 1, Math.floor(v.right / TILE) - 2); tx++) {
        if (s.sight[idx(tx, ty)] !== 0) continue;
        if (s.sight[idx(tx - 1, ty)] === 0 && s.sight[idx(tx, ty - 1)] === 0 && s.sight[idx(tx, ty + 1)] === 0) continue;
        const d = Math.hypot(tx - cx, ty - cy);
        if (!best || d < best.d) best = { x: tx, y: ty, d };
      }
    if (best) this.needle.setPosition((best.x + 0.5) * TILE, (best.y + 0.5) * TILE).setVisible(true);
    else this.needle.setVisible(false);
  }

  /** Selection rings in chain stitch, health threads and build progress, over the sprites. */
  private renderRings() {
    const g = this.rings;
    g.clear();
    const s = this.state;
    const ochre = hexNum(T.ochre);
    for (const id of this.selected) {
      const u = s.units.get(id);
      if (u) stitchEllipse(g, u.x * TILE, u.y * TILE + 1, 11, 4.5, 1.5, ochre);
      const b = s.buildings.get(id);
      if (b) {
        const def = BUILDINGS[b.type];
        const x0 = b.tx * TILE - 2;
        const y0 = b.ty * TILE - 2;
        const x1 = (b.tx + def.w) * TILE + 2;
        const y1 = (b.ty + def.h) * TILE + 2;
        stitchLine(g, x0, y1, x1, y1, 1.5, ochre);
        stitchLine(g, x0, y0 + def.h * TILE * 0.5, x0, y1, 1.5, ochre);
        stitchLine(g, x1, y0 + def.h * TILE * 0.5, x1, y1, 1.5, ochre);
      }
    }
    for (const u of s.units.values()) {
      const max = UNITS[u.type].hp;
      const mine = u.owner === PLAYER;
      if (!this.selected.has(u.id) && u.hp >= max) continue;
      if (!mine && !visible(s, Math.floor(u.x), Math.floor(u.y))) continue;
      const top = u.y * TILE - (UNITS[u.type].role === 'cavalry' ? 48 : 40);
      this.thread(g, u.x * TILE - 9, top, 18, u.hp / max, mine ? T.green : WOOL[s.players[u.owner].faction].cloth);
    }
    for (const b of s.buildings.values()) {
      const def = BUILDINGS[b.type];
      if (b.owner !== PLAYER && !visible(s, b.tx, b.ty)) continue;
      if (!b.built) this.thread(g, b.tx * TILE + 4, b.ty * TILE - BUILDING_TOP + 2, def.w * TILE - 8, 1 - b.buildLeft / Math.max(1, def.time), T.indigo);
      else if (b.hp < def.hp) this.thread(g, b.tx * TILE + 4, b.ty * TILE - BUILDING_TOP + 2, def.w * TILE - 8, b.hp / def.hp, b.owner === PLAYER ? T.green : T.red);
    }
  }

  /** A health or progress bar as two stitched threads. */
  private thread(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, frac: number, col: string) {
    stitchLine(g, x, y, x + w, y, 2.2, hexNum('#b8a888'));
    const f = Math.max(0, Math.min(1, frac));
    if (f > 0) stitchLine(g, x, y, x + w * f, y, 2.2, hexNum(col));
  }

  private scroll(dt: number) {
    const cam = this.cameras.main;
    const k = this.arrows;
    let dx = 0;
    let dy = 0;
    if (k.left.isDown) dx -= 1;
    if (k.right.isDown) dx += 1;
    if (k.up.isDown) dy -= 1;
    if (k.down.isDown) dy += 1;
    const p = this.input.activePointer;
    if (p.isDown === false && p.x > 0 && p.x < 960 && p.y > 0 && p.y < 540) {
      if (p.x < 6) dx -= 1;
      if (p.x > 954) dx += 1;
      if (p.y < 6) dy -= 1;
      if (p.y > 534) dy += 1;
    }
    cam.setScroll(cam.scrollX + (dx * SCROLL_PX_PER_S * dt) / 1000, cam.scrollY + (dy * SCROLL_PX_PER_S * dt) / 1000);
  }

  // ----------------------------------------------------------- selection and commands

  private selectOwn(ids: number[]) {
    this.selected.clear();
    for (const id of ids) {
      const u = this.state.units.get(id);
      const b = this.state.buildings.get(id);
      if ((u && u.owner === PLAYER) || (b && b.owner === PLAYER)) this.selected.add(id);
    }
    this.panelKey = '';
  }

  private selectedUnits(): Unit[] {
    const out: Unit[] = [];
    for (const id of this.selected) {
      const u = this.state.units.get(id);
      if (u && u.owner === PLAYER) out.push(u);
    }
    return out;
  }

  private selectedBuilding(): Building | null {
    for (const id of this.selected) {
      const b = this.state.buildings.get(id);
      if (b && b.owner === PLAYER) return b;
    }
    return null;
  }

  private onPointerDown(p: Phaser.Input.Pointer) {
    if (this.endPanel) return void this.scene.start('Menu');
    if (this.mini.contains(p.x, p.y)) {
      const t = this.mini.toTile(p.x, p.y);
      this.cameras.main.centerOn(t.x * TILE, t.y * TILE + (540 - PANEL_Y - TOP_H) / 2);
      return;
    }
    if (this.toast.contains(p.x, p.y)) {
      const r = this.state.raid;
      if (r) this.cameras.main.centerOn(r.x * TILE, r.y * TILE + (540 - PANEL_Y - TOP_H) / 2);
      return;
    }
    if (p.y < TOP_H || p.y >= PANEL_Y || this.deeds.contains(p.x, p.y)) return;
    const w = this.toWorld(p.x, p.y);
    const tx = w.x;
    const ty = w.y;

    if (p.rightButtonDown()) {
      if (this.placing || this.attackMode) {
        this.placing = null;
        this.attackMode = false;
        this.buildMenu = false;
        return;
      }
      this.commandAt(tx, ty);
      return;
    }

    if (this.placing) {
      this.tryPlace(this.placing, tx, ty, p.event.shiftKey);
      return;
    }
    if (this.attackMode) {
      const ids = this.selectedUnits().map((u) => u.id);
      issue(this.state, PLAYER, ids, { t: 'attackMove', x: tx, y: ty });
      this.attackMode = false;
      return;
    }
    this.dragStart = { x: p.x, y: p.y };
  }

  private onPointerMove(p: Phaser.Input.Pointer) {
    if (!this.dragStart || !p.isDown) return;
    const g = this.dragBox.clear();
    const cam = this.cameras.main;
    const x0 = Math.min(this.dragStart.x, p.x) + cam.scrollX;
    const y0 = Math.min(this.dragStart.y, p.y) + cam.scrollY;
    const x1 = Math.max(this.dragStart.x, p.x) + cam.scrollX;
    const y1 = Math.max(this.dragStart.y, p.y) + cam.scrollY;
    const ochre = hexNum(T.ochre);
    stitchLine(g, x0, y0, x1, y0, 1.2, ochre);
    stitchLine(g, x1, y0, x1, y1, 1.2, ochre);
    stitchLine(g, x1, y1, x0, y1, 1.2, ochre);
    stitchLine(g, x0, y1, x0, y0, 1.2, ochre);
  }

  private onPointerUp(p: Phaser.Input.Pointer) {
    this.dragBox.clear();
    const start = this.dragStart;
    this.dragStart = null;
    if (!start || p.y < TOP_H || p.y >= PANEL_Y) return;
    const a = this.toWorld(start.x, start.y);
    const b = this.toWorld(p.x, p.y);
    const moved = Math.hypot(p.x - start.x, p.y - start.y);
    const additive = p.event.shiftKey;
    if (moved < 5) {
      const hit = entityAt(this.state, b.x, b.y);
      if (!hit) {
        if (!additive) this.selectOwn([]);
        return;
      }
      if (hit.owner !== PLAYER && hit.kind !== 'node') {
        if (!additive) this.selectOwn([]);
        return;
      }
      if (hit.kind === 'node') return;
      if (additive) {
        if (this.selected.has(hit.id)) this.selected.delete(hit.id);
        else this.selected.add(hit.id);
      } else this.selectOwn([hit.id]);
      this.panelKey = '';
      return;
    }
    // Box select: own units inside the box, or the building under it when there are none.
    const x0 = Math.min(a.x, b.x);
    const x1 = Math.max(a.x, b.x);
    const y0 = Math.min(a.y, b.y);
    const y1 = Math.max(a.y, b.y);
    const inside = [...this.state.units.values()].filter((u) => u.owner === PLAYER && u.x >= x0 && u.x <= x1 && u.y >= y0 && u.y <= y1);
    if (!additive) this.selected.clear();
    for (const u of inside) this.selected.add(u.id);
    this.panelKey = '';
  }

  /** A right click: attack, gather, build, or walk, depending on what is under it. */
  private commandAt(tx: number, ty: number) {
    const units = this.selectedUnits();
    if (units.length === 0) return;
    const hit = entityAt(this.state, tx, ty);
    const villagers = units.filter((u) => UNITS[u.type].role === 'villager');
    const army = units.filter((u) => UNITS[u.type].role !== 'villager');
    if (hit && hit.kind !== 'node' && hit.owner !== PLAYER) {
      issue(this.state, PLAYER, army.map((u) => u.id), { t: 'attack', target: hit.id });
      issue(this.state, PLAYER, villagers.map((u) => u.id), { t: 'move', x: tx, y: ty });
      return;
    }
    if (hit && hit.kind === 'node') {
      const node = this.state.nodes.get(hit.id);
      if (node) issue(this.state, PLAYER, villagers.map((u) => u.id), { t: 'gather', node: node.id });
      issue(this.state, PLAYER, army.map((u) => u.id), { t: 'move', x: tx, y: ty });
      return;
    }
    if (hit && hit.kind === 'building') {
      const b = this.state.buildings.get(hit.id)!;
      if (!b.built) issue(this.state, PLAYER, villagers.map((u) => u.id), { t: 'build', b: b.id });
      else if (BUILDINGS[b.type].farm) issue(this.state, PLAYER, villagers.map((u) => u.id), { t: 'gather', node: b.id });
      else issue(this.state, PLAYER, villagers.map((u) => u.id), { t: 'move', x: tx, y: ty });
      issue(this.state, PLAYER, army.map((u) => u.id), { t: 'move', x: tx, y: ty });
      return;
    }
    // Walk: spread the group around the spot so the units don't stack on one tile.
    units.forEach((u, i) => {
      const ox = (i % 4) - 1.5;
      const oy = Math.floor(i / 4) - 1.5;
      issue(this.state, PLAYER, [u.id], { t: 'move', x: tx + ox, y: ty + oy });
    });
  }

  private tryPlace(type: BuildingId, tx: number, ty: number, keep: boolean) {
    const def = BUILDINGS[type];
    const ox = Math.floor(tx) - Math.floor(def.w / 2);
    const oy = Math.floor(ty) - Math.floor(def.h / 2);
    const p = this.state.players[PLAYER];
    if (!affordable(p, def.cost)) {
      say(this.state, 'Not enough resources');
      return;
    }
    if (!canPlace(this.state, type, ox, oy)) {
      say(this.state, "Can't build there");
      return;
    }
    const id = placeBuilding(this.state, PLAYER, type, ox, oy);
    if (id === null) return;
    const builders = this.selectedUnits().filter((u) => UNITS[u.type].role === 'villager');
    const builder = builders[0] ?? [...this.state.units.values()].find((u) => u.owner === PLAYER && UNITS[u.type].role === 'villager');
    if (builder) issue(this.state, PLAYER, [builder.id], { t: 'build', b: id });
    if (!keep) this.placing = null;
  }

  private onKey(e: KeyboardEvent) {
    if (this.endPanel) return;
    const digit = /^[1-9]$/.test(e.key) ? Number(e.key) : null;
    if (digit !== null) {
      if (e.ctrlKey) this.groups.set(digit, [...this.selected]);
      else {
        const ids = (this.groups.get(digit) ?? []).filter((id) => this.state.units.has(id) || this.state.buildings.has(id));
        this.selectOwn(ids);
      }
      return;
    }
    switch (e.key.toLowerCase()) {
      case 'a':
        if (this.selectedUnits().some((u) => UNITS[u.type].role !== 'villager')) this.attackMode = true;
        break;
      case 's':
        issue(this.state, PLAYER, this.selectedUnits().map((u) => u.id), { t: 'stop' });
        break;
      case 'b':
        if (this.selectedUnits().some((u) => UNITS[u.type].role === 'villager')) this.buildMenu = !this.buildMenu;
        break;
      case 'escape':
        this.placing = null;
        this.attackMode = false;
        this.buildMenu = false;
        break;
    }
  }

  // ----------------------------------------------------------- HUD and panel

  private buildHud() {
    this.add.image(0, PANEL_Y, 'panel').setOrigin(0, 0).setScrollFactor(0).setDepth(9990);
    this.top = new TopBar(this, this.faction);
    this.deeds = new DeedCard(this);
    this.toast = new Toast(this);
    this.mini = new Minimap(this, this.terrain, this.aiFaction, this.faction);
    const fix = <O extends Phaser.GameObjects.Image | Phaser.GameObjects.Text | Phaser.GameObjects.Graphics>(o: O, d = 10000) => o.setScrollFactor(0).setDepth(d) as O;
    this.selTitle = fix(this.add.text(SEL.x + 2, SEL.y + 8, '', text(13, T.ink, true)).setOrigin(0, 0.5));
    this.selInfo = fix(this.add.text(SEL.x + 2, SEL.y + 22, '', { ...text(11), lineSpacing: 2, wordWrap: { width: SEL.w - 6 } }));
    this.selBig = fix(this.add.image(0, 0, 'icon-wood').setVisible(false), 10001);
    for (let i = 0; i < 14; i++) this.selFigs.push(fix(this.add.image(0, 0, figKey('villager', this.faction), 'idle-0').setOrigin(FEET.x / FRAME, FEET.y / FRAME).setScale(0.78).setVisible(false), 10001));
    this.selG = fix(this.add.graphics(), 10002);
  }

  private renderToast() {
    const s = this.state;
    const r = s.raid;
    if (r && r.target === PLAYER && r.n !== this.lastRaid) {
      this.lastRaid = r.n;
      this.raidToastUntil = s.time + RAID_TOAST_MS;
      this.toastLog.push(`HERE THE ${FACTIONS[s.players[r.by].faction].name.toUpperCase()} RAID FROM THE ${r.from.toUpperCase()}`);
    }
    if (r && r.target === PLAYER && s.time < this.raidToastUntil) {
      const v = this.cameras.main.worldView;
      const angle = Math.atan2(r.y * TILE - (v.y + v.height / 2), r.x * TILE - (v.x + v.width / 2));
      this.toast.show(this.toastLog[this.toastLog.length - 1], angle);
    } else if (s.noticeMs > 0) this.toast.show(s.notice.toUpperCase(), null);
    else this.toast.hide();
  }

  /** The left of the panel: what is selected, with its figures or its building. */
  private renderSelection() {
    const g = this.selG.clear();
    for (const f of this.selFigs) f.setVisible(false);
    this.selBig.setVisible(false);
    if (this.placing || this.attackMode) {
      this.selTitle.setText(this.placing ? `PLACE ${BUILDINGS[this.placing].name.toUpperCase()}` : 'ATTACK-MOVE');
      this.selInfo.setPosition(SEL.x + 2, SEL.y + 24).setText(this.placing ? 'Click the map where it should stand.\nRight click or Esc to cancel.' : 'Click where the army should go.\nRight click or Esc to cancel.');
      return;
    }
    const units = this.selectedUnits();
    if (units.length > 1) {
      this.selTitle.setText(`${units.length} UNITS`);
      this.selInfo.setText('');
      [...units]
        .sort((a, b) => (a.type < b.type ? -1 : a.type > b.type ? 1 : a.id - b.id))
        .slice(0, 14)
        .forEach((u, i) => {
          const x = SEL.x + 16 + (i % 7) * 38;
          const y = SEL.y + 56 + Math.floor(i / 7) * 40;
          this.selFigs[i].setTexture(figKey(u.type, this.faction), 'idle-0').setPosition(x, y).setVisible(true);
          const f = u.hp / UNITS[u.type].hp;
          stitchLine(g, x - 8, y + 3, x + 8, y + 3, 1.6, hexNum('#c8b890'));
          stitchLine(g, x - 8, y + 3, x - 8 + 16 * f, y + 3, 1.6, hexNum(T.green));
        });
      return;
    }
    if (units.length === 1) {
      const u = units[0];
      const def = UNITS[u.type];
      this.selTitle.setText(def.name.toUpperCase());
      this.selBig.setTexture(figKey(u.type, this.faction), this.frameOf(u)).setOrigin(FEET.x / FRAME, FEET.y / FRAME).setScale(1.3).setPosition(SEL.x + 34, SEL.y + 96).setVisible(true);
      const lines = [`Health ${Math.ceil(u.hp)} of ${def.hp}`];
      if (u.carry && u.amount > 0) lines.push(`Carrying ${u.amount} ${u.carry}`);
      lines.push(doing(u));
      this.selInfo.setPosition(SEL.x + 76, SEL.y + 26).setText(lines.join('\n'));
      return;
    }
    const b = this.selectedBuilding();
    if (b) {
      const def = BUILDINGS[b.type];
      this.selTitle.setText(def.name.toUpperCase());
      const key = buildingKey(this.faction, b.type);
      const src = this.textures.get(key).getSourceImage();
      const k = Math.min(70 / src.width, 70 / src.height);
      this.selBig.setTexture(key).setOrigin(0, 0).setScale(k).setPosition(SEL.x, SEL.y + 22).setVisible(true);
      const lines = [b.built ? `Health ${Math.ceil(b.hp)} of ${def.hp}` : `Building, ${Math.floor((1 - b.buildLeft / def.time) * 100)}% done`];
      const head = b.queue[0];
      if (head) {
        const name = head.kind === 'unit' ? UNITS[head.key].name : TECHS[head.key].name;
        const total = head.kind === 'unit' ? UNITS[head.key].time : TECHS[head.key].time;
        lines.push(`${name}: ${Math.ceil(head.left / 1000)}s`);
        stitchLine(g, SEL.x + 84, SEL.y + 70, SEL.x + 200, SEL.y + 70, 3, hexNum('#c8b890'));
        stitchLine(g, SEL.x + 84, SEL.y + 70, SEL.x + 84 + 116 * (1 - head.left / total), SEL.y + 70, 3, hexNum(T.red));
        if (b.queue.length > 1) lines.push(`and ${b.queue.length - 1} more queued`);
      }
      this.selInfo.setPosition(SEL.x + 84, SEL.y + 24).setText(lines.join('\n'));
      return;
    }
    this.selTitle.setText('NOTHING SELECTED');
    this.selInfo.setPosition(SEL.x + 2, SEL.y + 24).setText('Drag or click your units,\nor click a building.');
  }

  /** Rebuilds the panel's buttons when the selection, the menus or what they show changes. */
  private renderPanel() {
    this.renderSelection();
    const key = this.panelSignature();
    if (key === this.panelKey) return;
    this.panelKey = key;
    for (const o of this.buttonObjects) o.destroy();
    this.buttonObjects = [];
    this.hud = [];
    if (this.state.players[PLAYER].boonPending) return this.renderBoon();
    this.actions()
      .slice(0, BUTTONS.cols * BUTTONS.rows)
      .forEach((a, i) => {
        const x = BUTTONS.x + (i % BUTTONS.cols) * BUTTONS.dx;
        const y = BUTTONS.y + Math.floor(i / BUTTONS.cols) * BUTTONS.dy;
        const bg = this.add.image(x - 2, y - 2, a.enabled ? 'btn-on' : 'btn-off').setOrigin(0, 0).setScrollFactor(0).setDepth(10001);
        const [name, cost] = splitLabel(a.label);
        const label = this.add.text(x + 9, y + 9.5, name.toUpperCase(), text(10.5, a.enabled ? T.ink : T.faded, true)).setOrigin(0, 0.5).setScrollFactor(0).setDepth(10002);
        const sub = this.add.text(x + 9, y + 21.5, cost, text(9.5, a.enabled ? '#5a3a20' : '#9a8a70')).setOrigin(0, 0.5).setScrollFactor(0).setDepth(10002);
        if (a.enabled) {
          bg.setInteractive({ useHandCursor: true });
          bg.on('pointerover', () => bg.setTexture('btn-hot'));
          bg.on('pointerout', () => bg.setTexture('btn-on'));
          bg.on('pointerdown', () => a.run());
        }
        this.buttonObjects.push(bg, label, sub);
        this.hud.push({ label: a.label, x, y, w: BUTTONS.w, h: BUTTONS.h });
      });
  }

  /** The Age II boon: two cards in place of the buttons until one is picked. */
  private renderBoon() {
    const title = this.add.text(BOON.x + 2, BOON.y - 10, 'AGE II BOON · PICK ONE', text(11, T.red, true)).setOrigin(0, 0.5).setScrollFactor(0).setDepth(10002);
    this.buttonObjects.push(title);
    (Object.keys(BOONS) as BoonId[]).forEach((id, i) => {
      const boon = BOONS[id];
      const x = BOON.x + i * BOON.dx;
      const y = BOON.y;
      const bg = this.add.image(x - 2, y - 2, 'card-boon').setOrigin(0, 0).setScrollFactor(0).setDepth(10001).setInteractive({ useHandCursor: true });
      const icon = this.add.image(x + 18, y + 20, id === 'shieldwall' ? 'icon-shield' : 'icon-wheat').setScrollFactor(0).setDepth(10002);
      const name = this.add.text(x + 34, y + 18, boon.name.toUpperCase(), text(12, T.red, true)).setOrigin(0, 0.5).setScrollFactor(0).setDepth(10002);
      const body = id === 'shieldwall' ? `Your ${unitFor(this.faction, 'melee').name} take 20% less damage` : boon.text;
      const words = this.add.text(x + 12, y + 36, body, { ...text(11), wordWrap: { width: BOON.w - 24 } }).setScrollFactor(0).setDepth(10002);
      const choose = this.add.text(x + BOON.w / 2, y + BOON.h - 9, 'CHOOSE', text(9.5, T.green, true)).setOrigin(0.5).setScrollFactor(0).setDepth(10002);
      bg.on('pointerover', () => bg.setTexture('card-boon-hot').setPosition(x - 5, y - 5));
      bg.on('pointerout', () => bg.setTexture('card-boon').setPosition(x - 2, y - 2));
      bg.on('pointerdown', () => {
        if (chooseBoon(this.state, PLAYER, id)) say(this.state, `${boon.name} chosen`);
      });
      this.buttonObjects.push(bg, icon, name, words, choose);
      this.hud.push({ label: boon.name, x, y, w: BOON.w, h: BOON.h });
    });
  }

  private panelSignature() {
    const b = this.selectedBuilding();
    const q = b ? b.queue.map((x) => x.key).join(',') : '';
    const p = this.state.players[PLAYER];
    return [...this.selected].join(',') + `|${this.buildMenu}|${this.placing}|${this.attackMode}|${q}|${p.techs.join(',')}|${p.age}|${p.boonPending}|${deedsDone(p)}|${this.resourceKey()}`;
  }

  private resourceKey() {
    const r = this.state.players[PLAYER].res;
    return `${Math.floor(r.wood / 10)}/${Math.floor(r.food / 10)}/${Math.floor(r.ore / 10)}`;
  }

  /** What the panel offers for the current selection, as buttons. */
  private actions(): { label: string; enabled: boolean; run: () => void }[] {
    const s = this.state;
    const p = s.players[PLAYER];
    const out: { label: string; enabled: boolean; run: () => void }[] = [];
    const costOf = (cost: Partial<Record<Resource, number>>) => Object.entries(cost).map(([r, n]) => `${n}${r[0]}`).join(' ');
    if (this.placing) return [{ label: 'Cancel', enabled: true, run: () => (this.placing = null) }];
    if (this.buildMenu) {
      for (const type of BUILD_ORDER) {
        const def = BUILDINGS[type];
        out.push({
          label: `${def.name} ${costOf(def.cost)}`,
          enabled: affordable(p, def.cost),
          run: () => {
            this.buildMenu = false;
            this.placing = type;
          },
        });
      }
      out.push({ label: 'Back', enabled: true, run: () => (this.buildMenu = false) });
      return out;
    }
    const units = this.selectedUnits();
    const villagers = units.filter((u) => UNITS[u.type].role === 'villager');
    const army = units.filter((u) => UNITS[u.type].role !== 'villager');
    if (villagers.length > 0) out.push({ label: 'Build (B)', enabled: true, run: () => (this.buildMenu = true) });
    if (army.length > 0) {
      out.push({ label: 'Attack (A)', enabled: true, run: () => (this.attackMode = true) });
      out.push({ label: 'Stop (S)', enabled: true, run: () => issue(this.state, PLAYER, units.map((u) => u.id), { t: 'stop' }) });
    }
    const b = this.selectedBuilding();
    if (b && b.built) {
      const def = BUILDINGS[b.type];
      for (const role of def.trains ?? []) {
        const unit = role === 'villager' ? UNITS.villager : unitFor(this.faction, role);
        const ok = affordable(p, unit.cost) && popUsed(this.state, PLAYER) < popCap(this.state, PLAYER);
        out.push({
          label: `${unit.name} ${costOf(unit.cost)}`,
          enabled: ok,
          run: () => {
            if (!train(this.state, PLAYER, b.id, unit.id)) say(this.state, 'Not enough resources or population');
          },
        });
      }
      if (def.research) {
        for (const tech of Object.values(TECHS)) {
          if (tech.at !== 'academy') continue;
          out.push({
            label: `${tech.name} ${costOf(tech.cost)}`,
            enabled: affordable(p, tech.cost) && !p.techs.includes(tech.id) && (!tech.age2 || p.age >= 2),
            run: () => {
              if (!research(this.state, PLAYER, b.id, tech.id)) say(this.state, "Can't research that yet");
            },
          });
        }
      }
      if (b.type === 'town' && p.age < 3) {
        const next = p.age === 1 ? TECHS.age2 : TECHS.age3;
        const ready = p.age === 1 || deedsDone(p);
        out.push({
          label: `${next.name} ${costOf(next.cost)}`,
          enabled: ready && affordable(p, next.cost) && !b.queue.some((q) => q.key === next.id),
          run: () => {
            if (!research(this.state, PLAYER, b.id, next.id)) say(this.state, p.age === 2 ? 'Do the three deeds first' : "Can't advance yet");
          },
        });
      }
    }
    return out;
  }

  private renderGhost() {
    if (!this.placing) {
      this.ghost?.destroy();
      this.ghost = null;
      return;
    }
    const type = this.placing;
    const def = BUILDINGS[type];
    if (!this.ghost) this.ghost = this.add.image(0, 0, buildingKey(this.faction, type)).setOrigin(0, 0).setAlpha(0.6).setDepth(4970);
    const p = this.input.activePointer;
    if (p.y >= TOP_H && p.y < PANEL_Y) {
      const w = this.toWorld(p.x, p.y);
      const ox = Math.floor(w.x) - Math.floor(def.w / 2);
      const oy = Math.floor(w.y) - Math.floor(def.h / 2);
      this.ghost.setPosition(ox * TILE, oy * TILE - BUILDING_TOP).setVisible(true);
      this.ghost.setTint(canPlace(this.state, type, ox, oy) ? 0x9be88a : 0xd88a6a);
    } else this.ghost.setVisible(false);
  }

  // ----------------------------------------------------------- end of the match

  private showEnd() {
    const won = this.state.winner === PLAYER;
    const bg = this.add.rectangle(480, 270, 960, 540, hexNum(T.linen), 0.72).setScrollFactor(0);
    const card = this.add.image(480, 270, 'card-end').setScrollFactor(0);
    const title = this.add.text(480, 245, won ? 'VICTORY' : 'DEFEAT', { ...text(44, won ? T.green : T.red, true) }).setOrigin(0.5).setScrollFactor(0);
    const sub = this.add.text(480, 300, 'Click to choose another faction', text(16, T.ink)).setOrigin(0.5).setScrollFactor(0);
    this.endPanel = this.add.container(0, 0, [bg, card, title, sub]).setDepth(11000);
  }
}

/** A button label is its name and then its cost, such as 'Archery Range 170w'. */
function splitLabel(label: string): [string, string] {
  const m = /^(.*?)((?: \d+[wfo])+)$/.exec(label);
  if (!m) return [label, ''];
  const names: Record<string, string> = { w: 'wood', f: 'food', o: 'ore' };
  return [m[1], m[2].trim().split(' ').map((c) => `${c.slice(0, -1)} ${names[c.slice(-1)]}`).join(' · ')];
}

/** What a unit is doing, in words, for the panel. */
function doing(u: Unit) {
  if (u.act === 'gather') return u.carry === 'wood' ? 'Chopping wood' : u.carry === 'ore' ? 'Mining ore' : 'Gathering food';
  if (u.act === 'build') return 'Building';
  if (u.act === 'fight') return 'Fighting';
  if (u.order.t === 'return') return 'Carrying the load home';
  if (u.act === 'walk') return 'Walking';
  return 'Standing by';
}

