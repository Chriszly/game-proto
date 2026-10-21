import { bridgeCount, bridgesTap, type BridgesState } from '../../game/puzzles/bridges';
import { C } from '../theme';
import { fitGrid, type PuzzleView } from './types';

export const bridgesView: PuzzleView<BridgesState> = {
  draw(ctx) {
    const { p, s, r } = ctx;
    const g = p.g;
    const { cell, x, y } = fitGrid(r, s.size, s.size, 56);
    const at = (i: number) => ({ x: x + s.islands[i].c * cell + cell / 2, y: y + s.islands[i].r * cell + cell / 2 });
    // Faint dots where islands could stand, like stars on a chart.
    for (let k = 0; k < s.size * s.size; k++) g.fillStyle(C.line, 1).fillCircle(x + (k % s.size) * cell + cell / 2, y + Math.floor(k / s.size) * cell + cell / 2, 1.5);
    for (const [key, n] of Object.entries(s.bridges)) {
      const [a, b] = key.split('-').map(Number).map(at);
      const across = a.y === b.y;
      g.lineStyle(n === 2 ? 2 : 2.5, C.gold, 1);
      if (n === 1) g.lineBetween(a.x, a.y, b.x, b.y);
      else {
        const [dx, dy] = across ? [0, 4] : [4, 0];
        g.lineBetween(a.x - dx, a.y - dy, b.x - dx, b.y - dy).lineBetween(a.x + dx, a.y + dy, b.x + dx, b.y + dy);
      }
    }
    const rad = cell * 0.36;
    s.islands.forEach((isl, i) => {
      const { x: cx, y: cy } = at(i);
      const have = bridgeCount(s, i);
      const ring = i === s.picked ? C.cyan : have === isl.n ? C.cyan : have > isl.n ? C.rose : C.gold;
      g.fillStyle(C.deep, 1).fillCircle(cx, cy, rad);
      g.lineStyle(i === s.picked ? 3 : 2, ring, 1).strokeCircle(cx, cy, rad);
      if (i === s.picked) g.lineStyle(1, C.cyan, 0.4).strokeCircle(cx, cy, rad + 6);
      for (let k = 0; k < 8; k++) {
        const a = (k * Math.PI) / 4;
        g.lineStyle(1, C.gold, 0.5).lineBetween(cx + Math.cos(a) * (rad + 3), cy + Math.sin(a) * (rad + 3), cx + Math.cos(a) * (rad + 7), cy + Math.sin(a) * (rad + 7));
      }
      p.text(cx, cy, String(isl.n), { size: Math.round(rad * 1.05), color: have === isl.n ? C.cyanText : C.goldText });
      p.hit(`island-${i}`, cx - cell / 2, cy - cell / 2, cell, cell, () => {
        const before = s.picked;
        const built = ctx.act((st) => bridgesTap(st, i));
        // Picking or letting go changes nothing worth undoing, but still shows; a bridge plays `place`.
        if (!built && s.picked !== before) ctx.tap(), ctx.redraw();
      });
    });
  },
};
