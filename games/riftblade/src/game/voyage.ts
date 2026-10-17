/**
 * The Rift Crusade between the fights: what happens when a planet's boss (or the arena) falls, the
 * star map's nodes (trader, elite arena, rest, events) and the jump to the next planet. Pure state
 * changes like `sim.ts`; randomness from Math.random.
 */
import { ELITE, WAVES, statsOf, type EventState, type GameState } from './state';
import { collectAll, heal, lower, nextPick, pop, raise, refreshHealth, spawnElite, tick, type Input } from './sim';
import { FILLER, MAX_TIER, UPGRADES, UPGRADE_IDS, canOffer, rollChoices } from './upgrades';
import { CREDITS, LAST_PLANET, NODE_INFO, PLANETS, REST_HEAL, TRADE, arenaElites, type EventId, type NodeKind } from './planets';

/** One frame of the game: the sim while a fight is on, then whatever follows a cleared fight. */
export function frame(s: GameState, dtMs: number, input: Input) {
  tick(s, dtMs, input);
  if (s.phase === 'cleared') afterClear(s);
  if (s.phase === 'travel') nextPlanet(s);
}

/** Empties the field between fights (the hero, their kit and allies stay). */
function clearField(s: GameState) {
  s.enemies = [];
  s.bullets = [];
  s.shards = [];
  s.bombs = [];
  s.fires = [];
  s.pickups = [];
  s.hazards = [];
  s.spawnDebt = 0;
  s.player.dashMs = 0;
  s.player.slowMs = 0;
  s.player.slowPct = 0;
  s.allies = s.allies.filter((a) => a.kind !== 'sentry');
}

/** A boss (or the arena) has fallen: take what is lying about, then the cards, the map or the win. */
export function afterClear(s: GameState) {
  collectAll(s);
  clearField(s);
  if (s.arena) {
    s.arena = false;
    if (s.arenaWon) {
      s.credits += CREDITS.arena;
      s.rewardPicks += 1;
      pop(s, `Arena won: +${CREDITS.arena} credits and a free pick`, '#ffe066');
    } else pop(s, 'The elites withdraw', '#8ea0c4');
    s.after = 'travel';
  } else {
    s.credits += CREDITS.clear;
    if (s.planet >= LAST_PLANET) {
      s.phase = 'won';
      return;
    }
    s.nodes = rollNodes();
    s.after = 'map';
  }
  nextPick(s);
}

/** Two or three different nodes for the star map. */
export function rollNodes(): NodeKind[] {
  const kinds = Object.keys(NODE_INFO) as NodeKind[];
  const count = Math.random() < 0.5 ? 2 : 3;
  const out: NodeKind[] = [];
  while (out.length < count) out.push(kinds.splice(Math.floor(Math.random() * kinds.length), 1)[0]);
  return out;
}

/** Takes the star map node at `index`. */
export function chooseNode(s: GameState, index: number) {
  if (s.phase !== 'map') return;
  const kind = s.nodes[index];
  if (!kind) return;
  if (kind === 'trader') {
    s.offers = rollOffers(s);
    s.phase = 'trader';
  } else if (kind === 'elite') startArena(s);
  else if (kind === 'rest') {
    const before = s.player.hp;
    heal(s, REST_HEAL * s.player.maxHp);
    pop(s, `Rested: +${Math.round(s.player.hp - before)} health`, '#7dffa0');
    s.phase = 'travel';
  } else {
    s.event = rollEvent(s);
    s.phase = 'event';
  }
}

// ---------------------------------------------------------------------------------------------
// The trader

/** Three offers: a level-up's cards, without the ration. */
function rollOffers(s: GameState): (string | null)[] {
  const ids = rollChoices(s.hero!, s.ranks).filter((id) => id !== FILLER.id);
  return [0, 1, 2].map((i) => ids[i] ?? null);
}

/** What the next tier of an upgrade costs. */
export function priceOf(s: GameState, id: string) {
  return TRADE.base + TRADE.perTier * (s.ranks[id] ?? 0);
}

/** Buys the offer at `index`; false if it is gone or too dear. */
export function buy(s: GameState, index: number) {
  if (s.phase !== 'trader') return false;
  const id = s.offers[index];
  if (!id || s.credits < priceOf(s, id)) return false;
  s.credits -= priceOf(s, id);
  raise(s, id);
  // Sold; and anything the slots no longer allow goes too.
  s.offers = s.offers.map((o, i) => (i === index || !o || !canOffer(o, s.hero!, s.ranks) ? null : o));
  return true;
}

export function reroll(s: GameState) {
  if (s.phase !== 'trader' || s.credits < TRADE.reroll) return false;
  s.credits -= TRADE.reroll;
  s.offers = rollOffers(s);
  return true;
}

export function leave(s: GameState) {
  if (s.phase === 'trader') s.phase = 'travel';
}

// ---------------------------------------------------------------------------------------------
// The elite arena

function startArena(s: GameState) {
  clearField(s);
  s.arena = true;
  s.arenaWon = false;
  s.time = 0;
  s.waves = [];
  s.nextElite = Infinity;
  s.bossSpawned = false;
  s.phase = 'run';
  const n = arenaElites(s.planet);
  const a0 = Math.random() * Math.PI * 2;
  for (let i = 0; i < n; i++) spawnElite(s, a0 + (i / n) * Math.PI * 2);
  pop(s, `Elite arena: beat ${n} elites in 60 s`, '#ffe066');
}

// ---------------------------------------------------------------------------------------------
// Events

/** Two abilities for the shrine: one to give a tier of, one to raise by two. */
function shrinePair(s: GameState) {
  const abilities = Object.keys(s.ranks).filter((id) => UPGRADES[id].kind !== 'gear');
  const gains = abilities.filter((id) => s.ranks[id] <= MAX_TIER - 2);
  if (abilities.length < 2 || !gains.length) return null;
  const gain = gains[Math.floor(Math.random() * gains.length)];
  const loses = abilities.filter((id) => id !== gain);
  return { gain, lose: loses[Math.floor(Math.random() * loses.length)] };
}

/** A gear piece the cache can give: a new one if a slot is free, else one held below tier 5. */
function cacheGear(s: GameState) {
  const open = UPGRADE_IDS.filter((id) => UPGRADES[id].kind === 'gear' && canOffer(id, s.hero!, s.ranks));
  return open.length ? open[Math.floor(Math.random() * open.length)] : null;
}

export function rollEvent(s: GameState): EventState {
  const ids: EventId[] = ['droid', 'cache', 'well'];
  const pair = shrinePair(s);
  if (pair) ids.push('shrine');
  const id = ids[Math.floor(Math.random() * ids.length)];
  if (id === 'droid') {
    return {
      id, title: 'A stranded droid', text: 'A small turret drone sits in the wreck of a lander, still humming. It turns its lens toward you.',
      options: [
        { label: 'Take it along', text: 'It flies with you and shoots for the whole next planet' },
        { label: 'Strip it for parts', text: '+20 credits' },
      ],
    };
  }
  if (id === 'cache') {
    return {
      id, title: 'A derelict cache', text: 'A sealed supply cache, half buried. The lock is rigged: forcing the inner case will cost you.',
      options: [
        { label: 'Take the credits', text: '+40 credits' },
        { label: 'Force the inner case', text: 'A random gear piece, but lose 15% of your max health' },
      ],
    };
  }
  if (id === 'well') {
    return {
      id, title: 'A lumen well', text: 'Raw lumen wells up from a crack in the ground, bright enough to read by.',
      options: [
        { label: 'Drink', text: 'A free level-up' },
        { label: 'Bottle it', text: '+25 credits' },
      ],
    };
  }
  const { lose, gain } = pair!;
  return {
    id, title: 'A shrine of the Current', text: 'An old shrine hums with the Current. It will take what you know and give it back changed.',
    options: [
      { label: 'Make the trade', text: `Lose a tier of ${UPGRADES[lose].name}, gain two tiers of ${UPGRADES[gain].name}` },
      { label: 'Walk on', text: 'Nothing changes' },
    ],
    lose, gain,
  };
}

/** Takes option `index` of the event on offer, then travels on (after a free level-up, if won). */
export function chooseEvent(s: GameState, index: number) {
  const ev = s.event;
  if (s.phase !== 'event' || !ev || !ev.options[index]) return;
  const first = index === 0;
  if (ev.id === 'droid') {
    if (first) {
      s.escort = true;
      pop(s, 'The droid follows you', '#7df9ff');
    } else s.credits += 20;
  } else if (ev.id === 'cache') {
    if (first) s.credits += 40;
    else {
      const gear = cacheGear(s);
      if (gear) {
        raise(s, gear);
        pop(s, `${UPGRADES[gear].name} tier ${s.ranks[gear]}`, '#b48cff');
      } else s.credits += 40;
      s.maxHpMod *= 0.85;
      refreshHealth(s);
    }
  } else if (ev.id === 'well') {
    if (first) s.pendingLevels += 1;
    else s.credits += 25;
  } else if (first && ev.lose && ev.gain) {
    lower(s, ev.lose);
    raise(s, ev.gain);
    raise(s, ev.gain);
    pop(s, `${UPGRADES[ev.gain].name} tier ${s.ranks[ev.gain]}`, '#b48cff');
  }
  s.event = null;
  s.after = 'travel';
  nextPick(s);
}

// ---------------------------------------------------------------------------------------------
// The next planet

export function nextPlanet(s: GameState) {
  s.planet += 1;
  clearField(s);
  s.time = 0;
  s.waves = [...WAVES];
  s.nextElite = ELITE.first;
  s.nextVent = 8000;
  s.bossSpawned = false;
  s.arena = false;
  s.allies = s.allies.filter((a) => a.kind !== 'escort');
  if (s.escort) {
    s.escort = false;
    s.allies.push({ id: s.nextId++, kind: 'escort', x: s.player.x, y: s.player.y, cdMs: 300, lifeMs: 0, slot: 0, aim: 0 });
  }
  s.player.maxHp = statsOf(s).maxHp;
  s.phase = 'run';
  s.after = 'run';
  pop(s, PLANETS[s.planet].name, '#9fd8ff');
}
