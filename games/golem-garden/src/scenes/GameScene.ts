import Phaser from 'phaser';
import { settings } from '../../../../shared/settings';
import { TREE_FLOWERS } from '../art/textures';
import { MAP, PATH_CORNERS, cellAt, pathPoint } from '../game/board';
import {
  BLOOM_GOAL,
  EARLY_BONUS,
  GOLEMS,
  GOLEM_INFO,
  MAX_LEVEL,
  PESTS,
  golemStats,
  waveBonus,
  waveCounts,
  type GolemKind,
  type PestKind,
} from '../game/data';
import { loadBest, saveBest } from '../game/save';
import {
  SHOT_MS,
  canCallEarly,
  canPlant,
  golemAt,
  newGame,
  nextWave,
  plant,
  select,
  startWave,
  tick,
  unlocked,
  upgrade,
  upgradeCost,
  type GameState,
  type Pop,
} from '../game/state';
import { makeButton } from '../ui/Button';
import { FONT, GRID, HINT, HUD, PANEL, PREVIEW, SEED_BUTTONS, UI_DEPTH, VIEW, WAVE_BUTTON, cellCentre } from './layout';

/** The longest frame the rules play in one go, in ms; a longer pause (a hidden tab) plays as this. */
const MAX_STEP_MS = 100;
/** How long the "Wave cleared" banner shows, in ms. */
const BANNER_MS = 2200;
/** Where a golem's or ghost's feet are, below its cell's centre, and the anchor of its texture. */
const FEET = 25;
const GOLEM_ORIGIN = { x: 0.5, y: 78 / 88 };
const PEST_ORIGIN = { x: 0.5, y: 34 / 60 };
/** How long a sap droplet takes to fly to the counter, in ms. */
const DROP_MS = 650;

type Rect = { x: number; y: number; w: number; h: number };
type Text = Phaser.GameObjects.Text;
type Image = Phaser.GameObjects.Image;

export class GameScene extends Phaser.Scene {
  state!: GameState;
  /** Where the seed cards are, in view pixels; read by the playthrough test. */
  seedButtons: (Rect & { kind: GolemKind })[] = [];
  /** Where the wave button is, in view pixels; read by the playthrough test. */
  waveButton: Rect = { x: WAVE_BUTTON.x, y: WAVE_BUTTON.y, w: WAVE_BUTTON.w, h: WAVE_BUTTON.h };
  /** What the wave button says, on one line; read by the playthrough test. */
  waveLabel = '';

  private lastFrame: number | null = null;
  private hover: { col: number; row: number } | null = null;
  private golems = new Map<number, Image>();
  private pests = new Map<number, { body: Image; slow: Image }>();
  private shots = new Map<number, Image>();
  private tree!: Image;
  private treeFlowers: Image[] = [];
  private bars!: Phaser.GameObjects.Graphics;
  private hoverGfx!: Phaser.GameObjects.Graphics;
  private ghost!: Image;
  private hud!: { wave: Text; heart: Text; sap: Text; best: Text; bloom: Text; bloomSub: Text; flowers: Image[]; glow: Image };
  private cards: { kind: GolemKind; rim: Image; card: Image; open: Phaser.GameObjects.Container; locked?: Phaser.GameObjects.Container }[] = [];
  private lockPips!: Phaser.GameObjects.Graphics;
  private preview!: { title: Text; icons: Record<PestKind, Image>; counts: Record<PestKind, Text> };
  private hint!: Text;
  private waveBg!: Image;
  private waveText!: Text;
  private waveSub!: Text;
  private waveDrop!: Image;
  private banner!: Text;
  private gameOver!: Phaser.GameObjects.Container;
  private gameOverText!: Text;

  constructor() {
    super('Game');
  }

  create() {
    this.state = newGame(loadBest());
    this.lastFrame = null;
    // A restart (Replant) reuses this scene object, so start these afresh.
    this.hover = null;
    this.cards = [];
    this.treeFlowers = [];
    this.golems.clear();
    this.pests.clear();
    this.shots.clear();

    this.add.image(0, 0, 'bg').setOrigin(0);
    this.createBoard();
    this.bars = this.add.graphics().setDepth(UI_DEPTH - 20);
    this.hoverGfx = this.add.graphics().setDepth(UI_DEPTH - 30);
    this.ghost = this.add
      .image(0, 0, 'golem-pebble')
      .setAlpha(0.6)
      .setOrigin(GOLEM_ORIGIN.x, GOLEM_ORIGIN.y)
      .setVisible(false)
      .setDepth(UI_DEPTH - 31);
    this.createHud();
    this.createPanel();
    this.banner = this.add
      .text(GRID.x + (GRID.cols * GRID.cell) / 2, GRID.y + 36, '', {
        fontFamily: FONT,
        fontStyle: 'bold',
        fontSize: '24px',
        color: '#ffd27a',
        stroke: '#5a2e08',
        strokeThickness: 6,
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(UI_DEPTH)
      .setAlpha(0);
    this.createGameOver();
    this.refresh();
  }

  update(time: number) {
    // Game time from the frame's own timestamp rather than Phaser's smoothed delta.
    const dt = this.lastFrame === null ? 0 : Phaser.Math.Clamp(time - this.lastFrame, 0, MAX_STEP_MS);
    this.lastFrame = time;
    const s = this.state;
    const { wave, heart, phase, best, bloom } = s;
    tick(s, dt);
    if (s.heart < heart) this.heartHit();
    if (s.wave > wave) this.waveDone(wave, bloom, false);
    if (s.best > best) saveBest(s.best);
    if (s.phase === 'over' && phase !== 'over') this.gameOver.setVisible(true);
    for (const pop of s.pops) this.sapPop(pop);
    s.pops = [];
    this.bars.clear();
    this.drawGolems();
    this.drawPests();
    this.drawShots();
    this.drawHover();
    this.refresh();
  }

  /** A pressed clay label: bold text with a light lower edge, as if stamped into the clay. */
  private press(x: number, y: number, text: string, size: number, color: string, origin: [number, number] = [0, 0.5]) {
    return this.add
      .text(x, y, text, { fontFamily: FONT, fontStyle: 'bold', fontSize: `${size}px`, color })
      .setOrigin(...origin)
      .setShadow(1, 1, 'rgba(255,240,210,0.35)', 0);
  }

  private createBoard() {
    const [hc, hr] = PATH_CORNERS[PATH_CORNERS.length - 1];
    const heart = cellCentre(hc, hr);
    this.tree = this.add.image(heart.x, heart.y, 'tree').setOrigin(65 / 130, 70 / 120).setDepth(heart.y + 32);
    this.treeFlowers = TREE_FLOWERS.map(([dx, dy]) => this.add.image(heart.x + dx, heart.y + dy, 'bud').setDepth(heart.y + 33));
    // The table strip left of the board hides pests until they step onto the garden.
    this.add.image(0, 0, 'edge').setOrigin(0).setDepth(UI_DEPTH - 40);

    const zone = this.add.zone(GRID.x, GRID.y, GRID.cols * GRID.cell, GRID.rows * GRID.cell).setOrigin(0).setInteractive();
    zone.on('pointermove', (p: Phaser.Input.Pointer) => (this.hover = cellAt(p.x, p.y)));
    zone.on('pointerout', () => (this.hover = null));
    zone.on('pointerdown', (p: Phaser.Input.Pointer) => {
      this.hover = cellAt(p.x, p.y);
      if (this.hover) this.tapCell(this.hover.col, this.hover.row);
    });
  }

  private tapCell(col: number, row: number) {
    const s = this.state;
    const golem = golemAt(s, col, row);
    if (golem) upgrade(s, golem);
    else plant(s, col, row);
    this.refresh();
  }

  private createHud() {
    const ink = '#4a2e18';
    this.press(GRID.x, HUD.y, 'Golem Garden', 23, '#f2c44a');
    const flowers = Array.from({ length: BLOOM_GOAL }, (_, i) => this.add.image(HUD.bloom.flowers + i * HUD.bloom.gap, HUD.y, 'bud'));
    const glow = this.add.image(HUD.sap.icon, HUD.y, 'glow').setAlpha(0).setDepth(UI_DEPTH - 2);
    this.add.image(HUD.leaf.icon, HUD.y, 'leaf');
    this.add.image(HUD.sap.icon, HUD.y - 1, 'sap').setDepth(UI_DEPTH - 1);
    this.hud = {
      wave: this.press(HUD.wave.x + HUD.wave.w / 2, HUD.y, '', 20, ink, [0.5, 0.5]),
      heart: this.press(HUD.leaf.text, HUD.y, '', 20, ink),
      sap: this.press(HUD.sap.text, HUD.y, '', 20, ink).setDepth(UI_DEPTH - 1),
      bloom: this.press(HUD.bloom.text, HUD.y - 7, '', 10.5, '#3a3014'),
      bloomSub: this.press(HUD.bloom.text, HUD.y + 7, '', 9, '#4a6a24'),
      best: this.press(VIEW.w - 16, HUD.y, '', 13, '#e8d6a8', [1, 0.5]),
      flowers,
      glow,
    };
  }

  private createPanel() {
    this.press(PANEL.x + PANEL.w / 2, PANEL.y + 12, 'Seeds', 15, '#f2c44a', [0.5, 0.5]);
    const ink = '#3a2a18';
    this.seedButtons = GOLEMS.map((kind, i) => {
      const x = SEED_BUTTONS.x;
      const y = SEED_BUTTONS.ys[i];
      const h = SEED_BUTTONS.hs[i];
      const info = GOLEM_INFO[kind];
      const rim = this.add.image(x, y, `rim-${h}`).setVisible(false);
      const card = this.add.image(x, y, `card-${h}`);
      card.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
        select(this.state, kind);
        this.refresh();
      });
      const left = x - SEED_BUTTONS.w / 2;
      const tall = h > 70;
      // The card's face: the golem, its name, its cost in sap and what it does.
      const icon = this.add
        .image(left + (tall ? 31 : 27), y + (tall ? 30 : 26), `golem-${kind}`)
        .setOrigin(GOLEM_ORIGIN.x, GOLEM_ORIGIN.y)
        .setScale(tall ? 0.62 : 0.5);
      const [first, second] = info.name.split(' ');
      const face = tall
        ? [
            this.press(left + 61, y - 23, first, 14, ink),
            this.press(left + 61, y - 7, second, 14, ink),
            this.add.image(left + 68, y + 12, 'sap').setScale(0.62),
            this.press(left + 78, y + 13, String(info.cost), 14, ink),
            this.press(left + 61, y + 30, info.blurb, 9, '#7a5a34'),
          ]
        : [
            this.press(left + 55, y - 19, info.name, 10.5, ink),
            this.add.image(left + 62, y - 2, 'sap').setScale(0.5),
            this.press(left + 70, y - 1, String(info.cost), 12, ink),
            this.press(left + 55, y + 16, info.blurb, 9, '#7a5a34'),
          ];
      const open = this.add.container(0, 0, [icon, ...face]);
      let locked: Phaser.GameObjects.Container | undefined;
      if (info.locked) {
        locked = this.add.container(0, 0, [
          this.add.image(x, y, 'card-locked'),
          this.press(left + 55, y - 18, info.name, 10.5, ink),
          this.press(left + 56, y - 3, 'Blooms after', 9, '#4a6a24'),
          this.press(left + 56, y + 9, `${BLOOM_GOAL} waves`, 9, '#4a6a24'),
        ]);
        this.lockPips = this.add.graphics();
        locked.add(this.lockPips);
      }
      this.cards.push({ kind, rim, card, open, locked });
      return { kind, x, y, w: SEED_BUTTONS.w, h };
    });

    this.preview = {
      title: this.press(PREVIEW.x + 8, PREVIEW.y + 14, '', 11, '#fbefd6'),
      icons: {} as Record<PestKind, Image>,
      counts: {} as Record<PestKind, Text>,
    };
    PESTS.forEach((kind, i) => {
      const x = PREVIEW.x + 16 + i * 44;
      const y = PREVIEW.y + 42;
      this.preview.icons[kind] = this.add.image(x, y + (kind === 'crow' ? 3 : 0), `pest-${kind}`).setScale(0.5);
      this.preview.counts[kind] = this.press(x + (kind === 'slug' ? 13 : 10), y, '', 11, '#f0e2bc');
    });

    this.hint = this.press(PANEL.x + PANEL.w / 2, HINT.y, '', 8.5, '#d8c79e', [0.5, 0.5]).setAlign('center').setWordWrapWidth(PANEL.w - 8);

    this.waveBg = this.add.image(WAVE_BUTTON.x, WAVE_BUTTON.y, 'btn-wave');
    this.waveBg.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
      const s = this.state;
      const { wave, bloom } = s;
      if (startWave(s) === 'early') this.waveDone(wave, bloom, true);
      this.refresh();
    });
    this.waveText = this.press(WAVE_BUTTON.x, WAVE_BUTTON.y - 8, '', 13, '#4a2a08', [0.5, 0.5]);
    this.waveSub = this.press(WAVE_BUTTON.x + 4, WAVE_BUTTON.y + 11, '', 11, '#5a3410', [0.5, 0.5]);
    this.waveDrop = this.add.image(WAVE_BUTTON.x - 23, WAVE_BUTTON.y + 10, 'sap').setScale(0.55);
  }

  private createGameOver() {
    const dim = this.add.rectangle(0, 0, VIEW.w, VIEW.h, 0x1a0e06, 0.72).setOrigin(0).setInteractive();
    const title = this.add
      .text(VIEW.w / 2, 200, 'The Heartwood has fallen', {
        fontFamily: FONT,
        fontStyle: 'bold',
        fontSize: '32px',
        color: '#f2c44a',
        stroke: '#3a2008',
        strokeThickness: 6,
      })
      .setOrigin(0.5);
    this.gameOverText = this.add
      .text(VIEW.w / 2, 262, '', { fontFamily: FONT, fontStyle: 'bold', fontSize: '17px', color: '#fbefd6', align: 'center' })
      .setOrigin(0.5)
      .setLineSpacing(6);
    const again = makeButton(this, VIEW.w / 2, 344, 'Replant', () => this.scene.restart());
    this.gameOver = this.add.container(0, 0, [dim, title, this.gameOverText, again]).setDepth(UI_DEPTH + 10).setVisible(false);
  }

  /** Rewrites the HUD and panel from the state. */
  private refresh() {
    const s = this.state;
    this.hud.wave.setText(`Wave ${s.wave}`);
    this.hud.heart.setText(String(s.heart));
    this.hud.sap.setText(String(s.sap));
    this.hud.best.setText(`Best: ${s.best} waves`);
    const full = s.bloom >= BLOOM_GOAL;
    this.hud.bloom.setText(full ? 'Heartwood in bloom' : `Heartwood bloom ${s.bloom}/${BLOOM_GOAL}`);
    this.hud.bloomSub.setText(full ? 'Thorn golem unlocked' : 'unlocks Thorn golem');
    this.hud.flowers.forEach((f, i) => f.setTexture(i < s.bloom ? 'bloom' : 'bud'));
    this.treeFlowers.forEach((f, i) => f.setTexture(i < s.bloom ? 'bloom' : 'bud'));

    for (const { kind, rim, card, open, locked } of this.cards) {
      const h = SEED_BUTTONS.hs[GOLEMS.indexOf(kind)];
      const isOpen = unlocked(s, kind);
      rim.setVisible(isOpen && s.selected === kind);
      card.setVisible(isOpen).setTexture(s.sap >= GOLEM_INFO[kind].cost ? `card-${h}` : `card-${h}-dim`);
      open.setVisible(isOpen);
      locked?.setVisible(!isOpen);
    }
    if (this.lockPips) {
      const left = SEED_BUTTONS.x - SEED_BUTTONS.w / 2;
      const y = SEED_BUTTONS.ys[2] + 22;
      this.lockPips.clear();
      for (let i = 0; i < BLOOM_GOAL; i++) this.bead(this.lockPips, left + 61 + i * 13, y, 4, i < s.bloom ? 0xf2c44a : 0x8a8070);
    }

    const n = nextWave(s);
    const counts = waveCounts(n);
    this.preview.title.setText(`Next: wave ${n}`);
    for (const kind of PESTS) {
      this.preview.counts[kind].setText(`x${counts[kind]}`).setAlpha(counts[kind] ? 1 : 0.4);
      this.preview.icons[kind].setAlpha(counts[kind] ? 1 : 0.35);
    }

    const early = canCallEarly(s);
    const lit = s.phase === 'build' || early;
    this.waveBg.setTexture(lit ? 'btn-wave' : 'btn-wave-off');
    const [line1, line2] =
      s.phase === 'build'
        ? [`Start wave ${n}`, '']
        : early
          ? [`Call wave ${n} now`, `+${EARLY_BONUS} early`]
          : s.phase === 'wave'
            ? [`Wave ${s.wave}...`, 'still coming in']
            : ['Garden lost', ''];
    this.waveLabel = line2 ? `${line1}, ${line2}` : line1;
    this.waveText.setText(line1).setY(WAVE_BUTTON.y + (line2 ? -9 : 0)).setFontSize(line2 ? 13 : 15);
    this.waveSub.setText(line2).setX(WAVE_BUTTON.x + (early ? 6 : 0));
    this.waveDrop.setVisible(early);

    const hovered = this.hover && golemAt(s, this.hover.col, this.hover.row);
    if (hovered) {
      const cost = upgradeCost(hovered);
      const name = GOLEM_INFO[hovered.kind].name;
      this.hint.setText(
        hovered.growMs > 0
          ? `${name}, still growing`
          : cost === null
            ? `${name}, level ${hovered.level}: at its strongest`
            : `${name}, level ${hovered.level}: tap to raise it for ${cost} sap`,
      );
    } else {
      this.hint.setText(s.golems.length ? 'Tap a golem to level it up' : 'Tap soil to plant the picked seed');
    }
    if (s.phase === 'over') {
      this.gameOverText.setText(`Pests ate the Heartwood on wave ${s.wave}.\n${s.kills} pests squashed. Best: ${s.best} waves cleared.`);
    }
  }

  /** A little clay bead: a soft shadow, the colour and a glint. */
  private bead(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number, color: number) {
    g.fillStyle(0x1a0e06, 0.35).fillCircle(x + 1, y + 1.5, r);
    g.fillStyle(color).fillCircle(x, y, r);
    g.fillStyle(0xffffff, 0.45).fillCircle(x - r * 0.35, y - r * 0.35, r * 0.35);
  }

  /** A rounded clay bar, `done` of it filled. */
  private bar(x: number, y: number, w: number, done: number, color: number) {
    this.bars.fillStyle(0x2a1a10).fillRoundedRect(x - w / 2, y, w, 7, 3.5);
    if (done > 0) this.bars.fillStyle(color).fillRoundedRect(x - w / 2 + 1.5, y + 1.5, Math.max(4, (w - 3) * done), 4, 2);
  }

  private drawGolems() {
    const s = this.state;
    const seen = new Set<number>();
    for (const g of s.golems) {
      seen.add(g.id);
      const { x, y } = cellCentre(g.col, g.row);
      let image = this.golems.get(g.id);
      if (!image) {
        image = this.add.image(x, y + FEET, 'sprout').setDepth(y + FEET);
        this.golems.set(g.id, image);
      }
      if (g.growMs > 0) {
        image.setTexture('sprout').setOrigin(0.5, 40 / 50).setY(y + 21);
        this.bar(x, y + 28, 40, 1 - g.growMs / GOLEM_INFO[g.kind].growMs, 0x8cd05a);
      } else {
        image.setTexture(`golem-${g.kind}`).setOrigin(GOLEM_ORIGIN.x, GOLEM_ORIGIN.y).setY(y + FEET);
        for (let i = 0; i < MAX_LEVEL; i++) this.bead(this.bars, x - 11 + i * 11, y + 31, 3.6, i < g.level ? 0xf2c44a : 0x4a5a3a);
      }
    }
    for (const [id, image] of this.golems) if (!seen.has(id)) (image.destroy(), this.golems.delete(id));
  }

  private drawPests() {
    const seen = new Set<number>();
    for (const p of this.state.pests) {
      seen.add(p.id);
      const pos = pathPoint(p.dist);
      let art = this.pests.get(p.id);
      if (!art) {
        art = {
          body: this.add.image(pos.x, pos.y, `pest-${p.kind}`).setOrigin(PEST_ORIGIN.x, PEST_ORIGIN.y),
          slow: this.add.image(pos.x, pos.y, 'slow').setVisible(false),
        };
        this.pests.set(p.id, art);
      }
      // Crows hop up and down as they fly; held still with reduced motion.
      const bob = p.kind === 'crow' && !settings.reduceMotion ? Math.sin(p.dist / 8) * 3 : 0;
      const top = pos.y + bob - (p.kind === 'crow' ? 37 : 28);
      art.body.setPosition(pos.x, pos.y + bob).setDepth(pos.y).setFlipX(pos.facing < 0);
      art.slow.setVisible(p.slowMs > 0).setPosition(pos.x, top + 13).setDepth(pos.y + 1);
      if (p.hitMs > 0 && !settings.reduceMotion) art.body.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
      else if (p.slowMs > 0) art.body.setTint(0x9ae07a).setTintMode(Phaser.TintModes.MULTIPLY);
      else art.body.clearTint();
      if (p.hp < p.maxHp) this.bar(pos.x, top, 30, Math.max(0, p.hp / p.maxHp), 0xf2c44a);
    }
    for (const [id, art] of this.pests) {
      if (seen.has(id)) continue;
      art.body.destroy();
      art.slow.destroy();
      this.pests.delete(id);
    }
  }

  private drawShots() {
    const seen = new Set<number>();
    for (const shot of this.state.shots) {
      seen.add(shot.id);
      let image = this.shots.get(shot.id);
      if (!image) {
        image = this.add.image(shot.from.x, shot.from.y, `shot-${shot.kind}`).setDepth(UI_DEPTH - 25);
        if (shot.kind === 'thorn') image.setRotation(Math.atan2(shot.to.y - shot.from.y, shot.to.x - shot.from.x));
        this.shots.set(shot.id, image);
      }
      const t = 1 - shot.ms / SHOT_MS;
      const arc = shot.kind === 'thorn' ? 0 : Math.sin(t * Math.PI) * 20;
      image.setPosition(shot.from.x + (shot.to.x - shot.from.x) * t, shot.from.y + (shot.to.y - shot.from.y) * t - 6 - arc);
    }
    for (const [id, image] of this.shots) if (!seen.has(id)) (image.destroy(), this.shots.delete(id));
  }

  /** Outlines the hovered cell and rings the reach of the seed it would plant or the golem on it. */
  private drawHover() {
    const g = this.hoverGfx.clear();
    this.ghost.setVisible(false);
    const s = this.state;
    if (!this.hover || s.phase === 'over') return;
    const { col, row } = this.hover;
    const { x, y } = cellCentre(col, row);
    const golem = golemAt(s, col, row);
    const outline = (color: number) => {
      g.lineStyle(3.5, 0x1e0e04, 0.25).strokeRoundedRect(x - 30, y - 28, 62, 62, 9);
      g.lineStyle(3, color).strokeRoundedRect(x - 31, y - 31, 62, 62, 9);
    };
    const reach = (range: number) => {
      g.fillStyle(0xfff8dc, 0.16).fillCircle(x, y, range);
      const beads = Math.round(range / 3.4);
      for (let k = 0; k < beads; k++) {
        const a = (k / beads) * Math.PI * 2;
        this.bead(g, x + Math.cos(a) * range, y + Math.sin(a) * range, 2.5, 0xfbefd6);
      }
    };
    if (golem) {
      reach(golemStats(golem.kind, golem.level).range);
      outline(0xf2c44a);
      return;
    }
    if (MAP[row][col] !== 'soil') return;
    const ok = canPlant(s, col, row);
    if (ok) {
      reach(golemStats(s.selected, 1).range);
      this.ghost.setTexture(`golem-${s.selected}`).setPosition(x, y + FEET).setVisible(true);
    }
    outline(ok ? 0xfbefd6 : 0x8a7a6a);
  }

  /** A squashed pest: a splat on the path, a "+N" pop and sap droplets arcing to the sap counter. */
  private sapPop(pop: Pop) {
    const still = settings.reduceMotion;
    const splat = this.add.image(pop.x, pop.y + 5, 'splat').setDepth(2);
    this.tweens.add({ targets: splat, alpha: 0, delay: 700, duration: 700, onComplete: () => splat.destroy() });
    const label = this.add
      .text(pop.x + 12, pop.y - 21, `+${pop.sap}`, { fontFamily: FONT, fontStyle: 'bold', fontSize: '20px', color: '#ffd27a', stroke: '#5a2e08', strokeThickness: 5 })
      .setOrigin(0.5)
      .setDepth(UI_DEPTH - 5);
    this.tweens.add({ targets: label, alpha: 0, y: still ? label.y : label.y - 18, delay: 350, duration: 650, onComplete: () => label.destroy() });
    if (still) return;
    const from = { x: pop.x, y: pop.y - 5 };
    const to = { x: HUD.sap.icon, y: HUD.y };
    for (let k = 0; k < 3; k++) {
      const drop = this.add.image(from.x, from.y, 'sap').setScale(0.95 - k * 0.15).setDepth(UI_DEPTH - 4);
      this.tweens.addCounter({
        from: 0,
        to: 1,
        delay: k * 80,
        duration: DROP_MS,
        ease: 'Sine.easeIn',
        onUpdate: (tween) => {
          const t = tween.getValue() ?? 0;
          drop.setPosition(from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t - Math.sin(t * Math.PI) * 80);
        },
        onComplete: () => {
          drop.destroy();
          this.tweens.killTweensOf(this.hud.glow);
          this.hud.glow.setAlpha(1);
          this.tweens.add({ targets: this.hud.glow, alpha: 0, duration: 400 });
        },
      });
    }
  }

  /** Wave `n` is done (cleared, or called early): the banner, and the Heartwood's bloom if it just filled. */
  private waveDone(n: number, bloomBefore: number, early: boolean) {
    const s = this.state;
    const sap = waveBonus(n) + (early ? EARLY_BONUS : 0);
    const lines = [early ? `Wave ${n + 1} called early!  +${sap} sap` : `Wave ${n} cleared!  +${sap} sap`];
    if (s.bloom > bloomBefore) lines.push(s.bloom >= BLOOM_GOAL ? 'The Heartwood is in bloom: Thorn golem unlocked!' : `A bud opens on the Heartwood (${s.bloom}/${BLOOM_GOAL})`);
    this.banner.setText(lines.join('\n')).setFontSize(lines.length > 1 ? 22 : 24).setAlpha(1);
    this.tweens.killTweensOf(this.banner);
    this.tweens.add({ targets: this.banner, alpha: 0, delay: BANNER_MS * 0.6, duration: BANNER_MS * 0.4 });
  }

  private heartHit() {
    this.cameras.main.shake(160, 0.006);
    if (settings.reduceMotion) return;
    this.tree.setTint(0xffb08a);
    this.time.delayedCall(160, () => this.tree.clearTint());
  }
}
