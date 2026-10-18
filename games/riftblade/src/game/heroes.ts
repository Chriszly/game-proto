/**
 * The heroes a run can start with: three blaster soldiers, seven blade knights of the Current or
 * the Hollow and two more blaster heroes (Elara Voss and Triad-77). Only Legionary TR-9 is open
 * from the start; every other hero is unlocked by a deed. Their weapons, signature moves,
 * pools and colours. Names and texts are keys of `i18n/en.ts`, shown with `t`.
 */
import type { TextKey } from '../i18n';

export type HeroId = 'rook' | 'tr9' | 'bram' | 'kael' | 'vharn' | 'oom' | 'corvin' | 'veyl' | 'kresh' | 'joren' | 'elara' | 'triad';
/** The order of the hero select screen. */
export const HERO_IDS: readonly HeroId[] = [
  'rook', 'tr9', 'bram', 'kael', 'vharn', 'oom', 'corvin', 'veyl', 'kresh', 'joren', 'elara', 'triad',
];

/**
 * How a hero's primary attack works. Every gun aims at the nearest foe: Rook's two pistols take
 * turns at the two nearest (`nearest-two`), the others fire at the nearest (`nearest`; Elara's in
 * `squad.ts`), and Triad-77's bots each at the foe nearest to it (`triad`, see `squad.ts`); each
 * knight has an attack of their own (see `blades.ts`).
 */
export type AimMode =
  | 'nearest-two' | 'nearest' | 'triad'
  | 'slash' | 'throw' | 'ripple' | 'spin' | 'chain' | 'orbit' | 'flurry';

/** A weapon class and a side, each with a pool of skills its heroes draw cards from. */
export type PoolId = 'blaster' | 'blade' | 'current' | 'hollow';

/**
 * A named colour scheme: armour and helmet (`body`), lenses, rim glow and markings (`accent`), a
 * darker stripe for the markings (`mark`, else a shade of `accent`) and the colour of the hero's
 * bolts (`bolt`). A hero can list several; only the first is used for now.
 */
export interface HeroScheme {
  name: string;
  body: string;
  accent: string;
  mark?: string;
  bolt: string;
}

export interface HeroDef {
  id: HeroId;
  name: TextKey;
  /** The name without the title, for the Fight button ("Rook", "Joren"). */
  short: TextKey;
  weapon: TextKey;
  /** The weapon class and, for knights, the side: the pools their cards come from. */
  pools: readonly PoolId[];
  /** Pool skills outside those pools the hero can still draw (Joren's Lightning Arc). */
  extra?: readonly string[];
  /** Body radius, px (13 when not given), and damage taken off before armour gear. */
  r?: number;
  armour?: number;
  /** The hero's colour schemes; the first is the one in use (see `schemeOf`). */
  schemes: readonly HeroScheme[];
  maxHp: number;
  /** Walking speed in px/s. */
  speed: number;
  aim: AimMode;
  /** Time between primary shots (or volleys), ms. */
  fireMs: number;
  /** Bolts per volley and the spread between them (radians), plus random inaccuracy. */
  pellets: number;
  spread: number;
  jitter: number;
  damage: number;
  /** Bolt speed (px/s) and how far it flies (px). */
  boltSpeed: number;
  range: number;
  signature: { name: TextKey; text: TextKey; cooldownMs: number };
  /** The three upgrade paths only this hero can take (ids in `UPGRADES`). */
  paths: readonly string[];
  /** One line for the hero select card. */
  blurb: TextKey;
  /** The kind line of a card of this hero's paths ("ROOK PATH"). */
  pathKind: TextKey;
  /** Locked until a deed is done (see `checkDeeds` in blades.ts and `save.ts`); the deeds are never shown in the game. */
  locked?: boolean;
}

export const HEROES: Record<HeroId, HeroDef> = {
  rook: {
    id: 'rook',
    pools: ['blaster'],
    name: 'rookName',
    short: 'rookShort',
    weapon: 'rookWeapon',
    schemes: [{ name: 'Slate', body: '#6b7686', accent: '#c08a4a', mark: '#8f5f2c', bolt: '#c08a4a' }],
    maxHp: 100,
    speed: 150,
    aim: 'nearest-two',
    fireMs: 340,
    pellets: 1,
    spread: 0,
    jitter: 0.03,
    damage: 9,
    boltSpeed: 560,
    range: 380,
    signature: { name: 'rookSignature', text: 'rookSignatureText', cooldownMs: 12_000 },
    paths: ['gunslinger', 'commander', 'demolitions'],
    blurb: 'rookBlurb',
    pathKind: 'rookPathKind',
    locked: true,
  },
  tr9: {
    id: 'tr9',
    pools: ['blaster'],
    name: 'tr9Name',
    short: 'tr9Short',
    weapon: 'tr9Weapon',
    schemes: [{ name: 'Charcoal', body: '#3a3f48', accent: '#ff7a2e', bolt: '#ff7a2e' }],
    maxHp: 150,
    speed: 128,
    aim: 'nearest',
    fireMs: 520,
    pellets: 3,
    spread: 0.3,
    jitter: 0.12,
    damage: 8,
    boltSpeed: 520,
    range: 300,
    signature: { name: 'tr9Signature', text: 'tr9SignatureText', cooldownMs: 13_000 },
    paths: ['suppressor', 'riot-shield', 'drop-doctrine'],
    blurb: 'tr9Blurb',
    pathKind: 'tr9PathKind',
  },
  bram: {
    id: 'bram',
    pools: ['blaster'],
    name: 'bramName',
    short: 'bramShort',
    weapon: 'bramWeapon',
    schemes: [{ name: 'Sand', body: '#a8946a', accent: '#ff9ad5', bolt: '#ff9ad5' }],
    maxHp: 115,
    speed: 145,
    aim: 'nearest',
    fireMs: 260,
    pellets: 1,
    spread: 0,
    jitter: 0.02,
    damage: 11,
    boltSpeed: 640,
    range: 420,
    signature: { name: 'bramSignature', text: 'bramSignatureText', cooldownMs: 9_000 },
    paths: ['marksman', 'jump-trooper', 'brothers'],
    blurb: 'bramBlurb',
    pathKind: 'bramPathKind',
    locked: true,
  },
  kael: {
    id: 'kael',
    name: 'kaelName',
    short: 'kaelShort',
    weapon: 'kaelWeapon',
    pools: ['blade', 'current'],
    schemes: [
      { name: 'Prodigy', body: '#1d2f6b', accent: '#ff4fd8', mark: '#2b2018', bolt: '#ff4fd8' },
      // On The Fall path he takes his master Lord Vharn's colours.
      { name: 'Fallen', body: '#33363f', accent: '#2ee6d0', mark: '#0f3a3a', bolt: '#2ee6d0' },
    ],
    maxHp: 85,
    speed: 168,
    aim: 'slash',
    fireMs: 430,
    pellets: 1,
    spread: 0,
    jitter: 0,
    damage: 12,
    boltSpeed: 520,
    range: 72,
    signature: { name: 'kaelSignature', text: 'kaelSignatureText', cooldownMs: 10_000 },
    paths: ['prodigy', 'ace-pilot', 'the-fall'],
    blurb: 'kaelBlurb',
    pathKind: 'kaelPathKind',
    locked: true,
  },
  vharn: {
    id: 'vharn',
    name: 'vharnName',
    short: 'vharnShort',
    weapon: 'vharnWeapon',
    pools: ['blade', 'hollow'],
    schemes: [{ name: 'Iron', body: '#33363f', accent: '#2ee6d0', mark: '#0f3a3a', bolt: '#2ee6d0' }],
    maxHp: 210,
    speed: 104,
    r: 15,
    armour: 0.15,
    aim: 'throw',
    fireMs: 820,
    pellets: 1,
    spread: 0,
    jitter: 0,
    damage: 22,
    boltSpeed: 430,
    range: 270,
    signature: { name: 'vharnSignature', text: 'vharnSignatureText', cooldownMs: 12_000 },
    paths: ['dread', 'iron-grip', 'life-support'],
    blurb: 'vharnBlurb',
    pathKind: 'vharnPathKind',
    locked: true,
  },
  oom: {
    id: 'oom',
    name: 'oomName',
    short: 'oomShort',
    weapon: 'oomWeapon',
    pools: ['blade', 'current'],
    schemes: [{ name: 'Sage', body: '#a3542e', accent: '#ffd23f', mark: '#8fa7c4', bolt: '#ffd23f' }],
    maxHp: 70,
    speed: 178,
    r: 8,
    aim: 'ripple',
    fireMs: 1050,
    pellets: 1,
    spread: 0,
    jitter: 0,
    damage: 11,
    boltSpeed: 480,
    range: 95,
    signature: { name: 'oomSignature', text: 'oomSignatureText', cooldownMs: 8_000 },
    paths: ['stillness', 'whirlwind', 'old-teacher'],
    blurb: 'oomBlurb',
    pathKind: 'oomPathKind',
    locked: true,
  },
  corvin: {
    id: 'corvin',
    name: 'corvinName',
    short: 'corvinShort',
    weapon: 'corvinWeapon',
    pools: ['blade', 'current'],
    schemes: [{ name: 'Elder', body: '#a98763', accent: '#5fd0ff', mark: '#6e5233', bolt: '#5fd0ff' }],
    maxHp: 125,
    speed: 140,
    aim: 'spin',
    fireMs: 560,
    pellets: 1,
    spread: 0,
    jitter: 0,
    damage: 12,
    boltSpeed: 520,
    range: 84,
    signature: { name: 'corvinSignature', text: 'corvinSignatureText', cooldownMs: 11_000 },
    paths: ['bulwark', 'persuasion', 'vantage'],
    blurb: 'corvinBlurb',
    pathKind: 'corvinPathKind',
    locked: true,
  },
  veyl: {
    id: 'veyl',
    name: 'veylName',
    short: 'veylShort',
    weapon: 'veylWeapon',
    pools: ['blade', 'hollow'],
    schemes: [{ name: 'Regent', body: '#3a1a4a', accent: '#b6ff3c', mark: '#d9d2c4', bolt: '#b6ff3c' }],
    maxHp: 75,
    speed: 116,
    aim: 'chain',
    fireMs: 700,
    pellets: 1,
    spread: 0,
    jitter: 0,
    damage: 12,
    boltSpeed: 480,
    range: 230,
    signature: { name: 'veylSignature', text: 'veylSignatureText', cooldownMs: 12_000 },
    paths: ['storm', 'puppet-master', 'dark-bargain'],
    blurb: 'veylBlurb',
    pathKind: 'veylPathKind',
    locked: true,
  },
  kresh: {
    id: 'kresh',
    name: 'kreshName',
    short: 'kreshShort',
    weapon: 'kreshWeapon',
    pools: ['blade', 'hollow'],
    schemes: [{ name: 'Hunter', body: '#2a2a30', accent: '#9b5cff', mark: '#8a8f99', bolt: '#9b5cff' }],
    maxHp: 115,
    speed: 160,
    aim: 'orbit',
    fireMs: 300,
    pellets: 1,
    spread: 0,
    jitter: 0,
    damage: 10,
    boltSpeed: 460,
    range: 56,
    signature: { name: 'kreshSignature', text: 'kreshSignatureText', cooldownMs: 9_000 },
    paths: ['dervish', 'stalker', 'rebuilt'],
    blurb: 'kreshBlurb',
    pathKind: 'kreshPathKind',
    locked: true,
  },
  joren: {
    id: 'joren',
    name: 'jorenName',
    short: 'jorenShort',
    weapon: 'jorenWeapon',
    pools: ['blade', 'current'],
    extra: ['lightning-arc'],
    schemes: [{ name: 'Master', body: '#c9ccd6', accent: '#3346ff', mark: '#6b4630', bolt: '#3346ff' }],
    maxHp: 115,
    speed: 158,
    aim: 'flurry',
    fireMs: 300,
    pellets: 1,
    spread: 0,
    jitter: 0,
    damage: 8,
    boltSpeed: 520,
    range: 58,
    signature: { name: 'jorenSignature', text: 'jorenSignatureText', cooldownMs: 12_000 },
    paths: ['duelist', 'breaker', 'council-seat'],
    blurb: 'jorenBlurb',
    pathKind: 'jorenPathKind',
    locked: true,
  },
  elara: {
    id: 'elara',
    name: 'elaraName',
    short: 'elaraShort',
    weapon: 'elaraWeapon',
    pools: ['blaster'],
    schemes: [{ name: 'Rebel', body: '#5c4a3a', accent: '#ff3b3b', mark: '#e6dac2', bolt: '#ff5a4a' }],
    maxHp: 100,
    speed: 146,
    aim: 'nearest',
    fireMs: 400,
    pellets: 1,
    spread: 0,
    jitter: 0,
    damage: 10,
    boltSpeed: 680,
    range: 360,
    signature: { name: 'elaraSignature', text: 'elaraSignatureText', cooldownMs: 16_000 },
    paths: ['sharpshooter', 'rebel-network', 'diplomat'],
    blurb: 'elaraBlurb',
    pathKind: 'elaraPathKind',
    locked: true,
  },
  triad: {
    id: 'triad',
    name: 'triadName',
    short: 'triadShort',
    weapon: 'triadWeapon',
    pools: ['blaster'],
    // The whole unit's body, so foes bump into the formation rather than its middle.
    r: 22,
    schemes: [{ name: 'Bone', body: '#e4e7ee', accent: '#f4f6fb', mark: '#8a93a6', bolt: '#eef2ff' }],
    // Three bots of 40 health each.
    maxHp: 120,
    speed: 140,
    aim: 'triad',
    fireMs: 460,
    pellets: 1,
    spread: 0,
    jitter: 0.05,
    damage: 7,
    boltSpeed: 560,
    range: 330,
    signature: { name: 'triadSignature', text: 'triadSignatureText', cooldownMs: 2_500 },
    paths: ['firing-line', 'factory', 'uplink'],
    blurb: 'triadBlurb',
    pathKind: 'triadPathKind',
    locked: true,
  },
};

/** Whether a hero fights with a blade (a knight) rather than a blaster. */
export const isKnight = (id: HeroId) => HEROES[id].pools.includes('blade');

/** The colour scheme a hero is drawn in: the first of its schemes, or `variant` when it has one. */
export function schemeOf(id: HeroId, variant = 0): HeroScheme {
  return HEROES[id].schemes[variant] ?? HEROES[id].schemes[0];
}
