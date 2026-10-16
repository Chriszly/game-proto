import type { Ability, Faction, Role, UnitId } from './factions';
import { RESEARCH_LEVELS, RESEARCH_MS, RESEARCH_STEP, TRACK_DEFS, type Track } from './research';
import type { DerelictKind } from './map';
import {
  CLAIM_MS, DERELICT_DEFS, EXPANSION_GAP, REPAIR_RANGE, REPAIR_RATE, VETERAN_NAMES, VETERAN_RANKS, VETERAN_STEP, buildingStats, expansionStats,
  researchCost, unitStats, type Side,
} from './world';

/** A sentence about what an ability does, with its numbers. */
export function abilityText(a: Ability): string {
  switch (a.kind) {
    case 'cloak':
      return `Hidden from enemies until it fires, then visible for ${a.revealMs / 1000} s.`;
    case 'decoy':
      return `Drops a decoy every ${a.everyMs / 1000} s that draws fire for ${a.lifeMs / 1000} s and never acts.`;
    case 'hack':
      return `Its hits disable a turret for ${a.disableMs / 1000} s; ${a.takeover} hits in a row take it over.`;
    case 'shield':
      return `Friends within ${a.range} px take only ${Math.round(a.share * 100)}% of each shot.`;
    case 'brood':
      return `Spawns a scout every ${a.everyMs / 1000} s, up to ${a.cap} scouts.`;
    case 'splash':
      return `Shells splash enemies within ${a.radius} px of the target for ${Math.round(a.share * 100)}% damage.`;
    case 'salvage':
      return `Pays ${a.pay} crystal for each enemy unit destroyed within ${a.range} px.`;
    case 'mines':
      return `Lays a hidden mine every ${a.everyMs / 1000} s, up to ${a.cap}; each blasts enemy ships for ${a.damage}.`;
  }
}

/** The lines a unit's tooltip shows under its name: cost, speed, weapon, ability. */
export function unitLines(side: Side, type: UnitId): string[] {
  const s = unitStats(side, type);
  const def = side.def.units[type];
  const lines = [`${s.cost} crystal · hp ${s.hp} · speed ${Math.round(s.speed)}`];
  if (type === 'harvester') lines.push(`Mines crystal and carries ${side.def.tune.carry} a trip.`);
  if (s.weapon) lines.push(`Damage ${s.weapon.damage} · range ${s.weapon.range} · reload ${s.weapon.cooldownMs / 1000} s`);
  if (def.ability) lines.push(abilityText(def.ability));
  return lines;
}

/** The lines a building's tooltip shows under its name. */
export function buildingLines(side: Side, role: Role): string[] {
  const s = buildingStats(side, role);
  const def = side.def.buildings[role];
  const lines: string[] = [];
  if (role === 'hub') lines.push(`Trains harvesters. If it falls, the whole faction is out.`);
  else lines.push(`${s.cost} crystal · hp ${s.hp} · builds in ${def.buildMs / 1000} s`);
  if (role === 'depot') lines.push('Harvesters drop their crystal here.');
  if (role === 'barracks') lines.push('Trains combat units, up to five queued at a time.');
  if (s.weapon) lines.push(`Damage ${s.weapon.damage} · range ${s.weapon.range} · reload ${s.weapon.cooldownMs / 1000} s`);
  if (def.ability) lines.push(abilityText(def.ability));
  return lines;
}

/** The lines an expansion's tooltip shows under its name. */
export function expansionLines(side: Side): string[] {
  const s = expansionStats(side);
  return [
    `${s.cost} crystal · hp ${s.hp} · builds in ${s.buildMs / 1000} s`,
    `A second hub beside a far crystal field, at least ${EXPANSION_GAP} px from your hubs.`,
    'Trains harvesters that work its field, takes crystal and lets you build around it.',
  ];
}

/** The lines the Fall back button's tooltip shows under its name. */
export function fallBackLines(): string[] {
  return [
    'Sends the selected ships home to the nearest hub, outpost or Depot.',
    `Ships within ${REPAIR_RANGE} px of one repair ${Math.round(REPAIR_RATE * 100)}% of their hull a second. Also F.`,
    `Ranks: ${VETERAN_RANKS.map((k, i) => `${VETERAN_NAMES[i]} at ${k} kills`).join(', ')}, each +${Math.round(VETERAN_STEP * 100)}% damage and hull.`,
  ];
}

/** The lines a derelict station's label shows: what it gives and how to claim it. */
export function derelictLines(kind: DerelictKind): string[] {
  return [DERELICT_DEFS[kind].text, `Hold its ring alone with warships for ${CLAIM_MS / 1000} s to claim it.`];
}

/** The lines a research button's tooltip shows under its name. */
export function researchLines(side: Side, track: Track): string[] {
  const level = side.research.levels[track];
  const step = `+${Math.round(RESEARCH_STEP * 100)}% ${TRACK_DEFS[track].effect} for every ship`;
  if (level >= RESEARCH_LEVELS) return [`Level ${level} of ${RESEARCH_LEVELS}: fully researched.`];
  return [
    `Level ${level + 1} of ${RESEARCH_LEVELS} · ${researchCost(side, track)} crystal · ${RESEARCH_MS / 1000} s at the hub`,
    `${step}, ships already flying included. One research at a time.`,
  ];
}

/** A faction's card on the picker: its buildings and ships by name, and its signature ability. */
export function factionLines(def: Faction): string[] {
  const ships = (['scout', 'gunship', 'heavy'] as const).map((t) => def.units[t].name).join(', ');
  const ability = (['scout', 'gunship', 'heavy'] as const)
    .map((t) => def.units[t].ability)
    .find((a): a is Ability => !!a) ?? def.buildings.barracks.ability;
  const lines = [`Barracks: ${def.buildings.barracks.name}`, `Ships: ${ships}`];
  if (ability) lines.push(abilityText(ability));
  return lines;
}
