# Mazewright

A tower defense with no road, built with [Phaser 4](https://phaser.io), TypeScript and Vite, part of
the [game hub](../../README.md).

Beetles come out of their burrows and walk to the cottage across an open lawn, always by the
shortest free way. Every hedge and tower you plant is a wall, so you build the maze they must walk:
the longer it is, and the more towers it passes, the fewer beetles get in. The one rule: a way
through must always stay open. A planting that would close the last way from a burrow (or trap a
beetle already on the lawn) is refused with an orange no-entry ring.

![Wave 8 on the Meadow: moths fly straight over the hedge maze while beetles walk it](cover.png)

## How to play

| Control | Action |
| --- | --- |
| Tap or click a tool, or keys 1 to 4 | Pick a hedge, bow, frost or cannon |
| Tap, click or drag on the lawn | Plant the tool there, or a whole line of them |
| Hover the lawn | See the new route before you plant |
| Tap or click a tower | Open its panel: Upgrade or Sell |
| Start wave, or Space | Send the next wave; once the last one is all out, send the next early for 5 gold |
| Speed button, or F | Play at double speed |
| Gardens | Back to the garden picker |

![A planting that would close the last way through is refused](docs/screenshots/refused.webp)

### Gardens

![The garden picker](docs/screenshots/gardens.webp)

Three gardens, each with its own rocks and burrows, so each asks for its own maze: the open
**Meadow**, the **Orchard** with its rows of rocks, and the **Millpond** with one burrow at the top
and the cottage in the corner. Rocks never move and nothing is planted on them. The picker shows
the best wave reached in each garden.

### Towers

Every tower stands on a hedge and blocks its tile. Bows, frost and cannons rise to level 3; selling
gives back 70% of what a tower cost.

| Tower | Cost | Reach | What it does |
| --- | --- | --- | --- |
| Hedge | 4 | | Only blocks the way: the cheap way to make the maze longer |
| Bow | 10 | 3 tiles | Quick single shots at the foe closest to the cottage; hits moths |
| Frost | 15 | 2.5 tiles | A pulse every second that chills (slows to about half) and nicks everything near it |
| Cannon | 25 | 3.5 tiles | Slow shots that hit every foe on the ground around the target; not moths |

### Foes

| Foe | | Lives it costs |
| --- | --- | --- |
| Beetle | the usual walker | 1 |
| Ladybird | quick and frail | 1 |
| Stag beetle | slow and tough | 2 |
| Moth | flies straight from its burrow to the cottage, over the maze | 1 |
| Mole | walks the maze, but chews through a hedge (not a tower) that stands in the way of a much shorter route | 1 |
| Beetle queen | waves 10 and 20, very tough | 5 |

![A mole chewing through the first hedge](docs/screenshots/mole.webp)

There are 20 waves, each tougher than the last. The second burrow opens at wave 6, and from then on
foes come out of both in turn, so the maze has to serve two routes; both must stay open from the
start. Beaten foes pay gold, and a held wave pays 6 more plus its number. Hold all 20 to save the
garden.

**Difficulty** (hub setting): Easy gives 30 lives and foes 20% less health, Hard 12 lives and 25%
more health; Normal is 20 lives.

## Code layout

- `src/game/rules.ts`: the grid size, towers, foes, waves and tuning numbers.
- `src/game/maps.ts`: the three gardens (burrows, cottage, rocks).
- `src/game/grid.ts`: the walking field (steps from every tile to the cottage) and routes.
- `src/game/sim.ts`: a game: building and the never-close rule, foes, shots, waves and events.
- `src/game/save.ts`: the best wave per garden.
- `src/scenes/GameScene.ts`: the garden picker and the game screen: input, drawing and the bars.
- `src/scenes/art.ts`, `layout.ts`: the flat vector art and where things go.
- `src/audio.ts`: music and sound effects.
- `src/i18n/`: the texts in British English, US English and German; `src/howToPlay.ts`.
- `e2e/playthrough.spec.ts`: plays the first wave.

Run it with `npm run dev` from the repo root and open `/games/mazewright/`.
