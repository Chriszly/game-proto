// Concept mockups for the hub's games and three design directions.
// Writes one SVG per game (in the clean vector direction) into this folder, plus one board
// per direction. Run with `node design-mockups/generate.mjs`. The PNGs next to the SVGs were
// made by opening each SVG in Chromium and taking a screenshot. These are drawings of
// proposed screens, not the games' real code or art.
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

const W = 1280;
const H = 720;
const TOP = 72;
const PANEL_X = 960;
const FIELD = { x: 0, y: TOP, w: PANEL_X, h: H - TOP };

const STYLES = {
  vector: {
    key: 'vector',
    label: 'Clean vector',
    bg: '#f4f1ea',
    bar: '#ffffff',
    panel: '#ffffff',
    ink: '#1f2933',
    text: '#1f2933',
    muted: '#5b6670',
    stroke: 2,
    radius: 10,
    font: 'Inter, Arial, Helvetica, sans-serif',
  },
  lowpoly: {
    key: 'lowpoly',
    label: 'Low-poly 3D',
    bg: '#1b2430',
    bar: '#243041',
    panel: '#243041',
    ink: '#0d131b',
    text: '#eef2f6',
    muted: '#9fb0c2',
    stroke: 0,
    radius: 4,
    font: 'Inter, Arial, Helvetica, sans-serif',
  },
  handdrawn: {
    key: 'handdrawn',
    label: 'Hand-drawn paper',
    bg: '#f3e9d2',
    bar: '#fbf5e6',
    panel: '#fbf5e6',
    ink: '#2a2118',
    text: '#2a2118',
    muted: '#6b5a44',
    stroke: 2.5,
    radius: 6,
    font: '"Patrick Hand", "Comic Sans MS", cursive',
  },
};

const DIRECTIONS = {
  vector:
    'Flat shapes, one outline weight and a small palette per game. Reads well at phone size, is ' +
    'cheap to draw with Phaser Graphics or as SVG textures, and keeps every game on one look.',
  lowpoly:
    'Each object gets a lit face and a shaded face with a soft drop shadow, so boards read as ' +
    'solid objects. Can be faked with flat polygons in 2D, or done as real 3D with Three.js, which ' +
    'is a bigger change to the code.',
  handdrawn:
    'Paper background, wobbly ink outlines and warm colours, like a sketch in a notebook. Suits the ' +
    'farming and planning games. The wobble filter costs some frame time on weak devices, and ' +
    'text needs a handwritten font that loads from Google Fonts.',
};

// Games: the scene kind decides the playfield drawing. `loop` is the proposed change to the loop.
const GAMES = [
  {
    id: 'anvilheart', title: 'Anvilheart', accent: '#b5651d',
    chips: [['Coins', '412'], ['Best tier', '5'], ['Patience', '0:42']],
    scene: { kind: 'grid', cols: 4, rows: 4, seed: 3, items: [
      { c: 0, r: 0, label: 'T1', fill: '#9aa5b1' }, { c: 1, r: 0, label: 'T1', fill: '#9aa5b1' },
      { c: 1, r: 1, label: 'T2', fill: '#7f9fc4' }, { c: 3, r: 2, label: 'T3', fill: '#c9a24a' },
      { c: 0, r: 3, label: 'T2', fill: '#7f9fc4' }, { c: 2, r: 3, label: 'T4', fill: '#b57ad6' }] },
    panel: ['Adventurers at the counter', 'Asks: Tier 3 blade, pays 90', 'Asks: Tier 2 blade, pays 40', 'Asks: Dragonslayer (order)'],
    loop: ['Each adventurer asks for an exact tier', 'Overselling pays a fine, not the price', 'Walk-offs cost one of three reputation; ten orders end the day'],
  },
  {
    id: 'apothecary', title: 'Apothecary', accent: '#4f9d69',
    chips: [['Coins', '1.2k'], ['Sold today', '84'], ['Customers', '2 of 5']],
    scene: { kind: 'grid', cols: 8, rows: 4, seed: 5, path: [[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2]], items: [
      { c: 0, r: 0, label: 'Wheat', fill: '#e2c05a' }, { c: 1, r: 0, label: 'Mand.', fill: '#c77dba' },
      { c: 3, r: 0, label: 'Still', fill: '#7fb7c9' }, { c: 4, r: 0, label: 'Cauldron', fill: '#5e6b7a' },
      { c: 6, r: 0, label: 'Counter', fill: '#b98a5b' }, { c: 7, r: 3, label: 'Market', fill: '#8fc38a' }] },
    panel: ['Daily contract', 'Bulk order: 5 Fever Draughts', 'Reward 180 coins and 2 gems', 'Autopilot: 3 belts running', 'Waiting customers: 2 of 4 patient'],
    loop: ['One daily contract gives the run a clear goal', 'Waiting customers pay a tip that decays', 'An autopilot summary replaces belt micromanagement'],
  },
  {
    id: 'beehive-baron', title: 'Beehive Baron', accent: '#e0a526',
    chips: [['Honey', '340'], ['Jars', '12'], ['Bees', '9']],
    scene: { kind: 'grid', cols: 5, rows: 4, seed: 9, items: [
      { c: 0, r: 0, label: '3/5', fill: '#f2c14e' }, { c: 1, r: 0, label: '5/5', fill: '#f2c14e' },
      { c: 2, r: 1, label: '1/5', fill: '#f7dc8a' }, { c: 3, r: 2, label: '2/5', fill: '#f7dc8a' },
      { c: 1, r: 3, label: 'Bee', fill: '#3d3d3d' }, { c: 4, r: 3, label: 'Bee', fill: '#3d3d3d' }] },
    panel: ['Hive goal: 500 honey', 'Biome: Meadow, +10% nectar', 'Next cell touches the hive: +5%', 'Foragers return on load, capped'],
    loop: ['Goals unlock comb biomes', 'New cells score for touching the hive', 'Bees that are away on load come back with capped nectar'],
  },
  {
    id: 'broadside', title: 'Broadside', accent: '#2f6f9f',
    chips: [['Gold', '860'], ['Wave', '7'], ['Hull', '80%']],
    scene: { kind: 'sky', sky: 'sea', objects: [
      { type: 'island', x: 0.5, y: 0.45, w: 150, h: 84, fill: '#7fb069' },
      { type: 'ship', x: 0.3, y: 0.62, w: 84, h: 44, fill: '#e8c07a', label: 'You' },
      { type: 'ship', x: 0.72, y: 0.3, w: 76, h: 40, fill: '#b5483c', label: 'Brig' },
      { type: 'ship', x: 0.8, y: 0.72, w: 60, h: 34, fill: '#b5483c', label: 'Sloop' },
      { type: 'loot', x: 0.42, y: 0.2, w: 22, h: 22, fill: '#f2c94c', label: '' }] },
    panel: ['Harbor: five upgrades', 'Hull plating, level 2, cost 320', 'Cannon reload, level 1', 'Repair the hull, 60 gold'],
    loop: ['Hold to aim, and the broadside arc shows where the shot lands', 'Each wave offers one captain bonus to pick', 'Enemy captains steer around islands'],
  },
  {
    id: 'catacomb', title: 'Catacomb', accent: '#7a5c99',
    chips: [['Deck', '12'], ['Health', '34/50'], ['Room', '2 of 9']],
    scene: { kind: 'nodes', nodes: [
      [0.06, 0.5, 'Start', 'fight'], [0.22, 0.25, 'Foe', 'fight'], [0.22, 0.75, 'Fire', 'camp'],
      [0.42, 0.18, 'Elite', 'fight'], [0.42, 0.5, 'Chest', 'chest'], [0.42, 0.82, 'Foe', 'fight'],
      [0.62, 0.34, 'Fire', 'camp'], [0.62, 0.7, 'Foe', 'fight'], [0.84, 0.5, 'Bone King', 'boss']],
      edges: [[0, 1], [0, 2], [1, 3], [1, 4], [2, 4], [2, 5], [3, 6], [4, 6], [4, 7], [5, 7], [6, 8], [7, 8]] },
    panel: ['Deck: 12 cards', 'Strike x5, Block x4', 'Leech and Shield Bash x2', 'Reward: pick one of three'],
    loop: ['Two routes split and merge, so the player chooses risk', 'The campfire heals or removes a card', 'Foes telegraph random intents'],
  },
  {
    id: 'colonizer', title: 'Colonizer', accent: '#6b8e23',
    chips: [['Food', '120'], ['Wood', '240'], ['Pop', '14 of 20']],
    scene: { kind: 'grid', cols: 14, rows: 8, seed: 11, fog: true, known: 'rect:2,2,9,6', items: [
      { c: 3, r: 3, label: 'TC', fill: '#d8c48a' }, { c: 4, r: 4, label: 'Farm', fill: '#e4d27a' },
      { c: 6, r: 4, label: 'Lumber', fill: '#8c6239' }, { c: 8, r: 3, label: 'Barracks', fill: '#9aa5b1' },
      { c: 10, r: 4, label: 'Mine', fill: '#b8b8c8' }] },
    panel: ['Age I, match time 06:12', 'Villagers 9, soldiers 5', 'Train villager: 50 food', 'Minimap: rally point set'],
    loop: ['A clear opening goal: 10 villagers, one barracks, one farm', 'A minimap and rally points', 'Units step apart when they crowd'],
  },
  {
    id: 'deadline', title: 'Deadline', accent: '#6d7d3a', portrait: true,
    chips: [['Wave', '14'], ['Fire rate', '3.2/s'], ['Best', '21']],
    scene: { kind: 'lanes', lanes: 3, vertical: true, marks: [
      { lane: 1, t: 0.93, label: 'Hero', kind: 'hero', fill: '#6d7d3a' },
      { lane: 0, t: 0.2, label: 'Z', kind: 'unit', fill: '#8fb36b' }, { lane: 1, t: 0.4, label: 'Z', kind: 'unit', fill: '#8fb36b' },
      { lane: 2, t: 0.55, label: 'R', kind: 'unit', fill: '#c8b56f' }, { lane: 1, t: 0.12, label: 'Boss', kind: 'boss', fill: '#7c5a4c' }] },
    panel: ['Crate: pick one of three', 'Rapid fire, damage, companion, pierce', 'Boss in two waves', 'Best wave: 21'],
    loop: ['After each wave, pick one of three upgrades instead of a random crate', 'The boss telegraphs its charge a second early', 'Best wave and score are kept between runs'],
  },
  {
    id: 'golem-garden', title: 'Golem Garden', accent: '#4a8c3a',
    chips: [['Leaves', '18'], ['Sap', '240'], ['Wave', '6']],
    scene: { kind: 'grid', cols: 12, rows: 7, seed: 13, path: [[0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3]], items: [
      { c: 11, r: 3, label: 'Heart', fill: '#2f8f4a' }, { c: 4, r: 2, label: 'G1', fill: '#8ca3b0' },
      { c: 4, r: 4, label: 'G2', fill: '#8ca3b0' }, { c: 7, r: 2, label: 'M1', fill: '#6fa86b' },
      { c: 2, r: 3, label: 'Slug', fill: '#c9b458' }, { c: 6, r: 3, label: 'Bee', fill: '#3d3d3d' }, { c: 9, r: 4, label: 'Crow', fill: '#3d3d3d' }] },
    panel: ['Seeds: Pebble 30, Moss 45', 'Selected: Pebble, level 2', 'Sell refund: 25 sap', 'Next wave: 3 beetles, 1 crow'],
    loop: ['Golems can be sold or moved for half their cost', 'A speed-up button for the late waves', 'Pests spread across the lane instead of stacking'],
  },
  {
    id: 'hotfoot', title: 'Hotfoot', accent: '#c0792e',
    chips: [['Distance', '412 m'], ['Coins', '58'], ['Hearts', '3']],
    scene: { kind: 'runner', ground: 0.72, obstacles: [
      [0.36, 'spike'], [0.52, 'pit'], [0.62, 'ledge'], [0.72, 'goblin', 'G'], [0.84, 'blade'], [0.44, 'coin'], [0.56, 'coin'], [0.78, 'coin']] },
    panel: ['Checkpoint at 500 m', 'Boon: Second Leap', 'Boon: Lodestone', 'Shop: start with a shield, 40 coins'],
    loop: ['Coins buy one starting boon between runs', 'The game-over panel shows the boon you missed', 'A daily course seed for everyone'],
  },
  {
    id: 'lane-brawl', title: 'Lane Brawl', accent: '#3d6fb0',
    chips: [['Gold', '1.2k'], ['Level', '4'], ['Time', '08:40']],
    scene: { kind: 'lanes', lanes: 3, marks: [
      { lane: 0, t: 0.7, label: 'T', kind: 'tower', fill: '#c9b89a' }, { lane: 1, t: 0.5, label: 'T', kind: 'tower', fill: '#c9b89a' },
      { lane: 2, t: 0.3, label: 'T', kind: 'tower', fill: '#c9b89a' }, { lane: 2, t: 0.04, label: 'Blue', kind: 'nexus', fill: '#3d6fb0' },
      { lane: 0, t: 0.96, label: 'Red', kind: 'nexus', fill: '#b5483c' },
      { lane: 1, t: 0.2, label: 'You', kind: 'hero', fill: '#3d6fb0' }, { lane: 1, t: 0.3, label: 'A', kind: 'unit', fill: '#6a9bd6' },
      { lane: 0, t: 0.6, label: '', kind: 'unit', fill: '#b5483c' }, { lane: 1, t: 0.64, label: '', kind: 'unit', fill: '#b5483c' }] },
    panel: ['Abilities: Q W E R', 'Shop: Iron Blade, 1100 gold', 'Minimap with fog', 'Recall to base: 8 s'],
    loop: ['A recall button to walk back and shop', 'Fog of war on the minimap', 'Gold from minion kills shows as a clear tally'],
  },
  {
    id: 'lanternkeep', title: 'Lanternkeep', accent: '#2d3a6b',
    chips: [['Night', '6'], ['Hearths', '3'], ['Coins', '88']],
    scene: { kind: 'sky', sky: 'night', objects: [
      { type: 'castle', x: 0.5, y: 0.6, w: 260, h: 150, fill: '#5b5068' },
      { type: 'lantern', x: 0.2, y: 0.42, w: 22, h: 22, fill: '#ffd166', label: '' },
      { type: 'lantern', x: 0.34, y: 0.38, w: 22, h: 22, fill: '#ffd166', label: '' },
      { type: 'lantern', x: 0.7, y: 0.4, w: 22, h: 22, fill: '#ffd166', label: '' },
      { type: 'lantern', x: 0.82, y: 0.52, w: 22, h: 22, fill: '#6b6f8a', label: '' },
      { type: 'moth', x: 0.27, y: 0.26, w: 12, h: 12, fill: '#e6e6ff', label: '' },
      { type: 'moth', x: 0.62, y: 0.3, w: 12, h: 12, fill: '#e6e6ff', label: '' }] },
    panel: ['Night 6 tally', 'Lit 7 of 8 needed', 'Upgrades: oil, wings, quota', 'Next dusk in 45 s'],
    loop: ['Three moth kinds: fast, slow and heavy', 'The wind puts out one lantern a night', 'A two-tap queue, so taps during busy moths are kept'],
  },
  {
    id: 'mapmaker', title: 'Mapmaker', accent: '#3a7ca5',
    chips: [['Charts', '6'], ['Coins', '440'], ['Supplies', '3']],
    scene: { kind: 'grid', cols: 15, rows: 11, seed: 17, fog: true, known: 'rect:2,2,11,8', ground: '#e2d6a8', items: [
      { c: 5, r: 4, label: 'Hill', fill: '#9b8f6a' }, { c: 6, r: 4, label: 'Peak', fill: '#7d7663' },
      { c: 7, r: 5, label: 'Wood', fill: '#5f8c4e' }, { c: 4, r: 6, label: 'Port', fill: '#3a7ca5' }] },
    panel: ['Harbor: four upgrades', 'Ink, level 2', 'Provisions, level 1', 'Set sail, next voyage', 'Storm: supplies down by 1'],
    loop: ['Each island has a named bounty for one chart', 'Storms cut supplies on one voyage', 'A gallery of sold charts'],
  },
  {
    id: 'palisade', title: 'Palisade', accent: '#8a6d3b',
    chips: [['Wave', '9'], ['Level', '5'], ['XP', '60%']],
    scene: { kind: 'lanes', lanes: 1, marks: [
      { lane: 0, t: 0.07, label: 'Hero', kind: 'hero', fill: '#8a6d3b' }, { lane: 0, t: 0.3, label: 'Wall', kind: 'barricade', fill: '#a48a5a' },
      { lane: 0, t: 0.6, label: 'Orc', kind: 'unit', fill: '#6f8f4e' }, { lane: 0, t: 0.74, label: 'Orc', kind: 'unit', fill: '#6f8f4e' },
      { lane: 0, t: 0.9, label: 'Troll', kind: 'boss', fill: '#55664a' }] },
    panel: ['Level up: pick one of three', 'Volley, piercing, mend', 'Skill book', 'Best wave: 14'],
    loop: ['Progress is saved on every kill, not only at level-ups', 'Always three choices, with a gold fallback', 'The troll every tenth wave shows its health bars'],
  },
  {
    id: 'shrine-stack', title: 'Shrine Stack', accent: '#c9a227',
    chips: [['Tier', '7'], ['Favor', '34'], ['Best', '9']],
    scene: { kind: 'stack', stones: [0.9, 0.86, 0.78, 0.74, 0.7, 0.66, 0.6], swing: 0.5, colors: ['#d8c9a3', '#c9b58a', '#b9a57a'] },
    panel: ['Blessings: pick one of three', 'Mason’s Grace', 'Gilded trim', 'Reroll for 10 favor'],
    loop: ['Favor buys rerolls, so it is spent, not only counted', 'A gilded tier at ten with its own bonus', 'A run goal: reach tier 12'],
  },
  {
    id: 'space-wars', title: 'Space Wars', accent: '#4a4e9e',
    chips: [['Crystal', '340'], ['Army', '18'], ['Time', '06:12']],
    scene: { kind: 'sky', sky: 'space', objects: [
      { type: 'hub', x: 0.2, y: 0.5, w: 64, h: 64, fill: '#4fc3f7', label: 'Hub' },
      { type: 'hub', x: 0.8, y: 0.3, w: 64, h: 64, fill: '#e07a5f', label: 'Hub' },
      { type: 'hub', x: 0.76, y: 0.76, w: 56, h: 56, fill: '#9b5de5', label: 'Hub' },
      { type: 'crystal', x: 0.4, y: 0.3, w: 18, h: 18, fill: '#7ef0ff', label: '' },
      { type: 'crystal', x: 0.34, y: 0.7, w: 18, h: 18, fill: '#7ef0ff', label: '' },
      { type: 'rock', x: 0.56, y: 0.5, w: 110, h: 60, fill: '#5b5b6b', label: '' }] },
    panel: ['Build: depot, barracks, turret', 'Train: scout x5', 'Army: 14 of 20', 'Minimap with rally point'],
    loop: ['Opening: scout the nearest rival first', 'A minimap with a rally point', 'Ability cooldowns show on each unit'],
  },
  {
    id: 'tincture-tinker', title: 'TinctureTinker', accent: '#8e44ad',
    chips: [['Coins', '210'], ['Moves', '14'], ['Order', '3 of 5']],
    scene: { kind: 'grid', cols: 8, rows: 8, seed: 19, kinds: ['#c0392b', '#2e86c1', '#27ae60', '#f1c40f', '#8e44ad'] },
    panel: ['Order: 6 red, 4 blue, 2 green', 'Progress: 2/6, 3/4, 0/2', 'Move bonus: +1 move', 'Coins buy extra moves'],
    loop: ['Four in a row makes a special tile', 'Coins buy one move each', 'The board is saved between sessions'],
  },
  {
    id: 'tiny-kingdom', title: 'Tiny Kingdom', accent: '#5a9e4b',
    chips: [['Score', '46'], ['Round', '3'], ['Goal', '28']],
    scene: { kind: 'grid', cols: 10, rows: 7, seed: 23, water: [[4, 1], [5, 1], [4, 2], [9, 5]], items: [
      { c: 1, r: 1, label: 'F', fill: '#9ccf6a' }, { c: 2, r: 1, label: 'H', fill: '#f2c58a' },
      { c: 3, r: 2, label: 'T', fill: '#9aa5b1' }, { c: 5, r: 4, label: 'F', fill: '#9ccf6a' },
      { c: 6, r: 4, label: 'H', fill: '#f2c58a' }, { c: 7, r: 3, label: 'T', fill: '#9aa5b1' }] },
    panel: ['Pouch: F, H, T', 'Island 4071', 'Undo: one per round', 'Share this island number'],
    loop: ['One undo per round', 'Share an island number, so a friend can play the same map', 'Each round adds one free tile to the pouch'],
  },
  {
    id: 'wyrmrail', title: 'Wyrmrail', accent: '#2e8b8b',
    chips: [['Coins', '180'], ['Hearts', '3'], ['Round', '2']],
    scene: { kind: 'grid', cols: 12, rows: 7, seed: 29, fills: { 'forest': '#6f9e5a', 'mount': '#9b9aa3', 'river': '#6fa8d6' },
      terrain: { '0,0': 'forest', '1,0': 'forest', '2,1': 'mount', '3,1': 'mount', '6,4': 'river', '7,4': 'river', '8,5': 'river', '9,4': 'forest' },
      track: [[0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [4, 2], [5, 2]],
      items: [{ c: 0, r: 3, label: 'Roost', fill: '#b5483c' }, { c: 5, r: 2, label: 'V1', fill: '#e2c05a' },
        { c: 10, r: 5, label: 'V2', fill: '#e2c05a' }, { c: 3, r: 3, label: 'W', fill: '#2e8b8b' }] },
    panel: ['Orders: three open', 'Hay to V1, 40 s left', 'Track cost: grass 2, forest 4', 'Switch track, 6 coins'],
    loop: ['Track switches let the wyrm run two lines', 'A second wagon carries two orders', 'A new village every round, including after round 4'],
  },
];

// Small helpers --------------------------------------------------------------

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Mix a hex colour towards black or white by t (0 to 1).
function mix(hex, to, t) {
  const n = parseInt(hex.slice(1), 16);
  const m = parseInt(to.slice(1), 16);
  const ch = (s) => {
    const a = (n >> s) & 255;
    const b = (m >> s) & 255;
    return Math.round(a + (b - a) * t);
  };
  return `#${[16, 8, 0].map((s) => ch(s).toString(16).padStart(2, '0')).join('')}`;
}

function onFill(hex) {
  const n = parseInt(hex.slice(1), 16);
  const lum = (((n >> 16) & 255) * 0.299 + ((n >> 8) & 255) * 0.587 + (n & 255) * 0.114) / 255;
  return lum > 0.6 ? '#1f2933' : '#ffffff';
}

function wrap(text, max) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    if ((line + ' ' + w).trim().length > max) {
      lines.push(line);
      line = w;
    } else {
      line = (line + ' ' + w).trim();
    }
  }
  if (line) lines.push(line);
  return lines;
}

// Drawing primitives, one set per style ---------------------------------------

function text(st, x, y, s, size, fill, weight = 400, anchor = 'start') {
  return `<text x="${x}" y="${y}" font-family="${st.font}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}" dominant-baseline="middle">${esc(s)}</text>`;
}

function box(st, x, y, w, h, fill, r = st.radius) {
  if (st.key === 'lowpoly') {
    return `<g filter="url(#drop)">` +
      `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${mix(fill, '#000000', 0.35)}"/>` +
      `<polygon points="${x},${y} ${x + w},${y} ${x},${y + h}" fill="${mix(fill, '#ffffff', 0.18)}"/>` +
      `<rect x="${x + w * 0.1}" y="${y + h * 0.1}" width="${w * 0.8}" height="${h * 0.8}" rx="${r}" fill="${fill}"/></g>`;
  }
  const wob = st.key === 'handdrawn' ? ' filter="url(#wob)"' : '';
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="${st.ink}" stroke-width="${st.stroke}"${wob}/>`;
}

function dot(st, cx, cy, rad, fill) {
  if (st.key === 'lowpoly') {
    return `<g filter="url(#drop)"><circle cx="${cx}" cy="${cy}" r="${rad}" fill="${mix(fill, '#000000', 0.35)}"/>` +
      `<circle cx="${cx - rad * 0.2}" cy="${cy - rad * 0.2}" r="${rad * 0.7}" fill="${mix(fill, '#ffffff', 0.2)}"/></g>`;
  }
  const wob = st.key === 'handdrawn' ? ' filter="url(#wob)"' : '';
  return `<circle cx="${cx}" cy="${cy}" r="${rad}" fill="${fill}" stroke="${st.ink}" stroke-width="${st.stroke}"${wob}/>`;
}

function poly(st, pts, fill) {
  const p = pts.map(([x, y]) => `${x},${y}`).join(' ');
  if (st.key === 'lowpoly') {
    return `<g filter="url(#drop)"><polygon points="${p}" fill="${mix(fill, '#000000', 0.3)}"/>` +
      `<polygon points="${pts[0][0]},${pts[0][1]} ${pts[1][0]},${pts[1][1]} ${pts[2][0]},${pts[2][1]}" fill="${mix(fill, '#ffffff', 0.2)}"/></g>`;
  }
  const wob = st.key === 'handdrawn' ? ' filter="url(#wob)"' : '';
  return `<polygon points="${p}" fill="${fill}" stroke="${st.ink}" stroke-width="${st.stroke}" stroke-linejoin="round"${wob}/>`;
}

function line(st, x1, y1, x2, y2, color, width, opacity = 1) {
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${width}" stroke-linecap="round" opacity="${opacity}"/>`;
}

// Scene renderers ------------------------------------------------------------

function gridScene(st, g, acc) {
  const s = g.scene;
  const pad = 40;
  const size = Math.min(Math.floor((FIELD.w - pad * 2) / s.cols), Math.floor((FIELD.h - pad * 2) / s.rows), 96);
  const x0 = FIELD.x + (FIELD.w - size * s.cols) / 2;
  const y0 = FIELD.y + (FIELD.h - size * s.rows) / 2;
  const rnd = rng(s.seed);
  const key = (c, r) => `${c},${r}`;
  const pathSet = new Set((s.path || []).map(([c, r]) => key(c, r)));
  const waterSet = new Set((s.water || []).map(([c, r]) => key(c, r)));
  const itemAt = new Map((s.items || []).map((it) => [key(it.c, it.r), it]));
  const known = new Set();
  if (s.known) {
    const [c1, r1, c2, r2] = s.known.replace('rect:', '').split(',').map(Number);
    for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) known.add(key(c, r));
  }
  const base = s.ground || mix(acc, '#ffffff', 0.72);
  let out = '';
  for (let r = 0; r < s.rows; r++) {
    for (let c = 0; c < s.cols; c++) {
      const k = key(c, r);
      const x = x0 + c * size;
      const y = y0 + r * size;
      const inner = size - 4;
      let fill = rnd() > 0.5 ? base : mix(base, '#000000', 0.05);
      if (pathSet.has(k)) fill = '#d9b98a';
      if (waterSet.has(k)) fill = '#6fa8d6';
      const terr = s.terrain && s.terrain[k];
      if (terr) fill = s.fills[terr];
      const fogged = s.fog && !known.has(k);
      if (fogged) fill = mix(base, '#1f2933', 0.55);
      out += box(st, x + 2, y + 2, inner, inner, fill, 4);
      if (s.kinds && !fogged) {
        out += dot(st, x + size / 2, y + size / 2, size * 0.3, s.kinds[Math.floor(rnd() * s.kinds.length)]);
      }
      if (fogged) out += text(st, x + size / 2, y + size / 2, '?', size * 0.3, mix(base, '#ffffff', 0.4), 700, 'middle');
      const it = itemAt.get(k);
      if (it && !fogged) {
        const rad = size * 0.34;
        out += dot(st, x + size / 2, y + size / 2, rad, it.fill);
        out += text(st, x + size / 2, y + size / 2, it.label, Math.max(10, size * 0.18), onFill(it.fill), 700, 'middle');
      }
    }
  }
  if (s.track) {
    const pts = s.track.map(([c, r]) => [x0 + c * size + size / 2, y0 + r * size + size / 2]);
    for (let i = 1; i < pts.length; i++) {
      out += line(st, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], '#4a3f35', 7);
      out += line(st, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], '#e8dcc0', 2.5);
    }
  }
  return out;
}

function lanesScene(st, g, acc) {
  const s = g.scene;
  const n = s.lanes;
  const out = [];
  let lane = '';
  const pad = 56;
  // The lanes fill the field; a vertical layout (portrait) sits in the middle of the field.
  const box0 = s.vertical
    ? { x: FIELD.x + 250, y: FIELD.y + 16, w: FIELD.w - 500, h: FIELD.h - 32 }
    : { x: FIELD.x + 24, y: FIELD.y + 24, w: FIELD.w - 48, h: FIELD.h - 48 };
  const laneColour = '#cdb98f';
  for (let i = 0; i < n; i++) {
    if (s.vertical) {
      const w = box0.w / n;
      lane += box(st, box0.x + i * w + 4, box0.y, w - 8, box0.h, i === 1 ? '#c3b48a' : laneColour, 8);
    } else {
      const h = (box0.h - 16) / n;
      lane += box(st, box0.x, box0.y + i * h + 8, box0.w, h - 8, i % 2 ? '#bfae83' : laneColour, 8);
    }
  }
  const pos = (m) => {
    if (s.vertical) {
      const w = box0.w / n;
      return [box0.x + m.lane * w + w / 2, box0.y + pad / 2 + m.t * (box0.h - pad)];
    }
    const h = (box0.h - 16) / n;
    return [box0.x + pad / 2 + m.t * (box0.w - pad), box0.y + 8 + m.lane * h + h / 2];
  };
  for (const m of s.marks) {
    const [x, y] = pos(m);
    if (m.kind === 'tower') out.push(box(st, x - 16, y - 24, 32, 48, m.fill, 4));
    else if (m.kind === 'barricade') out.push(box(st, x - 12, y - 60, 24, 120, m.fill, 4));
    else if (m.kind === 'nexus') out.push(dot(st, x, y, 34, m.fill));
    else if (m.kind === 'boss') out.push(dot(st, x, y, 30, m.fill));
    else if (m.kind === 'hero') out.push(box(st, x - 20, y - 24, 40, 48, m.fill, 10));
    else out.push(dot(st, x, y, 14, m.fill));
    if (m.label) out.push(text(st, x, y + (m.kind === 'unit' ? 26 : m.kind === 'hero' ? 36 : 44), m.label, 13, st.text, 600, 'middle'));
  }
  return lane + out.join('');
}

function runnerScene(st, g, acc) {
  const s = g.scene;
  const top = FIELD.y;
  const groundY = FIELD.y + FIELD.h * s.ground;
  let out = '';
  out += box(st, FIELD.x + 16, top + 16, FIELD.w - 32, groundY - top - 16, mix(acc, '#ffffff', 0.85), 12);
  out += box(st, FIELD.x + 16, groundY, FIELD.w - 32, FIELD.y + FIELD.h - groundY - 16, '#c9a56b', 0);
  const xAt = (f) => FIELD.x + 40 + f * (FIELD.w - 80);
  for (const [f, kind, label] of s.obstacles) {
    const x = xAt(f);
    if (kind === 'spike') out += poly(st, [[x - 22, groundY], [x, groundY - 50], [x + 22, groundY]], '#8d8d96');
    else if (kind === 'pit') out += box(st, x - 40, groundY - 4, 80, 40, '#3c2f25', 2);
    else if (kind === 'ledge') out += box(st, x, groundY - 90, 150, 26, '#b08a57', 4);
    else if (kind === 'blade') out += poly(st, [[x, top + 40], [x - 16, top + 80], [x + 16, top + 80]], '#c2c7cf');
    else if (kind === 'goblin') out += dot(st, x, groundY - 22, 20, '#6f9e4a') + text(st, x, groundY - 22, label, 14, '#ffffff', 700, 'middle');
    else out += dot(st, x, groundY - 60, 10, '#f2c94c');
  }
  // knight
  const kx = xAt(0.14);
  out += box(st, kx - 16, groundY - 56, 32, 56, acc, 6) + dot(st, kx, groundY - 70, 14, '#e8dcc0');
  return out;
}

function stackScene(st, g) {
  const s = g.scene;
  const cx = FIELD.x + FIELD.w / 2;
  const baseY = FIELD.y + FIELD.h - 50;
  const maxW = 380;
  let out = box(st, cx - 260, baseY, 520, 46, '#8c7b63', 6);
  let y = baseY;
  s.stones.forEach((f, i) => {
    const w = maxW * f;
    y -= 34;
    out += box(st, cx - w / 2, y, w, 32, s.colors[i % s.colors.length], 4);
  });
  // swinging stone and drop guide
  const sw = maxW * s.swing;
  const swingY = FIELD.y + 60;
  out += line(st, cx, swingY + 26, cx, y - 2, st.ink, 1.5, 0.5);
  out += box(st, cx - sw / 2 + 60, swingY, sw, 30, '#f0e6cf', 4);
  out += text(st, cx, FIELD.y + 26, 'Drop the stone where it balances', 15, st.muted, 600, 'middle');
  return out;
}

function nodesScene(st, g) {
  const s = g.scene;
  const pad = 80;
  const px = (f) => FIELD.x + pad + f * (FIELD.w - pad * 2);
  const py = (f) => FIELD.y + 80 + f * (FIELD.h - 160);
  const fills = { fight: '#c9c3d6', camp: '#f2b872', chest: '#e8d07a', boss: '#8e3b46' };
  let out = '';
  for (const [a, b] of s.edges) {
    const [xa, ya] = [px(s.nodes[a][0]), py(s.nodes[a][1])];
    const [xb, yb] = [px(s.nodes[b][0]), py(s.nodes[b][1])];
    out += line(st, xa, ya, xb, yb, st.ink, 3, 0.45);
  }
  for (const [fx, fy, label, kind] of s.nodes) {
    const x = px(fx);
    const y = py(fy);
    out += dot(st, x, y, 30, fills[kind]);
    out += text(st, x, y + 48, label, 15, st.text, 600, 'middle');
  }
  return out;
}

function skyScene(st, g, acc) {
  const s = g.scene;
  const skies = { night: '#23305a', space: '#0b0f22', sea: '#5fa8c9' };
  const rnd = rng(31);
  let out = box(st, FIELD.x + 8, FIELD.y + 8, FIELD.w - 16, FIELD.h - 16, skies[s.sky], 12);
  if (s.sky === 'night' || s.sky === 'space') {
    for (let i = 0; i < 70; i++) {
      out += `<circle cx="${FIELD.x + 20 + rnd() * (FIELD.w - 40)}" cy="${FIELD.y + 20 + rnd() * (FIELD.h - 40)}" r="${1 + rnd() * 1.6}" fill="#ffffff" opacity="${0.4 + rnd() * 0.6}"/>`;
    }
  }
  if (s.sky === 'sea') {
    for (let row = 0; row < 6; row++) {
      const y = FIELD.y + 120 + row * 80;
      let d = `M ${FIELD.x + 30} ${y}`;
      for (let x = 30; x < FIELD.w - 30; x += 60) d += ` q 15 -10 30 0 t 30 0`;
      out += `<path d="${d}" fill="none" stroke="#ffffff" stroke-width="2" opacity="0.35"/>`;
    }
  }
  for (const o of s.objects) {
    const x = FIELD.x + o.x * FIELD.w;
    const y = FIELD.y + o.y * FIELD.h;
    if (o.type === 'island') out += `<ellipse cx="${x}" cy="${y}" rx="${o.w / 2}" ry="${o.h / 2}" fill="${o.fill}" stroke="${st.ink}" stroke-width="${st.stroke}"/>`;
    else if (o.type === 'ship') {
      out += poly(st, [[x - o.w / 2, y - 6], [x + o.w / 2, y - 6], [x + o.w * 0.36, y + o.h / 2], [x - o.w * 0.36, y + o.h / 2]], o.fill);
      out += line(st, x, y - 6, x, y - o.h * 0.9, st.ink, 3);
      out += text(st, x, y + o.h / 2 + 16, o.label, 14, '#ffffff', 700, 'middle');
    } else if (o.type === 'loot') out += dot(st, x, y, o.w / 2, o.fill);
    else if (o.type === 'castle') {
      out += box(st, x - o.w / 2, y - o.h / 2, o.w, o.h, o.fill, 4);
      for (let i = 0; i < 5; i++) out += box(st, x - o.w / 2 + i * (o.w / 5) + 4, y - o.h / 2 - 16, o.w / 5 - 8, 18, o.fill, 2);
      out += text(st, x, y + 4, 'Keep', 18, '#eef2f6', 700, 'middle');
    } else if (o.type === 'lantern') out += `<circle cx="${x}" cy="${y}" r="${o.w * 1.6}" fill="${o.fill}" opacity="0.18"/>` + dot(st, x, y, o.w / 2, o.fill);
    else if (o.type === 'moth') out += dot(st, x, y, o.w / 2, o.fill);
    else if (o.type === 'hub') {
      out += dot(st, x, y, o.w / 2, o.fill) + text(st, x, y + o.h / 2 + 16, o.label, 14, '#ffffff', 700, 'middle');
    } else if (o.type === 'crystal') out += poly(st, [[x, y - o.h / 2], [x + o.w / 2, y], [x, y + o.h / 2], [x - o.w / 2, y]], o.fill);
    else if (o.type === 'rock') out += box(st, x - o.w / 2, y - o.h / 2, o.w, o.h, o.fill, 14);
  }
  return out;
}

const SCENES = { grid: gridScene, lanes: lanesScene, runner: runnerScene, stack: stackScene, nodes: nodesScene, sky: skyScene };

// Frame: bar, playfield, side panel ------------------------------------------

function defs() {
  return `<defs>` +
    `<filter id="wob" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed="7"/><feDisplacementMap in="SourceGraphic" scale="8"/></filter>` +
    `<filter id="drop" x="-10%" y="-10%" width="130%" height="140%"><feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#000" flood-opacity="0.35"/></filter>` +
    `</defs>`;
}

function mockup(st, g) {
  const acc = g.accent;
  const parts = [];
  parts.push(defs());
  parts.push(`<rect x="0" y="0" width="${W}" height="${H}" fill="${st.bg}"/>`);
  // top bar
  parts.push(`<rect x="0" y="0" width="${W}" height="${TOP}" fill="${st.bar}"/>`);
  parts.push(`<rect x="0" y="${TOP - 6}" width="${W}" height="6" fill="${acc}"/>`);
  parts.push(text(st, 24, 36, g.title, 28, st.text, 700));
  let cx = W - 24;
  for (const [label, value] of [...g.chips].reverse()) {
    const cw = 170;
    cx -= cw;
    parts.push(box(st, cx, 14, cw, 46, st.bg, 8));
    parts.push(text(st, cx + 14, 26, label, 12, st.muted, 500));
    parts.push(text(st, cx + 14, 46, value, 18, st.text, 700));
    cx -= 12;
  }
  // playfield
  parts.push(`<g>${SCENES[g.scene.kind](st, g, acc)}</g>`);
  parts.push(text(st, 24, 60, `Concept mockup, not game code. ${st.label} direction.`, 12, st.muted, 400));
  if (g.portrait) parts.push(text(st, 24, 60, 'Portrait game: shown in a phone-width column.', 12, st.muted, 400));
  // side panel
  parts.push(`<rect x="${PANEL_X}" y="${TOP}" width="${W - PANEL_X}" height="${H - TOP}" fill="${st.panel}"/>`);
  parts.push(`<rect x="${PANEL_X}" y="${TOP}" width="2" height="${H - TOP}" fill="${st.muted}" opacity="0.3"/>`);
  let y = TOP + 36;
  parts.push(text(st, PANEL_X + 24, y, 'ON SCREEN', 12, st.muted, 700));
  y += 30;
  for (const item of g.panel) {
    for (const [i, row] of wrap(item, 30).entries()) {
      parts.push(text(st, PANEL_X + 24, y, `${i === 0 ? '•' : ' '}  ${row}`, 16, st.text, 400));
      y += 24;
    }
    y += 6;
  }
  y = Math.max(y + 24, 470);
  parts.push(`<rect x="${PANEL_X + 16}" y="${y - 24}" width="${W - PANEL_X - 32}" height="2" fill="${acc}"/>`);
  parts.push(text(st, PANEL_X + 24, y, 'PROPOSED LOOP CHANGE', 12, acc, 700));
  y += 30;
  for (const item of g.loop) {
    for (const [i, row] of wrap(item, 30).entries()) {
      parts.push(text(st, PANEL_X + 24, y, `${i === 0 ? '•' : ' '}  ${row}`, 16, st.text, i === 0 ? 600 : 400));
      y += 24;
    }
    y += 8;
  }
  return parts.join('\n');
}

function svgDoc(w, h, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">\n${body}\n</svg>\n`;
}

function directionBoard(key) {
  const st = STYLES[key];
  const picks = ['tiny-kingdom', 'hotfoot', 'lanternkeep'];
  const parts = [];
  parts.push(`<rect x="0" y="0" width="1700" height="820" fill="${st.bg}"/>`);
  parts.push(text(st, 48, 60, `Design direction: ${st.label}`, 42, st.text, 700));
  let y = 110;
  for (const row of wrap(DIRECTIONS[key], 120)) {
    parts.push(text(st, 48, y, row, 22, st.muted, 400));
    y += 30;
  }
  picks.forEach((id, i) => {
    const g = GAMES.find((x) => x.id === id);
    const x = 0 + i * (512 + 32) + 0;
    parts.push(`<g transform="translate(${40 + i * 552},260) scale(0.4)">${mockup(st, g)}</g>`);
  });
  parts.push(text(st, 48, 800, 'Mockups show the same three games in this direction: Tiny Kingdom, Hotfoot and Lanternkeep.', 18, st.muted, 400));
  return svgDoc(1700, 820, parts.join('\n'));
}

// Write files
import { mkdirSync } from 'node:fs';
const OUT = here;
for (const g of GAMES) {
  writeFileSync(join(OUT, `${g.id}.svg`), svgDoc(W, H, mockup(STYLES.vector, g)));
}
for (const key of Object.keys(STYLES)) {
  writeFileSync(join(OUT, `direction-${key}.svg`), directionBoard(key));
}
console.log(`wrote ${GAMES.length} game mockups and ${Object.keys(STYLES).length} direction boards to ${OUT}`);
