import { byDifficulty } from '../../../../shared/settings';
// The rules and numbers of the game, kept apart from drawing so they are easy to tune.

/** The battlefield, in game pixels: a portrait screen with the hero at the bottom. */
export const VIEW = { w: 540, h: 960 };
/** The top bar with the wave, kills and the hero's stats. */
export const HUD_HEIGHT = 56;
/** Where the hero stands, and how far left and right they can move. */
export const HERO = { y: 880, minX: 40, maxX: 500, speed: 300 };
/** An enemy that gets this close to the hero's line has reached the hero: game over. */
export const REACH_Y = HERO.y - 28;
/** Where enemies and pickups come in, from under the top bar. */
export const SPAWN_Y = HUD_HEIGHT - 40;
/** How far in from the screen's sides enemies and pickups come in. */
export const SPAWN_MARGIN = 40;
export const BULLET = { speed: 720, radius: 4 };

/**
 * Where the hero and their companions stand, as offsets from the hero: up to three rows of three,
 * the hero in the middle of the front row. Each row is shifted a third of a step from the last, so
 * all nine rifles are in different columns and every one of them has a clear line of fire.
 * Companions fill the slots after the hero's in order: the front row first, then the rows behind.
 */
export const SQUAD_SLOTS: { dx: number; dy: number }[] = [
  { dx: 0, dy: 0 }, { dx: -60, dy: 0 }, { dx: 60, dy: 0 },
  { dx: 20, dy: 24 }, { dx: -40, dy: 24 }, { dx: 80, dy: 24 },
  { dx: -20, dy: 48 }, { dx: 40, dy: 48 }, { dx: -80, dy: 48 },
];
/** The most companions the hero can have: the slots left once the hero has theirs. */
export const MAX_COMPANIONS = SQUAD_SLOTS.length - 1;
/** The pause between one wave being cleared and the next coming in, in ms. */
export const BREAK_MS = 2500;

export type EnemyKind = 'grunt' | 'runner' | 'brute' | 'boss' | 'spitter' | 'riot' | 'crawler';

/**
 * Hit points at wave 1, walking speed and how fast they veer towards the hero (pixels per second),
 * and the size of their hit circle.
 */
export const ENEMIES: Record<EnemyKind, { hp: number; speed: number; steer: number; radius: number }> = {
  grunt: { hp: 3, speed: 46, steer: 22, radius: 13 },
  runner: { hp: 1, speed: 80, steer: 36, radius: 10 },
  brute: { hp: 9, speed: 26, steer: 14, radius: 20 },
  boss: { hp: 200, speed: 18, steer: 10, radius: 38 },
  spitter: { hp: 4, speed: 34, steer: 12, radius: 13 },
  riot: { hp: 6, speed: 30, steer: 16, radius: 15 },
  crawler: { hp: 1, speed: 54, steer: 30, radius: 8 },
};

/** Scrap banked for each kill, kept between runs to buy a head start (see `KIT_COSTS`). */
export const SCRAP: Record<EnemyKind, number> = { grunt: 1, runner: 1, brute: 3, boss: 25, spitter: 2, riot: 3, crawler: 1 };

/**
 * Spitters walk down to `standY` and stay there, lobbing a glob of acid at the squad's line every
 * `everyMs`. The glob's landing spot is marked `warnMs` before it lands; the puddle burns for
 * `poolMs`. While the hero stands in acid, the squad fires `ACID_SLOW` times slower.
 */
export const SPITTER = { standY: 430, firstMs: 1500, everyMs: 4200, warnMs: 1100, poolMs: 3000, poolRadius: 30 };
export const ACID_SLOW = 2;

/**
 * A riot zombie holds a shield in front of it. A bullet without pierce only chips the shield; a
 * piercing bullet, a drum blast or a flame goes past it. The shield breaks after `riotShield(wave)`
 * points of chipping, so a squad without pierce can still get through it in the end.
 */
export const riotShield = (wave: number) => 8 + 2 * wave;

/** Crawlers come in swarms of `size` from wave `fromWave`, one swarm more every third wave. */
export const SWARM = { size: 6, fromWave: 4 };
export const swarmCount = (wave: number) => (wave >= SWARM.fromWave ? 1 + Math.floor((wave - SWARM.fromWave) / 3) : 0);

/**
 * What a boss does. It walks down like before, but every `everyMs` (the first after `firstMs`) it
 * winds up a move, shown for `warnMs` before it happens:
 * - charge: lunges across the lanes to where the hero stood, `chargeDrop` px further down, over `chargeMs`;
 * - spit: a big acid pool on the hero's line, `spitRadius` wide, burning for `poolMs`;
 * - call: a pack of `pack` runners comes out round it.
 */
export type BossMove = 'charge' | 'spit' | 'call';
export const BOSS_MOVES: BossMove[] = ['charge', 'spit', 'call'];
export const BOSS = { firstMs: 7000, everyMs: 5500, warnMs: 1300, chargeMs: 550, chargeDrop: 55, spitRadius: 64, poolMs: 4500, pack: 5 };
/** The boss's `n`th move: each boss starts one further along, so the second boss opens with the spit. */
export const bossMove = (wave: number, n: number) => BOSS_MOVES[(Math.floor(wave / 5) - 1 + n) % BOSS_MOVES.length];

export type UpgradeKind = 'rate' | 'damage' | 'companion' | 'pierce';

/** What each pickup does, with the name shown on its crate. */
export const UPGRADES: Record<UpgradeKind, { label: string }> = {
  rate: { label: 'Fire rate' },
  damage: { label: 'Damage +1' },
  companion: { label: 'Companion +1' },
  pierce: { label: 'Pierce +1' },
};
export const UPGRADE_KINDS = Object.keys(UPGRADES) as UpgradeKind[];

/** What a crate can hold: an upgrade, or (from wave 2, now and then) a sandbag wall to place. */
export type CrateKind = UpgradeKind | 'sandbag';
export const CRATES: Record<CrateKind, { label: string }> = { ...UPGRADES, sandbag: { label: 'Sandbag wall' } };
export const CRATE_KINDS = Object.keys(CRATES) as CrateKind[];
/** The chance a wave from wave 2 on also drops a sandbag crate. */
export const SANDBAG_CRATE_ODDS = 0.5;

/**
 * Sandbag walls. Placed across one of the road's three lanes at `y`, a wall stops the zombies in
 * that lane for `ms`. A boss smashes straight through it.
 */
export const LANES = [{ x0: 57, x1: 180 }, { x0: 180, x1: 360 }, { x0: 360, x1: 483 }];
export const WALL = { y: 690, ms: 6000 };
export function laneAt(x: number) {
  const i = LANES.findIndex((l) => x < l.x1);
  return i < 0 ? LANES.length - 1 : i;
}

/**
 * The supply drop after each boss: a pick of three of these.
 * - shotgun: two more bullets fan out from the soldier's rifle every volley (`SHOTGUN.angle` apart);
 * - flamer: `FLAMER.charges` flame bursts, each set off on its own when a zombie gets within
 *   `FLAMER.trigger` px of the sandbags, burning every zombie within `FLAMER.reach` px of them;
 * - medkit: the next zombie to reach the sandbags doesn't end the run: the squad patches up and
 *   throws everything near the line `MEDKIT.push` px back;
 * - sandbags: two sandbag walls.
 */
export type SupplyKind = 'shotgun' | 'flamer' | 'medkit' | 'sandbags';
export const SUPPLIES: Record<SupplyKind, { label: string; detail: string }> = {
  shotgun: { label: 'Shotgun', detail: 'Two more bullets\nfan out from the\nsoldier every volley' },
  flamer: { label: 'Flamethrower', detail: 'Two flame bursts:\nthey go off when\nzombies get close' },
  medkit: { label: 'Medkit', detail: 'The squad survives\none breach of\nthe sandbags' },
  sandbags: { label: 'Sandbags', detail: 'Two sandbag walls\nto hold a lane\nfor a few seconds' },
};
export const SUPPLY_KINDS = Object.keys(SUPPLIES) as SupplyKind[];
export const SHOTGUN = { angle: 0.2, maxPairs: 3 };
export const FLAMER = { charges: 2, trigger: 70, reach: 170, damage: (wave: number) => 20 + 8 * wave, cooldownMs: 800 };
export const MEDKIT = { push: 200, reach: 120 };

/** Three different supplies to pick from, drawn from `SUPPLY_KINDS`. */
export function supplyPick(rand: () => number = Math.random): SupplyKind[] {
  const pool = [...SUPPLY_KINDS];
  pool.splice(Math.floor(rand() * pool.length), 1);
  return pool;
}

/** What each starting crate costs in scrap, bought on the game over screen for the next run. */
export const KIT_COSTS: Record<UpgradeKind, number> = { rate: 40, damage: 60, companion: 80, pierce: 100 };
/** Pickups drift down slower than the horde, so there is time to shoot them open. */
export const PICKUP = { speed: 40, halfSize: 22 };

/**
 * Fuel drums roll down the road slower still, so the horde walks past and through them. A single
 * hit blows one up: every zombie within `blastRadius` of it takes `blastDamage(wave)`.
 */
export const DRUM = { speed: 30, halfSize: 14, blastRadius: 88, hp: 1 };
export const blastDamage = (wave: number) => 6 + 3 * wave;

/**
 * Kills that come within `gapMs` of the last one build a streak. A streak of `kills` sets off a
 * frenzy: for `ms` the squad fires `rate` times as fast. The streak starts over once it ends.
 */
export const FRENZY = { gapMs: 1500, kills: 12, ms: 5000, rate: 2 };

export interface Stats {
  /** Hit points a bullet takes off. */
  damage: number;
  /** Time between volleys, in ms. */
  fireInterval: number;
  /** Soldiers at the hero's side, each firing a bullet of their own every volley. */
  companions: number;
  /** Enemies a bullet passes through before it stops. */
  pierce: number;
}

export const BASE_STATS: Stats = { damage: 1, fireInterval: 340, companions: 0, pierce: 0 };
/** The fastest the hero can fire, in ms between volleys. */
export const MIN_FIRE_INTERVAL = 90;

export function applyUpgrade(stats: Stats, kind: UpgradeKind): Stats {
  switch (kind) {
    case 'rate':
      return { ...stats, fireInterval: Math.max(MIN_FIRE_INTERVAL, Math.round(stats.fireInterval * 0.8)) };
    case 'damage':
      return { ...stats, damage: stats.damage + 1 };
    case 'companion':
      return { ...stats, companions: Math.min(MAX_COMPANIONS, stats.companions + 1) };
    case 'pierce':
      return { ...stats, pierce: stats.pierce + 1 };
  }
}

/** Something that comes in during a wave: `at` ms after the wave starts, `x` across the screen. */
export type Spawn =
  | { at: number; x: number; type: 'enemy'; kind: EnemyKind; hp: number }
  | { at: number; x: number; type: 'pickup'; upgrade: CrateKind; hp: number }
  | { at: number; x: number; type: 'drum'; hp: number };

/** Every fifth wave ends with a boss. */
export const isBossWave = (wave: number) => wave % 5 === 0;

/** How many enemies a wave sends, not counting its boss. */
export const waveSize = (wave: number) => 12 + 6 * (wave - 1);

/**
 * Every zombie that must fall to clear the wave, its boss and crawler swarms included: the progress
 * strip's total. A boss's call adds its pack to it during the wave.
 */
export const waveTotal = (wave: number) => waveSize(wave) + (isBossWave(wave) ? 1 : 0) + swarmCount(wave) * SWARM.size;

/** How much tougher a wave's zombies are than wave 1's (scaled by the hub's difficulty). */
export const toughness = (wave: number) => (1 + 0.3 * (wave - 1)) * byDifficulty(0.75, 1, 1.3);

/** How many fuel drums roll down in a wave. */
export const drumCount = (wave: number) => 1 + Math.floor(wave / 4);

/**
 * Plans a wave: who comes in, when and where. Waves grow in size and toughness (scaled by the hub's difficulty), bring runners from
 * wave 2, brutes from wave 3, spitters and crawler swarms from wave 4 and riot zombies from wave 6,
 * and carry a pickup or more and a fuel drum or more in among the enemies. Draws for things added
 * later come last, so earlier waves keep the enemies, crates and drums they had.
 */
export function planWave(wave: number, rand: () => number = Math.random): Spawn[] {
  const tough = toughness(wave);
  const gap = Math.max(180, 550 - 35 * (wave - 1));
  const x = () => Math.round(SPAWN_MARGIN + rand() * (VIEW.w - 2 * SPAWN_MARGIN));
  const spawns: Spawn[] = [];
  const size = waveSize(wave);
  for (let i = 0; i < size; i++) {
    const roll = rand();
    const kind: EnemyKind =
      wave >= 3 && roll < 0.15 ? 'brute'
        : wave >= 2 && roll < 0.4 ? 'runner'
          : wave >= 4 && roll < 0.5 ? 'spitter'
            : wave >= 6 && roll < 0.6 ? 'riot'
              : 'grunt';
    spawns.push({ at: i * gap, x: x(), type: 'enemy', kind, hp: Math.round(ENEMIES[kind].hp * tough) });
  }
  if (isBossWave(wave)) {
    spawns.push({ at: size * gap + 1500, x: VIEW.w / 2, type: 'enemy', kind: 'boss', hp: Math.round(ENEMIES.boss.hp * tough) });
  }
  // Pickups come in among the enemies, the first a few seconds in, in the middle part of the screen.
  const pickups = 1 + Math.floor(wave / 3);
  for (let i = 0; i < pickups; i++) {
    const upgrade = UPGRADE_KINDS[Math.floor(rand() * UPGRADE_KINDS.length)];
    const at = 2500 + Math.round((i * size * gap) / pickups);
    spawns.push({ at, x: Math.round(VIEW.w * (0.25 + rand() * 0.5)), type: 'pickup', upgrade, hp: 10 + 6 * wave });
  }
  // Fuel drums come in early and spread over the wave, so the zombies behind them catch up and walk
  // through their blast rings. Their draws come last, so a wave's enemies and crates are the same
  // as without them.
  const drums = drumCount(wave);
  for (let i = 0; i < drums; i++) {
    const at = 2000 + Math.round((i * size * gap) / drums);
    spawns.push({ at, x: Math.round(VIEW.w * (0.3 + rand() * 0.4)), type: 'drum', hp: DRUM.hp });
  }
  // Crawler swarms: a tight bunch that comes in all at once, spread over the wave.
  const swarms = swarmCount(wave);
  for (let i = 0; i < swarms; i++) {
    const at = Math.round(((i + 0.5) * size * gap) / swarms), cx = Math.round(VIEW.w * (0.25 + rand() * 0.5));
    for (let k = 0; k < SWARM.size; k++) {
      const dx = ((k % 3) - 1) * 22 + (k >= 3 ? 11 : 0);
      spawns.push({ at: at + (k >= 3 ? 250 : 0), x: cx + dx, type: 'enemy', kind: 'crawler', hp: Math.round(ENEMIES.crawler.hp * tough) });
    }
  }
  // From wave 2, now and then a crate holds a sandbag wall.
  if (wave >= 2 && rand() < SANDBAG_CRATE_ODDS) {
    spawns.push({ at: 4000 + Math.round(rand() * size * gap * 0.5), x: Math.round(VIEW.w * (0.25 + rand() * 0.5)), type: 'pickup', upgrade: 'sandbag', hp: 8 + 4 * wave });
  }
  return spawns.sort((a, b) => a.at - b.at);
}
