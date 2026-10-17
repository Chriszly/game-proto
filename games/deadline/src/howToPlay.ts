import type { HowToPlay } from '../../../shared/howToPlay';
import { byLanguage } from '../../../shared/i18n';

const en: HowToPlay = {
  goal: 'Hold the road against the zombie horde for as many waves as you can, or win a 10-wave operation. The run ends when a zombie reaches your sandbags.',
  controls: [
    {
      input: 'Tap or drag anywhere, or A / D / arrow keys',
      action: 'Move the soldier left or right; shooting is automatic',
    },
    {
      input: 'Tap the kit panel, then a lane, or S',
      action: 'Put up a sandbag wall that holds a lane back for 6 seconds',
    },
    { input: 'Tap a card, or 1 / 2 / 3', action: 'Pick a supply after a boss, or the role of a survivor who joins' },
    { input: 'Tap the wide card, or 4', action: 'Extract and end the run as a win, from wave 20' },
    { input: 'COMIC / NV switch, or V', action: 'Switch between the comic and night-vision art styles' },
    {
      input: 'Tap a starting crate after game over',
      action: 'Buy it with scrap for the next run; tap again to refund',
    },
    { input: 'Tap an outpost upgrade after game over', action: 'Buy its next level with scrap, for every run to come' },
    { input: 'Tap an operation after game over', action: 'Pick the next run: the Open Road or a 10-wave operation' },
    { input: 'Tap anywhere else after game over', action: 'Start again from wave 1' },
  ],
  loop: [
    'Zombies walk down their lanes to the sandbags while your squad fires straight up; move under the lane that needs you.',
    'Stand below a crate and shoot it open to collect its upgrade.',
    'Clear every zombie in the wave, and the next, bigger wave comes after a short pause.',
    'Every fifth wave ends with a boss; beat it and pick one of three supplies.',
  ],
  tips: [
    'Shoot a fuel drum when zombies bunch up around it to blow them all up.',
    'Kill quickly: a streak of 12 starts a frenzy that doubles your fire rate for 5 seconds.',
    'A third crate of one kind turns into a perk: fire rounds, headshots or ricochets.',
    'Spitters lob acid; step out of the ring, since standing in acid halves your fire rate.',
    'Survivors walk between the lanes and your rifles hold fire on them, but pellets, ricochets and marksman shots still hurt; let one reach the sandbags and they join your squad.',
    'Riot zombies only chip under plain bullets; use pierce, a fuel drum or a flame.',
    'A survivor who joins picks a role: Gunner, Grenadier (a grenade every fourth volley) or Marksman (a heavy shot at the toughest zombie).',
    'From wave 8 the horde answers your strongest stat: armoured brutes stop pierce, riot shields blunt fire rate, flank spitters test a wide squad.',
    'Every kill banks scrap, which buys starting crates for your next run and lasting outpost upgrades.',
  ],
};

/** US English only changes the spelling. */
const us = (text: string) => text.replace(/armoured/g, 'armored');
const enUS: HowToPlay = {
  goal: en.goal,
  controls: en.controls,
  loop: en.loop,
  tips: en.tips.map(us),
};

const de: HowToPlay = {
  goal: 'Halte die Straße so viele Wellen wie möglich gegen die Zombiehorde, oder gewinne eine Operation über 10 Wellen. Der Lauf endet, wenn ein Zombie deine Sandsäcke erreicht.',
  controls: [
    {
      input: 'Irgendwo tippen oder ziehen, oder A / D / Pfeiltasten',
      action: 'Den Soldaten nach links oder rechts bewegen; geschossen wird von selbst',
    },
    {
      input: 'Die Ausrüstung antippen, dann eine Spur, oder S',
      action: 'Einen Sandsackwall bauen, der eine Spur 6 Sekunden lang aufhält',
    },
    { input: 'Eine Karte antippen, oder 1 / 2 / 3', action: 'Nach einem Boss Nachschub wählen, oder die Rolle eines Überlebenden, der dazukommt' },
    { input: 'Die breite Karte antippen, oder 4', action: 'Ab Welle 20 abziehen und den Lauf als Sieg beenden' },
    { input: 'Schalter COMIC / NACHT, oder V', action: 'Zwischen Comic- und Nachtsicht-Grafik wechseln' },
    {
      input: 'Nach dem Spielende eine Startkiste antippen',
      action: 'Sie mit Schrott für den nächsten Lauf kaufen; nochmal tippen erstattet sie',
    },
    { input: 'Nach dem Spielende einen Außenposten-Ausbau antippen', action: 'Seine nächste Stufe mit Schrott kaufen, für alle kommenden Läufe' },
    { input: 'Nach dem Spielende eine Operation antippen', action: 'Den nächsten Lauf wählen: die Offene Straße oder eine Operation über 10 Wellen' },
    { input: 'Nach dem Spielende woanders tippen', action: 'Neu ab Welle 1 beginnen' },
  ],
  loop: [
    'Zombies laufen ihre Spur hinunter zu den Sandsäcken, während dein Trupp gerade nach oben feuert; stell dich unter die Spur, die dich braucht.',
    'Stell dich unter eine Kiste und schieß sie auf, um ihr Upgrade zu bekommen.',
    'Erledige jeden Zombie der Welle, und nach einer kurzen Pause kommt die nächste, größere Welle.',
    'Jede fünfte Welle endet mit einem Boss; besiege ihn und wähle einen von drei Nachschüben.',
  ],
  tips: [
    'Schieß ein Treibstofffass, wenn sich Zombies darum drängen, und sprenge sie alle.',
    'Töte schnell: eine Serie von 12 startet einen Rausch, der deine Feuerrate 5 Sekunden lang verdoppelt.',
    'Die dritte Kiste einer Sorte wird zum Vorteil: Brandmunition, Kopfschüsse oder Querschläger.',
    'Spucker werfen Säure; geh aus dem Ring, denn in der Säure halbiert sich deine Feuerrate.',
    'Überlebende laufen zwischen den Spuren, und deine Gewehre halten das Feuer auf sie zurück, doch Schrot, Querschläger und Scharfschüsse treffen sie trotzdem; lass einen die Sandsäcke erreichen, dann verstärkt er deinen Trupp.',
    'Krawallzombies nehmen von normalen Kugeln kaum Schaden; nimm Durchschlag, ein Treibstofffass oder Feuer.',
    'Ein neuer Überlebender wählt eine Rolle: Schütze, Grenadier (jede vierte Salve eine Granate) oder Scharfschütze (ein schwerer Schuss auf den zähesten Zombie).',
    'Ab Welle 8 antwortet die Horde auf deinen stärksten Wert: gepanzerte Brecher stoppen Durchschlag, Krawallschilde bremsen die Feuerrate, Flankenspucker prüfen einen breiten Trupp.',
    'Jeder Kill bringt Schrott, der Startkisten für den nächsten Lauf und dauerhafte Außenposten-Ausbauten kauft.',
  ],
};

export const howToPlay: HowToPlay = byLanguage({ en, 'en-US': enUS, de });
