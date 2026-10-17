/**
 * What a game's How to play screen says. Each game writes its own in `src/howToPlay.ts` and hands
 * it to `setupGame(game, { howToPlay })`; the start and pause screens then show a How to play
 * button that opens it (`startScreen.ts`).
 */
export interface HowToPlay {
  /** One or two sentences: what the player is trying to do, and how a run is won or lost. */
  goal: string;
  /** Each control and what it does, with the touch or mouse way next to the key where both work. */
  controls: { input: string; action: string }[];
  /** The core loop, one step per line, in the order a first round goes through it. */
  loop: string[];
  /** Further rules worth knowing before playing, one short line each. */
  tips: string[];
}
