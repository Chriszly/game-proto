/**
 * The three soldiers a run can start with, their weapons and signature moves. Names and texts are
 * keys of `i18n/en.ts`, shown with `t`.
 */
import type { TextKey } from '../i18n';

export type HeroId = 'rook' | 'tr9' | 'bram';
export const HERO_IDS: readonly HeroId[] = ['rook', 'tr9', 'bram'];

/** How a hero's primary weapon picks where it fires. */
export type AimMode = 'nearest-two' | 'nearest' | 'facing';

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
  weapon: TextKey;
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
}

export const HEROES: Record<HeroId, HeroDef> = {
  rook: {
    id: 'rook',
    name: 'rookName',
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
  },
  tr9: {
    id: 'tr9',
    name: 'tr9Name',
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
    name: 'bramName',
    weapon: 'bramWeapon',
    schemes: [{ name: 'Sand', body: '#a8946a', accent: '#ff9ad5', bolt: '#ff9ad5' }],
    maxHp: 115,
    speed: 145,
    aim: 'facing',
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
  },
};

/** The colour scheme a hero is drawn in: the first of its schemes. */
export function schemeOf(id: HeroId): HeroScheme {
  return HEROES[id].schemes[0];
}
