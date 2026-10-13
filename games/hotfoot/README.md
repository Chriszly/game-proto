# Hotfoot

An auto-runner prototype built with [Phaser 4](https://phaser.io), TypeScript and Vite, part of
the [game hub](../../README.md).

A knight runs along an old road at dusk and never stops. Spikes, pits and fire vents lie in the
road, spiked logs hang over it on chains, goblins walk it and bats swoop along it, and old castle
walls raise stretches of it into ledges: jump the spikes, pits, flames and goblins and up onto the
ledges, slide under the logs and bats, and pick up the coins on the way. Every stage ends at a checkpoint, a banner by a campfire, where the run waits on a choice
of two boons. The knight keeps every boon until they fall, and each stage after runs a little faster
with the traps a little closer together.

![The knight jumping, with a blade ahead](docs/screenshots/playthrough-0-jump.png)

## How to play

| Control | Action |
| --- | --- |
| Tap the top half of the screen, or Space / Up / W | Jump (again in the air with Second Leap) |
| Tap the bottom half of the screen, or Down / S | Slide; in the air, drop fast and slide on landing |
| Tap a card | Take that boon at a checkpoint |
| Run again | After a fall: a new run from the start, with no boons |

A hint on the first stretch of the run shows where to tap.

![Where to tap](docs/screenshots/controls.png)

1. **Traps**: spikes and pits are jumped, blades are slid under. A fire vent only burns part of the
   time, flaring after a short sputter; jump it, or run over it while it is out.
2. **Foes**: goblins walk back and forth along their stretch of road and are jumped; bats fly in at
   head height and are slid under. Landing on either from above knocks it out for a coin and
   bounces the knight back up.
3. **Ledges**: raised stretches of road to jump up onto, and drop off the far end of. Running into
   the side of one hurts, and the knight scrambles up it. Later stages have steps: a low ledge
   followed by a taller one.
4. **What turns up**: the first stage shows spikes, a blade, a goblin and a ledge once each before
   mixing them up with pits. Fire vents and bats join from stage 2, and steps and tall ledges from
   stage 3.
5. **Hearts**: the knight starts with three. A trap, a foe or a ledge's side takes one, and the knight blinks for a moment in
   which nothing can hurt them. Falling into a pit throws them back out. **The run is over when the
   last heart is gone.**
6. **Coins** lie in arcs over the spikes, pits and fire vents, in rows under the blades and bats,
   high over the goblins and along the tops of the ledges.
7. **Checkpoints** come every 100 m. The run waits while two different boons are offered.
8. **Stages** speed up from 260 to at most 480 pixels a second, the room between obstacles shrinks,
   and goblins and bats get quicker.
   Only the best distance is saved between runs.

![Sliding under a blade, with a pit ahead](docs/screenshots/slide.png)

![A goblin walking the road](docs/screenshots/goblin.png)

![Stomping a goblin](docs/screenshots/stomp.png)

![Jumping up onto a ledge](docs/screenshots/ledge.png)

![A fire vent flaring](docs/screenshots/flames.png)

![A bat flying in](docs/screenshots/bat.png)

![Steps up to a tall ledge](docs/screenshots/steps.png)

![The checkpoint](docs/screenshots/checkpoint-flag.png)

### Boons

| Boon | Ranks | What it does |
| --- | --- | --- |
| Hearty Ale | 3 | One more heart, and one heart back |
| Winged Boots | 3 | Jump 12% higher |
| Second Leap | 1 | Jump again once in the air |
| Aegis | 2 | Shrug off the first hit after each checkpoint (two with rank 2) |
| Lodestone | 3 | Coins fly to the knight from further off |
| Golden Greed | 3 | Each coin is worth one more |
| Oiled Greaves | 2 | Slides last 30% longer |
| Shadow Cloak | 2 | Stay unhurt 50% longer after a hit |
| Field Dressing | any | Two hearts back; only offered once fewer than two other boons are left |

![Two boons at a checkpoint](docs/screenshots/playthrough-1-checkpoint.png)

![A hit](docs/screenshots/hit.png)

![After a fall](docs/screenshots/game-over.png)

The difficulty, set on the hub page's Settings, changes one thing: the knight starts with 5 hearts on Easy and 2 on Hard.

## Running locally

`npm run dev` at the repo root, then open `/games/hotfoot/` (or pick Hotfoot on the hub
page).

## Playthrough test

`e2e/playthrough.spec.ts` plays the first stage in headless Chromium: it checks the new run, taps
the top half of the screen to jump each spike row, pit and goblin and up onto each ledge, and the
bottom half to slide under each blade, as they come up, and checks that the knight reached the
checkpoint without a hit, jumping, sliding, getting past a goblin, running along a ledge and picking
up coins on the way. There it checks that the run waits on two different
boons, taps the first card, and checks that the boon was taken and the faster second stage has
begun. Like the other games' tests it owns the game clock and plays at 4x speed
(`PLAYTHROUGH_SPEED`). The **Playthrough Hotfoot** workflow
(`.github/workflows/playthrough-hotfoot.yml`) runs it on every PR that touches this folder or its
workflow, and uploads the video and screenshots as the
`playthrough-hotfoot` artifact.

```sh
npx playwright test --project hotfoot
```

## Code layout

All paths are inside `games/hotfoot/`.

- `src/game/`: the rules in plain TypeScript with no Phaser dependency. `state.ts` holds the run,
  the knight's and the traps' sizes and works out the knight's numbers from the boons taken,
  `course.ts` lays out each stage's traps, foes, ledges and coins, `boons.ts` is the table of boons, `sim.ts`
  moves the run on (foes, ledges and stomps included), jumps, slides and takes boons, and `save.ts` keeps the best distance.
- `src/scenes/`: `BootScene` bakes textures, `GameScene` draws the run and wires taps and keys to
  the rules, `layout.ts` says where things are drawn.
- `src/art/`: all the pixel art, drawn in code and baked into textures at startup: the knight's
  poses, the scrolling sky, hills and road, the ledges, the traps, the goblin and bat (`foes.ts`),
  coins, checkpoint and boon icons.
- `src/ui/`: the boon cards and buttons.

Adding a boon is an entry in `src/game/boons.ts`, its effect in `stats` in `src/game/state.ts`, and
an icon in `src/art/icons.ts`. Adding a trap is a kind in `state.ts` (with its height in
`TRAP_SPAN`), a piece in `course.ts` (`planOf` and `piecesOf`) and its art in `src/art/scenery.ts`.
