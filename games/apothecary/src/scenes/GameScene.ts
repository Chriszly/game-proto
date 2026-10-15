import Phaser from 'phaser';
import { settings as hubSettings } from '../../../../shared/settings';
import { renderScale, scrollingCamera, viewSize } from '../../../../shared/scaling';
import { drawBelts, laneOffset, pointAlong } from '../art/belts';
import { plantTexture } from '../art/garden';
import { EXPANSION_IMAGE, WALLS_IMAGE, GARDEN_MARGIN, gardenTexture, sceneryLayout } from '../art/ground';
import { itemTexture } from '../art/items';
import { INK, SERIF, TEXT_HALO, fit, resOf } from '../art/paint';
import { craftsmanTexture, customerTexture } from '../art/townsfolk';
import { BUBBLE_TAIL, cardInset, cardTexture, signTexture, type CardKind } from '../art/ui';
import { catchUp, type AwaySummary } from '../game/away';
import { FINE as FINE_OF, GROW_MS, ITEMS, PLANTS, POTIONS, REFINE, REFINED, isPlant, isRefined, isSellable, plainOf, type ItemId } from '../game/items';
import {
  collectTill,
  doneByHand,
  dropAll,
  dropAtRefiner,
  dropInCauldron,
  harvest,
  isRipe,
  payBelt,
  payCraftsman,
  payExpansion,
  joinGuild,
  payUpgrade,
  payShade,
  pickUpFromCauldron,
  pickUpFromRefiner,
  refining,
  stockShelf,
  tick,
  type ExpansionPart,
  cyclePriority,
  type Feedback,
} from '../game/sim';
import { clearSave, loadState, saveState } from '../game/save';
import {
  BELTS,
  BELT_COST,
  BELT_LANES,
  BELT_MS,
  DOCTOR_UPGRADES,
  EXPANSION_COST,
  LINE2_GARDEN,
  MAX_CARRY,
  MAX_CRAFTSMEN,
  GUILD_UPGRADES,
  MAX_ORDER_SLOTS,
  SERVE_MS,
  beltBuildable,
  gardenBuilt,
  gardenOf,
  UPGRADES,
  carryCapacity,
  craftsmanCost,
  harvestReach,
  stationBuilt,
  stockFactor,
  unlocked,
  GUILD_COST,
  upgradeCost,
  type BeltId,
  type Build,
  type CauldronId,
  type CraftingId,
  type GameState,
  type RefinerId,
  type StationId,
  type Upgrade,
  type UpgradeId,
  walkSpeed,
  DAY_MS,
  RUSH_BONUS,
  tipLeft,
  tipNow,
  FINE_SHARE,
  SHADE_COST,
  SHADE_GARDEN,
  WEATHER,
  isMarketDay,
  weatherFor,
} from '../game/state';
import { BackStack } from '../ui/BackStack';
import { IconRow } from '../ui/IconRow';
import { Pallet } from '../ui/Pallet';
import { RecipeBook } from '../ui/RecipeBook';
import { Settings } from '../ui/Settings';
import { ProgressBar } from '../ui/ProgressBar';
import {
  BELT_BUILD,
  BELT_PATHS,
  beltSpan,
  CAULDRON,
  CAULDRON2,
  CAULDRON2_MARKERS,
  CAULDRON_MARKERS,
  COUNTER,
  COUNTER_MARKERS,
  CRAFTSMEN,
  EXPANSION_LAND,
  GARDEN_AREAS,
  GUILD,
  HUD_HEIGHT,
  LABELS,
  PRIORITY_SIGNS,
  OUTFITTER,
  PALLETS,
  REFINER,
  REFINER2,
  REFINER2_MARKERS,
  REFINER_MARKERS,
  SHOP_SIGN,
  SHOP_DOOR,
  SHOP_BLOCKS,
  SHOP_DOORWAY,
  STREET,
  WORLD,
  customerPosition,
  plotPosition,
  type StationMarkers,
  type StationPallets,
} from './layout';

type Point = { x: number; y: number };

/** Walking speed in pixels per second, before the doctor's boots are upgraded. */
const SPEED = 160;
/**
 * Most the doctor walks in one physics step. A long frame walks slower instead, so its one step can't
 * carry the feet through a station.
 */
const MAX_WALK_STEP_PX = 20;
/** Longest simulated step, so a backgrounded tab doesn't jump the world forward. */
const MAX_STEP_MS = 250;
const UI_DEPTH = 10_000;
/** Bars, icons and feedback over the world, kept under the top bar and panels when the camera scrolls them up there. */
const WORLD_UI_DEPTH = UI_DEPTH - 1;
const AUTOSAVE_MS = 3_000;
/** How fast customers walk, in pixels per second. */
const CUSTOMER_SPEED = 120;
/** How often a floor marker moves the next item while the doctor stands on it. */
const MARKER_INTERVAL_MS = 200;
/** Pause between plants when several in reach are ripe, so each pickup can be seen. */
const HARVEST_INTERVAL_MS = 150;
/** Sickle spin speed in radians per millisecond, its size, and how long it keeps spinning after the
 * last ripe plant in reach. It circles on the edge of the harvest radius, tracing the area. */
const SICKLE_SPIN = 0.008;
const SICKLE_SCALE = 1;
const SICKLE_LINGER_MS = 400;
/** Width of a crafting station's priority sign, wide enough for "First:" and its choice. */
const PRIORITY_SIGN_W = 92;
/** How long the doctor stands still on a purple marker before it starts taking coins, so walking over one buys nothing. */
const STILL_MS = 400;
/**
 * Floor marker captions: outlined so they read on dirt, grass and boards alike, and wrapped so a
 * long one doesn't run into its neighbour's.
 */
const CAPTION = {
  fontFamily: SERIF,
  fontSize: '12px',
  fontStyle: 'bold',
  stroke: TEXT_HALO,
  strokeThickness: 3,
  align: 'center',
  wordWrap: { width: 92 },
};
/** Caption colours: ink for the doctor's markers, violet for the ones that take coins. */
const CAPTION_INK = INK;
const CAPTION_PAY = '#5a2c80';
/** The top bar's text: ink on parchment. */
const HUD_TEXT = { fontFamily: SERIF, fontSize: '17px', fontStyle: 'bold', color: INK };
/** Where the contract card and the away chip sit on screen, below the top bar. */
const CONTRACT_CARD = { x: 313, y: 50, w: 300, h: 44 };
/** The town card, right of the contract: the day's weather, the street's reputation and the market day. */
const TOWN_CARD = { x: 626, y: 50, w: 316, h: 44 };
const AWAY_CHIP = { x: 652, y: 102, w: 290, h: 30 };
/** The order bubble over a waiting customer: its height, how far above the customer's middle its middle is, the spacing of its icons, and its tip ring's radius. */
const BUBBLE = { h: 30, above: 58, icon: 15, ring: 6 };

/** Closest and farthest the view zooms: out until the whole yard is tall enough to fit, in to double size. */
const MIN_ZOOM = 0.62;
const MAX_ZOOM = 2;
/** How much one mouse wheel notch or key press zooms. */
const ZOOM_STEP = 1.1;
/** Where the zoom is kept between visits; it's a view preference, so "New game" keeps it. */
const ZOOM_KEY = 'apothecary-zoom';

/** A floor marker that acts by itself, one step at a time, while the doctor stands on it. */
interface Marker {
  zone: Phaser.Geom.Rectangle;
  act: () => Feedback | null;
  /** Whether the marker is there at all; markers a belt replaces go once it is built. */
  shown: () => boolean;
  /** Set once an upgrade level is paid off; the next level waits until the doctor steps off and on again. */
  paused?: boolean;
  /** A purple marker that takes coins: it pays only once the doctor has stood still on it for `STILL_MS`. */
  pays?: boolean;
}

export class GameScene extends Phaser.Scene {
  private state!: GameState;
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<'up' | 'down' | 'left' | 'right', Phaser.Input.Keyboard.Key>;
  private pointerTarget: Phaser.Math.Vector2 | null = null;
  /** A corner to walk to first when a station stands between the doctor and the tapped spot. */
  private waypoint: Phaser.Math.Vector2 | null = null;
  /** Which way the doctor set off towards the tapped spot (or corner) last frame. */
  private heading: Phaser.Math.Vector2 | null = null;
  /** Station footprints grown by the doctor's feet, used to walk around stations after a tap. */
  private blockedAreas: Phaser.Geom.Rectangle[] = [];
  /** The shop as measured for the doctor's feet, and the feet's half size it was measured for. */
  private shopMeasured: ReturnType<GameScene['measureShop']> | null = null;
  private obstacles!: Phaser.Physics.Arcade.StaticGroup;
  private markers: Marker[] = [];
  /** Work spots: the station whose spot holds the doctor's feet is the one that works. */
  private workSpots: { zone: Phaser.Geom.Rectangle; station: StationId }[] = [];
  private nextMarkerAt = 0;
  /** Since when the doctor has stood still, by `this.time.now`, or null while walking. */
  private stillSince: number | null = null;
  /** Plot centres, in plot order, for finding ripe plants within the doctor's reach. */
  private plotCentres: Phaser.Math.Vector2[] = [];
  private nextHarvestAt = 0;
  /** Spins around the doctor while harvesting. */
  private sickle!: Phaser.GameObjects.Image;
  private sickleAngle = 0;
  private lastHarvestingAt = -Infinity;
  private nextFeedbackAt = 0;
  /** Each standing station's pallets, for goods coming in and going out; read by the playthrough test. */
  private pallets: Partial<Record<StationId, { in: Pallet[]; out: Pallet[] }>> = {};
  /** Game time of the frame being drawn, for things that move on their own. */
  private frameMs = 0;
  /** Where each customer in the shop stands, and whether they have reached their spot; read by the playthrough test. */
  customers: { id: number; x: number; y: number; arrived: boolean }[] = [];
  /** The orders whose customers have reached the counter, so they can be served. */
  private atCounter = new Set<number>();
  /** The recipe overview opened from the top bar. */
  private recipes!: RecipeBook;
  /** The settings panel opened from the top bar: the hub's settings and a new game. */
  private settings!: Settings;
  /** Set once a new game is confirmed, so nothing saves the old one before the scene restarts. */
  private startingOver = false;
  /** Per-frame view updates, each reading from `state`. */
  private views: (() => void)[] = [];
  /** Draws the top bar and panels at a fixed size, while the main camera zooms the world. */
  private uiCamera!: Phaser.Cameras.Scene2D.Camera;
  /** The finger spread and zoom when a two-finger pinch began, or null while there is no pinch. */
  private pinch: { spread: number; zoom: number } | null = null;
  /** What the craftsmen and belts earned while the player was away, shown on a chip until tapped. */
  away: AwaySummary | null = null;

  constructor() {
    super('Game');
  }

  create() {
    this.state = loadState();
    // Play through the time away, before anything is drawn from the state.
    this.away = catchUp(this.state, Date.now());
    this.startingOver = false;
    this.plotCentres = [];
    this.markers = [];
    this.workSpots = [];
    this.pallets = {};
    this.views = [];
    this.pointerTarget = null;
    this.waypoint = null;
    this.blockedAreas = [];
    this.atCounter = new Set();
    this.shopMeasured = null;
    this.physics.world.setBounds(0, HUD_HEIGHT, WORLD.w, WORLD.h - HUD_HEIGHT);
    // Restarting the scene for a new game keeps its event listeners, so this one is added once.
    this.events.off(Phaser.Scenes.Events.PRE_UPDATE, this.limitWalkStep, this);
    this.events.on(Phaser.Scenes.Events.PRE_UPDATE, this.limitWalkStep, this);
    this.obstacles = this.physics.add.staticGroup();

    this.drawGrounds();
    this.createPlots();
    this.createStations();
    this.createExpansion();
    this.createOutfitter();
    this.createGuild();
    this.createBelts();
    this.createPlayer();
    this.followPlayer();
    this.createShopfront();
    this.createHud();
    this.createContract();
    this.createTown();
    this.createAwayChip();
    this.createUiCamera();
    this.createControls();
    this.createZoom();
    this.setUpSaving();
  }

  private setUpSaving() {
    const save = () => {
      if (!this.startingOver) saveState(this.state);
    };
    const onHide = () => {
      if (document.visibilityState === 'hidden') save();
    };
    this.time.addEvent({ delay: AUTOSAVE_MS, loop: true, callback: save });
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', save);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', save);
    });
  }

  private startOver() {
    if (!window.confirm('Start a new game? Your saved progress will be lost.')) return;
    this.startingOver = true;
    clearSave();
    this.scene.restart();
  }

  /** The world is bigger than the view, so the camera keeps the doctor in sight within its edges. */
  private followPlayer() {
    scrollingCamera(this.cameras.main).setBounds(0, 0, WORLD.w, WORLD.h).startFollow(this.player, true);
  }

  /**
   * A second camera, never zoomed or scrolled by the player, draws everything from `UI_DEPTH` up (the top bar and
   * its panels), and the main camera draws the rest, so zooming leaves the top bar as it is.
   * `splitCameras` sorts each object, including ones created later, every frame.
   */
  private createUiCamera() {
    this.uiCamera = this.cameras.add(0, 0, this.scale.width, this.scale.height);
    this.splitCameras();
  }

  private splitCameras() {
    const world = this.cameras.main.id;
    const ui = this.uiCamera.id;
    for (const obj of this.children.list) obj.cameraFilter = (obj as unknown as { depth: number }).depth >= UI_DEPTH ? world : ui;
  }

  /** Zoom with the mouse wheel, the + and - keys, or a two-finger pinch. */
  private createZoom() {
    this.setZoom(Number(readZoom()) || 1);
    this.input.on('wheel', (_p: Phaser.Input.Pointer, _over: unknown, _dx: number, dy: number) => {
      if (dy !== 0) this.setZoom(this.zoom * (dy < 0 ? ZOOM_STEP : 1 / ZOOM_STEP));
    });
    this.input.keyboard!.on('keydown', (e: KeyboardEvent) => {
      if (e.key === '+' || e.key === '=') this.setZoom(this.zoom * ZOOM_STEP);
      if (e.key === '-' || e.key === '_') this.setZoom(this.zoom / ZOOM_STEP);
    });
    // A second touch pointer, so two fingers can pinch.
    if (this.input.manager.pointersTotal < 3) this.input.addPointer(1);
    this.input.on('pointermove', () => {
      const [a, b] = [this.input.pointer1, this.input.pointer2];
      if (!a.isDown || !b.isDown) return;
      const spread = Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y);
      if (!this.pinch) this.pinch = { spread, zoom: this.zoom };
      else if (this.pinch.spread > 0) this.setZoom((this.pinch.zoom * spread) / this.pinch.spread);
    });
    this.input.on('pointerup', () => {
      if (!this.input.pointer1.isDown || !this.input.pointer2.isDown) this.pinch = null;
    });
  }

  /** The player's zoom; the main camera's own zoom also includes the screen's `renderScale`. */
  private get zoom() {
    return this.cameras.main.zoom / renderScale;
  }

  private setZoom(zoom: number) {
    const clamped = Phaser.Math.Clamp(zoom, MIN_ZOOM, MAX_ZOOM);
    // Zoomed out past the world's width, the bounds widen evenly on both sides so the yard stays centred.
    const w = Math.max(WORLD.w, viewSize(this).width / clamped);
    this.cameras.main.setZoom(clamped * renderScale).setBounds((WORLD.w - w) / 2, 0, w, WORLD.h);
    writeZoom(clamped);
  }

  /** A painted piece of ground laid flat, its top-left corner at (x, y). */
  private ground(x: number, y: number, texture: string, depth = -1000) {
    return fit(this.add.image(x, y, texture).setOrigin(0).setDepth(depth));
  }

  /** A garden: meadow inside a picket fence, with its name on a sign. */
  private drawGarden(garden: number) {
    const area = GARDEN_AREAS[garden];
    this.ground(area.x - GARDEN_MARGIN, area.y - GARDEN_MARGIN, gardenTexture(garden), -990);
    this.label(area.x + area.w / 2, area.y + 10, area.name);
  }

  /** A place name on a parchment sign. */
  private label(x: number, y: number, text: string) {
    const name = this.add
      .text(x, y, text, { fontFamily: SERIF, fontSize: '13px', fontStyle: 'bold', color: INK })
      .setOrigin(0.5)
      .setDepth(-900);
    this.card(x, y, 'sign', signTexture(this, name.width + 16)).setDepth(-910);
  }

  /** A card image centred on (x, y) by its card, not by its shadow or a bubble's tail. */
  private card(x: number, y: number, kind: CardKind, key: string) {
    const img = fit(this.add.image(x, y, key));
    const inset = cardInset(kind);
    const h = img.height / resOf(key);
    const cardH = h - 2 * inset - (kind === 'bubble' ? BUBBLE_TAIL : 0);
    return img.setOrigin(0.5, (inset + cardH / 2) / h);
  }

  /**
   * A small sign saying what a crafting station makes first: the item's icon, or "any" when it is
   * left to the station. Tapping it moves on to the next choice and doesn't walk the doctor.
   */
  private addPrioritySign(id: CraftingId, at: Point) {
    const sign = this.card(at.x, at.y, 'small', signTexture(this, PRIORITY_SIGN_W, true)).setDepth(-910);
    const left = at.x - PRIORITY_SIGN_W / 2 + 10;
    const style = { fontFamily: SERIF, fontSize: '12px', fontStyle: 'bold', color: INK };
    const caption = this.add.text(left, at.y, 'First:', style).setOrigin(0, 0.5).setDepth(-900);
    const choiceX = left + caption.width + 6;
    const any = this.add.text(choiceX, at.y, 'any', style).setOrigin(0, 0.5).setDepth(-900);
    const icon = fit(this.add.image(choiceX + 8, at.y, itemTexture('wheat')).setDepth(-900));
    sign.setInteractive({ useHandCursor: true }).on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, e: Phaser.Types.Input.EventData) => {
      e.stopPropagation();
      // A second finger landing on a sign starts a pinch, not a priority change.
      if (this.pinching()) return;
      // With a panel open, a tap anywhere closes it, a sign's included, without changing the sign.
      if (this.recipes.visible || this.settings.visible) {
        this.recipes.toggle(false);
        this.settings.toggle(false);
        return;
      }
      cyclePriority(this.state, id);
    });
    this.views.push(() => {
      const first = this.state.priority[id];
      any.setVisible(!first);
      icon.setVisible(!!first);
      if (first) icon.setTexture(itemTexture(first));
    });
  }

  /** Runs `create` once, on the first frame `ready` holds: for things bought during play, or loaded built. */
  private once(ready: () => boolean, create: () => void) {
    let done = false;
    this.views.push(() => {
      if (done || !ready()) return;
      done = true;
      create();
    });
  }

  private drawGrounds() {
    // One painted page: grass, the yard and market of packed earth, the street, and the shop's plank
    // floor inside its stone walls, with a back door in the top wall facing the market and the
    // customers' street door in the bottom one (see src/art/ground.ts).
    this.ground(0, 0, 'ground-world');
    // The right column gets its yard once the expansion's land is bought.
    this.once(
      () => this.state.expansion.land.built,
      () => this.ground(EXPANSION_IMAGE.x, EXPANSION_IMAGE.y, 'ground-expansion', -999),
    );
    // The shop's walls lie above both, so the expansion's yard doesn't cover the right one.
    this.ground(WALLS_IMAGE.x, WALLS_IMAGE.y, 'ground-walls', -998);

    // The second line's fields appear as they are built.
    GARDEN_AREAS.forEach((_, garden) => this.once(() => gardenBuilt(this.state, garden), () => this.drawGarden(garden)));

    // Trees and bushes in the grass, in front of or behind the doctor by their feet.
    for (const { key, x, y } of sceneryLayout()) {
      fit(this.add.image(x, y, key)).setOrigin(0.5, key.startsWith('tree') ? 84 / 88 : 28 / 32).setDepth(y);
    }

    for (const block of SHOP_BLOCKS) this.obstacles.add(this.add.zone(block.x + block.w / 2, block.y + block.h / 2, block.w, block.h));

    this.label(SHOP_SIGN.x, SHOP_SIGN.y, 'Storefront');
  }

  private createPlots() {
    this.state.plots.forEach((plot, i) => {
      const { x, y } = plotPosition(i);
      this.plotCentres[i] = new Phaser.Math.Vector2(x, y);
      this.once(
        () => gardenBuilt(this.state, gardenOf(i)),
        () => {
          fit(this.add.image(x, y, 'plot').setDepth(-500));
          const plant = fit(this.add.image(x, y + 10, plantTexture(plot.plant, 2)).setOrigin(0.5, 1).setDepth(y));
          // Inside the bed's bottom edge, since the next row's bed starts right below it.
          const growth = new ProgressBar(this, x, y + 14, 40, 0x9ccf6a, WORLD_UI_DEPTH);
          this.views.push(() => {
            const grown = plot.grown / GROW_MS[plot.plant];
            plant.setTexture(plantTexture(plot.plant, grown >= 1 ? 2 : grown >= 0.5 ? 1 : 0));
            growth.set(grown >= 1 ? null : grown);
          });
        },
      );
    });
  }

  /** Both lines' refining tables and cauldrons; the second line's stand once built. */
  private createStations() {
    this.addRefiner('refiner', REFINER, REFINER_MARKERS, LABELS.refiner, 'garden', 'refiner');
    this.addCauldron('cauldron', CAULDRON, CAULDRON_MARKERS, LABELS.cauldron, 'refiner', 'cauldron');
    this.once(
      () => stationBuilt(this.state, 'refiner2'),
      () => this.addRefiner('refiner2', REFINER2, REFINER2_MARKERS, LABELS.refiner2, 'garden2', 'refiner2'),
    );
    this.once(
      () => stationBuilt(this.state, 'cauldron2'),
      () => this.addCauldron('cauldron2', CAULDRON2, CAULDRON2_MARKERS, LABELS.cauldron2, 'refiner2', 'cauldron2'),
    );
  }

  /** A refining table, fed by belt `beltIn` and emptied by belt `beltOut` once those are built. */
  private addRefiner(id: RefinerId, at: Point, m: StationMarkers, label: Point, beltIn: BeltId, beltOut: BeltId) {
    const refiner = this.state[id];
    this.label(label.x, label.y, 'Refining table');
    this.addPrioritySign(id, PRIORITY_SIGNS[id]);
    this.addObstacle(at.x, at.y, 'table', 84, 30);
    this.addPallets(id, PALLETS[id], [PLANTS, REFINED], [() => refiner.queue, () => refiner.output]);
    const progress = new ProgressBar(this, at.x, at.y + 30, 60, 0xd8cfa8, WORLD_UI_DEPTH);
    // A second craftsman's pipe shows its own bar just below.
    const progress2 = new ProgressBar(this, at.x, at.y + 38, 60, 0xd8cfa8, WORLD_UI_DEPTH);
    this.addMarker(m.pickUp, 'pad-out', 'Pick up', () => pickUpFromRefiner(this.state, id), () => this.state.belts[beltOut].built);
    this.addMarker(m.drop, 'pad-in', 'Drop', () => dropAtRefiner(this.state, id), () => this.state.belts[beltIn].built && !this.carries(isPlant));
    this.addWorkSpot(m.work, id);
    this.addUpgradeMarker(m.upgrade, id);
    this.addCraftsmen(id);
    this.views.push(() => {
      // The plant being refined is always the front one (see tick).
      progress.set(refining(refiner) >= 0 ? refiner.progress / REFINE[refiner.queue[0]].ms : null);
      progress2.set(refiner.second ? refiner.second.progress / REFINE[refiner.second.plant].ms : null);
    });
  }

  /** A cauldron, fed by belt `beltIn` and emptied by belt `beltOut` once those are built. */
  private addCauldron(id: CauldronId, at: Point, m: StationMarkers, label: Point, beltIn: BeltId, beltOut: BeltId) {
    const cauldron = this.state[id];
    this.label(label.x, label.y, 'Cauldron');
    this.addPrioritySign(id, PRIORITY_SIGNS[id]);
    const pot = this.addObstacle(at.x, at.y, 'cauldron', 60, 28);
    // The boil flickers its flames and bubbles, so reduced motion holds it on the still frame.
    if (!hubSettings.reduceMotion) pot.play('cauldron-boil');
    this.addPallets(id, PALLETS[id], [REFINED, POTIONS], [() => cauldron.contents, () => cauldron.output]);
    // The end of the bar is the fine window: picked up then, the potion comes out fine.
    const brewing = new ProgressBar(this, at.x, at.y + 34, 60, 0x58a35a, WORLD_UI_DEPTH).setZone(1 - FINE_SHARE, 0xe8b830);
    const brewing2 = new ProgressBar(this, at.x, at.y + 42, 60, 0x58a35a, WORLD_UI_DEPTH).setZone(1 - FINE_SHARE, 0xe8b830);
    this.addMarker(m.pickUp, 'pad-out', 'Pick up', () => pickUpFromCauldron(this.state, id), () => this.state.belts[beltOut].built);
    this.addMarker(m.drop, 'pad-in', 'Drop', () => dropInCauldron(this.state, id), () => this.state.belts[beltIn].built && !this.carries(isRefined));
    this.addWorkSpot(m.work, id);
    this.addUpgradeMarker(m.upgrade, id);
    this.addCraftsmen(id);
    this.views.push(() => {
      for (const [bar, brew] of [
        [brewing, cauldron.brewing],
        [brewing2, cauldron.brewing2],
      ] as const)
        bar.set(brew ? brew.progress / brew.ms : null);
    });
  }

  /**
   * A station's pallets: one per kind of goods coming in (`kinds[0]`, kept in `trays[0]`) and going
   * out (`kinds[1]`, kept in `trays[1]`), each stacked as high as that tray holds of its kind.
   */
  private addPallets(
    id: StationId,
    at: StationPallets,
    kinds: [readonly ItemId[], readonly ItemId[]],
    trays: [() => readonly ItemId[], () => readonly ItemId[]],
  ) {
    const pallets = {
      in: at.in.map((p, i) => new Pallet(this, p.x, p.y, kinds[0][i])),
      out: at.out.map((p, i) => new Pallet(this, p.x, p.y, kinds[1][i])),
    };
    this.pallets[id] = pallets;
    const stack = (row: Pallet[], tray: readonly ItemId[]) => {
      for (const pallet of row) pallet.set(tray.filter((item) => item === pallet.item).length);
    };
    this.views.push(() => {
      stack(pallets.in, trays[0]());
      stack(pallets.out, trays[1]());
    });
  }

  /** Lays a floor marker with a caption. A marker a belt replaces goes away once `gone` holds. */
  private addMarker(at: Point, texture: string, caption: string, act: () => Feedback | null, gone?: () => boolean) {
    const pad = fit(this.add.image(at.x, at.y, texture).setDepth(-400));
    const text = this.add
      .text(at.x, at.y + 26, caption, { ...CAPTION, color: CAPTION_INK })
      .setOrigin(0.5, 0)
      .setDepth(-400);
    const shown = () => !gone?.();
    this.markers.push({ zone: new Phaser.Geom.Rectangle(at.x - 22, at.y - 22, 44, 44), act, shown });
    if (gone) {
      this.views.push(() => {
        pad.setVisible(shown());
        text.setVisible(shown());
      });
    }
  }

  /**
   * Whether the doctor carries something of a kind. A drop marker that a belt made unneeded comes
   * back while the doctor carries what it takes, such as goods from the other line.
   */
  private carries(kind: (item: ItemId) => boolean) {
    return this.state.carrying.some(kind);
  }

  /** The spot the doctor stands on to make the station work, gone once a craftsman is hired there. */
  private addWorkSpot(at: { x: number; y: number }, station: StationId) {
    this.addMarker(at, 'pad-work', 'Work', () => null, () => this.state.craftsmen[station].level > 0);
    this.workSpots.push({ zone: new Phaser.Geom.Rectangle(at.x - 22, at.y - 22, 44, 44), station });
  }

  /** An upgrade marker, captioned with the next level and its price, after `name` if given. */
  private addUpgradeMarker(at: Point, id: UpgradeId, name = 'Lv') {
    this.addLevelMarker(
      at,
      () => this.state.upgrades[id],
      UPGRADES[id].max,
      (level) => upgradeCost(id, level),
      () => payUpgrade(this.state, id),
      (level, left) => `${name} ${level + 2}: ${left}c`,
      () => unlocked(this.state, `level-${id}`),
    );
  }

  /**
   * A purple marker for something bought a level at a time, like an upgrade or a craftsman: standing
   * still on it pays towards the next level, captioned by `caption` with the coins still to pay for
   * it. It is shown while `shown` holds and goes away once the last level is bought.
   */
  private addLevelMarker(
    at: Point,
    get: () => Upgrade,
    max: number,
    cost: (level: number) => number,
    pay: () => Feedback | null,
    caption: (level: number, left: number) => string,
    shown: () => boolean = () => true,
  ) {
    this.addMarker(
      at,
      'pad-up',
      '',
      () => {
        const level = get().level;
        const feedback = pay();
        // A finished level doesn't roll straight into paying for the next.
        if (get().level > level) this.markers[marker].paused = true;
        return feedback;
      },
      () => !open(),
    );
    const open = () => shown() && get().level < max;
    const marker = this.markers.length - 1;
    this.markers[marker].pays = true;
    const text = this.add
      .text(at.x, at.y + 26, '', { ...CAPTION, color: CAPTION_PAY })
      .setOrigin(0.5, 0)
      .setDepth(-400);
    this.views.push(() => {
      const { level, paid } = get();
      text.setVisible(open());
      if (level < max) text.setText(caption(level, cost(level) - paid));
    });
  }

  /**
   * A station's craftsmen: a marker to hire them one at a time, and the craftsmen themselves standing
   * by the station once hired.
   */
  private addCraftsmen(id: StationId) {
    const { hire, stand } = CRAFTSMEN[id];
    const hired = () => this.state.craftsmen[id];
    this.addLevelMarker(
      hire,
      hired,
      MAX_CRAFTSMEN,
      craftsmanCost,
      () => payCraftsman(this.state, id),
      (_level, left) => `Hire ${left}c`,
      () => unlocked(this.state, `hire-${id}`),
    );
    stand.forEach((at, i) => {
      const craftsman = fit(this.add.image(at.x, at.y, craftsmanTexture(i)).setOrigin(0.5, 1).setDepth(at.y).setFlipX(i === 1));
      this.views.push(() => craftsman.setVisible(hired().level > i));
    });
  }

  /**
   * A purple build marker captioned with the coins still to pay for the build, shown while `shown`
   * holds; standing still on it pays towards the build.
   */
  private addBuildMarker(at: Point, caption: string, cost: number, build: Build, shown: () => boolean, act: () => Feedback | null) {
    const pad = fit(this.add.image(at.x, at.y, 'pad-up').setDepth(-400));
    const text = this.add
      .text(at.x, at.y + 26, '', { ...CAPTION, color: CAPTION_PAY })
      .setOrigin(0.5, 0)
      .setDepth(-400);
    this.markers.push({ zone: new Phaser.Geom.Rectangle(at.x - 22, at.y - 22, 44, 44), act, shown, pays: true });
    this.views.push(() => {
      const show = shown();
      pad.setVisible(show);
      text.setVisible(show).setText(`${caption}: ${cost - build.paid}c`);
    });
  }

  /**
   * The expansion: a marker to buy the land on the grass right of the shop, then one for each field,
   * the refining table and the cauldron of the second line, where each will go.
   */
  private createExpansion() {
    const { expansion } = this.state;
    this.addBuildMarker(EXPANSION_LAND, 'Land', EXPANSION_COST.land, expansion.land, () => !expansion.land.built && unlocked(this.state, 'land'), () =>
      payExpansion(this.state, 'land'),
    );
    const parts: { part: ExpansionPart; at: Point; caption: string; cost: number; build: Build }[] = [
      ...expansion.fields.map((build, i) => {
        const area = GARDEN_AREAS[LINE2_GARDEN + i];
        return {
          part: (i === 0 ? 'field1' : 'field2') as ExpansionPart,
          at: { x: area.x + area.w / 2, y: area.y + area.h / 2 },
          caption: area.name,
          cost: EXPANSION_COST.field,
          build,
        };
      }),
      // The stations are bought from where their work spots will be, clear of where they will stand.
      { part: 'refiner', at: REFINER2_MARKERS.work, caption: 'Table', cost: EXPANSION_COST.refiner, build: expansion.refiner },
      { part: 'cauldron', at: CAULDRON2_MARKERS.work, caption: 'Cauldron', cost: EXPANSION_COST.cauldron, build: expansion.cauldron },
    ];
    for (const { part, at, caption, cost, build } of parts) {
      this.addBuildMarker(at, caption, cost, build, () => expansion.land.built && !build.built, () => payExpansion(this.state, part));
    }
    // The shade gardens, bought in the middle of where each will grow: the first line's once the
    // garden belt is built, the second line's once the expansion's land is bought.
    const { shade } = this.state;
    ([0, 1] as const).forEach((line) => {
      const area = GARDEN_AREAS[SHADE_GARDEN + line];
      const shown = () => !shade[line].built && (line === 0 ? unlocked(this.state, 'shade') : expansion.land.built);
      this.addBuildMarker({ x: area.x + area.w / 2, y: area.y + area.h / 2 + 10 }, 'Shade garden', SHADE_COST[line], shade[line], shown, () =>
        payShade(this.state, line),
      );
    });
  }

  /**
   * Conveyor belts: a build marker for each once the stations at its ends stand, until it is paid
   * off; then the belt itself with the goods riding along it. All built belts are drawn as one
   * network, so where the two lines' cauldron belts meet becomes a T.
   */
  private createBelts() {
    let network: Phaser.GameObjects.Image | null = null;
    let drawn = '';
    this.views.push(() => {
      const built = BELTS.filter((id) => this.state.belts[id].built);
      if (built.join() === drawn) return;
      drawn = built.join();
      network?.destroy();
      const lanes = Math.max(...built.map((id) => BELT_LANES[id].length));
      network = built.length > 0 ? drawBelts(this, built.flatMap((id) => BELT_PATHS[id]), -600, lanes) : null;
    });

    for (const id of BELTS) {
      const belt = this.state.belts[id];
      this.addBuildMarker(BELT_BUILD[id], 'Belt', BELT_COST[id], belt, () => !belt.built && beltBuildable(this.state, id) && unlocked(this.state, `belt-${id}`), () =>
        payBelt(this.state, id),
      );
      const riding: Phaser.GameObjects.Image[] = [];
      const [main, ...feeders] = BELT_PATHS[id];
      // For each kind of goods: the run it gets on at, where on the main run that starts and joins,
      // and how far across the belt its lane is.
      const lanes = BELT_LANES[id];
      const spans = new Map(lanes.map((kind, lane) => [kind, { ...beltSpan(id, kind), off: laneOffset(lane, lanes.length) }]));
      this.views.push(() => {
        while (riding.length < belt.items.length) {
          riding.push(fit(this.add.image(0, 0, itemTexture(belt.items[0].id)).setDepth(-550)));
        }
        riding.forEach((icon, i) => {
          const item = belt.items[i];
          if (!item) {
            icon.setVisible(false);
            return;
          }
          // Goods loaded from the doctor's hands wait out of sight until their turn to get on.
          // A kind the belt has no lane for (from an edited save) rides down the middle of the main run.
          const { run, start, join, off } = spans.get(item.id) ?? { run: 0, start: 0, join: 0, off: 0 };
          icon.setVisible(item.at >= start);
          // Along the main run, across the belt into the item's own lane. On a feeder, the item moves
          // over into that lane as it goes, so it carries straight on where the feeder joins.
          let { x, y, dx, dy } = pointAlong(main, Math.max(item.at, join) / BELT_MS[id]);
          let across = off;
          if (run > 0 && item.at < join) {
            const along = (item.at - start) / (join - start);
            ({ x, y } = pointAlong(feeders[run - 1], along));
            across = off * Math.max(0, along);
          }
          icon.setTexture(itemTexture(item.id)).setPosition(x - dy * across, y + dx * across);
        });
      });
    }
  }

  /** The outfitter's stall right of the shop: upgrades for the doctor's pack, boots and sickle. */
  private createOutfitter() {
    this.label(OUTFITTER.sign.x, OUTFITTER.sign.y, 'Outfitter');
    for (const id of DOCTOR_UPGRADES) this.addUpgradeMarker(OUTFITTER[id], id, UPGRADES[id].name);
  }

  /** The guild in the corner of the yard: upgrades for the gardens, the belts and the shop. */
  private createGuild() {
    this.label(GUILD.sign.x, GUILD.sign.y, 'Guild');
    // Its upgrades go up for sale once the doctor has paid to join.
    const { guild } = this.state;
    this.addBuildMarker(GUILD.join, 'Join guild', GUILD_COST, guild, () => !guild.built && unlocked(this.state, 'guild'), () => joinGuild(this.state));
    for (const id of GUILD_UPGRADES) this.addUpgradeMarker(GUILD[id], id, UPGRADES[id].name);
  }

  private createShopfront() {
    this.addObstacle(COUNTER.x, COUNTER.y, 'counter', 200, 30);
    // Fine potions stand on their plain potion's pallet.
    this.addPallets('counter', PALLETS.counter, [POTIONS, []], [() => this.state.counter.shelf.map(plainOf), () => []]);
    // Beside each potion pallet, how many fine ones stand on it, and how much less the next one sells
    // for while the shop is well stocked: on the outer side of the outer pallets and above the middle
    // one, clear of the order bubbles below the counter.
    POTIONS.forEach((potion, i) => {
      const at = PALLETS.counter.in[i];
      if (!at) return;
      const side = Math.sign(at.x - COUNTER.x);
      const label = this.add
        .text(at.x + side * 20, side === 0 ? at.y - 74 : at.y - 10, '', { fontFamily: SERIF, fontSize: '11px', fontStyle: 'bold', color: '#8a3a10', stroke: TEXT_HALO, strokeThickness: 3, align: 'center' })
        .setOrigin(side < 0 ? 1 : side > 0 ? 0 : 0.5, side === 0 ? 1 : 0.5)
        .setDepth(WORLD_UI_DEPTH);
      this.views.push(() => {
        const { shelf } = this.state.counter;
        const fines = shelf.filter((p) => p === FINE_OF[potion]).length;
        const others = shelf.filter((p) => plainOf(p) === potion).length - 1;
        const off = Math.round(100 * (1 - stockFactor(Math.max(0, others))));
        label.setText([fines > 0 ? `${fines} fine` : '', off > 0 ? `-${off}%` : ''].filter(Boolean).join('\n'));
      });
    });
    // Potions are stocked by hand until every cauldron standing has its belt to the counter, and
    // whenever the doctor carries one.
    const allBelted = () => !doneByHand(this.state, 'cauldron') && !doneByHand(this.state, 'cauldron2');
    this.addMarker(COUNTER_MARKERS.drop, 'pad-in', 'Drop', () => stockShelf(this.state), () => allBelted() && !this.carries(isSellable));
    this.addMarker(COUNTER_MARKERS.pickUp, 'pad-out', 'Coins', () => collectTill(this.state));
    this.addWorkSpot(COUNTER_MARKERS.work, 'counter');
    this.addUpgradeMarker(COUNTER_MARKERS.upgrade, 'counter');
    this.addCraftsmen('counter');
    const tillCoin = fit(this.add.image(COUNTER_MARKERS.pickUp.x - 8, COUNTER_MARKERS.pickUp.y, 'coin').setDepth(-300), 1.2);
    const till = this.add
      .text(COUNTER_MARKERS.pickUp.x - 1, COUNTER_MARKERS.pickUp.y, '', {
        fontFamily: SERIF,
        fontSize: '13px',
        fontStyle: 'bold',
        color: INK,
        stroke: TEXT_HALO,
        strokeThickness: 3,
      })
      .setOrigin(0, 0.5)
      .setDepth(-300);
    this.views.push(() => {
      const { counter } = this.state;
      tillCoin.setVisible(counter.till > 0);
      till.setText(counter.till > 0 ? `${counter.till}` : '');
    });

    // How far the counter's craftsmen are with handing over the next potion.
    const serving = new ProgressBar(this, COUNTER.x, COUNTER.y + 36, 44, 0x9ccf6a, WORLD_UI_DEPTH);
    this.views.push(() => {
      const done = this.state.counter.serving ?? 0;
      serving.set(this.state.craftsmen.counter.level > 0 && done > 0 ? done / SERVE_MS : null);
    });

    // One customer slot per possible order; slot i shows the i-th open order once its customer has
    // walked up to it.
    const customers = new Map<number, Phaser.GameObjects.Image>();
    for (let i = 0; i < MAX_ORDER_SLOTS; i++) this.addOrderBubble(i, customers);
    // Customers walk in by the street door to their spot at the counter, move along as those ahead
    // leave, and walk back out once served or out of patience.
    this.views.push(() => {
      const step = (CUSTOMER_SPEED * this.frameMs) / 1000;
      const waiting = new Set(this.state.orders.map((o) => o.id));
      this.state.orders.forEach((order, i) => {
        if (!customers.has(order.id)) {
          // A regular comes back looking as they did.
          const sprite = fit(this.add.image(STREET.x, STREET.y, customerTexture(order.face ?? order.id)));
          customers.set(order.id, sprite);
        }
        const sprite = customers.get(order.id)!;
        sprite.setData('arrived', walkTowards(sprite, customerPosition(i), step));
        // Served from here on, even while moving up to a spot freed by someone ahead.
        if (sprite.getData('arrived')) this.atCounter.add(order.id);
      });
      for (const [id, sprite] of customers) {
        if (waiting.has(id)) continue;
        this.atCounter.delete(id);
        sprite.setData('arrived', false);
        if (walkTowards(sprite, STREET, step, true)) {
          sprite.destroy();
          customers.delete(id);
        }
      }
      this.customers = [...customers].map(([id, s]) => ({ id, x: s.x, y: s.y, arrived: !!s.getData('arrived') }));
    });
  }

  /**
   * The order bubble over waiting customer `i`, once they stand at the counter: the potions they
   * want, a coin in a ring that shrinks as their tip decays, the tip it would pay now above it, and
   * their patience along the bottom.
   */
  private addOrderBubble(i: number, customers: Map<number, Phaser.GameObjects.Image>) {
    const { x, y } = customerPosition(i);
    const cy = y - BUBBLE.above;
    const top = cy - BUBBLE.h / 2;
    // Later customers' bubbles sit over earlier ones' where two wide ones meet.
    const depth = WORLD_UI_DEPTH - 1 + i * 0.1;
    const bubbles = [1, 2, 3].map((n) => this.card(x, cy, 'bubble', cardTexture(this, 'bubble', bubbleWidth(n), BUBBLE.h)).setDepth(depth).setVisible(false));
    const wants = new IconRow(this, x, cy - 4, depth + 0.02, BUBBLE.icon);
    const patience = new ProgressBar(this, x, cy + 5, 10, 0xd9a032, depth + 0.02);
    const ring = this.add.graphics().setDepth(depth + 0.03);
    const coin = fit(this.add.image(x, top + 1, 'coin'), 0.8).setDepth(depth + 0.04).setVisible(false);
    // A gold star on a regular's bubble, on its top left corner.
    const regular = fit(this.add.image(x, top + 1, 'regular')).setDepth(depth + 0.04).setVisible(false);
    const tipText = this.add
      .text(x, top - 7, '', { fontFamily: SERIF, fontSize: '11px', fontStyle: 'bold', color: '#7a4a00', stroke: TEXT_HALO, strokeThickness: 3 })
      .setOrigin(0.5, 1)
      .setDepth(depth + 0.04);
    let drawn = '';
    this.views.push(() => {
      const order = this.state.orders[i];
      const there = !!order && !!customers.get(order.id)?.getData('arrived');
      const n = there ? Math.min(order.wants.length, 3) : 0;
      bubbles.forEach((b, k) => b.setVisible(k === n - 1));
      wants.set(there ? order.wants.slice(0, 3) : []);
      // The tip ring sits on the bubble's top right corner, like a badge.
      const ringX = x + bubbleWidth(Math.max(1, n)) / 2 - 2;
      coin.setVisible(there).setX(ringX);
      regular.setVisible(there && !!order.regular).setX(x - bubbleWidth(Math.max(1, n)) / 2 + 2);
      tipText.setVisible(there);
      if (!there) {
        patience.set(null);
        ring.clear();
        drawn = '';
        return;
      }
      patience.resize(bubbleWidth(n) - 10);
      patience.set(order.patience / order.maxPatience);
      const left01 = tipLeft(order);
      const tip = tipNow(order);
      tipText.setText(tip > 0 ? `tip +${tip}` : 'no tip').setColor(left01 < 0.4 ? '#b04a10' : '#7a4a00');
      // Redraw the ring only when it has visibly shrunk.
      const key = `${n}:${Math.round(left01 * 48)}`;
      if (key === drawn) return;
      drawn = key;
      ring.clear();
      ring.fillStyle(0xfffaf0, 1).fillCircle(ringX, top + 1, BUBBLE.ring + 2);
      ring.lineStyle(1, 0x2a1d14, 0.9).strokeCircle(ringX, top + 1, BUBBLE.ring + 2.5);
      ring.lineStyle(2.4, 0x2a1d14, 0.15).strokeCircle(ringX, top + 1, BUBBLE.ring);
      if (left01 > 0) {
        ring.lineStyle(2.4, left01 < 0.4 ? 0xe98a2e : 0xe8b830, 1);
        ring.beginPath();
        ring.arc(ringX, top + 1, BUBBLE.ring, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * left01, false);
        ring.strokePath();
      }
    });
  }

  /**
   * Today's contract on a parchment card under the top bar: the potion and how many by dusk, a pip
   * for each (filled once sold), the reward, and a sun that sinks towards the horizon as the day
   * passes. A kept or missed contract says so under the card as the next one comes in.
   */
  private createContract() {
    const { x, y, w, h } = CONTRACT_CARD;
    const d = UI_DEPTH;
    const first = this.children.list.length;
    this.card(x + w / 2, y + h / 2, 'contract', cardTexture(this, 'contract', w, h)).setDepth(d);
    const icon = fit(this.add.image(x + 22, y + h / 2 + 1, itemTexture('sleepingTonic')), 1.8).setDepth(d + 0.1);
    const title = this.add.text(x + 42, y + 13, '', { ...HUD_TEXT, fontSize: '13px' }).setOrigin(0, 0.5).setDepth(d + 0.1);
    const pips = this.add.graphics().setDepth(d + 0.1);
    const count = this.add.text(0, y + 31, '', { ...HUD_TEXT, fontSize: '12px' }).setOrigin(0, 0.5).setDepth(d + 0.1);
    const reward = this.add.text(x + w - 10, y + 31, '', { ...HUD_TEXT, fontSize: '12px' }).setOrigin(1, 0.5).setDepth(d + 0.1);
    const rewardCoin = fit(this.add.image(0, y + 31, 'coin'), 1.1).setDepth(d + 0.1);
    const dial = this.add.graphics().setDepth(d + 0.1);
    const note = this.add
      .text(x + w / 2, y + h + 12, '', { ...HUD_TEXT, fontSize: '13px', stroke: TEXT_HALO, strokeThickness: 4 })
      .setOrigin(0.5)
      .setDepth(d + 0.1)
      .setAlpha(0);
    for (const obj of this.children.list.slice(first)) (obj as unknown as Phaser.GameObjects.Components.ScrollFactor).setScrollFactor(0);
    let drawn = '';
    let day = this.state.contract.day;
    let kept = this.state.contract.kept;
    this.views.push(() => {
      const c = this.state.contract;
      if (c.day !== day) {
        // A new day's contract: say how the last one went.
        const paid = c.kept > kept;
        note.setText(paid ? 'Contract kept!' : 'Dusk: contract missed').setColor(paid ? '#2f6a1a' : '#8a3a10').setAlpha(1);
        this.tweens.killTweensOf(note);
        this.tweens.add({ targets: note, alpha: 0, delay: 2_500, duration: 800 });
        day = c.day;
        kept = c.kept;
      }
      const name = ITEMS[c.potion].name;
      const key = `${c.day}:${c.made}:${Math.floor((1 - c.dayLeft / DAY_MS) * 60)}`;
      if (key === drawn) return;
      drawn = key;
      icon.setTexture(itemTexture(c.potion));
      title.setText(`Contract: ${c.need} ${name}${c.need === 1 ? '' : 's'} by dusk`);
      // The title stops short of the dusk dial, in a smaller hand when a long one would run into it.
      title.setFontSize(13);
      for (let size = 12; title.width > w - 42 - 40 && size >= 10; size--) title.setFontSize(size);
      const gap = c.need > 8 ? 11 : 15;
      const r = c.need > 8 ? 4.5 : 5.5;
      pips.clear();
      for (let k = 0; k < c.need; k++) {
        const px = x + 48 + k * gap;
        if (k < c.made) pips.fillStyle(c.potion === 'sleepingTonic' ? 0x6a5bd6 : 0xd9434b, 0.9).fillCircle(px, y + 31, r);
        pips.lineStyle(1.1, 0x2a1d14, k < c.made ? 0.95 : 0.5).strokeCircle(px, y + 31, r);
      }
      count.setText(`${c.made}/${c.need}`).setX(x + 48 + c.need * gap - gap / 2 + 4);
      reward.setText(`Reward ${c.reward}`);
      rewardCoin.setX(x + w - 10 - reward.width - 9);
      // The dusk dial: a sun sinking to the horizon over the day, gone at dusk.
      const dx = x + w - 22, hy = y + 15, sr = 7;
      const sunY = hy - sr - 1 + (2 * sr + 1) * (1 - c.dayLeft / DAY_MS);
      dial.clear();
      const s01 = Phaser.Math.Clamp((hy - sunY) / sr, -1, 1);
      if (s01 > -1) {
        const a = Math.asin(s01);
        dial.fillStyle(0xf0a040, 1).lineStyle(1, 0x2a1d14, 0.9);
        dial.beginPath();
        dial.arc(dx, sunY, sr, Math.PI - a, 2 * Math.PI + a, false);
        dial.closePath();
        dial.fillPath();
        dial.strokePath();
      }
      dial.lineStyle(1.4, 0x2a1d14, 0.9).lineBetween(dx - 11, hy, dx + 11, hy);
    });
  }

  /**
   * The town card under the top bar, right of the contract: today's weather from the almanac and what
   * it does, the street's reputation as a bar, and tomorrow's weather, or on a market day how its
   * crowd is going. When a market day's rush pays its bonus or loses it, a note under the card says so.
   */
  private createTown() {
    const { x, y, w, h } = TOWN_CARD;
    const d = UI_DEPTH;
    const first = this.children.list.length;
    this.card(x + w / 2, y + h / 2, 'town', cardTexture(this, 'town', w, h)).setDepth(d);
    const icon = fit(this.add.image(x + 19, y + h / 2, 'weather-mild')).setDepth(d + 0.1);
    const title = this.add.text(x + 36, y + 13, '', { ...HUD_TEXT, fontSize: '13px' }).setOrigin(0, 0.5).setDepth(d + 0.1);
    const label = this.add.text(x + 36, y + 31, 'Reputation', { ...HUD_TEXT, fontSize: '12px', fontStyle: 'normal' }).setOrigin(0, 0.5).setDepth(d + 0.1);
    const barW = 70;
    const reputation = new ProgressBar(this, label.x + label.width + 6 + barW / 2, y + 28, barW, 0x58a35a, d + 0.1);
    const side = this.add.text(x + w - 10, y + 31, '', { ...HUD_TEXT, fontSize: '12px' }).setOrigin(1, 0.5).setDepth(d + 0.1);
    const note = this.add
      .text(x + w / 2, y + h + 12, '', { ...HUD_TEXT, fontSize: '13px', stroke: TEXT_HALO, strokeThickness: 4 })
      .setOrigin(0.5)
      .setDepth(d + 0.1)
      .setAlpha(0);
    for (const obj of this.children.list.slice(first)) (obj as unknown as Phaser.GameObjects.Components.ScrollFactor).setScrollFactor(0);
    const say = (text: string, good: boolean) => {
      note.setText(text).setColor(good ? '#2f6a1a' : '#8a3a10').setAlpha(1);
      this.tweens.killTweensOf(note);
      this.tweens.add({ targets: note, alpha: 0, delay: 2_500, duration: 800 });
    };
    // What the rush was when last drawn, so a change to it can be told.
    let rushSeen = JSON.stringify(this.state.rush);
    let drawn = '';
    this.views.push(() => {
      const { contract, rush } = this.state;
      const day = contract.day;
      const rushNow = JSON.stringify(rush);
      if (rushNow !== rushSeen && rush) {
        const before = rushSeen === 'null' ? null : (JSON.parse(rushSeen) as typeof rush);
        const sameRush = before?.day === rush.day;
        if (rush.paid && !(sameRush && before.paid)) say(`Market crowd served: +${RUSH_BONUS * rush.size} coins!`, true);
        else if (rush.lost && rush.size > 0 && !(sameRush && before.lost)) say('A customer walked off: no market bonus', false);
        else if (!sameRush) say(rush.size > 0 ? 'Market day: a crowd comes in!' : 'Market day: no room for the crowd', rush.size > 0);
      }
      rushSeen = rushNow;
      const weather = WEATHER[weatherFor(day)];
      let status: string;
      if (!isMarketDay(day)) status = `Tomorrow: ${WEATHER[weatherFor(day + 1)].name}`;
      else if (rush?.day !== day) status = 'Crowd at midday';
      else if (rush.paid) status = 'Crowd served!';
      else if (rush.lost) status = 'Crowd: bonus lost';
      else status = `Crowd: ${rush.served}/${rush.size} served`;
      reputation.set(this.state.reputation / 100);
      const key = `${day}:${status}`;
      if (key === drawn) return;
      drawn = key;
      icon.setTexture(`weather-${weatherFor(day)}`);
      title.setText(`${isMarketDay(day) ? 'Market day' : `Day ${day}`}, ${weather.name.toLowerCase()}: ${weather.effect}`);
      side.setText(status);
    });
  }

  /**
   * "While you were away: +32 coins, 9 potions" on a violet chip under the top bar, after the
   * automation caught up on the time away; tapping it puts it away.
   */
  private createAwayChip() {
    const away = this.away;
    if (!away) return;
    // The chip keeps its right edge and grows to the left when the numbers are long.
    const { y, h } = AWAY_CHIP;
    const d = UI_DEPTH;
    const potions = `${away.potions} potion${away.potions === 1 ? '' : 's'}`;
    const lead = this.add.text(0, y + h / 2, 'While you were away:', { ...HUD_TEXT, fontSize: '13px', fontStyle: 'normal' }).setOrigin(0, 0.5).setDepth(d + 0.1);
    const sum = this.add.text(0, y + h / 2, `+${away.coins} coins, ${potions}`, { ...HUD_TEXT, fontSize: '13px', color: '#6a2c90' }).setOrigin(0, 0.5).setDepth(d + 0.1);
    const w = Math.max(AWAY_CHIP.w, Math.ceil(lead.width + sum.width + 46));
    const x = AWAY_CHIP.x + AWAY_CHIP.w - w;
    lead.setX(x + 28);
    sum.setX(lead.x + lead.width + 6);
    const chip = this.card(x + w / 2, y + h / 2, 'chip', cardTexture(this, 'chip', w, h)).setDepth(d);
    const parts: (Phaser.GameObjects.Components.Visible & Phaser.GameObjects.GameObject)[] = [chip, lead, sum];
    parts.push(fit(this.add.image(x + 15, y + h / 2, 'hourglass')).setDepth(d + 0.1));
    for (const part of parts) (part as unknown as Phaser.GameObjects.Components.ScrollFactor).setScrollFactor(0);
    chip.setInteractive({ useHandCursor: true }).on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, e: Phaser.Types.Input.EventData) => {
      e.stopPropagation();
      if (this.pinching()) return;
      for (const part of parts) part.destroy();
      this.away = null;
    });
  }

  private createHud() {
    const { width } = viewSize(this);
    const first = this.children.list.length;
    // Taps on the bar stop here rather than falling through to a priority sign in the world below.
    fit(this.add.image(0, 0, cardTexture(this, 'bar', width, HUD_HEIGHT)))
      .setOrigin(0)
      .setDepth(UI_DEPTH)
      .setInteractive()
      .on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, e: Phaser.Types.Input.EventData) => {
        e.stopPropagation();
        this.pinching();
      });
    const style = HUD_TEXT;
    fit(this.add.image(26, HUD_HEIGHT / 2 - 1, 'coin'), 1.6).setDepth(UI_DEPTH);
    const coins = this.add.text(42, HUD_HEIGHT / 2 - 1, '', style).setOrigin(0, 0.5).setDepth(UI_DEPTH);
    this.add.text(width / 2 - 92, HUD_HEIGHT / 2, 'Hands', style).setOrigin(1, 0.5).setDepth(UI_DEPTH);
    this.add
      // Right of the last slot the biggest pack fills, so a full pack never runs into it.
      .text(width / 2 - 60 + MAX_CARRY * 40 - 12, HUD_HEIGHT / 2, 'Walk: WASD / tap\nHarvest: walk past ripe plants', { ...style, fontSize: '12px', fontStyle: 'normal', color: '#4a3424' })
      .setOrigin(0, 0.5)
      .setDepth(UI_DEPTH);
    this.hudButton(width - 16, 'Settings', () => {
      this.recipes.toggle(false);
      this.settings.toggle();
    });
    // Empties the doctor's hands, for goods that are no longer needed.
    const drop = this.hudButton(width / 2 - 150, 'Drop all', () => {
      const feedback = dropAll(this.state);
      if (feedback) this.showFeedback(feedback);
    });
    // What each station makes from what, in a panel over the map.
    this.hudButton(width / 2 - 230, 'Recipes', () => {
      this.settings.toggle(false);
      this.recipes.toggle();
    });

    // A slot for everything the biggest pack holds; those beyond the current pack stay hidden.
    const frames: Phaser.GameObjects.Image[] = [];
    const slots = Array.from({ length: MAX_CARRY }, (_, i) => {
      const x = width / 2 - 60 + i * 40;
      frames.push(fit(this.add.image(x, HUD_HEIGHT / 2 - 1, 'slot').setDepth(UI_DEPTH)));
      return fit(this.add.image(x, HUD_HEIGHT / 2 - 1, itemTexture('wheat')), 1.5).setDepth(UI_DEPTH);
    });
    // Everything in the top bar stays put while the camera follows the doctor.
    for (const obj of this.children.list.slice(first)) (obj as unknown as Phaser.GameObjects.Components.ScrollFactor).setScrollFactor(0);
    const pack = new BackStack(this);
    this.recipes = new RecipeBook(this, UI_DEPTH + 1);
    this.settings = new Settings(this, UI_DEPTH + 1, () => this.startOver());

    this.views.push(() => {
      coins.setText(`Coins: ${this.state.coins}`);
      for (const part of drop) part.setAlpha(this.state.carrying.length > 0 ? 1 : 0.5);
      frames.forEach((frame, i) => frame.setVisible(i < carryCapacity(this.state)));
      slots.forEach((slot, i) => {
        const item = this.state.carrying[i];
        slot.setVisible(!!item);
        if (item) slot.setTexture(itemTexture(item));
      });
      pack.update(this.player, this.state.carrying);
      this.recipes.update(this.state);
    });
  }

  /**
   * A parchment button in the top bar, right-aligned at `x`; tapping it doesn't walk the doctor.
   * Returns its card and its label, to dim together.
   */
  private hudButton(x: number, label: string, onTap: () => void) {
    const text = this.add
      .text(0, HUD_HEIGHT / 2, label, { ...HUD_TEXT, fontSize: '14px' })
      .setOrigin(0.5)
      .setDepth(UI_DEPTH + 0.5);
    const w = Math.round(text.width + 22);
    text.setX(x - w / 2);
    const button = this.card(x - w / 2, HUD_HEIGHT / 2, 'button', cardTexture(this, 'button', w, 28))
      .setDepth(UI_DEPTH)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, e: Phaser.Types.Input.EventData) => {
        e.stopPropagation();
        // A second finger landing on a button starts a pinch, not a tap.
        if (this.pinching()) return;
        onTap();
      });
    return [button, text] as const;
  }

  /** True while two fingers are down, which starts a pinch; it also cancels the walk. */
  private pinching() {
    if (!this.input.pointer1.isDown || !this.input.pointer2.isDown) return false;
    this.pointerTarget = null;
    this.waypoint = null;
    return true;
  }

  /** A station image whose lower part blocks walking, so the doctor can pass behind its top edge. */
  private addObstacle(x: number, y: number, texture: string, bodyW: number, bodyH: number) {
    const img = fit(this.add.sprite(x, y, texture).setDepth(y));
    const block = this.add.zone(x, y + img.displayHeight / 2 - bodyH / 2, bodyW, bodyH);
    this.obstacles.add(block);
    this.blockedAreas.push(new Phaser.Geom.Rectangle(x - bodyW / 2 - 18, block.y - bodyH / 2 - 10, bodyW + 36, bodyH + 20));
    return img;
  }

  private createPlayer() {
    const { x, y } = this.state.player;
    this.player = fit(this.physics.add.sprite(x, y, 'doctor-idle'));
    // Collide with the feet only, so the hat and beak can overlap things behind the doctor: a 30x15
    // box at (9, 57) of the 48x72 doctor as shown, given in the painting's own pixels.
    const res = resOf('doctor-idle');
    this.player.body!.setSize(30 * res, 15 * res).setOffset(9 * res, 57 * res);
    this.player.setCollideWorldBounds(true);
    this.physics.add.collider(this.player, this.obstacles);
    this.sickle = fit(this.add.image(x, y, 'sickle'), SICKLE_SCALE).setVisible(false);
  }

  private createControls() {
    const keyboard = this.input.keyboard!;
    this.cursors = keyboard.createCursorKeys();
    this.wasd = {
      up: keyboard.addKey('W'),
      down: keyboard.addKey('S'),
      left: keyboard.addKey('A'),
      right: keyboard.addKey('D'),
    };

    // Touch / click to walk, so the same controls work on phones.
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      // A second finger starts a pinch: stop walking instead of heading for it.
      if (this.pinching()) return;
      if (p.y < HUD_HEIGHT) return;
      // While a panel is open, a tap anywhere below the top bar closes it instead of walking.
      if (this.recipes.visible || this.settings.visible) {
        this.recipes.toggle(false);
        this.settings.toggle(false);
        return;
      }
      // Where the tap is in the world, through the zoomed main camera rather than the top bar's.
      const at = this.cameras.main.getWorldPoint(p.x, p.y);
      this.pointerTarget = this.reachable(new Phaser.Math.Vector2(at.x, at.y));
      this.heading = null;
      this.waypoint = this.routeAround(this.pointerTarget);
    });
  }

  /**
   * Harvests ripe plants within the sickle's reach of the doctor's centre, one at a time
   * so each pickup can be seen. Returns whether a ripe plant is in reach with room to carry it.
   */
  private harvestReach() {
    return this.player.displayHeight * harvestReach(this.state);
  }

  private autoHarvest() {
    const reach = this.harvestReach();
    const centre = new Phaser.Math.Vector2(this.player.x, this.player.y);
    const inReach = this.plotCentres
      .map((at, i) => ({ i, d: at.distance(centre) }))
      .filter(({ i, d }) => d <= reach && isRipe(this.state, i))
      .sort((a, b) => a.d - b.d);
    if (inReach.length === 0 || this.state.carrying.length >= carryCapacity(this.state)) return false;
    if (this.time.now >= this.nextHarvestAt) {
      this.nextHarvestAt = this.time.now + HARVEST_INTERVAL_MS;
      this.showFeedback(harvest(this.state, inReach[0].i));
    }
    return true;
  }

  /** Swings the sickle around the edge of the harvest radius while harvesting, and a moment after. */
  private spinSickle(harvesting: boolean, delta: number) {
    if (harvesting) this.lastHarvestingAt = this.time.now;
    const show = this.time.now - this.lastHarvestingAt < SICKLE_LINGER_MS;
    this.sickle.setVisible(show);
    if (!show) return;
    this.sickleAngle = (this.sickleAngle + delta * SICKLE_SPIN) % (Math.PI * 2);
    const orbit = this.harvestReach();
    this.sickle
      .setPosition(
        this.player.x + Math.cos(this.sickleAngle) * orbit,
        this.player.y + Math.sin(this.sickleAngle) * orbit,
      )
      .setRotation(this.sickleAngle + Math.PI / 2);
    // Sorted by its own position like the plants it passes, in front of what stands above it.
    this.sickle.setDepth(this.sickle.y + this.sickle.displayHeight / 2);
  }

  private showFeedback(lines: Feedback) {
    // Stagger lines so several pickups read one after another.
    const start = Math.max(this.time.now, this.nextFeedbackAt);
    lines.forEach((line, i) => {
      this.time.delayedCall(start - this.time.now + i * 180, () => {
        const text = this.add
          .text(this.player.x, this.player.y - 60, line, {
            fontFamily: SERIF,
            fontSize: '14px',
            fontStyle: 'bold',
            color: INK,
            stroke: TEXT_HALO,
            strokeThickness: 4,
          })
          .setOrigin(0.5)
          .setDepth(WORLD_UI_DEPTH);
        this.tweens.add({ targets: text, y: text.y - 36, alpha: 0, duration: 1100, onComplete: () => text.destroy() });
      });
    });
    this.nextFeedbackAt = start + lines.length * 180;
  }

  update(_time: number, delta: number) {
    this.frameMs = Math.min(delta, MAX_STEP_MS);
    const feetY = this.feetY();
    const workingAt = this.workSpots.find((w) => w.zone.contains(this.feetX(), feetY))?.station ?? null;
    tick(this.state, this.frameMs, workingAt, (order) => this.atCounter.has(order.id));
    this.movePlayer();

    this.standOnMarkers();

    this.spinSickle(this.autoHarvest(), delta);

    this.state.player.x = this.player.x;
    this.state.player.y = this.player.y;
    for (const view of this.views) view();
    this.splitCameras();
  }

  private standOnMarkers() {
    const under = (m: Marker) => m.zone.contains(this.feetX(), this.feetY());
    for (const m of this.markers) if (m.paused && !under(m)) m.paused = false;
    const marker = this.markers.find((m) => m.shown() && under(m));
    const moving = this.player.body!.velocity.lengthSq() > 0;
    if (moving) this.stillSince = null;
    else this.stillSince ??= this.time.now;
    if (!marker || marker.paused || this.time.now < this.nextMarkerAt) return;
    if (marker.pays && (this.stillSince === null || this.time.now - this.stillSince < STILL_MS)) return;
    this.nextMarkerAt = this.time.now + MARKER_INTERVAL_MS;
    const feedback = marker.act();
    if (feedback) this.showFeedback(feedback);
  }

  private movePlayer() {
    const dir = new Phaser.Math.Vector2(0, 0);
    if (this.cursors.left.isDown || this.wasd.left.isDown) dir.x -= 1;
    if (this.cursors.right.isDown || this.wasd.right.isDown) dir.x += 1;
    if (this.cursors.up.isDown || this.wasd.up.isDown) dir.y -= 1;
    if (this.cursors.down.isDown || this.wasd.down.isDown) dir.y += 1;

    if (dir.lengthSq() > 0) {
      this.pointerTarget = null;
    } else if (this.pointerTarget) {
      // Steer the feet, not the sprite centre, to the tapped spot, via a corner if a station is in the way.
      const target = this.waypoint ?? this.pointerTarget;
      dir.set(target.x - this.feetX(), target.y - this.feetY());
      // Walking past the spot counts as getting there, so a fast walk on a slow frame rate doesn't
      // overshoot it back and forth.
      const passed = this.heading !== null && dir.dot(this.heading) <= 0;
      if (this.waypoint && (dir.length() < 6 || passed)) {
        // Settle the feet on the corner, so the next leg starts clear of the station, and head on.
        this.settleFeet(this.waypoint);
        this.waypoint = this.routeAround(this.pointerTarget);
        const next = this.waypoint ?? this.pointerTarget;
        dir.set(next.x - this.feetX(), next.y - this.feetY());
      } else if (!this.waypoint && (dir.length() < 4 || passed)) {
        // Settle the feet on the spot itself, a step back if the last frame carried them past it.
        if (passed) this.settleFeet(target);
        this.pointerTarget = null;
        dir.set(0, 0);
      }
    }

    dir.normalize();
    this.heading = this.pointerTarget && dir.lengthSq() > 0 ? dir.clone() : null;
    dir.scale(SPEED * walkSpeed(this.state));
    this.player.setVelocity(dir.x, dir.y);
    this.animatePlayer(dir);
  }

  /**
   * Each station's blocked area slightly shrunk, which walking is tested against so lines along an
   * edge or from a corner count as clear. It stays clear of where feet touching the station stand,
   * half the feet's size (15 by 7 pixels) from it, so they still route around it.
   */
  private innerArea(area: Phaser.Geom.Rectangle) {
    return new Phaser.Geom.Rectangle(area.x + 4, area.y + 4, area.width - 8, area.height - 8);
  }

  /**
   * Where the doctor's feet can't stand for the shop: its walls and the street behind it grown by half
   * the feet's size (`walls`), and the whole shop, street included, as one more area to walk around
   * like a station's (`area`), from the top of the world down to where feet stand clear of its front
   * wall. `inside` is between the side walls and above that, so the doorway counts as inside.
   */
  private measureShop(halfWidth: number, halfHeight: number) {
    const walls = SHOP_BLOCKS.map((w) => new Phaser.Geom.Rectangle(w.x - halfWidth, w.y - halfHeight, w.w + 2 * halfWidth, w.h + 2 * halfHeight));
    const left = Math.min(...walls.map((w) => w.left)), right = Math.max(...walls.map((w) => w.right));
    const top = Math.min(...walls.map((w) => w.top)), bottom = Math.max(...walls.map((w) => w.bottom));
    return {
      halfWidth,
      halfHeight,
      walls,
      area: new Phaser.Geom.Rectangle(left - 3, top - 3, right - left + 6, bottom - top + 6),
      inside: new Phaser.Geom.Rectangle(left + halfWidth, top, right - left - 2 * halfWidth, bottom - top),
    };
  }

  /** The shop measured for the feet; measured again if their size changes, as it does once the body takes the sprite's scale. */
  private shop() {
    const { halfWidth, halfHeight } = this.player.body!;
    const m = this.shopMeasured;
    if (m?.halfWidth !== halfWidth || m.halfHeight !== halfHeight) this.shopMeasured = this.measureShop(halfWidth, halfHeight);
    return this.shopMeasured!;
  }

  /** Whether feet at a spot are in the shop. */
  private inShop(p: Point) {
    const { inside } = this.shop();
    return p.x > inside.left && p.x < inside.right && p.y > inside.top && p.y < inside.bottom;
  }

  /**
   * Where to walk first on the way to `to`. Into or out of the shop, that is the front door, unless a
   * straight line to the spot clears the walls: the spot in line with the door on this side of it, and
   * then the one on the other side. When a station, or outside the shop the shop itself, blocks the way
   * there, it is the corner of the nearest such area (the one making the shorter trip). Null once the
   * way to `to` is clear.
   */
  private routeAround(to: Phaser.Math.Vector2): Phaser.Math.Vector2 | null {
    const from = new Phaser.Math.Vector2(this.feetX(), this.feetY());
    const line = (a: Phaser.Math.Vector2, b: Phaser.Math.Vector2) => new Phaser.Geom.Line(a.x, a.y, b.x, b.y);
    const blocks = (a: Phaser.Math.Vector2, b: Phaser.Math.Vector2, area: Phaser.Geom.Rectangle) =>
      Phaser.Geom.Intersects.LineToRectangle(line(a, b), area);
    // Shrunk like the stations' areas, so a line along a wall's edge counts as clear.
    const walls = this.shop().walls.map((w) => this.innerArea(w));
    const wallsBlock = (a: Phaser.Math.Vector2, b: Phaser.Math.Vector2) => walls.some((w) => blocks(a, b, w));
    let goal = to;
    const inside = this.inShop(from);
    if (inside !== this.inShop(to) && wallsBlock(from, to)) {
      const { halfWidth } = this.player.body!;
      const x = Phaser.Math.Clamp(from.x, SHOP_DOOR.from + halfWidth + 2, SHOP_DOOR.to - halfWidth - 2);
      const near = new Phaser.Math.Vector2(x, inside ? SHOP_DOORWAY.inside : SHOP_DOORWAY.outside);
      const far = new Phaser.Math.Vector2(x, inside ? SHOP_DOORWAY.outside : SHOP_DOORWAY.inside);
      goal = wallsBlock(from, far) ? near : far;
    }
    const areas = inside || this.inShop(goal) ? this.blockedAreas : [...this.blockedAreas, this.shop().area];
    // How far along the way each station in it is.
    const inTheWay = areas
      .map((area) => ({ area, inner: this.innerArea(area) }))
      .filter(({ inner }) => !inner.contains(from.x, from.y) && !inner.contains(goal.x, goal.y) && blocks(from, goal, inner))
      .map((s) => ({ ...s, d: Math.min(...Phaser.Geom.Intersects.GetLineToRectangle(line(from, goal), s.inner).map((p) => from.distance(p))) }))
      .sort((a, b) => a.d - b.d);
    if (inTheWay.length === 0) return goal === to ? null : goal;
    const { area, inner } = inTheWay[0];
    const { bounds } = this.physics.world;
    const { halfWidth, halfHeight } = this.player.body!;
    const reach = new Phaser.Geom.Rectangle(bounds.x + halfWidth, bounds.y + halfHeight, bounds.width - 2 * halfWidth, bounds.height - 2 * halfHeight);
    const corners = [
      new Phaser.Math.Vector2(area.left, area.top),
      new Phaser.Math.Vector2(area.right, area.top),
      new Phaser.Math.Vector2(area.left, area.bottom),
      new Phaser.Math.Vector2(area.right, area.bottom),
    ].filter((c) => reach.contains(c.x, c.y) && from.distance(c) > 0.5 && !blocks(from, c, inner));
    // Prefer a corner the way to which no other station blocks either.
    const others = areas.filter((a) => a !== area).map((a) => this.innerArea(a)).filter((a) => !a.contains(from.x, from.y));
    const clear = corners.filter((c) => others.every((other) => !blocks(from, c, other)));
    if (clear.length > 0) corners.splice(0, corners.length, ...clear);
    corners.sort((a, b) => from.distance(a) + a.distance(goal) - (from.distance(b) + b.distance(goal)));
    // With no corner to go by, still head for the door rather than straight at a wall.
    return corners[0] ?? (goal === to ? null : goal);
  }

  /**
   * Where the doctor's feet are, from the physics body: during the update it has already stepped
   * this frame, while the sprite only follows it afterwards.
   */
  private feetX() {
    return this.player.body!.center.x;
  }

  private feetY() {
    return this.player.body!.center.y;
  }

  /**
   * Physics steps once per frame (see main.ts), right after this, with the frame's whole delta; a
   * long frame slows the doctor down to MAX_WALK_STEP_PX for that step.
   */
  private limitWalkStep(_time: number, delta: number) {
    const body = this.player?.body;
    if (body && body.velocity.length() * (delta / 1000) > MAX_WALK_STEP_PX) body.velocity.setLength((MAX_WALK_STEP_PX * 1000) / delta);
  }

  /** Stops the doctor with their feet on a spot. */
  private settleFeet(at: Point) {
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.stop();
    // The body has already stepped this frame and the sprite follows it after the update, so place the
    // sprite and take the body from it, rather than Arcade's reset, which also drops the body's offset.
    this.player.x = at.x;
    body.updateFromGameObject();
    this.player.y += at.y - body.center.y;
    body.updateFromGameObject();
    body.prev.copy(body.position);
    body.prevFrame.copy(body.position);
  }

  /**
   * A tapped spot the feet can't stand on moves to the nearest one they can: inside the world's
   * edges, and out of a station or a shop wall to the nearest edge of its area, so the doctor walks up
   * to it instead of into it.
   */
  private reachable(to: Phaser.Math.Vector2) {
    const { bounds } = this.physics.world;
    const { halfWidth, halfHeight } = this.player.body!;
    to.set(
      Phaser.Math.Clamp(to.x, bounds.left + halfWidth, bounds.right - halfWidth),
      Phaser.Math.Clamp(to.y, bounds.top + halfHeight, bounds.bottom - halfHeight),
    );
    // The same areas walking routes around, so the moved spot gets routed to. The shop's walls meet at
    // its corners, so it moves to the nearest edge outside the others too, if there is one.
    const areas = [
      ...this.blockedAreas.map((area) => ({ area, inner: this.innerArea(area) })),
      ...this.shop().walls.map((area) => ({ area, inner: new Phaser.Geom.Rectangle(area.x + 0.5, area.y + 0.5, area.width - 1, area.height - 1) })),
    ];
    for (let moves = 0; moves < 3; moves++) {
      const hit = areas.find(({ inner }) => inner.contains(to.x, to.y));
      if (!hit) break;
      const { area } = hit;
      const edges = [
        { d: to.x - area.left, x: area.left, y: to.y },
        { d: area.right - to.x, x: area.right, y: to.y },
        { d: to.y - area.top, x: to.x, y: area.top },
        { d: area.bottom - to.y, x: to.x, y: area.bottom },
      ].filter((e) => e.y >= bounds.top + halfHeight);
      const free = edges.filter((e) => !areas.some((other) => other !== hit && other.inner.contains(e.x, e.y)));
      const nearest = (free.length > 0 ? free : edges).reduce((a, b) => (b.d < a.d ? b : a));
      to.set(nearest.x, nearest.y);
    }
    return to;
  }

  private animatePlayer(velocity: Phaser.Math.Vector2) {
    if (velocity.x !== 0) this.player.setFlipX(velocity.x < 0);
    if (velocity.lengthSq() > 0) {
      this.player.anims.play('doctor-walk', true);
    } else {
      this.player.anims.stop();
      this.player.setTexture('doctor-idle');
    }
    // Draw lower sprites in front of higher ones.
    this.player.setDepth(this.feetY());
  }
}

/**
 * Moves `obj` up to `step` pixels towards `to`, one axis at a time: across a row before going up or
 * down when `leaving`, otherwise up or down first. Returns whether it has arrived.
 */
function walkTowards(obj: Phaser.GameObjects.Image, to: Point, step: number, leaving = false) {
  const along = (from: number, target: number) => from + Phaser.Math.Clamp(target - from, -step, step);
  const vertical = leaving ? obj.x === to.x : obj.y !== to.y;
  if (vertical) obj.setY(along(obj.y, to.y));
  else obj.setX(along(obj.x, to.x));
  obj.setDepth(obj.y);
  return obj.x === to.x && obj.y === to.y;
}

function readZoom() {
  try {
    return localStorage.getItem(ZOOM_KEY);
  } catch {
    return null;
  }
}

function writeZoom(zoom: number) {
  try {
    localStorage.setItem(ZOOM_KEY, String(zoom));
  } catch {
    // Without storage the zoom just isn't remembered.
  }
}

/** How wide an order bubble is for `n` potions: their icons and a margin. */
function bubbleWidth(n: number) {
  return 11 + n * BUBBLE.icon;
}
