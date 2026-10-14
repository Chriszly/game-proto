import { settings } from '../../../../shared/settings';
import Phaser from 'phaser';
import { foeTexture } from '../art/characters';
import { BLUE, GOLD, INK, RED, STONE } from '../art/palette';
import { ENEMIES } from '../game/enemies';
import { ENTRANCE, reachable } from '../game/map';
import { canPlay, canRemove, endTurn, intentOf, newRun, playCard, removeCard, rest, restHeal, takeReward, tick, walkTo } from '../game/sim';
import { POP_MS, WALK_MS, type Enemy, type GameState } from '../game/state';
import type { CardId } from '../game/cards';
import { makeButton } from '../ui/Button';
import { makeCard } from '../ui/CardView';
import {
  BUTTON,
  END_TURN,
  ENERGY_ORB,
  FOE_FEET_Y,
  FOE_XS,
  FONT,
  HAND,
  HERO_FEET,
  HP_BAR,
  HUD_HEIGHT,
  PANEL_BUTTON,
  PILES_Y,
  REMOVE,
  REST_BUTTONS,
  REWARD,
  ROOM_RADIUS,
  SKIP,
  UI_DEPTH,
  VIEW,
} from './layout';

/** Longest simulated step, so a backgrounded tab doesn't jump the game forward. */
const MAX_STEP_MS = 250;

/** Where a card is on screen; read by the playthrough test to tap it. */
export interface CardSpot {
  id: CardId;
  x: number;
  y: number;
  w: number;
  h: number;
}

const textStyle = (size: number, color = '#f3e9d2') => ({
  fontFamily: FONT,
  fontSize: `${size}px`,
  color,
  stroke: '#141018',
  strokeThickness: 4,
});

/** What is drawn for one foe. */
interface Foe {
  sprite: Phaser.GameObjects.Image;
  intent: Phaser.GameObjects.Image;
  intentText: Phaser.GameObjects.Text;
  hp: Phaser.GameObjects.Text;
  x: number;
}

const POP_COLORS = { damage: '#f4a08a', block: '#8ab8e8', heal: '#8cd060' };

export class GameScene extends Phaser.Scene {
  /** The run being played; read by the playthrough test. */
  state!: GameState;
  /** The cards in hand, in order; read by the playthrough test. */
  hand: CardSpot[] = [];
  /** The reward cards on offer; read by the playthrough test. */
  rewards: CardSpot[] = [];

  private mapLayer!: Phaser.GameObjects.Container;
  private paths!: Phaser.GameObjects.Graphics;
  private roomRings!: Phaser.GameObjects.Graphics;
  private token!: Phaser.GameObjects.Image;
  private mapHint!: Phaser.GameObjects.Text;

  private fightLayer!: Phaser.GameObjects.Container;
  private hero!: Phaser.GameObjects.Image;
  private foes = new Map<number, Foe>();
  private heroHp!: Phaser.GameObjects.Text;
  private bars!: Phaser.GameObjects.Graphics;
  private handLayer!: Phaser.GameObjects.Container;
  private handKey = '';
  private energyText!: Phaser.GameObjects.Text;
  private drawText!: Phaser.GameObjects.Text;
  private discardText!: Phaser.GameObjects.Text;
  private endTurnButton!: Phaser.GameObjects.Container;
  private turnBanner!: Phaser.GameObjects.Text;

  private rewardLayer!: Phaser.GameObjects.Container;
  private rewardTitle!: Phaser.GameObjects.Text;
  private rewardKey = '';
  private panel!: Phaser.GameObjects.Container;
  private panelTitle!: Phaser.GameObjects.Text;
  private panelText!: Phaser.GameObjects.Text;
  private panelButton!: Phaser.GameObjects.Container;
  private panelAction: () => void = () => {};
  /** The campfire's second choice, next to Rest. */
  private removeButton!: Phaser.GameObjects.Container;
  /** The deck laid out to pick a card to take out, at the campfire. */
  private removeLayer!: Phaser.GameObjects.Container;
  private removing = false;
  private removeKey = '';

  private hud!: Phaser.GameObjects.Graphics;
  private hpText!: Phaser.GameObjects.Text;
  private deckText!: Phaser.GameObjects.Text;
  private roomText!: Phaser.GameObjects.Text;
  private pops = new Map<number, Phaser.GameObjects.Text>();
  private lastFrame: number | null = null;
  private clock = 0;

  constructor() {
    super('Game');
  }

  create() {
    this.state = newRun();
    this.foes.clear();
    this.pops.clear();
    this.handKey = '';
    this.rewardKey = '';
    this.removing = false;
    this.removeKey = '';
    this.createMap();
    this.createFight();
    this.createReward();
    this.createPanel();
    this.createRemove();
    this.createHud();
  }

  update(time: number) {
    // Game time from the frame's own timestamp rather than Phaser's smoothed delta.
    const dt = this.lastFrame === null ? 0 : Phaser.Math.Clamp(time - this.lastFrame, 0, MAX_STEP_MS);
    this.lastFrame = time;
    this.clock += dt;
    tick(this.state, dt);

    const s = this.state;
    const onMap = s.phase === 'map' || s.phase === 'walk' || s.phase === 'rest' || (s.phase === 'reward' && !s.fight && s.rooms[s.at!]?.kind === 'treasure');
    this.mapLayer.setVisible(onMap);
    this.fightLayer.setVisible(!onMap);
    // Pops first, so a killing blow's number still finds its foe before drawFight drops it.
    this.drawPops();
    if (onMap) this.drawMap();
    else this.drawFight();
    this.drawReward();
    this.drawPanel();
    this.drawHud();
  }

  // The map

  private createMap() {
    const bg = this.add.image(0, 0, 'map-bg').setOrigin(0);
    this.paths = this.add.graphics();
    this.roomRings = this.add.graphics();
    const icons = this.state.rooms.map((room, i) => {
      const icon = this.add.image(room.x, room.y, `room-${room.kind}`);
      // Taps land anywhere in the room's circle.
      const hit = this.add.circle(room.x, room.y, ROOM_RADIUS, 0xffffff, 0.001).setInteractive({ useHandCursor: true });
      hit.on('pointerdown', () => walkTo(this.state, i));
      return [icon, hit];
    });
    this.token = this.add.image(ENTRANCE.x, ENTRANCE.y, 'hero-token').setOrigin(0.5, 1);
    this.mapHint = this.add.text(VIEW.w / 2, VIEW.h - 34, '', textStyle(18, '#e6c766')).setOrigin(0.5);
    this.mapLayer = this.add.container(0, 0, [bg, this.paths, this.roomRings, ...icons.flat(), this.token, this.mapHint]);
  }

  private drawMap() {
    const s = this.state;
    const rooms = s.rooms;
    const next = s.phase === 'map' ? reachable(rooms, s.at) : [];
    const g = this.paths.clear();
    // Dotted paths between rooms; the ones walked are lit.
    const walked = new Set(s.cleared.map((r, i) => `${i === 0 ? -1 : s.cleared[i - 1]}>${r}`));
    const dots = (ax: number, ay: number, bx: number, by: number, lit: boolean) => {
      const n = Math.floor(Math.hypot(bx - ax, by - ay) / 12);
      for (let i = 1; i < n; i++) {
        const t = i / n;
        g.fillStyle(lit ? GOLD.light : STONE.shine, lit ? 1 : 0.6).fillRect(ax + (bx - ax) * t - 2, ay + (by - ay) * t - 2, 4, 4);
      }
    };
    for (const i of reachable(rooms, null)) dots(ENTRANCE.x, ENTRANCE.y, rooms[i].x, rooms[i].y, walked.has(`-1>${i}`));
    rooms.forEach((room, i) => room.next.forEach((j) => dots(room.x, room.y, rooms[j].x, rooms[j].y, walked.has(`${i}>${j}`))));

    // Each room in a ring: gold and pulsing when it can be entered (held still when motion is
    // reduced), dim once passed by.
    const r = this.roomRings.clear();
    const pulse = settings.reduceMotion ? 1 : 0.5 + 0.5 * Math.sin(this.clock / 200);
    rooms.forEach((room, i) => {
      const done = s.cleared.includes(i);
      const open = next.includes(i);
      r.fillStyle(INK, 0.85).fillCircle(room.x, room.y, ROOM_RADIUS);
      r.lineStyle(4, open ? GOLD.light : done ? GOLD.dark : STONE.light, open ? 0.6 + 0.4 * pulse : 1).strokeCircle(room.x, room.y, ROOM_RADIUS);
      if (open) r.lineStyle(2, GOLD.light, 0.4 * (1 - pulse)).strokeCircle(room.x, room.y, ROOM_RADIUS + 6 + 4 * pulse);
    });

    // The hero stands beside their room, or walks along the path to the next one.
    const spot = (at: number | null) => (at === null ? ENTRANCE : { x: rooms[at].x, y: rooms[at].y });
    let pos = spot(s.at);
    if (s.walk) {
      const a = spot(s.walk.from);
      const b = spot(s.walk.to);
      const t = Math.min(1, s.walk.ms / WALK_MS);
      pos = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t - Math.abs(Math.sin(t * Math.PI * 4)) * 4 };
    }
    this.token.setPosition(pos.x, pos.y - (s.walk ? 0 : ROOM_RADIUS - 6));
    this.mapHint.setText(s.phase === 'map' ? (s.at === null ? 'Tap a room to enter the dungeon' : 'Tap a lit room to go on') : '');
  }

  // The fight

  private createFight() {
    const bg = this.add.image(0, 0, 'room-bg').setOrigin(0);
    this.hero = this.add.image(HERO_FEET.x, HERO_FEET.y, 'hero').setOrigin(0.5, 1);
    this.bars = this.add.graphics();
    this.heroHp = this.add.text(HERO_FEET.x, FOE_FEET_Y + HP_BAR.dy + HP_BAR.h / 2, '', textStyle(13)).setOrigin(0.5);
    this.handLayer = this.add.container(0, 0);
    const orb = this.add.graphics();
    orb.fillStyle(INK).fillCircle(ENERGY_ORB.x, ENERGY_ORB.y, ENERGY_ORB.r + 4);
    orb.fillStyle(GOLD.dark).fillCircle(ENERGY_ORB.x, ENERGY_ORB.y, ENERGY_ORB.r);
    orb.fillStyle(GOLD.mid).fillCircle(ENERGY_ORB.x - 3, ENERGY_ORB.y - 3, ENERGY_ORB.r - 6);
    orb.fillStyle(0xffffff, 0.35).fillCircle(ENERGY_ORB.x - 12, ENERGY_ORB.y - 14, 7);
    this.energyText = this.add.text(ENERGY_ORB.x, ENERGY_ORB.y, '', textStyle(24)).setOrigin(0.5);
    this.drawText = this.add.text(ENERGY_ORB.x, PILES_Y, '', textStyle(14, '#d8c7a6')).setOrigin(0.5);
    this.discardText = this.add.text(END_TURN.x, PILES_Y, '', textStyle(14, '#d8c7a6')).setOrigin(0.5);
    this.endTurnButton = makeButton(this, END_TURN.x, END_TURN.y, 'End turn', () => endTurn(this.state), END_TURN.w);
    this.turnBanner = this.add.text(VIEW.w / 2, 150, '', textStyle(30, '#e6c766')).setOrigin(0.5);
    this.fightLayer = this.add.container(0, 0, [bg, this.hero, this.bars, this.heroHp, orb, this.energyText, this.endTurnButton, this.handLayer, this.drawText, this.discardText, this.turnBanner]);
  }

  private drawFight() {
    const s = this.state;
    const f = s.fight;
    const enemies = f?.enemies ?? [];
    const xs = FOE_XS[Math.max(1, enemies.length)] ?? FOE_XS[3];

    // The hero shakes and flashes red when hit, unless motion is reduced.
    const shake = s.heroHitMs > 0 && !settings.reduceMotion ? Math.sin(this.clock / 20) * 4 : 0;
    this.hero.setPosition(HERO_FEET.x + shake, HERO_FEET.y);
    if (s.heroHitMs > 0 && !settings.reduceMotion) this.hero.setTint(0xff8080);
    else this.hero.clearTint();

    this.bars.clear();
    this.drawHpBar(HERO_FEET.x, s.hp, s.maxHp, f?.block ?? 0, this.heroHp);

    // Foes, each with its intent over its head; one that falls fades away.
    const seen = new Set<number>();
    enemies.forEach((e, i) => {
      seen.add(e.id);
      let foe = this.foes.get(e.id);
      if (!foe) {
        const sprite = this.add.image(xs[i], FOE_FEET_Y, foeTexture(e.kind)).setOrigin(0.5, 1);
        const intent = this.add.image(0, 0, 'intent-attack');
        const intentText = this.add.text(0, 0, '', textStyle(18)).setOrigin(0, 0.5);
        const hp = this.add.text(0, FOE_FEET_Y + HP_BAR.dy + HP_BAR.h / 2, '', textStyle(13)).setOrigin(0.5);
        this.fightLayer.addAt(sprite, 2);
        this.fightLayer.addAt([intent, intentText, hp], this.fightLayer.getIndex(this.bars) + 1);
        foe = { sprite, intent, intentText, hp, x: xs[i] };
        this.foes.set(e.id, foe);
      }
      // Slide into place when the one in front falls.
      foe.x += (xs[i] - foe.x) * 0.2;
      const lunge = e.actMs > 0 ? -Math.sin((e.actMs / 300) * Math.PI) * 30 : 0;
      const bob = settings.reduceMotion ? 0 : Math.sin(this.clock / 400 + e.id) * 2;
      foe.sprite.setPosition(foe.x + lunge, FOE_FEET_Y + bob);
      if (e.hitMs > 0 && !settings.reduceMotion) foe.sprite.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
      else foe.sprite.clearTint();
      this.drawHpBar(foe.x, e.hp, e.maxHp, e.block, foe.hp);
      this.drawIntent(e, foe, foe.x, FOE_FEET_Y - foe.sprite.height - 22);
    });
    for (const [id, foe] of this.foes) {
      if (seen.has(id)) continue;
      this.foes.delete(id);
      foe.intent.destroy();
      foe.intentText.destroy();
      foe.hp.destroy();
      this.tweens.add({ targets: foe.sprite, alpha: 0, y: foe.sprite.y + 10, duration: 400, onComplete: () => foe.sprite.destroy() });
    }

    // Hand, energy and piles.
    this.drawHand();
    this.energyText.setText(f ? `${f.energy}/3` : '');
    this.drawText.setText(f ? `Draw pile ${f.draw.length}` : '');
    this.discardText.setText(f ? `Discard pile ${f.discard.length}` : '');
    this.endTurnButton.setVisible(s.phase === 'player').setAlpha(s.phase === 'player' ? 1 : 0.4);
    const banner = s.phase === 'enemy' ? 'Foes’ turn' : s.phase === 'cleared' ? 'Victory!' : f && f.turn === 1 && s.phase === 'player' && f.energy === 3 && f.hand.length === 5 ? 'Your turn' : '';
    this.turnBanner.setText(banner);
  }

  /** A health bar under the feet, blue while there is block, with the numbers under it. */
  private drawHpBar(x: number, hp: number, max: number, block: number, text: Phaser.GameObjects.Text) {
    const g = this.bars;
    const left = Math.round(x - HP_BAR.w / 2);
    const y = FOE_FEET_Y + HP_BAR.dy;
    g.fillStyle(INK).fillRect(left, y, HP_BAR.w, HP_BAR.h);
    g.fillStyle(0x3a2818).fillRect(left + 2, y + 2, HP_BAR.w - 4, HP_BAR.h - 4);
    g.fillStyle(block > 0 ? BLUE.mid : RED.mid).fillRect(left + 2, y + 2, Math.round((HP_BAR.w - 4) * Phaser.Math.Clamp(hp / max, 0, 1)), HP_BAR.h - 4);
    text.setX(x).setText(block > 0 ? `${hp}/${max}  +${block}` : `${hp}/${max}`);
  }

  private drawIntent(e: Enemy, foe: Foe, x: number, y: number) {
    const intent = intentOf(e);
    foe.intent.setTexture(`intent-${intent.kind}`).setPosition(x - 12, y);
    const text =
      intent.kind === 'attack'
        ? `${intent.damage + e.strength}${intent.hits ? `x${intent.hits}` : ''}`
        : intent.kind === 'block'
          ? `${intent.block}`
          : `+${intent.strength}`;
    foe.intentText.setText(text).setPosition(x + 2, y).setColor(intent.kind === 'attack' ? '#f4a08a' : intent.kind === 'block' ? '#8ab8e8' : '#e6c766');
    const show = this.state.phase === 'player';
    foe.intent.setVisible(show);
    foe.intentText.setVisible(show);
  }

  /** Lays out the hand along the bottom; rebuilt only when the hand or the energy changes. */
  private drawHand() {
    const s = this.state;
    const f = s.fight;
    const hand = s.phase === 'player' && f ? f.hand : [];
    const key = `${hand.join()}|${f?.energy}`;
    if (key === this.handKey) return;
    this.handKey = key;
    this.handLayer.removeAll(true);
    const gap = hand.length > 1 ? Math.min(HAND.gap, HAND.span / (hand.length - 1)) : 0;
    this.hand = hand.map((id, i) => {
      const x = HAND.x + (i - (hand.length - 1) / 2) * gap;
      const { view, bg } = makeCard(this, id, x, HAND.y);
      const playable = canPlay(s, i);
      view.setAlpha(playable ? 1 : 0.55);
      bg.setInteractive({ useHandCursor: playable })
        .on('pointerover', () => playable && view.setY(HAND.y - 14))
        .on('pointerout', () => view.setY(HAND.y))
        .on('pointerdown', () => playCard(this.state, i));
      this.handLayer.add(view);
      return { id, x, y: HAND.y, w: HAND.w, h: HAND.h };
    });
  }

  // Rewards, rests and the end of a run

  private createReward() {
    const dim = this.add.rectangle(VIEW.w / 2, VIEW.h / 2, VIEW.w, VIEW.h, 0x0e0a08, 0.7).setInteractive();
    this.rewardTitle = this.add.text(VIEW.w / 2, 100, '', textStyle(28, '#e6c766')).setOrigin(0.5);
    const skip = makeButton(this, SKIP.x, SKIP.y, 'Skip', () => takeReward(this.state, null));
    this.rewardLayer = this.add.container(0, 0, [dim, this.rewardTitle, skip]).setDepth(UI_DEPTH + 10).setVisible(false);
  }

  private drawReward() {
    const s = this.state;
    const choices = s.phase === 'reward' ? s.reward : null;
    this.rewardLayer.setVisible(!!choices);
    const key = choices?.join() ?? '';
    if (key === this.rewardKey) return;
    this.rewardKey = key;
    this.rewardLayer.each((child: Phaser.GameObjects.GameObject) => {
      if (child.getData('card')) child.destroy();
    });
    this.rewards = [];
    if (!choices) return;
    const treasure = s.rooms[s.at!]?.kind === 'treasure';
    this.rewardTitle.setText(treasure ? 'Treasure! Take a rare card' : 'Choose a card for your deck');
    choices.forEach((id, i) => {
      const x = REWARD.xs[i];
      const { view, bg } = makeCard(this, id, x, REWARD.y, REWARD.scale);
      view.setData('card', true);
      bg.setInteractive({ useHandCursor: true })
        .on('pointerover', () => bg.setStrokeStyle(4, GOLD.light))
        .on('pointerout', () => bg.setStrokeStyle(3, INK))
        .on('pointerdown', () => takeReward(this.state, i));
      this.rewardLayer.add(view);
      this.rewards.push({ id, x, y: REWARD.y, w: HAND.w * REWARD.scale, h: HAND.h * REWARD.scale });
    });
  }

  private createPanel() {
    const dim = this.add.rectangle(VIEW.w / 2, VIEW.h / 2, VIEW.w, VIEW.h, 0x0e0a08, 0.7).setInteractive();
    const box = this.add.rectangle(VIEW.w / 2, VIEW.h / 2, 560, 280, 0x2a2632).setStrokeStyle(4, 0x7a7288);
    this.panelTitle = this.add.text(VIEW.w / 2, VIEW.h / 2 - 96, '', textStyle(30)).setOrigin(0.5);
    this.panelText = this.add
      .text(VIEW.w / 2, VIEW.h / 2 - 20, '', { fontFamily: FONT, fontSize: '16px', color: '#f1e3c6', align: 'center', wordWrap: { width: 500 } })
      .setOrigin(0.5);
    this.panelButton = makeButton(this, PANEL_BUTTON.x, PANEL_BUTTON.y, 'Continue', () => this.panelAction());
    this.removeButton = makeButton(this, PANEL_BUTTON.x + REST_BUTTONS.dx, PANEL_BUTTON.y, 'Remove a card', () => canRemove(this.state) && (this.removing = true), REST_BUTTONS.w);
    this.panel = this.add.container(0, 0, [dim, box, this.panelTitle, this.panelText, this.panelButton, this.removeButton]).setDepth(UI_DEPTH + 20).setVisible(false);
  }

  private drawPanel() {
    const s = this.state;
    if (s.phase !== 'rest') this.removing = false;
    const show = (s.phase === 'rest' && !this.removing) || s.phase === 'over' || s.phase === 'won';
    this.panel.setVisible(show);
    this.drawRemove();
    if (!show) return;
    const caption = this.panelButton.list[1] as Phaser.GameObjects.Text;
    const camp = s.phase === 'rest';
    this.removeButton.setVisible(camp).setAlpha(canRemove(s) ? 1 : 0.45);
    this.panelButton.setX(camp ? PANEL_BUTTON.x - REST_BUTTONS.dx : PANEL_BUTTON.x);
    (this.panelButton.list[0] as Phaser.GameObjects.Rectangle).setSize(camp ? REST_BUTTONS.w : BUTTON.w, BUTTON.h).setOrigin(0.5);
    if (camp) {
      this.panelTitle.setText('A quiet campfire').setColor('#f09a3a');
      this.panelText.setText(
        `Rest by the fire to heal ${restHeal(s)}, or burn a card you no longer want.\nHealth ${s.hp} of ${s.maxHp}, deck of ${s.deck.length} cards.`,
      );
      caption.setText(`Rest (+${restHeal(s)})`);
      this.panelAction = () => rest(this.state);
    } else {
      const won = s.phase === 'won';
      this.panelTitle.setText(won ? 'The Bone King falls!' : 'You have fallen').setColor(won ? '#e6c766' : '#e0584f');
      this.panelText.setText(
        won
          ? `You cleared the dungeon with ${s.hp} health left and a deck of ${s.deck.length} cards.`
          : `You fell in room ${s.cleared.length + 1}, with a deck of ${s.deck.length} cards.`,
      );
      caption.setText('Delve again');
      this.panelAction = () => this.scene.restart();
    }
  }

  private createRemove() {
    const dim = this.add.rectangle(VIEW.w / 2, VIEW.h / 2, VIEW.w, VIEW.h, 0x0e0a08, 0.8).setInteractive();
    const title = this.add.text(VIEW.w / 2, 80, 'Burn a card: it leaves your deck for good', textStyle(24, '#f09a3a')).setOrigin(0.5);
    const back = makeButton(this, SKIP.x, SKIP.y, 'Back', () => (this.removing = false));
    this.removeLayer = this.add.container(0, 0, [dim, title, back]).setDepth(UI_DEPTH + 21).setVisible(false);
  }

  /** The deck's different cards, one of each, to pick the one to burn. */
  private drawRemove() {
    const s = this.state;
    this.removeLayer.setVisible(this.removing);
    const ids = this.removing ? [...new Set(s.deck)] : [];
    const key = ids.join();
    if (key === this.removeKey) return;
    this.removeKey = key;
    this.removeLayer.each((child: Phaser.GameObjects.GameObject) => {
      if (child.getData('card')) child.destroy();
    });
    const perRow = Math.min(ids.length, REMOVE.perRow);
    ids.forEach((id, i) => {
      const row = Math.floor(i / REMOVE.perRow);
      const inRow = Math.min(perRow, ids.length - row * REMOVE.perRow);
      const x = VIEW.w / 2 + (i % REMOVE.perRow - (inRow - 1) / 2) * REMOVE.gap;
      const y = REMOVE.y + row * REMOVE.rowGap;
      const { view, bg } = makeCard(this, id, x, y, REMOVE.scale);
      const copies = s.deck.filter((d) => d === id).length;
      const count = this.add.text(x, y + (HAND.h * REMOVE.scale) / 2 + 12, `x${copies}`, textStyle(14, '#e6c766')).setOrigin(0.5);
      view.setData('card', true);
      count.setData('card', true);
      bg.setInteractive({ useHandCursor: true }).on('pointerdown', () => removeCard(this.state, id));
      this.removeLayer.add([view, count]);
    });
  }

  // Floating numbers and the top bar

  private drawPops() {
    const s = this.state;
    const seen = new Set<number>();
    for (const p of s.pops) {
      seen.add(p.id);
      let text = this.pops.get(p.id);
      const foe = p.on === 'hero' ? null : this.foes.get(p.on);
      const x = p.on === 'hero' ? HERO_FEET.x : foe?.x ?? text?.x ?? VIEW.w / 2;
      const top = p.on === 'hero' ? HERO_FEET.y - this.hero.height : foe ? FOE_FEET_Y - foe.sprite.height : (text?.getData('top') ?? 200);
      if (!text) {
        // Several numbers on the same target at once fan out a little.
        const spread = (s.pops.filter((q) => q.on === p.on && q.id < p.id).length % 3) * 22;
        text = this.add.text(x + spread - 22, 0, p.text, textStyle(22, POP_COLORS[p.kind])).setOrigin(0.5).setDepth(UI_DEPTH + 5);
        this.pops.set(p.id, text);
      }
      text.setData('top', top);
      const t = 1 - p.ms / POP_MS;
      text.setY(top - 44 - t * 40).setAlpha(Math.min(1, (1 - t) * 3));
    }
    for (const [id, text] of this.pops) {
      if (seen.has(id)) continue;
      text.destroy();
      this.pops.delete(id);
    }
  }

  private createHud() {
    this.hud = this.add.graphics().setDepth(UI_DEPTH);
    this.add.image(26, HUD_HEIGHT / 2, 'heart').setDepth(UI_DEPTH + 1);
    this.hpText = this.add.text(46, 10, '', textStyle(18, '#f4a08a')).setDepth(UI_DEPTH + 1);
    this.deckText = this.add.text(220, 12, '', textStyle(15)).setDepth(UI_DEPTH + 1);
    this.roomText = this.add.text(VIEW.w - 16, 12, '', textStyle(15, '#e6c766')).setOrigin(1, 0).setDepth(UI_DEPTH + 1);
  }

  private drawHud() {
    const s = this.state;
    const g = this.hud.clear();
    g.fillStyle(0x1e1a24, 0.92).fillRect(0, 0, VIEW.w, HUD_HEIGHT);
    g.fillStyle(0x5a5366).fillRect(0, HUD_HEIGHT - 3, VIEW.w, 3);
    this.hpText.setText(`${s.hp}/${s.maxHp}`);
    this.deckText.setText(`Deck ${s.deck.length} cards`);
    const room = s.at === null ? null : s.rooms[s.at];
    const depth = room ? room.col + 1 : 0;
    const name = room?.foes ? room.foes.map((k) => ENEMIES[k].name).join(' and ') : room?.kind === 'rest' ? 'Campfire' : room?.kind === 'treasure' ? 'Treasure' : 'Entrance';
    const where = s.phase === 'map' || s.phase === 'walk' ? '' : name;
    this.roomText.setText(`The Crypt   Room ${depth} of 6   ${where}`.trimEnd());
  }
}
