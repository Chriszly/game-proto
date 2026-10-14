import type { Ability, Faction, Role, UnitId } from './factions';
import { buildingStats, unitStats, type Side } from './world';

/** A sentence about what an ability does, with its numbers. */
export function abilityText(a: Ability): string {
  switch (a.kind) {
    case 'cloak':
      return `Hidden from enemies until it fires, then visible for ${a.revealMs / 1000} s.`;
    case 'decoy':
      return `Drops a decoy every ${a.everyMs / 1000} s that draws fire for ${a.lifeMs / 1000} s and never acts.`;
    case 'hack':
      return `Its hits disable a turret for ${a.disableMs / 1000} s.`;
    case 'shield':
      return `Friends within ${a.range} px take only ${Math.round(a.share * 100)}% of each shot.`;
    case 'brood':
      return `Spawns a scout every ${a.everyMs / 1000} s, up to ${a.cap} scouts.`;
    case 'splash':
      return `Shells splash enemies within ${a.radius} px of the target for ${Math.round(a.share * 100)}% damage.`;
    case 'salvage':
      return `Pays ${a.pay} crystal for each enemy unit destroyed within ${a.range} px.`;
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
