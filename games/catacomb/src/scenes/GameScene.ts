import { settings } from '../../../../shared/settings';
import Phaser from 'phaser';
import { foeTexture } from '../art/characters';
import { relicIcon } from '../art/icons';
import { BLUE, GOLD, INK, RED, STONE } from '../art/palette';
import { artImage } from '../art/paint';
import { backdrop } from '../art/scenery';
import { isTempered, tempered, type CardId } from '../game/cards';
import { ENEMIES, type StatusKind } from '../game/enemies';
import { COLUMNS, ENTRANCE, reachable } from '../game/map';
import { RELICS, type RelicId } from '../game/relics';
import {
  actName,
  buyCard,
  buyRelic,
  buyRemoval,
  canBuyRemoval,
  canChoose,
  canPlay,
  canRemove,
  canTemper,
  chooseEvent,
  descend,
  endTurn,
  eventHere,
  foeHit,
  intentOf,
  leaveShop,
  newRun,
  playCard,
  removeCard,
  rest,
  restHeal,
  takeReward,
  temperCard,
  tick,
  walkTo,
} from '../game/sim';
import { ENERGY, HAND_SIZE, POP_MS, WALK_MS, type Enemy, type GameState, type Status } from '../game/state';
import { makeButton } from '../ui/Button';
import { makeCard } from '../ui/CardView';
import {
  BUTTON,
  END_TURN,
  ENERGY_ORB,
  EVENT_BUTTONS,
  FOE_FEET_Y,
  FOE_XS,
  FONT,
  HAND,
  HERO_FEET,
  HP_BAR,
  HUD,
  HUD_HEIGHT,
  PANEL_BUTTON,
  PICKER,
  PILES_Y,
  REST_BUTTONS,
  REWARD,
  ROOM_RADIUS,
  SHOP,
  SKIP,
  STATUS_GAP,
  UI_DEPTH,
  VIEW,
} from './layout';

/** Longest simulated step, so a backgrounded tab doesn't jump the game forward. */
const MAX_STEP_MS = 250;
/** How long a relic's name and text stay up after tapping its icon in the top bar. */
const TIP_MS = 2500;

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

const STATUS_KINDS: StatusKind[] = ['weak', 'vulnerable', 'poison'];
const STATUS_COLORS: Record<StatusKind, string> = { weak: '#d8c7a6', vulnerable: '#8ab8e8', poison: '#a8e070' };

/** A fighter's statuses, each an icon and its number, in a row centred on a point. */
class StatusRow {
  private parts: { kind: StatusKind; icon: Phaser.GameObjects.Image; text: Phaser.GameObjects.Text }[];

  constructor(scene: Phaser.Scene, layer: Phaser.GameObjects.Container) {
    this.parts = STATUS_KINDS.map((kind) => {
      const icon = artImage(scene, 0, 0, `status-${kind}`).setVisible(false);
      const text = scene.add.text(0, 0, '', textStyle(15, STATUS_COLORS[kind])).setOrigin(0, 0.5).setVisible(false);
      layer.add([icon, text]);
      return { kind, icon, text };
    });
  }

  draw(status: Status | undefined, x: number, y: number) {
    const shown = this.parts.filter((p) => (status?.[p.kind] ?? 0) > 0);
    for (const p of this.parts) {
      const i = shown.indexOf(p);
      p.icon.setVisible(i >= 0);
      p.text.setVisible(i >= 0);
      if (i < 0) continue;
      const cx = x + (i - (shown.length - 1) / 2) * STATUS_GAP;
      p.icon.setPosition(cx - 9, y);
      p.text.setPosition(cx + 5, y).setText(String(status![p.kind]));
    }
  }

  destroy() {
    for (const p of this.parts) {
      p.icon.destroy();
      p.text.destroy();
    }
  }
}

/** What is drawn for one foe. */
interface Foe {
  sprite: Phaser.GameObjects.Image;
  intent: Phaser.GameObjects.Image;
  intentText: Phaser.GameObjects.Text;
  /** The status an intent puts on the hero, after its number. */
  intentExtra: Phaser.GameObjects.Image;
  hp: Phaser.GameObjects.Text;
  statuses: StatusRow;
  x: number;
}

/** What the card picker is for: burning or tempering at a campfire, or the merchant's removal. */
type PickMode = 'burn' | 'temper' | 'sell';

const PICK_TITLES: Record<PickMode, string> = {
  burn: 'Burn a card: it leaves your deck for good',
  temper: 'Temper a card: it gets better for good',
  sell: 'The merchant takes one card off your hands',
};

const POP_COLORS = { damage: '#f4a08a', block: '#8ab8e8', heal: '#8cd060', status: '#c49ae8' };

export class GameScene extends Phaser.Scene {
  /** The run being played; read by the playthrough test. */
  state!: GameState;
  /** The cards in hand, in order; read by the playthrough test. */
  hand: CardSpot[] = [];
  /** The reward cards on offer; read by the playthrough test. */
  rewards: CardSpot[] = [];

  private mapLayer!: Phaser.GameObjects.Container;
  private mapBg!: Phaser.GameObjects.Image;
  private paths!: Phaser.GameObjects.Graphics;
  private roomRings!: Phaser.GameObjects.Graphics;
  /** The room icons and their tap circles, rebuilt for each act's map. */
  private roomLayer!: Phaser.GameObjects.Container;
  private roomsBuilt: GameState['rooms'] | null = null;
  private token!: Phaser.GameObjects.Image;
  private mapHint!: Phaser.GameObjects.Text;

  private fightLayer!: Phaser.GameObjects.Container;
  private roomBg!: Phaser.GameObjects.Image;
  private hero!: Phaser.GameObjects.Image;
  private heroStatuses!: StatusRow;
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
  /** The campfire's other choices, next to Rest. */
  private temperButton!: Phaser.GameObjects.Container;
  private removeButton!: Phaser.GameObjects.Container;
  /** A mystery room's two choices. */
  private choiceButtons: Phaser.GameObjects.Container[] = [];
  /** The deck laid out to pick a card to burn, temper or sell. */
  private pickLayer!: Phaser.GameObjects.Container;
  private pickTitle!: Phaser.GameObjects.Text;
  private picking: PickMode | null = null;
  private pickKey = '';

  private shopLayer!: Phaser.GameObjects.Container;
  private shopKey = '';

  private hud!: Phaser.GameObjects.Graphics;
  private hpText!: Phaser.GameObjects.Text;
  private deckText!: Phaser.GameObjects.Text;
  private goldText!: Phaser.GameObjects.Text;
  private roomText!: Phaser.GameObjects.Text;
  private relicLayer!: Phaser.GameObjects.Container;
  private relicKey = '';
  private tip!: Phaser.GameObjects.Text;
  private tipMs = 0;
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
    this.picking = null;
    this.pickKey = '';
    this.shopKey = '';
    this.relicKey = '';
    this.roomsBuilt = null;
    this.tipMs = 0;
    this.choiceButtons = [];
    this.createMap();
    this.createFight();
    this.createReward();
    this.createShop();
    this.createPanel();
    this.createPicker();
    this.createHud();
  }

  update(time: number) {
    // Game time from the frame's own timestamp rather than Phaser's smoothed delta.
    const dt = this.lastFrame === null ? 0 : Phaser.Math.Clamp(time - this.lastFrame, 0, MAX_STEP_MS);
    this.lastFrame = time;
    this.clock += dt;
    this.tipMs = Math.max(0, this.tipMs - dt);
    tick(this.state, dt);

    const s = this.state;
    const roomKind = s.at === null ? null : s.rooms[s.at]?.kind;
    const inFight = roomKind === 'fight' || roomKind === 'elite' || roomKind === 'boss';
    const onMap = ['map', 'walk', 'rest', 'shop', 'event'].includes(s.phase) || (s.phase === 'reward' && !inFight);
    this.mapLayer.setVisible(onMap);
    this.fightLayer.setVisible(!onMap);
    // Pops first, so a killing blow's number still finds its foe before drawFight drops it.
    this.drawPops();
    if (onMap) this.drawMap();
    else this.drawFight();
    this.drawReward();
    this.drawShop();
    this.drawPanel();
    this.drawHud();
  }

  // The map

  private createMap() {
    this.mapBg = artImage(this, 0, 0, 'map-bg').setOrigin(0);
    this.paths = this.add.graphics();
    this.roomRings = this.add.graphics();
    this.roomLayer = this.add.container(0, 0);
    this.token = artImage(this, ENTRANCE.x, ENTRANCE.y, 'hero-token').setOrigin(0.5, 1);
    this.mapHint = this.add
      .text(VIEW.w / 2, VIEW.h - 34, '', { ...textStyle(18, '#e6c766'), align: 'center', wordWrap: { width: VIEW.w - 80 } })
      .setOrigin(0.5);
    this.mapLayer = this.add.container(0, 0, [this.mapBg, this.paths, this.roomRings, this.roomLayer, this.token, this.mapHint]);
  }

  /** The room icons and their tap circles, made again whenever a new act brings a new map. */
  private buildRooms() {
    const s = this.state;
    if (this.roomsBuilt === s.rooms) return;
    this.roomsBuilt = s.rooms;
    this.roomLayer.removeAll(true);
    s.rooms.forEach((room, i) => {
      const icon = artImage(this, room.x, room.y, `room-${room.kind}`);
      // Taps land anywhere in the room's circle.
      const hit = this.add.circle(room.x, room.y, ROOM_RADIUS, 0xffffff, 0.001).setInteractive({ useHandCursor: true });
      hit.on('pointerdown', () => walkTo(this.state, i));
      this.roomLayer.add([icon, hit]);
    });
    this.mapBg.setTexture(backdrop('map', s.act));
    this.roomBg.setTexture(backdrop('room', s.act));
  }

  private drawMap() {
    this.buildRooms();
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
    // reduced), dim once passed by. Elites and the boss have a red ring until passed.
    const r = this.roomRings.clear();
    const pulse = settings.reduceMotion ? 1 : 0.5 + 0.5 * Math.sin(this.clock / 200);
    rooms.forEach((room, i) => {
      const done = s.cleared.includes(i);
      const open = next.includes(i);
      const danger = room.kind === 'elite' || room.kind === 'boss';
      r.fillStyle(INK, 0.85).fillCircle(room.x, room.y, ROOM_RADIUS);
      r.lineStyle(4, open ? GOLD.light : done ? GOLD.dark : danger ? RED.mid : STONE.light, open ? 0.6 + 0.4 * pulse : 1).strokeCircle(room.x, room.y, ROOM_RADIUS);
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
    const hint = s.at === null ? 'Tap a room to enter the dungeon' : 'Tap a lit room to go on';
    this.mapHint.setText(s.phase === 'map' ? s.notice || hint : '');
  }

  // The fight

  private createFight() {
    this.roomBg = artImage(this, 0, 0, 'room-bg').setOrigin(0);
    this.hero = artImage(this, HERO_FEET.x, HERO_FEET.y, 'hero').setOrigin(0.5, 1);
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
    this.fightLayer = this.add.container(0, 0, [this.roomBg, this.hero, this.bars, this.heroHp, orb, this.energyText, this.endTurnButton, this.handLayer, this.drawText, this.discardText, this.turnBanner]);
    this.heroStatuses = new StatusRow(this, this.fightLayer);
  }

  private drawFight() {
    this.buildRooms();
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
    this.heroStatuses.draw(f?.status, HERO_FEET.x, HERO_FEET.y - this.hero.displayHeight - 16);

    // Foes, each with its intent and statuses over its head; one that falls fades away.
    const seen = new Set<number>();
    enemies.forEach((e, i) => {
      seen.add(e.id);
      let foe = this.foes.get(e.id);
      if (!foe) {
        const sprite = artImage(this, xs[i], FOE_FEET_Y, foeTexture(e.kind)).setOrigin(0.5, 1);
        const intent = artImage(this, 0, 0, 'intent-attack');
        const intentText = this.add.text(0, 0, '', textStyle(18)).setOrigin(0, 0.5);
        const intentExtra = artImage(this, 0, 0, 'status-weak');
        const hp = this.add.text(0, FOE_FEET_Y + HP_BAR.dy + HP_BAR.h / 2, '', textStyle(13)).setOrigin(0.5);
        this.fightLayer.addAt(sprite, 2);
        this.fightLayer.addAt([intent, intentText, intentExtra, hp], this.fightLayer.getIndex(this.bars) + 1);
        foe = { sprite, intent, intentText, intentExtra, hp, statuses: new StatusRow(this, this.fightLayer), x: xs[i] };
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
      const top = FOE_FEET_Y - foe.sprite.displayHeight;
      this.drawIntent(e, foe, foe.x, top - 22);
      foe.statuses.draw(e.status, foe.x, top - 52);
    });
    for (const [id, foe] of this.foes) {
      if (seen.has(id)) continue;
      this.foes.delete(id);
      foe.intent.destroy();
      foe.intentText.destroy();
      foe.intentExtra.destroy();
      foe.hp.destroy();
      foe.statuses.destroy();
      this.tweens.add({ targets: foe.sprite, alpha: 0, y: foe.sprite.y + 10, duration: 400, onComplete: () => foe.sprite.destroy() });
    }

    // Hand, energy and piles.
    this.drawHand();
    this.energyText.setText(f ? `${f.energy}/${ENERGY}` : '');
    this.drawText.setText(f ? `Draw pile ${f.draw.length}` : '');
    this.discardText.setText(f ? `Discard pile ${f.discard.length}` : '');
    this.endTurnButton.setVisible(s.phase === 'player').setAlpha(s.phase === 'player' ? 1 : 0.4);
    const opening = f && f.turn === 1 && s.phase === 'player' && f.discard.length === 0 && f.hand.length === HAND_SIZE;
    const banner = s.phase === 'enemy' ? 'Foes’ turn' : s.phase === 'cleared' ? 'Victory!' : opening ? 'Your turn' : '';
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

  /** The foe's next move over its head: the real damage of an attack, the block, the strength or the status it puts on the hero. */
  private drawIntent(e: Enemy, foe: Foe, x: number, y: number) {
    const intent = intentOf(e);
    foe.intent.setTexture(`intent-${intent.kind}`).setPosition(x - 12, y);
    const text =
      intent.kind === 'attack'
        ? `${foeHit(this.state, e, intent.damage)}${intent.hits ? `x${intent.hits}` : ''}`
        : intent.kind === 'block'
          ? `${intent.block}`
          : intent.kind === 'buff'
            ? `+${intent.strength}`
            : `${intent.amount}`;
    const color = { attack: '#f4a08a', block: '#8ab8e8', buff: '#e6c766', debuff: '#c49ae8' }[intent.kind];
    foe.intentText.setText(text).setPosition(x + 2, y).setColor(color);
    const extra = intent.kind === 'debuff' ? intent.status : intent.kind === 'attack' ? intent.apply?.status : undefined;
    if (extra) foe.intentExtra.setTexture(`status-${extra}`).setPosition(x + 2 + foe.intentText.width + 14, y);
    const show = this.state.phase === 'player';
    foe.intent.setVisible(show);
    foe.intentText.setVisible(show);
    foe.intentExtra.setVisible(show && !!extra);
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

  // Rewards, the merchant, rests, events and the end of an act or a run

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
    const kind = s.rooms[s.at!]?.kind;
    const gold = s.goldWon ? `+${s.goldWon} gold. ` : '';
    this.rewardTitle.setText(
      kind === 'treasure'
        ? 'Treasure! Take a rare card'
        : kind === 'event'
          ? 'The altar drinks. Take a rare card'
          : s.rewardRare
            ? `Elite felled! ${gold}Take a rare card`
            : `${gold}Choose a card for your deck`,
    );
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

  private createShop() {
    const dim = this.add.rectangle(VIEW.w / 2, VIEW.h / 2, VIEW.w, VIEW.h, 0x0e0a08, 0.78).setInteractive();
    const title = this.add.text(VIEW.w / 2, 72, 'The Merchant', textStyle(28, '#e6c766')).setOrigin(0.5);
    const leave = makeButton(this, SHOP.leave.x, SHOP.leave.y, 'Leave', () => leaveShop(this.state));
    this.shopLayer = this.add.container(0, 0, [dim, title, leave]).setDepth(UI_DEPTH + 10).setVisible(false);
  }

  /** The merchant's cards with their prices, and boxes for the relics and the removal; rebuilt when a ware sells or the gold changes. */
  private drawShop() {
    const s = this.state;
    const shop = s.phase === 'shop' && !this.picking ? s.shop : null;
    this.shopLayer.setVisible(!!shop);
    const key = shop ? JSON.stringify([shop, s.gold, s.deck.length]) : '';
    if (key === this.shopKey) return;
    this.shopKey = key;
    this.shopLayer.each((child: Phaser.GameObjects.GameObject) => {
      if (child.getData('ware')) child.destroy();
    });
    if (!shop) return;
    const ware = (...items: Phaser.GameObjects.GameObject[]) => {
      for (const item of items) item.setData('ware', true);
      this.shopLayer.add(items);
    };
    const price = (x: number, y: number, amount: number, sold: boolean) => {
      const coin = artImage(this, x - 22, y, 'coin');
      const text = this.add
        .text(x - 6, y, sold ? 'Sold' : String(amount), textStyle(17, sold ? '#8a8070' : s.gold >= amount ? '#e6c766' : '#e0584f'))
        .setOrigin(0, 0.5);
      coin.setVisible(!sold);
      if (sold) text.setX(x).setOrigin(0.5);
      ware(coin, text);
    };
    shop.cards.forEach((w, i) => {
      const x = SHOP.cardXs[i];
      const { view, bg } = makeCard(this, w.id, x, SHOP.cardY);
      view.setAlpha(w.sold ? 0.25 : s.gold >= w.price ? 1 : 0.6);
      if (!w.sold) {
        bg.setInteractive({ useHandCursor: true })
          .on('pointerover', () => bg.setStrokeStyle(4, GOLD.light))
          .on('pointerout', () => bg.setStrokeStyle(3, INK))
          .on('pointerdown', () => buyCard(this.state, i));
      }
      ware(view);
      price(x, SHOP.cardY + SHOP.priceDy, w.price, w.sold);
    });
    const box = (y: number, icon: string, name: string, text: string, cost: number, sold: boolean, can: boolean, onBuy: () => void) => {
      const { x, w, h } = SHOP.box;
      const bg = this.add.rectangle(x, y, w, h, 0x2a2632, sold ? 0.5 : 1).setStrokeStyle(3, can ? GOLD.mid : 0x5a5366);
      const pic = artImage(this, x - w / 2 + 34, y, icon).setAlpha(sold ? 0.3 : 1);
      const title = this.add.text(x - w / 2 + 66, y - 26, name, textStyle(16, '#f3e9d2'));
      const rules = this.add
        .text(x - w / 2 + 66, y - 6, text, { fontFamily: FONT, fontSize: '13px', color: '#d8c7a6', wordWrap: { width: w - 150 } })
        .setAlpha(sold ? 0.5 : 1);
      ware(bg, pic, title, rules);
      price(x + w / 2 - 34, y, cost, sold);
      if (can) bg.setInteractive({ useHandCursor: true }).on('pointerdown', onBuy);
    };
    shop.relics.forEach((w, i) => {
      const r = RELICS[w.id];
      box(SHOP.box.ys[i], relicIcon(w.id, true), r.name, r.text, w.price, w.sold, !w.sold && s.gold >= w.price, () => buyRelic(this.state, i));
    });
    box(SHOP.box.ys[2], 'room-rest', 'Remove a card', 'Take one card out of your deck for good.', shop.removePrice, shop.removed, canBuyRemoval(s), () => {
      if (canBuyRemoval(this.state)) this.picking = 'sell';
    });
  }

  private createPanel() {
    const dim = this.add.rectangle(VIEW.w / 2, VIEW.h / 2, VIEW.w, VIEW.h, 0x0e0a08, 0.7).setInteractive();
    const box = this.add.rectangle(VIEW.w / 2, VIEW.h / 2, 580, 290, 0x2a2632).setStrokeStyle(4, 0x7a7288);
    this.panelTitle = this.add.text(VIEW.w / 2, VIEW.h / 2 - 100, '', textStyle(30)).setOrigin(0.5);
    this.panelText = this.add
      .text(VIEW.w / 2, VIEW.h / 2 - 26, '', { fontFamily: FONT, fontSize: '16px', color: '#f1e3c6', align: 'center', wordWrap: { width: 520 } })
      .setOrigin(0.5);
    this.panelButton = makeButton(this, PANEL_BUTTON.x, PANEL_BUTTON.y, 'Continue', () => this.panelAction());
    this.temperButton = makeButton(this, PANEL_BUTTON.x, PANEL_BUTTON.y, 'Temper a card', () => canTemper(this.state) && (this.picking = 'temper'), REST_BUTTONS.w);
    this.removeButton = makeButton(this, PANEL_BUTTON.x + REST_BUTTONS.dx, PANEL_BUTTON.y, 'Remove a card', () => canRemove(this.state) && (this.picking = 'burn'), REST_BUTTONS.w);
    this.choiceButtons = [0, 1].map((i) =>
      makeButton(this, VIEW.w / 2, EVENT_BUTTONS.y + i * EVENT_BUTTONS.gap, '', () => chooseEvent(this.state, i), EVENT_BUTTONS.w),
    );
    this.panel = this.add
      .container(0, 0, [dim, box, this.panelTitle, this.panelText, this.panelButton, this.temperButton, this.removeButton, ...this.choiceButtons])
      .setDepth(UI_DEPTH + 20)
      .setVisible(false);
  }

  private drawPanel() {
    const s = this.state;
    if (s.phase !== 'rest' && s.phase !== 'shop') this.picking = null;
    const ev = eventHere(s);
    const show = (s.phase === 'rest' && !this.picking) || !!ev || s.phase === 'descend' || s.phase === 'over' || s.phase === 'won';
    this.panel.setVisible(show);
    this.drawPicker();
    if (!show) return;
    const caption = this.panelButton.list[1] as Phaser.GameObjects.Text;
    const camp = s.phase === 'rest';
    this.panelButton.setVisible(!ev);
    this.temperButton.setVisible(camp).setAlpha(canTemper(s) ? 1 : 0.45);
    this.removeButton.setVisible(camp).setAlpha(canRemove(s) ? 1 : 0.45);
    this.panelButton.setX(camp ? PANEL_BUTTON.x - REST_BUTTONS.dx : PANEL_BUTTON.x);
    (this.panelButton.list[0] as Phaser.GameObjects.Rectangle).setSize(camp ? REST_BUTTONS.w : BUTTON.w, BUTTON.h).setOrigin(0.5);
    this.choiceButtons.forEach((b, i) => {
      b.setVisible(!!ev);
      if (!ev) return;
      (b.list[1] as Phaser.GameObjects.Text).setText(ev.choices[i]);
      b.setAlpha(canChoose(s, i) ? 1 : 0.45);
    });
    if (ev) {
      this.panelTitle.setText(ev.title).setColor('#c49ae8');
      this.panelText.setText(ev.text);
    } else if (camp) {
      this.panelTitle.setText('A quiet campfire').setColor('#f09a3a');
      this.panelText.setText(
        `Rest by the fire to heal ${restHeal(s)}, temper a card to make it better, or burn one you no longer want.\nHealth ${s.hp} of ${s.maxHp}, deck of ${s.deck.length} cards.`,
      );
      caption.setText(`Rest (+${restHeal(s)})`);
      this.panelAction = () => rest(this.state);
    } else if (s.phase === 'descend') {
      this.panelTitle.setText('The Bone King falls!').setColor('#e6c766');
      this.panelText.setText(`${s.notice}\nA stair winds down into the dark.`);
      caption.setText('Descend');
      this.panelAction = () => descend(this.state);
    } else {
      const won = s.phase === 'won';
      const where = s.at === null ? 1 : s.rooms[s.at].col + 1;
      this.panelTitle.setText(won ? 'The Hollow Queen falls!' : 'You have fallen').setColor(won ? '#e6c766' : '#e0584f');
      this.panelText.setText(
        won
          ? `You cleared the dungeon with ${s.hp} health left, ${s.gold} gold and a deck of ${s.deck.length} cards.`
          : `You fell in ${actName(s)}, room ${where} of ${COLUMNS}, with a deck of ${s.deck.length} cards.`,
      );
      caption.setText('Delve again');
      this.panelAction = () => this.scene.restart();
    }
  }

  private createPicker() {
    const dim = this.add.rectangle(VIEW.w / 2, VIEW.h / 2, VIEW.w, VIEW.h, 0x0e0a08, 0.85).setInteractive();
    this.pickTitle = this.add.text(VIEW.w / 2, 80, '', textStyle(24, '#f09a3a')).setOrigin(0.5);
    const back = makeButton(this, PICKER.back.x, PICKER.back.y, 'Back', () => (this.picking = null));
    this.pickLayer = this.add.container(0, 0, [dim, this.pickTitle, back]).setDepth(UI_DEPTH + 21).setVisible(false);
  }

  /**
   * The deck's different cards, one of each, to pick the one to burn, temper or sell. Tempering
   * shows the cards not yet tempered, as they will be once tempered.
   */
  private drawPicker() {
    const s = this.state;
    const mode = this.picking;
    this.pickLayer.setVisible(!!mode);
    const ids = mode ? [...new Set(s.deck)].filter((id) => mode !== 'temper' || !isTempered(id)) : [];
    const key = `${mode}|${ids.join()}`;
    if (key === this.pickKey) return;
    this.pickKey = key;
    this.pickLayer.each((child: Phaser.GameObjects.GameObject) => {
      if (child.getData('card')) child.destroy();
    });
    if (!mode) return;
    this.pickTitle.setText(PICK_TITLES[mode]).setColor(mode === 'temper' ? '#a8e070' : '#f09a3a');
    const L = ids.length > PICKER.roomy.perRow * 2 ? PICKER.tight : PICKER.roomy;
    const perRow = Math.min(ids.length, L.perRow);
    ids.forEach((id, i) => {
      const row = Math.floor(i / L.perRow);
      const inRow = Math.min(perRow, ids.length - row * L.perRow);
      const x = VIEW.w / 2 + ((i % L.perRow) - (inRow - 1) / 2) * L.gap;
      const y = L.y + row * L.rowGap;
      const { view, bg } = makeCard(this, mode === 'temper' ? tempered(id) : id, x, y, L.scale);
      const copies = s.deck.filter((d) => d === id).length;
      const count = this.add.text(x, y + (HAND.h * L.scale) / 2 + 10, `x${copies}`, textStyle(14, '#e6c766')).setOrigin(0.5);
      view.setData('card', true);
      count.setData('card', true);
      bg.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
        const done = mode === 'burn' ? removeCard(this.state, id) : mode === 'temper' ? temperCard(this.state, id) : buyRemoval(this.state, id);
        if (done) this.picking = null;
      });
      this.pickLayer.add([view, count]);
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
      const top = p.on === 'hero' ? HERO_FEET.y - this.hero.displayHeight : foe ? FOE_FEET_Y - foe.sprite.displayHeight : (text?.getData('top') ?? 200);
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
    artImage(this, 26, HUD_HEIGHT / 2, 'heart').setDepth(UI_DEPTH + 1);
    this.hpText = this.add.text(46, 10, '', textStyle(18, '#f4a08a')).setDepth(UI_DEPTH + 1);
    this.deckText = this.add.text(HUD.deckX, 12, '', textStyle(15)).setDepth(UI_DEPTH + 1);
    artImage(this, HUD.coinX, HUD_HEIGHT / 2, 'coin').setDepth(UI_DEPTH + 1);
    this.goldText = this.add.text(HUD.goldX, 10, '', textStyle(18, '#e6c766')).setDepth(UI_DEPTH + 1);
    this.relicLayer = this.add.container(0, 0).setDepth(UI_DEPTH + 1);
    this.roomText = this.add.text(VIEW.w - 16, 12, '', textStyle(15, '#e6c766')).setOrigin(1, 0).setDepth(UI_DEPTH + 1);
    this.tip = this.add
      .text(VIEW.w / 2, HUD_HEIGHT + 22, '', { ...textStyle(16, '#f3e9d2'), backgroundColor: '#2a2632', padding: { x: 10, y: 6 } })
      .setOrigin(0.5)
      .setDepth(UI_DEPTH + 30)
      .setVisible(false);
  }

  /** Shows a relic's name and text under the top bar for a moment. */
  private showTip(id: RelicId) {
    this.tip.setText(`${RELICS[id].name}: ${RELICS[id].text}`);
    this.tipMs = TIP_MS;
  }

  private drawHud() {
    const s = this.state;
    const g = this.hud.clear();
    g.fillStyle(0x1e1a24, 0.92).fillRect(0, 0, VIEW.w, HUD_HEIGHT);
    g.fillStyle(0x5a5366).fillRect(0, HUD_HEIGHT - 3, VIEW.w, 3);
    this.hpText.setText(`${s.hp}/${s.maxHp}`);
    this.deckText.setText(`Deck ${s.deck.length}`);
    this.goldText.setText(String(s.gold));
    const relicKey = s.relics.join();
    if (relicKey !== this.relicKey) {
      this.relicKey = relicKey;
      this.relicLayer.removeAll(true);
      s.relics.forEach((id, i) => {
        const icon = artImage(this, HUD.relicX + i * HUD.relicGap, HUD_HEIGHT / 2, relicIcon(id)).setInteractive({ useHandCursor: true });
        icon.on('pointerdown', () => this.showTip(id)).on('pointerover', () => this.showTip(id));
        this.relicLayer.add(icon);
      });
    }
    this.tip.setVisible(this.tipMs > 0);
    const room = s.at === null ? null : s.rooms[s.at];
    const depth = room ? room.col + 1 : 0;
    const names: Record<string, string> = { rest: 'Campfire', treasure: 'Treasure', shop: 'Merchant', event: 'Mystery' };
    const name = room?.foes ? room.foes.map((k) => ENEMIES[k].name).join(' and ') : room ? names[room.kind] : 'Entrance';
    const where = s.phase === 'map' || s.phase === 'walk' ? '' : name;
    this.roomText.setText(`${actName(s)}   Room ${depth} of ${COLUMNS}   ${where}`.trimEnd());
  }
}
