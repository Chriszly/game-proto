import type { UpgradeKind } from '../game/rules';
import type { ArtStyle } from '../game/save';
import { burst, ink } from './comic';
import { TAU, canvas, circle, mix, path, rgba, rng, type Ctx, type Pt } from './paint';
import { COMIC, NV, UPGRADE_COLORS } from './theme';

// The page around the portrait game, on screens wider than it: comic panels in the comic style, an
// overwatch console in night vision. It is a canvas behind the game's canvas, painted in "design
// units" (each side is a 656x1080 box, as on a 1920x1080 screen) and scaled to fit the space.
// The still parts are painted once per size and style; the captions, roster and readouts are
// repainted when the scene calls `refresh`.

export interface BackdropInfo {
  wave: number;
  best: number;
  kills: number;
  over: boolean;
  /** Seconds of game time in this run, for the feed's REC clock. */
  seconds: number;
  squad: number;
  maxSquad: number;
  damage: number;
  rate: string;
  pierce: number;
  collected: Record<UpgradeKind, number>;
  /** Crates in the air right now. */
  inbound: UpgradeKind[];
  horde: number;
  bossWave: boolean;
  bossNext: boolean;
  nextBoss: number;
}

const SIDE = { w: 656, h: 1080 };
const LABELS: Record<UpgradeKind, string> = { companion: 'COMPANION +1', damage: 'DAMAGE +1', rate: 'FIRE RATE', pierce: 'PIERCE +1' };
const ROSTER = ['RAINES', 'OKAFOR', 'VOSS', 'IBARRA', 'KOWALSKI', 'NAKAMURA', 'DIALLO', 'REYES', 'LINDQVIST'];

export class Backdrop {
  private el: HTMLCanvasElement;
  private still: HTMLCanvasElement | null = null;
  private stillKey = '';
  private style: ArtStyle = 'comic';
  private info: BackdropInfo | null = null;

  constructor(private frame: () => HTMLCanvasElement | undefined) {
    this.el = document.createElement('canvas');
    this.el.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:0;pointer-events:none';
    // Decoration only: marked so the hub test can tell it from the game's canvas.
    this.el.dataset.backdrop = '';
    this.el.setAttribute('aria-hidden', 'true');
    document.body.prepend(this.el);
    window.addEventListener('resize', () => requestAnimationFrame(() => this.paint()));
  }

  setStyle(style: ArtStyle) {
    this.style = style;
    this.paint();
  }

  refresh(info: BackdropInfo) {
    this.info = info;
    this.paint();
  }

  /** The game's frame on the page, in CSS pixels. */
  private layout() {
    const W = window.innerWidth, H = window.innerHeight;
    const r = this.frame()?.getBoundingClientRect();
    const left = r && r.width ? r.left : W / 2 - (H * 540) / 960 / 2;
    const width = r && r.width ? r.width : (H * 540) / 960;
    const side = Math.min(left, W - left - width);
    const k = Math.min(H / SIDE.h, side / SIDE.w);
    return { W, H, left, right: left + width, k, top: (H - SIDE.h * k) / 2, show: side > 140 };
  }

  private paint() {
    const L = this.layout(), dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.round(L.W * dpr), h = Math.round(L.H * dpr);
    if (this.el.width !== w || this.el.height !== h) {
      this.el.width = w;
      this.el.height = h;
    }
    const key = `${this.style}|${w}|${h}|${Math.round(L.left)}`;
    if (key !== this.stillKey) {
      this.stillKey = key;
      this.still = canvas(w, h);
      const c = this.still.getContext('2d')!;
      c.scale(dpr, dpr);
      if (this.style === 'comic') comicStill(c, L);
      else nvStill(c, L);
    }
    const ctx = this.el.getContext('2d')!;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(this.still!, 0, 0);
    if (!L.show || !this.info) return;
    ctx.scale(dpr, dpr);
    for (const sideX of [L.left - SIDE.w * L.k, L.right]) {
      ctx.save();
      ctx.translate(sideX, L.top);
      ctx.scale(L.k, L.k);
      const isLeft = sideX < L.left;
      if (this.style === 'comic') comicLive(ctx, this.info, isLeft);
      else nvLive(ctx, this.info, isLeft);
      ctx.restore();
    }
  }
}

type Layout = ReturnType<Backdrop['layout']>;

function txt(ctx: Ctx, s: string, x: number, y: number, o: { font: string; color: string; align?: CanvasTextAlign; ls?: number; glow?: string }) {
  ctx.save();
  ctx.font = o.font;
  ctx.textAlign = o.align ?? 'left';
  ctx.textBaseline = 'middle';
  if (o.ls) ctx.letterSpacing = `${o.ls}px`;
  if (o.glow) {
    ctx.shadowColor = rgba(o.glow, 0.7);
    ctx.shadowBlur = 8;
  }
  ctx.fillStyle = o.color;
  ctx.fillText(s, x, y);
  ctx.restore();
}

/** Runs `draw` once for each side box, in design units. */
function sides(ctx: Ctx, L: Layout, draw: (left: boolean) => void) {
  if (!L.show) return;
  for (const sideX of [L.left - SIDE.w * L.k, L.right]) {
    ctx.save();
    ctx.translate(sideX, L.top);
    ctx.scale(L.k, L.k);
    draw(sideX < L.left);
    ctx.restore();
  }
}

// ---------- Comic ----------

const CINK = COMIC.ink;
const CF = COMIC.canvasFont;

function comicStill(ctx: Ctx, L: Layout) {
  const rnd = rng(5);
  ctx.fillStyle = '#e9dfc6';
  ctx.fillRect(0, 0, L.W, L.H);
  // Paper fibre.
  for (let i = 0; i < (L.W * L.H) / 500; i++) {
    ctx.fillStyle = `rgba(120,100,70,${rnd() * 0.08})`;
    ctx.fillRect(rnd() * L.W, rnd() * L.H, 1 + rnd() * 2, 1);
  }
  sides(ctx, L, (left) => (left ? comicLeft(ctx) : comicRight(ctx)));
  // The gutter round the game's own panel.
  ctx.fillStyle = CINK;
  ctx.fillRect(L.left - 6, 0, 6, L.H);
  ctx.fillRect(L.right, 0, 6, L.H);
}

function panel(ctx: Ctx, x: number, y: number, w: number, h: number, draw: () => void) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  draw();
  ctx.restore();
  ctx.lineWidth = 6;
  ctx.strokeStyle = CINK;
  ctx.strokeRect(x, y, w, h);
}

function night(ctx: Ctx, x: number, y: number, w: number, h: number, moonX: number, moonY: number) {
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, '#1d2a52');
  g.addColorStop(1, '#4a3a6a');
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  // Halftone glow round the moon.
  ctx.fillStyle = 'rgba(255,214,120,0.55)';
  for (let yy = y; yy < y + h; yy += 10) {
    for (let xx = x + ((yy / 10) % 2) * 5; xx < x + w; xx += 10) {
      const r = Math.max(0, 4.2 - Math.hypot(xx - moonX, yy - moonY) / 70);
      if (r > 0.3) {
        ctx.beginPath();
        ctx.arc(xx, yy, r, 0, TAU);
        ctx.fill();
      }
    }
  }
  circle(ctx, moonX, moonY, 64, '#ffe9a8', CINK, 4);
  circle(ctx, moonX - 20, moonY - 12, 12, '#f2d68a');
  circle(ctx, moonX + 18, moonY + 16, 8, '#f2d68a');
}

function skyline(ctx: Ctx, x0: number, x1: number, base: number, rnd: () => number) {
  ctx.fillStyle = '#141626';
  ctx.beginPath();
  ctx.moveTo(x0, base + 400);
  let x = x0;
  while (x < x1) {
    const w = 40 + rnd() * 70, hh = 80 + rnd() * 200;
    ctx.lineTo(x, base - hh);
    if (rnd() < 0.4) {
      ctx.lineTo(x + w * 0.3, base - hh - 20 - rnd() * 30);
      ctx.lineTo(x + w * 0.5, base - hh);
    }
    ctx.lineTo(x + w, base - hh);
    x += w;
  }
  ctx.lineTo(x1, base + 400);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = CINK;
  ctx.lineWidth = 3;
  ctx.stroke();
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = rnd() < 0.2 ? '#ffd860' : 'rgba(0,0,0,0.35)';
    ctx.fillRect(x0 + rnd() * (x1 - x0), base - 20 - rnd() * 160, 8, 11);
  }
}

function comicLeft(ctx: Ctx) {
  const rnd = rng(11);
  // The moon over the dead city, a horde on the overpass.
  panel(ctx, 40, 40, 576, 640, () => {
    night(ctx, 40, 40, 576, 640, 400, 210);
    skyline(ctx, 20, 636, 620, rnd);
    ctx.fillStyle = CINK;
    ctx.fillRect(40, 560, 576, 18);
    for (let i = 0; i < 18; i++) {
      const zx = 60 + i * 31 + rnd() * 10, zy = 560;
      ctx.beginPath();
      ctx.ellipse(zx, zy - 30, 7, 8, 0, 0, TAU);
      ctx.fill();
      ctx.fillRect(zx - 7, zy - 24, 14, 24);
      ctx.fillRect(zx + 4, zy - 20, 14, 4);
    }
  });
  // A close-up of a rifle firing, on red halftone with speed lines.
  panel(ctx, 40, 740, 576, 300, () => {
    ctx.fillStyle = '#c24a2a';
    ctx.fillRect(40, 740, 576, 300);
    ctx.fillStyle = '#8a2a18';
    for (let yy = 740; yy < 1040; yy += 9) {
      for (let xx = 40 + ((yy / 9) % 2) * 4.5; xx < 616; xx += 9) {
        ctx.beginPath();
        ctx.arc(xx, yy, 1.2 + ((yy - 740) / 300) * 2.4, 0, TAU);
        ctx.fill();
      }
    }
    ctx.strokeStyle = 'rgba(255,230,190,0.7)';
    ctx.lineWidth = 3;
    for (let i = 0; i < 26; i++) {
      const a = rnd() * TAU;
      ctx.beginPath();
      ctx.moveTo(340 + Math.cos(a) * 120, 900 + Math.sin(a) * 90);
      ctx.lineTo(340 + Math.cos(a) * 420, 900 + Math.sin(a) * 300);
      ctx.stroke();
    }
    ctx.save();
    ctx.translate(100, 1030);
    ctx.rotate(-0.42);
    const sil = (pts: Pt[]) => {
      path(ctx, pts);
      ctx.fillStyle = CINK;
      ctx.fill();
    };
    sil([[0, -18], [90, -26], [100, 4], [10, 22]]);
    sil([[90, -24], [300, -22], [300, 6], [96, 8]]);
    sil([[150, 6], [176, 6], [186, 64], [162, 66]]);
    sil([[200, 6], [214, 6], [210, 34], [198, 34]]);
    sil([[300, -16], [470, -14], [470, -2], [300, 0]]);
    sil([[300, -34], [330, -34], [330, -22], [300, -22]]);
    ctx.strokeStyle = 'rgba(255,230,190,0.45)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(100, -18);
    ctx.lineTo(290, -16);
    ctx.stroke();
    ink(ctx, () => {
      ctx.beginPath();
      ctx.ellipse(205, 0, 26, 18, 0, 0, TAU);
    }, '#3e4a2a', { sh: 0, lw: 3 });
    ink(ctx, () => {
      ctx.beginPath();
      ctx.ellipse(360, -2, 22, 14, 0, 0, TAU);
    }, '#3e4a2a', { sh: 0, lw: 3 });
    ctx.restore();
  });
  burst(ctx, 440, 820, 50, 92, 12, '#fff3a0', { lw: 4, sx: 1.5, seed: 2 });
  ctx.save();
  ctx.font = `italic 900 46px ${CF}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 8;
  ctx.strokeStyle = CINK;
  ctx.strokeText('BLAM!', 440, 822);
  ctx.fillStyle = '#e8402a';
  ctx.fillText('BLAM!', 440, 822);
  ctx.restore();
}

function comicRight(ctx: Ctx) {
  const rnd = rng(23);
  // The road behind: a boss silhouette with glowing eyes.
  panel(ctx, 40, 40, 576, 470, () => {
    night(ctx, 40, 40, 576, 470, 180, 160);
    skyline(ctx, 20, 636, 480, rnd);
    const bx = 420, by = 510, sil = '#0d0c14';
    const fill = (pts: Pt[]) => {
      path(ctx, pts);
      ctx.fillStyle = sil;
      ctx.fill();
    };
    fill([[bx - 230, by], [bx - 210, by - 150], [bx - 150, by - 220], [bx - 70, by - 245], [bx - 40, by - 300], [bx - 20, by - 318], [bx + 20, by - 318], [bx + 40, by - 300], [bx + 70, by - 245], [bx + 150, by - 220], [bx + 210, by - 150], [bx + 230, by]]);
    fill([[bx - 210, by - 150], [bx - 260, by - 40], [bx - 250, by], [bx - 200, by]]);
    fill([[bx + 210, by - 150], [bx + 260, by - 40], [bx + 250, by], [bx + 200, by]]);
    ctx.strokeStyle = 'rgba(255,214,120,0.55)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(bx - 210, by - 150);
    ctx.lineTo(bx - 150, by - 220);
    ctx.lineTo(bx - 70, by - 245);
    ctx.lineTo(bx - 40, by - 300);
    ctx.lineTo(bx - 20, by - 318);
    ctx.stroke();
    ctx.save();
    ctx.shadowColor = '#ffd23f';
    ctx.shadowBlur = 20;
    circle(ctx, bx - 18, by - 280, 8, '#ffd23f');
    circle(ctx, bx + 18, by - 280, 8, '#ffd23f');
    ctx.restore();
  });
  // A supply crate on its parachute.
  panel(ctx, 40, 550, 576, 490, () => {
    ctx.fillStyle = '#2c6a8a';
    ctx.fillRect(40, 550, 576, 490);
    ctx.fillStyle = '#1d4a66';
    for (let yy = 550; yy < 1040; yy += 10) {
      for (let xx = 40 + ((yy / 10) % 2) * 5; xx < 616; xx += 10) {
        ctx.beginPath();
        ctx.arc(xx, yy, 1 + ((yy - 550) / 490) * 3, 0, TAU);
        ctx.fill();
      }
    }
    const cx = 330, cy = 850;
    ctx.lineWidth = 3;
    ctx.strokeStyle = CINK;
    ctx.beginPath();
    ctx.moveTo(cx - 80, cy - 70);
    ctx.lineTo(cx - 20, cy - 210);
    ctx.moveTo(cx + 80, cy - 70);
    ctx.lineTo(cx + 20, cy - 210);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(cx, cy - 220, 150, 70, 0, Math.PI, TAU);
    ctx.closePath();
    ctx.fillStyle = '#f1e8d2';
    ctx.fill();
    ctx.stroke();
    for (const k of [-100, -50, 0, 50, 100]) {
      ctx.beginPath();
      ctx.moveTo(cx + k, cy - 220);
      ctx.quadraticCurveTo(cx + k * 0.9, cy - 260, cx + k * 0.5, cy - 286 + Math.abs(k) * 0.12);
      ctx.stroke();
    }
    ctx.fillStyle = '#c0884a';
    ctx.fillRect(cx - 90, cy - 70, 180, 150);
    ctx.strokeRect(cx - 90, cy - 70, 180, 150);
    ctx.fillStyle = UPGRADE_COLORS.companion;
    ctx.fillRect(cx - 90, cy - 6, 180, 26);
    ctx.strokeRect(cx - 90, cy - 6, 180, 26);
    for (const k of [-40, 40]) {
      ctx.beginPath();
      ctx.moveTo(cx - 90, cy + k);
      ctx.lineTo(cx + 90, cy + k);
      ctx.stroke();
    }
  });
}

/** A narration caption: a tilted box with an ink drop shadow. */
function captionBox(ctx: Ctx, x: number, y: number, rot: number, fill: string, lines: { s: string; size: number; weight: number }[]) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  let w = 0;
  for (const l of lines) {
    ctx.font = `italic ${l.weight} ${l.size}px ${CF}`;
    w = Math.max(w, ctx.measureText(l.s).width);
  }
  w += 44;
  const h = lines.reduce((a, l) => a + l.size * 1.2, 0) + 26;
  ctx.fillStyle = CINK;
  ctx.fillRect(6, 6, w, h);
  ctx.fillStyle = fill;
  ctx.fillRect(0, 0, w, h);
  ctx.lineWidth = 4;
  ctx.strokeStyle = CINK;
  ctx.strokeRect(0, 0, w, h);
  let ly = 13;
  for (const l of lines) {
    ly += l.size * 0.6;
    txt(ctx, l.s, 22, ly, { font: `italic ${l.weight} ${l.size}px ${CF}`, color: CINK });
    ly += l.size * 0.6;
  }
  ctx.restore();
}

function comicLive(ctx: Ctx, d: BackdropInfo, left: boolean) {
  if (left) {
    const head = d.over ? `NIGHT ${d.wave}. THE LINE FELL.` : `NIGHT ${d.wave}. THE OLD HIGHWAY.`;
    const sub = d.over ? [`${d.kills} of them went down first.`, `Best night so far: ${d.best}.`] : ['Hold the sandbags. Nothing', 'gets past the line.'];
    captionBox(ctx, 70, 600, -0.02, '#ffe04a', [
      { s: head, size: 26, weight: 900 },
      { s: sub[0], size: 22, weight: 700 },
      { s: sub[1], size: 22, weight: 700 },
    ]);
  } else {
    const boss = d.bossWave ? "IT'S HERE. SHOOT IT DOWN!" : d.bossNext ? 'NEXT WAVE: SOMETHING BIG...' : `SOMETHING BIG COMES AT WAVE ${d.nextBoss}...`;
    captionBox(ctx, 76, 440, 0.02, '#fff8e8', [{ s: boss, size: 22, weight: 900 }]);
    const drop = d.inbound.length ? 'Supplies! Shoot it open!' : `Squad: ${d.squad} of ${d.maxSquad}. Hold on.`;
    captionBox(ctx, 66, 960, -0.03, '#ffe04a', [{ s: drop, size: 22, weight: 900 }]);
  }
}

// ---------- Night vision ----------

const MONO = NV.canvasFont;
const PH = NV.text;
const AMB = NV.accent;
const DIM = '#7da882';

function plate(ctx: Ctx, x: number, y: number, w: number, h: number) {
  const gr = ctx.createLinearGradient(0, y, 0, y + h);
  gr.addColorStop(0, '#1a1e1c');
  gr.addColorStop(1, '#121514');
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 14);
  ctx.fillStyle = gr;
  ctx.fill();
  ctx.strokeStyle = '#2a302d';
  ctx.lineWidth = 2;
  ctx.stroke();
  for (const [sx, sy] of [[x + 14, y + 14], [x + w - 14, y + 14], [x + 14, y + h - 14], [x + w - 14, y + h - 14]]) {
    circle(ctx, sx, sy, 5, '#262b29', '#0a0c0b', 1.5);
    ctx.beginPath();
    ctx.moveTo(sx - 3, sy - 3);
    ctx.lineTo(sx + 3, sy + 3);
    ctx.stroke();
  }
}

const mono = (size: number, w = 700) => `${w} ${size}px ${MONO}`;

function nvStill(ctx: Ctx, L: Layout) {
  const rnd = rng(17);
  ctx.fillStyle = '#0b0d0c';
  ctx.fillRect(0, 0, L.W, L.H);
  for (let i = 0; i < (L.W * L.H) / 230; i++) {
    ctx.fillStyle = `rgba(255,255,255,${rnd() * 0.025})`;
    ctx.fillRect(rnd() * L.W, rnd() * L.H, 1.5, 1.5);
  }
  sides(ctx, L, (left) => {
    plate(ctx, 40, 40, 576, 1000);
    if (left) {
      txt(ctx, 'OVERWATCH  CAM-2', 80, 96, { font: mono(24), color: PH, ls: 2, glow: '#7dff8a' });
      txt(ctx, 'IR ILLUM  ON', 80, 182, { font: mono(18), color: DIM });
      txt(ctx, 'GAIN  +18dB', 330, 182, { font: mono(18), color: DIM });
      ctx.fillStyle = '#1e2421';
      ctx.fillRect(80, 210, 496, 2);
      for (let i = 0; i < 5; i++) {
        ctx.fillStyle = i < 4 ? '#6adf78' : '#2a332d';
        ctx.fillRect(80 + i * 16, 262 - i * 8, 10, 12 + i * 8);
      }
      txt(ctx, 'LINK 92%', 180, 262, { font: mono(18), color: DIM });
      ctx.beginPath();
      ctx.roundRect(380, 246, 120, 30, 4);
      ctx.strokeStyle = '#6adf78';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#6adf78';
      ctx.fillRect(386, 252, 80, 18);
      ctx.fillRect(502, 255, 6, 12);
      // The strip map: a grid with the highway winding through it.
      ctx.beginPath();
      ctx.roundRect(80, 320, 496, 560, 10);
      ctx.fillStyle = '#0e1411';
      ctx.fill();
      ctx.strokeStyle = '#26302b';
      ctx.stroke();
      ctx.save();
      ctx.beginPath();
      ctx.rect(80, 320, 496, 560);
      ctx.clip();
      ctx.strokeStyle = '#1c2a22';
      ctx.lineWidth = 1;
      for (let x = 80; x < 580; x += 31) {
        ctx.beginPath();
        ctx.moveTo(x, 320);
        ctx.lineTo(x, 880);
        ctx.stroke();
      }
      for (let y = 320; y < 880; y += 31) {
        ctx.beginPath();
        ctx.moveTo(80, y);
        ctx.lineTo(576, y);
        ctx.stroke();
      }
      ctx.strokeStyle = '#3a5a44';
      ctx.lineWidth = 46;
      ctx.beginPath();
      ctx.moveTo(140, 900);
      ctx.bezierCurveTo(300, 760, 260, 560, 420, 430);
      ctx.lineTo(520, 300);
      ctx.stroke();
      ctx.strokeStyle = '#5a8a66';
      ctx.setLineDash([10, 10]);
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.setLineDash([]);
      circle(ctx, 205, 830, 7, '#6adf78');
      txt(ctx, 'SQUAD', 222, 830, { font: mono(16), color: '#6adf78' });
      txt(ctx, 'SECTOR 7 · HWY 41', 100, 352, { font: mono(16), color: '#5a7a62' });
      ctx.restore();
      txt(ctx, 'KEEP THE ROAD CLEAR', 80, 990, { font: mono(16), color: '#4a6a52', ls: 3 });
    } else {
      txt(ctx, 'SUPPLY DROPS', 80, 560, { font: mono(20), color: PH, ls: 2 });
      ctx.fillStyle = '#1e2421';
      ctx.fillRect(80, 848, 496, 2);
      txt(ctx, 'NV-7 OVERWATCH SYSTEM', 80, 990, { font: mono(16), color: '#4a6a52', ls: 3 });
    }
  });
  // The feed's bezel.
  ctx.strokeStyle = '#2a302d';
  ctx.lineWidth = 4;
  ctx.strokeRect(L.left - 2, -4, L.right - L.left + 4, L.H + 8);
}

function nvLive(ctx: Ctx, d: BackdropInfo, left: boolean) {
  if (left) {
    const s = d.seconds, clock = [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60].map((n) => String(n).padStart(2, '0')).join(':');
    circle(ctx, 86, 140, 7, d.over ? '#5a2a20' : '#ff4a2a');
    txt(ctx, `${d.over ? 'FEED LOST' : 'REC'}  ${clock}`, 104, 141, { font: mono(20), color: '#ff9a7a' });
    // The horde on the strip map: one dot for every zombie on the road, along the highway.
    const rnd = rng(41);
    ctx.save();
    ctx.beginPath();
    ctx.rect(80, 320, 496, 560);
    ctx.clip();
    for (let i = 0; i < Math.min(d.horde, 60); i++) {
      const t = 0.35 + rnd() * 0.55;
      const x = 140 + 280 * t + (rnd() - 0.5) * 30 + 40, y = 900 - 470 * t + (rnd() - 0.5) * 20;
      circle(ctx, x, y, 3, '#ff8a5a');
    }
    ctx.restore();
    txt(ctx, `HORDE ${d.horde}`, 420, 560, { font: mono(16), color: '#ff8a5a' });
    // Threat: how far into the night the squad is.
    txt(ctx, 'THREAT', 80, 924, { font: mono(18), color: DIM });
    const lit = Math.min(12, 2 + d.wave + (d.bossWave ? 3 : 0));
    for (let i = 0; i < 12; i++) {
      ctx.fillStyle = i < lit ? mix('#6adf78', '#ff6a3a', i / 11) : '#26302b';
      ctx.fillRect(170 + i * 32, 912, 26, 22);
    }
    txt(ctx, lit > 8 ? 'HIGH' : lit > 4 ? 'MED' : 'LOW', 576, 924, { font: mono(18), color: lit > 8 ? '#ff8a5a' : DIM, align: 'right' });
    return;
  }
  txt(ctx, `SQUAD  ${d.squad}/${d.maxSquad}`, 80, 96, { font: mono(24), color: PH, ls: 2, glow: '#7dff8a' });
  // The roster: the six slots that fit, the rest summed up on the last row.
  for (let i = 0; i < 6; i++) {
    const y = 150 + i * 62, on = i < d.squad;
    ctx.beginPath();
    ctx.roundRect(80, y, 496, 50, 6);
    ctx.fillStyle = '#151a17';
    ctx.fill();
    ctx.strokeStyle = '#26302b';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    circle(ctx, 106, y + 25, 7, on ? '#6adf78' : '#2f3a33');
    const more = i === 5 && d.squad > 6;
    txt(ctx, more ? `+${d.squad - 5} MORE` : on ? ROSTER[i] : '—', 128, y + 25, { font: mono(19), color: on ? PH : '#3f4d44' });
    txt(ctx, i === 0 ? 'LEAD' : on ? 'RIFLE' : 'OPEN SLOT', 556, y + 25, { font: mono(16), color: on ? DIM : '#3f4d44', align: 'right' });
  }
  (['companion', 'damage', 'rate', 'pierce'] as UpgradeKind[]).forEach((k, i) => {
    const y = 600 + i * 56, col = UPGRADE_COLORS[k];
    ctx.save();
    ctx.shadowColor = col;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.roundRect(80, y + 10, 10, 28, 5);
    ctx.fillStyle = col;
    ctx.fill();
    ctx.restore();
    txt(ctx, LABELS[k], 106, y + 24, { font: mono(19), color: PH });
    const status = d.inbound.includes(k) ? 'INBOUND' : d.collected[k] ? `TAKEN x${d.collected[k]}` : '—';
    txt(ctx, status, 556, y + 24, { font: mono(16), color: d.inbound.includes(k) ? AMB : DIM, align: 'right' });
  });
  txt(ctx, `VOLLEY ${d.rate}`, 80, 890, { font: mono(20), color: DIM });
  txt(ctx, `PIERCE ${d.pierce}`, 556, 890, { font: mono(20), color: DIM, align: 'right' });
  txt(ctx, `DMG ${d.damage}`, 80, 930, { font: mono(20), color: DIM });
  txt(ctx, `BEST WAVE ${d.best}`, 556, 930, { font: mono(20), color: AMB, align: 'right' });
}


