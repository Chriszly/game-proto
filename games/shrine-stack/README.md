# Shrine Stack

A stacking prototype built with [Phaser 4](https://phaser.io), TypeScript and Vite, part of the
[game hub](../../README.md).

Raise a temple on a hilltop at dusk. A stone swings back and forth above the temple; tap to drop
it. Whatever hangs over the stone below breaks off and tumbles away, so a careless drop narrows the
temple for good. Every three stones make a tier, and a tier whose stones all landed well is
balanced: it earns favor, gold trim and lanterns, and a blessing of your choice.

![A temple of three balanced tiers](cover.png)

## How to play

| Control | Action |
| --- | --- |
| Tap or click anywhere | Drop the swinging stone |
| Tap or click a blessing card | Keep that blessing after a balanced tier |
| Build again | After the temple falls: start again on a bare plinth |

1. **Drop the stone over the one below.** Only the part resting on it stays; the overhang breaks
   off, and the next stone is as wide as what is left.
2. **Perfect drops**, within 5 pixels of the stone below, snap on whole and earn 2 extra favor.
3. **Tiers**: three stones make a tier. A tier is balanced when each of its stones kept at least
   three quarters of its width; it earns 5 favor and offers three blessings to choose from. A
   wobbly tier earns nothing extra. Each tier swings 5% faster than the one before.
4. **The end** comes when a stone misses the temple. The most tiers built in one temple are saved
   in the browser.

![The first stone landed perfectly](docs/screenshots/playthrough-1-first-stone.png)

### Blessings

| Blessing | Effect |
| --- | --- |
| Broad Stones | The top stone grows 40 pixels wider, up to the plinth's width. |
| Calm Winds | Stones swing 15% slower from now on. |
| Steady Hands | The perfect drop window grows by 6 pixels. |
| Golden Offering | Every stone placed earns 1 more favor. |
| Mason's Grace | The next stone that misses is caught, and you get another try. |

Blessings can be taken more than once, and they add up.

![Choosing a blessing after a balanced tier](docs/screenshots/playthrough-2-blessing.png)

![The temple has fallen](docs/screenshots/game-over.png)

The difficulty, set on the hub page's Settings, changes one thing: stones swing 20% slower on Easy
and 25% faster on Hard.

## Running locally

`npm run dev` at the repo root, then open `/games/shrine-stack/` (or pick Shrine Stack on the hub
page).

## Playthrough test

`e2e/playthrough.spec.ts` plays the first round in headless Chromium: it checks the new temple and
that the first stone swings, drops each of the first tier's three stones with a tap while it is
over the stone below (checking that a second tap while it falls drops nothing), checks the balanced
tier's favor and its three blessings, and takes the first one, checking its effect as tier 2
starts. Like the other games' tests it owns the game clock and plays at 4x speed
(`PLAYTHROUGH_SPEED`). The **Playthrough Shrine Stack** workflow
(`.github/workflows/playthrough-shrine-stack.yml`) runs it on every PR that touches this folder or
the workflow, and uploads the video and screenshots as the `playthrough-shrine-stack` artifact.

```sh
npx playwright test --project shrine-stack
```

## Code layout

All paths are inside `games/shrine-stack/`.

- `src/game/`: the rules in plain TypeScript with no Phaser dependency. `state.ts` has the
  swinging, dropping, cutting, tiers and blessing effects, `blessings.ts` the blessing names and
  texts, and `save.ts` the best height.
- `src/scenes/`: `GameScene` draws the sky, the temple, the panel, the blessing cards and the
  game-over panel and wires taps to the rules; `layout.ts` says where things are drawn.
- `src/ui/`: the button.

Balance numbers (swing speed, the perfect window, the balance share, favor) are the constants at
the top of `src/game/state.ts`.
