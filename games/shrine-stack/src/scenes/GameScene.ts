import Phaser from 'phaser';
import { settings } from '../../../../shared/settings';
import { BLESSING_INFO, BLESSINGS, type BlessingId } from '../game/blessings';
import { loadBest, saveBest } from '../game/save';
import {
  chooseBlessing,
  drop,
  newGame,
  PLINTH_W,
  stackHeight,
  STONE_H,
  STONES_PER_TIER,
  tick,
  TOWER_X,
  type GameEvent,
  type GameState,
} from '../game/state';
import { makeButton } from '../ui/Button';
import { CARDS, FONT, PANEL, PLINTH_Y, TOP_SCREEN_Y, UI_DEPTH, VIEW } from './layout';

/** The longest step of game time one frame may take, so a hidden tab doesn't drop a stone through the temple. */
const MAX_STEP_MS = 100;
/** How quickly the camera catches up with the temple's top: the time to close about two thirds of the gap. */
const CAMERA_MS = 180;
const POPUP_MS = 900;
const DEBRIS_MS = 1100;
const BANNER_MS = 2200;

/** Stone colours, one per tier, repeating. */
const TIER_COLORS = [0xd8b58a, 0xb9c3cc, 0xe3c98f, 0xa9c49a, 0xd6a7a0, 0xc2b0dc];
const OUTLINE = 0x2a2036;
const GOLD = 0xf3c64e;

const textStyle = (size: number, color = '#f3e9d2') => ({
  fontFamily: FONT,
  fontSize: `${size}px`,
  color,
  stroke: '#14101f',
  strokeThickness: 3,
});

/** Where a blessing card is on screen; read by the playthrough test. */
export interface BlessingCard {
  id: BlessingId;
  x: number;
  y: number;
  w: number;
  h: number;
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

/** Draws a stone `w` wide with its bottom middle at the graphics' origin. */
function drawStone(g: Phaser.GameObjects.Graphics, w: number, tier: number, perfect: boolean) {
  const color = TIER_COLORS[(tier - 1) % TIER_COLORS.length];
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
  private bestText!: Phaser.GameObjects.Text;
  private blessingsText!: Phaser.GameObjects.Text;
  private hint!: Phaser.GameObjects.Text;
  private banner!: Phaser.GameObjects.Container;
  private bannerText!: Phaser.GameObjects.Text;
  private offerLayer!: Phaser.GameObjects.Container;
  private offerKey = '';
  private gameOver!: Phaser.GameObjects.Container;
  private gameOverText!: Phaser.GameObjects.Text;

  constructor() {
    super('Game');
  }

  create() {
    this.state = newGame(loadBest());
    this.lastFrame = null;
    this.stoneViews = [];
    this.ornaments = new Map();
    this.blessingCards = [];
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

    this.offerLayer = this.add.container(0, 0).setScrollFactor(0).setDepth(UI_DEPTH + 10);
    this.createGameOver();
    this.refresh();
  }

  update(time: number) {
    // Game time from the frame's own timestamp rather than Phaser's smoothed delta.
    const dt = this.lastFrame === null ? 0 : Phaser.Math.Clamp(time - this.lastFrame, 0, MAX_STEP_MS);
    this.lastFrame = time;
    const s = this.state;
    tick(s, dt);
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
    for (let y = 260; y > -6000; y -= 110 + rand() * 90) {
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
    this.builtText = fixed(this.add.text(PANEL.x + 16, PANEL.y + 132, '', textStyle(14, '#d8cbe8')));
    this.bestText = fixed(this.add.text(PANEL.x + 16, PANEL.y + 152, '', textStyle(14, '#d8cbe8')));
    fixed(this.add.text(PANEL.x + 16, PANEL.y + 188, 'Blessings', textStyle(16, '#f3c64e')));
    this.blessingsText = fixed(
      this.add.text(PANEL.x + 16, PANEL.y + 212, '', { fontFamily: FONT, fontSize: '13px', color: '#f3e9d2', lineSpacing: 6 }),
    );
    fixed(
      this.add.text(PANEL.x + 16, PANEL.y + PANEL.h - 112, 'Tap to drop a stone.\nOverhangs break off.\nThree stones make a\ntier; land each one\nthree quarters on to\nbalance it.', {
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
    const title = this.add.text(VIEW.w / 2, VIEW.h / 2 - 90, 'The stone has fallen', textStyle(30, '#f3c64e')).setOrigin(0.5);
    this.gameOverText = this.add
      .text(VIEW.w / 2, VIEW.h / 2 - 10, '', { fontFamily: FONT, fontSize: '16px', color: '#f1e3c6', align: 'center' })
      .setOrigin(0.5);
    const again = makeButton(this, VIEW.w / 2, VIEW.h / 2 + 80, 'Build again', () => this.scene.restart());
    this.gameOver = pin(this.add.container(0, 0, [dim, panel, title, this.gameOverText, again]))
      .setDepth(UI_DEPTH + 20)
      .setVisible(false);
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
      drawStone(g, stone.w, stone.tier, stone.perfect);
      this.stoneViews.push(g);
      for (const piece of e.cut) this.debris(piece.x, this.worldY(i * STONE_H), piece.w, stone.tier);
      const gained = s.favorPerStone + (e.drop.perfect ? 2 : 0);
      this.popup(stone.x, this.worldY((i + 1) * STONE_H) - 6, e.drop.perfect ? `Perfect! +${gained}` : `+${gained}`, e.drop.perfect);
      if (e.drop.perfect) this.glow(stone.x, this.worldY(i * STONE_H), stone.w);
    } else if (e.type === 'missed') {
      this.debris(e.drop.x, this.worldY(stackHeight(s)), e.drop.w, s.tier);
      this.cameras.main.shake(200, 0.006);
      if (e.drop.caught) this.announce(["Mason's Grace", 'The stone is caught: try again']);
      if (s.phase === 'over') saveBest(s.best);
    } else {
      if (e.balanced) this.ornament(e.tier);
      // A balanced tier's cards say so themselves.
      if (!e.balanced) this.announce([`Tier ${e.tier} is wobbly`, 'No blessing this time']);
      saveBest(s.best);
    }
  }

  /** A broken piece or a missed stone, tumbling down off the temple. */
  private debris(x: number, y: number, w: number, tier: number) {
    const g = this.add.graphics().setDepth(6).setPosition(x, y);
    drawStone(g, w, tier, false);
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
    const key = `${m.w}|${s.tier}`;
    if (key !== this.movingKey) {
      this.movingKey = key;
      this.moving.clear();
      drawStone(this.moving, m.w, s.tier, false);
    }
    const y = this.worldY(m.h);
    this.moving.setPosition(m.x, y);
    const top = this.worldY(stackHeight(s));
    this.guide.fillStyle(0xf3e9d2, 0.35);
    for (let gy = y + 6; gy < top - 2; gy += 10) this.guide.fillRect(Math.round(m.x) - 1, gy, 2, 5);
  }

  private refresh() {
    const s = this.state;
    this.tierText.setText(`Tier ${s.tier}`);
    this.pips.clear();
    for (let i = 0; i < STONES_PER_TIER; i++) {
      const x = PANEL.x + 16 + i * 30;
      this.pips.fillStyle(OUTLINE).fillRect(x, PANEL.y + 78, 24, 14);
      this.pips.fillStyle(i < s.inTier ? (s.wobbly ? 0xb08a6a : TIER_COLORS[(s.tier - 1) % TIER_COLORS.length]) : 0x3a3052).fillRect(x + 2, PANEL.y + 80, 20, 10);
    }
    this.favorText.setText(`Favor ${s.favor}`);
    this.builtText.setText(`Tiers built ${s.tiersBuilt}`);
    this.bestText.setText(`Best ${s.best} tiers`);
    const counts = BLESSINGS.filter((b) => s.blessings.includes(b)).map((b) => {
      const n = s.blessings.filter((x) => x === b).length;
      return `${BLESSING_INFO[b].name}${n > 1 ? ` x${n}` : ''}`;
    });
    if (s.grace) counts.push(`(${s.grace} stone${s.grace > 1 ? 's' : ''} in grace)`);
    this.blessingsText.setText(counts.length ? counts : ['None yet']);
    // The hint shows until the first drop, while the temple is still too short to reach it.
    this.hint.setVisible(s.dropped === 0 && s.phase === 'swinging');

    const offerKey = s.phase === 'blessing' ? s.offer.join(',') : '';
    if (offerKey !== this.offerKey) {
      this.offerKey = offerKey;
      this.buildOffer();
    }

    this.gameOver.setVisible(s.phase === 'over');
    if (s.phase === 'over') {
      this.gameOverText.setText(
        `Your shrine stood ${s.tiersBuilt} tier${s.tiersBuilt === 1 ? '' : 's'} tall,\n` +
          `${s.balancedTiers} of them balanced, for ${s.favor} favor.\n\nBest ${s.best} tiers.`,
      );
    }
  }

  /** The blessing cards for the current offer, or none. */
  private buildOffer() {
    this.offerLayer.removeAll(true);
    this.blessingCards = [];
    const s = this.state;
    if (s.phase !== 'blessing') return;
    const dim = this.add.rectangle(VIEW.w / 2, VIEW.h / 2, VIEW.w, VIEW.h, 0x0c0916, 0.55).setInteractive();
    const title = this.add.text(CARDS.xs[1], CARDS.y - CARDS.h / 2 - 34, `Tier ${s.tier - 1} is balanced: choose a blessing`, textStyle(20, '#f3c64e')).setOrigin(0.5);
    this.offerLayer.add([dim, title]);
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
        .on('pointerdown', () => chooseBlessing(this.state, id) && this.onChosen(id));
      this.offerLayer.add([bg, icon, name, text]);
      this.blessingCards.push({ id, x, y, w, h });
    });
    pin(this.offerLayer);
  }

  private onChosen(id: BlessingId) {
    if (id === 'broad') {
      const i = this.state.stones.length - 1;
      const top = this.state.stones[i];
      this.stoneViews[i].clear();
      drawStone(this.stoneViews[i], top.w, top.tier, top.perfect);
      this.glow(top.x, this.worldY(i * STONE_H), top.w);
      // Blessings only follow a balanced tier, so the top stone carries its lanterns.
      this.ornament(top.tier);
    }
    this.announce([BLESSING_INFO[id].name, 'is yours']);
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
