/**
 * The Rift Crusade: four planets in a row, each with its own faction, wave curve and boss, and the
 * numbers of the star map between them (credits, the trader, the elite arena and the events). Names
 * and texts are keys of `i18n/en.ts`, shown with `t`.
 */
import { t, type TextKey } from '../i18n';

export type BossId = 'grinder' | 'bogmother' | 'siege' | 'champion';

/** The swarm kinds of each faction, besides the bosses. */
export type FoeKind = 'clanker' | 'rollerbomb' | 'mirerat' | 'toad' | 'linetrooper' | 'walker' | 'acolyte' | 'knight';

export interface PlanetDef {
  id: 'dune' | 'swamp' | 'ice' | 'lava';
  name: TextKey;
  /** Who lives there, for the map and the end screen. */
  faction: TextKey;
  /** The HUD's kill count ("{n} droids"), and the pop when one of its elites comes. */
  foes: TextKey;
  elite: TextKey;
  /** Droid health, spawn rate and contact damage against the Dune world. */
  hp: number;
  spawn: number;
  dmg: number;
  /** The kind that fills the ring waves, and the kinds an elite can be. */
  swarm: FoeKind;
  elites: readonly FoeKind[];
  boss: BossId;
  /** Ground colours: the field, its grid and the scenery lines. */
  ground: { field: string; grid: string; deco: string };
}

export const PLANETS: readonly PlanetDef[] = [
  {
    id: 'dune', name: 'duneName', faction: 'duneFaction', foes: 'duneFoes', elite: 'duneElite', hp: 1, spawn: 1, dmg: 1,
    swarm: 'clanker', elites: ['clanker', 'rollerbomb'], boss: 'grinder',
    ground: { field: '#070b16', grid: '#508cff', deco: '#ffb347' },
  },
  {
    id: 'swamp', name: 'swampName', faction: 'swampFaction', foes: 'swampFoes', elite: 'swampElite', hp: 4, spawn: 1.25, dmg: 1.5,
    swarm: 'mirerat', elites: ['toad', 'mirerat'], boss: 'bogmother',
    ground: { field: '#06130f', grid: '#3ccf8e', deco: '#5fd6a0' },
  },
  {
    id: 'ice', name: 'iceName', faction: 'iceFaction', foes: 'iceFoes', elite: 'iceElite', hp: 7, spawn: 1.35, dmg: 1.7,
    swarm: 'linetrooper', elites: ['walker', 'linetrooper'], boss: 'siege',
    ground: { field: '#0a1424', grid: '#9fd4ff', deco: '#d6efff' },
  },
  {
    id: 'lava', name: 'lavaName', faction: 'lavaFaction', foes: 'lavaFoes', elite: 'lavaElite', hp: 14, spawn: 1.5, dmg: 2.1,
    swarm: 'acolyte', elites: ['knight', 'acolyte'], boss: 'champion',
    ground: { field: '#160807', grid: '#ff6a3c', deco: '#ff8a3c' },
  },
];

export const LAST_PLANET = PLANETS.length - 1;

/** "2/4 Swamp world". */
export const planetLabel = (i: number) => t('planetLabel', { n: i + 1, of: PLANETS.length, planet: t(PLANETS[i].name) });

export interface BossDef {
  /** Its name ("The Grinder Crawler"), the boss bar's label and the end screen's line when it falls last. */
  name: TextKey;
  bar: TextKey;
  beaten: TextKey;
  r: number;
  hp: number;
  speed: number;
  dmg: number;
  /** Credits it leaves. */
  credits: number;
}

export const BOSSES: Record<BossId, BossDef> = {
  grinder: { name: 'grinderName', bar: 'grinderBar', beaten: 'grinderBeaten', r: 58, hp: 2600, speed: 42, dmg: 22, credits: 30 },
  bogmother: { name: 'bogmotherName', bar: 'bogmotherBar', beaten: 'bogmotherBeaten', r: 60, hp: 17000, speed: 36, dmg: 24, credits: 30 },
  siege: { name: 'siegeName', bar: 'siegeBar', beaten: 'siegeBeaten', r: 62, hp: 15000, speed: 32, dmg: 26, credits: 30 },
  champion: { name: 'championName', bar: 'championBar', beaten: 'championBeaten', r: 30, hp: 58000, speed: 92, dmg: 26, credits: 0 },
};

/** The Bog Mother: globs, young and the bog pools she leaves. */
export const BOG = { globMs: 3600, globs: 7, spawnMs: 6500, young: 6, poolMs: 2400, poolR: 62, poolLife: 8000, slow: 0.45 };
/** The Siege Walker: shell volleys, artillery barrages with ground warnings, and stomps. */
export const SIEGE = { volleyMs: 2600, barrageMs: 5200, shells: 6, warnMs: 1200, shellR: 58, shellDmg: 15, stompR: 140, stompWarn: 700, stompDmg: 20, stompMs: 3200 };
/** The Hollow Champion: blade dashes, then rings of fire with gaps below half health. */
export const CHAMPION = { dashEvery: 3000, aimMs: 650, dashSpeed: 820, ringMs: 3800, ringSpeed: 120, ringDmg: 14, ringGaps: 4 };
/** Lava vents: one erupts near the hero every so often on the Lava world, after a warning. */
export const VENT = { minMs: 5000, maxMs: 9000, warnMs: 1300, r: 70, dmg: 14, foeDmg: 40 };

/** Credits: dropped by elites, left by bosses, and paid for each planet cleared. */
export const CREDITS = { elite: 6, clear: 12, arena: 20, arenaElite: 6 };

/** The elite arena between planets: this long, with this many elites to beat. */
export const ARENA_MS = 60_000;
export const arenaElites = (planet: number) => (planet >= 1 ? 3 : 2);

/** The trader: what a tier costs (more for one already held) and a reroll. */
export const TRADE = { base: 25, perTier: 10, reroll: 8 };

/** The kinds of node on the star map. */
export type NodeKind = 'trader' | 'elite' | 'rest' | 'event';
export const NODE_INFO: Record<NodeKind, { name: TextKey; text: TextKey; color: string }> = {
  trader: { name: 'traderNode', text: 'traderNodeText', color: '#ffd36b' },
  elite: { name: 'eliteNode', text: 'eliteNodeText', color: '#ff7a8a' },
  rest: { name: 'restNode', text: 'restNodeText', color: '#7dffa0' },
  event: { name: 'eventNode', text: 'eventNodeText', color: '#b48cff' },
};

/** Rest heals this share of max health. */
export const REST_HEAL = 0.5;

/** The ids of the events the star map can roll. */
export type EventId = 'droid' | 'cache' | 'shrine' | 'well';
