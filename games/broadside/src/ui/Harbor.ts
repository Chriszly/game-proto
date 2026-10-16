import Phaser from 'phaser';
import { renderScale } from '../../../../shared/scaling';
import { SHEET_RES } from '../art/art';
import { BOUNTIES } from '../game/bounties';
import { HULLS } from '../game/hulls';
import { DRAFT_SIZE, PERKS, type PerkId } from '../game/perks';
import { SHOTS } from '../game/shot';
import { rank, type GameState, type Side } from '../game/state';
import { costOf, HIRE, REPAIR_COST, UPGRADE_IDS, UPGRADES, type UpgradeId } from '../game/upgrades';
import { DRAFT, FONT, HARBOR, UI_DEPTH, VIEW } from '../scenes/layout';
import { makeButton } from './Button';
import { pinToScreen } from './screen';

export type HarborAction = UpgradeId | 'repair' | 'hire' | 'sail' | `load-${Side}` | `draft-${PerkId}`;
export interface HarborButton {
  id: HarborAction;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Row {
  id: UpgradeId | 'repair' | 'hire';
  bg: Phaser.GameObjects.Rectangle;
  name: Phaser.GameObjects.Text;
  desc: Phaser.GameObjects.Text;
  cost: Phaser.GameObjects.Text;
}

const ROW = 0xf6ecd2;
const ROW_LIT = 0xebd29a;
const INK = 0x2b2118;
const style = (size: number, color: string, fontStyle = 'normal') => ({ fontFamily: FONT, fontSize: `${size}px`, color, fontStyle, resolution: Math.max(2, renderScale) });

/** A card of the prize draft. */
interface Card {
  bg: Phaser.GameObjects.Rectangle;
  name: Phaser.GameObjects.Text;
  desc: Phaser.GameObjects.Text;
  /** Everything drawn for the card, hidden together when the draft has fewer cards. */
  parts: (Phaser.GameObjects.Rectangle | Phaser.GameObjects.Text)[];
  /** Which perk the card shows right now; the draft changes every wave. */
  perk: PerkId | null;
}

/**
 * The harbor between waves, as a ledger on a sheet of parchment: spend the plunder on the ship,
 * patch the hull, hire sailors, and set sail. While the wave's prize draft is on offer, three
 * cards cover the ledger instead, and one must be picked.
 */
export class Harbor {
  /**
   * Where each button is on screen; the playthrough test reads it to tap one. The draft's cards
   * are listed as `draft-<perk>` for the perks on offer.
   */
  buttons: HarborButton[] = [];
  private ledgerButtons: HarborButton[] = [];
  private container: Phaser.GameObjects.Container;
  private draftContainer: Phaser.GameObjects.Container;
  private title: Phaser.GameObjects.Text;
  private gold: Phaser.GameObjects.Text;
  private bounty: Phaser.GameObjects.Text;
  private draftTitle: Phaser.GameObjects.Text;
  private cards: Card[] = [];
  private rows: Row[] = [];
  /** The two loading buttons, one per side, each with what that side is loaded with. */
  private loads: { side: Side; name: Phaser.GameObjects.Text; desc: Phaser.GameObjects.Text; swap: Phaser.GameObjects.Text }[] = [];

  constructor(scene: Phaser.Scene, onAction: (id: HarborAction) => void) {
    const dim = scene.add.rectangle(VIEW.w / 2, VIEW.h / 2, VIEW.w, VIEW.h, 0x3a2a18, 0.45).setInteractive();
    const panel = scene.add.image(HARBOR.x, HARBOR.y, 'panel-harbor').setScale(1 / SHEET_RES);
    const top = HARBOR.y - HARBOR.h / 2;
    this.title = scene.add.text(HARBOR.x, top + 28, '', style(26, '#2b2118', 'bold')).setOrigin(0.5);
    this.gold = scene.add.text(HARBOR.x, top + 54, '', style(16, '#6a4410', 'italic')).setOrigin(0.5);
    this.bounty = scene.add.text(HARBOR.x, top + 73, '', style(12, '#3f6e48', 'bold italic')).setOrigin(0.5);
    const rule = scene.add.rectangle(HARBOR.x, top + 86, HARBOR.rowW, 1, INK, 0.6);
    const parts: Phaser.GameObjects.GameObject[] = [dim, panel, this.title, this.gold, this.bounty, rule];

    const ids: (UpgradeId | 'repair' | 'hire')[] = [...UPGRADE_IDS, 'repair', 'hire'];
    ids.forEach((id, i) => {
      const y = HARBOR.firstRowY + i * HARBOR.rowGap;
      const left = HARBOR.x - HARBOR.rowW / 2;
      const bg = scene.add.rectangle(HARBOR.x, y, HARBOR.rowW, HARBOR.rowH, ROW, 0.9).setStrokeStyle(1.5, INK);
      bg.setInteractive({ useHandCursor: true })
        .on('pointerover', () => bg.setFillStyle(ROW_LIT, 0.95))
        .on('pointerout', () => bg.setFillStyle(ROW, 0.9))
        .on('pointerdown', () => onAction(id));
      const name = scene.add.text(left + 14, y - 9, '', style(16, '#2b2118', 'bold')).setOrigin(0, 0.5);
      const desc = scene.add.text(left + 14, y + 10, '', style(12, '#5a4a38', 'italic')).setOrigin(0, 0.5);
      const cost = scene.add.text(left + HARBOR.rowW - 14, y, '', style(17, '#6a4410', 'bold italic')).setOrigin(1, 0.5);
      this.rows.push({ id, bg, name, desc, cost });
      this.ledgerButtons.push({ id, x: HARBOR.x, y, w: HARBOR.rowW, h: HARBOR.rowH });
      parts.push(bg, name, desc, cost);
    });

    // Below the ledger, what each side's guns are loaded with; a tap loads the next kind of shot.
    const loadW = (HARBOR.rowW - 12) / 2;
    (['port', 'starboard'] as Side[]).forEach((side, i) => {
      const x = HARBOR.x + (i === 0 ? -1 : 1) * (loadW / 2 + 6);
      const y = HARBOR.loadY;
      const id = `load-${side}` as const;
      const bg = scene.add.rectangle(x, y, loadW, HARBOR.rowH, ROW, 0.9).setStrokeStyle(1.5, INK);
      bg.setInteractive({ useHandCursor: true })
        .on('pointerover', () => bg.setFillStyle(ROW_LIT, 0.95))
        .on('pointerout', () => bg.setFillStyle(ROW, 0.9))
        .on('pointerdown', () => onAction(id));
      const name = scene.add.text(x - loadW / 2 + 12, y - 8, '', style(15, '#2b2118', 'bold')).setOrigin(0, 0.5);
      const desc = scene.add.text(x - loadW / 2 + 12, y + 10, '', style(11, '#5a4a38', 'italic')).setOrigin(0, 0.5);
      const swap = scene.add.text(x + loadW / 2 - 12, y, '⟳', style(20, '#6a4410', 'bold')).setOrigin(1, 0.5);
      this.loads.push({ side, name, desc, swap });
      this.ledgerButtons.push({ id, x, y, w: loadW, h: HARBOR.rowH });
      parts.push(bg, name, desc, swap);
    });
    const loadLabel = scene.add.text(HARBOR.x, HARBOR.loadY - HARBOR.rowH / 2 - 10, 'Load the guns: tap a side to change its shot', style(12, '#6a4410', 'italic')).setOrigin(0.5);
    parts.push(loadLabel);

    const sailY = HARBOR.y + HARBOR.h / 2 - 34;
    const sail = makeButton(scene, HARBOR.x, sailY, 'Set sail', () => onAction('sail'));
    this.ledgerButtons.push({ id: 'sail', x: HARBOR.x, y: sailY, w: sail.bg.width, h: sail.bg.height });
    parts.push(sail.button);
    this.container = pinToScreen(scene.add.container(0, 0, parts)).setDepth(UI_DEPTH + 10).setVisible(false);

    // The prize draft: three cards over the dimmed chart, one to be picked before the ledger opens.
    const draftDim = scene.add.rectangle(VIEW.w / 2, VIEW.h / 2, VIEW.w, VIEW.h, 0x3a2a18, 0.45).setInteractive();
    this.draftTitle = scene.add.text(DRAFT.x, DRAFT.titleY, '', style(24, '#f6ecd2', 'bold')).setOrigin(0.5).setStroke('#2b2118', 5);
    const hint = scene.add.text(DRAFT.x, DRAFT.titleY + 30, 'Tap a card to keep that perk for the rest of the run', style(13, '#f6ecd2', 'italic')).setOrigin(0.5).setStroke('#2b2118', 4);
    const draftParts: Phaser.GameObjects.GameObject[] = [draftDim, this.draftTitle, hint];
    for (let i = 0; i < DRAFT_SIZE; i++) {
      const x = DRAFT.x + (i - (DRAFT_SIZE - 1) / 2) * (DRAFT.w + DRAFT.gap);
      const y = DRAFT.y;
      const bg = scene.add.rectangle(x, y, DRAFT.w, DRAFT.h, ROW, 0.97).setStrokeStyle(2, INK);
      const rule = scene.add.rectangle(x, y, DRAFT.w - 14, DRAFT.h - 14).setStrokeStyle(1, INK, 0.5);
      const head = scene.add.text(x, y - DRAFT.h / 2 + 26, 'Prize', style(12, '#6a4410', 'bold italic')).setOrigin(0.5);
      const name = scene.add.text(x, y - DRAFT.h / 2 + 62, '', { ...style(18, '#2b2118', 'bold'), align: 'center', wordWrap: { width: DRAFT.w - 30 } }).setOrigin(0.5);
      const desc = scene.add.text(x, y + 10, '', { ...style(13, '#5a4a38', 'italic'), align: 'center', wordWrap: { width: DRAFT.w - 30 }, lineSpacing: 3 }).setOrigin(0.5);
      const foot = scene.add.text(x, y + DRAFT.h / 2 - 24, 'Keep this one', style(13, '#6a4410', 'bold italic')).setOrigin(0.5);
      const card: Card = { bg, name, desc, parts: [bg, rule, head, name, desc, foot], perk: null };
      bg.setInteractive({ useHandCursor: true })
        .on('pointerover', () => bg.setFillStyle(ROW_LIT, 0.98))
        .on('pointerout', () => bg.setFillStyle(ROW, 0.97))
        .on('pointerdown', () => card.perk && onAction(`draft-${card.perk}`));
      this.cards.push(card);
      draftParts.push(bg, rule, head, name, desc, foot);
    }
    this.draftContainer = pinToScreen(scene.add.container(0, 0, draftParts)).setDepth(UI_DEPTH + 10).setVisible(false);
  }

  show(s: GameState | null) {
    const drafting = !!s && s.draft.length > 0;
    this.container.setVisible(!!s && !drafting);
    this.draftContainer.setVisible(drafting);
    if (!s) return;
    if (drafting) {
      this.draftTitle.setText(`Wave ${s.wave} beaten: the prize draft`);
      this.cards.forEach((card, i) => {
        const perk = s.draft[i] ?? null;
        card.perk = perk;
        card.name.setText(perk ? PERKS[perk].name : '');
        card.desc.setText(perk ? PERKS[perk].desc : '');
        for (const part of card.parts) part.setVisible(!!perk);
      });
      this.buttons = this.cards.filter((c) => c.perk).map((c) => ({ id: `draft-${c.perk!}` as const, x: c.bg.x, y: c.bg.y, w: DRAFT.w, h: DRAFT.h }));
      return;
    }
    this.buttons = this.ledgerButtons;
    this.title.setText(`Harbor: wave ${s.wave} beaten`);
    this.gold.setText(`Gold ${s.gold}   ❦   Hull ${Math.ceil(s.player.hp)} / ${s.player.maxHp}   ❦   Crew ${s.player.crew} / ${s.player.maxCrew}`);
    const perks = s.perks.length ? `Perks: ${s.perks.map((id) => PERKS[id].name).join(', ')}` : 'No perks yet';
    const bounty = s.bounty ? (s.bountyPaid ? `Bounty met (${BOUNTIES[s.bounty].desc(s).toLowerCase()}): +${s.bountyPaid} gold` : 'Bounty missed') : '';
    this.bounty.setText(bounty ? `${bounty}   ❦   ${perks}` : perks);
    for (const row of this.rows) {
      if (row.id === 'repair') {
        const needed = s.player.hp < s.player.maxHp;
        row.name.setText('Patch the hull');
        row.desc.setText(needed ? 'Repair the ship to full' : 'The hull is sound');
        row.cost.setText(needed ? `${REPAIR_COST} gold` : '-');
        row.bg.setAlpha(needed && s.gold >= REPAIR_COST ? 1 : 0.5);
        continue;
      }
      if (row.id === 'hire') {
        const short = s.player.maxCrew - s.player.crew;
        row.name.setText(`Hire sailors   ${s.player.crew}/${s.player.maxCrew}`);
        row.desc.setText(short > 0 ? `${Math.min(HIRE.crew, short)} more hands aboard: fewer sailors reload slower` : 'A full crew');
        row.cost.setText(short > 0 ? `${HIRE.cost} gold` : '-');
        row.bg.setAlpha(short > 0 && s.gold >= HIRE.cost ? 1 : 0.5);
        continue;
      }
      const u = UPGRADES[row.id];
      const r = rank(s, row.id);
      const cost = costOf(row.id, r);
      row.name.setText(`${u.name}   ${r}/${u.maxRank}`);
      row.desc.setText(u.desc);
      row.cost.setText(cost === null ? 'Maxed' : `${cost} gold`);
      row.bg.setAlpha(cost !== null && s.gold >= cost ? 1 : 0.5);
    }
    for (const load of this.loads) {
      const side = load.side === 'port' ? 'Port' : 'Starboard';
      // A Bomb Ketch's mortar side carries no guns to load.
      const mortar = HULLS[s.hull].mortarSide === load.side;
      const shot = SHOTS[s.loadout[load.side]];
      load.name.setText(mortar ? `${side}: Mortar` : `${side}: ${shot.name}`);
      load.desc.setText(mortar ? 'A shell lobbed to where the arc reaches' : shot.desc);
      load.swap.setVisible(!mortar);
    }
  }
}
