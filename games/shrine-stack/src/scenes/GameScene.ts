import Phaser from 'phaser';
import { settings } from '../../../../shared/settings';
import { BLESSING_INFO, BLESSINGS, type BlessingId } from '../game/blessings';
import { CURSE_INFO, KIND_INFO, SHOP, SHOP_INFO, TRIAL_INFO, type ShopId, type StoneKind } from '../game/catalog';
import { loadBest, saveBest } from '../game/save';
import {
  buildOn,
  buy,
  canBuy,
  canReroll,
  chooseBlessing,
  CURSE_MULT,
  curseNow,
  drop,
  keepBuilding,
  GILDED_MULT,
  GILDED_TIER,
  GOAL_TIER,
  newGame,
  PLINTH_W,
  REROLL_COST,
  reroll,
  stackHeight,
  STONE_H,
  STONES_PER_TIER,
  tick,
  toggleCurse,
  TOWER_X,
  type GameEvent,
  type GameState,
} from '../game/state';
import { makeButton } from '../ui/Button';
import { BUILD_ON, CARDS, CURSE, FONT, GOAL, OFFER_TITLE, PANEL, PLINTH_Y, REROLL, SHOP_ROW, SHOP_TITLE, TOP_SCREEN_Y, UI_DEPTH, VIEW } from './layout';

/** The longest step of game time one frame may take, so a hidden tab doesn't drop a stone through the temple. */
const MAX_STEP_MS = 100;
/** How quickly the camera catches up with the temple's top: the time to close about two thirds of the gap. */
const CAMERA_MS = 180;
const POPUP_MS = 900;
const DEBRIS_MS = 1100;
const BANNER_MS = 2200;
/** How long the crowned shrine shows on its own before the win panel comes up. */
const CROWN_MS = 2400;

/** Stone colours, one per tier, repeating. */
const TIER_COLORS = [0xd8b58a, 0xb9c3cc, 0xe3c98f, 0xa9c49a, 0xd6a7a0, 0xc2b0dc];
const OUTLINE = 0x2a2036;
const GOLD = 0xf3c64e;
/** The gilded tier's stones are leaf gold whatever the tier colours say. */
const GILT = 0xe9b949;
/** Curses are drawn in a dusky plum. */
const CURSE_COLOR = 0xb0609a;

const textStyle = (size: number, color = '#f3e9d2') => ({
  fontFamily: FONT,
  fontSize: `${size}px`,
  color,
  stroke: '#14101f',
  strokeThickness: 3,
});

/** Where something to tap is on screen, by its centre and size; read by the playthrough test. */
export interface Spot {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Where a blessing card is on screen; read by the playthrough test. */
export interface BlessingCard extends Spot {
  id: BlessingId;
}

/** Where a shop button is on screen; read by the playthrough test. */
export interface ShopButton extends Spot {
  id: ShopId;
}

/** Shifts a colour lighter (amount > 0) or darker (amount < 0). */
function shade(color: number, amount: number) {
  const c = Phaser.Display.Color.IntegerToColor(color);
  const f = (v: number) => Phaser.Math.Clamp(Math.round(amount > 0 ? v + (255 - v) * amount : v * (1 + amount)), 0, 255);
  return Phaser.Display.Color.GetColor(f(c.red), f(c.green), f(c.blue));
}

/** A small seeded generator for the stars and clouds, so they never use `Math.random`. */
function seeded(seed: number) {
  return () => {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    return ((seed >>> 0) % 10_000) / 10_000;
  };
}

/** Keeps a container and everything in it still on screen, so taps hit where it is drawn. */
function pin(container: Phaser.GameObjects.Container) {
  container.setScrollFactor(0, 0, true);
  for (const child of container.list) if (child instanceof Phaser.GameObjects.Container) pin(child);
  return container;
}

/** A piece of fixed UI: it can be moved, faded, hidden, layered and kept still on screen. */
export type UiPart = Phaser.GameObjects.GameObject &
  Phaser.GameObjects.Components.Transform &
  Phaser.GameObjects.Components.AlphaSingle &
  Phaser.GameObjects.Components.Visible &
  Phaser.GameObjects.Components.Depth &
  Phaser.GameObjects.Components.ScrollFactor;

/**
 * Moves the parts of a button drawn around (0, 0) to (x, y). Buttons are loose parts rather than
 * containers: Phaser misplaces taps on anything inside a container once the camera has climbed.
 */
function place(parts: UiPart[], x: number, y: number, alpha = 1) {
  for (const p of parts) p.setPosition(p.x + x, p.y + y).setAlpha(alpha);
  return parts;
}

const tierColor = (tier: number) => (tier === GILDED_TIER ? GILT : TIER_COLORS[(tier - 1) % TIER_COLORS.length]);

/** Draws a stone `w` wide with its bottom middle at the graphics' origin; heavy ones darker and strapped, light ones pale and porous. */
function drawStone(g: Phaser.GameObjects.Graphics, w: number, tier: number, perfect: boolean, kind: StoneKind = 'normal') {
  const base = tierColor(tier);
  const color = kind === 'heavy' ? shade(base, -0.28) : kind === 'light' ? shade(base, 0.35) : base;
  const x = -w / 2;
  const y = -STONE_H;
  g.fillStyle(OUTLINE).fillRect(x, y, w, STONE_H);
  if (w <= 2) return;
  g.fillStyle(color).fillRect(x + 1, y + 1, w - 2, STONE_H - 2);
  g.fillStyle(shade(color, 0.35)).fillRect(x + 1, y + 1, w - 2, 3);
  g.fillStyle(shade(color, -0.25)).fillRect(x + 1, y + STONE_H - 5, w - 2, 4);
  // Brick seams, offset on every other tier like courses of masonry.
  g.fillStyle(shade(color, -0.4));
  for (let sx = x + (tier % 2 ? 30 : 52); sx < x + w - 8; sx += 46) g.fillRect(Math.round(sx), y + 4, 2, STONE_H - 9);
  if (kind === 'heavy' && w > 24) {
    // Iron straps near either end, with a rivet top and bottom.
    for (const sx of [x + 8, x + w - 13]) {
      g.fillStyle(0x4a4656).fillRect(Math.round(sx), y + 1, 5, STONE_H - 2);
      g.fillStyle(0x9a96a8).fillRect(Math.round(sx) + 1, y + 5, 3, 3).fillRect(Math.round(sx) + 1, y + STONE_H - 9, 3, 3);
    }
  } else if (kind === 'light') {
    // Pumice pores.
    g.fillStyle(shade(color, -0.3));
    for (let px = x + 7, i = 0; px < x + w - 5; px += 13, i++) g.fillRect(Math.round(px), y + (i % 2 ? 9 : 17), 2, 2);
  }
  if (tier === GILDED_TIER && w > 12) {
    // Gilding: a bright leaf along the top and a glint near either end.
    g.fillStyle(0xfff1b8).fillRect(x + 1, y + 1, w - 2, 2);
    g.fillStyle(0xfff8dc).fillRect(x + 6, y + 6, 3, 3).fillRect(x + w - 10, y + 9, 2, 2);
  }
  if (perfect) {
    // A gold rune in the middle of a stone that snapped on whole.
    g.fillStyle(GOLD).fillTriangle(-5, y + STONE_H / 2, 0, y + 7, 5, y + STONE_H / 2);
    g.fillTriangle(-5, y + STONE_H / 2, 0, y + STONE_H - 7, 5, y + STONE_H / 2);
  }
}

export class GameScene extends Phaser.Scene {
  /** The game being played; read by the playthrough test. */
  state!: GameState;
  /** The blessing cards on screen while choosing; read by the playthrough test. */
  blessingCards: BlessingCard[] = [];
  /** The reroll button while choosing a blessing, or null; read by the playthrough test. */
  rerollButton: Spot | null = null;
  /** The shop's buttons between tiers, the curse toggle and the button that ends a wobbly tier's break. */
  shopButtons: ShopButton[] = [];
  curseToggle: Spot | null = null;
  buildOnButton: Spot | null = null;
  /** The "Keep building" button on the crowned panel, or null. */
  keepButton: Spot | null = null;
  private lastFrame: number | null = null;
  private stoneViews: Phaser.GameObjects.Graphics[] = [];
  /** The gold trim and lanterns on each balanced tier, by tier. */
  private ornaments = new Map<number, Phaser.GameObjects.Graphics>();
  private moving!: Phaser.GameObjects.Graphics;
  private movingKey = '';
  private guide!: Phaser.GameObjects.Graphics;
  private tierText!: Phaser.GameObjects.Text;
  private pips!: Phaser.GameObjects.Graphics;
  private favorText!: Phaser.GameObjects.Text;
  private builtText!: Phaser.GameObjects.Text;
  private nextText!: Phaser.GameObjects.Text;
  private trialText!: Phaser.GameObjects.Text;
  private curseText!: Phaser.GameObjects.Text;
  private windText!: Phaser.GameObjects.Text;
  private crown: Phaser.GameObjects.Graphics | null = null;
  /** "Build again" centred (after a fall) and beside "Keep building" (after the crown). */
  private againButton: UiPart[] = [];
  private againBeside: UiPart[] = [];
  private keepBuildingButton: UiPart[] = [];
  private blessingsText!: Phaser.GameObjects.Text;
  private hint!: Phaser.GameObjects.Text;
  private banner!: Phaser.GameObjects.Container;
  private bannerText!: Phaser.GameObjects.Text;
  /** Everything shown during a break between tiers, rebuilt with the offer. */
  private offerParts: UiPart[] = [];
  private offerKey = '';
  /** The end panel's dim, panel and texts. */
  private gameOver: UiPart[] = [];
  private gameOverTitle!: Phaser.GameObjects.Text;
  private gameOverText!: Phaser.GameObjects.Text;
  private goalPips!: Phaser.GameObjects.Graphics;
  /** Game time since the shrine was crowned. */
  private crownedMs = 0;

  constructor() {
    super('Game');
  }

  create() {
    this.state = newGame(loadBest());
    this.lastFrame = null;
    this.stoneViews = [];
    this.ornaments = new Map();
    this.blessingCards = [];
    this.rerollButton = null;
    this.shopButtons = [];
    this.curseToggle = null;
    this.buildOnButton = null;
    this.keepButton = null;
    this.crown = null;
    this.crownedMs = 0;
    this.movingKey = '';
    this.offerKey = '';
    this.cameras.main.setScroll(0, 0);

    this.createBackdrop();
    this.createPlinth();
    this.guide = this.add.graphics().setDepth(4);
    this.moving = this.add.graphics().setDepth(5);
    this.createPanel();

    this.hint = this.add
      .text(TOWER_X, VIEW.h - 18, 'Tap anywhere to drop the stone', textStyle(14, '#d8cbe8'))
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(UI_DEPTH);
    this.windText = this.add.text(TOWER_X, 20, '', textStyle(15, '#bfe4f4')).setOrigin(0.5).setScrollFactor(0).setDepth(UI_DEPTH);
    const backdrop = this.add.rectangle(0, 0, 420, 64, 0x231c38, 0.92).setStrokeStyle(3, GOLD);
    this.bannerText = this.add.text(0, 0, '', textStyle(20)).setOrigin(0.5).setAlign('center').setLineSpacing(6);
    this.banner = pin(this.add.container(TOWER_X, 70, [backdrop, this.bannerText]))
      .setDepth(UI_DEPTH + 5)
      .setAlpha(0);

    // One zone over the whole view: a tap drops the swinging stone.
    this.add
      .zone(0, 0, VIEW.w, VIEW.h)
      .setOrigin(0)
      .setScrollFactor(0)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => drop(this.state));

    this.offerParts = [];
    this.createGameOver();
    this.refresh();
  }

  update(time: number) {
    // Game time from the frame's own timestamp rather than Phaser's smoothed delta.
    const dt = this.lastFrame === null ? 0 : Phaser.Math.Clamp(time - this.lastFrame, 0, MAX_STEP_MS);
    this.lastFrame = time;
    const s = this.state;
    tick(s, dt);
    if (s.phase === 'crowned') this.crownedMs += dt;
    for (const e of s.events.splice(0)) this.show(e);

    // The camera follows the temple's top up, easing so each new stone slides the view gently.
    const target = Math.min(0, PLINTH_Y - stackHeight(s) - TOP_SCREEN_Y);
    const cam = this.cameras.main;
    cam.scrollY += (target - cam.scrollY) * (1 - Math.exp(-dt / CAMERA_MS));

    this.drawMoving();
    this.refresh();
  }

  private createBackdrop() {
    // The dusk sky, in bands from deep violet at the top to amber at the horizon.
    const sky = this.add.graphics().setScrollFactor(0).setDepth(-10);
    const top = Phaser.Display.Color.IntegerToColor(0x1d1838);
    const low = Phaser.Display.Color.IntegerToColor(0xd88a5a);
    const bands = 27;
    for (let i = 0; i < bands; i++) {
      const c = Phaser.Display.Color.Interpolate.ColorWithColor(top, low, bands - 1, Math.pow(i / (bands - 1), 1.6) * (bands - 1));
      sky.fillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b)).fillRect(0, (i * VIEW.h) / bands, VIEW.w, VIEW.h / bands + 1);
    }
    const rand = seeded(20261013);
    for (let i = 0; i < 60; i++) {
      sky.fillStyle(0xf3e9d2, 0.4 + rand() * 0.5).fillRect(Math.round(rand() * VIEW.w), Math.round(rand() * 280), rand() < 0.2 ? 2 : 1, rand() < 0.2 ? 2 : 1);
    }
    sky.fillStyle(0xf6e7c0, 0.18).fillCircle(820, 92, 34);
    sky.fillStyle(0xf6e7c0).fillCircle(820, 92, 24);
    sky.fillStyle(0xe7d4a6).fillCircle(812, 86, 5).fillCircle(828, 100, 3);

    // Far mountains drift slowly as the camera climbs.
    const far = this.add.graphics().setScrollFactor(0, 0.15).setDepth(-9);
    far.fillStyle(0x4a3a62).fillPoints(this.ridge(380, 70, 7, rand), true);
    const near = this.add.graphics().setScrollFactor(0, 0.35).setDepth(-8);
    near.fillStyle(0x34294a).fillPoints(this.ridge(430, 50, 11, rand), true);

    // Clouds at every height, so climbing shows.
    const clouds = this.add.graphics().setScrollFactor(0, 0.6).setDepth(-7);
    for (let y = 260; y > -16000; y -= 110 + rand() * 90) {
      const x = 240 + rand() * 720;
      const w = 50 + rand() * 70;
      clouds.fillStyle(0xf3e9d2, 0.12 + rand() * 0.1);
      clouds.fillEllipse(x, y, w, w * 0.32).fillEllipse(x + w * 0.3, y - 6, w * 0.6, w * 0.3);
    }
  }

  /** A jagged mountain line along `baseY`, closed down to the bottom of the view. */
  private ridge(baseY: number, height: number, peaks: number, rand: () => number) {
    const points = [new Phaser.Math.Vector2(0, VIEW.h + 400)];
    for (let i = 0; i <= peaks * 2; i++) {
      const x = (i / (peaks * 2)) * VIEW.w;
      const y = i % 2 ? baseY - height * (0.5 + rand() * 0.5) : baseY - rand() * height * 0.2;
      points.push(new Phaser.Math.Vector2(x, y));
    }
    points.push(new Phaser.Math.Vector2(VIEW.w, VIEW.h + 400));
    return points;
  }

  private createPlinth() {
    const g = this.add.graphics().setDepth(1);
    // The hill the shrine stands on.
    g.fillStyle(0x2f4a36).fillEllipse(TOWER_X, PLINTH_Y + 120, 900, 200);
    g.fillStyle(0x3d5e42).fillEllipse(TOWER_X, PLINTH_Y + 110, 760, 150);
    g.fillStyle(0x2f4a36).fillRect(0, PLINTH_Y + 60, VIEW.w, 200);
    // Three steps up to the plinth, the top one exactly as wide as the plinth.
    const steps = [
      { w: PLINTH_W + 80, h: 14 },
      { w: PLINTH_W + 40, h: 14 },
      { w: PLINTH_W, h: 16 },
    ];
    let y = PLINTH_Y + 44;
    for (const step of steps) {
      g.fillStyle(OUTLINE).fillRect(TOWER_X - step.w / 2, y - step.h, step.w, step.h);
      g.fillStyle(0x8e8496).fillRect(TOWER_X - step.w / 2 + 1, y - step.h + 1, step.w - 2, step.h - 2);
      g.fillStyle(0xb2a9b8).fillRect(TOWER_X - step.w / 2 + 1, y - step.h + 1, step.w - 2, 3);
      y -= step.h;
    }
  }

  private createPanel() {
    const fixed = <T extends Phaser.GameObjects.Components.ScrollFactor & Phaser.GameObjects.Components.Depth>(o: T) =>
      o.setScrollFactor(0).setDepth(UI_DEPTH);
    fixed(this.add.rectangle(PANEL.x, PANEL.y, PANEL.w, PANEL.h, 0x231c38, 0.92).setOrigin(0).setStrokeStyle(3, 0x4a3a6a));
    fixed(this.add.text(PANEL.x + PANEL.w / 2, PANEL.y + 22, 'Shrine Stack', textStyle(22, '#f3c64e')).setOrigin(0.5));
    this.tierText = fixed(this.add.text(PANEL.x + 16, PANEL.y + 50, '', textStyle(18)));
    this.pips = fixed(this.add.graphics());
    this.favorText = fixed(this.add.text(PANEL.x + 16, PANEL.y + 104, '', textStyle(18, '#f3c64e')));
    this.builtText = fixed(this.add.text(PANEL.x + 16, PANEL.y + 130, '', textStyle(14, '#d8cbe8')));
    this.nextText = fixed(this.add.text(PANEL.x + 16, PANEL.y + 150, '', textStyle(14)));
    const small = (color: string) => ({ fontFamily: FONT, fontSize: '13px', color, stroke: '#14101f', strokeThickness: 2 });
    this.trialText = fixed(this.add.text(PANEL.x + 16, PANEL.y + 173, '', small('#9ad46a')));
    this.curseText = fixed(this.add.text(PANEL.x + 16, PANEL.y + 192, '', small('#e8a0d4')));
    fixed(this.add.text(PANEL.x + 16, PANEL.y + 214, 'Blessings', textStyle(16, '#f3c64e')));
    this.blessingsText = fixed(
      this.add.text(PANEL.x + 16, PANEL.y + 238, '', { fontFamily: FONT, fontSize: '13px', color: '#f3e9d2', lineSpacing: 6 }),
    );
    // The run's goal: a pip per tier up to the crown, the gilded one framed in gold.
    const goal = PANEL.y + GOAL.y;
    fixed(this.add.rectangle(PANEL.x + 10, goal, PANEL.w - 20, 76, 0x2c2446).setOrigin(0).setStrokeStyle(2, 0x6a5a9a));
    fixed(this.add.text(PANEL.x + 18, goal + 6, `Goal: crown tier ${GOAL_TIER}`, textStyle(14, '#f3c64e')));
    this.goalPips = fixed(this.add.graphics());
    fixed(this.add.text(PANEL.x + 18, goal + 52, `Tier ${GILDED_TIER} gilded: x${GILDED_MULT} favor`, { fontFamily: FONT, fontSize: '12px', color: '#e9b949' }));
    fixed(
      this.add.text(PANEL.x + 16, PANEL.y + PANEL.h - 66, 'Tap to drop a stone.\nOverhangs break off.\nLand 3/4 on to balance.', {
        fontFamily: FONT,
        fontSize: '12px',
        color: '#a99cc0',
        lineSpacing: 3,
      }),
    );
  }

  private createGameOver() {
    const dim = this.add.rectangle(VIEW.w / 2, VIEW.h / 2, VIEW.w, VIEW.h, 0x0c0916, 0.7).setInteractive();
    const panel = this.add.rectangle(VIEW.w / 2, VIEW.h / 2, 520, 260, 0x231c38).setStrokeStyle(4, 0x6a5a9a);
    const title = (this.gameOverTitle = this.add.text(VIEW.w / 2, VIEW.h / 2 - 90, '', textStyle(30, '#f3c64e')).setOrigin(0.5));
    this.gameOverText = this.add
      .text(VIEW.w / 2, VIEW.h / 2 - 10, '', { fontFamily: FONT, fontSize: '16px', color: '#f1e3c6', align: 'center' })
      .setOrigin(0.5);
    this.gameOver = [dim, panel, title, this.gameOverText];
    const restart = () => this.scene.restart();
    this.againButton = makeButton(this, VIEW.w / 2, VIEW.h / 2 + 80, 'Build again', restart);
    this.againBeside = makeButton(this, VIEW.w / 2 - 115, VIEW.h / 2 + 80, 'Build again', restart);
    this.keepBuildingButton = makeButton(this, VIEW.w / 2 + 115, VIEW.h / 2 + 80, 'Keep building', () => keepBuilding(this.state) && this.onKeepBuilding());
    for (const part of [...this.gameOver, ...this.againButton, ...this.againBeside, ...this.keepBuildingButton]) {
      part.setScrollFactor(0).setDepth(UI_DEPTH + 20).setVisible(false);
    }
  }

  /** The world y of a height above the plinth. */
  private worldY(h: number) {
    return PLINTH_Y - h;
  }

  /** Shows what the rules just did: a stone landing, a piece breaking off, a tier finishing. */
  private show(e: GameEvent) {
    const s = this.state;
    if (e.type === 'placed') {
      const i = s.stones.length - 1;
      const stone = s.stones[i];
      const g = this.add.graphics().setDepth(3).setPosition(stone.x, this.worldY(i * STONE_H));
      drawStone(g, stone.w, stone.tier, stone.perfect, stone.kind);
      this.stoneViews.push(g);
      for (const piece of e.cut) this.debris(piece.x, this.worldY(i * STONE_H), piece.w, stone.tier, stone.kind);
      this.popup(stone.x, this.worldY((i + 1) * STONE_H) - 6, e.drop.perfect ? `Perfect! +${e.favor}` : `+${e.favor}`, e.drop.perfect);
      if (e.drop.perfect) this.glow(stone.x, this.worldY(i * STONE_H), stone.w);
    } else if (e.type === 'missed') {
      this.debris(e.drop.x, this.worldY(stackHeight(s)), e.drop.w, s.tier, s.moving.kind);
      this.cameras.main.shake(200, 0.006);
      if (e.drop.caught) this.announce(["Mason's Grace", 'The stone is caught: try again']);
      if (s.phase === 'over') saveBest(s.best);
    } else if (e.type === 'rerolled') {
      this.popup(PANEL.x + 150, PANEL.y + 126, `-${REROLL_COST}`, false);
    } else if (e.type === 'bought') {
      this.popup(PANEL.x + 150, PANEL.y + 126, `-${SHOP_INFO[e.item].cost}`, false);
      if (e.item === 'wider') this.redrawTop();
    } else if (e.type === 'trial') {
      const top = s.stones.at(-1)!;
      const y = this.worldY(stackHeight(s)) - 34;
      this.popup(top.x, y, e.passed ? `Trial passed! +${e.favor}` : 'Trial failed', e.passed);
    } else {
      if (e.balanced) this.ornament(e.tier);
      if (s.phase === 'crowned') this.crownTemple();
      // A break between tiers says so itself; only a wobbly tier with nothing to buy goes straight on.
      else if (s.phase !== 'blessing') this.announce([`Tier ${e.tier} is wobbly`, e.tier + 1 === GILDED_TIER ? `Tier ${GILDED_TIER} is gilded: x${GILDED_MULT} favor` : 'No blessing this time']);
      saveBest(s.best);
    }
  }

  /** A gold crown with three points and gems on top of the finished shrine. */
  private crownTemple() {
    const top = this.state.stones.at(-1)!;
    const y = this.worldY(stackHeight(this.state));
    const g = (this.crown = this.add.graphics().setDepth(3.6).setPosition(top.x, y));
    g.fillStyle(OUTLINE).fillRect(-30, -12, 60, 12);
    g.fillTriangle(-32, -10, -22, -40, -12, -10).fillTriangle(-12, -10, 0, -48, 12, -10).fillTriangle(12, -10, 22, -40, 32, -10);
    g.fillStyle(GOLD).fillRect(-28, -11, 56, 10);
    g.fillTriangle(-29, -10, -22, -36, -15, -10).fillTriangle(-9, -10, 0, -44, 9, -10).fillTriangle(15, -10, 22, -36, 29, -10);
    g.fillStyle(0xfff1b8).fillRect(-28, -11, 56, 2);
    g.fillStyle(0x6ac0e8).fillCircle(0, -6, 3);
    g.fillStyle(0x8ad06a).fillCircle(-18, -6, 2.5).fillCircle(18, -6, 2.5);
    this.glow(top.x, y, top.w);
    this.announce(['The shrine is crowned!', `Tier ${GOAL_TIER} stands`]);
  }

  /** A broken piece or a missed stone, tumbling down off the temple. */
  private debris(x: number, y: number, w: number, tier: number, kind: StoneKind = 'normal') {
    const g = this.add.graphics().setDepth(6).setPosition(x, y);
    drawStone(g, w, tier, false, kind);
    const side = x < TOWER_X ? -1 : 1;
    this.tweens.add({
      targets: g,
      y: y + 420,
      x: x + side * 60,
      angle: side * 70,
      alpha: 0,
      duration: DEBRIS_MS,
      ease: 'Quad.easeIn',
      onComplete: () => g.destroy(),
    });
  }

  /** A soft gold glow along a stone that landed perfectly, fading out once. */
  private glow(x: number, y: number, w: number) {
    const r = this.add.rectangle(x, y - STONE_H / 2, w + 16, STONE_H + 16, GOLD, 0.45).setDepth(2);
    this.tweens.add({ targets: r, alpha: 0, scaleX: 1.15, duration: 500, onComplete: () => r.destroy() });
  }

  /** Gold trim along the top of a balanced tier, and a lantern hanging from either side. */
  private ornament(tier: number) {
    const top = this.state.stones[tier * STONES_PER_TIER - 1];
    const y = this.worldY(tier * STONES_PER_TIER * STONE_H);
    const g = this.ornaments.get(tier) ?? this.add.graphics().setDepth(3.5);
    this.ornaments.set(tier, g.clear());
    g.fillStyle(GOLD).fillRect(top.x - top.w / 2 + 1, y + 1, top.w - 2, 3);
    for (const side of [-1, 1]) {
      const edge = top.x + side * (top.w / 2);
      const lx = edge + side * 7;
      g.fillStyle(OUTLINE).fillRect(Math.min(edge, lx), y + 5, 7, 2);
      g.fillStyle(0xffd27a, 0.18).fillCircle(lx, y + 15, 12);
      g.fillStyle(OUTLINE).fillRect(lx - 4, y + 9, 8, 13);
      g.fillStyle(0xffd27a).fillRect(lx - 3, y + 10, 6, 11);
      g.fillStyle(OUTLINE).fillRect(lx - 5, y + 7, 10, 3).fillRect(lx - 1, y + 5, 2, 3);
    }
  }

  private popup(x: number, y: number, text: string, big: boolean) {
    const t = this.add
      .text(x, y, text, textStyle(big ? 20 : 16, big ? '#f3c64e' : '#f3e9d2'))
      .setOrigin(0.5, 1)
      .setDepth(UI_DEPTH - 1);
    this.tweens.add({ targets: t, y: y - 40, alpha: 0, duration: POPUP_MS, ease: 'Quad.easeIn', onComplete: () => t.destroy() });
  }

  private announce(lines: string[]) {
    this.bannerText.setText(lines);
    this.banner.setAlpha(1);
    this.tweens.killTweensOf(this.banner);
    this.tweens.add({ targets: this.banner, alpha: 0, delay: BANNER_MS / 2, duration: BANNER_MS / 2 });
  }

  /** The swinging or falling stone and the faint line showing where it would land. */
  private drawMoving() {
    const s = this.state;
    const m = s.moving;
    const show = s.phase === 'swinging' || s.phase === 'falling';
    this.moving.setVisible(show);
    this.guide.clear();
    if (!show) return;
    const key = `${m.w}|${s.tier}|${m.kind}`;
    if (key !== this.movingKey) {
      this.movingKey = key;
      this.moving.clear();
      drawStone(this.moving, m.w, s.tier, false, m.kind);
    }
    const y = this.worldY(m.h);
    this.moving.setPosition(m.x, y);
    // A gust shows as streaks blowing past the stone, longer the stronger it is.
    if (s.wind) {
      const side = Math.sign(s.wind);
      const len = 10 + Math.abs(s.wind) / 4;
      this.guide.fillStyle(0xbfe4f4, 0.6);
      for (const [dy, off] of [[-22, 0], [-14, 14], [-6, 4]] as const) {
        const x0 = m.x - side * (m.w / 2 + 12 + off) - (side > 0 ? len : 0);
        this.guide.fillRect(Math.round(x0), Math.round(y + dy), Math.round(len), 2);
      }
    }
    // Dimness hides the drop guide.
    if (curseNow(s) === 'dim') return;
    const top = this.worldY(stackHeight(s));
    this.guide.fillStyle(0xf3e9d2, 0.35);
    for (let gy = y + 6; gy < top - 2; gy += 10) this.guide.fillRect(Math.round(m.x) - 1, gy, 2, 5);
  }

  private refresh() {
    const s = this.state;
    this.tierText.setText(s.endless ? `Tier ${s.tier}  Sky` : `Tier ${Math.min(s.tier, GOAL_TIER)}`);
    this.pips.clear();
    for (let i = 0; i < STONES_PER_TIER; i++) {
      const x = PANEL.x + 16 + i * 30;
      this.pips.fillStyle(OUTLINE).fillRect(x, PANEL.y + 78, 24, 14);
      this.pips.fillStyle(i < s.inTier ? (s.wobbly ? 0xb08a6a : TIER_COLORS[(s.tier - 1) % TIER_COLORS.length]) : 0x3a3052).fillRect(x + 2, PANEL.y + 80, 20, 10);
    }
    this.goalPips.clear();
    for (let t = 1; t <= GOAL_TIER; t++) {
      const x = PANEL.x + 18 + (t - 1) * (GOAL.pip + GOAL.gap);
      const y = PANEL.y + GOAL.y + 30;
      const built = t <= s.tiersBuilt;
      this.goalPips.fillStyle(built ? tierColor(t) : 0x3a3052).fillRect(x, y, GOAL.pip, GOAL.pip);
      if (t === GILDED_TIER) this.goalPips.lineStyle(2, GILT).strokeRect(x - 1, y - 1, GOAL.pip + 2, GOAL.pip + 2);
      if (t === s.tier && s.phase !== 'crowned') this.goalPips.fillStyle(0xf3e9d2).fillRect(x, y + GOAL.pip + 2, GOAL.pip, 2);
    }
    this.favorText.setText(`Favor ${s.favor}`);
    this.builtText.setText(`Built ${s.tiersBuilt}  Best ${s.best}`);
    const next = KIND_INFO[s.nextKind];
    this.nextText.setText(`Next: ${next.name}`).setColor(next.color);
    const t = s.trial;
    this.trialText
      .setText(t ? (t.failed ? `Failed: ${TRIAL_INFO[t.id].short}` : `Trial: ${TRIAL_INFO[t.id].short} ${t.done}/${STONES_PER_TIER}`) : 'Trials from tier 2')
      .setColor(t && !t.failed ? '#9ad46a' : '#8a7ea0');
    const curse = curseNow(s);
    this.curseText.setText(curse ? `Curse: ${CURSE_INFO[curse].name} (x${CURSE_MULT})` : '');
    const playing = s.phase === 'swinging' || s.phase === 'falling';
    this.windText.setText(s.endless && playing ? (s.wind ? `Gust ${s.wind > 0 ? '>>>' : '<<<'} ${Math.abs(s.wind)}` : 'Calm air') : '');
    const counts = BLESSINGS.filter((b) => s.blessings.includes(b)).map((b) => {
      const n = s.blessings.filter((x) => x === b).length;
      return `${BLESSING_INFO[b].name}${n > 1 ? ` x${n}` : ''}`;
    });
    if (s.grace) counts.push(`(${s.grace} stone${s.grace > 1 ? 's' : ''} in grace)`);
    this.blessingsText.setText(counts.length ? counts : ['None yet']);
    // The hint shows until the first drop, while the temple is still too short to reach it.
    this.hint.setVisible(s.dropped === 0 && s.phase === 'swinging');

    const offerKey = s.phase === 'blessing' ? `break:${s.offer.join(',')}` : '';
    if (offerKey !== this.offerKey) {
      this.offerKey = offerKey;
      this.buildOffer();
    }

    const ended = s.phase === 'over' || (s.phase === 'crowned' && this.crownedMs >= CROWN_MS);
    const crowned = s.phase === 'crowned';
    for (const part of this.gameOver) part.setVisible(ended);
    for (const part of this.againButton) part.setVisible(ended && !crowned);
    for (const part of [...this.againBeside, ...this.keepBuildingButton]) part.setVisible(ended && crowned);
    this.keepButton = crowned && ended ? { x: VIEW.w / 2 + 115, y: VIEW.h / 2 + 80, w: 200, h: 40 } : null;
    if (s.phase === 'over' && s.endless) {
      this.gameOverTitle.setText('The stone has fallen');
      this.gameOverText.setText(
        `Your crowned shrine climbed the sky\nto ${s.tiersBuilt} tiers, for ${s.favor} favor.\n\nBest ${s.best} tiers.`,
      );
    } else if (s.phase === 'over') {
      this.gameOverTitle.setText('The stone has fallen');
      this.gameOverText.setText(
        `Your shrine stood ${s.tiersBuilt} tier${s.tiersBuilt === 1 ? '' : 's'} tall,\n` +
          `${s.balancedTiers} of them balanced, for ${s.favor} favor.\n\nBest ${s.best} tiers.`,
      );
    } else if (s.phase === 'crowned') {
      this.gameOverTitle.setText('The shrine is crowned!');
      this.gameOverText.setText(`All ${GOAL_TIER} tiers stand,\n${s.balancedTiers} of them balanced, for ${s.favor} favor.\n\nKeep building into the windy sky?`);
    }
  }

  /** The break between tiers: the blessing cards (or, after a wobbly tier, "Build on"), the curse and the shop. */
  private buildOffer() {
    for (const part of this.offerParts) part.destroy();
    this.offerParts = [];
    this.blessingCards = [];
    this.rerollButton = null;
    this.shopButtons = [];
    this.curseToggle = null;
    this.buildOnButton = null;
    const s = this.state;
    if (s.phase !== 'blessing') return;
    const dim = this.add.rectangle(VIEW.w / 2, VIEW.h / 2, VIEW.w, VIEW.h, 0x0c0916, 0.55).setInteractive();
    this.addOffer(dim, ...this.makeShop());
    if (!s.offer.length) {
      const title = this.add.text(OFFER_TITLE.x + 70, OFFER_TITLE.y, `Tier ${s.tier - 1} is wobbly: no blessing this time`, textStyle(20, '#d8cbe8')).setOrigin(0.5);
      this.addOffer(title, ...this.makeBuildOn());
      return;
    }
    const title = this.add.text(OFFER_TITLE.x, OFFER_TITLE.y, `Tier ${s.tier - 1} balanced: choose a blessing`, textStyle(20, '#f3c64e')).setOrigin(0.5);
    this.addOffer(title, ...this.makeReroll());
    if (s.curseOffer) this.addOffer(...this.makeCurse());
    s.offer.forEach((id, i) => {
      const info = BLESSING_INFO[id];
      const x = CARDS.xs[i];
      const { y, w, h } = CARDS;
      const bg = this.add.rectangle(x, y, w, h, 0x2c2446).setStrokeStyle(3, 0x6a5a9a);
      const icon = this.add.graphics().setPosition(x, y - 50);
      this.drawBlessingIcon(icon, id, info.color);
      const name = this.add.text(x, y + 6, info.name, textStyle(17, '#f3c64e')).setOrigin(0.5);
      const text = this.add
        .text(x, y + 30, info.text, { fontFamily: FONT, fontSize: '13px', color: '#e8dcf4', align: 'center', wordWrap: { width: w - 28 }, lineSpacing: 3 })
        .setOrigin(0.5, 0);
      bg.setInteractive({ useHandCursor: true })
        .on('pointerover', () => bg.setStrokeStyle(3, GOLD))
        .on('pointerout', () => bg.setStrokeStyle(3, 0x6a5a9a))
        .on('pointerdown', () => {
          const cursed = this.state.cursed ? this.state.curseOffer : null;
          if (chooseBlessing(this.state, id)) this.onChosen(id, cursed);
        });
      this.addOffer(bg, icon, name, text);
      this.blessingCards.push({ id, x, y, w, h });
    });
  }

  /** Adds parts to the break's layer, fixed on screen above the temple. */
  private addOffer(...parts: UiPart[]) {
    for (const part of parts) this.offerParts.push(part.setScrollFactor(0).setDepth(UI_DEPTH + 10));
  }

  /** The button that spends favor on three new blessings, dimmed when there isn't enough. */
  private makeReroll() {
    const { x, y, w, h } = REROLL;
    const afford = canReroll(this.state);
    const bg = this.add.rectangle(0, 0, w, h, 0x2c2446).setStrokeStyle(3, afford ? GOLD : 0x4a3a6a);
    const coin = this.add.graphics();
    coin.fillStyle(GOLD).fillCircle(-w / 2 + 20, 0, 10);
    coin.fillStyle(shade(GOLD, -0.35)).fillCircle(-w / 2 + 20, 0, 6);
    coin.fillStyle(GOLD).fillRect(-w / 2 + 19, -4, 2, 8);
    const label = this.add.text(-w / 2 + 38, 0, 'Reroll', textStyle(17)).setOrigin(0, 0.5);
    const cost = this.add.text(w / 2 - 12, 0, String(REROLL_COST), textStyle(17, '#f3c64e')).setOrigin(1, 0.5);
    const button = place([bg, coin, label, cost], x, y, afford ? 1 : 0.5);
    bg.setInteractive({ useHandCursor: afford })
      .on('pointerover', () => afford && bg.setFillStyle(0x3a3060))
      .on('pointerout', () => bg.setFillStyle(0x2c2446))
      .on('pointerdown', () => reroll(this.state) && this.rebuildOffer());
    this.rerollButton = { x, y, w, h };
    return button;
  }

  /** The shop's row: one button per item, dimmed when it can't be bought, marked once bought. */
  private makeShop() {
    const s = this.state;
    const title = this.add.text(SHOP_TITLE.x, SHOP_TITLE.y, `Spend favor (you have ${s.favor})`, textStyle(14, '#d8cbe8')).setOrigin(0.5);
    const parts: UiPart[] = [title];
    SHOP.forEach((id, i) => {
      const info = SHOP_INFO[id];
      const { y, w, h } = SHOP_ROW;
      const x = SHOP_ROW.xs[i];
      const bought = s.bought.includes(id);
      const afford = canBuy(s, id);
      const bg = this.add.rectangle(0, 0, w, h, bought ? 0x3a3060 : 0x2c2446).setStrokeStyle(3, bought ? GOLD : afford ? info.color : 0x4a3a6a);
      const icon = this.add.graphics();
      this.drawShopIcon(icon, id, -w / 2 + 20, info.color);
      const label = this.add.text(-w / 2 + 38, 0, info.name, textStyle(14)).setOrigin(0, 0.5);
      const cost = this.add.text(w / 2 - 10, 0, bought ? 'ok' : String(info.cost), textStyle(15, '#f3c64e')).setOrigin(1, 0.5);
      const button = place([bg, icon, label, cost], x, y, afford || bought ? 1 : 0.5);
      bg.setInteractive({ useHandCursor: afford })
        .on('pointerover', () => afford && bg.setFillStyle(0x3a3060))
        .on('pointerout', () => !bought && bg.setFillStyle(0x2c2446))
        .on('pointerdown', () => buy(this.state, id) && this.rebuildOffer());
      parts.push(...button);
      this.shopButtons.push({ id, x, y, w, h });
    });
    return parts;
  }

  /** A small emblem for a shop item at (x, 0). */
  private drawShopIcon(g: Phaser.GameObjects.Graphics, id: ShopId, x: number, color: number) {
    g.fillStyle(color);
    if (id === 'slow') {
      // An hourglass.
      g.fillTriangle(x - 7, -9, x + 7, -9, x, 0).fillTriangle(x - 7, 9, x + 7, 9, x, 0);
      g.fillRect(x - 8, -11, 16, 2).fillRect(x - 8, 9, 16, 2);
    } else if (id === 'wider') {
      g.fillRect(x - 7, -4, 14, 8);
      g.fillTriangle(x - 12, 0, x - 7, -5, x - 7, 5).fillTriangle(x + 12, 0, x + 7, -5, x + 7, 5);
    } else {
      g.fillEllipse(x - 5, 2, 9, 16).fillEllipse(x + 5, 2, 9, 16);
    }
  }

  /** The toggle that takes a curse along with the blessing, for double favor on the next tier. */
  private makeCurse() {
    const s = this.state;
    const info = CURSE_INFO[s.curseOffer!];
    const { x, y, w, h } = CURSE;
    const bg = this.add.rectangle(0, 0, w, h, s.cursed ? 0x4a2446 : 0x2c2446).setStrokeStyle(3, s.cursed ? CURSE_COLOR : 0x6a5a9a);
    const box = this.add.graphics();
    const bx = -w / 2 + 22;
    box.fillStyle(OUTLINE).fillRect(bx - 9, -9, 18, 18);
    box.fillStyle(s.cursed ? CURSE_COLOR : 0x3a3052).fillRect(bx - 7, -7, 14, 14);
    if (s.cursed) {
      // A tick, drawn as two strokes.
      box.lineStyle(3, 0xf3e9d2).lineBetween(bx - 4, 0, bx - 1, 4).lineBetween(bx - 1, 4, bx + 5, -4);
    }
    const label = this.add
      .text(bx + 18, 0, `Take a curse on tier ${s.tier}: ${info.name}, ${info.text}. Earn x${CURSE_MULT} favor.`, textStyle(14, '#e8a0d4'))
      .setOrigin(0, 0.5);
    const button = place([bg, box, label], x, y);
    bg.setInteractive({ useHandCursor: true }).on('pointerdown', () => toggleCurse(this.state) && this.rebuildOffer());
    this.curseToggle = { x, y, w, h };
    return button;
  }

  /** After a wobbly tier: the button that goes back to stacking. */
  private makeBuildOn() {
    const { x, y, w, h } = BUILD_ON;
    const bg = this.add.rectangle(0, 0, w, h, 0x4a3a6a).setStrokeStyle(3, GOLD);
    const label = this.add.text(0, 0, 'Build on', textStyle(20)).setOrigin(0.5);
    bg.setInteractive({ useHandCursor: true })
      .on('pointerover', () => bg.setFillStyle(0x6a5a9a))
      .on('pointerout', () => bg.setFillStyle(0x4a3a6a))
      .on('pointerdown', () => {
        if (buildOn(this.state) && this.state.tier === GILDED_TIER) this.announce([`Tier ${GILDED_TIER} is gilded`, `x${GILDED_MULT} favor`]);
      });
    this.buildOnButton = { x, y, w, h };
    return place([bg, label], x, y);
  }

  /**
   * Has `refresh` rebuild the break's layer on the next frame after a reroll, a buy or the curse
   * toggle, and not while the tapped button is still handling its tap.
   */
  private rebuildOffer() {
    this.offerKey = '#';
  }

  /** Redraws the top stone after it grew (Broad Stones, a wider stone), with its lanterns if it has them. */
  private redrawTop() {
    const i = this.state.stones.length - 1;
    const top = this.state.stones[i];
    this.stoneViews[i].clear();
    drawStone(this.stoneViews[i], top.w, top.tier, top.perfect, top.kind);
    this.glow(top.x, this.worldY(i * STONE_H), top.w);
    if (this.ornaments.has(top.tier) && i === top.tier * STONES_PER_TIER - 1) this.ornament(top.tier);
  }

  private onChosen(id: BlessingId, cursed: string | null) {
    if (id === 'broad') this.redrawTop();
    const gilded = this.state.tier === GILDED_TIER;
    const curse = cursed ? `Cursed with ${CURSE_INFO[this.state.curse!.id].name}: x${CURSE_MULT} favor` : null;
    this.announce(
      gilded
        ? [`${BLESSING_INFO[id].name} is yours`, curse ?? `Tier ${GILDED_TIER} is gilded: x${GILDED_MULT} favor`]
        : [`${BLESSING_INFO[id].name} is yours`, curse ?? ''].filter(Boolean),
    );
  }

  /** Past the crown: the crown comes off so the temple can climb on. */
  private onKeepBuilding() {
    this.crown?.destroy();
    this.crown = null;
    this.announce(['Into the endless sky', 'Mind the gusts']);
  }

  /** A small emblem for each blessing, centred on the graphics' origin. */
  private drawBlessingIcon(g: Phaser.GameObjects.Graphics, id: BlessingId, color: number) {
    g.fillStyle(color, 0.2).fillCircle(0, 0, 36);
    g.lineStyle(2, color).strokeCircle(0, 0, 36);
    g.fillStyle(color);
    switch (id) {
      case 'broad':
        g.fillRect(-26, -6, 52, 14);
        g.fillTriangle(-34, 1, -26, -7, -26, 9).fillTriangle(34, 1, 26, -7, 26, 9);
        break;
      case 'calm':
        for (const [y, w] of [[-12, 40], [0, 30], [12, 36]] as const) g.fillRect(-w / 2, y - 2, w, 4);
        g.fillCircle(18, -12, 4);
        break;
      case 'steady':
        g.fillRect(-14, 6, 28, 12);
        g.fillTriangle(-10, -22, 10, -22, 0, 2);
        break;
      case 'golden':
        g.fillCircle(0, 0, 16);
        g.fillStyle(shade(color, -0.35)).fillCircle(0, 0, 10);
        g.fillStyle(color).fillRect(-2, -7, 4, 14);
        break;
      case 'grace':
        g.fillEllipse(-12, 4, 18, 28).fillEllipse(12, 4, 18, 28);
        g.fillStyle(0x2c2446).fillRect(-22, -22, 44, 14);
        g.fillStyle(color).fillRect(-12, -14, 24, 8);
        break;
    }
    if (settings.reduceMotion) return;
    this.tweens.add({ targets: g, scale: 1.06, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }
}
