import Phaser from 'phaser';
import { ARENA, BUILD_RANGE, NODE_AMOUNT } from '../game/arena';
import { generateMap, type MapLayout } from '../game/map';
import { FACTIONS, type Role, type UnitId } from '../game/factions';
import { PLAYER, World, buildingStats, unitStats, type Building, type Unit } from '../game/world';
import { buildingLines, factionLines, unitLines } from '../game/describe';
import { drawDome, drawHealth, drawShape } from '../art/draw';
import { settings } from '../../../../shared/settings';
import { BAR, BUTTONS, FONT, MAP_VIEW, ROLE_LABEL, TOP, VIEW, type Button } from './layout';

// Game time for one step at most, so a hidden tab doesn't jump the battle ahead.
const MAX_STEP_MS = 100;
/** How far a press must travel before it counts as a box selection rather than a tap. */
const DRAG_MIN = 6;
/** Units are drawn bigger than their outlines, to read at a glance. */
const UNIT_SCALE = 1.4;
const BEAM_MS = 140;
const BOOM_MS = 450;
/** The faction picker's cards: their size and the gaps between them, in view pixels. */
const CARD_W = 180;
const CARD_H = 250;
const CARD_GAP = 8;
/** How fast the arrow keys and WASD scroll the map, in view pixels a second. */
const PAN_SPEED = 360;
/** How far above an entity the hover label sits. */
const LABEL_LIFT = 26;

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
  /** The map's camera: it shows a window of the battlefield between the bars. The test reads its scroll. */
  camera!: Phaser.Cameras.Scene2D.Camera;
  /** The command bar's buttons, in view pixels. */
  readonly buttons: Button[] = BUTTONS;
  /** Units the player has selected. */
  selected = new Set<number>();
  /** The building the player is about to place, once its button is pressed. */
  placing: Role | null = null;
  /** Whether the faction picker is up: nothing moves until the player picks a faction. */
  picking = true;
  /** The picker's cards, one per faction, in view pixels; the playthrough taps one to begin. */
  readonly pickCards = FACTIONS.map((_, faction) => ({
    x: (VIEW.w - FACTIONS.length * CARD_W - (FACTIONS.length - 1) * CARD_GAP) / 2 + faction * (CARD_W + CARD_GAP),
    y: MAP_VIEW.y + 62,
    w: CARD_W,
    h: CARD_H,
    faction,
  }));
  /** The last pointer position, in view pixels. */
  private pointer = { x: 0, y: 0 };
  private drag: Drag | null = null;
  private message = '';
  private lastFrame: number | null = null;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private chromeGfx!: Phaser.GameObjects.Graphics;
  private staticGfx!: Phaser.GameObjects.Graphics;
  private gfx!: Phaser.GameObjects.Graphics;
  private uiGfx!: Phaser.GameObjects.Graphics;
  private hud!: Phaser.GameObjects.Text;
  private rivals!: Phaser.GameObjects.Text;
  private bar!: Phaser.GameObjects.Text;
  private overlay!: Phaser.GameObjects.Text;
  private hoverLabel!: Phaser.GameObjects.Text;
  private tip!: Phaser.GameObjects.Text;
  private pickTitle!: Phaser.GameObjects.Text;
  private pickTexts!: Phaser.GameObjects.Text[];
  private captions!: { name: Phaser.GameObjects.Text; cost: Phaser.GameObjects.Text }[];

  constructor() {
    super('Game');
  }

  create() {
    this.chromeGfx = this.add.graphics();
    this.staticGfx = this.add.graphics();
    this.gfx = this.add.graphics();
    this.uiGfx = this.add.graphics();
    const text = (x: number, y: number, size: string, color = '#f3e9d2') =>
      this.add.text(x, y, '', { fontFamily: FONT, fontSize: size, color });
    this.hud = text(10, 9, '14px');
    this.rivals = text(VIEW.w - 10, 9, '14px').setOrigin(1, 0);
    this.bar = text(500, BAR.y + 8, '13px', '#d8e0ff').setWordWrapWidth(440);
    this.overlay = text(MAP_VIEW.x + MAP_VIEW.w / 2, MAP_VIEW.y + MAP_VIEW.h / 2, '36px', '#ffffff')
      .setOrigin(0.5)
      .setAlign('center');
    // Tooltips: the hover label names a unit or building on the map; the tip describes a command button.
    this.hoverLabel = text(0, 0, '12px').setOrigin(0.5, 1).setPadding(5).setBackgroundColor('#0b0f22')
      .setVisible(false);
    this.tip = text(0, 0, '12px').setOrigin(0, 1).setPadding(6).setBackgroundColor('#0b0f22')
      .setWordWrapWidth(300).setVisible(false);
    this.pickTitle = text(VIEW.w / 2, MAP_VIEW.y + 16, '18px').setOrigin(0.5, 0).setText('Choose your faction');
    this.pickTexts = this.pickCards.map((c) => {
      const def = FACTIONS[c.faction];
      const t = text(c.x + 12, c.y + 44, '12px', `#${def.color.toString(16).padStart(6, '0')}`);
      return t.setWordWrapWidth(c.w - 24).setText([def.name, '', ...factionLines(def)].join('\n'));
    });
    this.captions = BUTTONS.map((b) => ({
      name: text(b.x + 6, b.y + 3, '12px').setText(''),
      cost: text(b.x + 6, b.y + 16, '10px', '#d8c98a'),
    }));

    // The map scrolls in its own camera; the bars and the text sit on a second one that never moves.
    this.camera = this.cameras.main;
    this.camera.setViewport(MAP_VIEW.x, MAP_VIEW.y, MAP_VIEW.w, MAP_VIEW.h);
    const fixed = this.cameras.add(0, 0, VIEW.w, VIEW.h);
    fixed.ignore([this.staticGfx, this.gfx, this.hoverLabel]);
    this.camera.ignore([
      this.chromeGfx,
      this.uiGfx,
      this.hud,
      this.rivals,
      this.bar,
      this.overlay,
      this.tip,
      this.pickTitle,
      ...this.pickTexts,
      ...this.captions.flatMap((c) => [c.name, c.cost]),
    ]);
    this.drawChrome();

    this.input.mouse?.disableContextMenu();
    this.input.on('pointerdown', this.onDown, this);
    this.input.on('pointermove', this.onMove, this);
    this.input.on('pointerup', this.onUp, this);
    // Arrow keys scroll the map; keep the browser from scrolling the page with them too.
    this.keys = this.input.keyboard!.addKeys('UP,DOWN,LEFT,RIGHT,W,A,S,D,H') as Record<string, Phaser.Input.Keyboard.Key>;
    this.input.keyboard!.addCapture('UP,DOWN,LEFT,RIGHT');
    this.newGame();
  }

  /** Makes a new random map and shows the faction picker over it. */
  private newGame() {
    this.layout = generateMap(FACTIONS.length);
    this.picking = true;
    this.state = new World(this.layout);
    this.selected.clear();
    this.placing = null;
    this.drag = null;
    this.message = '';
    this.lastFrame = null;
    this.drawStatic();
    this.centreOnHub();
  }

  /** Starts the battle with the chosen faction under the player's command. */
  private startBattle(faction: number) {
    this.state = new World(this.layout, faction);
    this.picking = false;
    this.selected.clear();
    this.placing = null;
    this.drag = null;
    this.message = '';
    this.lastFrame = null;
    this.centreOnHub();
  }

  update(time: number) {
    // Game time from the frame's own timestamp, the same as the other games.
    const dt = this.lastFrame === null ? 0 : Phaser.Math.Clamp(time - this.lastFrame, 0, MAX_STEP_MS);
    this.lastFrame = time;
    if (!this.picking) {
      this.state.update(dt);
      this.selected = new Set([...this.selected].filter((id) => this.state.selectable(id)));
    }
    this.pan(dt);
    this.draw();
  }

  /** The battlefield point under a view pixel, from the map camera's scroll and viewport. */
  toWorld(x: number, y: number) {
    return { x: x - MAP_VIEW.x + this.camera.scrollX, y: y - MAP_VIEW.y + this.camera.scrollY };
  }

  /** Where a battlefield point is in view pixels, from the map camera's scroll and viewport. */
  toScreen(x: number, y: number) {
    return { x: x - this.camera.scrollX + MAP_VIEW.x, y: y - this.camera.scrollY + MAP_VIEW.y };
  }

  /** Whether a view pixel is over the map, rather than the top or command bar. */
  private inMap(x: number, y: number) {
    return x >= MAP_VIEW.x && x < MAP_VIEW.x + MAP_VIEW.w && y >= MAP_VIEW.y && y < MAP_VIEW.y + MAP_VIEW.h;
  }

  /** Scrolls the map so its top-left corner is at (left, top), keeping the view inside the battlefield. */
  private scrollTo(left: number, top: number) {
    this.camera.setScroll(
      Phaser.Math.Clamp(left, ARENA.x, ARENA.x + ARENA.w - MAP_VIEW.w),
      Phaser.Math.Clamp(top, ARENA.y, ARENA.y + ARENA.h - MAP_VIEW.h),
    );
  }

  /** Centres the map on (x, y). */
  private centreOn(x: number, y: number) {
    this.scrollTo(x - MAP_VIEW.w / 2, y - MAP_VIEW.h / 2);
  }

  /** Centres the map on the player's hub, where the battle starts and H brings the view back. */
  private centreOnHub() {
    const hub = this.state.hubOf(PLAYER);
    if (hub) this.centreOn(hub.x, hub.y);
  }

  /** Arrow keys and WASD scroll the map; H centres it on the hub. */
  private pan(dt: number) {
    const k = this.keys;
    const dx = (k.RIGHT.isDown || k.D.isDown ? 1 : 0) - (k.LEFT.isDown || k.A.isDown ? 1 : 0);
    const dy = (k.DOWN.isDown || k.S.isDown ? 1 : 0) - (k.UP.isDown || k.W.isDown ? 1 : 0);
    if (dx || dy) {
      const step = (PAN_SPEED * dt) / 1000;
      this.scrollTo(this.camera.scrollX + dx * step, this.camera.scrollY + dy * step);
    }
    if (Phaser.Input.Keyboard.JustDown(k.H)) this.centreOnHub();
  }

  /** Nebulae, stars and rock fields on the battlefield: drawn once per map. */
  private drawStatic() {
    const g = this.staticGfx;
    g.clear();
    g.fillStyle(0x070a1c, 1);
    g.fillRect(ARENA.x, ARENA.y, ARENA.w, ARENA.h);
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
  }

  /** The top and command bars: drawn once, as they stay put while the map scrolls. */
  private drawChrome() {
    const g = this.chromeGfx;
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
    this.uiGfx.clear();

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
    this.drawHover();
    this.drawBar();
    this.drawText();
    this.drawPicker();
  }

  /** The faction picker: a dark veil over the map and a card for each faction. */
  private drawPicker() {
    const show = this.picking;
    this.pickTitle.setVisible(show);
    this.pickTexts.forEach((t) => t.setVisible(show));
    if (!show) return;
    const g = this.uiGfx;
    g.fillStyle(0x070a1c, 0.72);
    g.fillRect(MAP_VIEW.x, MAP_VIEW.y, MAP_VIEW.w, MAP_VIEW.h);
    for (const c of this.pickCards) {
      const def = FACTIONS[c.faction];
      g.fillStyle(0x0b0f22, 0.96);
      g.fillRect(c.x, c.y, c.w, c.h);
      g.lineStyle(2, def.color, 1);
      g.strokeRect(c.x, c.y, c.w, c.h);
      drawShape(g, c.x + c.w - 26, c.y + 24, 0, def.buildings.hub.shape, 1, def.color, def.accent, 1);
    }
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

  /** The box being dragged, in view pixels. */
  private drawSelection() {
    if (this.drag) {
      const d = this.drag;
      this.uiGfx.lineStyle(1, 0xffffff, 0.8);
      this.uiGfx.strokeRect(Math.min(d.x0, d.x1), Math.min(d.y0, d.y1), Math.abs(d.x1 - d.x0), Math.abs(d.y1 - d.y0));
    }
  }

  /** The building being placed follows the pointer: green where it can go, orange where it can't. */
  private drawPlacement() {
    if (!this.placing || !this.inMap(this.pointer.x, this.pointer.y)) return;
    const { x, y } = this.toWorld(this.pointer.x, this.pointer.y);
    const ok = this.state.placementProblem(this.placing, x, y) === null;
    const side = this.state.sides[PLAYER];
    const def = side.def.buildings[this.placing];
    const hub = this.state.hubOf(PLAYER);
    if (hub) {
      this.gfx.lineStyle(1, 0xffffff, 0.25);
      this.gfx.strokeCircle(hub.x, hub.y, BUILD_RANGE);
    }
    drawShape(this.gfx, x, y, 0, def.shape, 1, ok ? 0x7dffb0 : 0xffa94d, side.def.accent, 0.6);
  }

  /** Names the unit or building under the pointer, with its role and hit points. */
  private drawHover() {
    const label = this.hoverLabel;
    const hit = this.inMap(this.pointer.x, this.pointer.y) && !this.placing && !this.picking
      ? this.toWorld(this.pointer.x, this.pointer.y)
      : null;
    const target = hit ? this.state.entityAt(hit.x, hit.y) : null;
    if (!target) {
      label.setVisible(false);
      return;
    }
    const side = this.state.sides[target.faction];
    let text: string;
    let at: { x: number; y: number };
    if (target.kind === 'unit') {
      const u = this.state.unit(target.id)!;
      const head = `${side.def.units[u.type].name} · ${ROLE_LABEL[u.type]} · ${Math.ceil(u.hp)}/${unitStats(side, u.type).hp} hp`;
      text = [head, ...unitLines(side, u.type)].join('\n');
      at = u;
    } else {
      const b = this.state.building(target.id)!;
      const head = `${side.def.buildings[b.type].name} · ${ROLE_LABEL[b.type]} · ${Math.ceil(b.hp)}/${b.maxHp} hp`;
      text = [head, ...buildingLines(side, b.type)].join('\n');
      at = b;
    }
    if (label.text !== text) label.setText(text);
    label.setPosition(at.x, at.y - LABEL_LIFT).setVisible(true);
  }

  /** Each button: its name, its role and crystal cost. Lit when armed; dimmed when unaffordable. */
  private drawBar() {
    const g = this.uiGfx;
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
      const roleLine = `${ROLE_LABEL[b.key]} · ${cost}`;
      if (caption.cost.text !== roleLine) caption.cost.setText(roleLine);
      caption.name.setColor(affordable ? '#f3e9d2' : '#7d8398');
    });
    this.drawTip();
  }

  /** Describes the command button under the pointer: its name, role, cost and stats. */
  private drawTip() {
    const b = this.picking
      ? undefined
      : BUTTONS.find((btn) => this.pointer.x >= btn.x && this.pointer.x < btn.x + btn.w && this.pointer.y >= btn.y && this.pointer.y < btn.y + btn.h);
    if (!b) {
      this.tip.setVisible(false);
      return;
    }
    const side = this.state.sides[PLAYER];
    const { name } = this.buttonInfo(b);
    const lines = b.kind === 'build' ? buildingLines(side, b.key as Role) : unitLines(side, b.key as UnitId);
    const text = [`${name} · ${ROLE_LABEL[b.key]}`, ...lines].join('\n');
    if (this.tip.text !== text) this.tip.setText(text);
    // Above the command bar, so the tip never covers the buttons it describes.
    this.tip.setPosition(Phaser.Math.Clamp(b.x, 4, VIEW.w - this.tip.width - 4), BAR.y - 6).setVisible(true);
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
    const hud = this.picking ? 'Choose a faction' : `${side.def.name}   crystal ${side.crystal}   harvesters ${s.count(PLAYER, 'harvester')}   army ${s.units.filter((u) => u.faction === PLAYER && u.type !== 'harvester').length}   ${clock}`;
    if (this.hud.text !== hud) this.hud.setText(hud);
    const alive = s.sides.filter((f) => f.index !== PLAYER && f.alive).length;
    const rivals = `rival factions left: ${alive}`;
    if (this.rivals.text !== rivals) this.rivals.setText(rivals);

    let bar = this.message;
    if (this.picking) {
      bar = 'Tap a faction above to command it. The other four factions are AI.';
    } else if (this.placing) {
      bar = `Tap the map to place ${s.sides[PLAYER].def.buildings[this.placing].name}. Right-click to cancel.`;
    } else if (!bar) {
      bar = 'Tap a unit to select it, or drag a box. Tap the ground to move, tap an enemy to attack. Harvesters work on their own.';
    }
    if (this.selected.size === 1) {
      const u = s.unit([...this.selected][0]);
      if (u) {
        const us = s.sides[u.faction];
        bar = `Selected: ${us.def.units[u.type].name} (${ROLE_LABEL[u.type]}), hp ${Math.ceil(u.hp)}/${unitStats(us, u.type).hp}\n${bar}`;
      }
    } else if (this.selected.size) {
      bar = `Selected: ${this.selected.size} units\n${bar}`;
    }
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
    if (this.picking) {
      const card = this.pickCards.find((c) => p.x >= c.x && p.x < c.x + c.w && p.y >= c.y && p.y < c.y + c.h);
      if (card) this.startBattle(card.faction);
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
    if (!this.inMap(p.x, p.y)) return;
    if (this.placing) {
      const at = this.toWorld(p.x, p.y);
      const problem = this.state.build(this.placing, at.x, at.y);
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
      const a = this.toWorld(d.x0, d.y0);
      const b = this.toWorld(p.x, p.y);
      this.selected = new Set(this.state.selectableIn(a.x, a.y, b.x, b.y));
      this.message = '';
      return;
    }
    if (this.inMap(p.x, p.y)) this.tapMap(p.x, p.y);
  }

  /** A tap on the map, in view pixels: select a combat unit, or command the selection to attack or move. */
  private tapMap(x: number, y: number) {
    const at = this.toWorld(x, y);
    const hit = this.state.entityAt(at.x, at.y);
    if (hit?.kind === 'unit' && hit.faction === PLAYER && this.state.selectable(hit.id)) {
      this.selected = new Set([hit.id]);
      this.message = '';
      return;
    }
    if (!this.selected.size) return;
    if (!this.state.command([...this.selected], at.x, at.y)) {
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
