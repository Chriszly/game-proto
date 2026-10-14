import Phaser from 'phaser';
import {
  BUILD_ORDER,
  BUILDINGS,
  FACTIONS,
  MAP_SIZE,
  RESOURCES,
  TECHS,
  TILE,
  UNITS,
  unitFor,
  type BuildingId,
  type FactionId,
  type Resource,
} from '../game/data';
import { bakeTerrain } from '../art/sprites';
import { generateMap, idx } from '../game/map';
import {
  PLAYER,
  affordable,
  canPlace,
  createGame,
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
import { byDifficulty } from '../../../../shared/settings';
import { buildingKey, unitKey } from './BootScene';

/** Screen height of the bottom panel; the world is drawn above it. */
const PANEL_Y = 430;
const TOP_H = 30;
const FONT = 'ui-monospace, Courier New, monospace';
const SCROLL_PX_PER_S = 520;

interface Hud {
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

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
  /** Buttons in the bottom panel, in screen coordinates, for the test and for hit-testing. */
  hud: Hud[] = [];

  private faction!: FactionId;
  private aiFaction!: FactionId;
  private unitSprites = new Map<number, Phaser.GameObjects.Image>();
  private buildingSprites = new Map<number, Phaser.GameObjects.Image>();
  private nodeSprites = new Map<number, Phaser.GameObjects.Image>();
  private rings!: Phaser.GameObjects.Graphics;
  private fogTex!: Phaser.Textures.CanvasTexture;
  private fogData!: ImageData;
  private ghost: Phaser.GameObjects.Image | null = null;
  private dragStart: { x: number; y: number } | null = null;
  private dragBox!: Phaser.GameObjects.Graphics;
  private topBar!: Phaser.GameObjects.Text;
  private panel!: Phaser.GameObjects.Graphics;
  private infoText!: Phaser.GameObjects.Text;
  private noticeText!: Phaser.GameObjects.Text;
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
  }

  create() {
    const map = generateMap();
    // The difficulty sets how fast the AI gathers; Normal is the game as designed.
    this.state = createGame(this.faction, this.aiFaction, byDifficulty(0.75, 1, 1.25), map);
    const town = [...this.state.buildings.values()].find((b) => b.owner === PLAYER && b.type === 'town')!;
    const world = MAP_SIZE * TILE;
    this.cameras.main.setBounds(0, 0, world, world);
    this.cameras.main.centerOn(town.tx * TILE + 64, town.ty * TILE + 64);

    // The terrain texture is baked from this match's map, at 4px a tile and drawn at TILE / 4.
    if (this.textures.exists('terrain')) this.textures.remove('terrain');
    const terrain = this.textures.createCanvas('terrain', MAP_SIZE * 4, MAP_SIZE * 4)!;
    bakeTerrain(terrain.getContext(), map.terrain);
    terrain.refresh();
    this.add.image(0, 0, 'terrain').setOrigin(0, 0).setScale(TILE / 4).setDepth(-10);

    if (this.textures.exists('fog')) this.textures.remove('fog');
    this.fogTex = this.textures.createCanvas('fog', MAP_SIZE, MAP_SIZE)!;
    this.fogData = new ImageData(MAP_SIZE, MAP_SIZE);
    this.add.image(0, 0, 'fog').setOrigin(0, 0).setScale(TILE).setDepth(5000);
    this.rings = this.add.graphics().setDepth(4950);
    this.dragBox = this.add.graphics().setDepth(4960);

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
    this.syncSprites();
    this.renderFog();
    this.renderRings();
    this.renderTop();
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

  // ----------------------------------------------------------- terrain and sprites

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
        img = this.add.image(0, 0, unitKey(u.type)).setOrigin(0.5, 0.75);
        this.unitSprites.set(u.id, img);
      }
      const seen = u.owner === PLAYER || visible(s, Math.floor(u.x), Math.floor(u.y));
      img.setVisible(seen);
      const lastX = img.getData('lastX') as number | undefined;
      if (lastX !== undefined && Math.abs(u.x * TILE - lastX) > 0.01) img.setFlipX(u.x * TILE < lastX);
      img.setPosition(u.x * TILE, u.y * TILE);
      img.setData('lastX', u.x * TILE);
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
      img.setPosition(b.tx * TILE, b.ty * TILE);
      img.setDepth((b.ty + def.h) * TILE);
      img.setAlpha(b.built ? 1 : 0.55);
      img.setTint(b.owner === PLAYER || visible(s, b.tx, b.ty) ? 0xffffff : 0xb8c0cc);
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
        const key = n.kind === 'tree' ? `tree-${n.id % 2}` : n.kind === 'bush' ? 'bush' : 'mine';
        img = this.add.image(0, 0, key).setOrigin(0, 0);
        this.nodeSprites.set(n.id, img);
      }
      img.setVisible(s.sight[idx(n.tx, n.ty)] >= 1);
      img.setPosition(n.tx * TILE, n.ty * TILE);
      img.setDepth((n.ty + n.h) * TILE - 1);
    }
  }

  private renderFog() {
    const px = this.fogData.data;
    for (let i = 0; i < MAP_SIZE * MAP_SIZE; i++) {
      const v = this.state.sight[i];
      px[i * 4] = 10;
      px[i * 4 + 1] = 8;
      px[i * 4 + 2] = 6;
      px[i * 4 + 3] = v === 2 ? 0 : v === 1 ? 120 : 235;
    }
    this.fogTex.getContext().putImageData(this.fogData, 0, 0);
    this.fogTex.refresh();
  }

  /** Selection rings and health and build bars, drawn over the sprites. */
  private renderRings() {
    const g = this.rings;
    g.clear();
    const s = this.state;
    for (const id of this.selected) {
      const u = s.units.get(id);
      if (u) {
        g.lineStyle(2, 0xf3c64e, 1).strokeEllipse(u.x * TILE, u.y * TILE + 6, 26, 12);
        this.bar(g, u.x * TILE - 14, u.y * TILE - 28, 28, u.hp / UNITS[u.type].hp);
      }
      const b = s.buildings.get(id);
      if (b) {
        const def = BUILDINGS[b.type];
        g.lineStyle(2, 0xf3c64e, 1).strokeRect(b.tx * TILE - 2, b.ty * TILE - 2, def.w * TILE + 4, def.h * TILE + 4);
      }
    }
    for (const u of s.units.values()) {
      if (u.owner !== PLAYER || u.hp >= UNITS[u.type].hp) continue;
      this.bar(g, u.x * TILE - 14, u.y * TILE - 28, 28, u.hp / UNITS[u.type].hp);
    }
    for (const b of s.buildings.values()) {
      const def = BUILDINGS[b.type];
      if (!b.built) {
        const frac = 1 - b.buildLeft / Math.max(1, def.time);
        this.bar(g, b.tx * TILE, b.ty * TILE - 6, def.w * TILE, frac, 0x5aa0d8);
      } else if (b.owner === PLAYER && b.hp < def.hp) {
        this.bar(g, b.tx * TILE, b.ty * TILE - 6, def.w * TILE, b.hp / def.hp);
      }
    }
  }

  private bar(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, frac: number, colour = 0x62c45a) {
    g.fillStyle(0x2a1d14, 1).fillRect(x, y, w, 5);
    g.fillStyle(colour, 1).fillRect(x, y, Math.max(0, Math.min(1, frac)) * w, 5);
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
    if (p.y < TOP_H || p.y >= PANEL_Y) return;
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
    this.dragBox.clear();
    const x = Math.min(this.dragStart.x, p.x);
    const y = Math.min(this.dragStart.y, p.y);
    const w = Math.abs(p.x - this.dragStart.x);
    const h = Math.abs(p.y - this.dragStart.y);
    this.dragBox.lineStyle(1, 0xf3c64e, 1).strokeRect(x + this.cameras.main.scrollX, y + this.cameras.main.scrollY, w, h);
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

  // ----------------------------------------------------------- panel and HUD

  private buildHud() {
    const style = { fontFamily: FONT, fontSize: '14px', color: '#f1e3c6' };
    this.topBar = this.add.text(12, 7, '', style).setScrollFactor(0).setDepth(10000);
    this.add.rectangle(0, 0, 960, TOP_H, 0x1b1410, 0.92).setOrigin(0, 0).setScrollFactor(0).setDepth(9990);
    this.panel = this.add.graphics().setScrollFactor(0).setDepth(9990);
    this.panel.fillStyle(0x1b1410, 0.94).fillRect(0, PANEL_Y, 960, 540 - PANEL_Y);
    this.panel.lineStyle(2, 0x5a3f2a, 1).strokeRect(0, PANEL_Y, 960, 540 - PANEL_Y);
    this.infoText = this.add.text(14, PANEL_Y + 10, '', { ...style, wordWrap: { width: 270 } }).setScrollFactor(0).setDepth(10000);
    this.noticeText = this.add
      .text(480, TOP_H + 10, '', { ...style, color: '#f3c64e' })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(10000);
  }

  private renderTop() {
    const s = this.state;
    const p = s.players[PLAYER];
    const secs = Math.floor(s.time / 1000);
    const clock = `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`;
    const text = `${RESOURCES.map((r) => `${cap(r)} ${Math.floor(p.res[r])}`).join('   ')}     Pop ${popUsed(s, PLAYER)}/${popCap(s, PLAYER)}     Age ${p.age}     ${clock}     ${FACTIONS[this.faction].name}`;
    if (this.topBar.text !== text) this.topBar.setText(text);
    this.noticeText.setText(s.noticeMs > 0 ? s.notice : '');
  }

  /** Rebuilds the panel's buttons when the selection, the menus or what they show changes. */
  private renderPanel() {
    const key = this.panelSignature();
    this.infoText.setText(this.infoLines());
    if (key === this.panelKey) return;
    this.panelKey = key;
    for (const o of this.buttonObjects) o.destroy();
    this.buttonObjects = [];
    this.hud = [];
    const actions = this.actions();
    actions.slice(0, 12).forEach((a, i) => {
      const col = i % 4;
      const row = Math.floor(i / 4);
      const x = 300 + col * 160;
      const y = PANEL_Y + 8 + row * 34;
      const bg = this.add.rectangle(x, y, 150, 28, 0x3d2b1f).setOrigin(0, 0).setStrokeStyle(2, 0x5a3f2a).setScrollFactor(0).setDepth(10001);
      const label = this.add
        .text(x + 75, y + 14, a.label, { fontFamily: FONT, fontSize: '12px', color: a.enabled ? '#f1e3c6' : '#7a6a58' })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(10002);
      if (a.enabled) {
        bg.setInteractive({ useHandCursor: true });
        bg.on('pointerover', () => bg.setStrokeStyle(2, 0xf3c64e));
        bg.on('pointerout', () => bg.setStrokeStyle(2, 0x5a3f2a));
        bg.on('pointerdown', () => a.run());
      }
      this.buttonObjects.push(bg, label);
      this.hud.push({ label: a.label, x, y, w: 150, h: 28 });
    });
  }

  private panelSignature() {
    const b = this.selectedBuilding();
    const q = b ? b.queue.map((x) => x.key).join(',') : '';
    const p = this.state.players[PLAYER];
    return [...this.selected].join(',') + `|${this.buildMenu}|${this.placing}|${this.attackMode}|${q}|${p.techs.join(',')}|${p.age}|${this.resourceKey()}`;
  }

  private resourceKey() {
    const r = this.state.players[PLAYER].res;
    return `${Math.floor(r.wood / 10)}/${Math.floor(r.food / 10)}/${Math.floor(r.ore / 10)}`;
  }

  private infoLines() {
    if (this.placing) return `Place ${BUILDINGS[this.placing].name}: click the map. Esc to cancel.`;
    if (this.attackMode) return 'Attack-move: click where the army should go. Esc to cancel.';
    const units = this.selectedUnits();
    if (units.length > 0) {
      const u = units[0];
      const def = UNITS[u.type];
      const lines = [units.length === 1 ? def.name : `${units.length} units`];
      if (units.length === 1) lines.push(`HP ${Math.ceil(u.hp)} / ${def.hp}`);
      if (units.length === 1 && u.carry) lines.push(`Carrying ${u.amount} ${u.carry}`);
      if (units.length === 1) lines.push(`Order: ${u.order.t}`);
      return lines.join('\n');
    }
    const b = this.selectedBuilding();
    if (b) {
      const def = BUILDINGS[b.type];
      const lines = [def.name, b.built ? `HP ${Math.ceil(b.hp)} / ${def.hp}` : `Building ${Math.floor((1 - b.buildLeft / def.time) * 100)}%`];
      const head = b.queue[0];
      if (head) lines.push(`${head.kind === 'unit' ? UNITS[head.key].name : TECHS[head.key].name}: ${Math.ceil(head.left / 1000)}s`);
      return lines.join('\n');
    }
    return 'Nothing selected.\nDrag or click your units, or a building.';
  }

  /** What the panel offers for the current selection, as buttons. */
  private actions(): { label: string; enabled: boolean; run: () => void }[] {
    const s = this.state;
    const p = s.players[PLAYER];
    const out: { label: string; enabled: boolean; run: () => void }[] = [];
    if (this.placing) return [{ label: 'Cancel', enabled: true, run: () => (this.placing = null) }];
    if (this.buildMenu) {
      for (const type of BUILD_ORDER) {
        const def = BUILDINGS[type];
        const cost = Object.entries(def.cost).map(([r, n]) => `${n}${r[0]}`).join(' ');
        out.push({
          label: `${def.name} ${cost}`,
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
          label: `${unit.name} ${Object.entries(unit.cost).map(([r, n]) => `${n}${r[0]}`).join(' ')}`,
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
            label: `${tech.name} ${Object.entries(tech.cost).map(([r, n]) => `${n}${r[0]}`).join(' ')}`,
            enabled: affordable(p, tech.cost) && !p.techs.includes(tech.id) && (!tech.age2 || p.age >= 2),
            run: () => {
              if (!research(this.state, PLAYER, b.id, tech.id)) say(this.state, "Can't research that yet");
            },
          });
        }
      }
      if (b.type === 'town') {
        const age2 = TECHS.age2;
        out.push({
          label: `Age II ${Object.entries(age2.cost).map(([r, n]) => `${n}${r[0]}`).join(' ')}`,
          enabled: p.age < 2 && affordable(p, age2.cost),
          run: () => {
            if (!research(this.state, PLAYER, b.id, 'age2')) say(this.state, "Can't advance yet");
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
      this.ghost.setPosition(ox * TILE, oy * TILE).setVisible(true);
      this.ghost.setTint(canPlace(this.state, type, ox, oy) ? 0x9be88a : 0xff7a6b);
    } else this.ghost.setVisible(false);
  }

  // ----------------------------------------------------------- end of the match

  private showEnd() {
    const won = this.state.winner === PLAYER;
    const bg = this.add.rectangle(480, 270, 960, 540, 0x0a0604, 0.7).setScrollFactor(0).setDepth(11000);
    const title = this.add
      .text(480, 240, won ? 'Victory' : 'Defeat', { fontFamily: FONT, fontSize: '44px', color: won ? '#f3c64e' : '#f0b48a' })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(11001);
    const sub = this.add
      .text(480, 300, 'Click to choose another faction', { fontFamily: FONT, fontSize: '16px', color: '#d8c7a6' })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(11001);
    this.endPanel = this.add.container(0, 0, [bg, title, sub]);
  }
}

function cap(r: Resource) {
  return r[0].toUpperCase() + r.slice(1);
}

