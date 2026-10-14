import Phaser from 'phaser';
import { settings } from '../../../../shared/settings';
import { drawCastle, drawCoin, drawHearth, drawJar, drawLantern, drawMoth, mix, poly, seeded, type Pt } from '../art/lowpoly';
import { LANTERN_SPOTS } from '../game/places';
import { loadBest, saveBest } from '../game/save';
import {
  ALL_LIT_BONUS,
  buy,
  DUSK_MS,
  LIVES,
  mothLightMs,
  newGame,
  nextCost,
  nextDusk,
  PAY_PER_LANTERN,
  requiredFor,
  send,
  tick,
  UPGRADE_IDS,
  UPGRADES,
  type GameState,
  type UpgradeId,
} from '../game/state';
import { makeButton } from '../ui/Button';
import { DUSK_BAR, FONT, HUD, LANTERN_HIT, NEXT_BUTTON, NIGHT_PANEL, SHOP, UI_DEPTH, VIEW } from './layout';

/** The longest step of game time one frame may take, so a stalled tab doesn't skip the dusk. */
const MAX_STEP_MS = 100;
/** How long a coin popup floats up at nightfall, in milliseconds. */
const POPUP_MS = 1200;
/** The darkness over the castle at nightfall; it deepens through dusk. */
const NIGHT_DARKNESS = 0.62;
/** How long night shows the lit castle and its coins before the night panel opens, in milliseconds. */
const PANEL_DELAY_MS = 1500;

const SKY = {
  duskTop: 0x3a4b8c,
  duskBottom: 0xf29a5c,
  nightTop: 0x070a1c,
  nightBottom: 0x1c2046,
};

const textStyle = (size: number, color = '#f3e9d2') => ({
  fontFamily: FONT,
  fontSize: `${size}px`,
  color,
  stroke: '#0b0c18',
  strokeThickness: 3,
});

/** Where a button is on screen; read by the playthrough test. */
export interface ButtonSpot {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface ShopParts {
  bg: Phaser.GameObjects.Rectangle;
  level: Phaser.GameObjects.Text;
  cost: Phaser.GameObjects.Text;
}

export class GameScene extends Phaser.Scene {
  /** The game being played; read by the playthrough test. */
  state!: GameState;
  /** The upgrade buttons in the night panel, by id; read by the playthrough test. */
  shopButtons: (ButtonSpot & { id: UpgradeId })[] = [];
  /** The night panel's "Next dusk" button; read by the playthrough test. */
  nextButton: ButtonSpot = { x: NEXT_BUTTON.x, y: NEXT_BUTTON.y, w: 200, h: 40 };
  private clock = 0;
  /** When night fell, on the scene's clock. */
  private nightAt = 0;
  private lastFrame: number | null = null;
  private sky!: Phaser.GameObjects.Graphics;
  private stars!: Phaser.GameObjects.Graphics;
  private sun!: Phaser.GameObjects.Graphics;
  private dark!: Phaser.GameObjects.Rectangle;
  private glows: Phaser.GameObjects.Image[] = [];
  /** Lanterns, the lit ones and the dark ones, drawn each frame. */
  private lamps!: Phaser.GameObjects.Graphics;
  /** Oil bars, waiting rings and the moth's lighting ring, drawn each frame over the lanterns. */
  private marks!: Phaser.GameObjects.Graphics;
  /** The moths, drawn each frame. */
  private mothG!: Phaser.GameObjects.Graphics;
  /** The HUD's hearths and coin icon, drawn each frame. */
  private hudIcons!: Phaser.GameObjects.Graphics;
  private nightText!: Phaser.GameObjects.Text;
  private coinsText!: Phaser.GameObjects.Text;
  private litText!: Phaser.GameObjects.Text;
  private duskText!: Phaser.GameObjects.Text;
  private duskBar!: Phaser.GameObjects.Graphics;
  private nightPanel!: Phaser.GameObjects.Container;
  private nightTitle!: Phaser.GameObjects.Text;
  private tallyText!: Phaser.GameObjects.Text;
  private shop = new Map<UpgradeId, ShopParts>();
  private gameOver!: Phaser.GameObjects.Container;
  private gameOverText!: Phaser.GameObjects.Text;

  constructor() {
    super('Game');
  }

  create() {
    this.state = newGame(loadBest());
    this.createWorld();
    this.createHud();
    this.createNightPanel();
    this.createGameOver();
  }

  private createWorld() {
    this.sky = this.add.graphics();
    this.stars = this.add.graphics();
    const rnd = seeded(5);
    for (let i = 0; i < 70; i++) {
      const size = rnd() < 0.2 ? 3 : 2;
      this.stars.fillStyle(0xf6f0d8, 0.5 + rnd() * 0.5).fillRect(Math.floor(rnd() * VIEW.w), HUD.h + Math.floor(rnd() * 300), size, size);
    }
    this.sun = this.add.graphics();
    drawCastle(this.add.graphics());
    this.dark = this.add.rectangle(0, 0, VIEW.w, VIEW.h, 0x060818, 0).setOrigin(0).setDepth(3);
    const jar = this.add.graphics().setDepth(6);
    drawJar(jar);

    LANTERN_SPOTS.forEach(({ x, y }, i) => {
      this.glows.push(this.add.image(x, y, 'glow').setDepth(4).setScale(1.3));
      this.add
        .zone(x, y, LANTERN_HIT.w, LANTERN_HIT.h)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => send(this.state, i));
    });
    this.lamps = this.add.graphics().setDepth(5);
    this.marks = this.add.graphics().setDepth(6);
    this.mothG = this.add.graphics().setDepth(7);
  }

  private createHud() {
    this.add.rectangle(0, 0, VIEW.w, HUD.h, 0x0b0c18, 0.75).setOrigin(0).setDepth(UI_DEPTH);
    this.nightText = this.add.text(14, 10, '', textStyle(18, '#f3c64e')).setDepth(UI_DEPTH);
    this.hudIcons = this.add.graphics().setDepth(UI_DEPTH);
    this.coinsText = this.add.text(236, 10, '', textStyle(18)).setDepth(UI_DEPTH);
    this.duskBar = this.add.graphics().setDepth(UI_DEPTH);
    this.duskText = this.add
      .text(DUSK_BAR.x + DUSK_BAR.w / 2, DUSK_BAR.y + DUSK_BAR.h / 2, '', textStyle(12))
      .setOrigin(0.5)
      .setDepth(UI_DEPTH + 1);
    this.litText = this.add.text(VIEW.w - 14, 10, '', textStyle(18)).setOrigin(1, 0).setDepth(UI_DEPTH);
  }

  private createNightPanel() {
    const { x, y, w, h } = NIGHT_PANEL;
    const dim = this.add.rectangle(VIEW.w / 2, VIEW.h / 2, VIEW.w, VIEW.h, 0x000000, 0.01).setInteractive();
    const panel = this.add.rectangle(x, y, w, h, 0x1a1c33, 0.94).setStrokeStyle(4, 0xc9a040);
    this.nightTitle = this.add.text(x, y - h / 2 + 30, '', textStyle(26, '#f3c64e')).setOrigin(0.5);
    this.tallyText = this.add
      .text(x, y - h / 2 + 90, '', { fontFamily: FONT, fontSize: '15px', color: '#f1e3c6', align: 'center', lineSpacing: 6 })
      .setOrigin(0.5);
    const parts: Phaser.GameObjects.GameObject[] = [dim, panel, this.nightTitle, this.tallyText];
    UPGRADE_IDS.forEach((id, i) => {
      const bx = SHOP.xs[i % 2];
      const by = SHOP.ys[Math.floor(i / 2)];
      const bg = this.add.rectangle(bx, by, SHOP.w, SHOP.h, 0x2a2c4a).setStrokeStyle(3, 0x4d5080);
      const name = this.add.text(bx - SHOP.w / 2 + 12, by - SHOP.h / 2 + 8, UPGRADES[id].name, textStyle(17, '#f3c64e'));
      const level = this.add.text(bx + SHOP.w / 2 - 12, by - SHOP.h / 2 + 10, '', { fontFamily: FONT, fontSize: '12px', color: '#a9b0d8' }).setOrigin(1, 0);
      const blurb = this.add.text(bx - SHOP.w / 2 + 12, by - SHOP.h / 2 + 32, UPGRADES[id].blurb, { fontFamily: FONT, fontSize: '12px', color: '#d8d2c0' });
      const cost = this.add.text(bx + SHOP.w / 2 - 12, by + SHOP.h / 2 - 20, '', textStyle(13, '#f3c64e')).setOrigin(1, 0);
      bg.setInteractive({ useHandCursor: true }).on('pointerdown', () => buy(this.state, id));
      this.shop.set(id, { bg, level, cost });
      this.shopButtons.push({ id, x: bx, y: by, w: SHOP.w, h: SHOP.h });
      parts.push(bg, name, level, blurb, cost);
    });
    parts.push(makeButton(this, NEXT_BUTTON.x, NEXT_BUTTON.y, 'Next dusk', () => nextDusk(this.state)));
    this.nightPanel = this.add.container(0, 0, parts).setDepth(UI_DEPTH + 10).setVisible(false);
  }

  private createGameOver() {
    const dim = this.add.rectangle(VIEW.w / 2, VIEW.h / 2, VIEW.w, VIEW.h, 0x000000, 0.6).setInteractive();
    const panel = this.add.rectangle(VIEW.w / 2, VIEW.h / 2, 520, 240, 0x1a1c33).setStrokeStyle(4, 0x8a5a32);
    const title = this.add.text(VIEW.w / 2, VIEW.h / 2 - 80, 'The keep went dark', textStyle(28, '#f3c64e')).setOrigin(0.5);
    this.gameOverText = this.add
      .text(VIEW.w / 2, VIEW.h / 2 - 10, '', { fontFamily: FONT, fontSize: '16px', color: '#f1e3c6', align: 'center' })
      .setOrigin(0.5);
    const again = makeButton(this, VIEW.w / 2, VIEW.h / 2 + 72, 'New keep', () => this.restart());
    this.gameOver = this.add.container(0, 0, [dim, panel, title, this.gameOverText, again]).setDepth(UI_DEPTH + 20).setVisible(false);
  }

  update(time: number) {
    // Game time from the frame's own timestamp rather than Phaser's smoothed delta, which holds
    // every step to 16ms while the page is not in focus.
    const dt = this.lastFrame === null ? 0 : Phaser.Math.Clamp(time - this.lastFrame, 0, MAX_STEP_MS);
    this.lastFrame = time;
    this.clock += dt;
    const s = this.state;
    const phase = s.phase;
    tick(s, dt);
    if (s.phase !== phase) {
      saveBest(s.best);
      this.nightAt = this.clock;
      this.payout();
    }
    this.drawSky();
    this.drawLanterns();
    this.drawMoths();
    this.drawHud();
    this.drawPanels();
  }

  /** How far dusk has gone, from 0 at its start to 1 once night has fallen. */
  private dusk() {
    return this.state.phase === 'dusk' ? 1 - this.state.duskMs / DUSK_MS : 1;
  }

  private drawSky() {
    const p = this.dusk();
    const top = mix(SKY.duskTop, SKY.nightTop, p);
    const bottom = mix(SKY.duskBottom, SKY.nightBottom, p);
    const g = this.sky.clear();
    const bands = 24;
    const h = Math.ceil((VIEW.h - HUD.h) / bands);
    for (let i = 0; i < bands; i++) g.fillStyle(mix(top, bottom, i / (bands - 1))).fillRect(0, HUD.h + i * h, VIEW.w, h);
    this.stars.setAlpha(Math.max(0, p * 1.4 - 0.4));
    this.drawSun(760, 90 + p * 420, 34, mix(0xffd27a, 0xe0584f, p));
    this.dark.setFillStyle(0x060818, NIGHT_DARKNESS * p);
  }

  /** The low-poly sun: a 14-sided disc with a lit upper-left half and a shaded lower-right half. */
  private drawSun(x: number, y: number, r: number, color: number) {
    const ring = (rad: number, from: number, to: number): Pt[] => {
      const pts: Pt[] = [];
      for (let i = 0; i <= 7; i++) {
        const a = from + ((to - from) * i) / 7;
        pts.push([x + Math.cos(a) * rad, y + Math.sin(a) * rad]);
      }
      return pts;
    };
    const g = this.sun.clear();
    poly(g, ring(r, 0, Math.PI * 2).slice(0, -1), mix(color, 0x000000, 0.12));
    // The lit half is the left side of the disc, the shaded half the right.
    poly(g, [[x, y], ...ring(r * 0.94, -Math.PI / 2, -Math.PI * 1.5)], mix(color, 0xffffff, 0.18));
    poly(g, [[x, y], ...ring(r * 0.94, -Math.PI / 2, Math.PI / 2)], color);
  }

  private drawLanterns() {
    const s = this.state;
    const lamps = this.lamps.clear();
    const g = this.marks.clear();
    this.glows.forEach((glow, i) => {
      const lantern = s.lanterns[i];
      glow.setVisible(!!lantern?.lit);
      if (!lantern) return;
      // The flicker wavers the flame and the glow; reduce motion holds them still.
      const flicker = settings.reduceMotion ? 0 : Math.sin(this.clock / 90 + i * 1.7);
      drawLantern(lamps, lantern.x, lantern.y, lantern.lit, flicker);
      if (lantern.lit) {
        glow.setScale(1.3 + flicker * 0.06).setAlpha(0.55 + 0.4 * Math.min(1, lantern.oilMs / 4000));
        // The oil left, under the lantern.
        const f = Phaser.Math.Clamp(lantern.oilMs / lantern.oilMaxMs, 0, 1);
        g.fillStyle(0x0b0c18, 0.85).fillRect(lantern.x - 18, lantern.y + 22, 36, 6);
        g.fillStyle(f < 0.25 ? 0xe08a3c : 0xf3c64e).fillRect(lantern.x - 17, lantern.y + 23, Math.round(34 * f), 4);
      } else if (!lantern.claimed && s.phase === 'dusk') {
        // A faint ring marks a dark lantern waiting for a moth; an amber one marks a queued tap.
        const queued = s.queue.includes(i);
        g.lineStyle(2, queued ? 0xf3c64e : 0xf3e9d2, queued ? 0.9 : 0.35).strokeCircle(lantern.x, lantern.y, 22);
      }
      const moth = s.moths.find((m) => m.target === i && m.task === 'lighting');
      if (moth) {
        const f = Math.min(1, moth.lightingMs / mothLightMs(s, moth));
        g.lineStyle(3, 0xfff1b0, 0.95).beginPath().arc(lantern.x, lantern.y, 22, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * f).strokePath();
      }
    });
  }

  private drawMoths() {
    const g = this.mothG.clear();
    this.state.moths.forEach((m, i) => {
      // Wings up on the even flap frames; reduce motion holds them up and stops the bobbing.
      const still = settings.reduceMotion;
      const wingsUp = still || Math.floor(this.clock / 90 + i) % 2 === 0;
      const bob = still || m.task === 'lighting' ? 0 : Math.sin(this.clock / 260 + i * 2) * 3;
      drawMoth(g, m.x, m.y + bob, m.kind, wingsUp);
    });
  }

  private drawHud() {
    const s = this.state;
    this.nightText.setText(`Night ${s.night}`);
    const icons = this.hudIcons.clear();
    for (let i = 0; i < LIVES; i++) drawHearth(icons, 130 + i * 22, 20, i < s.lives);
    drawCoin(icons, 222, 20, 8);
    this.coinsText.setText(String(s.coins));
    const lit = s.lanterns.filter((l) => l.lit).length;
    this.litText.setText(`Lit ${lit}/${s.lanterns.length}  need ${requiredFor(s.lanterns.length)}`);
    // setColor always redraws the text, so only set it when it changes.
    const litColour = lit >= requiredFor(s.lanterns.length) ? '#f3c64e' : '#f3e9d2';
    if (this.litText.style.color !== litColour) this.litText.setColor(litColour);

    const f = s.phase === 'dusk' ? s.duskMs / DUSK_MS : 0;
    const { x, y, w, h } = DUSK_BAR;
    this.duskBar.clear();
    this.duskBar.fillStyle(0x05060e).fillRect(x, y, w, h);
    this.duskBar.fillStyle(0x2a2c4a).fillRect(x + 2, y + 2, w - 4, h - 4);
    this.duskBar.fillStyle(0xe8a050).fillRect(x + 2, y + 2, Math.round((w - 4) * f), h - 4);
    const queued = s.queue.length ? ` · ${s.queue.length} queued` : '';
    this.duskText.setText(s.phase === 'dusk' ? `Nightfall in ${Math.ceil(s.duskMs / 1000)}s${queued}` : 'Night');
  }

  /** True once the night panel or the game-over panel is open; read by the playthrough test. */
  get panelOpen() {
    return this.state.phase !== 'dusk' && this.clock - this.nightAt >= PANEL_DELAY_MS;
  }

  private drawPanels() {
    const s = this.state;
    this.nightPanel.setVisible(s.phase === 'night' && this.panelOpen);
    this.gameOver.setVisible(s.phase === 'over' && this.panelOpen);
    const r = s.report;
    if (s.phase === 'night' && r) {
      this.nightTitle.setText(`Night ${s.night} falls`);
      const verdict = r.lostHearth
        ? 'Too dark: one of the hearths went out.'
        : r.lit === r.count
          ? `Every lantern lit: +${ALL_LIT_BONUS} bonus!`
          : 'The keep holds the dark at bay.';
      this.tallyText.setText([`${r.lit} of ${r.count} lanterns lit (${r.required} needed)`, `+${r.earned} coins`, verdict]);
      for (const [id, parts] of this.shop) {
        const cost = nextCost(s, id);
        const affordable = cost !== null && s.coins >= cost;
        parts.bg.setFillStyle(affordable ? 0x3a3d66 : 0x22243c).setStrokeStyle(3, affordable ? 0xf3c64e : 0x4d5080);
        parts.level.setText(`Lv ${s.levels[id]}/${UPGRADES[id].costs.length}`);
        parts.cost.setText(cost === null ? 'Maxed' : `${cost} coins`);
        const costColour = affordable ? '#f3c64e' : '#8a8aa0';
        if (parts.cost.style.color !== costColour) parts.cost.setColor(costColour);
      }
    }
    if (s.phase === 'over') {
      this.gameOverText.setText(`The last hearth went out on night ${s.night}.\nNights kept: ${s.kept}.\n\nBest: ${s.best} nights.`);
    }
  }

  /** Coins float up from every lantern still lit at nightfall. */
  private payout() {
    const r = this.state.report;
    if (!r) return;
    for (const lantern of this.state.lanterns) {
      if (!lantern.lit) continue;
      const text = this.add
        .text(lantern.x, lantern.y - 28, `+${PAY_PER_LANTERN}`, textStyle(18, '#f3c64e'))
        .setOrigin(0.5)
        .setDepth(UI_DEPTH - 1);
      this.tweens.add({ targets: text, y: lantern.y - 70, alpha: 0, duration: POPUP_MS, ease: 'Quad.easeIn', onComplete: () => text.destroy() });
    }
  }

  private restart() {
    this.state = newGame(loadBest());
  }
}
