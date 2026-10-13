import Phaser from 'phaser';
import { iconTexture } from '../art/icons';
import type { KnightPose } from '../art/knight';
import { FROST, GOLD, RED } from '../art/palette';
import { BOONS, type BoonId } from '../game/boons';
import { loadBest, saveBest } from '../game/save';
import { jump, newRun, pick, slide, tick } from '../game/sim';
import { metres, stats, type GameState } from '../game/state';
import { BoonCards } from '../ui/BoonCards';
import { makeButton } from '../ui/Button';
import { FONT, GROUND_Y, HUD_HEIGHT, RUNNER_X, TAP_SPLIT_Y, UI_DEPTH, VIEW } from './layout';

/** Longest simulated step, so a backgrounded tab doesn't jump the run forward. */
const MAX_STEP_MS = 100;
/** Distance covered per frame of the running animation. */
const STRIDE_PX = 22;
/** How far into the first stage the controls hint shows. */
const HINT_UNTIL = 640;

const textStyle = (size: number, color = '#f3e9d2') => ({
  fontFamily: FONT,
  fontSize: `${size}px`,
  color,
  stroke: '#1a1216',
  strokeThickness: 3,
});

/** Where the knight's feet are in each texture, as a fraction of its size. */
const FEET = { stand: 22 / 24, slide: 9 / 11 };

export class GameScene extends Phaser.Scene {
  /** The run being played; read by the playthrough test. */
  state!: GameState;
  /** The boon cards at a checkpoint; the playthrough test reads where they are to tap one. */
  boonCards!: BoonCards;
  private traps = new Map<number, Phaser.GameObjects.Image>();
  private coins = new Map<number, Phaser.GameObjects.Image>();
  private far!: Phaser.GameObjects.TileSprite;
  private near!: Phaser.GameObjects.TileSprite;
  private ground!: Phaser.GameObjects.TileSprite;
  private knight!: Phaser.GameObjects.Image;
  private flag!: Phaser.GameObjects.Image;
  private fx!: Phaser.GameObjects.Graphics;
  private hud!: Phaser.GameObjects.Graphics;
  private hearts: Phaser.GameObjects.Image[] = [];
  private stageText!: Phaser.GameObjects.Text;
  private statsText!: Phaser.GameObjects.Text;
  private hint!: Phaser.GameObjects.Container;
  private gameOver!: Phaser.GameObjects.Container;
  private gameOverText!: Phaser.GameObjects.Text;
  private clock = 0;
  private lastFrame: number | null = null;

  constructor() {
    super('Game');
  }

  create() {
    this.traps.clear();
    this.coins.clear();
    this.state = newRun(loadBest());

    this.add.image(0, 0, 'sky').setOrigin(0);
    const farH = this.textures.get('far').getSourceImage().height;
    const nearH = this.textures.get('near').getSourceImage().height;
    this.far = this.add.tileSprite(0, GROUND_Y - farH + 20, VIEW.w, farH, 'far').setOrigin(0);
    this.near = this.add.tileSprite(0, GROUND_Y - nearH + 6, VIEW.w, nearH, 'near').setOrigin(0);
    this.ground = this.add.tileSprite(0, GROUND_Y, VIEW.w, VIEW.h - GROUND_Y, 'ground').setOrigin(0).setDepth(1);
    this.flag = this.add.image(0, GROUND_Y + 2, 'checkpoint').setOrigin(7 / 36, 1).setDepth(3);
    this.knight = this.add.image(RUNNER_X, GROUND_Y, 'knight-run0').setDepth(5);
    this.fx = this.add.graphics().setDepth(6);
    this.createHud();
    this.createHint();
    this.createGameOver();
    this.boonCards = new BoonCards(this, (id) => this.pick(id));

    // A tap in the top half of the screen jumps, in the bottom half slides. Taps on a card or a
    // button are theirs alone.
    this.input.on('pointerdown', (p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (over.length > 0) return;
      if (p.y < TAP_SPLIT_Y) jump(this.state);
      else slide(this.state);
    });
    const keys = this.input.keyboard;
    keys?.on('keydown-SPACE', () => jump(this.state));
    keys?.on('keydown-UP', () => jump(this.state));
    keys?.on('keydown-W', () => jump(this.state));
    keys?.on('keydown-DOWN', () => slide(this.state));
    keys?.on('keydown-S', () => slide(this.state));
  }

  update(time: number) {
    // Game time from the frame's own timestamp rather than Phaser's smoothed delta, which holds
    // every step to 16ms while the page is not in focus.
    const dt = this.lastFrame === null ? 0 : Phaser.Math.Clamp(time - this.lastFrame, 0, MAX_STEP_MS);
    this.lastFrame = time;
    const s = this.state;
    const phase = s.phase;
    tick(s, dt);
    this.clock += dt;
    if (s.phase !== phase && s.phase !== 'running') saveBest(s.best);

    this.drawWorld();
    this.drawKnight();
    this.drawEffects();
    this.drawHud();
    this.boonCards.show(s.phase === 'checkpoint' ? s.choices : null, s.ranks, s.stage);
    this.gameOver.setVisible(s.phase === 'over');
    if (s.phase === 'over') {
      const boons = (Object.entries(s.ranks) as [BoonId, number][]).map(([id, n]) => (n > 1 ? `${BOONS[id].name} x${n}` : BOONS[id].name));
      this.gameOverText.setText(
        `Fell at ${metres(s.distance)} m on stage ${s.stage}, with ${s.coins} coins.\nBest run: ${s.best} m.\n\n` +
          `Boons: ${boons.length ? boons.join(', ') : 'none'}`,
      );
    }
  }

  /** Screen x of a point on the course. */
  private sx(x: number) {
    return RUNNER_X + x - this.state.distance;
  }

  private drawWorld() {
    const s = this.state;
    this.far.tilePositionX = s.distance * 0.15;
    this.near.tilePositionX = s.distance * 0.4;
    this.ground.tilePositionX = s.distance;
    this.flag.setX(this.sx(s.checkpointX)).setVisible(this.sx(s.checkpointX) < VIEW.w + 80);

    const seen = new Set<number>();
    for (const t of s.traps) {
      seen.add(t.id);
      let sprite = this.traps.get(t.id);
      if (!sprite) {
        if (t.kind === 'spikes') sprite = this.add.image(0, GROUND_Y + 2, `spikes-${t.w}`).setOrigin(0, 1).setDepth(4);
        else if (t.kind === 'pit') sprite = this.add.image(0, GROUND_Y, `pit-${t.w}`).setOrigin(0, 0).setDepth(2);
        else sprite = this.add.image(0, 0, 'blade').setOrigin(0.5, 0).setDepth(4);
        this.traps.set(t.id, sprite);
      }
      sprite.setX(t.kind === 'blade' ? this.sx(t.x + t.w / 2) : this.sx(t.x));
    }
    for (const [id, sprite] of this.traps) {
      if (seen.has(id)) continue;
      sprite.destroy();
      this.traps.delete(id);
    }

    seen.clear();
    for (const c of s.course) {
      seen.add(c.id);
      let sprite = this.coins.get(c.id);
      if (!sprite) {
        sprite = this.add.image(0, 0, 'coin-0').setDepth(4);
        this.coins.set(c.id, sprite);
      }
      // Coins spin, each a little out of step with the next.
      const spin = Math.floor(this.clock / 160 + c.id * 0.5) % 4 === 3 ? 'coin-1' : 'coin-0';
      sprite.setTexture(spin).setPosition(this.sx(c.x), GROUND_Y - c.h);
    }
    for (const [id, sprite] of this.coins) {
      if (seen.has(id)) continue;
      sprite.destroy();
      this.coins.delete(id);
    }
  }

  private drawKnight() {
    const s = this.state;
    const r = s.runner;
    let pose: KnightPose;
    if (s.phase === 'over' || r.slideMs > 0) pose = 'slide';
    else if (r.h > 0) pose = r.vh > 0 ? 'jump' : 'fall';
    else if (s.phase === 'checkpoint') pose = 'run1';
    else pose = `run${Math.floor(s.distance / STRIDE_PX) % 4}` as KnightPose;
    this.knight
      .setTexture(`knight-${pose}`)
      .setOrigin(0.5, pose === 'slide' ? FEET.slide : FEET.stand)
      .setPosition(RUNNER_X, GROUND_Y - r.h)
      .setAngle(s.phase === 'over' ? -8 : 0);
    // Blinks while it can't be hurt after a hit; greyed once fallen.
    this.knight.setAlpha(r.hurtMs > 0 && s.phase === 'running' && Math.floor(this.clock / 80) % 2 === 0 ? 0.35 : 1);
    if (s.phase === 'over') this.knight.setTint(0x8a8090).setTintMode(Phaser.TintModes.MULTIPLY);
    else this.knight.clearTint();
  }

  private drawEffects() {
    const g = this.fx;
    g.clear();
    const s = this.state;
    for (const e of s.effects) {
      const t = 1 - e.ms / e.total;
      const x = this.sx(e.x);
      const y = GROUND_Y - e.h;
      if (e.kind === 'coin') {
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * Math.PI * 2 + 0.6;
          g.fillStyle(i % 2 ? GOLD.shine : GOLD.light, 1 - t).fillRect(x + Math.cos(a) * 18 * t - 2, y + Math.sin(a) * 18 * t - 2 - 10 * t, 4, 4);
        }
      } else if (e.kind === 'hit') {
        g.lineStyle(4, RED.light, 1 - t).strokeCircle(x, y, 16 + 30 * t);
      } else if (e.kind === 'block') {
        g.fillStyle(FROST.light, 0.35 * (1 - t)).fillCircle(x, y, 40);
        g.lineStyle(3, FROST.mid, 1 - t).strokeCircle(x, y, 40);
      } else {
        g.fillStyle(0xd8cfa8, 0.5 * (1 - t)).fillCircle(x - 10 - 16 * t, GROUND_Y - 4 - 6 * t, 5 + 4 * t).fillCircle(x - 22 - 20 * t, GROUND_Y - 3 - 4 * t, 4 + 3 * t);
      }
    }
    if (s.shields > 0 && s.phase === 'running') {
      g.lineStyle(2, FROST.mid, 0.5 + 0.2 * Math.sin(this.clock / 150)).strokeCircle(RUNNER_X, GROUND_Y - s.runner.h - 30, 38);
    }
  }

  private createHud() {
    this.hud = this.add.graphics().setDepth(UI_DEPTH);
    this.stageText = this.add.text(VIEW.w / 2, 10, '', textStyle(18, '#f3c64e')).setOrigin(0.5, 0).setDepth(UI_DEPTH + 1);
    this.statsText = this.add.text(VIEW.w - 16, 12, '', textStyle(14)).setOrigin(1, 0).setDepth(UI_DEPTH + 1);
  }

  private drawHud() {
    const s = this.state;
    const g = this.hud;
    g.clear();
    g.fillStyle(0x2c2018, 0.92).fillRect(0, 0, VIEW.w, HUD_HEIGHT);
    g.fillStyle(0x5a3f2a).fillRect(0, HUD_HEIGHT - 3, VIEW.w, 3);
    const max = stats(s).maxHearts;
    while (this.hearts.length < max) this.hearts.push(this.add.image(24 + this.hearts.length * 36, 19, 'icon-heart-small').setDepth(UI_DEPTH + 1));
    this.hearts.forEach((h, i) => h.setVisible(i < max).setTexture(`${iconTexture(i < s.hearts ? 'heart' : 'heart-empty')}-small`));
    this.stageText.setText(`Stage ${s.stage}`);
    this.statsText.setText(`${metres(s.distance)} m   Coins ${s.coins}   Best ${s.best} m`);
    // The controls hint fades out a little way into the first stage.
    const hint = s.stage === 1 && s.phase === 'running' ? (HINT_UNTIL - s.distance) / 200 : 0;
    this.hint.setAlpha(Phaser.Math.Clamp(hint, 0, 1));
  }

  private createHint() {
    const g = this.add.graphics();
    g.lineStyle(2, 0xf3e9d2, 0.25).lineBetween(0, TAP_SPLIT_Y, VIEW.w, TAP_SPLIT_Y);
    const up = this.add.text(VIEW.w / 2 + 100, TAP_SPLIT_Y - 70, 'Tap up here to jump\n(Space / Up)', textStyle(18)).setOrigin(0.5).setAlign('center');
    const down = this.add.text(VIEW.w / 2 + 100, TAP_SPLIT_Y + 70, 'Tap down here to slide\n(Down / S)', textStyle(18)).setOrigin(0.5).setAlign('center');
    this.hint = this.add.container(0, 0, [g, up, down]).setDepth(UI_DEPTH - 5);
  }

  private createGameOver() {
    const dim = this.add.rectangle(VIEW.w / 2, VIEW.h / 2, VIEW.w, VIEW.h, 0x0e0a08, 0.7).setInteractive();
    const panel = this.add.rectangle(VIEW.w / 2, VIEW.h / 2, 600, 300, 0x2c2018).setStrokeStyle(4, 0x8a5a32);
    const title = this.add.text(VIEW.w / 2, VIEW.h / 2 - 110, 'The knight has fallen', textStyle(30, '#e0584f')).setOrigin(0.5);
    this.gameOverText = this.add
      .text(VIEW.w / 2, VIEW.h / 2 - 10, '', { fontFamily: FONT, fontSize: '16px', color: '#f1e3c6', align: 'center', wordWrap: { width: 540 } })
      .setOrigin(0.5);
    const again = makeButton(this, VIEW.w / 2, VIEW.h / 2 + 100, 'Run again', () => this.restart());
    this.gameOver = this.add.container(0, 0, [dim, panel, title, this.gameOverText, again]).setDepth(UI_DEPTH + 20).setVisible(false);
  }

  private pick(id: BoonId) {
    pick(this.state, id);
  }

  /** A new run from the start, with no boons; only the best distance carries over. */
  private restart() {
    this.state = newRun(this.state.best);
    for (const sprite of [...this.traps.values(), ...this.coins.values()]) sprite.destroy();
    this.traps.clear();
    this.coins.clear();
  }
}
