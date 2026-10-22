// The whole game in one scene: the chapter's strip of land, Bjarn, the foes and people in it, and
// the director that runs the chapter's events (`game/story.ts`). A new chapter swaps the strip's
// contents but keeps the scene.

import Phaser from 'phaser';
import { drawBjarn, drawClue, drawFoe, drawHerb, drawNpc, drawSquirrel, paintBackdrop, type Pose } from './art';
import { Hud, type Button } from './hud';
import {
  ATTACK_COST, BLOCK_COST, BURST_DRAIN, BURST_DRAIN_CALM, BURST_RAGE, DODGE_COST, EXHAUSTED_UNTIL, FOES, foeDamage, FORMS, GRIEF_RAGE, HERB_HEAL, HERB_HEAL_RECIPES,
  MAX_ATTACKERS, MAX_HP, MAX_STAMINA, PARRY_MS, RAGE_PER_HP, SHIFT_COUNTER_MS, SHIFT_MS, STAMINA_REGEN,
  type FoeKind, type FoeStats, type Form,
} from '../game/forms';
import { CHAPTERS, STORY, type Chapter, type ChapterId, type ClueId, type Event, type Line, type NpcId, type ScriptName, type Spawn } from '../game/story';
import { loadSave, newSave, writeSave, type SaveState } from '../game/state';
import { t } from '../i18n';
import { settings } from '../../../../shared/settings';
import { splitHudCamera, viewPoint, viewSize } from '../../../../shared/scaling';
import { playMusic, playSting } from '../../../../shared/audio';
import { sfx } from '../audio/sounds';
import { SAGA } from '../audio/music';

/** Where the ground is: this far above the view's bottom edge. */
const GROUND_FROM_BOTTOM = 110;
/** How close Bjarn has to be to look at a track or pick up herbs. */
const USE_PX = 70;
const HERB_PX = 30;
/** A press of strike, dodge or shift made during another action is kept this long and then done. */
const BUFFER_MS = 220;
/** After a hit: how long Bjarn flinches, and how long until he can be hurt again. */
const HURT_MS = 220;
const INVULN_MS = 380;
/** How long a parried or countered foe stands stunned. */
const STUN_MS = 1000;
/** How fast people walk in the story's little scenes. */
const NPC_SPEED = 130;

type Act =
  | { kind: 'attack'; t: number; dur: number; hit: boolean }
  | { kind: 'dodge'; t: number; dur: number; dir: number }
  | { kind: 'shift'; t: number; dur: number; to: Form }
  | { kind: 'hurt'; t: number; dur: number };

export interface Bjarn {
  x: number;
  facing: 1 | -1;
  form: Form;
  hp: number;
  stamina: number;
  rage: number;
  exhausted: boolean;
  /** The beast is out: the player only steers a little, and it fights on its own. */
  burst: boolean;
  act: Act | null;
  blocking: boolean;
  /** How long the block has been held: a hit within PARRY_MS of raising it is parried. */
  blockMs: number;
  invuln: number;
  walk: number;
  moving: boolean;
  flash: number;
  bloody: boolean;
  /** Lying on the ground: fallen, or waking up. */
  down: boolean;
}

export interface Foe {
  kind: FoeKind;
  stats: FoeStats;
  x: number;
  hp: number;
  maxHp: number;
  facing: 1 | -1;
  state: 'approach' | 'windup' | 'strike' | 'recover' | 'stunned' | 'hurt' | 'held' | 'dead';
  t: number;
  cooldown: number;
  unblockable: boolean;
  knock: number;
  walk: number;
  flash: number;
  /** Torvald's training stick: never hurts and can't be hurt. */
  harmless: boolean;
  g: Phaser.GameObjects.Graphics;
}

interface Npc {
  id: NpcId;
  x: number;
  facing: 1 | -1;
  target: number | null;
  walk: number;
  act: Pose['act'];
  actMs: number;
  g: Phaser.GameObjects.Graphics;
}

interface Dialog {
  lines: Line[];
  i: number;
  /** When the line came up: a press right after it is ignored, so a held key doesn't skip lines. */
  shownAt: number;
}

interface Floater {
  text: Phaser.GameObjects.Text;
  ms: number;
}

const SPEAKER_PITCH: Record<Line[0], number> = { bjarn: 1, father: 0.8, skarn: 0.6, ratatoskr: 1.8, torvald: 0.75, ulfgar: 0.65, sigrun: 1.25 };

export class GameScene extends Phaser.Scene {
  save!: SaveState;
  chapter!: Chapter;
  player!: Bjarn;
  foes: Foe[] = [];
  npcs: Npc[] = [];
  dialog: Dialog | null = null;
  /** The chapter's event in progress, and whether it has been started. */
  evi = 0;
  private evStarted = false;
  private scriptDone: (() => boolean) | null = null;
  /** Parries made in this chapter (Torvald's drill counts them). */
  parries = 0;
  /** The father is dead: rage climbs on its own until the beast breaks out. */
  private grief = false;
  /** The raid's outburst: the rage doesn't drain, and two kills as the hybrid bring out the bear. */
  private storyBurst = false;
  private burstKills = 0;
  private herbs: { x: number; g: Phaser.GameObjects.Graphics }[] = [];
  private clues: { id: ClueId; x: number; seen: boolean; g: Phaser.GameObjects.Graphics; prompt: Phaser.GameObjects.Text }[] = [];
  private squirrel: { x: number; hop: number; g: Phaser.GameObjects.Graphics } | null = null;
  private layers: Phaser.GameObjects.GameObject[] = [];
  private floaters: Floater[] = [];
  private playerG!: Phaser.GameObjects.Graphics;
  private ghostG!: Phaser.GameObjects.Graphics;
  private camTarget!: Phaser.GameObjects.Zone;
  private hud!: Hud;
  private groundY = 430;
  private viewW = 960;
  private viewH = 540;
  /** While a wave holds Bjarn on one screen: its left and right edge. */
  private arena: { l: number; r: number } | null = null;
  /** The furthest Bjarn may walk in this chapter (a `hold` event). */
  private frontier = Infinity;
  private fading = false;
  private now = 0;
  private music = '';
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  /** Touch buttons held, by pointer id, and presses since the last frame. */
  private touchHeld = new Map<number, Button>();
  private pressed = new Set<Button | 'click' | 'confirm'>();
  private buffer: { act: 'strike' | 'dodge' | 'shift'; ms: number } | null = null;
  private lastBossX = 900;

  constructor() {
    super('Game');
  }

  create() {
    ({ width: this.viewW, height: this.viewH } = viewSize(this));
    this.groundY = this.viewH - GROUND_FROM_BOTTOM;
    splitHudCamera(this);
    this.hud = new Hud(this);
    this.playerG = this.add.graphics().setDepth(10);
    this.ghostG = this.add.graphics().setDepth(9).setAlpha(0.3);
    this.camTarget = this.add.zone(0, this.viewH / 2, 1, 1);
    this.cameras.main.startFollow(this.camTarget, true, 0.12, 1);

    const kb = this.input.keyboard!;
    this.keys = kb.addKeys('A,D,LEFT,RIGHT,J,Z,K,X,L,C,SHIFT,Q,E,SPACE,ENTER') as Record<string, Phaser.Input.Keyboard.Key>;
    // Presses are caught as they happen, so a tap that goes down and up between two frames still counts.
    const PRESS_KEYS: Record<string, Button | 'confirm'> = { KeyJ: 'strike', KeyZ: 'strike', KeyL: 'dodge', KeyC: 'dodge', ShiftLeft: 'dodge', ShiftRight: 'dodge', KeyQ: 'shift', KeyE: 'use', Space: 'confirm', Enter: 'confirm' };
    kb.on('keydown', (e: KeyboardEvent) => {
      const press = PRESS_KEYS[e.code];
      if (press && !e.repeat) this.pressed.add(press);
    });
    this.input.addPointer(2);
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.pointerDown(p));
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => this.touchHeld.delete(p.id));
    this.input.on('pointerupoutside', (p: Phaser.Input.Pointer) => this.touchHeld.delete(p.id));
    // A paused scene never hears a finger lift, so let go of every touch button.
    this.events.on(Phaser.Scenes.Events.PAUSE, () => this.touchHeld.clear());

    this.save = loadSave();
    this.buildChapter(this.save.chapter);
  }

  private pointerDown(p: Phaser.Input.Pointer) {
    if (this.hud.cardOpen) return;
    if (p.wasTouch) this.hud.touch = true;
    const button = this.hud.buttonAt(viewPoint(p));
    if (button) {
      this.touchHeld.set(p.id, button);
      this.pressed.add(button);
    } else {
      this.pressed.add('click');
    }
  }

  // ------------------------------------------------------------------ chapters

  private buildChapter(id: ChapterId) {
    for (const o of this.layers) o.destroy();
    for (const f of this.foes) f.g.destroy();
    for (const n of this.npcs) n.g.destroy();
    for (const h of this.herbs) h.g.destroy();
    for (const c of this.clues) {
      c.g.destroy();
      c.prompt.destroy();
    }
    for (const f of this.floaters) f.text.destroy();
    this.squirrel?.g.destroy();
    this.squirrel = null;
    this.foes = [];
    this.npcs = [];
    this.herbs = [];
    this.clues = [];
    this.floaters = [];
    this.layers = [];
    this.dialog = null;
    this.hud.dialog(null);
    this.hud.setHint('');
    this.arena = null;
    this.frontier = Infinity;
    this.grief = false;
    this.storyBurst = false;
    this.burstKills = 0;
    this.parries = 0;
    this.buffer = null;
    this.scriptDone = null;

    this.chapter = STORY[id];
    this.save.chapter = id;
    writeSave(this.save);
    this.layers = paintBackdrop(this, this.chapter.theme, this.chapter.length, { width: this.viewW, height: this.viewH }, this.groundY);
    const after = CHAPTERS.indexOf(id) > CHAPTERS.indexOf('wake');
    this.player = {
      x: this.chapter.start,
      facing: 1,
      form: 'human',
      hp: MAX_HP,
      stamina: MAX_STAMINA,
      rage: 0,
      exhausted: false,
      burst: false,
      act: null,
      blocking: false,
      blockMs: 999,
      invuln: 0,
      walk: 0,
      moving: false,
      flash: 0,
      bloody: id === 'wake' || id === 'trail',
      down: false,
    };
    if (after) this.squirrel = { x: this.player.x - 50, hop: 0, g: this.add.graphics().setDepth(11) };
    const cam = this.cameras.main;
    cam.setBounds(0, 0, this.chapter.length, this.viewH);
    this.camTarget.setPosition(this.player.x, this.viewH / 2);
    cam.centerOn(this.player.x, this.viewH / 2);
    this.hud.setObjective(this.chapter.goal);
    this.hud.showBanner(this.chapter.title);
    this.evi = 0;
    this.evStarted = false;
    this.music = '';
  }

  /** Fades out and builds the next chapter (or `id`); a screen that is already black just fades in. */
  private goChapter(id: ChapterId) {
    if (this.fading) return;
    this.fading = true;
    const cam = this.cameras.main;
    const build = () => {
      this.buildChapter(id);
      cam.fadeIn(500);
      this.fading = false;
    };
    if (cam.fadeEffect.isComplete && cam.fadeEffect.direction === false) build();
    else {
      cam.fadeOut(450);
      cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, build);
    }
  }

  private nextChapter() {
    const i = CHAPTERS.indexOf(this.chapter.id);
    this.goChapter(CHAPTERS[Math.min(i + 1, CHAPTERS.length - 1)]);
  }

  // ------------------------------------------------------------------ the director

  private stepDirector() {
    for (let guard = 0; guard < 20; guard++) {
      if (this.dialog || this.fading || this.hud.cardOpen) return;
      const ev = this.chapter.events[this.evi];
      if (!ev) return;
      if (!this.evStarted) {
        this.evStarted = true;
        this.startEvent(ev);
      }
      if (!this.eventDone(ev)) return;
      this.evi++;
      this.evStarted = false;
    }
  }

  private startEvent(ev: Event) {
    switch (ev.do) {
      case 'say':
        return this.openDialog(ev.lines);
      case 'hint':
        return this.hud.setHint(ev.text);
      case 'wave':
        if (ev.lock) this.lockArena();
        for (const s of ev.foes) this.spawn(s);
        return;
      case 'clue': {
        const g = this.add.graphics().setDepth(1).setPosition(ev.x, this.groundY);
        const prompt = this.add.text(ev.x, this.groundY - (ev.id === 'hut' ? 150 : 70), t('look'), { fontFamily: 'Georgia, serif', fontSize: '14px', color: '#ffe9a8', backgroundColor: 'rgba(10,8,6,0.6)', padding: { x: 6, y: 3 } }).setOrigin(0.5).setDepth(20).setVisible(false);
        this.clues.push({ id: ev.id, x: ev.x, seen: false, g, prompt });
        return;
      }
      case 'herbs':
        for (const x of ev.xs) {
          const g = this.add.graphics().setDepth(1).setPosition(x, this.groundY);
          drawHerb(g);
          this.herbs.push({ x, g });
        }
        return;
      case 'npc': {
        this.npcs = this.npcs.filter((n) => n.id !== ev.id || (n.g.destroy(), false));
        this.npcs.push({ id: ev.id, x: ev.x, facing: ev.facing ?? 1, target: null, walk: 0, act: 'idle', actMs: 0, g: this.add.graphics().setDepth(4) });
        return;
      }
      case 'npcTo': {
        const n = this.npc(ev.id);
        if (n) n.target = ev.x;
        return;
      }
      case 'npcGone':
        this.npcs = this.npcs.filter((n) => n.id !== ev.id || (n.g.destroy(), false));
        return;
      case 'script':
        this.scriptDone = this.runScript(ev.name);
        return;
      case 'toast':
        return this.hud.toast(t(ev.text));
      case 'next':
        return this.nextChapter();
      case 'hold':
        this.frontier = ev.x;
        return;
      case 'reach':
        return;
    }
  }

  private eventDone(ev: Event): boolean {
    switch (ev.do) {
      case 'say':
        return !this.dialog;
      case 'reach':
        return this.player.x >= ev.x;
      case 'wave': {
        if (ev.until === 'half') {
          const boss = this.foes.find((f) => f.kind === 'ulfgar' && f.state !== 'dead');
          if (!boss || boss.hp > boss.maxHp / 2) return false;
          boss.state = 'held';
          boss.t = 0;
          return true;
        }
        if (this.hostiles().length) return false;
        this.unlockArena();
        return true;
      }
      case 'clue':
        return !!this.clues.find((c) => c.id === ev.id)?.seen;
      case 'npcTo': {
        const n = this.npc(ev.id);
        return !n || n.target === null;
      }
      case 'script':
        return !this.scriptDone || this.scriptDone();
      case 'next':
        return false;
      default:
        return true;
    }
  }

  /** The story's moments only code can do; returns when it is done, or null when it is done at once. */
  private runScript(name: ScriptName): (() => boolean) | null {
    const start = this.now;
    const after = (ms: number) => () => this.now - start >= ms;
    switch (name) {
      case 'fatherDies': {
        const skarn = this.npc('skarn');
        const father = this.npc('father');
        if (!skarn || !father) return null;
        skarn.target = father.x + 46;
        let struck = 0;
        return () => {
          if (skarn.target !== null) return false;
          if (!struck) {
            struck = this.now;
            skarn.act = 'strike';
            skarn.actMs = 420;
            father.act = 'down';
            father.actMs = Infinity;
            sfx('slash');
            if (!settings.reduceMotion) this.cameras.main.shake(260, 0.01);
          }
          return this.now - struck > 1100;
        };
      }
      case 'grief':
        this.grief = true;
        this.storyBurst = true;
        return null;
      case 'blackout':
        this.cameras.main.fadeOut(1400, 0, 0, 0);
        return after(1600);
      case 'wakeUp':
        this.player.down = true;
        return () => {
          if (this.now - start < 1400) return false;
          this.player.down = false;
          return true;
        };
      case 'ratatoskr':
        this.squirrel = { x: this.player.x + 160, hop: 0, g: this.add.graphics().setDepth(11) };
        return after(700);
      case 'drill': {
        const torvald = this.npc('torvald');
        const x = torvald?.x ?? this.player.x + 160;
        this.npcs = this.npcs.filter((n) => n.id !== 'torvald' || (n.g.destroy(), false));
        this.parries = 0;
        const foe = this.spawn({ kind: 'torvald', x });
        foe.harmless = true;
        this.hud.setHint('hintDrill', { n: 0 });
        return () => {
          this.hud.setHint('hintDrill', { n: Math.min(2, this.parries) });
          if (this.parries < 2 || foe.state === 'windup' || foe.state === 'strike') return false;
          foe.g.destroy();
          this.foes = this.foes.filter((f) => f !== foe);
          this.npcs.push({ id: 'torvald', x: foe.x, facing: foe.facing, target: null, walk: 0, act: 'idle', actMs: 0, g: this.add.graphics().setDepth(4) });
          this.hud.setHint('');
          return true;
        };
      }
      case 'recipes':
        this.save.recipes = true;
        writeSave(this.save);
        return null;
      case 'giantWolf': {
        const ulfgar = this.foes.find((f) => f.kind === 'ulfgar');
        const x = ulfgar?.x ?? this.player.x + 200;
        if (ulfgar) {
          ulfgar.g.destroy();
          this.foes = this.foes.filter((f) => f !== ulfgar);
        }
        this.spawn({ kind: 'giantWolf', x });
        this.spawn({ kind: 'wolf', side: 'left' });
        this.spawn({ kind: 'wolf', side: 'right' });
        sfx('howl');
        if (!settings.reduceMotion) this.cameras.main.shake(400, 0.008);
        return null;
      }
      case 'unlockShift':
        this.save.shift = true;
        writeSave(this.save);
        return null;
      case 'ulfgarDown':
        this.npcs.push({ id: 'ulfgarBody', x: this.lastBossX, facing: -1, target: null, walk: 0, act: 'down', actMs: Infinity, g: this.add.graphics().setDepth(3) });
        playSting(SAGA, 'victory');
        return after(900);
      case 'endCard':
        this.hud.showCard(t('endCardTitle'), t('endCardText'), t('playAgain'), () => {
          this.save = newSave();
          this.goChapter('hunt');
        });
        return () => false;
    }
  }

  /** While someone walks into a scene or the story plays a moment, Bjarn stands and watches. */
  private cutscene() {
    const ev = this.chapter.events[this.evi];
    return this.evStarted && (ev?.do === 'npcTo' || (ev?.do === 'script' && ['fatherDies', 'blackout', 'wakeUp', 'ratatoskr', 'ulfgarDown', 'endCard'].includes(ev.name)));
  }

  private npc(id: NpcId) {
    return this.npcs.find((n) => n.id === id);
  }

  private hostiles() {
    return this.foes.filter((f) => f.state !== 'dead' && !f.harmless);
  }

  private lockArena() {
    const v = this.cameras.main.worldView;
    this.arena = { l: v.x + 24, r: v.right - 24 };
    this.cameras.main.setBounds(v.x, 0, v.width, this.viewH);
  }

  private unlockArena() {
    this.arena = null;
    this.cameras.main.setBounds(0, 0, this.chapter.length, this.viewH);
  }

  private spawn(s: Spawn): Foe {
    const v = this.cameras.main.worldView;
    const x = s.x ?? (s.side === 'left' ? v.x - 50 - Math.random() * 60 : v.right + 50 + Math.random() * 60);
    const stats = FOES[s.kind];
    const foe: Foe = {
      kind: s.kind,
      stats,
      x,
      hp: stats.hp,
      maxHp: stats.hp,
      facing: x < this.player.x ? 1 : -1,
      state: 'approach',
      t: 0,
      cooldown: 300 + Math.random() * 500,
      unblockable: false,
      knock: 0,
      walk: Math.random() * 6,
      flash: 0,
      harmless: false,
      g: this.add.graphics().setDepth(5),
    };
    if (s.kind === 'giantWolf') foe.g.setScale(1.8);
    this.foes.push(foe);
    return foe;
  }

  // ------------------------------------------------------------------ talk

  private openDialog(lines: Line[]) {
    this.dialog = { lines, i: 0, shownAt: this.now };
    this.showLine();
  }

  private showLine() {
    const d = this.dialog!;
    const [who, key] = d.lines[d.i];
    sfx('blip', { pitch: SPEAKER_PITCH[who] });
    this.hud.dialog({ speaker: t(`${who}Name`), text: t(key) });
  }

  private nextLine() {
    const d = this.dialog!;
    if (this.now - d.shownAt < 150) return;
    d.i++;
    d.shownAt = this.now;
    if (d.i >= d.lines.length) {
      this.dialog = null;
      this.hud.dialog(null);
    } else this.showLine();
  }

  // ------------------------------------------------------------------ the frame

  update(_time: number, delta: number) {
    const dt = Math.min(delta, 50);
    this.now += dt;
    const k = this.keys;
    const held = (b: Button) => [...this.touchHeld.values()].includes(b);
    const down = (...names: string[]) => names.some((n) => k[n].isDown);
    // Presses since the last frame (caught by the keydown listener and the touch buttons), read once.
    const strike = this.pressed.has('strike') || (this.pressed.has('click') && !this.dialog);
    const dodge = this.pressed.has('dodge');
    const shift = this.pressed.has('shift');
    const use = this.pressed.has('use');
    const confirm = this.pressed.has('confirm');
    const blockDown = down('K', 'X') || held('block');
    const dir = (down('D', 'RIGHT') || held('right') ? 1 : 0) - (down('A', 'LEFT') || held('left') ? 1 : 0);
    const click = this.pressed.has('click');
    this.pressed.clear();

    if (this.hud.cardOpen) {
      if (confirm) this.hud.pressCard();
    } else if (this.dialog) {
      if (confirm || use || strike || click) this.nextLine();
    } else if (!this.fading) {
      if (this.cutscene()) this.updatePlayer(dt, { dir: 0, strike: false, dodge: false, shift: false, use: false, blockDown: false });
      else this.updatePlayer(dt, { dir, strike, dodge, shift, use: use || confirm, blockDown });
      this.updateFoes(dt);
    }
    this.updateNpcs(dt);
    this.stepDirector();
    this.updateMusic();
    this.draw(dt);
  }

  private updatePlayer(dt: number, input: { dir: number; strike: boolean; dodge: boolean; shift: boolean; use: boolean; blockDown: boolean }) {
    const p = this.player;
    if (p.down) return;
    const stats = FORMS[p.form];
    p.invuln = Math.max(0, p.invuln - dt);
    p.flash = Math.max(0, p.flash - dt);
    if (input.strike) this.buffer = { act: 'strike', ms: BUFFER_MS };
    else if (input.dodge) this.buffer = { act: 'dodge', ms: BUFFER_MS };
    else if (input.shift) this.buffer = { act: 'shift', ms: BUFFER_MS };
    else if (this.buffer && (this.buffer.ms -= dt) <= 0) this.buffer = null;

    // Rage: the father's death feeds it in the raid; an outburst drains it, faster with no foe around.
    if (this.grief && !p.burst) p.rage += (GRIEF_RAGE * dt) / 1000;
    if (!p.burst && p.rage >= 100) this.startBurst();
    // The raid's outburst: two kills as the hybrid and the bear comes out too.
    if (this.storyBurst && p.burst && p.form === 'hybrid' && this.burstKills >= 2 && !p.act) {
      this.startShift('bear');
      sfx('roar');
    }
    if (p.burst && !this.storyBurst && p.act?.kind !== 'shift') {
      p.rage -= ((this.hostiles().length ? BURST_DRAIN : BURST_DRAIN_CALM) * dt) / 1000;
      if (p.rage <= 0) this.endBurst();
    }

    const blockingBefore = p.blocking;
    p.blocking = false;
    let vx = 0;
    if (p.act) {
      p.act.t += dt;
      const a = p.act;
      if (a.kind === 'attack') {
        if (!a.hit && a.t >= a.dur * stats.hitAt) {
          a.hit = true;
          this.strikeFoes();
        }
      } else if (a.kind === 'dodge') {
        vx = a.dir * stats.dodgeSpeed;
      } else if (a.kind === 'shift') {
        if (p.form !== a.to && a.t >= a.dur / 2) p.form = a.to;
      }
      if (a.t >= a.dur) p.act = null;
    } else if (p.burst) {
      // The beast runs at the nearest foe and strikes on its own; the player only nudges it.
      const target = this.nearestHostile();
      if (target) {
        const d = target.x - p.x;
        p.facing = d < 0 ? -1 : 1;
        if (Math.abs(d) > stats.reach * 0.75) vx = p.facing * stats.speed * 0.9 + input.dir * stats.speed * 0.3;
        else this.startAttack(false);
      } else vx = input.dir * stats.speed * 0.5;
    } else {
      const b = this.buffer;
      if (b?.act === 'strike' && (p.stamina > 0 || !p.exhausted)) {
        this.buffer = null;
        this.startAttack(true);
      } else if (b?.act === 'dodge' && !p.exhausted) {
        this.buffer = null;
        const d = input.dir || p.facing;
        p.act = { kind: 'dodge', t: 0, dur: stats.dodgeMs, dir: d };
        p.invuln = Math.max(p.invuln, stats.dodgeMs);
        this.spend(DODGE_COST);
        sfx('dodge');
      } else if (b?.act === 'shift' && this.save.shift) {
        this.buffer = null;
        this.startShift(p.form === 'human' ? 'hybrid' : 'human');
        sfx(p.form === 'human' ? 'roar' : 'calm');
      } else {
        if (input.use) this.useNearby();
        p.blocking = input.blockDown && stats.block !== null;
        if (p.blocking && !blockingBefore) p.blockMs = 0;
        if (input.dir) {
          p.facing = input.dir > 0 ? 1 : -1;
          if (!p.blocking) vx = input.dir * stats.speed;
        }
      }
    }
    p.blockMs += dt;
    if (!p.blocking && p.act?.kind !== 'attack') p.stamina = Math.min(MAX_STAMINA, p.stamina + (STAMINA_REGEN * dt) / 1000);
    if (p.exhausted && p.stamina >= EXHAUSTED_UNTIL) p.exhausted = false;

    p.moving = vx !== 0 && p.act?.kind !== 'dodge';
    if (p.moving) p.walk += (dt / 1000) * (p.form === 'bear' ? 9 : 12);
    p.x += (vx * dt) / 1000;
    const lo = this.arena?.l ?? 30;
    const hi = Math.min(this.arena?.r ?? this.chapter.length - 30, this.frontier);
    p.x = Phaser.Math.Clamp(p.x, lo, hi);

    // Herbs heal the human and the hybrid as they walk over them; the bear passes them by.
    if (p.form !== 'bear' && p.hp < MAX_HP) {
      const herb = this.herbs.find((h) => Math.abs(h.x - p.x) < HERB_PX);
      if (herb) {
        p.hp = Math.min(MAX_HP, p.hp + (this.save.recipes ? HERB_HEAL_RECIPES : HERB_HEAL));
        herb.g.destroy();
        this.herbs = this.herbs.filter((h) => h !== herb);
        sfx('herb');
      }
    }
    for (const c of this.clues) c.prompt.setVisible(!c.seen && Math.abs(c.x - p.x) < USE_PX && !this.dialog);
  }

  private spend(cost: number) {
    const p = this.player;
    p.stamina -= cost;
    if (p.stamina <= 0) {
      p.stamina = 0;
      p.exhausted = true;
    }
  }

  private startAttack(costs: boolean) {
    const p = this.player;
    const stats = FORMS[p.form];
    p.act = { kind: 'attack', t: 0, dur: stats.attackMs * (p.exhausted ? 1.4 : 1), hit: false };
    if (costs) this.spend(ATTACK_COST);
    sfx(p.form === 'human' ? 'swing' : 'swipe');
  }

  private startShift(to: Form) {
    const p = this.player;
    p.act = { kind: 'shift', t: 0, dur: SHIFT_MS, to };
    p.invuln = Math.max(p.invuln, SHIFT_MS);
    p.blocking = false;
  }

  private startBurst() {
    const p = this.player;
    p.burst = true;
    p.rage = this.storyBurst ? 100 : BURST_RAGE;
    this.burstKills = 0;
    this.startShift(p.form === 'human' ? 'hybrid' : 'bear');
    sfx('roar');
    playSting(SAGA, 'burst');
    if (!settings.reduceMotion) this.cameras.main.shake(350, 0.01);
  }

  private endBurst() {
    const p = this.player;
    p.burst = false;
    p.rage = 0;
    this.startShift('human');
    sfx('calm');
  }

  private nearestHostile() {
    let best: Foe | null = null;
    for (const f of this.hostiles()) if (!best || Math.abs(f.x - this.player.x) < Math.abs(best.x - this.player.x)) best = f;
    return best;
  }

  private useNearby() {
    const c = this.clues.find((c) => !c.seen && Math.abs(c.x - this.player.x) < USE_PX);
    if (!c) return;
    c.seen = true;
    c.prompt.setVisible(false);
    sfx('clue');
    const ev = this.chapter.events[this.evi];
    if (ev?.do === 'clue' && ev.id === c.id) this.openDialog(ev.lines);
    else {
      const def = this.chapter.events.find((e): e is Extract<Event, { do: 'clue' }> => e.do === 'clue' && e.id === c.id);
      if (def) this.openDialog(def.lines);
    }
  }

  /** Bjarn's strike lands: every foe in reach in front of him takes the form's damage. */
  private strikeFoes() {
    const p = this.player;
    const stats = FORMS[p.form];
    for (const f of this.foes) {
      if (f.state === 'dead') continue;
      const ahead = (f.x - p.x) * p.facing;
      const size = f.kind === 'giantWolf' ? 50 : f.kind === 'boar' || f.kind === 'wolf' ? 26 : 14;
      if (ahead < -20 || ahead > stats.reach + size) continue;
      if (f.harmless || f.state === 'held') {
        this.float(f.x, '—', '#d8ccb0');
        continue;
      }
      let dmg = stats.damage * (p.exhausted ? 0.5 : 1) * (f.stats.vs?.[p.form] ?? 1);
      if (f.state === 'stunned') dmg *= 1.5;
      f.hp -= dmg;
      f.flash = 110;
      f.knock = p.facing * (p.form === 'bear' ? 420 : p.form === 'hybrid' ? 280 : 150) * (f.stats.poise ? 0.4 : 1);
      if (!f.stats.poise && (f.state === 'windup' || f.state === 'approach')) {
        f.state = 'hurt';
        f.t = 0;
      }
      if (stats.lifesteal) p.hp = Math.min(MAX_HP, p.hp + dmg * stats.lifesteal);
      sfx('hit');
      if (f.hp <= 0) this.killFoe(f);
    }
  }

  private killFoe(f: Foe) {
    f.state = 'dead';
    f.t = 0;
    this.save.kills++;
    if (f.kind === 'giantWolf') this.lastBossX = f.x;
    sfx('down');
    const p = this.player;
    if (p.burst) this.burstKills++;
  }

  // ------------------------------------------------------------------ foes

  private updateFoes(dt: number) {
    const p = this.player;
    let attackers = this.foes.filter((f) => f.state === 'windup' || f.state === 'strike').length;
    for (const f of this.foes) {
      f.flash = Math.max(0, f.flash - dt);
      f.t += dt;
      if (f.knock) {
        f.x += (f.knock * dt) / 1000;
        f.knock *= Math.pow(0.002, dt / 1000);
        if (Math.abs(f.knock) < 10) f.knock = 0;
      }
      if (f.state === 'dead') continue;
      const s = f.stats;
      const d = p.x - f.x;
      const far = Math.abs(d);
      switch (f.state) {
        case 'held':
          f.facing = d < 0 ? -1 : 1;
          break;
        case 'hurt':
          if (f.t > 260) this.toApproach(f);
          break;
        case 'stunned':
          if (f.t > STUN_MS) this.toApproach(f);
          break;
        case 'approach': {
          f.facing = d < 0 ? -1 : 1;
          f.cooldown -= dt;
          const range = s.reach * 0.8;
          const canAttack = attackers < MAX_ATTACKERS && f.cooldown <= 0 && !p.down;
          // Wait a little further off while others are attacking.
          const want = canAttack ? range : range + 70;
          if (far > want) {
            f.x += (f.facing * s.speed * dt) / 1000;
            f.walk += (dt / 1000) * 10;
          } else if (far < want - 50 && !canAttack) {
            f.x -= (f.facing * s.speed * 0.5 * dt) / 1000;
            f.walk += (dt / 1000) * 8;
          }
          if (canAttack && far <= range + 6) {
            f.state = 'windup';
            f.t = 0;
            f.unblockable = Math.random() < s.unblockable;
            if (f.unblockable) sfx('warn');
            attackers++;
          }
          break;
        }
        case 'windup':
          if (f.t >= s.windupMs) {
            f.state = 'strike';
            f.t = 0;
            if (s.lunge) f.knock = f.facing * s.lunge * 4;
          }
          break;
        case 'strike':
          if (f.t >= s.strikeMs * 0.5 && f.t - dt < s.strikeMs * 0.5) this.resolveStrike(f);
          if (f.t >= s.strikeMs) {
            f.state = 'recover';
            f.t = 0;
          }
          break;
        case 'recover':
          if (f.t >= s.recoverMs) this.toApproach(f);
          break;
      }
    }
    // Foes keep a little apart so they don't stack into one.
    const alive = this.foes.filter((f) => f.state !== 'dead');
    for (let i = 0; i < alive.length; i++)
      for (let j = i + 1; j < alive.length; j++) {
        const a = alive[i];
        const b = alive[j];
        const gap = b.x - a.x;
        if (Math.abs(gap) < 36) {
          const push = ((36 - Math.abs(gap)) / 2) * (gap < 0 ? -1 : 1);
          a.x -= push * 0.2;
          b.x += push * 0.2;
        }
      }
    // Beaten foes fade, then go.
    for (const f of this.foes) if (f.state === 'dead' && f.t > 700) f.g.destroy();
    this.foes = this.foes.filter((f) => f.state !== 'dead' || f.t <= 700);
  }

  private toApproach(f: Foe) {
    f.state = 'approach';
    f.t = 0;
    f.cooldown = 350 + Math.random() * 900;
  }

  /** A foe's strike lands, or not: dodged, countered by a change of form, parried, blocked or taken. */
  private resolveStrike(f: Foe) {
    const p = this.player;
    const ahead = (p.x - f.x) * f.facing;
    const size = f.kind === 'giantWolf' ? 40 : 10;
    if (p.down || ahead < -24 || ahead > f.stats.reach + size + 16) return;
    if (p.act?.kind === 'shift' && p.act.t < SHIFT_COUNTER_MS) {
      this.stun(f);
      this.float(p.x, t('parry'), '#ffe680');
      sfx('parry');
      return;
    }
    if (p.invuln > 0) return;
    const facingFoe = Math.sign(f.x - p.x) === p.facing;
    const stats = FORMS[p.form];
    const dmg = f.stats.damage * foeDamage();
    if (p.blocking && facingFoe && stats.block !== null && !f.unblockable) {
      if (p.blockMs <= PARRY_MS) {
        this.stun(f);
        this.parries++;
        this.float(p.x, t('parry'), '#ffe680');
        sfx('parry');
        return;
      }
      if (f.harmless) {
        this.float(p.x, t('tooEarly'), '#d8ccb0');
        sfx('block');
        return;
      }
      p.stamina -= BLOCK_COST;
      sfx('block');
      if (p.stamina > 0) return this.takeDamage(dmg * stats.block, false);
      p.stamina = 0;
      p.exhausted = true;
      this.float(p.x, t('guardBroken'), '#ff9a70');
    }
    if (f.harmless) return;
    this.takeDamage(dmg * (1 - stats.resist), true);
  }

  private stun(f: Foe) {
    f.state = 'stunned';
    f.t = 0;
    f.knock = -f.facing * 120;
  }

  /** Bjarn takes damage. Only a real hit (not a blocked one) fills the rage. */
  private takeDamage(amount: number, hit: boolean) {
    const p = this.player;
    p.hp -= amount;
    p.flash = 120;
    if (hit) {
      p.rage += amount * RAGE_PER_HP;
      if (p.burst && p.rage >= 100) {
        if (p.form === 'hybrid' && p.act?.kind !== 'shift') {
          this.startShift('bear');
          sfx('roar');
          p.rage = 85;
        } else p.rage = 100;
      }
      p.invuln = INVULN_MS;
      if (!p.burst && p.form !== 'bear' && p.act?.kind !== 'shift') p.act = { kind: 'hurt', t: 0, dur: HURT_MS };
      sfx('hurt');
      if (!settings.reduceMotion) this.cameras.main.shake(120, 0.004);
    }
    if (p.hp <= 0) this.fall();
  }

  private fall() {
    const p = this.player;
    p.hp = 0;
    p.down = true;
    p.burst = false;
    p.act = null;
    this.save.falls++;
    writeSave(this.save);
    playSting(SAGA, 'fall');
    this.time.delayedCall(900, () =>
      this.hud.showCard(t('fallen'), t(this.chapter.title), t('tryAgain'), () => this.goChapter(this.chapter.id)),
    );
  }

  // ------------------------------------------------------------------ people

  private updateNpcs(dt: number) {
    for (const n of this.npcs) {
      if (n.actMs !== Infinity && n.actMs > 0) {
        n.actMs -= dt;
        if (n.actMs <= 0) n.act = 'idle';
      }
      if (n.target === null) continue;
      const d = n.target - n.x;
      n.facing = d < 0 ? -1 : 1;
      const step = (NPC_SPEED * dt) / 1000;
      if (Math.abs(d) <= step) {
        n.x = n.target;
        n.target = null;
      } else {
        n.x += n.facing * step;
        n.walk += (dt / 1000) * 10;
      }
    }
    // The father fights beside Bjarn in the raid: he swings now and then.
    const father = this.npc('father');
    if (father && father.act === 'idle' && this.hostiles().length && Math.random() < dt / 900) {
      father.act = 'strike';
      father.actMs = 300;
    }
    const sq = this.squirrel;
    if (sq) {
      const p = this.player;
      const want = p.x - p.facing * 46;
      const d = want - sq.x;
      if (Math.abs(d) > 6) {
        sq.x += d * Math.min(1, (dt / 1000) * 3);
        sq.hop += (dt / 1000) * 14;
      }
    }
  }

  // ------------------------------------------------------------------ music and drawing

  private updateMusic() {
    const foes = this.hostiles().length > 0;
    const part = foes ? (this.chapter.id === 'boss' ? 'boss' : 'battle') : this.chapter.music;
    if (part === this.music) return;
    this.music = part;
    playMusic(SAGA, part);
  }

  private float(x: number, text: string, color: string) {
    const o = this.add.text(x, this.groundY - 110, text, { fontFamily: 'Georgia, serif', fontSize: '18px', color, stroke: '#000000', strokeThickness: 4 }).setOrigin(0.5).setDepth(30);
    this.floaters.push({ text: o, ms: 800 });
  }

  private draw(dt: number) {
    const p = this.player;
    const reduce = settings.reduceMotion;
    const pose: Pose = { act: 'idle', t: 0, walk: reduce ? 0 : p.walk, flash: p.flash > 0 && !reduce, bloody: p.bloody };
    const a = p.act;
    if (p.down) pose.act = 'down';
    else if (a?.kind === 'attack') {
      const hitAt = FORMS[p.form].hitAt;
      pose.act = a.t < a.dur * hitAt ? 'windup' : 'strike';
      pose.t = pose.act === 'windup' ? a.t / (a.dur * hitAt) : (a.t - a.dur * hitAt) / (a.dur * (1 - hitAt));
    } else if (a?.kind === 'dodge') {
      pose.act = 'dodge';
      pose.t = a.t / a.dur;
    } else if (a?.kind === 'hurt') pose.act = 'hurt';
    else if (p.blocking) pose.act = 'block';
    else if (p.moving) pose.act = 'walk';
    if (a?.kind === 'shift') pose.flash = !reduce && Math.floor(a.t / 70) % 2 === 0;
    drawBjarn(this.playerG, p.form, pose);
    this.playerG.setPosition(p.x, this.groundY).setScale(p.facing, 1);
    // The outburst: Bjarn sees double.
    this.ghostG.setVisible(p.burst && !reduce);
    if (p.burst && !reduce) {
      drawBjarn(this.ghostG, p.form, pose);
      this.ghostG.setPosition(p.x + Math.sin(this.now / 120) * 8, this.groundY - 2).setScale(p.facing, 1);
    }
    this.camTarget.setX(p.x);

    for (const f of this.foes) {
      const fp: Pose = { act: 'idle', t: f.t / f.stats.windupMs, walk: reduce ? 0 : f.walk, flash: f.flash > 0 && !reduce };
      if (f.state === 'windup') {
        fp.act = 'windup';
        fp.warn = f.unblockable ? 'red' : 'yellow';
      } else if (f.state === 'strike') {
        fp.act = 'strike';
        fp.t = f.t / f.stats.strikeMs;
        if (f.unblockable) fp.warn = 'red';
      } else if (f.state === 'stunned') fp.act = 'stunned';
      else if (f.state === 'hurt') fp.act = 'hurt';
      else if (f.state === 'dead') fp.act = 'down';
      else if (f.state === 'approach' && f.walk) fp.act = 'walk';
      if (f.state === 'stunned') fp.walk = this.now / 200;
      drawFoe(f.g, f.kind, fp);
      const scale = f.kind === 'giantWolf' ? 1.8 : 1;
      f.g.setPosition(f.x, this.groundY).setScale(f.facing * scale, scale).setAlpha(f.state === 'dead' ? 1 - f.t / 700 : 1);
      // A health bar over foes that are not at full health, and always over the bosses.
      if (f.state !== 'dead' && !f.harmless && (f.hp < f.maxHp || f.kind === 'ulfgar' || f.kind === 'giantWolf')) {
        const w = f.kind === 'giantWolf' || f.kind === 'ulfgar' ? 80 : 40;
        const top = f.kind === 'giantWolf' ? -125 : f.kind === 'ulfgar' ? -112 : f.kind === 'boar' || f.kind === 'wolf' ? -66 : -96;
        const s = 1 / scale;
        f.g.fillStyle(0x000000, 0.6);
        f.g.fillRect((-w / 2 - 1) * s, top * s, (w + 2) * s, 6 * s);
        f.g.fillStyle(0xd04030, 1);
        f.g.fillRect(-w / 2 * s, top * s + s, (w * Math.max(0, f.hp) * s) / f.maxHp, 4 * s);
      }
    }

    for (const n of this.npcs) {
      drawNpc(n.g, n.id, { act: n.target !== null ? 'walk' : n.act, t: n.act === 'strike' ? 1 - n.actMs / 420 : 0, walk: reduce ? 0 : n.walk });
      n.g.setPosition(n.x, this.groundY).setScale(n.facing, 1);
    }
    for (const c of this.clues) drawClue(c.g, c.id, c.seen);
    if (this.squirrel) {
      drawSquirrel(this.squirrel.g, reduce ? 0 : this.squirrel.hop);
      this.squirrel.g.setPosition(this.squirrel.x, this.groundY).setScale(this.player.facing, 1);
    }
    for (const f of this.floaters) {
      f.ms -= dt;
      f.text.setY(f.text.y - (dt / 1000) * 40).setAlpha(Math.min(1, f.ms / 300));
      if (f.ms <= 0) f.text.destroy();
    }
    this.floaters = this.floaters.filter((f) => f.ms > 0);

    const held: Partial<Record<Button, boolean>> = {};
    for (const b of this.touchHeld.values()) held[b] = true;
    const canUse = this.clues.some((c) => !c.seen && Math.abs(c.x - p.x) < USE_PX);
    this.hud.update(dt, { hp: p.hp, stamina: p.stamina, rage: p.rage, form: p.form, burst: p.burst, exhausted: p.exhausted, shift: this.save.shift, canUse, fragment: this.storyBurst && p.burst }, held, this.now);
  }
}
