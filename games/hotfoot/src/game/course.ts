import { LEAD_IN, STAGE_LEN, type GameState, type TrapKind } from './state';

// Lays out a stage's traps and coins between its start and its checkpoint. Traps come closer
// together on later stages; every random pick goes through Math.random so a seeded run repeats.

/** No trap this close before the checkpoint, so the knight lands before reaching it. */
const CLEAR_BEFORE_CHECKPOINT = 420;

const pickOf = <T>(items: T[]) => items[Math.floor(Math.random() * items.length)];

/** Room between one trap and the next on a stage: at least the length of a jump and a landing. */
export function gapsOf(stage: number) {
  const min = Math.max(300, 440 - 25 * (stage - 1));
  return { min, max: min + 200 };
}

function widthOf(kind: TrapKind) {
  if (kind === 'spikes') return 36 + 12 * Math.floor(Math.random() * 3);
  if (kind === 'pit') return 80 + 16 * Math.floor(Math.random() * 3);
  return 26;
}

export function buildStage(s: GameState) {
  const end = s.checkpointX - CLEAR_BEFORE_CHECKPOINT;
  const { min, max } = gapsOf(s.stage);
  const id = () => s.nextId++;
  let x = s.stageStart + LEAD_IN;
  let last: TrapKind | null = null;
  // The first stage shows each trap once before mixing them up.
  const opening: TrapKind[] = s.stage === 1 ? ['spikes', 'blade', 'pit'] : [];
  // A row of coins on the clear run, to show the way.
  for (let i = 0; i < 5; i++) s.course.push({ id: id(), x: s.stageStart + 300 + i * 40, h: 12, pulled: false });
  while (x < end) {
    // Spikes come up most often, and a pit never follows a pit.
    const kinds: TrapKind[] = ['spikes', 'spikes', 'blade', 'pit'].filter((k) => !(k === 'pit' && last === 'pit')) as TrapKind[];
    const kind = opening.shift() ?? pickOf(kinds);
    last = kind;
    const w = widthOf(kind);
    s.traps.push({ id: id(), kind, x, w });
    const mid = x + w / 2;
    if (kind === 'blade') {
      // Low coins under the blade, picked up on a slide.
      for (const dx of [-30, 0, 30]) s.course.push({ id: id(), x: mid + dx, h: 10, pulled: false });
    } else {
      // An arc of coins over the jump.
      for (const [dx, h] of [[-44, 70], [0, 104], [44, 70]]) s.course.push({ id: id(), x: mid + dx, h, pulled: false });
    }
    x += w + min + Math.random() * (max - min);
  }
}

/** Starts the stage after a checkpoint, right where the last one ended. */
export function nextStage(s: GameState) {
  s.stage += 1;
  s.stageStart = s.checkpointX;
  s.checkpointX = s.stageStart + STAGE_LEN;
  buildStage(s);
}
