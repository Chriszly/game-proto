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

export type EnemyKind = 'grunt' | 'runner' | 'brute' | 'boss';

/**
 * Hit points at wave 1, walking speed and how fast they veer towards the hero (pixels per second),
 * and the size of their hit circle.
 */
export const ENEMIES: Record<EnemyKind, { hp: number; speed: number; steer: number; radius: number }> = {
  grunt: { hp: 3, speed: 46, steer: 22, radius: 13 },
  runner: { hp: 1, speed: 80, steer: 36, radius: 10 },
  brute: { hp: 9, speed: 26, steer: 14, radius: 20 },
  boss: { hp: 200, speed: 18, steer: 10, radius: 38 },
};

export type UpgradeKind = 'rate' | 'damage' | 'companion' | 'pierce';

/** What each pickup does, with the name shown on its crate. */
export const UPGRADES: Record<UpgradeKind, { label: string }> = {
  rate: { label: 'Fire rate' },
  damage: { label: 'Damage +1' },
  companion: { label: 'Companion +1' },
  pierce: { label: 'Pierce +1' },
};
export const UPGRADE_KINDS = Object.keys(UPGRADES) as UpgradeKind[];
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
  | { at: number; x: number; type: 'pickup'; upgrade: UpgradeKind; hp: number }
  | { at: number; x: number; type: 'drum'; hp: number };

/** Every fifth wave ends with a boss. */
export const isBossWave = (wave: number) => wave % 5 === 0;

/** How many enemies a wave sends, not counting its boss. */
export const waveSize = (wave: number) => 12 + 6 * (wave - 1);

/** Every zombie that must fall to clear the wave, its boss included: the progress strip's total. */
export const waveTotal = (wave: number) => waveSize(wave) + (isBossWave(wave) ? 1 : 0);

/** How many fuel drums roll down in a wave. */
export const drumCount = (wave: number) => 1 + Math.floor(wave / 4);

/**
 * Plans a wave: who comes in, when and where. Waves grow in size and toughness (scaled by the hub's difficulty), bring runners from
 * wave 2 and brutes from wave 3, and carry a pickup or more and a fuel drum or more in among the enemies.
 */
export function planWave(wave: number, rand: () => number = Math.random): Spawn[] {
  const toughness = (1 + 0.3 * (wave - 1)) * byDifficulty(0.75, 1, 1.3);
  const gap = Math.max(180, 550 - 35 * (wave - 1));
  const x = () => Math.round(SPAWN_MARGIN + rand() * (VIEW.w - 2 * SPAWN_MARGIN));
  const spawns: Spawn[] = [];
  const size = waveSize(wave);
  for (let i = 0; i < size; i++) {
    const roll = rand();
    const kind: EnemyKind = wave >= 3 && roll < 0.15 ? 'brute' : wave >= 2 && roll < 0.4 ? 'runner' : 'grunt';
    spawns.push({ at: i * gap, x: x(), type: 'enemy', kind, hp: Math.round(ENEMIES[kind].hp * toughness) });
  }
  if (isBossWave(wave)) {
    spawns.push({ at: size * gap + 1500, x: VIEW.w / 2, type: 'enemy', kind: 'boss', hp: Math.round(ENEMIES.boss.hp * toughness) });
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
  return spawns.sort((a, b) => a.at - b.at);
}
