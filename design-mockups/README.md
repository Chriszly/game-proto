# Design mockups

Concept mockups for the games in this hub, made to discuss gameplay and art direction. They are
drawings of proposed screens, not game code or real art, and no game loads anything from this folder.

- `<game>.svg` and `<game>.png`: one mockup per game in the clean vector direction, each with the
  proposed change to its loop.
- `direction-<style>.svg` and `.png`: one board per design direction (`vector`, `lowpoly`,
  `handdrawn`) showing the same three games in that style.

Regenerate the SVGs with `node design-mockups/generate.mjs`. The PNGs are screenshots of the SVGs
in Chromium at their own size (1280x720 for a game, 1700x820 for a direction board).
