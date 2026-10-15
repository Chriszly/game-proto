// Names for the champions: each one in a match is a character of its own, with a made-up first name
// and a byname that fits its class, like "Brannoc Ironwall". Names are drawn with the random
// generator passed in (Math.random in the game, which the playthrough seeds).

const START = ['Al', 'Bran', 'Cor', 'Dar', 'El', 'Fen', 'Gar', 'Hal', 'Is', 'Jor', 'Kae', 'Lio', 'Mor', 'Nyr', 'Os', 'Pell', 'Quen', 'Ro', 'Syl', 'Tor', 'Ul', 'Var', 'Wyn', 'Yse', 'Zan', 'Ash', 'Bel', 'Cael', 'Dun', 'Eir', 'Fia', 'Gwen', 'Hes', 'Ilm', 'Kor', 'Lys', 'Mae', 'Nell', 'Orr', 'Rhi', 'Sab', 'Tam', 'Ves', 'Wil'];
const MIDDLE = ['', '', '', 'a', 'e', 'i', 'o', 'an', 'el', 'or', 'is', 'ar', 'en', 'ri', 'la'];
const END = ['dric', 'wyn', 'mir', 'thas', 'ra', 'nor', 'lia', 'ven', 'grim', 'dor', 'sha', 'rik', 'ssa', 'mund', 'ion', 'ka', 'bek', 'nna', 'vald', 'ric', 'th', 'ne', 'mos', 'ly', 'ga', 'rin', 'dis', 'ward', 'na', 'lo'];

/** Bynames per class: what the bards would call a champion of that class. */
const BYNAMES: Record<string, string[]> = {
  warden: ['Ironwall', 'Stonehide', 'the Unbroken', 'Shieldheart', 'Gatekeeper', 'the Steadfast', 'Bulwark', 'Anvilborn'],
  blade: ['Quickknife', 'the Silent', 'Duskedge', 'Nightstep', 'the Swift', 'Thinsteel', 'Ravencut', 'Lastword'],
  archer: ['Longshot', 'Sharpeye', 'Truestring', 'the Keen', 'Swiftfletch', 'Farsight', 'Windarrow', 'Bowmaker'],
  mage: ['Starcaller', 'the Wise', 'Flamebinder', 'Frostweaver', 'Runehand', 'Spellwright', 'the Bright', 'Emberspark'],
  priest: ['the Kind', 'Daykeeper', 'Lightkeeper', 'Mercyhand', 'Sunward', 'the Gentle', 'Hopebearer', 'Brightsoul'],
  berserker: ['Axeborn', 'the Wild', 'Skullsplitter', 'Bearclaw', 'Wolfheart', 'Ragefire', 'the Unchained', 'Ironjaw'],
  harpooner: ['Saltwind', 'Deepline', 'Tidesinger', 'the Hook', 'Wavebreaker', 'Stormdeck', 'Anchorhand', 'Seaborn'],
  witch: ['Thornmother', 'the Wicked', 'Hexweaver', 'Mirebloom', 'Nightshade', 'Rotroot', 'the Pale', 'Crowsong'],
  stalker: ['Shadowmark', 'the Unseen', 'Ghostfoot', 'Mistwalker', 'Softstep', 'Grimveil', 'Darkmoon', 'Whisperblade'],
  lancer: ['Spearpoint', 'the Bold', 'Longreach', 'Highbanner', 'Swiftlance', 'Ironcrest', 'the Valiant', 'Starspear'],
};

const pick = <T>(list: T[], rnd: () => number) => list[Math.floor(rnd() * list.length) % list.length];

/** A made-up first name, like Brannoc or Ysemir. */
export function firstName(rnd: () => number): string {
  const name = pick(START, rnd) + pick(MIDDLE, rnd) + pick(END, rnd);
  // Never three of a letter in a row, like "Dunannna".
  return (name.length > 9 ? pick(START, rnd) + pick(END, rnd) : name).replace(/(.)\1\1+/g, '$1$1');
}

/** A full name for a champion of a class: a first name and a byname, different from those in `taken`. */
export function championName(classId: string, rnd: () => number, taken: string[] = []): string {
  for (let i = 0; i < 20; i++) {
    const first = firstName(rnd);
    if (taken.some((t) => t.split(' ')[0] === first)) continue;
    return `${first} ${pick(BYNAMES[classId] ?? BYNAMES.warden, rnd)}`;
  }
  return `${firstName(rnd)} ${pick(BYNAMES[classId] ?? BYNAMES.warden, rnd)}`;
}

/** The first name of a full name, for short labels. */
export const shortName = (full: string) => full.split(' ')[0];
