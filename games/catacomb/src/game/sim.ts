import { byDifficulty } from '../../../../shared/settings';
import { COMMON, RARE, STARTER_DECK, card, type CardId } from './cards';
import { ENEMIES, type EnemyKind, type Intent } from './enemies';
import { ROOMS, reachable } from './map';
import {
  CLEARED_MS,
  ENEMY_ACT_MS,
  ENERGY,
  HAND_SIZE,
  HIT_MS,
  MAX_HP,
  POP_MS,
  REST_HEAL,
  REWARD_CHOICES,
  WALK_MS,
  type Enemy,
  type GameState,
  type Pop,
} from './state';

// The rules: moving on the map, playing cards, the foes' turn and the rewards. Plain TypeScript,
// with randomness only through Math.random so the playthrough test can seed it.

export function newRun(): GameState {
  return {
    phase: 'map',
    hp: MAX_HP,
    maxHp: MAX_HP,
    deck: [...STARTER_DECK],
    at: null,
    cleared: [],
    walk: null,
    fight: null,
    reward: null,
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

/** Sets off towards a room next to the hero's; false if it isn't one. */
export function walkTo(s: GameState, room: number) {
  if (s.phase !== 'map' || !reachable(s.at).includes(room)) return false;
  s.walk = { from: s.at, to: room, ms: 0 };
  s.phase = 'walk';
  return true;
}

function enterRoom(s: GameState, i: number) {
  const room = ROOMS[i];
  s.at = i;
  s.walk = null;
  if (room.kind === 'rest') {
    s.healed = Math.min(s.maxHp - s.hp, Math.round(s.maxHp * REST_HEAL));
    s.hp += s.healed;
    s.phase = 'rest';
  } else if (room.kind === 'treasure') {
    s.reward = pickSome(RARE, REWARD_CHOICES);
    s.phase = 'reward';
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
      return { id: s.nextId++, kind, hp, maxHp: hp, block: 0, strength: 0, step: 0, hitMs: 0, actMs: 0 };
    }),
    acted: 0,
  };
  startTurn(s);
}

function startTurn(s: GameState) {
  const f = s.fight!;
  f.block = 0;
  f.energy = ENERGY;
  f.turn++;
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

/** Plays the card at this place in the hand; false if it can't be played now. */
export function playCard(s: GameState, index: number) {
  if (!canPlay(s, index)) return false;
  const f = s.fight!;
  const id = f.hand.splice(index, 1)[0];
  const c = card(id);
  f.energy -= c.cost;
  if (c.damage) {
    for (let hit = 0; hit < (c.hits ?? 1); hit++) {
      const targets = c.all ? [...f.enemies] : f.enemies.slice(0, 1);
      for (const e of targets) damageEnemy(s, e, c.damage);
    }
  }
  if (c.block) {
    f.block += c.block;
    pop(s, 'hero', `+${c.block}`, 'block');
  }
  if (c.heal) {
    const healed = Math.min(c.heal, s.maxHp - s.hp);
    s.hp += healed;
    pop(s, 'hero', `+${healed}`, 'heal');
  }
  if (c.energy) f.energy += c.energy;
  if (c.draw) drawCards(s, c.draw);
  f.discard.push(id);
  if (f.enemies.length === 0) {
    s.phase = 'cleared';
    s.timerMs = CLEARED_MS;
  }
  return true;
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

export function intentOf(e: Enemy): Intent {
  const pattern = ENEMIES[e.kind].pattern;
  return pattern[e.step % pattern.length];
}

/** Ends the hero's turn: the hand is discarded and the foes act, one at a time. */
export function endTurn(s: GameState) {
  if (s.phase !== 'player') return false;
  const f = s.fight!;
  f.discard.push(...f.hand);
  f.hand = [];
  for (const e of f.enemies) e.block = 0;
  f.acted = 0;
  s.phase = 'enemy';
  s.timerMs = ENEMY_ACT_MS;
  return true;
}

function act(s: GameState, e: Enemy) {
  const f = s.fight!;
  const intent = intentOf(e);
  e.step++;
  e.actMs = HIT_MS;
  if (intent.kind === 'attack') {
    for (let hit = 0; hit < (intent.hits ?? 1); hit++) {
      const amount = intent.damage + e.strength;
      const blocked = Math.min(f.block, amount);
      f.block -= blocked;
      s.hp = Math.max(0, s.hp - (amount - blocked));
      s.heroHitMs = HIT_MS;
      pop(s, 'hero', blocked === amount ? 'Blocked' : `-${amount - blocked}`, 'damage');
    }
  } else if (intent.kind === 'block') {
    e.block += intent.block;
    pop(s, e.id, `+${intent.block}`, 'block');
  } else {
    e.strength += intent.strength;
    pop(s, e.id, `+${intent.strength} str`, 'heal');
  }
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
      act(s, f.enemies[f.acted++]);
      s.timerMs = ENEMY_ACT_MS;
      if (s.hp <= 0) s.phase = 'over';
    } else {
      startTurn(s);
    }
  } else if (s.phase === 'cleared') {
    s.timerMs -= dt;
    if (s.timerMs > 0) return;
    s.fight = null;
    if (ROOMS[s.at!].kind === 'boss') {
      s.cleared.push(s.at!);
      s.phase = 'won';
    } else {
      s.reward = pickSome(COMMON, REWARD_CHOICES);
      s.phase = 'reward';
    }
  }
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
  s.cleared.push(s.at!);
  s.phase = 'map';
  return true;
}

/** Leaves the campfire for the map. */
export function leaveRest(s: GameState) {
  if (s.phase !== 'rest') return false;
  s.cleared.push(s.at!);
  s.phase = 'map';
  return true;
}

function pickSome(pool: CardId[], n: number) {
  return shuffle(pool).slice(0, n);
}

function pop(s: GameState, on: Pop['on'], text: string, kind: Pop['kind']) {
  s.pops.push({ id: s.nextId++, on, text, kind, ms: POP_MS });
}
