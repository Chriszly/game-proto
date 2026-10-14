# Golem Garden

A tower defense prototype built with [Phaser 4](https://phaser.io), TypeScript and Vite, part of the
[game hub](../../README.md).

Pests are coming down the garden path to eat the Heartwood, the great tree at its end. Plant seeds
in the soil beside the path: each one grows into a golem that throws rocks or moss at the pests
within reach. Squashed pests drop sap, which buys more seeds and raises your golems' levels. Every
wave you clear opens a bud on the Heartwood, and a tree in full bloom gives you a third seed, the
Thorn golem. Hold out as many waves as you can.

Everything is claymation: hand-rolled plasticine on a studio table, with fingerprint smudges and
soft highlights, lumpy golems with bead eyes, a pressed clay path, soil pads with tool-cut furrows
and pressed lettering on clay tags. It is all painted in code at startup; there are no image files.

![Golems guarding the path on wave 4](cover.png)

## How to play

| Control | Action |
| --- | --- |
| Tap or click a seed card | Pick the seed to plant (the Thorn golem's once it is unlocked) |
| Hover a soil cell | See how far the golem would reach |
| Tap or click a soil cell | Plant the picked seed there, if you have the sap |
| Tap or click a golem | Raise it a level (up to 3), if you have the sap |
| Start wave | Send the next wave of pests down the path |
| Call wave N now | Once the current wave has all come in, send the next one early for bonus sap |
| Replant | After the Heartwood falls: start a new garden |

1. **Seeds grow first.** A seed takes a few seconds to grow into a golem, and only a grown golem
   fights. You can plant between waves and during them.
2. **Golems** throw at the pest furthest along the path within their reach:

   | Golem | Seed | Grows in | Damage | Reach | Throws every | Also |
   | --- | --- | --- | --- | --- | --- | --- |
   | Pebble golem | 30 sap | 3s | 7 | 110px | 0.7s | |
   | Moss golem | 50 sap | 4s | 3 | 140px | 0.8s | halves a pest's speed for 1.5s |
   | Thorn golem | 60 sap | 4s | 5 | 80px | 0.6s | pricks every pest within reach at once; locked until the Heartwood blooms |

   Raising a golem to level 2 costs 40 sap and to level 3 costs 70; each level adds 60% damage and
   12px of reach.
3. **Pests**: beetles (20 health, drop 5 sap), slugs from wave 2 (50 health, slow, drop 9, take 2
   off the Heartwood) and crows from wave 3 (14 health, fast, drop 6). Each wave brings more of
   them, with 12% more health per wave.
4. **The Heartwood** has 10 leaves. A pest that reaches it eats one (a slug two), and the garden is
   lost when none are left. Clearing a wave adds 10 + 5 x the wave's number in sap. The most waves
   ever cleared is saved in the browser.
5. **Heartwood bloom.** Each wave you clear (or call early, below) opens one of the five buds on the
   Heartwood, shown on the tree and in the top bar (for example 3/5). With all five open the tree is
   in bloom and the Thorn golem's seed card unlocks; until then it shows a padlock and the buds
   still to go. The bloom belongs to one garden: a new garden after Replant starts with closed buds
   and the Thorn golem locked again.
6. **Call the next wave early.** Once every pest of the current wave has come onto the path, the
   wave button turns into "Call wave N now, +15 early". Tapping it counts the current wave as done
   at once (its clearing bonus and its bud) plus 15 sap, and the next wave starts coming in while the
   last pests are still walking. The card above the button previews the next wave's beetles, slugs
   and crows, counted from the game's own wave list, so you can weigh the sap against the crowd.
7. **Sap you can see.** A squashed pest leaves an orange splat and a "+N" pop, and its sap
   droplets fly in an arc to the sap counter, which glows as they land. With reduced motion on (hub
   Settings) the splat and "+N" stay put and fade, without the flying droplets or the glow.

![A seed just planted, growing](docs/screenshots/playthrough-1-sprout.png)

![Wave 1's beetles coming down the path](docs/screenshots/playthrough-2-wave.png)

![The Heartwood in full bloom, with Thorn golems planted and the Thorn golem's seed picked](docs/screenshots/heartwood-bloom.png)

![Wave 2's last pests on the path, with the button offering to call wave 3 early and its preview](docs/screenshots/call-early.png)

![Squashed pests leave splats and "+5" pops while sap droplets fly to the counter](docs/screenshots/sap-pops.png)

The difficulty, set on the hub page's Settings, changes one thing: pests have 25% less health on
Easy and 30% more on Hard.

## Running locally

`npm run dev` at the repo root, then open `/games/golem-garden/` (or pick Golem Garden on the hub
page).

## Playthrough test

`e2e/playthrough.spec.ts` plays the first wave in headless Chromium: it picks the pebble seed,
checks the locked Thorn golem card picks nothing, checks a tap on the path plants nothing, plants
two seeds by tapping soil, waits for them to grow, starts wave 1, checks the wave button offers to
call wave 2 early once all the beetles are in (without taking it), and checks the golems squash all
eight beetles before any reaches the Heartwood, with the sap they drop, the wave's bonus and the
Heartwood's first bud. Like the other games' tests it owns the game clock and plays
at 4x speed (`PLAYTHROUGH_SPEED`). The **Playthrough Golem Garden** workflow
(`.github/workflows/playthrough.yml`) runs it on pull requests that touch this folder
and uploads the video and screenshots as the `playthrough-golem-garden` artifact.

```sh
npx playwright test --project golem-garden
```

## Code layout

All paths are inside `games/golem-garden/`.

- `src/game/`: the rules in plain TypeScript with no Phaser dependency. `board.ts` has the grid
  and the path, `data.ts` the golems, pests and waves, `state.ts` planting, upgrading, calling
  waves and the tick that moves pests and makes golems throw, and `save.ts` the best wave.
- `src/scenes/`: `BootScene` bakes textures, `GameScene` draws the garden, the HUD and the seed
  panel and wires taps to the rules, `layout.ts` says where things are drawn.
- `src/art/`: `clay.ts` is the plasticine toolkit and the golem, pest, sprout and flower painters;
  `textures.ts` paints the table, garden, HUD, panel, cards and icons into textures at startup.
- `src/ui/`: the clay button.

Retuning a golem or a pest is its row in `GOLEM_INFO` or `PEST_INFO` in `src/game/data.ts`.
