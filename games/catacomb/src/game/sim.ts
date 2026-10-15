import { byDifficulty } from '../../../../shared/settings';
import { COMMON, RARE, STARTER_DECK, card, isTempered, tempered, type BaseId, type CardId } from './cards';
import { ENEMIES, type EnemyKind, type Intent, type StatusKind } from './enemies';
import { ALTAR_COST, CHEST_COST, EVENTS, POOL_COST, POOL_HEAL, SHRINE_COST, SHRINE_GOLD } from './events';
import { ACTS, ACT_FOES, makeMap, reachable } from './map';
import { RELICS, RELIC_IDS, type RelicId } from './relics';
import {
  CARD_PRICE,
  CLEARED_MS,
  ENEMY_ACT_MS,
  ENERGY,
  HAND_SIZE,
  HIT_MS,
  MAX_HP,
  MIN_DECK,
  POP_MS,
  RELIC_GOLD,
  RELIC_PRICE,
  REMOVE_PRICE,
  REST_HEAL,
  REWARD_CHOICES,
  SHOP_CARDS,
  SHOP_RELICS,
  START_GOLD,
  VULNERABLE_MULT,
  WALK_MS,
  WEAK_MULT,
  noStatus,
  type Enemy,
  type GameState,
  type Pop,
  type Status,
} from './state';

// The rules: moving on the map, playing cards, the foes' turn, statuses, rewards, the campfire,
// the merchant, mystery rooms and the descent to the next act. Plain TypeScript, with randomness
// only through Math.random so the playthrough test can seed it.

export function newRun(): GameState {
  return {
    phase: 'map',
    act: 1,
    rooms: makeMap(1),
    hp: MAX_HP,
    maxHp: MAX_HP,
    deck: [...STARTER_DECK],
    gold: START_GOLD,
    relics: [],
    at: null,
    cleared: [],
    walk: null,
    fight: null,
    reward: null,
    rewardRare: false,
    goldWon: 0,
    shop: null,
    notice: '',
    timerMs: 0,
    heroHitMs: 0,
    healed: 0,
    pops: [],
    nextId: 1,
  };
}

/** Fisher-Yates, on a copy. */
export function shuffle<T>(items: T[]) {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export const hasRelic = (s: GameState, id: RelicId) => s.relics.includes(id);

/** The name of the act the hero is in. */
export const actName = (s: GameState) => ACT_FOES[s.act - 1].name;

/** Sets off towards a room next to the hero's; false if it isn't one. */
export function walkTo(s: GameState, room: number) {
  if (s.phase !== 'map' || !reachable(s.rooms, s.at).includes(room)) return false;
  s.walk = { from: s.at, to: room, ms: 0 };
  s.notice = '';
  s.phase = 'walk';
  return true;
}

function enterRoom(s: GameState, i: number) {
  const room = s.rooms[i];
  s.at = i;
  s.walk = null;
  if (room.kind === 'rest') {
    s.healed = 0;
    s.phase = 'rest';
  } else if (room.kind === 'treasure') {
    offerReward(s, true);
  } else if (room.kind === 'shop') {
    s.shop = makeShop(s);
    s.phase = 'shop';
  } else if (room.kind === 'event') {
    s.phase = 'event';
  } else {
    startFight(s, room.foes ?? []);
  }
}

function startFight(s: GameState, foes: EnemyKind[]) {
  s.fight = {
    draw: shuffle(s.deck),
    hand: [],
    discard: [],
    energy: 0,
    block: 0,
    turn: 0,
    enemies: foes.map((kind) => {
      // Foes are a quarter weaker on Easy and 30% tougher on Hard.
      const hp = Math.round(ENEMIES[kind].hp * byDifficulty(0.75, 1, 1.3));
      const status = noStatus();
      if (hasRelic(s, 'boneCharm')) status.vulnerable = 2;
      return { id: s.nextId++, kind, hp, maxHp: hp, block: 0, strength: 0, status, step: 0, intent: ENEMIES[kind].moves[0], hitMs: 0, actMs: 0 };
    }),
    acted: 0,
    status: noStatus(),
    gold: foes.reduce((sum, kind) => sum + ENEMIES[kind].gold, 0),
  };
  startTurn(s);
}

function startTurn(s: GameState) {
  const f = s.fight!;
  f.block = hasRelic(s, 'oakWard') ? 3 : 0;
  f.turn++;
  f.energy = ENERGY + (f.turn === 1 && hasRelic(s, 'emberLantern') ? 1 : 0);
  drawCards(s, HAND_SIZE);
  s.phase = 'player';
}

/** Draws up to n cards, shuffling the discard pile into the draw pile when it runs out. */
function drawCards(s: GameState, n: number) {
  const f = s.fight!;
  for (let i = 0; i < n; i++) {
    if (f.draw.length === 0) {
      if (f.discard.length === 0) return;
      f.draw = shuffle(f.discard);
      f.discard = [];
    }
    f.hand.push(f.draw.shift()!);
  }
}

export function canPlay(s: GameState, index: number) {
  const f = s.fight;
  if (s.phase !== 'player' || !f || index < 0 || index >= f.hand.length) return false;
  return card(f.hand[index]).cost <= f.energy;
}

/** What one hit of a card's `damage` deals to this foe before its block: the Whetstone, the hero's Weak and the foe's Vulnerable. */
export function heroHit(s: GameState, damage: number, e: Enemy) {
  let d = damage + (hasRelic(s, 'whetstone') ? 2 : 0);
  if (s.fight?.status.weak) d = Math.floor(d * WEAK_MULT);
  if (e.status.vulnerable) d = Math.floor(d * VULNERABLE_MULT);
  return d;
}

/** What one hit of this foe's attack deals to the hero before block: its strength, its Weak and the hero's Vulnerable. */
export function foeHit(s: GameState, e: Enemy, damage: number) {
  let d = damage + e.strength;
  if (e.status.weak) d = Math.floor(d * WEAK_MULT);
  if (s.fight?.status.vulnerable) d = Math.floor(d * VULNERABLE_MULT);
  return d;
}

/** Plays the card at this place in the hand; false if it can't be played now. */
export function playCard(s: GameState, index: number) {
  if (!canPlay(s, index)) return false;
  const f = s.fight!;
  const id = f.hand.splice(index, 1)[0];
  const c = card(id);
  f.energy -= c.cost;
  const targets = c.all ? [...f.enemies] : f.enemies.slice(0, 1);
  if (c.damage) {
    for (let hit = 0; hit < (c.hits ?? 1); hit++) {
      const now = c.all ? [...f.enemies] : f.enemies.slice(0, 1);
      for (const e of now) damageEnemy(s, e, heroHit(s, c.damage, e));
    }
  }
  for (const e of targets) {
    if (!f.enemies.includes(e)) continue;
    if (c.weak) applyStatus(s, e.status, e.id, 'weak', c.weak);
    if (c.vulnerable) applyStatus(s, e.status, e.id, 'vulnerable', c.vulnerable);
    if (c.poison) applyStatus(s, e.status, e.id, 'poison', c.poison + (hasRelic(s, 'venomGland') ? 2 : 0));
  }
  if (c.block) {
    f.block += c.block;
    pop(s, 'hero', `+${c.block}`, 'block');
  }
  if (c.heal) heal(s, c.heal);
  if (c.energy) f.energy += c.energy;
  if (c.draw) drawCards(s, c.draw);
  f.discard.push(id);
  if (f.enemies.length === 0) clearFight(s);
  return true;
}

function clearFight(s: GameState) {
  s.phase = 'cleared';
  s.timerMs = CLEARED_MS;
}

const STATUS_NAMES: Record<StatusKind, string> = { weak: 'Weak', vulnerable: 'Vulnerable', poison: 'Poison' };

function applyStatus(s: GameState, status: Status, on: Pop['on'], kind: StatusKind, amount: number) {
  status[kind] += amount;
  pop(s, on, `${STATUS_NAMES[kind]} ${amount}`, 'status');
}

function heal(s: GameState, amount: number) {
  const healed = Math.min(amount, s.maxHp - s.hp);
  s.hp += healed;
  if (healed > 0) pop(s, 'hero', `+${healed}`, 'heal');
  return healed;
}

function damageEnemy(s: GameState, e: Enemy, amount: number) {
  const f = s.fight!;
  if (!f.enemies.includes(e)) return;
  const blocked = Math.min(e.block, amount);
  e.block -= blocked;
  e.hp -= amount - blocked;
  e.hitMs = HIT_MS;
  pop(s, e.id, blocked === amount ? 'Blocked' : `-${amount - blocked}`, 'damage');
  if (e.hp <= 0) f.enemies.splice(f.enemies.indexOf(e), 1);
}

/** Hits the hero for this much, through block. */
function damageHero(s: GameState, amount: number) {
  const f = s.fight!;
  const blocked = Math.min(f.block, amount);
  f.block -= blocked;
  s.hp = Math.max(0, s.hp - (amount - blocked));
  s.heroHitMs = HIT_MS;
  pop(s, 'hero', blocked === amount ? 'Blocked' : `-${amount - blocked}`, 'damage');
}

export const intentOf = (e: Enemy): Intent => e.intent;

/** Draws a foe's next move at random from its list, never the one it just made. */
function nextIntent(e: Enemy) {
  const moves = ENEMIES[e.kind].moves;
  const choices = moves.length > 1 ? moves.filter((m) => m !== e.intent) : moves;
  e.intent = choices[Math.floor(Math.random() * choices.length)];
}

/** Ends the hero's turn: the hand is discarded, the hero's Weak wears off a turn, and the foes act, one at a time. */
export function endTurn(s: GameState) {
  if (s.phase !== 'player') return false;
  const f = s.fight!;
  f.discard.push(...f.hand);
  f.hand = [];
  for (const e of f.enemies) e.block = 0;
  f.status.weak = Math.max(0, f.status.weak - 1);
  f.acted = 0;
  s.phase = 'enemy';
  s.timerMs = ENEMY_ACT_MS;
  return true;
}

/** A foe's go: its poison first, then its move. False if the poison killed it. */
function act(s: GameState, e: Enemy) {
  const f = s.fight!;
  if (e.status.poison > 0) {
    e.hp -= e.status.poison;
    e.hitMs = HIT_MS;
    pop(s, e.id, `-${e.status.poison}`, 'status');
    e.status.poison--;
    if (e.hp <= 0) {
      f.enemies.splice(f.enemies.indexOf(e), 1);
      return false;
    }
  }
  const intent = e.intent;
  e.step++;
  nextIntent(e);
  e.actMs = HIT_MS;
  if (intent.kind === 'attack') {
    for (let hit = 0; hit < (intent.hits ?? 1); hit++) damageHero(s, foeHit(s, e, intent.damage));
    if (intent.apply) applyStatus(s, f.status, 'hero', intent.apply.status, intent.apply.amount);
  } else if (intent.kind === 'block') {
    e.block += intent.block;
    pop(s, e.id, `+${intent.block}`, 'block');
  } else if (intent.kind === 'buff') {
    e.strength += intent.strength;
    pop(s, e.id, `+${intent.strength} str`, 'heal');
  } else {
    applyStatus(s, f.status, 'hero', intent.status, intent.amount);
  }
  e.status.weak = Math.max(0, e.status.weak - 1);
  return true;
}

/** After the foes' turn: Vulnerable wears off a turn on everyone, the hero's poison bites, and the hero's turn starts. */
function endRound(s: GameState) {
  const f = s.fight!;
  for (const e of f.enemies) e.status.vulnerable = Math.max(0, e.status.vulnerable - 1);
  f.status.vulnerable = Math.max(0, f.status.vulnerable - 1);
  if (f.status.poison > 0) {
    s.hp = Math.max(0, s.hp - f.status.poison);
    s.heroHitMs = HIT_MS;
    pop(s, 'hero', `-${f.status.poison}`, 'status');
    f.status.poison--;
    if (s.hp <= 0) {
      s.phase = 'over';
      return;
    }
  }
  startTurn(s);
}

/** Moves the run on by dt milliseconds of game time. */
export function tick(s: GameState, dt: number) {
  for (const p of s.pops) p.ms -= dt;
  s.pops = s.pops.filter((p) => p.ms > 0);
  s.heroHitMs = Math.max(0, s.heroHitMs - dt);
  for (const e of s.fight?.enemies ?? []) {
    e.hitMs = Math.max(0, e.hitMs - dt);
    e.actMs = Math.max(0, e.actMs - dt);
  }

  if (s.phase === 'walk' && s.walk) {
    s.walk.ms += dt;
    if (s.walk.ms >= WALK_MS) enterRoom(s, s.walk.to);
  } else if (s.phase === 'enemy') {
    s.timerMs -= dt;
    if (s.timerMs > 0) return;
    const f = s.fight!;
    if (f.acted < f.enemies.length) {
      if (act(s, f.enemies[f.acted])) f.acted++;
      s.timerMs = ENEMY_ACT_MS;
      if (s.hp <= 0) s.phase = 'over';
      else if (f.enemies.length === 0) clearFight(s);
    } else {
      endRound(s);
    }
  } else if (s.phase === 'cleared') {
    s.timerMs -= dt;
    if (s.timerMs > 0) return;
    winFight(s);
  }
}

/** The last foe fell: gold, the Mending Moss, then the reward, the descent or the win. */
function winFight(s: GameState) {
  const room = s.rooms[s.at!];
  s.goldWon = Math.round(s.fight!.gold * (hasRelic(s, 'goldenIdol') ? 1.5 : 1));
  s.gold += s.goldWon;
  s.fight = null;
  if (hasRelic(s, 'mendingMoss')) heal(s, 5);
  if (room.kind !== 'boss') {
    offerReward(s, room.kind === 'elite');
    return;
  }
  s.cleared.push(s.at!);
  if (s.act >= ACTS) {
    s.phase = 'won';
    return;
  }
  const relic = grantRelic(s);
  s.notice = relic ? `Among the bones lies the ${RELICS[relic].name}: ${RELICS[relic].text}` : `Among the bones lie ${RELIC_GOLD} more gold.`;
  s.phase = 'descend';
}

function offerReward(s: GameState, rare: boolean) {
  s.rewardRare = rare;
  s.reward = pickSome(rare ? RARE : COMMON, REWARD_CHOICES);
  s.phase = 'reward';
}

/** Takes the reward card at this place, or none for null, and goes back to the map. */
export function takeReward(s: GameState, index: number | null) {
  if (s.phase !== 'reward' || !s.reward) return false;
  if (index !== null) {
    const id = s.reward[index];
    if (!id) return false;
    s.deck.push(id);
  }
  s.reward = null;
  s.goldWon = 0;
  s.cleared.push(s.at!);
  s.phase = 'map';
  return true;
}

/** A relic the hero doesn't own yet, at random; gold instead once they own every one. */
function grantRelic(s: GameState) {
  const left = RELIC_IDS.filter((r) => !hasRelic(s, r));
  if (left.length === 0) {
    s.gold += RELIC_GOLD;
    return null;
  }
  const relic = left[Math.floor(Math.random() * left.length)];
  s.relics.push(relic);
  return relic;
}

/** Goes down to the next act: a new map, and a rest's worth of healing on the way. */
export function descend(s: GameState) {
  if (s.phase !== 'descend') return false;
  s.act++;
  s.rooms = makeMap(s.act);
  s.at = null;
  s.cleared = [];
  const healed = heal(s, restHeal(s));
  s.notice = `${actName(s)}${healed ? `: you catch your breath (+${healed} health)` : ''}`;
  s.phase = 'map';
  return true;
}

// The campfire

/** What resting at the campfire would heal. */
export const restHeal = (s: GameState) => Math.min(s.maxHp - s.hp, Math.round(s.maxHp * REST_HEAL));

/** Rests at the campfire: heals, then goes back to the map. */
export function rest(s: GameState) {
  if (s.phase !== 'rest') return false;
  s.healed = restHeal(s);
  s.hp += s.healed;
  if (s.healed > 0) pop(s, 'hero', `+${s.healed}`, 'heal');
  leaveRoom(s);
  return true;
}

/** Whether the campfire can take a card out of the deck. */
export const canRemove = (s: GameState) => s.phase === 'rest' && s.deck.length > MIN_DECK;

/** Takes one copy of a card out of the deck at the campfire, then goes back to the map. */
export function removeCard(s: GameState, id: CardId) {
  const i = s.deck.indexOf(id);
  if (!canRemove(s) || i < 0) return false;
  s.deck.splice(i, 1);
  leaveRoom(s);
  return true;
}

/** Whether the campfire can temper a card: one in the deck isn't tempered yet. */
export const canTemper = (s: GameState) => s.phase === 'rest' && s.deck.some((id) => !isTempered(id));

/** Tempers one copy of a card at the campfire, then goes back to the map. */
export function temperCard(s: GameState, id: CardId) {
  const i = s.deck.indexOf(id);
  if (!canTemper(s) || i < 0 || isTempered(id)) return false;
  s.deck[i] = tempered(id);
  s.notice = `Tempered ${card(id).name} into ${card(s.deck[i]).name}`;
  leaveRoom(s);
  return true;
}

/** Tempers up to n cards of the deck at random; returns their new names. */
function temperRandom(s: GameState, n: number) {
  const names: string[] = [];
  for (let k = 0; k < n; k++) {
    const plain = s.deck.map((id, i) => (isTempered(id) ? -1 : i)).filter((i) => i >= 0);
    if (plain.length === 0) break;
    const i = plain[Math.floor(Math.random() * plain.length)];
    s.deck[i] = tempered(s.deck[i]);
    names.push(card(s.deck[i]).name);
  }
  return names;
}

function leaveRoom(s: GameState) {
  s.cleared.push(s.at!);
  s.phase = 'map';
}

// The merchant

function makeShop(s: GameState) {
  const ware = <T>(id: T, price: number) => ({ id, price, sold: false });
  const relics = shuffle(RELIC_IDS.filter((r) => !hasRelic(s, r))).slice(0, SHOP_RELICS);
  return {
    cards: [
      ...shuffle(COMMON).slice(0, SHOP_CARDS.common).map((id) => ware<BaseId>(id, CARD_PRICE.common)),
      ...shuffle(RARE).slice(0, SHOP_CARDS.rare).map((id) => ware<BaseId>(id, CARD_PRICE.rare)),
    ],
    relics: relics.map((id) => ware(id, RELIC_PRICE)),
    removePrice: REMOVE_PRICE,
    removed: false,
  };
}

/** Buys the merchant's card at this place into the deck; false if sold or too dear. */
export function buyCard(s: GameState, i: number) {
  const w = s.phase === 'shop' ? s.shop?.cards[i] : undefined;
  if (!w || w.sold || s.gold < w.price) return false;
  s.gold -= w.price;
  s.deck.push(w.id);
  w.sold = true;
  return true;
}

/** Buys the merchant's relic at this place; false if sold or too dear. */
export function buyRelic(s: GameState, i: number) {
  const w = s.phase === 'shop' ? s.shop?.relics[i] : undefined;
  if (!w || w.sold || s.gold < w.price || hasRelic(s, w.id)) return false;
  s.gold -= w.price;
  s.relics.push(w.id);
  w.sold = true;
  return true;
}

/** Whether the merchant can still take a card out of the deck. */
export const canBuyRemoval = (s: GameState) =>
  s.phase === 'shop' && !!s.shop && !s.shop.removed && s.gold >= s.shop.removePrice && s.deck.length > MIN_DECK;

/** Pays the merchant to take one copy of a card out of the deck. */
export function buyRemoval(s: GameState, id: CardId) {
  const i = s.deck.indexOf(id);
  if (!canBuyRemoval(s) || i < 0) return false;
  s.gold -= s.shop!.removePrice;
  s.deck.splice(i, 1);
  s.shop!.removed = true;
  return true;
}

export function leaveShop(s: GameState) {
  if (s.phase !== 'shop') return false;
  s.shop = null;
  leaveRoom(s);
  return true;
}

// Mystery rooms

/** Whether this choice of the event can be taken: one that costs health needs more than it costs. */
export function canChoose(s: GameState, choice: number) {
  const ev = s.phase === 'event' ? s.rooms[s.at!].event : undefined;
  if (!ev || (choice !== 0 && choice !== 1)) return false;
  if (ev === 'altar' && choice === 0) return s.hp > ALTAR_COST;
  if (ev === 'shrine' && choice === 1) return s.hp > SHRINE_COST;
  if (ev === 'chest' && choice === 0) return s.maxHp > CHEST_COST + 1;
  if (ev === 'pool' && choice === 1) return s.hp > POOL_COST;
  return true;
}

/** Takes one of the event's two choices, then goes back to the map (or on to a rare card). */
export function chooseEvent(s: GameState, choice: number) {
  if (!canChoose(s, choice)) return false;
  const ev = s.rooms[s.at!].event!;
  const hurt = (n: number) => {
    s.hp -= n;
    pop(s, 'hero', `-${n}`, 'damage');
  };
  s.notice = '';
  if (ev === 'altar') {
    if (choice === 0) {
      hurt(ALTAR_COST);
      offerReward(s, true);
      return true;
    }
  } else if (ev === 'shrine') {
    if (choice === 0) {
      const names = temperRandom(s, 2);
      s.notice = names.length ? `The idol tempers ${names.join(' and ')}` : 'The idol is silent';
    } else {
      hurt(SHRINE_COST);
      s.gold += SHRINE_GOLD;
      s.notice = `+${SHRINE_GOLD} gold`;
    }
  } else if (ev === 'chest') {
    if (choice === 0) {
      s.maxHp -= CHEST_COST;
      s.hp = Math.min(s.hp, s.maxHp);
      const relic = grantRelic(s);
      s.notice = relic ? `Found the ${RELICS[relic].name}: ${RELICS[relic].text}` : `Found ${RELIC_GOLD} gold`;
    }
  } else if (choice === 0) {
    const healed = heal(s, POOL_HEAL);
    s.notice = `Healed ${healed}`;
  } else {
    hurt(POOL_COST);
    const names = temperRandom(s, 1);
    s.notice = names.length ? `The water tempers ${names[0]}` : 'Nothing happens';
  }
  leaveRoom(s);
  return true;
}

/** The event in the hero's room, while in one. */
export const eventHere = (s: GameState) => (s.phase === 'event' ? EVENTS[s.rooms[s.at!].event!] : null);

function pickSome(pool: BaseId[], n: number): CardId[] {
  return shuffle(pool).slice(0, n);
}

function pop(s: GameState, on: Pop['on'], text: string, kind: Pop['kind']) {
  s.pops.push({ id: s.nextId++, on, text, kind, ms: POP_MS });
}

