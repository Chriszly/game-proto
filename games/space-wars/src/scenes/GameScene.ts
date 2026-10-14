import Phaser from 'phaser';
import { ARENA, NODE_AMOUNT } from '../game/arena';
import { generateMap, type MapLayout } from '../game/map';
import { FACTIONS, type Role, type UnitId } from '../game/factions';
import { PLAYER, World, buildingStats, unitStats, type Building, type Unit } from '../game/world';
import { drawDome, drawHealth, drawShape } from '../art/draw';
import { settings } from '../../../../shared/settings';
import { BAR, BUTTONS, FONT, TOP, VIEW, type Button } from './layout';

// Game time for one step at most, so a hidden tab doesn't jump the battle ahead.
const MAX_STEP_MS = 100;
/** How far a press must travel before it counts as a box selection rather than a tap. */
const DRAG_MIN = 6;
/** Units are drawn bigger than their outlines, to read at a glance. */
const UNIT_SCALE = 1.4;
const BEAM_MS = 140;
const BOOM_MS = 450;

interface Drag {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** The battle: draws the `World` every frame and turns the player's clicks into commands. */
export class GameScene extends Phaser.Scene {
  /** The battle itself; the playthrough test reads it. */
  state!: World;
  layout!: MapLayout;
  /** The command bar's buttons, in view pixels. */
  readonly buttons: Button[] = BUTTONS;
  /** Units the player has selected. */
  selected = new Set<number>();
  /** The building the player is about to place, once its button is pressed. */
  placing: Role | null = null;
  private pointer = { x: 0, y: 0 };
  private drag: Drag | null = null;
  private message = '';
  private lastFrame: number | null = null;
  private staticGfx!: Phaser.GameObjects.Graphics;
  private gfx!: Phaser.GameObjects.Graphics;
  private hud!: Phaser.GameObjects.Text;
  private rivals!: Phaser.GameObjects.Text;
  private bar!: Phaser.GameObjects.Text;
  private overlay!: Phaser.GameObjects.Text;
  private captions!: { name: Phaser.GameObjects.Text; cost: Phaser.GameObjects.Text }[];

  constructor() {
    super('Game');
  }

  create() {
    this.staticGfx = this.add.graphics();
    this.gfx = this.add.graphics();
    const text = (x: number, y: number, size: string, color = '#f3e9d2') =>
      this.add.text(x, y, '', { fontFamily: FONT, fontSize: size, color });
    this.hud = text(10, 9, '14px');
    this.rivals = text(VIEW.w - 10, 9, '14px').setOrigin(1, 0);
    this.bar = text(500, BAR.y + 8, '13px', '#d8e0ff').setWordWrapWidth(440);
    this.overlay = text(VIEW.w / 2, ARENA.y + ARENA.h / 2, '36px', '#ffffff').setOrigin(0.5).setAlign('center');
    this.captions = BUTTONS.map((b) => ({
      name: text(b.x + 6, b.y + 3, '12px').setText(''),
      cost: text(b.x + 6, b.y + 16, '10px', '#d8c98a'),
    }));
    this.input.mouse?.disableContextMenu();
    this.input.on('pointerdown', this.onDown, this);
    this.input.on('pointermove', this.onMove, this);
    this.input.on('pointerup', this.onUp, this);
    this.newGame();
  }

  /** Starts a fresh battle on a new random map. */
  private newGame() {
    this.layout = generateMap(FACTIONS.length);
    this.state = new World(this.layout);
    this.selected.clear();
    this.placing = null;
    this.drag = null;
    this.message = '';
    this.lastFrame = null;
    this.drawStatic();
  }

  update(time: number) {
    // Game time from the frame's own timestamp, the same as the other games.
    const dt = this.lastFrame === null ? 0 : Phaser.Math.Clamp(time - this.lastFrame, 0, MAX_STEP_MS);
    this.lastFrame = time;
    this.state.update(dt);
    this.selected = new Set([...this.selected].filter((id) => this.state.selectable(id)));
    this.draw();
  }

  /** Nebulae, stars, rock fields and the bars: drawn once per map. */
  private drawStatic() {
    const g = this.staticGfx;
    g.clear();
    g.fillStyle(0x070a1c, 1);
    g.fillRect(0, 0, VIEW.w, VIEW.h);
    for (const n of this.layout.nebulae) {
      g.fillStyle(n.color, 0.22);
      g.fillCircle(n.x, n.y, n.r);
    }
    for (const s of this.layout.stars) {
      g.fillStyle(0xffffff, s.a);
      g.fillCircle(s.x, s.y, 1);
    }
    g.lineStyle(1, 0x3b4670, 0.6);
    g.strokeRect(ARENA.x, ARENA.y, ARENA.w, ARENA.h);
    for (const k of this.layout.rocks) {
      g.fillStyle(0x2b3150, 1);
      g.fillCircle(k.x, k.y, k.r);
      g.lineStyle(1.5, 0x6f78a0, 1);
      g.strokeCircle(k.x, k.y, k.r);
    }
    g.fillStyle(0x0b0f22, 1);
    g.fillRect(0, 0, VIEW.w, TOP.h);
    g.fillRect(0, BAR.y, VIEW.w, BAR.h);
    g.lineStyle(1, 0x3b4670, 1);
    g.lineBetween(0, BAR.y, VIEW.w, BAR.y);
    g.lineBetween(0, TOP.h, VIEW.w, TOP.h);
  }

  private draw() {
    const s = this.state;
    const g = this.gfx;
    g.clear();

    for (const n of s.nodes) {
      if (n.amount <= 0) continue;
      const r = 6 + 4 * (n.amount / NODE_AMOUNT);
      const diamond = [
        new Phaser.Math.Vector2(n.x, n.y - r),
        new Phaser.Math.Vector2(n.x + r, n.y),
        new Phaser.Math.Vector2(n.x, n.y + r),
        new Phaser.Math.Vector2(n.x - r, n.y),
      ];
      g.fillStyle(0x9be7ff, 0.25);
      g.fillPoints(diamond, true);
      g.lineStyle(1.5, 0x9be7ff, 1);
      g.strokePoints(diamond, true);
    }

    for (const b of s.buildings) this.drawBuilding(b);
    for (const u of s.units) if (u.faction === PLAYER || !s.hidden(u, PLAYER)) this.drawUnit(u);

    for (const b of s.beams) {
      const a = settings.reduceMotion ? 0.9 : b.life / BEAM_MS;
      g.lineStyle(2, b.color, a);
      g.lineBetween(b.x, b.y, b.x2!, b.y2!);
    }
    // Wrecks are not drawn under reduced motion, where the ring's growth is the motion.
    if (!settings.reduceMotion) {
      for (const b of s.booms) {
        const t = 1 - b.life / BOOM_MS;
        g.lineStyle(2, b.color, 1 - t);
        g.strokeCircle(b.x, b.y, b.r! * (1 + t * 1.5));
      }
    }

    this.drawSelection();
    this.drawPlacement();
    this.drawBar();
    this.drawText();
  }

  private drawBuilding(b: Building) {
    const side = this.state.sides[b.faction];
    const def = side.def.buildings[b.type];
    const alpha = !b.done ? 0.45 : b.disabledMs > 0 ? 0.4 : 1;
    drawShape(this.gfx, b.x, b.y, 0, def.shape, 1, side.def.color, side.def.accent, alpha);
    if (def.dome) drawDome(this.gfx, b.x, b.y, def.dome, side.def.accent, alpha);
    if (!b.done) {
      const progress = 1 - b.buildLeft / def.buildMs;
      this.gfx.fillStyle(0x000000, 0.6);
      this.gfx.fillRect(b.x - 16, b.y + def.radius + 4, 32, 3);
      this.gfx.fillStyle(side.def.accent, 1);
      this.gfx.fillRect(b.x - 16, b.y + def.radius + 4, 32 * progress, 3);
    } else if (b.hp < b.maxHp) {
      drawHealth(this.gfx, b.x, b.y - def.radius - 8, 32, b.hp / b.maxHp);
    }
  }

  private drawUnit(u: Unit) {
    const side = this.state.sides[u.faction];
    const def = side.def.units[u.type];
    const rotation = u.angle + Math.PI / 2;
    // A cloaked ship of the player's own shows faintly; a decoy is a dimmer copy of its ship.
    const cloaked = u.faction === PLAYER && def.ability?.kind === 'cloak' && u.revealMs <= 0;
    const alpha = cloaked ? 0.4 : u.decoyMs !== null ? 0.6 : 1;
    drawShape(this.gfx, u.x, u.y, rotation, def.shape, UNIT_SCALE, side.def.color, side.def.accent, alpha);
    if (def.ability?.kind === 'shield') {
      this.gfx.lineStyle(1, side.def.accent, 0.25);
      this.gfx.strokeCircle(u.x, u.y, def.ability.range);
    }
    if (this.selected.has(u.id)) {
      this.gfx.lineStyle(1.5, 0xffffff, 0.9);
      this.gfx.strokeCircle(u.x, u.y, 14);
    }
    const maxHp = unitStats(side, u.type).hp;
    if (u.hp < maxHp) drawHealth(this.gfx, u.x, u.y - 14, 22, u.hp / maxHp);
  }

  private drawSelection() {
    if (this.drag) {
      const d = this.drag;
      this.gfx.lineStyle(1, 0xffffff, 0.8);
      this.gfx.strokeRect(Math.min(d.x0, d.x1), Math.min(d.y0, d.y1), Math.abs(d.x1 - d.x0), Math.abs(d.y1 - d.y0));
    }
  }

  /** The building being placed follows the pointer: green where it can go, orange where it can't. */
  private drawPlacement() {
    if (!this.placing || this.pointer.y >= BAR.y) return;
    const { x, y } = this.pointer;
    const ok = this.state.placementProblem(this.placing, x, y) === null;
    const side = this.state.sides[PLAYER];
    const def = side.def.buildings[this.placing];
    const hub = this.state.hubOf(PLAYER);
    if (hub) {
      this.gfx.lineStyle(1, 0xffffff, 0.25);
      this.gfx.strokeCircle(hub.x, hub.y, 240);
    }
    drawShape(this.gfx, x, y, 0, def.shape, 1, ok ? 0x7dffb0 : 0xffa94d, side.def.accent, 0.6);
  }

  private drawBar() {
    const g = this.gfx;
    BUTTONS.forEach((b, i) => {
      const { name, cost } = this.buttonInfo(b);
      const affordable = this.state.sides[PLAYER].crystal >= cost;
      const active = b.kind === 'build' && this.placing === b.key;
      g.fillStyle(active ? 0x3d5a80 : affordable ? 0x1c2540 : 0x12172a, 1);
      g.fillRect(b.x, b.y, b.w, b.h);
      g.lineStyle(1.5, active ? 0x7dffb0 : affordable ? 0x6f78a0 : 0x3b4670, 1);
      g.strokeRect(b.x, b.y, b.w, b.h);
      const caption = this.captions[i];
      if (caption.name.text !== name) caption.name.setText(name);
      const costText = `${cost} crystal`;
      if (caption.cost.text !== costText) caption.cost.setText(costText);
      caption.name.setColor(affordable ? '#f3e9d2' : '#7d8398');
    });
  }

  /** The caption and crystal cost a button shows for the player's faction. */
  buttonInfo(b: Button): { name: string; cost: number } {
    const side = this.state.sides[PLAYER];
    if (b.kind === 'build') {
      const stats = buildingStats(side, b.key as Role);
      return { name: stats.name, cost: stats.cost };
    }
    const stats = unitStats(side, b.key as UnitId);
    return { name: stats.name, cost: stats.cost };
  }

  /** Writes the top bar, the rivals line, the command messages and the end-of-battle overlay. */
  private drawText() {
    const s = this.state;
    const side = s.sides[PLAYER];
    const sec = Math.floor(s.elapsedMs / 1000);
    const clock = `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
    const hud = `${side.def.name}   crystal ${side.crystal}   harvesters ${s.count(PLAYER, 'harvester')}   army ${s.units.filter((u) => u.faction === PLAYER && u.type !== 'harvester').length}   ${clock}`;
    if (this.hud.text !== hud) this.hud.setText(hud);
    const alive = s.sides.filter((f) => f.index !== PLAYER && f.alive).length;
    const rivals = `rival factions left: ${alive}`;
    if (this.rivals.text !== rivals) this.rivals.setText(rivals);

    let bar = this.message;
    if (this.placing) {
      bar = `Tap the map to place ${s.sides[PLAYER].def.buildings[this.placing].name}. Right-click to cancel.`;
    } else if (!bar) {
      bar = 'Tap a unit to select it, or drag a box. Tap the ground to move, tap an enemy to attack. Harvesters work on their own.';
    }
    if (this.selected.size) bar = `Selected: ${this.selected.size}\n${bar}`;
    if (this.bar.text !== bar) this.bar.setText(bar);

    const end = s.phase === 'won' ? 'Victory\nTap to play again' : s.phase === 'lost' ? 'Defeat\nTap to try again' : '';
    if (this.overlay.text !== end) this.overlay.setText(end);
    this.overlay.setVisible(end !== '');
  }

  private onDown(p: Phaser.Input.Pointer) {
    if (this.state.phase !== 'playing') {
      this.newGame();
      return;
    }
    if (p.rightButtonDown()) {
      this.placing = null;
      this.selected.clear();
      return;
    }
    if (p.y >= BAR.y) {
      const b = BUTTONS.find((btn) => p.x >= btn.x && p.x < btn.x + btn.w && p.y >= btn.y && p.y < btn.y + btn.h);
      if (b) this.press(b);
      return;
    }
    if (this.placing) {
      const problem = this.state.build(this.placing, p.x, p.y);
      if (problem) {
        this.message = problem;
      } else {
        this.message = `${this.state.sides[PLAYER].def.buildings[this.placing].name} started`;
        this.placing = null;
      }
      return;
    }
    this.drag = { x0: p.x, y0: p.y, x1: p.x, y1: p.y };
  }

  private onMove(p: Phaser.Input.Pointer) {
    this.pointer = { x: p.x, y: p.y };
    if (this.drag) {
      this.drag.x1 = p.x;
      this.drag.y1 = p.y;
    }
  }

  private onUp(p: Phaser.Input.Pointer) {
    const d = this.drag;
    this.drag = null;
    if (!d || this.state.phase !== 'playing') return;
    if (Math.hypot(p.x - d.x0, p.y - d.y0) >= DRAG_MIN) {
      this.selected = new Set(this.state.selectableIn(d.x0, d.y0, p.x, p.y));
      this.message = '';
      return;
    }
    this.tapMap(p.x, p.y);
  }

  /** A tap on the map: select a combat unit, or command the selection to attack or move. */
  private tapMap(x: number, y: number) {
    const hit = this.state.entityAt(x, y);
    if (hit?.kind === 'unit' && hit.faction === PLAYER && this.state.selectable(hit.id)) {
      this.selected = new Set([hit.id]);
      this.message = '';
      return;
    }
    if (!this.selected.size) return;
    if (!this.state.command([...this.selected], x, y)) {
      this.message = 'Harvesters work on their own';
      return;
    }
    this.message = hit && hit.faction !== PLAYER ? 'Attacking' : 'Moving';
  }

  /** A press on a command bar button: arm a building, or queue a unit. */
  private press(b: Button) {
    const { name, cost } = this.buttonInfo(b);
    if (b.kind === 'build') {
      if (this.placing === b.key) {
        this.placing = null;
      } else if (this.state.sides[PLAYER].crystal < cost) {
        this.message = 'Not enough crystal';
      } else {
        this.placing = b.key as Role;
        this.message = '';
      }
      return;
    }
    const reason = this.state.train(b.key as UnitId);
    this.message = reason ?? `${name} queued`;
  }
}
