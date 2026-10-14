import { settings } from '../../../../shared/settings';
import Phaser from 'phaser';
import { FIGURES, foeTexture } from '../art/characters';
import { bossNodeTexture, relicTexture } from '../art/icons';
import { BAR, BOSS_BARS, FIRE, GOLD, SLATE, STORM, XP } from '../art/palette';
import { ENEMIES } from '../game/enemies';
import { RELICS } from '../game/relics';
import { clearProgress, loadFound, loadProgress, loadSpeed, saveFound, saveProgress, saveSpeed } from '../game/save';
import { RAIN_FALL_MS, RAIN_RING, crowdSpot, fightAgain, loose, offer, pick, tick } from '../game/sim';
import { BARRICADE_FRONT, FIELD, freshProgress, newRun, progressOf, stats, streakBonus, xpToNext, type Enemy, type GameState } from '../game/state';
import type { UpgradeId } from '../game/upgrades';
import { isBossWave, waveTrack } from '../game/waves';
import { LevelUp } from '../ui/LevelUp';
import { chamferPts, drawPanel, makeButton, textStyle } from '../ui/panel';
import { SkillBook } from '../ui/SkillBook';
import { BARRICADE, BOSS_BAR, HERO_FEET, HUD_HEIGHT, RAIN, RAIN_HINT, SPEED, STREAK, TRACK, UI_DEPTH, VIEW, XP_BAR } from './layout';

/** Longest simulated step, so a backgrounded tab doesn't jump the battle forward. */
const MAX_STEP_MS = 250;
/** How long a foe takes for one stride of its walk, in milliseconds. */
const STRIDE_MS = 360;
const HP_BAR_W = 32;
/** Where Arrow Rain's aiming arc leaves the button. */
const ARC_FROM = { x: RAIN.x + 20, y: RAIN.y - 16 };

type V = Phaser.Math.Vector2;
const v = (x: number, y: number) => new Phaser.Math.Vector2(x, y);

export class GameScene extends Phaser.Scene {
  /** The run being played; read by the playthrough test. */
  state!: GameState;
  /** The level-up cards; the playthrough test reads where they are to tap one. */
  levelUp!: LevelUp;
  /** The skill book, behind a button in the top bar. */
  skillBook!: SkillBook;
  /** Every upgrade a level-up has offered at least once: the skill book's filled pages. */
  found = new Set<UpgradeId>();
  /** The road of ten waves shown on the wave track; read by the playthrough test. */
  track = waveTrack(1);
  /** Where the Arrow Rain button is, to drag it from; read by the playthrough test. */
  rainSpot = { x: RAIN.x, y: RAIN.y };
  /** Where Arrow Rain is being dragged to, or null while it is not being aimed. */
  aim: { x: number; y: number } | null = null;
  private foes = new Map<number, Phaser.GameObjects.Image>();
  private missiles = new Map<number, Phaser.GameObjects.Image>();
  private pops = new Map<number, Phaser.GameObjects.Text[]>();
  private rainArrows = new Map<number, Phaser.GameObjects.Image[]>();
  private hero!: Phaser.GameObjects.Image;
  private barricade!: Phaser.GameObjects.Image;
  private bars!: Phaser.GameObjects.Graphics;
  private fx!: Phaser.GameObjects.Graphics;
  private glow!: Phaser.GameObjects.Graphics;
  private hud!: Phaser.GameObjects.Graphics;
  private trackG!: Phaser.GameObjects.Graphics;
  private aimG!: Phaser.GameObjects.Graphics;
  private waveText!: Phaser.GameObjects.Text;
  private foesText!: Phaser.GameObjects.Text;
  private slainText!: Phaser.GameObjects.Text;
  private bestText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private xpText!: Phaser.GameObjects.Text;
  private banner!: Phaser.GameObjects.Text;
  private bossName!: Phaser.GameObjects.Text;
  private trackTitle!: Phaser.GameObjects.Text;
  private trackNote!: Phaser.GameObjects.Text;
  private trackNumber!: Phaser.GameObjects.Text;
  private trackBoss!: Phaser.GameObjects.Image;
  private trackChest!: Phaser.GameObjects.Image;
  private rainButton!: Phaser.GameObjects.Image;
  private rainBadge!: Phaser.GameObjects.Text;
  private rainHint!: Phaser.GameObjects.Text;
  private streakText!: Phaser.GameObjects.Text;
  private streakBonusText!: Phaser.GameObjects.Text;
  private streakFlame!: Phaser.GameObjects.Image;
  private relicPanel!: Phaser.GameObjects.Container;
  private relicIcon!: Phaser.GameObjects.Image;
  private relicName!: Phaser.GameObjects.Text;
  private relicText!: Phaser.GameObjects.Text;
  private gameOver!: Phaser.GameObjects.Container;
  private gameOverText!: Phaser.GameObjects.Text;
  private lastArrowCooldown = 0;
  private clock = 0;
  private lastFrame: number | null = null;
  /** How many times faster than real time the battle plays: 1 or 2, switched in the bottom bar. */
  speed = 1;
  private speedBg!: Phaser.GameObjects.Graphics;
  private speedText!: Phaser.GameObjects.Text;

  constructor() {
    super('Game');
  }

  create() {
    this.foes.clear();
    this.missiles.clear();
    this.pops.clear();
    this.rainArrows.clear();
    this.aim = null;
    this.state = newRun(loadProgress());
    if (this.state.levelUps > 0) offer(this.state);

    this.add.image(0, 0, 'background').setOrigin(0);
    const hero = FIGURES.hero!;
    this.hero = this.add.image(HERO_FEET.x, HERO_FEET.y, 'hero').setOrigin(hero.originX, hero.originY).setDepth(HERO_FEET.y);
    this.barricade = this.add.image(BARRICADE.x, BARRICADE.y, 'barricade-0').setOrigin(0).setDepth(1);
    this.bars = this.add.graphics().setDepth(UI_DEPTH - 20);
    this.fx = this.add.graphics().setDepth(UI_DEPTH - 30);
    this.glow = this.add.graphics().setDepth(UI_DEPTH - 29).setBlendMode(Phaser.BlendModes.ADD);
    this.aimG = this.add.graphics().setDepth(UI_DEPTH - 8);
    this.createHud();
    this.createTrack();
    this.createRain();
    this.createRelicPanel();
    this.createGameOver();
    this.levelUp = new LevelUp(this, (id) => this.pick(id));
    this.found = new Set(loadFound());
    this.skillBook = new SkillBook(this);
    this.createSpeedSwitch();
  }

  update(time: number) {
    // Game time from the frame's own timestamp rather than Phaser's smoothed delta, which holds
    // every step to 16ms while the page is not in focus.
    const dt = this.lastFrame === null ? 0 : Phaser.Math.Clamp(time - this.lastFrame, 0, MAX_STEP_MS);
    this.lastFrame = time;
    const s = this.state;
    const phase = s.phase;
    const wave = s.wave;
    const levelUps = s.levelUps;
    // Everything, the auto-pick countdown included, waits while the list of upgrades is open.
    if (!this.skillBook.open) {
      // The battle plays at the chosen speed; the auto-pick countdown stays in real seconds.
      const game = s.choices ? dt : dt * this.speed;
      tick(s, game);
      if (!s.choices && s.phase !== 'over') this.clock += game;
    }
    if (s.phase !== phase || s.wave !== wave || s.levelUps !== levelUps) saveProgress(progressOf(s));
    // A level-up or a fall drops Arrow Rain from the hand.
    if (s.choices || s.phase === 'over' || this.skillBook.open) this.aim = null;

    this.track = waveTrack(s.wave);
    this.drawFoes();
    this.drawMissiles();
    this.drawEffects();
    this.drawHero();
    this.drawHud();
    this.drawTrack();
    this.drawRain();
    this.levelUp.show(s.phase === 'over' ? null : s.choices, s.ranks, s.level - s.levelUps + 1, s.levelUps, s.pickMs);
    this.discover();
    this.skillBook.show(this.found, s.ranks, s.relics, s.phase === 'over');
    this.gameOver.setVisible(s.phase === 'over');
    if (s.phase === 'over') {
      this.gameOverText.setText(
        `The foes broke through and reached the hero on wave ${s.wave}.\n${s.kills} foes slain this run, longest streak x${s.streak.best}, best wave cleared: ${s.bestWave}.\n\n` +
          `The hero keeps level ${s.level}, every upgrade picked and every relic won.`,
      );
    }
  }

  /** Fills the skill book's page for each upgrade offered (or held) for the first time. */
  private discover() {
    const s = this.state;
    const seen = [...(s.choices ?? []), ...(Object.keys(s.ranks) as UpgradeId[])];
    const fresh = seen.filter((id) => !this.found.has(id));
    if (fresh.length === 0) return;
    for (const id of fresh) this.found.add(id);
    saveFound([...this.found]);
  }

  private pick(id: UpgradeId) {
    if (pick(this.state, id)) saveProgress(progressOf(this.state));
  }

  /** Blinks on and off every `ms`, or holds still with reduced motion. */
  private blink(ms: number) {
    return settings.reduceMotion ? 0 : Math.floor(this.clock / ms) % 2;
  }

  /** A gentle 0..1 pulse for glows, held at its middle with reduced motion. */
  private pulse(ms: number) {
    return settings.reduceMotion ? 0.5 : 0.5 + 0.5 * Math.sin((this.clock / ms) * Math.PI * 2);
  }

  // ---- The battle.

  private drawFoes() {
    const seen = new Set<number>();
    this.bars.clear();
    for (const e of this.state.enemies) {
      seen.add(e.id);
      let sprite = this.foes.get(e.id);
      if (!sprite) {
        sprite = this.add.image(e.x, e.y, foeTexture(e.kind, 0));
        this.foes.set(e.id, sprite);
      }
      const type = ENEMIES[e.kind];
      const pace = e.slowMs > 0 ? 1 - e.slow : 1;
      // Walk in two frames with a bob; at the barricade, lunge at it in time with the blows.
      const phase = ((this.clock * pace) / STRIDE_MS + e.id * 0.37) % 1;
      const frame = phase < 0.5 ? 0 : 1;
      const lunge = e.attacking ? -Math.max(0, Math.sin(phase * Math.PI * 2)) * 6 : 0;
      const bob = e.attacking ? 0 : -Math.abs(Math.sin(phase * Math.PI * 2)) * 2;
      const feet = e.y + type.radius * 0.6;
      const key = foeTexture(e.kind, e.attacking ? 0 : frame);
      const fig = FIGURES[key]!;
      sprite.setTexture(key).setOrigin(fig.originX, fig.originY).setPosition(e.x + lunge, feet + bob).setDepth(feet);
      // A hit flashes white, in blinks so a foe under steady fire still shows; with reduced motion
      // the blinks and the burn's flicker hold still.
      if (e.hitMs > 0 && this.blink(50) === 0) sprite.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
      else if (e.burnMs > 0) sprite.setTint(this.blink(120) ? 0xffb070 : 0xffd8a0).setTintMode(Phaser.TintModes.MULTIPLY);
      else if (e.slowMs > 0) sprite.setTint(0xa8dcf8).setTintMode(Phaser.TintModes.MULTIPLY);
      else sprite.clearTint();
      if (!type.boss) this.drawHpBar(e, feet - fig.height - 8);
      if (e.burnMs > 0) this.drawFlames(e, feet - fig.height / 2);
    }
    for (const [id, sprite] of this.foes) {
      if (seen.has(id)) continue;
      sprite.destroy();
      this.foes.delete(id);
    }
  }

  private drawHpBar(e: Enemy, y: number) {
    if (e.hp >= e.maxHp) return;
    const x = Math.round(e.x - HP_BAR_W / 2);
    const fill = Math.round((HP_BAR_W - 2) * Phaser.Math.Clamp(e.hp / e.maxHp, 0, 1));
    this.bars.fillStyle(BAR.back).fillPoints(chamferPts(x - 1, y - 1, HP_BAR_W + 2, 7, 2), true);
    this.bars.fillStyle(BAR.hp).fillRect(x + 1, y + 1, fill, 4);
    this.bars.fillStyle(BAR.hpShine).fillRect(x + 1, y + 1, fill, 1.5);
  }

  private drawFlames(e: Enemy, y: number) {
    for (let i = 0; i < 3; i++) {
      const t = (this.clock / 300 + i / 3 + e.id * 0.13) % 1;
      const fx = e.x + Math.sin(e.id * 7 + i * 2.1) * 10;
      const fy = y - t * 22;
      const s = 5 * (1 - t * 0.5);
      this.fx.fillStyle(t < 0.5 ? FIRE.light : FIRE.mid, 1 - t).fillTriangle(fx - s, fy + s, fx + s, fy + s, fx, fy - s * 1.6);
    }
  }

  private drawMissiles() {
    const seen = new Set<number>();
    const s = stats(this.state);
    const arrowKey = s.burn ? 'arrow-fire' : s.chill ? 'arrow-frost' : 'arrow';
    for (const m of this.state.missiles) {
      seen.add(m.id);
      let sprite = this.missiles.get(m.id);
      if (!sprite) {
        sprite = this.add.image(m.x, m.y, m.kind === 'arrow' ? arrowKey : 'fireball').setDepth(UI_DEPTH - 40);
        if (m.kind === 'arrow') sprite.setOrigin(30 / 44, 0.5);
        else sprite.setOrigin(34 / 48, 0.5);
        this.missiles.set(m.id, sprite);
      }
      sprite.setPosition(m.x, m.y).setRotation(Math.atan2(m.vy, m.vx));
    }
    for (const [id, sprite] of this.missiles) {
      if (seen.has(id)) continue;
      sprite.destroy();
      this.missiles.delete(id);
    }
  }

  private drawEffects() {
    const g = this.fx;
    const glow = this.glow;
    g.clear();
    glow.clear();
    const seen = new Set<number>();
    let inFlight = 0;
    for (const e of this.state.effects) {
      const t = 1 - e.ms / e.total;
      if (e.kind === 'blast' || e.kind === 'fireblast') {
        // A faceted starburst that swells and fades.
        const r = (e.radius ?? 40) * (0.4 + 0.6 * t);
        const star = Array.from({ length: 16 }, (_, i) => {
          const a = (i / 16) * Math.PI * 2 + e.id;
          const rr = i % 2 ? r * 0.6 : r;
          return v(e.x + Math.cos(a) * rr, e.y + Math.sin(a) * rr * 0.75);
        });
        g.fillStyle(e.kind === 'fireblast' ? FIRE.dark : FIRE.mid, 0.6 * (1 - t)).fillPoints(star, true);
        g.fillStyle(FIRE.light, 0.7 * (1 - t)).fillPoints(star.map((p) => v(e.x + (p.x - e.x) * 0.55, e.y + (p.y - e.y) * 0.55)), true);
        glow.lineStyle(3, FIRE.white, 0.7 * (1 - t)).strokeEllipse(e.x, e.y, r * 2, r * 1.5);
      } else if (e.kind === 'bolt' && e.points) {
        // A jagged bolt down from the sky to the first foe, then on from foe to foe.
        const path = this.jag([{ x: e.points[0].x - 30, y: HUD_HEIGHT + 10 }, ...e.points], e.id);
        for (const [width, color, alpha] of [[10, STORM.mid, 0.45], [4, STORM.light, 0.9], [1.5, STORM.white, 1]] as const) {
          glow.lineStyle(width, color, alpha * (1 - t)).strokePoints(path, false);
        }
        for (const p of e.points) glow.fillStyle(STORM.mid, 0.4 * (1 - t)).fillEllipse(p.x, p.y, 34, 20);
      } else if (e.kind === 'death') {
        // A puff of faceted dust shards where the foe fell.
        const r = (e.radius ?? 16) * (0.8 + 1.2 * t);
        for (let k = 0; k < 7; k++) {
          const a = (k / 7) * Math.PI * 2 + e.id;
          const cx = e.x + Math.cos(a) * r;
          const cy = e.y + Math.sin(a) * r * 0.6 - 6 - t * 10;
          const s = 6 * (1 - t * 0.5);
          g.fillStyle(0xe8e2d8, 0.6 * (1 - t)).fillTriangle(cx - s, cy, cx, cy - s, cx + s * 0.4, cy + s * 0.4);
          g.fillStyle(0x9a9080, 0.6 * (1 - t)).fillTriangle(cx, cy - s, cx + s, cy, cx + s * 0.4, cy + s * 0.4);
        }
      } else if (e.kind === 'rain') {
        // The volley lands: a gold ring bursts outwards and the shafts stand in the road.
        const k = 1 + 0.25 * t;
        glow.lineStyle(4, GOLD.light, 0.8 * (1 - t)).strokeEllipse(e.x, e.y, RAIN_RING.rx * 2 * k, RAIN_RING.ry * 2 * k);
        g.fillStyle(GOLD.mid, 0.25 * (1 - t)).fillEllipse(e.x, e.y, RAIN_RING.rx * 2, RAIN_RING.ry * 2);
        for (let i = 0; i < 12; i++) {
          const [dx, dy] = this.scatter(e.id, i);
          const x = e.x + dx * RAIN_RING.rx * 0.9;
          const y = e.y + dy * RAIN_RING.ry * 0.9;
          g.lineStyle(2, 0xfff2c4, 1 - t).lineBetween(x - 3, y - 12, x, y);
        }
      } else if (e.kind === 'crit' || e.kind === 'xp') {
        seen.add(e.id);
        let texts = this.pops.get(e.id);
        if (!texts) {
          texts =
            e.kind === 'crit'
              ? [this.add.text(e.x, e.y, 'Crit!', textStyle(15, '#ffd84a', 4)).setOrigin(0.5)]
              : [this.add.text(e.x, e.y, `+${Math.round(e.amount ?? 0)} XP`, textStyle(17, '#ffe07a', 4)).setOrigin(0.5)];
          if (e.kind === 'xp' && (e.streak ?? 0) >= 2) texts.push(this.add.text(e.x, e.y, `x${e.streak}`, textStyle(13, '#ff9b3a', 4)).setOrigin(0, 0.5));
          for (const text of texts) text.setDepth(UI_DEPTH - 10);
          this.pops.set(e.id, texts);
        }
        const rise = e.kind === 'crit' ? 20 + t * 18 : 4 + t * 26;
        const alpha = t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3;
        texts[0].setPosition(e.x, e.y - rise).setAlpha(alpha);
        texts[1]?.setPosition(e.x + texts[0].width / 2 + 2, e.y - rise - 10).setAlpha(alpha);
      } else if (e.kind === 'orb') {
        inFlight += e.amount ?? 0;
        this.drawOrbs(e.x, e.y, t);
      }
    }
    for (const [id, texts] of this.pops) {
      if (seen.has(id)) continue;
      for (const text of texts) text.destroy();
      this.pops.delete(id);
    }
    this.inFlight = inFlight;
  }

  /** Experience in orbs still flying to the bar: shown as the bar's gold preview segment. */
  private inFlight = 0;

  /** Where the experience bar's blue fill ends: where the orbs fly to. */
  private xpEnd() {
    const s = this.state;
    const have = Math.max(0, s.xp - this.inFlight);
    return { x: XP_BAR.x + 2 + (XP_BAR.w - 4) * Math.min(1, have / xpToNext(s.level)), y: XP_BAR.y + XP_BAR.h / 2 };
  }

  /** A string of gold diamonds arcing from where a foe fell into the experience bar. */
  private drawOrbs(x: number, y: number, t: number) {
    const to = this.xpEnd();
    const ctrl = { x: (x + to.x) / 2 + 90, y: Math.min(y, to.y) - 70 };
    for (let i = 0; i < 4; i++) {
      const u = Phaser.Math.Clamp(t * 1.25 - i * 0.08, 0, 1);
      if (u <= 0 || u >= 1) continue;
      const px = (1 - u) * (1 - u) * x + 2 * (1 - u) * u * ctrl.x + u * u * to.x;
      const py = (1 - u) * (1 - u) * y + 2 * (1 - u) * u * ctrl.y + u * u * to.y;
      const s = 5 - i * 0.6;
      this.glow.fillStyle(GOLD.light, 0.35).fillCircle(px, py, s * 1.8);
      this.fx.fillStyle(0xfff1b0).fillTriangle(px - s, py, px, py - s, px + s, py);
      this.fx.fillStyle(0xe2a628).fillTriangle(px - s, py, px, py + s, px + s, py);
    }
  }

  /** A path through `pts` with jagged kinks between them, the same each frame for one bolt. */
  private jag(pts: { x: number; y: number }[], seed: number): V[] {
    const out: V[] = [v(pts[0].x, pts[0].y)];
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1];
      const b = pts[i];
      const n = Math.max(2, Math.round(Math.hypot(b.x - a.x, b.y - a.y) / 28));
      for (let k = 1; k < n; k++) {
        const t = k / n;
        const amp = 14 * Math.sin(seed * 3.1 + i * 7.7 + k * 5.3);
        out.push(v(a.x + (b.x - a.x) * t + amp, a.y + (b.y - a.y) * t + amp * 0.3));
      }
      out.push(v(b.x, b.y));
    }
    return out;
  }

  /** A fixed scatter of points in the unit disc, for volley `seed`'s arrow `i`. */
  private scatter(seed: number, i: number): [number, number] {
    const a = Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453;
    const b = Math.sin(seed * 39.3468 + i * 11.135) * 24634.6345;
    const ang = (a - Math.floor(a)) * Math.PI * 2;
    const r = Math.sqrt(b - Math.floor(b));
    return [Math.cos(ang) * r, Math.sin(ang) * r];
  }

  private drawHero() {
    // The bow kicks back a little with each shot.
    const cd = this.state.cooldown.arrow;
    if (cd > this.lastArrowCooldown) this.hero.setX(HERO_FEET.x - 3);
    else this.hero.setX(Math.min(HERO_FEET.x, this.hero.x + 0.5));
    this.lastArrowCooldown = cd;
    const barricade = this.state.barricade;
    const health = barricade.hp / barricade.max;
    this.barricade.setTexture(barricade.hp <= 0 ? 'barricade-3' : health > 0.66 ? 'barricade-0' : health > 0.33 ? 'barricade-1' : 'barricade-2');
  }

  // ---- The HUD: top bar, experience bar, banners and the boss's bars.

  private createHud() {
    this.add.image(0, 0, 'hud-top').setOrigin(0).setDepth(UI_DEPTH);
    this.add.image(0, XP_BAR.y - 10, 'hud-bottom').setOrigin(0).setDepth(UI_DEPTH);
    this.hud = this.add.graphics().setDepth(UI_DEPTH);
    const top = (x: number, text: string, color = '#e9e4d8', size = 14) =>
      this.add.text(x, 19, text, textStyle(size, color)).setOrigin(0, 0.5).setDepth(UI_DEPTH + 1);
    this.waveText = top(18, '', '#ffcf4a', 20).setStroke('#141820', 3);
    top(140, 'Barricade');
    this.foesText = top(630, '');
    this.slainText = top(757, '');
    this.bestText = top(944, '').setOrigin(1, 0.5);
    this.levelText = this.add.text(18, XP_BAR.y + XP_BAR.h / 2, '', textStyle(16, '#9fd3ff')).setOrigin(0, 0.5).setDepth(UI_DEPTH + 1);
    this.xpText = this.add
      .text(XP_BAR.x + XP_BAR.w / 2, XP_BAR.y + XP_BAR.h / 2, '', textStyle(12, '#ffffff', 3))
      .setOrigin(0.5)
      .setDepth(UI_DEPTH + 1);
    this.banner = this.add.text(VIEW.w / 2, 170, '', { ...textStyle(40, '#ffcf4a', 6), align: 'center' }).setOrigin(0.5).setDepth(UI_DEPTH + 1);
    this.bossName = this.add.text(BOSS_BAR.x, BOSS_BAR.y - 3, '', textStyle(14, '#ffb0a0', 3)).setOrigin(0.5, 1).setDepth(UI_DEPTH + 1);
    // The kill streak chip, riding the top edge of the experience bar.
    this.streakFlame = this.add.image(STREAK.x - STREAK.w / 2 + 14, STREAK.y, 'hud-flame').setDepth(UI_DEPTH + 2);
    this.streakText = this.add.text(STREAK.x - STREAK.w / 2 + 26, STREAK.y, '', textStyle(12, '#ffcf8a')).setOrigin(0, 0.5).setDepth(UI_DEPTH + 2);
    this.streakBonusText = this.add.text(STREAK.x + STREAK.w / 2 - 8, STREAK.y, '', textStyle(12, '#ffe07a')).setOrigin(1, 0.5).setDepth(UI_DEPTH + 2);
  }

  private drawHud() {
    const s = this.state;
    const g = this.hud;
    g.clear();
    this.waveText.setText(`Wave ${s.wave}`);

    // The barricade's health in the top bar.
    const bx = 232;
    const bw = 198;
    const hp = Phaser.Math.Clamp(s.barricade.hp / s.barricade.max, 0, 1);
    g.fillStyle(SLATE.dark).fillPoints(chamferPts(bx - 3, 10, bw + 6, 20, 4), true);
    g.fillStyle(BAR.empty).fillRect(bx, 13, bw, 14);
    const fw = Math.round(bw * hp);
    g.fillStyle(BAR.barricade).fillRect(bx, 13, fw, 14);
    g.fillStyle(BAR.barricadeShine).fillRect(bx, 13, fw, 6);
    g.lineStyle(1.5, 0x5a3214, 0.35);
    for (let x = bx + 15; x < bx + fw; x += 22) g.lineBetween(x, 14, x - 4, 26);
    this.foesText.setText(`Foes left ${s.toSpawn.length + s.enemies.length}`);
    this.slainText.setText(`Slain ${s.kills}`);
    this.bestText.setText(`Best wave ${s.bestWave}`);

    // Experience along the bottom: the blue fill, and a gold preview of the experience still
    // flying in as orbs.
    const need = xpToNext(s.level);
    const X = XP_BAR;
    const inner = X.w - 4;
    const have = Math.max(0, s.xp - this.inFlight);
    const blue = Math.round(inner * Math.min(1, have / need));
    const gold = Math.round(inner * Math.min(1, s.xp / need)) - blue;
    g.fillStyle(SLATE.dark).fillPoints(chamferPts(X.x - 2, X.y - 2, X.w + 4, X.h + 4, 4), true);
    g.fillStyle(XP.back).fillRect(X.x + 2, X.y + 2, inner, X.h - 4);
    g.fillStyle(XP.fill).fillRect(X.x + 2, X.y + 2, blue, X.h - 4);
    g.fillStyle(XP.facet);
    for (let x = X.x + 2; x < X.x + 2 + blue - 14; x += 28) g.fillTriangle(x, X.y + 2, x + 28, X.y + 2, x + 14, X.y + X.h - 2);
    g.fillStyle(XP.shine).fillRect(X.x + 2, X.y + 2, blue, 2);
    if (gold > 0) {
      g.fillStyle(GOLD.light, 0.9).fillRect(X.x + 2 + blue, X.y + 2, gold, X.h - 4);
      g.lineStyle(1.5, 0xffffff, 0.5);
      for (let x = X.x + 2 + blue; x < X.x + blue + gold - 2; x += 7) g.lineBetween(x + 2, X.y + X.h - 2, x + 6, X.y + 2);
    }
    this.levelText.setText(`Level ${s.level}`);
    this.xpText.setText(`${Math.floor(s.xp)} / ${need} XP`);

    // The kill streak chip, while a streak of two or more runs.
    const streak = s.streak.count >= 2 && s.phase !== 'over';
    this.streakFlame.setVisible(streak);
    this.streakText.setVisible(streak).setText(`Streak x${s.streak.count}`);
    this.streakBonusText.setVisible(streak).setText(`+${Math.round(streakBonus(s.streak.count) * 100)}% XP`);
    if (streak) {
      const { x, y, w, h } = STREAK;
      g.fillStyle(0xff8a2a, 0.15 + 0.25 * this.pulse(700)).fillPoints(chamferPts(x - w / 2 - 4, y - h / 2 - 4, w + 8, h + 8, 7), true);
      drawPanel(g, x - w / 2, y - h / 2, w, h, { c: 5, fill: 0x3a2414, alpha: 1, edge: 0xff9b3a, lw: 1.5 });
      // The bar under the chip empties as the time for the next kill runs out.
      const left = s.streak.ms / stats(s).streakMs;
      g.fillStyle(0xff9b3a, 0.8).fillRect(x - w / 2 + 6, y + h / 2 - 3, (w - 12) * left, 2);
    }

    // The wave's banner during the break before it.
    const breaking = s.phase === 'break' && !s.choices && !s.relicFound;
    this.banner
      .setVisible(breaking)
      .setText(isBossWave(s.wave) ? `Wave ${s.wave}\nThe ${ENEMIES[this.track.boss].name} comes!` : `Wave ${s.wave}`)
      .setAlpha(breaking ? Math.min(1, s.breakMs / 500) : 0);

    // The boss's stacked health bars: the bar in front empties to show the next one's colour.
    const boss = s.enemies.find((e) => ENEMIES[e.kind].boss);
    this.bossName.setVisible(!!boss);
    if (boss) {
      const per = boss.maxHp / boss.bars;
      const left = Math.max(0, Math.ceil(boss.hp / per) - 1);
      const fill = (boss.hp - left * per) / per;
      const x = BOSS_BAR.x - BOSS_BAR.w / 2;
      g.fillStyle(SLATE.dark).fillPoints(chamferPts(x - 3, BOSS_BAR.y - 3, BOSS_BAR.w + 6, BOSS_BAR.h + 6, 4), true);
      g.fillStyle(left > 0 ? BOSS_BARS[(left - 1) % BOSS_BARS.length] : BAR.empty).fillRect(x, BOSS_BAR.y, BOSS_BAR.w, BOSS_BAR.h);
      g.fillStyle(BOSS_BARS[left % BOSS_BARS.length]).fillRect(x, BOSS_BAR.y, Math.round(BOSS_BAR.w * fill), BOSS_BAR.h);
      g.fillStyle(0xffffff, 0.3).fillRect(x, BOSS_BAR.y, Math.round(BOSS_BAR.w * fill), 4);
      g.lineStyle(1.5, GOLD.mid).strokePoints(chamferPts(x - 3, BOSS_BAR.y - 3, BOSS_BAR.w + 6, BOSS_BAR.h + 6, 4), true);
      this.bossName.setText(`${ENEMIES[boss.kind].name}   x${left + 1}`);
    }

    // The relic chest's reward, during the break after a boss.
    const relic = s.relicFound;
    this.relicPanel.setVisible(!!relic && s.phase === 'break' && !s.choices);
    if (relic) {
      this.relicIcon.setTexture(relicTexture(relic));
      this.relicName.setText(RELICS[relic].name);
      this.relicText.setText(`${RELICS[relic].text}, from now on.`);
    }
  }

  // ---- The road to the boss: ten marks for ten waves, the boss's mark and the relic chest.

  private createTrack() {
    this.trackG = this.add.graphics().setDepth(UI_DEPTH - 5);
    const depth = UI_DEPTH - 4;
    this.trackTitle = this.add.text(TRACK.x + 12, TRACK.y + 12, '', textStyle(12, '#ffe7a0')).setOrigin(0, 0.5).setDepth(depth);
    this.trackNote = this.add
      .text(TRACK.x + TRACK.w - 10, TRACK.y + 12, '', { ...textStyle(11, '#c9c3b6'), fontStyle: 'normal' })
      .setOrigin(1, 0.5)
      .setDepth(depth);
    this.trackNumber = this.add.text(0, 0, '', textStyle(11, '#ffe7a0')).setOrigin(0.5).setDepth(depth + 1);
    this.trackBoss = this.add.image(0, TRACK.markY, bossNodeTexture('troll')).setScale(0.62).setDepth(depth);
    this.trackChest = this.add.image(0, TRACK.markY, 'chest').setScale(0.62).setDepth(depth);
  }

  private drawTrack() {
    const s = this.state;
    // During the break after a boss, the road just finished stays up with its chest open.
    const tr = s.relicFound ? waveTrack(s.wave - 1) : this.track;
    const g = this.trackG;
    g.clear();
    drawPanel(g, TRACK.x, TRACK.y, TRACK.w, TRACK.h, { c: 8, fill: 0x222630, alpha: 0.9, edge: GOLD.mid, lw: 1.5 });
    const boss = ENEMIES[tr.boss].name;
    this.trackTitle.setText(`Road to the ${boss}`);
    const step = s.relicFound ? 11 : tr.step;
    this.trackNote.setText(
      s.relicFound ? `Relic chest: ${RELICS[s.relicFound].name}` : tr.step === 10 ? 'Boss wave! Relic chest next' : `Wave ${tr.last}: boss, Relic chest`,
    );
    const y = TRACK.markY;
    const x0 = TRACK.x + TRACK.markX;
    const at = (i: number) => x0 + (i - 1) * TRACK.step;
    g.lineStyle(3, 0x454c5c).lineBetween(at(1), y, at(10), y);
    g.lineStyle(3, GOLD.dark).lineBetween(at(1), y, at(Math.min(10, step)), y);
    for (let i = 1; i <= 9; i++) {
      const x = at(i);
      if (i < step) {
        g.fillStyle(0xffe48a).fillTriangle(x - 5, y, x, y - 5, x + 5, y);
        g.fillStyle(0xc98f2c).fillTriangle(x - 5, y, x, y + 5, x + 5, y);
      } else if (i === step) {
        g.fillStyle(GOLD.light, 0.35 + 0.3 * this.pulse(900)).fillPoints(this.hexPts(x, y, 13), true);
        g.fillStyle(GOLD.light).fillPoints(this.hexPts(x, y, 11), true);
        g.fillStyle(0x2b3242).fillPoints(this.hexPts(x, y, 9), true);
      } else {
        g.fillStyle(0x5a6274).fillTriangle(x - 4, y, x, y - 4, x + 4, y);
        g.fillStyle(0x3e4454).fillTriangle(x - 4, y, x, y + 4, x + 4, y);
      }
    }
    const current = step <= 9;
    this.trackNumber.setVisible(current).setPosition(at(step), y).setText(String(s.wave));
    this.trackBoss.setTexture(bossNodeTexture(tr.boss)).setPosition(at(10), y).setAlpha(step > 10 ? 0.6 : 1);
    if (step === 10) g.lineStyle(2, GOLD.light, 0.5 + 0.5 * this.pulse(700)).strokePoints(this.hexPts(at(10), y, 13), true);
    this.trackChest.setTexture(s.relicFound ? 'chest-open' : 'chest').setPosition(at(10) + 30, y - 1);
    // A few gold glints round the chest.
    for (const [dx, dy] of [[-13, -9], [12, -10], [14, 3]]) g.fillStyle(0xfff1b0, 0.7).fillTriangle(at(10) + 30 + dx - 2, y + dy, at(10) + 30 + dx, y + dy - 2, at(10) + 30 + dx + 2, y + dy);
  }

  private hexPts(x: number, y: number, r: number) {
    return Array.from({ length: 6 }, (_, i) => v(x + Math.cos(Math.PI / 6 + (i * Math.PI) / 3) * r, y + Math.sin(Math.PI / 6 + (i * Math.PI) / 3) * r));
  }

  private createRelicPanel() {
    const g = this.add.graphics();
    drawPanel(g, -210, -52, 420, 104, { c: 14, fill: 0x222630, alpha: 0.95, lw: 2.5 });
    const chest = this.add.image(-168, 8, 'chest-open').setScale(1.4);
    this.relicIcon = this.add.image(-168, -18, 'relic-crown').setScale(0.7);
    const title = this.add.text(-112, -30, 'Relic chest!', textStyle(20, '#ffcf4a', 4)).setOrigin(0, 0.5);
    this.relicName = this.add.text(-112, -2, '', textStyle(16, '#ffe7a0')).setOrigin(0, 0.5);
    this.relicText = this.add.text(-112, 24, '', { ...textStyle(13, '#e9e4d8'), fontStyle: 'normal', wordWrap: { width: 300 } }).setOrigin(0, 0.5);
    this.relicPanel = this.add.container(VIEW.w / 2, 170, [g, chest, this.relicIcon, title, this.relicName, this.relicText]).setDepth(UI_DEPTH + 1).setVisible(false);
  }

  // ---- Arrow Rain: the button above the ranger, dragged onto the field along a dashed arc.

  private createRain() {
    const depth = UI_DEPTH - 6;
    this.rainButton = this.add.image(RAIN.x, RAIN.y, 'rain-charging').setDepth(depth);
    this.add.text(RAIN.x, RAIN.y - RAIN.r - 17, 'Arrow Rain', textStyle(10, '#ffe7a0')).setOrigin(0.5).setDepth(depth + 1);
    this.rainBadge = this.add.text(RAIN.x + RAIN.r + 27, RAIN.y, '', textStyle(9, '#2b2010')).setOrigin(0.5).setDepth(depth + 1);
    this.rainHint = this.add.text(RAIN_HINT.x, RAIN_HINT.y, 'Drag onto the horde, let go to loose', textStyle(11, '#fff3d0')).setOrigin(0.5).setDepth(depth + 1);
    const hit = this.add.circle(RAIN.x, RAIN.y, RAIN.r + 6, 0x000000, 0.001).setDepth(depth + 2);
    hit.setInteractive({ useHandCursor: true }).on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.rainReady()) this.aim = { x: p.worldX, y: p.worldY };
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (this.aim) this.aim = { x: p.worldX, y: p.worldY };
    });
    const release = (p: Phaser.Input.Pointer) => {
      if (!this.aim) return;
      this.aim = { x: p.worldX, y: p.worldY };
      if (this.onField(this.aim)) loose(this.state, this.aim.x, this.aim.y);
      this.aim = null;
    };
    this.input.on('pointerup', release);
    this.input.on('pointerupoutside', release);
    // From the keyboard, R or Space looses Arrow Rain on the thickest crowd.
    const key = () => {
      const spot = this.rainReady() ? crowdSpot(this.state) : null;
      if (spot) loose(this.state, spot.x, spot.y);
    };
    this.input.keyboard?.on('keydown-R', key);
    this.input.keyboard?.on('keydown-SPACE', key);
  }

  private rainReady() {
    const s = this.state;
    return s.rain.charge >= s.rain.need && !s.choices && s.phase !== 'over' && !this.skillBook.open;
  }

  /** Whether a release here looses the volley: on the road in front of the barricade. */
  private onField(p: { x: number; y: number }) {
    return p.x > BARRICADE_FRONT + 10 && p.y > FIELD.top - 40 && p.y < FIELD.bottom + 20;
  }

  private drawRain() {
    const s = this.state;
    const ready = this.rainReady();
    const g = this.aimG;
    g.clear();
    const charge = Math.min(1, s.rain.charge / s.rain.need);
    const grow = ready && !this.aim ? 1 + 0.05 * this.pulse(800) : 1;
    this.rainButton.setTexture(ready ? 'rain-ready' : 'rain-charging').setScale(grow);
    // The label above, and a READY badge or the kills still needed beside it.
    drawPanel(g, RAIN.x - 36, RAIN.y - RAIN.r - 25, 72, 16, { c: 4, fill: 0x1e222c, alpha: 0.9, edge: GOLD.mid, lw: 1 });
    drawPanel(g, RAIN.x + RAIN.r + 5, RAIN.y - 8, 44, 16, { c: 4, fill: ready ? GOLD.mid : 0x1e222c, alpha: ready ? 1 : 0.9, edge: GOLD.mid, lw: 1 });
    this.rainBadge.setText(ready ? 'READY' : `${s.rain.charge}/${s.rain.need}`).setColor(ready ? '#2b2010' : '#ffe7a0');
    // The charge fills the octagon's rim, edge by edge.
    if (!ready) {
      const ring = Array.from({ length: 8 }, (_, i) => v(RAIN.x + Math.cos(Math.PI / 8 + (i * Math.PI) / 4) * 27, RAIN.y + Math.sin(Math.PI / 8 + (i * Math.PI) / 4) * 27));
      const edges = charge * 8;
      for (let i = 0; i < 8; i++) {
        const a = ring[(i + 5) % 8];
        const b = ring[(i + 6) % 8];
        const f = Phaser.Math.Clamp(edges - i, 0, 1);
        if (f <= 0) continue;
        g.lineStyle(4, GOLD.light, 1).lineBetween(a.x, a.y, a.x + (b.x - a.x) * f, a.y + (b.y - a.y) * f);
      }
    }
    this.rainHint.setVisible(ready);
    if (ready) drawPanel(g, RAIN_HINT.x - 118, RAIN_HINT.y - 12, 236, 24, { c: 6, fill: 0x1e222c, alpha: 0.88, edge: GOLD.mid, lw: 1.5 });

    // While dragged: a dashed arc from the button up over the field to a gold ring on the road.
    if (this.aim) {
      const on = this.onField(this.aim);
      const to = { x: this.aim.x, y: this.aim.y };
      const ctrl = { x: (ARC_FROM.x + to.x) / 2, y: Math.min(ARC_FROM.y, to.y) - 150 };
      const pts: V[] = [];
      for (let i = 0; i <= 40; i++) {
        const t = i / 40;
        pts.push(v((1 - t) * (1 - t) * ARC_FROM.x + 2 * (1 - t) * t * ctrl.x + t * t * to.x, (1 - t) * (1 - t) * ARC_FROM.y + 2 * (1 - t) * t * ctrl.y + t * t * (to.y - 20)));
      }
      const color = on ? GOLD.light : 0x9aa4ae;
      for (let i = 1; i < pts.length - 1; i += 2) {
        g.lineStyle(6, 0x281a08, 0.45).lineBetween(pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y);
        g.lineStyle(3, color).lineBetween(pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y);
      }
      const end = pts[pts.length - 1];
      const prev = pts[pts.length - 3];
      const ang = Math.atan2(end.y - prev.y, end.x - prev.x);
      g.fillStyle(color).fillTriangle(
        end.x + Math.cos(ang) * 11, end.y + Math.sin(ang) * 11,
        end.x + Math.cos(ang + 2.5) * 10, end.y + Math.sin(ang + 2.5) * 10,
        end.x + Math.cos(ang - 2.5) * 10, end.y + Math.sin(ang - 2.5) * 10,
      );
      this.drawRing(g, to.x, to.y, color, 1);
    }
    // Volleys in the air: the ring they will land on, and the shafts coming down.
    const seen = new Set<number>();
    for (const vol of s.rain.volleys) {
      seen.add(vol.id);
      const fall = Phaser.Math.Clamp(vol.ms / RAIN_FALL_MS, 0, 1);
      this.drawRing(g, vol.x, vol.y, GOLD.light, 1 - fall * 0.5);
      let arrows = this.rainArrows.get(vol.id);
      if (!arrows) {
        arrows = Array.from({ length: 14 }, () => this.add.image(0, 0, 'rain-arrow').setOrigin(0.5, 1).setDepth(UI_DEPTH - 35));
        this.rainArrows.set(vol.id, arrows);
      }
      arrows.forEach((img, i) => {
        const [dx, dy] = this.scatter(vol.id, i);
        const lag = (i % 4) * 0.08;
        const f = Phaser.Math.Clamp(fall + lag, 0, 1);
        img.setPosition(vol.x + dx * RAIN_RING.rx * 0.9 - f * 40, vol.y + dy * RAIN_RING.ry * 0.9 - f * 260).setRotation(0.15).setAlpha(f < 1 ? 1 : 0);
      });
    }
    for (const [id, arrows] of this.rainArrows) {
      if (seen.has(id)) continue;
      for (const img of arrows) img.destroy();
      this.rainArrows.delete(id);
    }
  }

  /** The Arrow Rain target ring lying on the road: a dashed gold ellipse round a soft fill. */
  private drawRing(g: Phaser.GameObjects.Graphics, x: number, y: number, color: number, alpha: number) {
    const { rx, ry } = RAIN_RING;
    g.fillStyle(color, 0.22 * alpha).fillEllipse(x, y, rx * 2, ry * 2);
    for (let k = 0; k < 16; k += 2) {
      const a0 = (k / 16) * Math.PI * 2;
      const a1 = ((k + 1) / 16) * Math.PI * 2;
      g.fillStyle(color, alpha).fillPoints(
        [
          v(x + Math.cos(a0) * rx, y + Math.sin(a0) * ry),
          v(x + Math.cos(a1) * rx, y + Math.sin(a1) * ry),
          v(x + Math.cos(a1) * (rx - 6), y + Math.sin(a1) * (ry - 4)),
          v(x + Math.cos(a0) * (rx - 6), y + Math.sin(a0) * (ry - 4)),
        ],
        true,
      );
    }
    g.lineStyle(1.5, color, 0.8 * alpha).strokePoints(
      Array.from({ length: 8 }, (_, i) => v(x + Math.cos((i / 8) * Math.PI * 2) * rx * 0.36, y + Math.sin((i / 8) * Math.PI * 2) * ry * 0.36)),
      true,
    );
  }

  // ---- After a fall, and the speed switch.

  private createGameOver() {
    const dim = this.add.rectangle(VIEW.w / 2, VIEW.h / 2, VIEW.w, VIEW.h, 0x0e1218, 0.7).setInteractive();
    const panel = this.add.graphics();
    drawPanel(panel, VIEW.w / 2 - 290, VIEW.h / 2 - 150, 580, 300, { c: 18, fill: SLATE.mid, alpha: 1, lw: 3 });
    const title = this.add.text(VIEW.w / 2, VIEW.h / 2 - 110, 'The hero has fallen', textStyle(30, '#ff9a7a', 5)).setOrigin(0.5);
    this.gameOverText = this.add
      .text(VIEW.w / 2, VIEW.h / 2 - 20, '', { ...textStyle(15, '#e9e4d8'), fontStyle: 'normal', align: 'center' })
      .setOrigin(0.5);
    const again = makeButton(this, VIEW.w / 2 - 100, VIEW.h / 2 + 100, 180, 40, 'Fight again', () => this.restart(false));
    const reset = makeButton(this, VIEW.w / 2 + 100, VIEW.h / 2 + 100, 180, 40, 'New hero', () => this.restart(true));
    this.gameOver = this.add.container(0, 0, [dim, panel, title, this.gameOverText, again, reset]).setDepth(UI_DEPTH + 20).setVisible(false);
  }

  /** The 1x/2x switch in the bottom bar; the choice is kept in its own storage key. */
  private createSpeedSwitch() {
    this.speed = loadSpeed();
    const { x, y, w, h } = SPEED;
    this.speedBg = this.add.graphics().setDepth(UI_DEPTH + 1);
    this.speedText = this.add.text(x, y, '', textStyle(14, '#ffe7a0')).setOrigin(0.5).setDepth(UI_DEPTH + 2);
    this.add
      .zone(x, y, w, h)
      .setDepth(UI_DEPTH + 3)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        this.speed = this.speed === 2 ? 1 : 2;
        saveSpeed(this.speed);
        this.showSpeed();
      });
    this.showSpeed();
  }

  /** The switch reads the speed it plays at, lit gold at 2x. */
  private showSpeed() {
    const { x, y, w, h } = SPEED;
    this.speedText.setText(`${this.speed}x`).setColor(this.speed === 2 ? '#2b2010' : '#ffe7a0');
    this.speedBg.clear();
    drawPanel(this.speedBg, x - w / 2, y - h / 2, w, h, { c: 5, fill: this.speed === 2 ? GOLD.mid : SLATE.light, alpha: 1, edge: GOLD.mid });
  }

  /** A new run from wave 1: with the hero's level and upgrades, or with a new hero from scratch. */
  private restart(newHero: boolean) {
    if (newHero) clearProgress();
    this.state = newHero ? newRun(freshProgress()) : fightAgain(this.state);
    saveProgress(progressOf(this.state));
    for (const sprite of [...this.foes.values(), ...this.missiles.values()]) sprite.destroy();
    this.foes.clear();
    this.missiles.clear();
  }
}
