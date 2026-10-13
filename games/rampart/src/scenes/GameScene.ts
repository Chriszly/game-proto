import Phaser from 'phaser';
import { foeTexture } from '../art/characters';
import { BAR, BOSS_BARS, FIRE, STORM } from '../art/palette';
import { ENEMIES } from '../game/enemies';
import { clearProgress, loadProgress, saveProgress } from '../game/save';
import { fightAgain, pick, rollChoices, tick } from '../game/sim';
import { freshProgress, newRun, progressOf, stats, xpToNext, type Enemy, type GameState } from '../game/state';
import type { UpgradeId } from '../game/upgrades';
import { isBossWave } from '../game/waves';
import { makeButton } from '../ui/Button';
import { LevelUp } from '../ui/LevelUp';
import { BOSS_BAR, FONT, HERO_FEET, HUD_HEIGHT, TOWER, UI_DEPTH, VIEW, WALL, XP_BAR } from './layout';

/** Longest simulated step, so a backgrounded tab doesn't jump the battle forward. */
const MAX_STEP_MS = 250;
/** How long a foe takes for one stride of its walk, in milliseconds. */
const STRIDE_MS = 360;
const HP_BAR_W = 30;

const textStyle = (size: number, color = '#f3e9d2') => ({
  fontFamily: FONT,
  fontSize: `${size}px`,
  color,
  stroke: '#1a1216',
  strokeThickness: 3,
});

export class GameScene extends Phaser.Scene {
  /** The run being played; read by the playthrough test. */
  state!: GameState;
  /** The level-up cards; the playthrough test reads where they are to tap one. */
  levelUp!: LevelUp;
  private foes = new Map<number, Phaser.GameObjects.Image>();
  private missiles = new Map<number, Phaser.GameObjects.Image>();
  private crits = new Map<number, Phaser.GameObjects.Text>();
  private hero!: Phaser.GameObjects.Image;
  private wall!: Phaser.GameObjects.Image;
  private bars!: Phaser.GameObjects.Graphics;
  private fx!: Phaser.GameObjects.Graphics;
  private hud!: Phaser.GameObjects.Graphics;
  private waveText!: Phaser.GameObjects.Text;
  private wallText!: Phaser.GameObjects.Text;
  private killsText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private xpText!: Phaser.GameObjects.Text;
  private banner!: Phaser.GameObjects.Text;
  private bossName!: Phaser.GameObjects.Text;
  private gameOver!: Phaser.GameObjects.Container;
  private gameOverText!: Phaser.GameObjects.Text;
  private lastArrowCooldown = 0;
  private clock = 0;
  private lastFrame: number | null = null;

  constructor() {
    super('Game');
  }

  create() {
    this.foes.clear();
    this.missiles.clear();
    this.crits.clear();
    this.state = newRun(loadProgress());
    if (this.state.levelUps > 0) this.state.choices = rollChoices(this.state);

    this.add.image(0, 0, 'background').setOrigin(0);
    this.add.image(TOWER.x, TOWER.y, 'tower').setOrigin(0.5, 0).setDepth(TOWER.y + 200);
    this.hero = this.add.image(HERO_FEET.x, HERO_FEET.y, 'hero').setOrigin(0.5, 1).setDepth(TOWER.y + 201);
    this.wall = this.add.image(WALL.x, WALL.y, 'wall-0').setOrigin(0).setDepth(1);
    this.bars = this.add.graphics().setDepth(UI_DEPTH - 20);
    this.fx = this.add.graphics().setDepth(UI_DEPTH - 30);
    this.createHud();
    this.createGameOver();
    this.levelUp = new LevelUp(this, (id) => this.pick(id));
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
    tick(s, dt);
    if (!s.choices && s.phase !== 'over') this.clock += dt;
    if (s.phase !== phase || s.wave !== wave || s.levelUps > levelUps) saveProgress(progressOf(s));

    this.drawFoes();
    this.drawMissiles();
    this.drawEffects();
    this.drawHero();
    this.drawHud();
    this.levelUp.show(s.phase === 'over' ? null : s.choices, s.ranks, s.level - s.levelUps + 1, s.levelUps);
    this.gameOver.setVisible(s.phase === 'over');
    if (s.phase === 'over') {
      this.gameOverText.setText(
        `The foes reached the tower on wave ${s.wave}.\n${s.kills} foes slain this run, best wave cleared: ${s.bestWave}.\n\n` +
          `The hero keeps level ${s.level} and every upgrade picked.`,
      );
    }
  }

  private pick(id: UpgradeId) {
    if (pick(this.state, id)) saveProgress(progressOf(this.state));
  }

  private drawFoes() {
    const seen = new Set<number>();
    this.bars.clear();
    for (const e of this.state.enemies) {
      seen.add(e.id);
      let sprite = this.foes.get(e.id);
      if (!sprite) {
        sprite = this.add.image(e.x, e.y, foeTexture(e.kind, 0)).setOrigin(0.5, 1).setFlipX(true);
        this.foes.set(e.id, sprite);
      }
      const type = ENEMIES[e.kind];
      const pace = e.slowMs > 0 ? 1 - e.slow : 1;
      // Walk in two frames with a bob; at the wall, lunge at it in time with the blows.
      const phase = ((this.clock * pace) / STRIDE_MS + e.id * 0.37) % 1;
      const frame = phase < 0.5 ? 0 : 1;
      const lunge = e.attacking ? -Math.max(0, Math.sin(phase * Math.PI * 2)) * 6 : 0;
      const bob = e.attacking ? 0 : -Math.abs(Math.sin(phase * Math.PI * 2)) * 2;
      const feet = e.y + type.radius * 0.6;
      sprite
        .setTexture(foeTexture(e.kind, e.attacking ? 0 : frame))
        .setPosition(e.x + lunge, feet + bob)
        .setDepth(feet);
      if (e.hitMs > 0) sprite.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
      else if (e.burnMs > 0) sprite.setTint(Math.floor(this.clock / 120) % 2 ? 0xffb070 : 0xffd8a0).setTintMode(Phaser.TintModes.MULTIPLY);
      else if (e.slowMs > 0) sprite.setTint(0xa8dcf8).setTintMode(Phaser.TintModes.MULTIPLY);
      else sprite.clearTint();
      if (!type.boss) this.drawHpBar(e, feet - sprite.height - 6);
      if (e.burnMs > 0) this.drawFlames(e, feet - sprite.height / 2);
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
    this.bars.fillStyle(BAR.back).fillRect(x, y, HP_BAR_W, 5);
    this.bars.fillStyle(BAR.empty).fillRect(x + 1, y + 1, HP_BAR_W - 2, 3);
    this.bars.fillStyle(BAR.hp).fillRect(x + 1, y + 1, fill, 3);
  }

  private drawFlames(e: Enemy, y: number) {
    for (let i = 0; i < 3; i++) {
      const t = (this.clock / 300 + i / 3 + e.id * 0.13) % 1;
      const fx = e.x + Math.sin(e.id * 7 + i * 2.1) * 10;
      this.fx.fillStyle(t < 0.5 ? FIRE.light : FIRE.mid, 1 - t).fillRect(Math.round(fx), Math.round(y - t * 22), 4, 4);
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
        this.missiles.set(m.id, sprite);
      }
      sprite.setPosition(m.x, m.y).setRotation(m.kind === 'arrow' ? Math.atan2(m.vy, m.vx) : this.clock / 80);
    }
    for (const [id, sprite] of this.missiles) {
      if (seen.has(id)) continue;
      sprite.destroy();
      this.missiles.delete(id);
    }
  }

  private drawEffects() {
    const g = this.fx;
    g.clear();
    const seen = new Set<number>();
    for (const e of this.state.effects) {
      const t = 1 - e.ms / e.total;
      if (e.kind === 'blast' || e.kind === 'fireblast') {
        const r = (e.radius ?? 40) * (0.4 + 0.6 * t);
        g.fillStyle(e.kind === 'fireblast' ? FIRE.mid : FIRE.light, 0.55 * (1 - t)).fillCircle(e.x, e.y, r);
        g.lineStyle(3, FIRE.white, 0.8 * (1 - t)).strokeCircle(e.x, e.y, r);
      } else if (e.kind === 'bolt' && e.points) {
        // A jagged bolt down from the sky to the first foe, then on from foe to foe.
        const path = [{ x: e.points[0].x - 30, y: HUD_HEIGHT + 10 }, ...e.points];
        for (const [width, color, alpha] of [[6, STORM.mid, 0.6], [2, STORM.white, 1]] as const) {
          g.lineStyle(width, color, alpha * (1 - t)).beginPath();
          g.moveTo(path[0].x, path[0].y);
          for (let i = 1; i < path.length; i++) {
            const a = path[i - 1];
            const b = path[i];
            const mid = { x: (a.x + b.x) / 2 + Math.sin(e.id + i * 3) * 12, y: (a.y + b.y) / 2 + Math.cos(e.id + i * 5) * 12 };
            g.lineTo(mid.x, mid.y).lineTo(b.x, b.y);
          }
          g.strokePath();
        }
      } else if (e.kind === 'death') {
        // A puff of dust where the foe fell.
        const r = (e.radius ?? 16) * (0.6 + 0.8 * t);
        g.fillStyle(0xd8cfa8, 0.5 * (1 - t)).fillCircle(e.x - r / 3, e.y + 8 - t * 10, r / 2).fillCircle(e.x + r / 3, e.y + 4 - t * 14, r / 2.5);
      } else if (e.kind === 'crit') {
        seen.add(e.id);
        let text = this.crits.get(e.id);
        if (!text) {
          text = this.add.text(e.x, e.y, 'Crit!', textStyle(14, '#f8d460')).setOrigin(0.5).setDepth(UI_DEPTH - 10);
          this.crits.set(e.id, text);
        }
        text.setPosition(e.x, e.y - 20 - t * 18).setAlpha(1 - t);
      }
    }
    for (const [id, text] of this.crits) {
      if (seen.has(id)) continue;
      text.destroy();
      this.crits.delete(id);
    }
  }

  private drawHero() {
    // The bow kicks back a little with each shot.
    const cd = this.state.cooldown.arrow;
    if (cd > this.lastArrowCooldown) this.hero.setX(HERO_FEET.x - 3);
    else this.hero.setX(Math.min(HERO_FEET.x, this.hero.x + 0.5));
    this.lastArrowCooldown = cd;
    const wall = this.state.wall;
    const health = wall.hp / wall.max;
    this.wall.setTexture(wall.hp <= 0 ? 'wall-3' : health > 0.66 ? 'wall-0' : health > 0.33 ? 'wall-1' : 'wall-2');
  }

  private createHud() {
    this.hud = this.add.graphics().setDepth(UI_DEPTH);
    this.waveText = this.add.text(16, 10, '', textStyle(18, '#f3c64e')).setDepth(UI_DEPTH + 1);
    this.wallText = this.add.text(176, 12, '', textStyle(14)).setDepth(UI_DEPTH + 1);
    this.killsText = this.add.text(VIEW.w - 16, 12, '', textStyle(14)).setOrigin(1, 0).setDepth(UI_DEPTH + 1);
    this.levelText = this.add.text(16, XP_BAR.y - 2, '', textStyle(16, '#a8dcf8')).setDepth(UI_DEPTH + 1);
    this.xpText = this.add.text(XP_BAR.x + XP_BAR.w / 2, XP_BAR.y + XP_BAR.h / 2, '', textStyle(12)).setOrigin(0.5).setDepth(UI_DEPTH + 1);
    this.banner = this.add.text(VIEW.w / 2, 170, '', textStyle(40, '#f3c64e')).setOrigin(0.5).setDepth(UI_DEPTH + 1);
    this.bossName = this.add.text(BOSS_BAR.x, BOSS_BAR.y - 4, '', textStyle(14, '#f4a08a')).setOrigin(0.5, 1).setDepth(UI_DEPTH + 1);
  }

  private drawHud() {
    const s = this.state;
    const g = this.hud;
    g.clear();
    g.fillStyle(0x2c2018, 0.92).fillRect(0, 0, VIEW.w, HUD_HEIGHT);
    g.fillStyle(0x5a3f2a).fillRect(0, HUD_HEIGHT - 3, VIEW.w, 3);
    this.waveText.setText(`Wave ${s.wave}`);

    // The wall's health in the top bar.
    const wx = 230;
    const ww = 200;
    g.fillStyle(BAR.back).fillRect(wx, 12, ww, 16);
    g.fillStyle(BAR.empty).fillRect(wx + 2, 14, ww - 4, 12);
    g.fillStyle(s.wall.hp > 0 ? BAR.wall : BAR.empty).fillRect(wx + 2, 14, Math.round((ww - 4) * (s.wall.hp / s.wall.max)), 12);
    this.wallText.setText('Wall');
    this.killsText.setText(`Foes left ${s.toSpawn.length + s.enemies.length}   Slain ${s.kills}   Best wave ${s.bestWave}`);

    // Experience along the bottom.
    const need = xpToNext(s.level);
    g.fillStyle(0x2c2018, 0.92).fillRect(0, XP_BAR.y - 8, VIEW.w, VIEW.h - XP_BAR.y + 8);
    g.fillStyle(BAR.back).fillRect(XP_BAR.x, XP_BAR.y, XP_BAR.w, XP_BAR.h);
    g.fillStyle(BAR.empty).fillRect(XP_BAR.x + 2, XP_BAR.y + 2, XP_BAR.w - 4, XP_BAR.h - 4);
    g.fillStyle(BAR.xp).fillRect(XP_BAR.x + 2, XP_BAR.y + 2, Math.round((XP_BAR.w - 4) * Math.min(1, s.xp / need)), XP_BAR.h - 4);
    g.fillStyle(0xffffff, 0.3).fillRect(XP_BAR.x + 2, XP_BAR.y + 2, Math.round((XP_BAR.w - 4) * Math.min(1, s.xp / need)), 2);
    this.levelText.setText(`Level ${s.level}`);
    this.xpText.setText(`${Math.floor(s.xp)} / ${need} XP`);

    // The wave's banner during the break before it.
    const breaking = s.phase === 'break' && !s.choices;
    this.banner.setVisible(breaking).setText(isBossWave(s.wave) ? `Wave ${s.wave}\nThe Troll King comes!` : `Wave ${s.wave}`);
    this.banner.setAlign('center').setAlpha(breaking ? Math.min(1, s.breakMs / 500) : 0);

    // The boss's stacked health bars: the bar in front empties to show the next one's colour.
    const boss = s.enemies.find((e) => ENEMIES[e.kind].boss);
    this.bossName.setVisible(!!boss);
    if (boss) {
      const per = boss.maxHp / boss.bars;
      const left = Math.max(0, Math.ceil(boss.hp / per) - 1);
      const fill = (boss.hp - left * per) / per;
      const x = BOSS_BAR.x - BOSS_BAR.w / 2;
      g.fillStyle(BAR.back).fillRect(x - 2, BOSS_BAR.y - 2, BOSS_BAR.w + 4, BOSS_BAR.h + 4);
      g.fillStyle(left > 0 ? BOSS_BARS[(left - 1) % BOSS_BARS.length] : BAR.empty).fillRect(x, BOSS_BAR.y, BOSS_BAR.w, BOSS_BAR.h);
      g.fillStyle(BOSS_BARS[left % BOSS_BARS.length]).fillRect(x, BOSS_BAR.y, Math.round(BOSS_BAR.w * fill), BOSS_BAR.h);
      g.fillStyle(0xffffff, 0.3).fillRect(x, BOSS_BAR.y, Math.round(BOSS_BAR.w * fill), 3);
      this.bossName.setText(`${ENEMIES[boss.kind].name}   x${left + 1}`);
    }
  }

  private createGameOver() {
    const dim = this.add.rectangle(VIEW.w / 2, VIEW.h / 2, VIEW.w, VIEW.h, 0x0e0a08, 0.7).setInteractive();
    const panel = this.add.rectangle(VIEW.w / 2, VIEW.h / 2, 560, 300, 0x2c2018).setStrokeStyle(4, 0x8a5a32);
    const title = this.add.text(VIEW.w / 2, VIEW.h / 2 - 110, 'The hero has fallen', textStyle(30, '#e0584f')).setOrigin(0.5);
    this.gameOverText = this.add
      .text(VIEW.w / 2, VIEW.h / 2 - 20, '', { fontFamily: FONT, fontSize: '16px', color: '#f1e3c6', align: 'center' })
      .setOrigin(0.5);
    const again = makeButton(this, VIEW.w / 2 - 100, VIEW.h / 2 + 100, 'Fight again', () => this.restart(false));
    const reset = makeButton(this, VIEW.w / 2 + 100, VIEW.h / 2 + 100, 'New hero', () => this.restart(true));
    this.gameOver = this.add.container(0, 0, [dim, panel, title, this.gameOverText, again, reset]).setDepth(UI_DEPTH + 20).setVisible(false);
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
