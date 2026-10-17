/**
 * Every upgrade a level-up card can offer: the heroes' own paths, the class and side pools (Blaster,
 * Blade, Current, Hollow) and the Gear deck, each with five tiers, plus the capstones (a path at
 * tier 5 and its gear piece) and the crossovers (a pool skill held with a fitting path). Names and
 * texts are keys of `i18n/en.ts`, shown with `t`.
 */
import { HEROES, type HeroId, type PoolId } from './heroes';
import type { TextKey } from '../i18n';

export type UpgradeKind = 'path' | 'pool' | 'gear';

export interface UpgradeDef {
  id: string;
  kind: UpgradeKind;
  name: TextKey;
  /** The hero whose path this is (paths only). */
  hero?: HeroId;
  /** The pool a pool skill belongs to (pool skills only). */
  pool?: PoolId;
  /** What the upgrade does, one short line. */
  blurb: TextKey;
  /** What each of the five tiers adds, in order. */
  tiers: readonly [TextKey, TextKey, TextKey, TextKey, TextKey];
}

export const MAX_TIER = 5;
/** A run holds at most this many abilities (paths and pool skills) and this many gear pieces. */
export const MAX_ABILITIES = 5;
export const MAX_GEAR = 4;

const defs: UpgradeDef[] = [
  // Captain Rook
  {
    id: 'gunslinger', kind: 'path', hero: 'rook', name: 'gunslingerName', blurb: 'gunslingerBlurb',
    tiers: ['gunslinger1', 'gunslinger2', 'gunslinger3', 'gunslinger4', 'gunslinger5'],
  },
  {
    id: 'commander', kind: 'path', hero: 'rook', name: 'commanderName', blurb: 'commanderBlurb',
    tiers: ['commander1', 'commander2', 'commander3', 'commander4', 'commander5'],
  },
  {
    id: 'demolitions', kind: 'path', hero: 'rook', name: 'demolitionsName', blurb: 'demolitionsBlurb',
    tiers: ['demolitions1', 'demolitions2', 'demolitions3', 'demolitions4', 'demolitions5'],
  },
  // Legionary TR-9
  {
    id: 'suppressor', kind: 'path', hero: 'tr9', name: 'suppressorName', blurb: 'suppressorBlurb',
    tiers: ['suppressor1', 'suppressor2', 'suppressor3', 'suppressor4', 'suppressor5'],
  },
  {
    id: 'riot-shield', kind: 'path', hero: 'tr9', name: 'riotShieldName', blurb: 'riotShieldBlurb',
    tiers: ['riotShield1', 'riotShield2', 'riotShield3', 'riotShield4', 'riotShield5'],
  },
  {
    id: 'drop-doctrine', kind: 'path', hero: 'tr9', name: 'dropDoctrineName', blurb: 'dropDoctrineBlurb',
    tiers: ['dropDoctrine1', 'dropDoctrine2', 'dropDoctrine3', 'dropDoctrine4', 'dropDoctrine5'],
  },
  // Corporal Bram-17
  {
    id: 'marksman', kind: 'path', hero: 'bram', name: 'marksmanName', blurb: 'marksmanBlurb',
    tiers: ['marksman1', 'marksman2', 'marksman3', 'marksman4', 'marksman5'],
  },
  {
    id: 'jump-trooper', kind: 'path', hero: 'bram', name: 'jumpTrooperName', blurb: 'jumpTrooperBlurb',
    tiers: ['jumpTrooper1', 'jumpTrooper2', 'jumpTrooper3', 'jumpTrooper4', 'jumpTrooper5'],
  },
  {
    id: 'brothers', kind: 'path', hero: 'bram', name: 'brothersName', blurb: 'brothersBlurb',
    tiers: ['brothers1', 'brothers2', 'brothers3', 'brothers4', 'brothers5'],
  },
  // The Blaster pool
  {
    id: 'ricochet', kind: 'pool', pool: 'blaster', name: 'ricochetName', blurb: 'ricochetBlurb',
    tiers: ['ricochet1', 'ricochet2', 'ricochet3', 'ricochet4', 'ricochet5'],
  },
  {
    id: 'overcharge', kind: 'pool', pool: 'blaster', name: 'overchargeName', blurb: 'overchargeBlurb',
    tiers: ['overcharge1', 'overcharge2', 'overcharge3', 'overcharge4', 'overcharge5'],
  },
  {
    id: 'thermal', kind: 'pool', pool: 'blaster', name: 'thermalName', blurb: 'thermalBlurb',
    tiers: ['thermal1', 'thermal2', 'thermal3', 'thermal4', 'thermal5'],
  },
  {
    id: 'stun', kind: 'pool', pool: 'blaster', name: 'stunName', blurb: 'stunBlurb',
    tiers: ['stun1', 'stun2', 'stun3', 'stun4', 'stun5'],
  },
  {
    id: 'reload', kind: 'pool', pool: 'blaster', name: 'reloadName', blurb: 'reloadBlurb',
    tiers: ['reload1', 'reload2', 'reload3', 'reload4', 'reload5'],
  },
  {
    id: 'drone', kind: 'pool', pool: 'blaster', name: 'droneName', blurb: 'droneBlurb',
    tiers: ['drone1', 'drone2', 'drone3', 'drone4', 'drone5'],
  },
  {
    id: 'scatter', kind: 'pool', pool: 'blaster', name: 'scatterName', blurb: 'scatterBlurb',
    tiers: ['scatter1', 'scatter2', 'scatter3', 'scatter4', 'scatter5'],
  },
  {
    id: 'callin', kind: 'pool', pool: 'blaster', name: 'callinName', blurb: 'callinBlurb',
    tiers: ['callin1', 'callin2', 'callin3', 'callin4', 'callin5'],
  },

  // Kael Varro
  {
    id: 'prodigy', kind: 'path', hero: 'kael', name: 'prodigyName', blurb: 'prodigyBlurb',
    tiers: ['prodigy1', 'prodigy2', 'prodigy3', 'prodigy4', 'prodigy5'],
  },
  {
    id: 'ace-pilot', kind: 'path', hero: 'kael', name: 'acePilotName', blurb: 'acePilotBlurb',
    tiers: ['acePilot1', 'acePilot2', 'acePilot3', 'acePilot4', 'acePilot5'],
  },
  {
    id: 'the-fall', kind: 'path', hero: 'kael', name: 'theFallName', blurb: 'theFallBlurb',
    tiers: ['theFall1', 'theFall2', 'theFall3', 'theFall4', 'theFall5'],
  },
  // Lord Vharn
  {
    id: 'dread', kind: 'path', hero: 'vharn', name: 'dreadName', blurb: 'dreadBlurb',
    tiers: ['dread1', 'dread2', 'dread3', 'dread4', 'dread5'],
  },
  {
    id: 'iron-grip', kind: 'path', hero: 'vharn', name: 'ironGripName', blurb: 'ironGripBlurb',
    tiers: ['ironGrip1', 'ironGrip2', 'ironGrip3', 'ironGrip4', 'ironGrip5'],
  },
  {
    id: 'life-support', kind: 'path', hero: 'vharn', name: 'lifeSupportName', blurb: 'lifeSupportBlurb',
    tiers: ['lifeSupport1', 'lifeSupport2', 'lifeSupport3', 'lifeSupport4', 'lifeSupport5'],
  },
  // Master Oom
  {
    id: 'stillness', kind: 'path', hero: 'oom', name: 'stillnessName', blurb: 'stillnessBlurb',
    tiers: ['stillness1', 'stillness2', 'stillness3', 'stillness4', 'stillness5'],
  },
  {
    id: 'whirlwind', kind: 'path', hero: 'oom', name: 'whirlwindName', blurb: 'whirlwindBlurb',
    tiers: ['whirlwind1', 'whirlwind2', 'whirlwind3', 'whirlwind4', 'whirlwind5'],
  },
  {
    id: 'old-teacher', kind: 'path', hero: 'oom', name: 'oldTeacherName', blurb: 'oldTeacherBlurb',
    tiers: ['oldTeacher1', 'oldTeacher2', 'oldTeacher3', 'oldTeacher4', 'oldTeacher5'],
  },
  // Elder Corvin Hale
  {
    id: 'bulwark', kind: 'path', hero: 'corvin', name: 'bulwarkName', blurb: 'bulwarkBlurb',
    tiers: ['bulwark1', 'bulwark2', 'bulwark3', 'bulwark4', 'bulwark5'],
  },
  {
    id: 'persuasion', kind: 'path', hero: 'corvin', name: 'persuasionName', blurb: 'persuasionBlurb',
    tiers: ['persuasion1', 'persuasion2', 'persuasion3', 'persuasion4', 'persuasion5'],
  },
  {
    id: 'vantage', kind: 'path', hero: 'corvin', name: 'vantageName', blurb: 'vantageBlurb',
    tiers: ['vantage1', 'vantage2', 'vantage3', 'vantage4', 'vantage5'],
  },
  // Regent Veyl
  {
    id: 'storm', kind: 'path', hero: 'veyl', name: 'stormName', blurb: 'stormBlurb',
    tiers: ['storm1', 'storm2', 'storm3', 'storm4', 'storm5'],
  },
  {
    id: 'puppet-master', kind: 'path', hero: 'veyl', name: 'puppetMasterName', blurb: 'puppetMasterBlurb',
    tiers: ['puppetMaster1', 'puppetMaster2', 'puppetMaster3', 'puppetMaster4', 'puppetMaster5'],
  },
  {
    id: 'dark-bargain', kind: 'path', hero: 'veyl', name: 'darkBargainName', blurb: 'darkBargainBlurb',
    tiers: ['darkBargain1', 'darkBargain2', 'darkBargain3', 'darkBargain4', 'darkBargain5'],
  },
  // Kresh the Twinblade
  {
    id: 'dervish', kind: 'path', hero: 'kresh', name: 'dervishName', blurb: 'dervishBlurb',
    tiers: ['dervish1', 'dervish2', 'dervish3', 'dervish4', 'dervish5'],
  },
  {
    id: 'stalker', kind: 'path', hero: 'kresh', name: 'stalkerName', blurb: 'stalkerBlurb',
    tiers: ['stalker1', 'stalker2', 'stalker3', 'stalker4', 'stalker5'],
  },
  {
    id: 'rebuilt', kind: 'path', hero: 'kresh', name: 'rebuiltName', blurb: 'rebuiltBlurb',
    tiers: ['rebuilt1', 'rebuilt2', 'rebuilt3', 'rebuilt4', 'rebuilt5'],
  },
  // Master Joren Vask
  {
    id: 'duelist', kind: 'path', hero: 'joren', name: 'duelistName', blurb: 'duelistBlurb',
    tiers: ['duelist1', 'duelist2', 'duelist3', 'duelist4', 'duelist5'],
  },
  {
    id: 'breaker', kind: 'path', hero: 'joren', name: 'breakerName', blurb: 'breakerBlurb',
    tiers: ['breaker1', 'breaker2', 'breaker3', 'breaker4', 'breaker5'],
  },
  {
    id: 'council-seat', kind: 'path', hero: 'joren', name: 'councilSeatName', blurb: 'councilSeatBlurb',
    tiers: ['councilSeat1', 'councilSeat2', 'councilSeat3', 'councilSeat4', 'councilSeat5'],
  },
  // The Blade pool
  {
    id: 'blade-throw', kind: 'pool', pool: 'blade', name: 'bladeThrowName', blurb: 'bladeThrowBlurb',
    tiers: ['bladeThrow1', 'bladeThrow2', 'bladeThrow3', 'bladeThrow4', 'bladeThrow5'],
  },
  {
    id: 'wide-arc', kind: 'pool', pool: 'blade', name: 'wideArcName', blurb: 'wideArcBlurb',
    tiers: ['wideArc1', 'wideArc2', 'wideArc3', 'wideArc4', 'wideArc5'],
  },
  {
    id: 'riposte', kind: 'pool', pool: 'blade', name: 'riposteName', blurb: 'riposteBlurb',
    tiers: ['riposte1', 'riposte2', 'riposte3', 'riposte4', 'riposte5'],
  },
  {
    id: 'blade-dash', kind: 'pool', pool: 'blade', name: 'bladeDashName', blurb: 'bladeDashBlurb',
    tiers: ['bladeDash1', 'bladeDash2', 'bladeDash3', 'bladeDash4', 'bladeDash5'],
  },
  {
    id: 'spinning-guard', kind: 'pool', pool: 'blade', name: 'spinningGuardName', blurb: 'spinningGuardBlurb',
    tiers: ['spinningGuard1', 'spinningGuard2', 'spinningGuard3', 'spinningGuard4', 'spinningGuard5'],
  },
  {
    id: 'focus', kind: 'pool', pool: 'blade', name: 'focusName', blurb: 'focusBlurb',
    tiers: ['focus1', 'focus2', 'focus3', 'focus4', 'focus5'],
  },
  // The Current pool
  {
    id: 'push-wave', kind: 'pool', pool: 'current', name: 'pushWaveName', blurb: 'pushWaveBlurb',
    tiers: ['pushWave1', 'pushWave2', 'pushWave3', 'pushWave4', 'pushWave5'],
  },
  {
    id: 'mending', kind: 'pool', pool: 'current', name: 'mendingName', blurb: 'mendingBlurb',
    tiers: ['mending1', 'mending2', 'mending3', 'mending4', 'mending5'],
  },
  {
    id: 'foresight', kind: 'pool', pool: 'current', name: 'foresightName', blurb: 'foresightBlurb',
    tiers: ['foresight1', 'foresight2', 'foresight3', 'foresight4', 'foresight5'],
  },
  {
    id: 'calm-mind', kind: 'pool', pool: 'current', name: 'calmMindName', blurb: 'calmMindBlurb',
    tiers: ['calmMind1', 'calmMind2', 'calmMind3', 'calmMind4', 'calmMind5'],
  },
  // The Hollow pool
  {
    id: 'lightning-arc', kind: 'pool', pool: 'hollow', name: 'lightningArcName', blurb: 'lightningArcBlurb',
    tiers: ['lightningArc1', 'lightningArc2', 'lightningArc3', 'lightningArc4', 'lightningArc5'],
  },
  {
    id: 'grip', kind: 'pool', pool: 'hollow', name: 'gripName', blurb: 'gripBlurb',
    tiers: ['grip1', 'grip2', 'grip3', 'grip4', 'grip5'],
  },
  {
    id: 'rage', kind: 'pool', pool: 'hollow', name: 'rageName', blurb: 'rageBlurb',
    tiers: ['rage1', 'rage2', 'rage3', 'rage4', 'rage5'],
  },
  {
    id: 'drain', kind: 'pool', pool: 'hollow', name: 'drainName', blurb: 'drainBlurb',
    tiers: ['drain1', 'drain2', 'drain3', 'drain4', 'drain5'],
  },
  // The Gear deck
  { id: 'boots', kind: 'gear', name: 'bootsName', blurb: 'bootsBlurb', tiers: ['boots1', 'boots2', 'boots3', 'boots4', 'boots5'] },
  { id: 'magnet', kind: 'gear', name: 'magnetName', blurb: 'magnetBlurb', tiers: ['magnet1', 'magnet2', 'magnet3', 'magnet4', 'magnet5'] },
  { id: 'armour', kind: 'gear', name: 'armourName', blurb: 'armourBlurb', tiers: ['armour1', 'armour2', 'armour3', 'armour4', 'armour5'] },
  { id: 'overclock', kind: 'gear', name: 'overclockName', blurb: 'overclockBlurb', tiers: ['overclock1', 'overclock2', 'overclock3', 'overclock4', 'overclock5'] },
  { id: 'medpack', kind: 'gear', name: 'medpackName', blurb: 'medpackBlurb', tiers: ['medpack1', 'medpack2', 'medpack3', 'medpack4', 'medpack5'] },
  { id: 'cell', kind: 'gear', name: 'cellName', blurb: 'cellBlurb', tiers: ['cell1', 'cell2', 'cell3', 'cell4', 'cell5'] },
  { id: 'lens', kind: 'gear', name: 'lensName', blurb: 'lensBlurb', tiers: ['lens1', 'lens2', 'lens3', 'lens4', 'lens5'] },
  { id: 'chip', kind: 'gear', name: 'chipName', blurb: 'chipBlurb', tiers: ['chip1', 'chip2', 'chip3', 'chip4', 'chip5'] },
];

export const UPGRADES: Record<string, UpgradeDef> = Object.fromEntries(defs.map((d) => [d.id, d]));
export const UPGRADE_IDS = defs.map((d) => d.id);

/** The card taken when nothing else is left to offer. */
export const FILLER: { id: 'ration'; name: TextKey; text: TextKey } = { id: 'ration', name: 'rationName', text: 'rationText' };

export interface CapstoneDef {
  id: string;
  name: TextKey;
  hero: HeroId;
  path: string;
  gear: string;
  text: TextKey;
}

/** A path at tier 5 together with its gear piece (any tier) unlocks the path's capstone at once. */
export const CAPSTONES: readonly CapstoneDef[] = [
  { id: 'twin-storm', name: 'twinStormName', hero: 'rook', path: 'gunslinger', gear: 'overclock', text: 'twinStormText' },
  { id: 'last-company', name: 'lastCompanyName', hero: 'rook', path: 'commander', gear: 'armour', text: 'lastCompanyText' },
  { id: 'carpet-strike', name: 'carpetStrikeName', hero: 'rook', path: 'demolitions', gear: 'magnet', text: 'carpetStrikeText' },
  { id: 'hailstorm', name: 'hailstormName', hero: 'tr9', path: 'suppressor', gear: 'overclock', text: 'hailstormText' },
  { id: 'phalanx', name: 'phalanxName', hero: 'tr9', path: 'riot-shield', gear: 'armour', text: 'phalanxText' },
  { id: 'orbital-drop', name: 'orbitalDropName', hero: 'tr9', path: 'drop-doctrine', gear: 'boots', text: 'orbitalDropText' },
  { id: 'longshot', name: 'longshotName', hero: 'bram', path: 'marksman', gear: 'magnet', text: 'longshotText' },
  { id: 'skyfall', name: 'skyfallName', hero: 'bram', path: 'jump-trooper', gear: 'boots', text: 'skyfallText' },
  { id: 'the-batch', name: 'theBatchName', hero: 'bram', path: 'brothers', gear: 'medpack', text: 'theBatchText' },
  { id: 'perfect-form', name: 'perfectFormName', hero: 'kael', path: 'prodigy', gear: 'overclock', text: 'perfectFormText' },
  { id: 'squadron-run', name: 'squadronRunName', hero: 'kael', path: 'ace-pilot', gear: 'boots', text: 'squadronRunText' },
  { id: 'hollow-rebirth', name: 'hollowRebirthName', hero: 'kael', path: 'the-fall', gear: 'armour', text: 'hollowRebirthText' },
  { id: 'terror', name: 'terrorName', hero: 'vharn', path: 'dread', gear: 'magnet', text: 'terrorText' },
  { id: 'crushing-will', name: 'crushingWillName', hero: 'vharn', path: 'iron-grip', gear: 'overclock', text: 'crushingWillText' },
  { id: 'unbreakable', name: 'unbreakableName', hero: 'vharn', path: 'life-support', gear: 'medpack', text: 'unbreakableText' },
  { id: 'lift-the-ship', name: 'liftTheShipName', hero: 'oom', path: 'stillness', gear: 'armour', text: 'liftTheShipText' },
  { id: 'golden-cyclone', name: 'goldenCycloneName', hero: 'oom', path: 'whirlwind', gear: 'boots', text: 'goldenCycloneText' },
  { id: 'council-of-spirits', name: 'councilOfSpiritsName', hero: 'oom', path: 'old-teacher', gear: 'medpack', text: 'councilOfSpiritsText' },
  { id: 'perfect-guard', name: 'perfectGuardName', hero: 'corvin', path: 'bulwark', gear: 'armour', text: 'perfectGuardText' },
  { id: 'silver-tongue', name: 'silverTongueName', hero: 'corvin', path: 'persuasion', gear: 'overclock', text: 'silverTongueText' },
  { id: 'unassailable', name: 'unassailableName', hero: 'corvin', path: 'vantage', gear: 'boots', text: 'unassailableText' },
  { id: 'tempest', name: 'tempestName', hero: 'veyl', path: 'storm', gear: 'overclock', text: 'tempestText' },
  { id: 'court-of-puppets', name: 'courtOfPuppetsName', hero: 'veyl', path: 'puppet-master', gear: 'magnet', text: 'courtOfPuppetsText' },
  { id: 'eternal-regent', name: 'eternalRegentName', hero: 'veyl', path: 'dark-bargain', gear: 'medpack', text: 'eternalRegentText' },
  { id: 'violet-tornado', name: 'violetTornadoName', hero: 'kresh', path: 'dervish', gear: 'overclock', text: 'violetTornadoText' },
  { id: 'apex-predator', name: 'apexPredatorName', hero: 'kresh', path: 'stalker', gear: 'boots', text: 'apexPredatorText' },
  { id: 'steel-strider', name: 'steelStriderName', hero: 'kresh', path: 'rebuilt', gear: 'armour', text: 'steelStriderText' },
  { id: 'royal-fury', name: 'royalFuryName', hero: 'joren', path: 'duelist', gear: 'overclock', text: 'royalFuryText' },
  { id: 'shattering-blow', name: 'shatteringBlowName', hero: 'joren', path: 'breaker', gear: 'magnet', text: 'shatteringBlowText' },
  { id: 'master-of-the-order', name: 'masterOfTheOrderName', hero: 'joren', path: 'council-seat', gear: 'armour', text: 'masterOfTheOrderText' },
];

export interface CrossoverDef {
  id: string;
  name: TextKey;
  path: string;
  pool: string;
  text: TextKey;
}

/** A pool skill held with a fitting path (any tiers) gives a bonus. */
export const CROSSOVERS: readonly CrossoverDef[] = [
  { id: 'seeking-ricochets', name: 'seekingRicochetsName', path: 'gunslinger', pool: 'ricochet', text: 'seekingRicochetsText' },
  { id: 'stunning-bash', name: 'stunningBashName', path: 'riot-shield', pool: 'stun', text: 'stunningBashText' },
  { id: 'shoulder-to-shoulder', name: 'shoulderToShoulderName', path: 'brothers', pool: 'scatter', text: 'shoulderToShoulderText' },
  { id: 'cluster-grenades', name: 'clusterGrenadesName', path: 'demolitions', pool: 'thermal', text: 'clusterGrenadesText' },
  { id: 'fury-unbound', name: 'furyUnboundName', path: 'the-fall', pool: 'rage', text: 'furyUnboundText' },
  { id: 'iron-reach', name: 'ironReachName', path: 'iron-grip', pool: 'blade-throw', text: 'ironReachText' },
  { id: 'lifting-wave', name: 'liftingWaveName', path: 'stillness', pool: 'push-wave', text: 'liftingWaveText' },
  { id: 'returning-steel', name: 'returningSteelName', path: 'bulwark', pool: 'blade-throw', text: 'returningSteelText' },
  { id: 'loyal-dead', name: 'loyalDeadName', path: 'puppet-master', pool: 'drain', text: 'loyalDeadText' },
  { id: 'double-ring', name: 'doubleRingName', path: 'dervish', pool: 'spinning-guard', text: 'doubleRingText' },
  { id: 'royal-lightning', name: 'royalLightningName', path: 'council-seat', pool: 'lightning-arc', text: 'royalLightningText' },
];

/** The capstones a run's tiers and gear unlock. */
export function capstonesOf(ranks: Record<string, number>): CapstoneDef[] {
  return CAPSTONES.filter((c) => (ranks[c.path] ?? 0) >= MAX_TIER && (ranks[c.gear] ?? 0) > 0);
}

/** The crossovers a run's upgrades complete. */
export function crossoversOf(ranks: Record<string, number>): CrossoverDef[] {
  return CROSSOVERS.filter((c) => (ranks[c.path] ?? 0) > 0 && (ranks[c.pool] ?? 0) > 0);
}

/** The crossover an upgrade would complete (or does) for this hero, for the card hint. */
export function crossoverFor(id: string, hero: HeroId): CrossoverDef | undefined {
  return CROSSOVERS.find((c) => (c.path === id || c.pool === id) && UPGRADES[c.path].hero === hero);
}

/**
 * The pools a hero draws from now: their class and side. Kael Varro turns to the Hollow once he
 * takes The Fall.
 */
export function poolsOf(hero: HeroId, ranks: Record<string, number>): readonly PoolId[] {
  if (hero === 'kael' && (ranks['the-fall'] ?? 0) > 0) return ['blade', 'hollow'];
  return HEROES[hero].pools;
}

/** What a pool is called on a card. */
export const POOL_NAMES: Record<PoolId, TextKey> = { blaster: 'poolKind', blade: 'bladePoolKind', current: 'currentPoolKind', hollow: 'hollowPoolKind' };

/** The capstone an upgrade leads to, for the card hint. */
export function capstoneFor(id: string, hero: HeroId): CapstoneDef | undefined {
  return CAPSTONES.find((c) => c.hero === hero && (c.path === id || c.gear === id));
}

/** A level's per-tier value: `table[tier - 1]`, or `none` at tier 0. */
export function at<T>(table: readonly T[], tier: number, none: T): T {
  return tier <= 0 ? none : table[Math.min(tier, table.length) - 1];
}

export function countKinds(ranks: Record<string, number>) {
  let abilities = 0;
  let gear = 0;
  for (const id of Object.keys(ranks)) {
    if (UPGRADES[id]?.kind === 'gear') gear += 1;
    else if (UPGRADES[id]) abilities += 1;
  }
  return { abilities, gear };
}

/** Whether a card for this upgrade can be offered now. */
export function canOffer(id: string, hero: HeroId, ranks: Record<string, number>) {
  const def = UPGRADES[id];
  if (!def) return false;
  if (def.kind === 'path' && def.hero !== hero) return false;
  const rank = ranks[id] ?? 0;
  if (rank >= MAX_TIER) return false;
  // A skill already held can always go up, even from a pool the hero has turned away from.
  if (rank > 0) return true;
  if (def.kind === 'pool' && !poolsOf(hero, ranks).includes(def.pool!) && !HEROES[hero].extra?.includes(id)) return false;
  const { abilities, gear } = countKinds(ranks);
  return def.kind === 'gear' ? gear < MAX_GEAR : abilities < MAX_ABILITIES;
}

/**
 * Three different cards for a level-up, at least one from the hero's own paths while any can be
 * offered; the Field Ration fills in when fewer than three upgrades are left.
 */
export function rollChoices(hero: HeroId, ranks: Record<string, number>, count = 3): string[] {
  const open = UPGRADE_IDS.filter((id) => canOffer(id, hero, ranks));
  const own = open.filter((id) => UPGRADES[id].kind === 'path');
  const picks: string[] = [];
  const take = (pool: string[]) => {
    // Upgrades already held come up a little more often, so a build can be finished.
    const weights = pool.map((id) => ((ranks[id] ?? 0) > 0 ? 1.6 : 1));
    let r = Math.random() * weights.reduce((a, b) => a + b, 0);
    for (let i = 0; i < pool.length; i++) {
      r -= weights[i];
      if (r <= 0) return pool[i];
    }
    return pool[pool.length - 1];
  };
  if (own.length) picks.push(take(own));
  while (picks.length < count) {
    const rest = open.filter((id) => !picks.includes(id));
    if (!rest.length) break;
    picks.push(take(rest));
  }
  if (picks.length < count) picks.push(FILLER.id);
  return picks;
}

/**
 * A free pick (the arena's reward): up to three upgrades already held that can still go up, filled
 * with a level-up's cards when fewer are held.
 */
export function rewardChoices(hero: HeroId, ranks: Record<string, number>): string[] {
  const held = Object.keys(ranks).filter((id) => ranks[id] < MAX_TIER);
  const picks: string[] = [];
  while (picks.length < 3 && held.length) picks.push(held.splice(Math.floor(Math.random() * held.length), 1)[0]);
  for (const id of rollChoices(hero, ranks)) {
    if (picks.length >= 3) break;
    if (!picks.includes(id) && (id !== FILLER.id || !picks.length)) picks.push(id);
  }
  return picks;
}
