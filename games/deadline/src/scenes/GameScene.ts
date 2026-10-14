import Phaser from 'phaser';
import { settings } from '../../../../shared/settings';
import { HERO_RIFLE_X, UPGRADE_COLORS } from '../art/sprites';
import { Pool } from '../game/pool';
import {
  BASE_STATS,
  BREAK_MS,
  BULLET,
  ENEMIES,
  HERO,
  HUD_HEIGHT,
  MAX_COMPANIONS,
  PICKUP,
  REACH_Y,
  SPAWN_Y,
  SQUAD_SLOTS,
  UPGRADE_KINDS,
  UPGRADES,
  VIEW,
  applyUpgrade,
  isBossWave,
  planWave,
  type EnemyKind,
  type Spawn,
  type Stats,
  type UpgradeKind,
} from '../game/rules';

const DEPTH = { ground: 0, sandbags: 5, splats: 8, pickups: 10, enemies: 20, hero: 40, bullets: 45, bars: 50, hud: 100 };
const TEXT = { fontFamily: 'ui-monospace, "Courier New", monospace', color: '#f1e3c6' };
/** How long a fallen enemy's splat stays on the road, in ms. */
const SPLAT_MS = 900;

interface Enemy {
  alive: boolean;
  id: number;
  kind: EnemyKind;
  hp: number;
  maxHp: number;
  x: number;
  y: number;
  sprite: Phaser.GameObjects.Image;
}

interface Pickup {
  alive: boolean;
  id: number;
  upgrade: UpgradeKind;
  hp: number;
  maxHp: number;
  x: number;
  y: number;
  sprite: Phaser.GameObjects.Image;
  label: Phaser.GameObjects.Text;
  hpText: Phaser.GameObjects.Text;
}

interface Bullet {
  alive: boolean;
  x: number;
  y: number;
  /** Where it was last frame: hits are tested along the whole stretch it moved. */
  prevY: number;
  /** Targets it can still hit, and the ids of those it already went through. */
  hitsLeft: number;
  hit: number[];
  sprite: Phaser.GameObjects.Image;
}

interface Splat {
  alive: boolean;
  age: number;
  sprite: Phaser.GameObjects.Image;
}

/** What the game is doing: fighting a wave, the pause after one, or overrun. */
export type Phase = 'wave' | 'break' | 'over';

export interface GameState {
  wave: number;
  phase: Phase;
  kills: number;
  stats: Stats;
  /** How many of each pickup the hero has collected. */
  collected: Record<UpgradeKind, number>;
}

export class GameScene extends Phaser.Scene {
  state!: GameState;
  player!: Phaser.GameObjects.Image;
  /** Where on the line the hero is walking to after a tap or drag, or null when standing. */
  pointerTarget: number | null = null;
  /** The companions at the hero's side, in the order of their `SQUAD_SLOTS` after the hero's. */
  squad: Phaser.GameObjects.Image[] = [];

  private enemies!: Pool<Enemy>;
  private pickups!: Pool<Pickup>;
  private bullets!: Pool<Bullet>;
  private splats!: Pool<Splat>;
  private nextId = 1;
  private plan: Spawn[] = [];
  private waveClock = 0;
  private fireClock = 0;
  private breakClock = 0;

  private ground!: Phaser.GameObjects.TileSprite;
  private bars!: Phaser.GameObjects.Graphics;
  private hud!: { wave: Phaser.GameObjects.Text; kills: Phaser.GameObjects.Text; stats: Phaser.GameObjects.Text };
  private banner!: Phaser.GameObjects.Text;
  private overlay: Phaser.GameObjects.GameObject[] = [];
  private keys!: { left: Phaser.Input.Keyboard.Key[]; right: Phaser.Input.Keyboard.Key[] };

  constructor() {
    super('Game');
  }

  create() {
    this.state = {
      wave: 0,
      phase: 'wave',
      kills: 0,
      stats: { ...BASE_STATS },
      collected: Object.fromEntries(UPGRADE_KINDS.map((k) => [k, 0])) as Record<UpgradeKind, number>,
    };
    this.pointerTarget = null;
    this.nextId = 1;
    this.fireClock = 0;
    this.overlay = [];
    this.squad = [];

    this.ground = this.add.tileSprite(0, 0, VIEW.w, VIEW.h, 'ground').setOrigin(0).setDepth(DEPTH.ground);
    // Sandbags mark the hero's line: an enemy that gets to them has reached the hero.
    for (let x = 12; x < VIEW.w; x += 28) this.add.image(x, REACH_Y + 6, 'sandbag').setDepth(DEPTH.sandbags);
    // The hero's x is where their rifle is, so the bullets go up from under the spot that was tapped.
    this.player = this.add.image(VIEW.w / 2, HERO.y, 'hero').setOrigin(HERO_RIFLE_X, 0.5).setDepth(this.squadDepth(0));
    this.bars = this.add.graphics().setDepth(DEPTH.bars);

    this.enemies = new Pool<Enemy>(
      () => ({ alive: false, id: 0, kind: 'grunt', hp: 0, maxHp: 0, x: 0, y: 0, sprite: this.add.image(0, 0, 'grunt') }),
      (e) => e.sprite.setVisible(false),
    );
    this.pickups = new Pool<Pickup>(
      () => ({
        alive: false, id: 0, upgrade: 'rate', hp: 0, maxHp: 0, x: 0, y: 0,
        sprite: this.add.image(0, 0, 'crate-rate').setDepth(DEPTH.pickups),
        label: this.add.text(0, 0, '', { ...TEXT, fontSize: '14px', fontStyle: 'bold', stroke: '#15110e', strokeThickness: 4 }).setOrigin(0.5, 0).setDepth(DEPTH.bars),
        hpText: this.add.text(0, 0, '', { ...TEXT, fontSize: '16px', fontStyle: 'bold', stroke: '#15110e', strokeThickness: 4 }).setOrigin(0.5).setDepth(DEPTH.bars),
      }),
      (p) => [p.sprite, p.label, p.hpText].forEach((o) => o.setVisible(false)),
    );
    this.bullets = new Pool<Bullet>(
      () => ({ alive: false, x: 0, y: 0, prevY: 0, hitsLeft: 0, hit: [], sprite: this.add.image(0, 0, 'bullet').setDepth(DEPTH.bullets) }),
      (b) => b.sprite.setVisible(false),
    );
    this.splats = new Pool<Splat>(
      () => ({ alive: false, age: 0, sprite: this.add.image(0, 0, 'splat').setDepth(DEPTH.splats) }),
      (s) => s.sprite.setVisible(false),
    );

    this.createHud();
    this.createInput();
    this.startWave(1);
  }

  /** The enemies in play, for the HUD and the playthrough test. */
  liveEnemies() {
    return this.enemies.live().map(({ id, kind, hp, maxHp, x, y }) => ({ id, kind, hp, maxHp, x, y }));
  }

  /** The pickups in play: what they give, how many hits are left to open them and where they are. */
  livePickups() {
    return this.pickups.live().map(({ id, upgrade, hp, maxHp, x, y }) => ({ id, upgrade, hp, maxHp, x, y }));
  }

  /** How many enemies of the wave have yet to come in. */
  enemiesToCome() {
    return this.plan.filter((s) => s.type === 'enemy').length;
  }

  private createHud() {
    const bar = this.add.graphics().setDepth(DEPTH.hud);
    bar.fillStyle(0x15110e, 0.85).fillRect(0, 0, VIEW.w, HUD_HEIGHT);
    bar.fillStyle(0x5a3f2a).fillRect(0, HUD_HEIGHT - 3, VIEW.w, 3);
    this.hud = {
      wave: this.add.text(14, 8, '', { ...TEXT, fontSize: '20px', fontStyle: 'bold', color: '#f3c64e' }).setDepth(DEPTH.hud),
      kills: this.add.text(VIEW.w - 14, 8, '', { ...TEXT, fontSize: '20px', fontStyle: 'bold' }).setOrigin(1, 0).setDepth(DEPTH.hud),
      stats: this.add.text(14, 33, '', { ...TEXT, fontSize: '14px', color: '#d8c7a6', stroke: '#15110e', strokeThickness: 3 }).setDepth(DEPTH.hud),
    };
    this.banner = this.add
      .text(VIEW.w / 2, VIEW.h * 0.38, '', { ...TEXT, fontSize: '40px', fontStyle: 'bold', color: '#f3c64e', stroke: '#15110e', strokeThickness: 8, align: 'center' })
      .setOrigin(0.5)
      .setDepth(DEPTH.hud)
      .setAlpha(0);
  }

  private createInput() {
    const kb = this.input.keyboard!;
    const K = Phaser.Input.Keyboard.KeyCodes;
    this.keys = {
      left: [kb.addKey(K.LEFT), kb.addKey(K.A)],
      right: [kb.addKey(K.RIGHT), kb.addKey(K.D)],
    };
    // Tap or drag anywhere: the hero walks along their line to below that spot.
    const aim = (p: Phaser.Input.Pointer) => {
      if (this.state.phase === 'over') return;
      const [minX, maxX] = this.heroRange();
      this.pointerTarget = Phaser.Math.Clamp(p.worldX, minX, maxX);
    };
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.state.phase === 'over') this.scene.restart();
      else aim(p);
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => p.isDown && aim(p));
  }

  private startWave(wave: number) {
    this.state.wave = wave;
    this.state.phase = 'wave';
    this.plan = planWave(wave);
    this.waveClock = 0;
    this.showBanner(isBossWave(wave) ? `Wave ${wave}\nBoss incoming!` : `Wave ${wave}`);
  }

  private showBanner(text: string) {
    this.tweens.killTweensOf(this.banner);
    this.banner.setText(text).setAlpha(1);
    this.tweens.add({ targets: this.banner, alpha: 0, delay: 1200, duration: 400 });
  }

  update(_time: number, delta: number) {
    const dt = Math.min(delta, 100);
    if (this.state.phase === 'over') return;
    this.ground.tilePositionY -= (18 * dt) / 1000;
    this.moveHero(dt);
    this.spawn(dt);
    this.fire(dt);
    this.moveBullets(dt);
    this.moveEnemies(dt);
    this.movePickups(dt);
    this.hitTargets();
    this.fadeSplats(dt);
    this.checkWave(dt);
    this.drawBars();
    this.updateHud();
  }

  /**
   * How far left and right the hero can go: as far as `HERO.minX..HERO.maxX` allows for every rifle
   * in the squad, so companions never walk off the road or bunch up against its edge.
   */
  private heroRange(): [number, number] {
    const slots = SQUAD_SLOTS.slice(0, 1 + this.squad.length);
    return [HERO.minX - Math.min(...slots.map((s) => s.dx)), HERO.maxX - Math.max(...slots.map((s) => s.dx))];
  }

  /** Rows further back draw on top of the ones ahead of them, as they are closer to the camera. */
  private squadDepth(slot: number) {
    return DEPTH.hero + SQUAD_SLOTS[slot].dy / 100;
  }

  private moveHero(dt: number) {
    const left = this.keys.left.some((k) => k.isDown), right = this.keys.right.some((k) => k.isDown);
    const step = (HERO.speed * dt) / 1000;
    const [minX, maxX] = this.heroRange();
    if (this.pointerTarget !== null) this.pointerTarget = Phaser.Math.Clamp(this.pointerTarget, minX, maxX);
    if (left !== right) {
      this.pointerTarget = null;
      this.player.x += left ? -step : step;
    } else if (this.pointerTarget !== null) {
      const dx = this.pointerTarget - this.player.x;
      if (Math.abs(dx) <= step) {
        this.player.x = this.pointerTarget;
        this.pointerTarget = null;
      } else this.player.x += Math.sign(dx) * step;
    }
    this.player.x = Phaser.Math.Clamp(this.player.x, minX, maxX);
    this.squad.forEach((c, i) => c.setPosition(this.player.x + SQUAD_SLOTS[i + 1].dx, HERO.y + SQUAD_SLOTS[i + 1].dy));
  }

  private spawn(dt: number) {
    if (this.state.phase !== 'wave') return;
    this.waveClock += dt;
    while (this.plan.length && this.plan[0].at <= this.waveClock) {
      const s = this.plan.shift()!;
      if (s.type === 'enemy') {
        const e = this.enemies.take();
        Object.assign(e, { id: this.nextId++, kind: s.kind, hp: s.hp, maxHp: s.hp, x: s.x, y: SPAWN_Y });
        e.sprite.setTexture(s.kind).setPosition(e.x, e.y).setVisible(true);
      } else {
        // Once every slot in the squad is filled, a companion crate brings extra damage instead.
        const upgrade = s.upgrade === 'companion' && this.state.stats.companions >= MAX_COMPANIONS ? 'damage' : s.upgrade;
        const p = this.pickups.take();
        Object.assign(p, { id: this.nextId++, upgrade, hp: s.hp, maxHp: s.hp, x: s.x, y: SPAWN_Y });
        p.sprite.setTexture(`crate-${upgrade}`).setVisible(true);
        const color = `#${UPGRADE_COLORS[upgrade].toString(16).padStart(6, '0')}`;
        p.label.setText(UPGRADES[upgrade].label).setColor(color).setVisible(true);
        p.hpText.setVisible(true);
      }
    }
  }

  /** Fires a volley straight up every so often: one bullet from the hero and from each companion. */
  private fire(dt: number) {
    this.fireClock += dt;
    const { fireInterval, pierce } = this.state.stats;
    while (this.fireClock >= fireInterval) {
      this.fireClock -= fireInterval;
      for (let i = 0; i <= this.squad.length; i++) {
        const b = this.bullets.take();
        b.x = this.player.x + SQUAD_SLOTS[i].dx;
        b.y = b.prevY = HERO.y + SQUAD_SLOTS[i].dy - 30;
        b.hitsLeft = 1 + pierce;
        b.hit.length = 0;
        b.sprite.setPosition(b.x, b.y).setVisible(true);
      }
    }
  }

  private moveBullets(dt: number) {
    for (const b of this.bullets.all) {
      if (!b.alive) continue;
      b.prevY = b.y;
      b.y -= (BULLET.speed * dt) / 1000;
      if (b.y < HUD_HEIGHT - 10) this.bullets.release(b);
      else b.sprite.y = b.y;
    }
  }

  /**
   * The horde walks down, each one veering towards the hero. Each aims a little to one side, so they
   * come as a crowd rather than in single file. Reaching the hero's line ends the game.
   */
  private moveEnemies(dt: number) {
    for (const e of this.enemies.all) {
      if (!e.alive) continue;
      const { speed, steer } = ENEMIES[e.kind];
      e.y += (speed * dt) / 1000;
      const aside = e.kind === 'boss' ? 0 : ((e.id * 53) % 81) - 40;
      const dx = this.player.x + aside - e.x, maxStep = (steer * dt) / 1000;
      e.x += Phaser.Math.Clamp(dx, -maxStep, maxStep);
      // A little shamble from side to side, the same for every frame rate (none when motion is reduced).
      const sway = settings.reduceMotion ? 0 : Math.sin((e.y + e.id * 37) / 9) * 1.5;
      e.sprite.setPosition(e.x + sway, e.y).setDepth(DEPTH.enemies + e.y / VIEW.h);
      if (e.y + ENEMIES[e.kind].radius >= REACH_Y) return this.gameOver();
    }
  }

  private movePickups(dt: number) {
    for (const p of this.pickups.all) {
      if (!p.alive) continue;
      p.y += (PICKUP.speed * dt) / 1000;
      // A pickup nobody opened is lost behind the sandbags.
      if (p.y - PICKUP.halfSize > REACH_Y) {
        this.pickups.release(p);
        continue;
      }
      p.sprite.setPosition(p.x, p.y);
      p.label.setPosition(p.x, p.y + PICKUP.halfSize + 2);
      p.hpText.setPosition(p.x, p.y).setText(String(p.hp));
    }
  }

  private hitTargets() {
    const damage = this.state.stats.damage;
    for (const b of this.bullets.all) {
      if (!b.alive) continue;
      // Swept along the stretch from prevY up to y, so a long frame can't carry a bullet through a
      // target; the nearest ones (largest y) are hit first.
      const hits = this.enemies.all.filter((e) => {
        if (!e.alive || b.hit.includes(e.id)) return false;
        const r = ENEMIES[e.kind].radius + BULLET.radius;
        const nearY = Phaser.Math.Clamp(e.y, b.y, b.prevY);
        return (b.x - e.x) ** 2 + (nearY - e.y) ** 2 <= r * r;
      });
      hits.sort((a, c) => c.y - a.y);
      for (const e of hits) {
        b.hit.push(e.id);
        e.hp -= damage;
        if (e.hp <= 0) this.kill(e);
        if (--b.hitsLeft <= 0) break;
      }
      if (b.hitsLeft <= 0) {
        this.bullets.release(b);
        continue;
      }
      for (const p of this.pickups.all) {
        if (!p.alive || b.hit.includes(p.id)) continue;
        const reach = PICKUP.halfSize + BULLET.radius;
        if (Math.abs(b.x - p.x) > reach || b.y > p.y + reach || b.prevY < p.y - reach) continue;
        b.hit.push(p.id);
        p.hp -= damage;
        if (p.hp <= 0) this.collect(p);
        if (--b.hitsLeft <= 0) break;
      }
      if (b.hitsLeft <= 0) this.bullets.release(b);
    }
  }

  private kill(e: Enemy) {
    this.state.kills++;
    const s = this.splats.take();
    s.age = 0;
    s.sprite.setPosition(e.x, e.y).setScale(e.kind === 'boss' ? 3 : e.kind === 'brute' ? 1.6 : 1).setAlpha(1).setVisible(true);
    this.enemies.release(e);
  }

  private collect(p: Pickup) {
    // A companion crate that was already falling when the squad filled up brings damage instead.
    const upgrade = p.upgrade === 'companion' && this.state.stats.companions >= MAX_COMPANIONS ? 'damage' : p.upgrade;
    this.state.stats = applyUpgrade(this.state.stats, upgrade);
    this.state.collected[upgrade]++;
    if (upgrade === 'companion') this.addCompanions();
    const color = `#${UPGRADE_COLORS[upgrade].toString(16).padStart(6, '0')}`;
    const pop = this.add
      .text(this.player.x, HERO.y - 50, UPGRADES[upgrade].label, { ...TEXT, fontSize: '18px', fontStyle: 'bold', color, stroke: '#15110e', strokeThickness: 5 })
      .setOrigin(0.5)
      .setDepth(DEPTH.hud);
    this.tweens.add({ targets: pop, y: pop.y - 60, alpha: 0, duration: 1200, onComplete: () => pop.destroy() });
    this.pickups.release(p);
  }

  /** Brings in companions until the squad matches the stats, each in the next free slot. */
  private addCompanions() {
    while (this.squad.length < this.state.stats.companions) {
      const slot = SQUAD_SLOTS[this.squad.length + 1];
      const c = this.add
        .image(this.player.x + slot.dx, HERO.y + slot.dy, 'companion')
        .setOrigin(HERO_RIFLE_X, 0.5)
        .setDepth(this.squadDepth(this.squad.length + 1));
      this.squad.push(c);
    }
    // A companion that joins near the road's edge pushes the squad back onto it.
    const [minX, maxX] = this.heroRange();
    this.player.x = Phaser.Math.Clamp(this.player.x, minX, maxX);
  }

  private fadeSplats(dt: number) {
    for (const s of this.splats.all) {
      if (!s.alive) continue;
      s.age += dt;
      if (s.age >= SPLAT_MS) this.splats.release(s);
      else s.sprite.setAlpha(1 - s.age / SPLAT_MS);
    }
  }

  /** A wave is cleared once every enemy in it has come in and fallen; the next one follows a short pause. */
  private checkWave(dt: number) {
    if (this.state.phase === 'wave') {
      if (this.enemiesToCome() === 0 && this.enemies.live().length === 0) {
        this.state.phase = 'break';
        this.breakClock = 0;
        this.showBanner(`Wave ${this.state.wave} cleared!`);
      }
    } else if (this.state.phase === 'break') {
      this.breakClock += dt;
      if (this.breakClock >= BREAK_MS) this.startWave(this.state.wave + 1);
    }
  }

  /** Health bars over hurt enemies and pickups. */
  private drawBars() {
    const g = this.bars.clear();
    for (const e of this.enemies.all) {
      if (!e.alive || e.hp === e.maxHp) continue;
      const r = ENEMIES[e.kind].radius, w = r * 2, top = e.y - r - 12;
      g.fillStyle(0x15110e).fillRect(e.x - r - 1, top - 1, w + 2, 6);
      g.fillStyle(0xe2593f).fillRect(e.x - r, top, (w * e.hp) / e.maxHp, 4);
    }
    // A boss also gets a big bar along the top of the screen, under the HUD, clear of the squad.
    const boss = this.enemies.all.find((e) => e.alive && e.kind === 'boss');
    if (boss) {
      const y = HUD_HEIGHT + 8;
      g.fillStyle(0x15110e).fillRect(40, y, VIEW.w - 80, 14);
      g.fillStyle(0xb34a3a).fillRect(42, y + 2, ((VIEW.w - 84) * boss.hp) / boss.maxHp, 10);
    }
  }

  private updateHud() {
    const { wave, kills, stats } = this.state;
    this.hud.wave.setText(`WAVE ${wave}`);
    this.hud.kills.setText(`Kills ${kills}`);
    const perSecond = (1000 / stats.fireInterval).toFixed(1);
    this.hud.stats.setText(`Damage ${stats.damage}   Rate ${perSecond}/s   Squad ${stats.companions + 1}   Pierce ${stats.pierce}`);
  }

  private gameOver() {
    this.state.phase = 'over';
    this.pointerTarget = null;
    this.updateHud();
    const shade = this.add.rectangle(0, 0, VIEW.w, VIEW.h, 0x000000, 0.6).setOrigin(0).setDepth(DEPTH.hud + 1);
    const title = this.add
      .text(VIEW.w / 2, VIEW.h * 0.4, 'Overrun!', { ...TEXT, fontSize: '48px', fontStyle: 'bold', color: '#e2593f', stroke: '#15110e', strokeThickness: 8 })
      .setOrigin(0.5)
      .setDepth(DEPTH.hud + 2);
    const info = this.add
      .text(VIEW.w / 2, VIEW.h * 0.4 + 70, `Reached wave ${this.state.wave} with ${this.state.kills} kills\n\nTap to try again`, { ...TEXT, fontSize: '20px', align: 'center' })
      .setOrigin(0.5, 0)
      .setDepth(DEPTH.hud + 2);
    this.overlay.push(shade, title, info);
  }
}
