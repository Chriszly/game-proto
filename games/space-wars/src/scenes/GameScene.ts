import Phaser from 'phaser';
import { ARENA, BUILD_RANGE, NODE_AMOUNT } from '../game/arena';
import { generateMap, type MapLayout } from '../game/map';
import { FACTIONS, type Role, type UnitId } from '../game/factions';
import { CONTRACTS } from '../game/contracts';
import {
  BEACON_PAY, BEACON_RADIUS, BRIBE_COST, BRIBE_MS, DERELICT_DEFS, DERELICT_RADIUS, EXPANSION_GAP, PLAYER, POP_MS, SENSOR_RANGE, TRUCE_MS,
  TRUCE_TRIBUTE, VETERAN_NAMES, World, buildInfo, researchCost, unitStats, type Build, type Derelict,
} from '../game/world';
import { buildingLines, derelictLines, expansionLines, factionLines, fallBackLines, researchLines, unitLines } from '../game/describe';
import { FOG_CELL, FOG_COLS, FOG_ROWS } from '../game/fog';
import { RESEARCH_LEVELS, RESEARCH_MS, TRACK_DEFS, type Track } from '../game/research';
import { dashedCircle, drawHealth, drawProgress, progressArc, stripes } from '../art/draw';
import { INK, INK_CSS, hex } from '../art/palette';
import {
  BACKDROP_KEY, BEACON_KEY, CRYSTAL_KEYS, GLOW_BLUE_KEY, GLOW_KEY, RES, SHARD_KEY, SHIP_ZOOM, bakeAll, bakeBackdrop, buildingKey, facing, flameKey, shipKey,
} from '../art/textures';
import { settings } from '../../../../shared/settings';
import { mountWatch, watching, watchSteps } from '../../../../shared/watch';
import { renderScale, viewPoint } from '../../../../shared/scaling';
import { BAR, BUTTONS, FONT, MAP_VIEW, PANEL_X, RIVALS_PANEL, RIVALS_TAB, ROLE_LABEL, TOP, VIEW, type Button } from './layout';

// Game time for one step at most, so a hidden tab doesn't jump the battle ahead.
const MAX_STEP_MS = 100;
/** How far a press must travel before it counts as a box selection rather than a tap. */
const DRAG_MIN = 6;
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
/** How long the gain flash by the crystal count stays up, in ms. */
const FLASH_MS = 1600;
/** Where each ship's engines sit behind its centre, and how long its exhaust flame is, in pixels. */
const TAIL: Record<UnitId, number> = { harvester: 11, scout: 10, gunship: 12, heavy: 20 };
const FLAME: Record<UnitId, number> = { harvester: 16, scout: 24, gunship: 26, heavy: 36 };
/** Draw order on the map; the fog covers everything but floating numbers and labels. */
const DEPTH = { backdrop: 0, under: 1, node: 2, building: 3, shard: 4, flame: 5, ship: 6, over: 7, fog: 7.5, pop: 8, label: 9 };
/** The fog's colour (the night sky's deepest violet) and how much it hides where unexplored and where only explored. */
const FOG_RGB = [20, 9, 34] as const;
const FOG_UNEXPLORED = 0.93;
const FOG_EXPLORED = 0.55;
const FOG_KEY = 'fog';
const FOG_SMOOTH = 3;
/** The fog is repainted every few frames, which is plenty for ships' speeds and spares slow devices. */
const FOG_EVERY = 3;
/** How many cells the fog's edge is blurred over, each way. */
const FOG_BLUR = 2;

/** A box blur of a grid of values, across then down, with the edges held (so the map's rim stays fogged). */
function blur(v: Float32Array, tmp: Float32Array, w: number, h: number, r: number) {
  const n = 2 * r + 1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0;
      for (let k = -r; k <= r; k++) sum += v[y * w + Math.min(w - 1, Math.max(0, x + k))];
      tmp[y * w + x] = sum / n;
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0;
      for (let k = -r; k <= r; k++) sum += tmp[Math.min(h - 1, Math.max(0, y + k)) * w + x];
      v[y * w + x] = sum / n;
    }
  }
}
/** An expansion is drawn as a smaller copy of its faction's hub. */
const EXPANSION_SCALE = 0.8;
/** How many hack hits take a turret over, for the ring that fills on a hacked turret. */
const TAKEOVER = FACTIONS.map((f) => f.units.gunship.ability).find((a) => a?.kind === 'hack')?.takeover ?? 1;

interface Drag {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** A button on the rivals panel: answer a truce offer, or pay tribute to turn a rival. */
interface RivalButton {
  x: number;
  y: number;
  w: number;
  h: number;
  action: 'accept' | 'decline' | 'bribe';
  faction: number;
}

interface ShipSprite {
  ship: Phaser.GameObjects.Image;
  flame: Phaser.GameObjects.Image;
  lastX: number;
  lastY: number;
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
  placing: Build | null = null;
  /** Whether the faction picker is up: nothing moves until the player picks a faction. */
  picking = true;
  /** Whether the rivals panel (truces and tribute) is open over the map. */
  rivalsOpen = false;
  /** The rivals panel's buttons, in view pixels, as last drawn. */
  rivalButtons: RivalButton[] = [];
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
  /** Two fingers on the map scroll it: their midpoint when last seen, in view pixels. */
  private touchPan: { x: number; y: number } | null = null;
  private message = '';
  private lastFrame: number | null = null;
  /** Game time the scene has drawn, for the flicker of flames and the bob of floating pylons. */
  private clock = 0;
  private flash = { amount: 0, ms: 0 };
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private fixed!: Phaser.Cameras.Scene2D.Camera;
  private backdrop!: Phaser.GameObjects.Image;
  private underGfx!: Phaser.GameObjects.Graphics;
  private gfx!: Phaser.GameObjects.Graphics;
  private chromeGfx!: Phaser.GameObjects.Graphics;
  private uiGfx!: Phaser.GameObjects.Graphics;
  private pickGfx!: Phaser.GameObjects.Graphics;
  private ships = new Map<number, ShipSprite>();
  private houses = new Map<number, Phaser.GameObjects.Image>();
  private crystals = new Map<number, { gem: Phaser.GameObjects.Image; glow: Phaser.GameObjects.Image }>();
  private shardSprites = new Map<number, { glow: Phaser.GameObjects.Image; gem: Phaser.GameObjects.Image }>();
  private popTexts: Phaser.GameObjects.Text[] = [];
  private beaconGlow!: Phaser.GameObjects.Image;
  private beaconImg!: Phaser.GameObjects.Image;
  private beaconLabel!: Phaser.GameObjects.Text;
  private derelictLabels: Phaser.GameObjects.Text[] = [];
  private rivalTexts: { name: Phaser.GameObjects.Text; status: Phaser.GameObjects.Text; b1: Phaser.GameObjects.Text; b2: Phaser.GameObjects.Text }[] = [];
  private rivalsHead!: Phaser.GameObjects.Text;
  private rivalsHint!: Phaser.GameObjects.Text;
  private ghost!: Phaser.GameObjects.Image;
  private fogTex!: Phaser.Textures.CanvasTexture;
  private fogData!: ImageData;
  private fogCells!: HTMLCanvasElement;
  private fogFrame = 0;
  private fogAlpha = new Float32Array(FOG_COLS * FOG_ROWS);
  private fogTmp = new Float32Array(FOG_COLS * FOG_ROWS);
  private hud!: Record<'faction' | 'crystal' | 'gain' | 'harvesters' | 'army' | 'clock' | 'tag' | 'title' | 'count' | 'rivals' | 'rivalCount', Phaser.GameObjects.Text>;
  private panel!: Record<'line' | 'head' | 'next' | 'brief' | 'count' | 'reward' | 'perk' | 'build', Phaser.GameObjects.Text>;
  private overlay!: Phaser.GameObjects.Text;
  private hoverLabel!: Phaser.GameObjects.Text;
  private tip!: Phaser.GameObjects.Text;
  private pickTitle!: Phaser.GameObjects.Text;
  private pickTexts!: { name: Phaser.GameObjects.Text; body: Phaser.GameObjects.Text }[];
  private pickImages: Phaser.GameObjects.Image[] = [];
  private captions!: { name: Phaser.GameObjects.Text; cost: Phaser.GameObjects.Text; icon: Phaser.GameObjects.Image }[];

  constructor() {
    super('Game');
  }

  create() {
    bakeAll(this);
    // The map scrolls in its own camera; the bars and the text sit on a second one that never moves.
    this.camera = this.cameras.main;
    // Viewports are in canvas pixels, renderScale to a view pixel. Both cameras keep the top-left
    // origin setupScaling gives them, so the map camera's scroll is the battlefield point at its corner.
    const k = renderScale;
    this.camera.setViewport(MAP_VIEW.x * k, MAP_VIEW.y * k, MAP_VIEW.w * k, MAP_VIEW.h * k);
    this.camera.setBackgroundColor('#1c0f36');
    this.fixed = this.cameras.add(0, 0, VIEW.w * k, VIEW.h * k);

    this.backdrop = this.onMap(this.add.image(0, 0, '__WHITE').setOrigin(0).setDepth(DEPTH.backdrop));
    this.underGfx = this.onMap(this.add.graphics().setDepth(DEPTH.under));
    this.gfx = this.onMap(this.add.graphics().setDepth(DEPTH.over));
    this.beaconGlow = this.onMap(this.add.image(0, 0, GLOW_KEY).setDepth(DEPTH.under).setAlpha(0.5).setBlendMode(Phaser.BlendModes.ADD));
    this.beaconImg = this.onMap(this.add.image(0, 0, BEACON_KEY).setScale(1 / RES).setDepth(DEPTH.building));
    this.beaconLabel = this.onMap(this.text(0, 0, 10, INK_CSS.chocolate, true).setBackgroundColor(INK_CSS.cream).setPadding(6, 3, 6, 3).setDepth(DEPTH.label));
    this.ghost = this.onMap(this.add.image(0, 0, SHARD_KEY).setScale(1 / RES).setAlpha(0.6).setDepth(DEPTH.over).setVisible(false));
    // The fog is worked out one pixel a cell, then smoothed up to FOG_SMOOTH pixels a cell so its edges blur.
    this.fogCells = document.createElement('canvas');
    this.fogCells.width = FOG_COLS;
    this.fogCells.height = FOG_ROWS;
    this.fogData = this.fogCells.getContext('2d')!.createImageData(FOG_COLS, FOG_ROWS);
    this.fogTex = this.textures.exists(FOG_KEY)
      ? this.textures.get(FOG_KEY) as Phaser.Textures.CanvasTexture
      : this.textures.createCanvas(FOG_KEY, FOG_COLS * FOG_SMOOTH, FOG_ROWS * FOG_SMOOTH)!;
    this.onMap(this.add.image(0, 0, FOG_KEY).setOrigin(0).setScale(FOG_CELL / FOG_SMOOTH).setDepth(DEPTH.fog));
    this.hoverLabel = this.onMap(this.text(0, 0, 11, INK_CSS.chocolate).setOrigin(0.5, 1).setPadding(6, 4, 6, 4)
      .setBackgroundColor(INK_CSS.cream).setDepth(DEPTH.label).setVisible(false));

    this.chromeGfx = this.onUi(this.add.graphics().setDepth(10));
    this.uiGfx = this.onUi(this.add.graphics().setDepth(11));
    this.pickGfx = this.onUi(this.add.graphics().setDepth(20));
    const t = (x: number, y: number, size: number, color: string, bold = false, depth = 12) =>
      this.onUi(this.text(x, y, size, color, bold).setDepth(depth));
    this.hud = {
      faction: t(32, 8, 14, INK_CSS.cream, true),
      crystal: t(182, 5, 18, INK_CSS.cream, true),
      gain: t(0, 8, 11, '#ffffff', true).setBackgroundColor('#3d9a4a').setPadding(5, 1, 5, 1),
      harvesters: t(286, 9, 12, INK_CSS.cream),
      army: t(378, 9, 12, INK_CSS.cream),
      clock: t(436, 6, 16, INK_CSS.mustard, true),
      tag: t(490, 10, 10, INK_CSS.cream, true),
      title: t(578, 9, 11, INK_CSS.chocolate, true),
      count: t(782, 9, 11, INK_CSS.chocolate, true).setOrigin(1, 0),
      rivals: t(806, 10, 10, INK_CSS.mustard, true).setText('RIVALS'),
      rivalCount: t(950, 5, 17, INK_CSS.cream, true).setOrigin(1, 0),
    };
    const px = PANEL_X;
    this.panel = {
      line: t(px, 445, 10, INK_CSS.cream).setWordWrapWidth(VIEW.w - px - 106).setMaxLines(2),
      head: t(px + 8, 476, 10, INK_CSS.cream, true),
      next: t(VIEW.w - 16, 476, 10, INK_CSS.cream).setOrigin(1, 0),
      brief: t(px + 8, 492, 12, INK_CSS.chocolate, true),
      count: t(px + 170, 506, 11, INK_CSS.green, true),
      reward: t(px + 222, 506, 11, INK_CSS.rust, true),
      perk: t(px + 8, 521, 10, INK_CSS.cocoa),
      build: t(14, 448, 10, INK_CSS.mustard, true).setText('BUILD'),
    };
    this.overlay = t(MAP_VIEW.x + MAP_VIEW.w / 2, MAP_VIEW.y + MAP_VIEW.h / 2, 44, INK_CSS.mustard, true, 30)
      .setOrigin(0.5).setAlign('center').setStroke(INK_CSS.chocolate, 8);
    // Tooltips: the hover label names a unit or building on the map; the tip describes a command button.
    this.tip = t(0, 0, 11, INK_CSS.chocolate, false, 25).setOrigin(0, 1).setPadding(7, 5, 7, 5).setBackgroundColor(INK_CSS.cream)
      .setWordWrapWidth(300).setVisible(false);
    this.pickTitle = t(VIEW.w / 2, MAP_VIEW.y + 18, 22, INK_CSS.mustard, true, 21).setOrigin(0.5, 0).setText('CHOOSE YOUR FACTION')
      .setStroke(INK_CSS.chocolate, 5);
    // The rivals panel: a header, a row per rival with its stance and up to two buttons, and a hint while an offer is open.
    const rp = RIVALS_PANEL;
    this.rivalsHead = t(rp.x + 10, rp.y + 5, 11, INK_CSS.cream, true, 22).setText('RIVALS · truces and tribute · T closes');
    this.rivalTexts = FACTIONS.slice(1).map((_, k) => {
      const y = rp.y + rp.head + k * rp.row;
      return {
        name: t(rp.x + 24, y + 6, 12, INK_CSS.chocolate, true, 22),
        status: t(rp.x + 24, y + 23, 10, INK_CSS.cocoa, false, 22).setWordWrapWidth(rp.w - 140).setMaxLines(2),
        b1: t(0, 0, 10, INK_CSS.chocolate, true, 22).setOrigin(0.5),
        b2: t(0, 0, 10, INK_CSS.chocolate, true, 22).setOrigin(0.5),
      };
    });
    this.rivalsHint = t(VIEW.w - 8, TOP.h + 8, 11, INK_CSS.chocolate, true, 22).setOrigin(1, 0).setPadding(8, 4, 8, 4)
      .setBackgroundColor(INK_CSS.mustard).setVisible(false);
    this.pickTexts = this.pickCards.map((c) => {
      const def = FACTIONS[c.faction];
      const name = t(c.x + 12, c.y + 8, 13, INK_CSS.cream, true, 21).setText(def.name.toUpperCase());
      const body = t(c.x + 12, c.y + 150, 10, INK_CSS.chocolate, false, 21).setWordWrapWidth(c.w - 22)
        .setText(factionLines(def).join('\n')).setLineSpacing(1);
      return { name, body };
    });
    this.pickCards.forEach((c) => {
      const f = c.faction;
      this.pickImages.push(this.onUi(this.add.image(c.x + c.w / 2, c.y + 80, buildingKey(f, 'hub')).setScale(1.25 / RES).setDepth(21)));
      (['scout', 'gunship', 'heavy'] as const).forEach((type, k) => {
        this.pickImages.push(this.onUi(this.add.image(c.x + 36 + k * 54, c.y + 126, shipKey(f, type), facing(-Math.PI / 4).frame)
          .setScale(0.9 / RES).setDepth(21)));
      });
    });
    // Research buttons are slimmer and have no icon: their level pips sit on the right instead. The Fall back button is a plain pill.
    this.captions = BUTTONS.map((b) => b.kind === 'research' || b.kind === 'command'
      ? {
        icon: this.onUi(this.add.image(0, 0, '__WHITE').setVisible(false)),
        name: t(b.x + 10, b.y + 2, 11, INK_CSS.chocolate, true),
        cost: t(b.x + 10, b.y + 14, 9, INK_CSS.rust),
      }
      : {
        icon: this.onUi(this.add.image(b.x + 14, b.y + b.h / 2, '__WHITE').setDepth(12)),
        name: t(b.x + 33, b.y + 3, 12, INK_CSS.chocolate, true),
        cost: t(b.x + 33, b.y + 16, 10, INK_CSS.rust),
      });
    this.drawChrome();

    this.input.mouse?.disableContextMenu();
    this.input.on('pointerdown', this.onDown, this);
    this.input.on('pointermove', this.onMove, this);
    this.input.on('pointerup', this.onUp, this);
    // A second touch pointer, so two fingers can scroll the map.
    this.input.addPointer(1);
    // Arrow keys scroll the map; keep the browser from scrolling the page with them too.
    this.keys = this.input.keyboard!.addKeys('UP,DOWN,LEFT,RIGHT,W,A,S,D,H,B,T') as Record<string, Phaser.Input.Keyboard.Key>;
    this.input.keyboard!.addCapture('UP,DOWN,LEFT,RIGHT');
    this.newGame();
  }

  private text(x: number, y: number, size: number, color: string, bold = false) {
    return this.add.text(x, y, '', { fontFamily: FONT, fontSize: `${size}px`, color, fontStyle: bold ? 'italic bold' : '' });
  }

  /** Puts an object on the scrolling map only. */
  private onMap<T extends Phaser.GameObjects.GameObject>(o: T): T {
    this.fixed.ignore(o);
    return o;
  }

  /** Puts an object on the fixed bars only. */
  private onUi<T extends Phaser.GameObjects.GameObject>(o: T): T {
    this.camera.ignore(o);
    return o;
  }

  /** Makes a new random map and shows the faction picker over it. */
  private newGame() {
    this.layout = generateMap(FACTIONS.length);
    this.picking = true;
    this.state = new World(this.layout);
    const res = bakeBackdrop(this, this.layout);
    this.backdrop.setTexture(BACKDROP_KEY).setScale(1 / res);
    this.reset();
    // Watch mode (`?watch`) skips the picker: a random faction takes the first slot and the AI plays all five.
    if (watching) this.startBattle(Math.floor(Math.random() * FACTIONS.length));
  }

  /** Starts the battle with the chosen faction under the player's command. */
  private startBattle(faction: number) {
    this.state = new World(this.layout, faction, watching);
    this.picking = false;
    if (watching) {
      const sides = Object.fromEntries(this.state.sides.map((s) => [String(s.index), { name: s.def.name, color: `#${s.def.color.toString(16).padStart(6, '0')}` }]));
      mountWatch({ sides, time: () => this.state.elapsedMs });
    }
    this.reset();
  }

  private reset() {
    this.fogFrame = 0;
    this.rivalsOpen = false;
    this.selected.clear();
    this.placing = null;
    this.drag = null;
    this.touchPan = null;
    this.message = '';
    this.lastFrame = null;
    this.flash = { amount: 0, ms: 0 };
    for (const s of this.ships.values()) {
      s.ship.destroy();
      s.flame.destroy();
    }
    this.ships.clear();
    for (const o of this.houses.values()) o.destroy();
    this.houses.clear();
    for (const c of this.crystals.values()) {
      c.gem.destroy();
      c.glow.destroy();
    }
    this.crystals.clear();
    for (const s of this.shardSprites.values()) {
      s.glow.destroy();
      s.gem.destroy();
    }
    this.shardSprites.clear();
    for (const n of this.state.nodes) {
      this.crystals.set(n.id, {
        glow: this.onMap(this.add.image(n.x, n.y - 4, GLOW_BLUE_KEY).setDepth(DEPTH.under).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.55)),
        gem: this.onMap(this.add.image(n.x, n.y, CRYSTAL_KEYS[n.id % CRYSTAL_KEYS.length]).setDepth(DEPTH.node)),
      });
    }
    const bc = this.state.beacon;
    this.beaconImg.setPosition(bc.x, bc.y - 4);
    this.beaconGlow.setPosition(bc.x, bc.y - 10);
    for (const l of this.derelictLabels) l.destroy();
    this.derelictLabels = this.state.derelicts.map((d) => this.onMap(this.text(d.x + DERELICT_RADIUS * 0.72, d.y + DERELICT_RADIUS * 0.5, 10, INK_CSS.chocolate, true)
      .setBackgroundColor(INK_CSS.cream).setPadding(6, 3, 6, 3).setDepth(DEPTH.label).setVisible(false)));
    const art = this.art(PLAYER);
    this.captions.forEach((c, i) => {
      const b = BUTTONS[i];
      if (b.kind === 'research' || b.kind === 'command') return;
      if (b.kind === 'build') c.icon.setTexture(buildingKey(art, b.key === 'expansion' ? 'hub' : b.key as Role));
      else c.icon.setTexture(shipKey(art, b.key as UnitId), facing(-Math.PI / 2).frame);
      c.icon.setScale(Math.min(24 / c.icon.width, 24 / c.icon.height) * (b.kind === 'build' ? 1.5 : 1.25));
    });
    this.centreOnHub();
  }

  /** The art (an index into FACTIONS) a side of the battle is drawn with. */
  private art(side: number) {
    return FACTIONS.indexOf(this.state.sides[side].def);
  }

  update(time: number) {
    // Game time from the frame's own timestamp, the same as the other games.
    const dt = this.lastFrame === null ? 0 : Phaser.Math.Clamp(time - this.lastFrame, 0, MAX_STEP_MS);
    this.lastFrame = time;
    if (!this.picking) {
      // Watching, the battle runs once per step of the chosen speed, none while held.
      for (let i = watchSteps(); i > 0; i--) this.state.update(dt);
      this.selected = new Set([...this.selected].filter((id) => this.state.selectable(id)));
      this.clock += dt;
    }
    for (const e of this.state.events.splice(0)) {
      if (e.kind === 'notice') this.message = e.text;
      else this.flash = { amount: (this.flash.ms > 0 ? this.flash.amount : 0) + e.amount, ms: FLASH_MS };
    }
    this.flash.ms = Math.max(0, this.flash.ms - dt);
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
    if (!this.picking && !watching) {
      // B falls the selection back (F is the shared full screen key); T opens and closes the rivals panel.
      if (Phaser.Input.Keyboard.JustDown(k.B)) this.press(BUTTONS.find((b) => b.key === 'fallback')!);
      if (Phaser.Input.Keyboard.JustDown(k.T)) this.rivalsOpen = !this.rivalsOpen;
    }
  }

  /** The top and command bars: chocolate panels edged with the cover's stripes, drawn once. */
  private drawChrome() {
    const g = this.chromeGfx;
    g.fillStyle(INK.chocolate, 1);
    g.fillRect(0, 0, VIEW.w, TOP.h);
    g.fillRect(0, BAR.y, VIEW.w, BAR.h);
    stripes(g, 0, TOP.h - 6, VIEW.w, 6);
    stripes(g, 0, BAR.y, VIEW.w, 6);
    // The faction's planet badge, the crystal and the harvester marks on the top bar.
    g.lineStyle(2, INK.tangerine, 1);
    g.strokeEllipse(17, 15, 26, 8);
    g.fillStyle(INK.mustard, 1);
    g.fillCircle(17, 15, 7);
    g.fillStyle(INK.tangerine, 1);
    g.fillRect(10, 13, 14, 2);
    const diamond = (x: number, y: number, r: number, color: number) => {
      g.fillStyle(color, 1);
      g.fillTriangle(x, y - r, x + r * 0.75, y, x - r * 0.75, y);
      g.fillStyle(0x2a6ad8, 1);
      g.fillTriangle(x, y + r, x + r * 0.75, y, x - r * 0.75, y);
    };
    diamond(172, 15, 8, INK.sky);
    g.fillStyle(INK.mustard, 1);
    g.fillTriangle(276, 8, 281, 22, 271, 22);
    g.fillTriangle(368, 8, 373, 22, 363, 22);
  }

  private draw() {
    const s = this.state;
    this.gfx.clear();
    this.underGfx.clear();
    this.uiGfx.clear();
    this.pickGfx.clear();

    for (const n of s.nodes) {
      const c = this.crystals.get(n.id);
      if (!c) continue;
      const k = 0.55 + 0.45 * (n.amount / NODE_AMOUNT);
      const shown = n.amount > 0 && s.fog.knows(n);
      c.gem.setVisible(shown).setScale(k / RES);
      c.glow.setVisible(shown).setScale(k * 0.9);
    }
    this.drawFog();
    this.drawNebulae();
    this.drawBeacon();
    this.drawDerelicts();
    this.drawMines();
    this.drawBuildings();
    this.drawShips();
    this.drawShards();
    this.drawEffects();
    this.drawPops();
    this.drawSelection();
    this.drawPlacement();
    this.drawHover();
    this.drawBar();
    this.drawTop();
    this.drawText();
    this.drawRivals();
    this.drawPicker();
  }

  /** The edge of each nebula, a faint dashed ring: ships inside are hidden from enemies and slowed. */
  private drawNebulae() {
    for (const n of this.layout.nebulae) dashedCircle(this.underGfx, n.x, n.y, n.r, 40, INK.cream, 0.14, 1.5);
  }

  /**
   * Derelict stations, once found: a dark steel wheel with a broken rim, a ring in the owner's
   * colour, the claim arc, its sensor reach for the player, and a label with what it gives.
   */
  private drawDerelicts() {
    const s = this.state;
    const g = this.underGfx;
    s.derelicts.forEach((d: Derelict, k) => {
      const label = this.derelictLabels[k];
      const found = s.watch || s.fog.knows(d);
      if (!found) {
        label.setVisible(false);
        return;
      }
      const color = d.owner >= 0 ? s.sides[d.owner].def.color : INK.cream;
      g.fillStyle(color, d.owner >= 0 ? 0.1 : 0.04);
      g.fillCircle(d.x, d.y, DERELICT_RADIUS);
      dashedCircle(g, d.x, d.y, DERELICT_RADIUS, 20, color, 0.4, 1.5);
      progressArc(g, d.x, d.y, DERELICT_RADIUS, d.claim, d.capturer >= 0 ? s.sides[d.capturer].def.color : INK.cream, 5);
      if (d.perk === 'sensors' && d.owner === PLAYER) dashedCircle(g, d.x, d.y, SENSOR_RANGE, 64, INK.cream, 0.18, 1);
      // The wreck: a grey wheel of spokes with a gap torn out of its rim, and a dead core that lights in the owner's colour.
      g.lineStyle(5, 0x4a4652, 1);
      g.beginPath();
      g.arc(d.x, d.y, 18, 0.5, Math.PI * 1.75, false);
      g.strokePath();
      g.lineStyle(2, 0x8a8494, 1);
      g.beginPath();
      g.arc(d.x, d.y, 18, 0.5, Math.PI * 1.75, false);
      g.strokePath();
      g.lineStyle(3, 0x5c5866, 1);
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3 + 0.3;
        if (a > Math.PI * 1.75 && a < Math.PI * 2 + 0.5) continue;
        g.lineBetween(d.x, d.y, d.x + Math.cos(a) * 18, d.y + Math.sin(a) * 18);
      }
      g.fillStyle(0x2a2731, 1);
      g.fillCircle(d.x, d.y, 8);
      g.fillStyle(d.owner >= 0 ? color : 0x6a6474, 1);
      g.fillCircle(d.x, d.y, 4);
      const def = DERELICT_DEFS[d.perk];
      const pct = Math.round(d.claim * 100);
      const who = d.owner === PLAYER ? 'Yours' : d.owner >= 0 ? `Held by ${s.sides[d.owner].def.name}` : `Hold ${pct}% · claim it`;
      const text = `DERELICT · ${def.name.toUpperCase()}\n${who}`;
      if (label.text !== text) label.setText(text);
      label.setVisible(!this.picking);
    });
  }

  /**
   * The rivals panel: each rival's stance toward the player (its grudge, a truce, an open offer) and
   * the buttons to accept or decline a truce or to pay tribute. A hint shows while an offer waits.
   */
  private drawRivals() {
    const s = this.state;
    const g = this.pickGfx;
    const rivals = s.sides.filter((r) => r.index !== PLAYER);
    const offer = rivals.find((r) => r.offerMs > 0);
    this.rivalsHint.setVisible(!this.rivalsOpen && !this.picking && !!offer);
    if (offer) this.setText(this.rivalsHint, `${offer.def.name} offers a truce · ${Math.ceil(offer.offerMs / 1000)} s · press T`);
    const show = this.rivalsOpen && !this.picking && !watching;
    this.rivalsHead.setVisible(show);
    this.rivalTexts.forEach((t) => [t.name, t.status, t.b1, t.b2].forEach((x) => x.setVisible(show)));
    this.rivalButtons = [];
    if (!show) return;
    const rp = RIVALS_PANEL;
    const h = rp.head + rivals.length * rp.row + 6;
    g.fillStyle(0x000000, 0.4);
    g.fillRoundedRect(rp.x + 3, rp.y + 4, rp.w, h, 8);
    g.fillStyle(INK.cream, 1);
    g.fillRoundedRect(rp.x, rp.y, rp.w, h, 8);
    g.fillStyle(INK.chocolate, 1);
    g.fillRoundedRect(rp.x, rp.y, rp.w, rp.head, { tl: 8, tr: 8, bl: 0, br: 0 });
    g.lineStyle(2, INK.cocoa, 1);
    g.strokeRoundedRect(rp.x, rp.y, rp.w, h, 8);
    const pill = (x: number, y: number, w: number, label: Phaser.GameObjects.Text, text: string, on: boolean, action: RivalButton['action'], faction: number) => {
      g.fillStyle(on ? INK.mustard : INK.creamDim, 1);
      g.fillRoundedRect(x, y, w, 22, 11);
      g.lineStyle(1.5, INK.cocoa, 1);
      g.strokeRoundedRect(x, y, w, 22, 11);
      this.setText(label, text);
      label.setPosition(x + w / 2, y + 11).setVisible(true).setColor(on ? INK_CSS.chocolate : INK_CSS.cocoa);
      if (on) this.rivalButtons.push({ x, y, w, h: 22, action, faction });
    };
    rivals.forEach((r, k) => {
      const t = this.rivalTexts[k];
      const y = rp.y + rp.head + k * rp.row;
      g.fillStyle(r.def.color, r.alive ? 1 : 0.2);
      g.fillCircle(rp.x + 13, y + 14, 5.5);
      g.lineStyle(1, INK.cocoa, 1);
      g.lineBetween(rp.x + 8, y + rp.row, rp.x + rp.w - 8, y + rp.row);
      this.setText(t.name, r.def.name);
      t.b1.setVisible(false);
      t.b2.setVisible(false);
      if (!r.alive) {
        this.setText(t.status, 'Fallen');
        return;
      }
      const grudge = r.grudge === PLAYER ? 'Grudge: you' : r.grudge >= 0 ? `Grudge: the ${s.sides[r.grudge].def.name}` : 'No grudge yet';
      const lock = r.grudgeLockMs > 0 ? ` · held by tribute ${Math.ceil(r.grudgeLockMs / 1000)} s` : '';
      t.status.setWordWrapWidth(r.offerMs > 0 ? rp.w - 196 : rp.w - 140);
      if (r.offerMs > 0) {
        this.setText(t.status, `Offers a truce: ${TRUCE_MS / 1000} s of peace, +${TRUCE_TRIBUTE} crystal · ${Math.ceil(r.offerMs / 1000)} s`);
        pill(rp.x + rp.w - 160, y + 12, 72, t.b1, 'ACCEPT', true, 'accept', r.index);
        pill(rp.x + rp.w - 82, y + 12, 74, t.b2, 'DECLINE', true, 'decline', r.index);
        return;
      }
      if (r.truceMs > 0) {
        this.setText(t.status, `Truce: ${Math.ceil(r.truceMs / 1000)} s left. Attacking it breaks the truce.`);
        return;
      }
      const target = s.bribeTarget(r.index);
      this.setText(t.status, lock ? `${grudge}${lock}` : `${grudge}${target ? ` · tribute turns it on the ${target.def.name} for ${BRIBE_MS / 1000} s` : ''}`);
      if (target) pill(rp.x + rp.w - 104, y + 12, 96, t.b1, `TRIBUTE ◆${BRIBE_COST}`, s.sides[PLAYER].crystal >= BRIBE_COST, 'bribe', r.index);
    });
  }

  /**
   * The fog of war: a canvas of one pixel a cell, smoothed onto a bigger one stretched over the
   * battlefield so its edges blur like airbrush. Unexplored space is near black, explored space is dimmed.
   */
  private drawFog() {
    if (this.fogFrame++ % FOG_EVERY !== 0) return;
    const fog = this.state.fog;
    const d = this.fogData.data;
    const [r, g, b] = FOG_RGB;
    const alpha = this.fogAlpha;
    for (let i = 0; i < alpha.length; i++) alpha[i] = fog.visible[i] ? 0 : fog.explored[i] ? FOG_EXPLORED : FOG_UNEXPLORED;
    blur(alpha, this.fogTmp, FOG_COLS, FOG_ROWS, FOG_BLUR);
    for (let i = 0; i < alpha.length; i++) {
      d[i * 4] = r;
      d[i * 4 + 1] = g;
      d[i * 4 + 2] = b;
      d[i * 4 + 3] = Math.round(alpha[i] * 255);
    }
    this.fogCells.getContext('2d')!.putImageData(this.fogData, 0, 0);
    const ctx = this.fogTex.context;
    ctx.clearRect(0, 0, this.fogTex.width, this.fogTex.height);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(this.fogCells, 0, 0, this.fogTex.width, this.fogTex.height);
    this.fogTex.refresh();
  }

  /** Mines: a dark studded disc with a ring in the layer's colour; a rival's only when a ship is close. */
  private drawMines() {
    const g = this.underGfx;
    for (const m of this.state.mines) {
      if (!this.state.seesMine(m)) continue;
      const def = this.state.sides[m.faction].def;
      g.fillStyle(INK.chocolate, 0.95);
      g.fillCircle(m.x, m.y, 5);
      for (let k = 0; k < 4; k++) {
        const a = (k * Math.PI) / 2 + Math.PI / 4;
        g.fillCircle(m.x + Math.cos(a) * 6, m.y + Math.sin(a) * 6, 1.6);
      }
      g.lineStyle(1.5, def.color, m.faction === PLAYER ? 0.55 : 1);
      g.strokeCircle(m.x, m.y, 8);
      g.fillStyle(def.accent, 1);
      g.fillCircle(m.x, m.y, 1.8);
    }
  }

  /** The relay beacon: its capture ring, the owner's glow and its label, once the player has found it. */
  private drawBeacon() {
    const bc = this.state.beacon;
    const found = this.state.fog.knows(bc);
    this.beaconImg.setVisible(found);
    this.beaconGlow.setVisible(found);
    if (!found) {
      this.beaconLabel.setVisible(false);
      return;
    }
    const g = this.underGfx;
    const color = (f: number) => (f >= 0 ? this.state.sides[f].def.color : INK.cream);
    g.fillStyle(color(bc.owner), bc.owner >= 0 ? 0.12 : 0.05);
    g.fillCircle(bc.x, bc.y, BEACON_RADIUS);
    dashedCircle(g, bc.x, bc.y, BEACON_RADIUS, 24, INK.cream, 0.45, 1.5);
    progressArc(g, bc.x, bc.y, BEACON_RADIUS, bc.capture, color(bc.capturer), 5);
    const pulse = settings.reduceMotion ? 1 : 0.9 + 0.1 * Math.sin(this.clock / 300);
    this.beaconGlow.setScale((bc.held ? 1.4 : 0.9) * pulse).setAlpha(bc.held ? 0.7 : 0.4);
    const pct = Math.round(bc.capture * 100);
    const status = bc.owner === PLAYER
      ? bc.held ? `Yours: +${BEACON_PAY} crystal/s` : 'Yours: keep a ship here to earn'
      : bc.owner >= 0 ? `Held by ${this.state.sides[bc.owner].def.name}` : `Hold it: +${BEACON_PAY} crystal/s`;
    const label = `RELAY BEACON  ${pct}%\n${status}`;
    if (this.beaconLabel.text !== label) this.beaconLabel.setText(label);
    this.beaconLabel.setPosition(bc.x + BEACON_RADIUS * 0.72, bc.y + BEACON_RADIUS * 0.55).setVisible(!this.picking);
  }

  private drawBuildings() {
    const seen = new Set<number>();
    for (const b of this.state.buildings) {
      // Rival buildings show once the player has seen them; under the fog they show as last seen.
      if (!this.state.knowsBuilding(b)) continue;
      seen.add(b.id);
      const side = this.state.sides[b.faction];
      const def = side.def.buildings[b.type];
      // A hacked turret changes faction, and with it its look.
      const key = buildingKey(this.art(b.faction), b.type);
      let img = this.houses.get(b.id);
      if (!img) {
        img = this.onMap(this.add.image(b.x, b.y, key).setScale((b.expansion ? EXPANSION_SCALE : 1) / RES).setDepth(DEPTH.building));
        this.houses.set(b.id, img);
      } else if (img.texture.key !== key) {
        img.setTexture(key);
      }
      const inSight = b.faction === PLAYER || this.state.fog.sees(b);
      const floats = side.def.name === 'Solar Concord' && b.type === 'turret' && !settings.reduceMotion;
      img.setPosition(b.x, b.y + (floats ? Math.sin(this.clock / 500 + b.id) * 1.6 : 0));
      img.setAlpha(!b.done ? 0.5 : b.disabledMs > 0 ? 0.45 : 1);
      const r = def.radius;
      // A soft faction-coloured pad under every building, so a base reads as its faction's at a glance.
      this.underGfx.fillStyle(side.def.color, 0.16);
      this.underGfx.fillEllipse(b.x, b.y + 2, r * 2.6, r * 1.7);
      if (!inSight) continue;
      if (!b.done) {
        drawProgress(this.gfx, b.x, b.y + r + 6, 34, 1 - b.buildLeft / b.buildMs, side.def.color);
      } else if (b.hp < b.maxHp) {
        drawHealth(this.gfx, b.x, b.y - r - 14, 32, b.hp / b.maxHp);
      }
      // A hacked turret fills a ring toward its takeover.
      if (b.hacks > 0) progressArc(this.gfx, b.x, b.y, r + 9, b.hacks / TAKEOVER, 0x5ff0e6, 3);
    }
    for (const [id, img] of this.houses) {
      if (!seen.has(id)) {
        img.destroy();
        this.houses.delete(id);
      }
    }
  }

  /** Ships: the baked frame nearest each heading, turned the last few degrees, with exhaust while moving. */
  private drawShips() {
    const s = this.state;
    const seen = new Set<number>();
    for (const u of s.units) {
      if (!s.seesUnit(u)) continue;
      seen.add(u.id);
      const art = this.art(u.faction);
      let sp = this.ships.get(u.id);
      if (!sp) {
        sp = {
          flame: this.onMap(this.add.image(u.x, u.y, flameKey(art)).setOrigin(1, 0.5).setDepth(DEPTH.flame)),
          ship: this.onMap(this.add.image(u.x, u.y, shipKey(art, u.type), 0).setScale(1 / RES).setDepth(DEPTH.ship)),
          lastX: u.x,
          lastY: u.y,
        };
        this.ships.set(u.id, sp);
      }
      const def = s.sides[u.faction].def.units[u.type];
      const { frame, rest } = facing(u.angle);
      // A cloaked ship of the player's own shows faintly, as does one hiding in a nebula; a decoy is a dimmer copy of its ship.
      const cloaked = u.faction === PLAYER && def.ability?.kind === 'cloak' && u.revealMs <= 0;
      const alpha = cloaked ? 0.4 : u.nebula && u.revealMs <= 0 ? 0.6 : u.decoyMs !== null ? 0.6 : 1;
      sp.ship.setFrame(frame).setPosition(u.x, u.y).setRotation(rest).setAlpha(alpha);
      const moving = Math.hypot(u.x - sp.lastX, u.y - sp.lastY) > 0.01;
      sp.lastX = u.x;
      sp.lastY = u.y;
      sp.flame.setVisible(moving && !this.picking);
      if (moving) {
        const flicker = settings.reduceMotion ? 1 : 0.85 + 0.15 * Math.sin(this.clock / 40 + u.id * 1.7);
        const len = FLAME[u.type] * SHIP_ZOOM * flicker;
        const tail = TAIL[u.type] * SHIP_ZOOM;
        sp.flame
          .setPosition(u.x - Math.cos(u.angle) * tail, u.y - Math.sin(u.angle) * tail)
          .setRotation(u.angle)
          .setScale(len / sp.flame.width, (u.type === 'heavy' ? 12 : 8) / sp.flame.height)
          .setAlpha(alpha * 0.95);
      }
      if (def.ability?.kind === 'shield') {
        this.underGfx.fillStyle(s.sides[u.faction].def.accent, 0.06);
        this.underGfx.fillCircle(u.x, u.y, def.ability.range);
        this.underGfx.lineStyle(1.5, s.sides[u.faction].def.color, 0.3);
        this.underGfx.strokeCircle(u.x, u.y, def.ability.range);
      }
      if (this.selected.has(u.id)) dashedCircle(this.gfx, u.x, u.y, u.type === 'heavy' ? 22 : 16, 10, INK.tangerine, 1, 2);
      if (u.hp < u.maxHp) drawHealth(this.gfx, u.x, u.y - 18, 22, u.hp / u.maxHp);
      // Veteran chevrons above the ship, one per rank, in the faction's gold.
      const rank = s.rankOf(u);
      for (let k = 0; k < rank; k++) {
        const cx = u.x - (rank - 1) * 4 + k * 8;
        const cy = u.y - 26;
        this.gfx.fillStyle(0xffd36a, 1);
        this.gfx.fillTriangle(cx - 3.5, cy - 3, cx + 3.5, cy - 3, cx, cy + 2);
      }
      // A green cross beside a ship under repair.
      if (u.repairing && u.hp < u.maxHp) {
        this.gfx.lineStyle(2.5, 0x5ad66e, 1);
        this.gfx.lineBetween(u.x + 10, u.y - 15, u.x + 18, u.y - 15);
        this.gfx.lineBetween(u.x + 14, u.y - 19, u.x + 14, u.y - 11);
      }
    }
    for (const [id, sp] of this.ships) {
      if (!seen.has(id)) {
        sp.ship.destroy();
        sp.flame.destroy();
        this.ships.delete(id);
      }
    }
  }

  /** Salvage shards: glowing gold crystals that fly to the nearest of the player's ships. */
  private drawShards() {
    const seen = new Set<number>();
    for (const sh of this.state.shards) {
      if (!this.state.fog.sees(sh)) continue;
      seen.add(sh.id);
      let sp = this.shardSprites.get(sh.id);
      if (!sp) {
        sp = {
          glow: this.onMap(this.add.image(sh.x, sh.y, GLOW_KEY).setDepth(DEPTH.shard).setBlendMode(Phaser.BlendModes.ADD)),
          gem: this.onMap(this.add.image(sh.x, sh.y, SHARD_KEY).setScale(1 / RES).setDepth(DEPTH.shard)),
        };
        this.shardSprites.set(sh.id, sp);
      }
      const pulse = settings.reduceMotion ? 1 : 0.85 + 0.15 * Math.sin(this.clock / 160 + sh.id);
      sp.glow.setPosition(sh.x, sh.y).setScale(0.75 * pulse).setAlpha(0.85);
      sp.gem.setPosition(sh.x, sh.y - 2);
    }
    for (const [id, sp] of this.shardSprites) {
      if (!seen.has(id)) {
        sp.glow.destroy();
        sp.gem.destroy();
        this.shardSprites.delete(id);
      }
    }
  }

  /** Laser beams with a cream core, and airbrushed fireballs where things blow up. */
  private drawEffects() {
    const g = this.gfx;
    const fog = this.state.fog;
    for (const b of this.state.beams) {
      if (!fog.sees(b) && !fog.sees({ x: b.x2!, y: b.y2! })) continue;
      const a = settings.reduceMotion ? 0.9 : b.life / BEAM_MS;
      g.lineStyle(5, b.color, 0.35 * a);
      g.lineBetween(b.x, b.y, b.x2!, b.y2!);
      g.lineStyle(1.8, 0xfff4d8, a);
      g.lineBetween(b.x, b.y, b.x2!, b.y2!);
    }
    // Fireballs are not drawn under reduced motion, where their growth is the motion.
    if (!settings.reduceMotion) {
      for (const b of this.state.booms) {
        if (!fog.sees(b)) continue;
        const t = 1 - b.life / BOOM_MS;
        const r = b.r! * (0.6 + t * 1.4);
        g.fillStyle(0xe8742a, 0.45 * (1 - t));
        g.fillCircle(b.x, b.y, r);
        g.fillStyle(0xfff0c0, 0.7 * (1 - t));
        g.fillCircle(b.x, b.y, r * 0.45);
        g.lineStyle(2, b.color, 1 - t);
        g.strokeCircle(b.x, b.y, r * 1.25);
      }
    }
  }

  /** Floating numbers over the map: +8 where a shard is picked up, +3 over the beacon. */
  private drawPops() {
    const pops = this.state.pops;
    while (this.popTexts.length < pops.length) {
      this.popTexts.push(this.onMap(this.text(0, 0, 16, '#ffffff', true).setOrigin(0.5, 1).setStroke(INK_CSS.chocolate, 4).setDepth(DEPTH.pop)));
    }
    this.popTexts.forEach((t, k) => {
      const p = pops[k];
      t.setVisible(!!p);
      if (!p) return;
      const age = 1 - p.life / POP_MS;
      if (t.text !== p.text) t.setText(p.text);
      t.setColor(hex(p.color));
      t.setPosition(p.x, p.y - (settings.reduceMotion ? 0 : age * 22));
      t.setAlpha(age < 0.6 ? 1 : 1 - (age - 0.6) / 0.4);
    });
  }

  /** The box being dragged, in view pixels. */
  private drawSelection() {
    if (this.drag) {
      const d = this.drag;
      this.uiGfx.fillStyle(INK.mustard, 0.08);
      this.uiGfx.fillRect(Math.min(d.x0, d.x1), Math.min(d.y0, d.y1), Math.abs(d.x1 - d.x0), Math.abs(d.y1 - d.y0));
      this.uiGfx.lineStyle(1.5, INK.mustard, 0.9);
      this.uiGfx.strokeRect(Math.min(d.x0, d.x1), Math.min(d.y0, d.y1), Math.abs(d.x1 - d.x0), Math.abs(d.y1 - d.y0));
    }
  }

  /** The building being placed follows the pointer: green where it can go, orange where it can't. */
  private drawPlacement() {
    if (!this.placing || !this.inMap(this.pointer.x, this.pointer.y)) {
      this.ghost.setVisible(false);
      return;
    }
    const { x, y } = this.toWorld(this.pointer.x, this.pointer.y);
    const ok = this.state.placementProblem(this.placing, x, y) === null;
    const side = this.state.sides[PLAYER];
    const radius = buildInfo(side, this.placing).radius;
    // Buildings go within reach of a hub; an expansion goes far from them, so the rings show where not to.
    for (const hub of this.state.hubsOf(PLAYER, this.placing !== 'expansion')) {
      dashedCircle(this.underGfx, hub.x, hub.y, this.placing === 'expansion' ? EXPANSION_GAP : BUILD_RANGE, 48, INK.cream, 0.35, 1.5);
    }
    this.underGfx.fillStyle(ok ? 0x7dffb0 : 0xffa94d, 0.25);
    this.underGfx.fillCircle(x, y, radius + 4);
    this.underGfx.lineStyle(2, ok ? 0x7dffb0 : 0xffa94d, 0.9);
    this.underGfx.strokeCircle(x, y, radius + 4);
    const expansion = this.placing === 'expansion';
    this.ghost.setTexture(buildingKey(this.art(PLAYER), expansion ? 'hub' : this.placing as Role))
      .setScale(1 / RES * (expansion ? EXPANSION_SCALE : 1)).setPosition(x, y).setVisible(true);
  }

  /** Names the unit or building under the pointer, with its role and hit points. */
  private drawHover() {
    const label = this.hoverLabel;
    const hit = this.inMap(this.pointer.x, this.pointer.y) && !this.placing && !this.picking
      ? this.toWorld(this.pointer.x, this.pointer.y)
      : null;
    const target = hit ? this.state.entityAt(hit.x, hit.y) : null;
    const derelict = hit && !target ? this.state.derelictAt(hit.x, hit.y) : null;
    if (derelict) {
      const text = [`Derelict ${DERELICT_DEFS[derelict.perk].name} · Station`, ...derelictLines(derelict.perk)].join('\n');
      if (label.text !== text) label.setText(text);
      label.setPosition(derelict.x, derelict.y - LABEL_LIFT).setVisible(true);
      return;
    }
    if (!target) {
      label.setVisible(false);
      return;
    }
    const side = this.state.sides[target.faction];
    let text: string;
    let at: { x: number; y: number };
    if (target.kind === 'unit') {
      const u = this.state.unit(target.id)!;
      const rank = this.state.rankOf(u);
      const head = `${side.def.units[u.type].name} · ${rank ? `${VETERAN_NAMES[rank - 1]} ${'★'.repeat(rank)} · ` : ''}${ROLE_LABEL[u.type]} · ${Math.ceil(u.hp)}/${u.maxHp} hp`;
      text = [head, ...unitLines(side, u.type)].join('\n');
      at = u;
    } else {
      const b = this.state.building(target.id)!;
      const name = b.expansion ? buildInfo(side, 'expansion').name : side.def.buildings[b.type].name;
      const head = `${name} · ${ROLE_LABEL[b.expansion ? 'expansion' : b.type]} · ${Math.ceil(b.hp)}/${b.maxHp} hp`;
      text = [head, ...(b.expansion ? expansionLines(side) : buildingLines(side, b.type))].join('\n');
      at = b;
    }
    if (label.text !== text) label.setText(text);
    label.setPosition(at.x, at.y - LABEL_LIFT).setVisible(true);
  }

  /** Each button: a cream pill with the ship or building, its name, role and crystal cost. */
  private drawBar() {
    const g = this.uiGfx;
    BUTTONS.forEach((b, i) => {
      if (b.kind === 'research') {
        this.drawResearchButton(b, i);
        return;
      }
      if (b.kind === 'command') {
        this.drawCommandButton(b, i);
        return;
      }
      const { name, cost } = this.buttonInfo(b);
      const affordable = this.state.sides[PLAYER].crystal >= cost;
      const active = b.kind === 'build' && this.placing === b.key;
      const round = b.h / 2;
      g.fillStyle(0x000000, 0.35);
      g.fillRoundedRect(b.x + 2, b.y + 3, b.w, b.h, round);
      g.fillStyle(active ? INK.mustard : affordable ? INK.cream : INK.creamDim, 1);
      g.fillRoundedRect(b.x, b.y, b.w, b.h, round);
      g.fillStyle(INK.tangerine, 1);
      g.fillRect(b.x + 26, b.y, 3, b.h);
      g.fillStyle(INK.mustard, 1);
      g.fillRect(b.x + 29, b.y, 2, b.h);
      g.lineStyle(1.5, active ? INK.tangerine : INK.cocoa, 1);
      g.strokeRoundedRect(b.x, b.y, b.w, b.h, round);
      const caption = this.captions[i];
      caption.icon.setAlpha(affordable ? 1 : 0.55);
      if (caption.name.text !== name) {
        caption.name.setText(name).setFontSize(12);
        for (let size = 11; caption.name.width > b.w - 36 && size >= 9; size--) caption.name.setFontSize(size);
      }
      const roleLine = `${ROLE_LABEL[b.key]} · ◆${cost}`;
      if (caption.cost.text !== roleLine) caption.cost.setText(roleLine);
      caption.name.setColor(affordable ? INK_CSS.chocolate : INK_CSS.creamDim);
    });
    this.drawTip();
  }

  /**
   * A research button: a slim cream pill with the track's name, its next level and cost, three
   * level pips on the right, and a mustard fill while that track is being researched.
   */
  private drawResearchButton(b: Button, i: number) {
    const g = this.uiGfx;
    const side = this.state.sides[PLAYER];
    const track = b.key as Track;
    const r = side.research;
    const level = r.levels[track];
    const cost = researchCost(side, track);
    const busy = r.current?.track === track;
    const open = level < RESEARCH_LEVELS && !r.current && side.crystal >= cost;
    const round = b.h / 2;
    g.fillStyle(0x000000, 0.35);
    g.fillRoundedRect(b.x + 2, b.y + 3, b.w, b.h, round);
    g.fillStyle(open || busy ? INK.cream : INK.creamDim, 1);
    g.fillRoundedRect(b.x, b.y, b.w, b.h, round);
    if (busy) {
      const done = 1 - r.current!.left / RESEARCH_MS;
      g.fillStyle(INK.mustard, 1);
      g.fillRoundedRect(b.x, b.y, Math.max(b.h, b.w * done), b.h, round);
    }
    g.fillStyle(INK.tangerine, 1);
    g.fillRect(b.x + 4, b.y + 5, 2, b.h - 10);
    for (let k = 0; k < RESEARCH_LEVELS; k++) {
      const px = b.x + b.w - 30 + k * 9;
      g.fillStyle(k < level ? INK.tangerine : INK.creamDim, 1);
      g.fillCircle(px, b.y + b.h / 2, 3.2);
      g.lineStyle(1, INK.cocoa, 1);
      g.strokeCircle(px, b.y + b.h / 2, 3.2);
    }
    g.lineStyle(1.5, busy ? INK.tangerine : INK.cocoa, 1);
    g.strokeRoundedRect(b.x, b.y, b.w, b.h, round);
    const caption = this.captions[i];
    this.setText(caption.name, TRACK_DEFS[track].name);
    const sub = busy ? `Researching · ${Math.ceil(r.current!.left / 1000)} s`
      : level >= RESEARCH_LEVELS ? 'Fully researched' : `Level ${level + 1} · ◆${cost}`;
    this.setText(caption.cost, sub);
    caption.name.setColor(open || busy ? INK_CSS.chocolate : INK_CSS.cocoa);
  }

  /** The Fall back button: a slim cream pill, lit while ships are selected. */
  private drawCommandButton(b: Button, i: number) {
    const g = this.uiGfx;
    const on = this.selected.size > 0;
    const round = b.h / 2;
    g.fillStyle(0x000000, 0.35);
    g.fillRoundedRect(b.x + 2, b.y + 3, b.w, b.h, round);
    g.fillStyle(on ? INK.cream : INK.creamDim, 1);
    g.fillRoundedRect(b.x, b.y, b.w, b.h, round);
    g.fillStyle(INK.tangerine, 1);
    g.fillRect(b.x + 4, b.y + 5, 2, b.h - 10);
    g.lineStyle(1.5, INK.cocoa, 1);
    g.strokeRoundedRect(b.x, b.y, b.w, b.h, round);
    const caption = this.captions[i];
    this.setText(caption.name, 'FALL BACK');
    this.setText(caption.cost, on ? `${this.selected.size} selected · B` : 'Select ships · B');
    caption.name.setColor(on ? INK_CSS.chocolate : INK_CSS.cocoa);
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
    const lines = b.kind === 'research' ? researchLines(side, b.key as Track)
      : b.kind === 'command' ? fallBackLines()
      : b.key === 'expansion' ? expansionLines(side)
      : b.kind === 'build' ? buildingLines(side, b.key as Role) : unitLines(side, b.key as UnitId);
    const text = [`${name} · ${ROLE_LABEL[b.key]}`, ...lines].join('\n');
    if (this.tip.text !== text) this.tip.setText(text);
    // Above the command bar, so the tip never covers the buttons it describes.
    this.tip.setPosition(Phaser.Math.Clamp(b.x, 4, VIEW.w - this.tip.width - 4), BAR.y - 6).setVisible(true);
  }

  /** The caption and crystal cost a button shows for the player's faction. */
  buttonInfo(b: Button): { name: string; cost: number } {
    const side = this.state.sides[PLAYER];
    if (b.kind === 'research') return { name: TRACK_DEFS[b.key as Track].name, cost: researchCost(side, b.key as Track) };
    if (b.kind === 'command') return { name: 'Fall back', cost: 0 };
    if (b.kind === 'build') {
      const stats = buildInfo(side, b.key as Build);
      return { name: stats.name, cost: stats.cost };
    }
    const stats = unitStats(side, b.key as UnitId);
    return { name: stats.name, cost: stats.cost };
  }

  private setText(t: Phaser.GameObjects.Text, value: string) {
    if (t.text !== value) t.setText(value);
  }

  /** The top bar: faction, crystal (with the gain flash), counts, clock, the contract pill and the rivals. */
  private drawTop() {
    const s = this.state;
    const side = s.sides[PLAYER];
    const h = this.hud;
    const g = this.uiGfx;
    const sec = Math.floor(s.elapsedMs / 1000);
    this.setText(h.faction, this.picking ? 'SPACE WARS' : side.def.name.toUpperCase());
    this.setText(h.crystal, String(side.crystal));
    this.setText(h.gain, `+${this.flash.amount}`);
    h.gain.setVisible(this.flash.ms > 0).setX(h.crystal.x + h.crystal.width + 6);
    this.setText(h.harvesters, `${s.count(PLAYER, 'harvester')} harvesters`);
    this.setText(h.army, `${s.units.filter((u) => u.faction === PLAYER && u.type !== 'harvester').length} army`);
    this.setText(h.clock, `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`);

    // The contract pill: a tangerine tag, then the contract's title, progress and reward on cream.
    const c = CONTRACTS[s.contract.index];
    g.fillStyle(INK.cream, 1);
    g.fillRoundedRect(482, 4, 308, 21, 10.5);
    g.fillStyle(INK.tangerine, 1);
    g.fillRoundedRect(482, 4, 90, 21, 10.5);
    g.lineStyle(1.5, INK.mustard, 1);
    g.strokeRoundedRect(482, 4, 308, 21, 10.5);
    if (c) {
      this.setText(h.tag, `CONTRACT ${s.contract.index + 1}/${CONTRACTS.length}`);
      this.setText(h.title, c.title(side.def));
      this.setText(h.count, `${Math.floor(s.contract.progress)}/${c.target}  ◆+${c.reward}`);
    } else {
      this.setText(h.tag, 'CONTRACTS ✓');
      this.setText(h.title, 'Every contract done: Rank V');
      this.setText(h.count, '');
    }
    h.title.setFontSize(11);
    if (h.title.x + h.title.width > h.count.x - h.count.width - 6) h.title.setFontSize(10);

    // Rivals: a dot in each rival's colour, hollow once it has fallen. The area opens the rivals panel; it glows while a truce is offered.
    if (s.sides.some((r) => r.index !== PLAYER && r.offerMs > 0) && !this.picking) {
      g.fillStyle(INK.mustard, 0.35 + (settings.reduceMotion ? 0 : 0.25 * Math.sin(this.clock / 200)));
      g.fillRoundedRect(RIVALS_TAB.x, 3, RIVALS_TAB.w - 4, 23, 6);
    }
    s.sides.forEach((r, k) => {
      if (r.index === PLAYER) return;
      const x = 862 + (k - 1) * 15;
      g.fillStyle(r.def.color, r.alive ? 1 : 0.15);
      g.fillCircle(x, 15, 5.5);
      g.lineStyle(1.5, INK.cream, r.alive ? 0.9 : 0.4);
      g.strokeCircle(x, 15, 5.5);
    });
    this.setText(h.rivalCount, String(s.sides.filter((f) => f.index !== PLAYER && f.alive).length));
  }

  /** The command bar's right side: the selection or the latest message, and the contract panel. */
  private drawText() {
    const s = this.state;
    const side = s.sides[PLAYER];
    let line = this.message;
    if (this.picking) {
      line = 'Tap a faction above to command it. The other four factions are AI.';
    } else if (this.placing === 'expansion') {
      line = `Tap beside a far crystal field you have scouted to place the ${buildInfo(side, 'expansion').name}. Right-click to cancel.`;
    } else if (this.placing) {
      line = `Tap the map to place the ${side.def.buildings[this.placing].name}. Right-click to cancel.`;
    } else if (!line) {
      line = 'Tap or drag to select ships. Tap the ground to move, an enemy to attack. Harvesters work on their own.';
    }
    if (this.selected.size === 1) {
      const u = s.unit([...this.selected][0]);
      if (u) line = `Selected: ${side.def.units[u.type].name} (${ROLE_LABEL[u.type]}), hp ${Math.ceil(u.hp)}/${u.maxHp} · ${line}`;
    } else if (this.selected.size) {
      line = `Selected: ${this.selected.size} ships · ${line}`;
    }
    this.setText(this.panel.line, line);

    // The contract panel: a tangerine header, then the goal, a progress bar, the reward and the perk.
    const g = this.uiGfx;
    const x = PANEL_X;
    const w = VIEW.w - x - 8;
    g.fillStyle(INK.cream, 1);
    g.fillRoundedRect(x, 473, w, 62, 6);
    g.fillStyle(INK.tangerine, 1);
    g.fillRoundedRect(x, 473, w, 16, { tl: 6, tr: 6, bl: 0, br: 0 });
    g.fillStyle(INK.mustard, 1);
    g.fillRect(x, 489, w, 2);
    const c = CONTRACTS[s.contract.index];
    const next = CONTRACTS[s.contract.index + 1];
    const p = this.panel;
    if (c) {
      this.setText(p.head, `CONTRACT ${s.contract.index + 1} OF ${CONTRACTS.length}`);
      this.setText(p.next, next ? `Next: ${next.title(side.def)}` : 'Last contract');
      this.setText(p.brief, c.brief(side.def));
      const ratio = Math.min(1, s.contract.progress / c.target);
      g.fillStyle(INK.creamDim, 1);
      g.fillRoundedRect(x + 8, 509, 156, 8, 4);
      g.fillStyle(INK.green, 1);
      g.fillRoundedRect(x + 8, 509, Math.max(8, 156 * ratio), 8, 4);
      this.setText(p.count, `${Math.floor(s.contract.progress)} / ${c.target}`);
      this.setText(p.reward, `Reward ◆ +${c.reward}`);
      this.setText(p.perk, `+ ${c.perk(side.def)}`);
    } else {
      this.setText(p.head, 'CONTRACTS COMPLETE');
      this.setText(p.next, '');
      this.setText(p.brief, 'All five contracts done. Finish the rival hubs.');
      this.setText(p.count, '');
      this.setText(p.reward, '');
      this.setText(p.perk, 'Rank V');
    }

    const end = s.watch && s.phase === 'won'
      ? `${s.sides[s.winner]?.def.name.toUpperCase() ?? 'NOBODY'} WINS\nTap to watch another`
      : s.phase === 'won' ? 'VICTORY\nTap to play again' : s.phase === 'lost' ? 'DEFEAT\nTap to try again' : '';
    this.setText(this.overlay, end);
    this.overlay.setVisible(end !== '');
  }

  /** The faction picker: a dark veil over the map and a cream card for each faction. */
  private drawPicker() {
    const show = this.picking;
    this.pickTitle.setVisible(show);
    this.pickTexts.forEach((t) => {
      t.name.setVisible(show);
      t.body.setVisible(show);
    });
    this.pickImages.forEach((i) => i.setVisible(show));
    if (!show) return;
    const g = this.pickGfx;
    g.fillStyle(0x140a1c, 0.72);
    g.fillRect(MAP_VIEW.x, MAP_VIEW.y, MAP_VIEW.w, MAP_VIEW.h);
    for (const c of this.pickCards) {
      const def = FACTIONS[c.faction];
      g.fillStyle(0x000000, 0.4);
      g.fillRoundedRect(c.x + 3, c.y + 4, c.w, c.h, 12);
      g.fillStyle(INK.cream, 1);
      g.fillRoundedRect(c.x, c.y, c.w, c.h, 12);
      g.fillStyle(INK.chocolate, 1);
      g.fillRoundedRect(c.x, c.y, c.w, 30, { tl: 12, tr: 12, bl: 0, br: 0 });
      stripes(g, c.x, c.y + 30, c.w, 6);
      g.fillStyle(def.color, 1);
      g.fillCircle(c.x + c.w - 16, c.y + 15, 6);
      g.fillStyle(def.color, 0.2);
      g.fillEllipse(c.x + c.w / 2, c.y + 86, 110, 52);
      g.lineStyle(2, INK.cocoa, 1);
      g.strokeRoundedRect(c.x, c.y, c.w, c.h, 12);
    }
  }

  /** The midpoint of the two fingers down on the screen, in view pixels, or null unless two are down. */
  private twoFingers() {
    const down = [this.input.pointer1, this.input.pointer2].filter((t) => t?.isDown);
    if (down.length < 2) return null;
    const [a, b] = down.map((t) => viewPoint(t));
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  }

  private onDown(pointer: Phaser.Input.Pointer) {
    const p = viewPoint(pointer);
    // A second finger on the map turns the first one's box into a two-finger scroll.
    const mid = this.state.phase === 'playing' && !this.picking && this.inMap(p.x, p.y) ? this.twoFingers() : null;
    if (mid) {
      this.touchPan = mid;
      this.drag = null;
      return;
    }
    if (this.state.phase !== 'playing') {
      this.newGame();
      return;
    }
    // Watching, the AI gives every order; the map still pans.
    if (watching) return;
    if (this.picking) {
      const card = this.pickCards.find((c) => p.x >= c.x && p.x < c.x + c.w && p.y >= c.y && p.y < c.y + c.h);
      if (card) this.startBattle(card.faction);
      return;
    }
    if (pointer.rightButtonDown()) {
      this.placing = null;
      this.selected.clear();
      this.rivalsOpen = false;
      return;
    }
    // The rivals area of the top bar opens the panel; its buttons answer offers and pay tribute.
    if (p.y < TOP.h && p.x >= RIVALS_TAB.x) {
      this.rivalsOpen = !this.rivalsOpen;
      return;
    }
    if (this.rivalsOpen) {
      const rb = this.rivalButtons.find((b) => p.x >= b.x && p.x < b.x + b.w && p.y >= b.y && p.y < b.y + b.h);
      if (rb) {
        const reason = rb.action === 'accept' ? this.state.acceptTruce(rb.faction)
          : rb.action === 'decline' ? this.state.declineTruce(rb.faction) : this.state.bribe(rb.faction);
        if (reason) this.message = reason;
        else if (rb.action === 'decline') this.message = `Truce declined`;
        return;
      }
      const rp = RIVALS_PANEL;
      const h = rp.head + (this.state.sides.length - 1) * rp.row + 6;
      if (p.x >= rp.x && p.x < rp.x + rp.w && p.y >= rp.y && p.y < rp.y + h) return;
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
        this.message = `${buildInfo(this.state.sides[PLAYER], this.placing).name} started`;
        this.placing = null;
      }
      return;
    }
    this.drag = { x0: p.x, y0: p.y, x1: p.x, y1: p.y };
  }

  private onMove(pointer: Phaser.Input.Pointer) {
    const p = viewPoint(pointer);
    this.pointer = p;
    if (this.touchPan) {
      const mid = this.twoFingers();
      if (mid) {
        this.scrollTo(this.camera.scrollX - (mid.x - this.touchPan.x), this.camera.scrollY - (mid.y - this.touchPan.y));
        this.touchPan = mid;
      }
      return;
    }
    if (this.drag) {
      this.drag.x1 = p.x;
      this.drag.y1 = p.y;
    }
  }

  private onUp(pointer: Phaser.Input.Pointer) {
    const p = viewPoint(pointer);
    const d = this.drag;
    this.drag = null;
    // Lifting either finger ends a two-finger scroll; the other finger's lift is not a tap.
    if (this.touchPan) {
      if (!this.twoFingers()) this.touchPan = null;
      return;
    }
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
    const bc = this.state.beacon;
    this.message = hit && hit.faction !== PLAYER
      ? 'Attacking'
      : Math.hypot(at.x - bc.x, at.y - bc.y) <= BEACON_RADIUS ? 'Moving to the relay beacon' : 'Moving';
  }

  /** A press on a command bar button: arm a building, or queue a unit. */
  private press(b: Button) {
    const { name, cost } = this.buttonInfo(b);
    if (b.kind === 'command') {
      this.message = this.selected.size === 0 ? 'Select ships first, then Fall back'
        : this.state.fallBack([...this.selected]) ? 'Falling back to repair' : 'Nowhere to fall back to';
      return;
    }
    if (b.kind === 'research') {
      const reason = this.state.research(b.key as Track);
      this.message = reason ?? `${name} research started at the hub`;
      return;
    }
    if (b.kind === 'build') {
      if (this.placing === b.key) {
        this.placing = null;
      } else if (this.state.sides[PLAYER].crystal < cost) {
        this.message = 'Not enough crystal';
      } else {
        this.placing = b.key as Build;
        this.message = '';
      }
      return;
    }
    const reason = this.state.train(b.key as UnitId);
    this.message = reason ?? `${name} queued`;
  }
}
