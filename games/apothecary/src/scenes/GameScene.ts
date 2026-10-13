import Phaser from 'phaser';
import { drawBelts, laneOffset, pointAlong } from '../art/belts';
import { plantTexture } from '../art/garden';
import { itemTexture } from '../art/items';
import { craftsmanTexture, customerTexture } from '../art/townsfolk';
import { signTexture } from '../art/ui';
import { GROW_MS, PLANTS, POTIONS, REFINE, REFINED, isPlant, isPotion, isRefined, type ItemId } from '../game/items';
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
  payUpgrade,
  pickUpFromCauldron,
  pickUpFromRefiner,
  refining,
  stockShelf,
  tick,
  type ExpansionPart,
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
  upgradeCost,
  type BeltId,
  type Build,
  type CauldronId,
  type GameState,
  type RefinerId,
  type StationId,
  type Upgrade,
  type UpgradeId,
  walkSpeed,
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
  EXPANSION_YARDS,
  GARDEN_AREAS,
  GUILD,
  HUD_HEIGHT,
  LABELS,
  OUTFITTER,
  PALLETS,
  REFINER,
  REFINER2,
  REFINER2_MARKERS,
  REFINER_MARKERS,
  SHOP,
  SHOP_BACK_DOOR,
  SHOP_DOOR,
  SHOP_BLOCKS,
  SHOP_DOORWAY,
  SHOP_WALLS,
  STREET,
  WORLD,
  YARDS,
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
const PLAYER_SCALE = 2;
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

/** A floor marker that acts by itself, one step at a time, while the doctor stands on it. */
interface Marker {
  zone: Phaser.Geom.Rectangle;
  act: () => Feedback | null;
  /** Whether the marker is there at all; markers a belt replaces go once it is built. */
  shown: () => boolean;
  /** Set once an upgrade level is paid off; the next level waits until the doctor steps off and on again. */
  paused?: boolean;
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
  /** The settings panel opened from the top bar: frame rate and a new game. */
  private settings!: Settings;
  /** Set once a new game is confirmed, so nothing saves the old one before the scene restarts. */
  private startingOver = false;
  /** Per-frame view updates, each reading from `state`. */
  private views: (() => void)[] = [];

  constructor() {
    super('Game');
  }

  create() {
    this.state = loadState();
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
    this.createControls();
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
    this.cameras.main.setBounds(0, 0, WORLD.w, WORLD.h).startFollow(this.player, true);
  }

  private ground(x: number, y: number, w: number, h: number, texture: string, depth = -1000) {
    return this.add.tileSprite(x, y, w, h, texture).setOrigin(0).setDepth(depth);
  }

  /** A garden: meadow inside a picket fence, with its name on a sign. */
  private drawGarden(garden: number) {
    const area = GARDEN_AREAS[garden];
    this.ground(area.x, area.y, area.w, area.h, 'tile-meadow');
    this.ground(area.x - 12, area.y, 32, area.h, 'fence-v', -990);
    this.ground(area.x + area.w - 20, area.y, 32, area.h, 'fence-v', -990);
    this.ground(area.x, area.y - 4, area.w, 32, 'fence-h', -980);
    this.ground(area.x, area.y + area.h - 28, area.w, 32, 'fence-h', -980);
    this.label(area.x + area.w / 2, area.y + 10, area.name);
  }

  /** A place name on a wooden sign. */
  private label(x: number, y: number, text: string) {
    const name = this.add
      .text(x, y, text, { fontFamily: 'monospace', fontSize: '13px', color: '#f3e9d2', stroke: '#3b2416', strokeThickness: 2 })
      .setOrigin(0.5)
      .setDepth(-900);
    this.add.image(x, y, signTexture(this, name.width + 16)).setDepth(-910);
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
    const ground = this.ground.bind(this);
    ground(0, 0, WORLD.w, WORLD.h, 'tile-grass');

    // Workshop yard of packed earth around the courtyard, with a strip up to the shop door; the
    // right arm gets its yard once the expansion's land is bought.
    for (const yard of YARDS) ground(yard.x, yard.y, yard.w, yard.h, 'tile-dirt', -999);
    this.once(
      () => this.state.expansion.land.built,
      () => {
        for (const yard of EXPANSION_YARDS) ground(yard.x, yard.y, yard.w, yard.h, 'tile-dirt', -999);
      },
    );

    // The second line's fields appear as they are built.
    GARDEN_AREAS.forEach((_, garden) => this.once(() => gardenBuilt(this.state, garden), () => this.drawGarden(garden)));

    // Shop: plank floor inside stone walls, with a doorway in the bottom wall facing the courtyard.
    ground(SHOP.x, SHOP.y, SHOP.w, SHOP.h, 'tile-planks');
    // The back wall has a street door that customers come and go by.
    ground(SHOP_BACK_DOOR.from, 0, SHOP_BACK_DOOR.to - SHOP_BACK_DOOR.from, SHOP.y, 'tile-planks', -995);
    for (const wall of SHOP_WALLS) ground(wall.x, wall.y, wall.w, wall.h, 'tile-wall', -990);
    for (const block of SHOP_BLOCKS) this.obstacles.add(this.add.zone(block.x + block.w / 2, block.y + block.h / 2, block.w, block.h));

    this.label(SHOP.x + SHOP.w / 2, SHOP.y, 'Storefront');
  }

  private createPlots() {
    this.state.plots.forEach((plot, i) => {
      const { x, y } = plotPosition(i);
      this.plotCentres[i] = new Phaser.Math.Vector2(x, y);
      this.once(
        () => gardenBuilt(this.state, gardenOf(i)),
        () => {
          this.add.image(x, y, 'plot').setDepth(-500);
          const plant = this.add.image(x, y + 10, plantTexture(plot.plant, 2)).setOrigin(0.5, 1).setDepth(y);
          const growth = new ProgressBar(this, x, y + 26, 44, 0x9ccf6a, WORLD_UI_DEPTH);
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
    this.addObstacle(at.x, at.y, 'table', 84, 30);
    this.addPallets(id, PALLETS[id], [PLANTS, REFINED], [() => refiner.queue, () => refiner.output]);
    const progress = new ProgressBar(this, at.x, at.y + 30, 60, 0xd8cfa8, WORLD_UI_DEPTH);
    this.addMarker(m.pickUp, 'pad-out', 'Pick up', () => pickUpFromRefiner(this.state, id), () => this.state.belts[beltOut].built);
    this.addMarker(m.drop, 'pad-in', 'Drop', () => dropAtRefiner(this.state, id), () => this.state.belts[beltIn].built && !this.carries(isPlant));
    this.addWorkSpot(m.work, id);
    this.addUpgradeMarker(m.upgrade, id);
    this.addCraftsmen(id);
    this.views.push(() => {
      // The plant being refined is always the front one (see tick).
      progress.set(refining(refiner) >= 0 ? refiner.progress / REFINE[refiner.queue[0]].ms : null);
    });
  }

  /** A cauldron, fed by belt `beltIn` and emptied by belt `beltOut` once those are built. */
  private addCauldron(id: CauldronId, at: Point, m: StationMarkers, label: Point, beltIn: BeltId, beltOut: BeltId) {
    const cauldron = this.state[id];
    this.label(label.x, label.y, 'Cauldron');
    this.addObstacle(at.x, at.y, 'cauldron', 60, 28).play('cauldron-boil');
    this.addPallets(id, PALLETS[id], [REFINED, POTIONS], [() => cauldron.contents, () => cauldron.output]);
    const brewing = new ProgressBar(this, at.x, at.y + 34, 60, 0x58a35a, WORLD_UI_DEPTH);
    this.addMarker(m.pickUp, 'pad-out', 'Pick up', () => pickUpFromCauldron(this.state, id), () => this.state.belts[beltOut].built);
    this.addMarker(m.drop, 'pad-in', 'Drop', () => dropInCauldron(this.state, id), () => this.state.belts[beltIn].built && !this.carries(isRefined));
    this.addWorkSpot(m.work, id);
    this.addUpgradeMarker(m.upgrade, id);
    this.addCraftsmen(id);
    this.views.push(() => {
      brewing.set(cauldron.brewing ? cauldron.brewing.progress / cauldron.brewing.ms : null);
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
    const pad = this.add.image(at.x, at.y, texture).setDepth(-400);
    const text = this.add
      .text(at.x, at.y + 26, caption, { fontFamily: 'monospace', fontSize: '10px', color: '#f3e9d2' })
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
    this.addLevelMarker(at, () => this.state.upgrades[id], UPGRADES[id].max, (level) => upgradeCost(id, level), () => payUpgrade(this.state, id), (level, maxed) =>
      maxed ? `${name} ${level + 1} max` : `${name} ${level + 2}: ${upgradeCost(id, level)}c`,
    );
  }

  /**
   * A purple marker for something bought a level at a time, like an upgrade or a craftsman: standing
   * on it pays towards the next level, captioned by `caption`, with a bar for how much is paid. It
   * is shown while `shown` holds.
   */
  private addLevelMarker(
    at: Point,
    get: () => Upgrade,
    max: number,
    cost: (level: number) => number,
    pay: () => Feedback | null,
    caption: (level: number, maxed: boolean) => string,
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
      () => !shown(),
    );
    const marker = this.markers.length - 1;
    const text = this.add
      .text(at.x, at.y + 26, '', { fontFamily: 'monospace', fontSize: '10px', color: '#e6d3f5' })
      .setOrigin(0.5, 0)
      .setDepth(-400);
    const paid = new ProgressBar(this, at.x, at.y + 38, 40, 0xe0b84a, -400);
    this.views.push(() => {
      const { level, paid: sofar } = get();
      const maxed = level >= max;
      text.setVisible(shown()).setText(caption(level, maxed));
      paid.set(maxed || !shown() ? null : sofar / cost(level));
    });
  }

  /**
   * A station's craftsmen: a marker to hire them one at a time, and the craftsmen themselves standing
   * by the station once hired.
   */
  private addCraftsmen(id: StationId) {
    const { hire, stand } = CRAFTSMEN[id];
    const hired = () => this.state.craftsmen[id];
    this.addLevelMarker(hire, hired, MAX_CRAFTSMEN, craftsmanCost, () => payCraftsman(this.state, id), (level, maxed) =>
      maxed ? `Crew ${level}/${MAX_CRAFTSMEN}` : `Hire ${craftsmanCost(level)}c`,
    );
    stand.forEach((at, i) => {
      const craftsman = this.add.image(at.x, at.y, craftsmanTexture(i)).setOrigin(0.5, 1).setScale(2).setDepth(at.y).setFlipX(i === 1);
      this.views.push(() => craftsman.setVisible(hired().level > i));
    });
  }

  /**
   * A purple build marker with a price and how much is paid, shown while `shown` holds; standing on
   * it pays towards the build.
   */
  private addBuildMarker(at: Point, caption: string, cost: number, build: Build, shown: () => boolean, act: () => Feedback | null) {
    const pad = this.add.image(at.x, at.y, 'pad-up').setDepth(-400);
    const text = this.add
      .text(at.x, at.y + 26, `${caption}: ${cost}c`, { fontFamily: 'monospace', fontSize: '10px', color: '#e6d3f5' })
      .setOrigin(0.5, 0)
      .setDepth(-400);
    const paid = new ProgressBar(this, at.x, at.y + 38, 40, 0xe0b84a, -400);
    this.markers.push({ zone: new Phaser.Geom.Rectangle(at.x - 22, at.y - 22, 44, 44), act, shown });
    this.views.push(() => {
      const show = shown();
      pad.setVisible(show);
      text.setVisible(show);
      paid.set(show ? build.paid / cost : null);
    });
  }

  /**
   * The expansion: a marker to buy the land on the grass right of the shop, then one for each field,
   * the refining table and the cauldron of the second line, where each will go.
   */
  private createExpansion() {
    const { expansion } = this.state;
    this.addBuildMarker(EXPANSION_LAND, 'Land', EXPANSION_COST.land, expansion.land, () => !expansion.land.built, () =>
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
  }

  /**
   * Conveyor belts: a build marker for each once the stations at its ends stand, until it is paid
   * off; then the belt itself with the goods riding along it. All built belts are drawn as one
   * network, so where the two lines' cauldron belts meet becomes a T.
   */
  private createBelts() {
    let network: Phaser.GameObjects.Graphics | null = null;
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
      this.addBuildMarker(BELT_BUILD[id], 'Belt', BELT_COST[id], belt, () => !belt.built && beltBuildable(this.state, id), () =>
        payBelt(this.state, id),
      );
      const riding: Phaser.GameObjects.Image[] = [];
      const [main, ...feeders] = BELT_PATHS[id];
      this.views.push(() => {
        while (riding.length < belt.items.length) {
          riding.push(this.add.image(0, 0, itemTexture(belt.items[0].id)).setDepth(-550));
        }
        const lanes = BELT_LANES[id];
        riding.forEach((icon, i) => {
          const item = belt.items[i];
          if (!item) {
            icon.setVisible(false);
            return;
          }
          // Goods loaded from the doctor's hands wait out of sight until their turn to get on.
          const { run, start, join } = beltSpan(id, item.id);
          icon.setVisible(item.at >= start);
          // Along the main run, across the belt into the item's own lane. On a feeder, the item moves
          // over into that lane as it goes, so it carries straight on where the feeder joins.
          const off = laneOffset(lanes.indexOf(item.id), lanes.length);
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
    this.label(OUTFITTER.x, OUTFITTER.y, 'Outfitter');
    DOCTOR_UPGRADES.forEach((id, i) => this.addUpgradeMarker({ x: OUTFITTER.x, y: OUTFITTER.y + 60 + i * 90 }, id, UPGRADES[id].name));
  }

  /** The guild in the corner of the yard: upgrades for the gardens, the belts and the shop. */
  private createGuild() {
    this.label(GUILD.sign.x, GUILD.sign.y, 'Guild');
    for (const id of GUILD_UPGRADES) this.addUpgradeMarker(GUILD[id], id, UPGRADES[id].name);
  }

  private createShopfront() {
    this.addObstacle(COUNTER.x, COUNTER.y, 'counter', 200, 30);
    this.addPallets('counter', PALLETS.counter, [POTIONS, []], [() => this.state.counter.shelf, () => []]);
    // Potions are stocked by hand until every cauldron standing has its belt to the counter, and
    // whenever the doctor carries one.
    const allBelted = () => !doneByHand(this.state, 'cauldron') && !doneByHand(this.state, 'cauldron2');
    this.addMarker(COUNTER_MARKERS.drop, 'pad-in', 'Drop', () => stockShelf(this.state), () => allBelted() && !this.carries(isPotion));
    this.addMarker(COUNTER_MARKERS.pickUp, 'pad-out', 'Coins', () => collectTill(this.state));
    this.addWorkSpot(COUNTER_MARKERS.work, 'counter');
    this.addUpgradeMarker(COUNTER_MARKERS.upgrade, 'counter');
    this.addCraftsmen('counter');
    const tillCoin = this.add.image(COUNTER_MARKERS.pickUp.x - 8, COUNTER_MARKERS.pickUp.y, 'coin').setDepth(-300);
    const till = this.add
      .text(COUNTER_MARKERS.pickUp.x - 1, COUNTER_MARKERS.pickUp.y, '', {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#fff4c2',
        stroke: '#1b1410',
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
    for (let i = 0; i < MAX_ORDER_SLOTS; i++) {
      const { x, y } = customerPosition(i);
      const wants = new IconRow(this, x, y - 52, WORLD_UI_DEPTH);
      const patience = new ProgressBar(this, x, y - 40, 40, 0xe0b84a, WORLD_UI_DEPTH);
      this.views.push(() => {
        const order = this.state.orders[i];
        const there = order && customers.get(order.id)?.getData('arrived');
        wants.set(there ? order.wants : []);
        patience.set(there ? order.patience / order.maxPatience : null);
      });
    }
    // Customers walk in by the street door to their spot at the counter, move along as those ahead
    // leave, and walk back out once served or out of patience.
    this.views.push(() => {
      const step = (CUSTOMER_SPEED * this.frameMs) / 1000;
      const waiting = new Set(this.state.orders.map((o) => o.id));
      this.state.orders.forEach((order, i) => {
        if (!customers.has(order.id)) {
          const sprite = this.add.image(STREET.x, STREET.y, customerTexture(order.id)).setScale(2);
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

  private createHud() {
    const { width } = this.scale;
    const first = this.children.list.length;
    this.add.tileSprite(0, 0, width, HUD_HEIGHT, 'hud-bar').setOrigin(0).setDepth(UI_DEPTH);
    const style = { fontFamily: 'monospace', fontSize: '16px', color: '#f3e9d2' };
    this.add.image(26, HUD_HEIGHT / 2 - 1, 'coin').setScale(2).setDepth(UI_DEPTH);
    const coins = this.add.text(44, HUD_HEIGHT / 2 - 1, '', style).setOrigin(0, 0.5).setDepth(UI_DEPTH);
    this.add.text(width / 2 - 92, HUD_HEIGHT / 2, 'Hands', style).setOrigin(1, 0.5).setDepth(UI_DEPTH);
    this.add
      .text(width - 110, HUD_HEIGHT / 2, 'Walk: WASD / tap\nHarvest: walk past ripe plants', { ...style, fontSize: '11px' })
      .setOrigin(1, 0.5)
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
      frames.push(this.add.image(x, HUD_HEIGHT / 2 - 1, 'slot').setDepth(UI_DEPTH));
      return this.add.image(x, HUD_HEIGHT / 2 - 1, itemTexture('wheat')).setScale(1.5).setDepth(UI_DEPTH);
    });
    // Everything in the top bar stays put while the camera follows the doctor.
    for (const obj of this.children.list.slice(first)) (obj as unknown as Phaser.GameObjects.Components.ScrollFactor).setScrollFactor(0);
    const pack = new BackStack(this);
    this.recipes = new RecipeBook(this, UI_DEPTH + 1);
    this.settings = new Settings(this, UI_DEPTH + 1, () => this.startOver());

    this.views.push(() => {
      coins.setText(`Coins: ${this.state.coins}`);
      drop.setAlpha(this.state.carrying.length > 0 ? 1 : 0.5);
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

  /** A button in the top bar, right-aligned at `x`; tapping it doesn't walk the doctor. */
  private hudButton(x: number, label: string, onTap: () => void) {
    return this.add
      .text(x, HUD_HEIGHT / 2, label, {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#f3e9d2',
        backgroundColor: '#5c3a21',
        padding: { x: 6, y: 4 },
      })
      .setOrigin(1, 0.5)
      .setDepth(UI_DEPTH)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, e: Phaser.Types.Input.EventData) => {
        e.stopPropagation();
        onTap();
      });
  }

  /** A station image whose lower part blocks walking, so the doctor can pass behind its top edge. */
  private addObstacle(x: number, y: number, texture: string, bodyW: number, bodyH: number) {
    const img = this.add.sprite(x, y, texture).setDepth(y);
    const block = this.add.zone(x, y + img.height / 2 - bodyH / 2, bodyW, bodyH);
    this.obstacles.add(block);
    this.blockedAreas.push(new Phaser.Geom.Rectangle(x - bodyW / 2 - 18, block.y - bodyH / 2 - 10, bodyW + 36, bodyH + 20));
    return img;
  }

  private createPlayer() {
    const { x, y } = this.state.player;
    this.player = this.physics.add.sprite(x, y, 'doctor-idle');
    this.player.setScale(PLAYER_SCALE);
    // Collide with the feet only, so the hat and beak can overlap things behind the doctor.
    // In texture pixels: a 30x15 box at (9, 57) once scaled, as before the art was redrawn.
    this.player.body!.setSize(15, 7.5).setOffset(4.5, 28.5);
    this.player.setCollideWorldBounds(true);
    this.physics.add.collider(this.player, this.obstacles);
    this.sickle = this.add.image(x, y, 'sickle').setScale(SICKLE_SCALE).setVisible(false);
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
      if (p.y < HUD_HEIGHT) return;
      // While a panel is open, a tap anywhere below the top bar closes it instead of walking.
      if (this.recipes.visible || this.settings.visible) {
        this.recipes.toggle(false);
        this.settings.toggle(false);
        return;
      }
      this.pointerTarget = this.reachable(new Phaser.Math.Vector2(p.worldX, p.worldY));
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
            fontFamily: 'monospace',
            fontSize: '13px',
            color: '#fff4c2',
            stroke: '#1b1410',
            strokeThickness: 3,
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
  }

  private standOnMarkers() {
    const under = (m: Marker) => m.zone.contains(this.feetX(), this.feetY());
    for (const m of this.markers) if (m.paused && !under(m)) m.paused = false;
    const marker = this.markers.find((m) => m.shown() && under(m));
    if (!marker || marker.paused || this.time.now < this.nextMarkerAt) return;
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
    const bottom = Math.max(...walls.map((w) => w.bottom));
    return {
      halfWidth,
      halfHeight,
      walls,
      area: new Phaser.Geom.Rectangle(left - 3, 0, right - left + 6, bottom + 3),
      inside: new Phaser.Geom.Rectangle(left + halfWidth, 0, right - left - 2 * halfWidth, bottom),
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
    return p.x > inside.left && p.x < inside.right && p.y < inside.bottom;
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
