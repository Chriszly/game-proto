import Phaser from 'phaser';
import { bakePanel } from '../art/hud';
import { iconTexture, roadIcon } from '../art/icons';
import { C, N } from '../art/ink';
import { BOONS, type BoonId } from '../game/boons';
import { pairFor } from '../game/pairs';
import { ROADS, type Road } from '../game/state';
import { CARDS, FONT, UI_DEPTH, VIEW } from '../scenes/layout';

/** Where a card is on screen and which boon (or road) it offers; read by the playthrough test. */
export interface CardSpot {
  id: BoonId | Road;
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * The checkpoint choice: the run dims and two boon cards come up (three after a met dare), vellum
 * leaves ruled in gold with a painted icon. A cursed boon's card is edged in madder and says so; a
 * boon that is half of a pair says what the pair gives. Tapping one takes it. From stage 3 the two
 * road cards then come up the same way, and tapping one starts the stage on that road.
 */
export class BoonCards {
  private root: Phaser.GameObjects.Container;
  private shown: string | null = null;
  private title: Phaser.GameObjects.Text;
  cards: CardSpot[] = [];

  constructor(
    private scene: Phaser.Scene,
    private onPick: (id: BoonId) => void,
    private onRoad: (road: Road) => void,
  ) {
    if (!scene.textures.exists('card')) bakePanel(scene, 'card', CARDS.w, CARDS.h);
    if (!scene.textures.exists('card-cursed')) bakePanel(scene, 'card-cursed', CARDS.w, CARDS.h, C.madder);
    if (!scene.textures.exists('title-strip')) bakePanel(scene, 'title-strip', 440, 50);
    const dim = scene.add.rectangle(VIEW.w / 2, VIEW.h / 2, VIEW.w, VIEW.h, N.ink, 0.55).setInteractive();
    const y = CARDS.y - CARDS.h / 2 - 40;
    const strip = scene.add.image(VIEW.w / 2, y, 'title-strip');
    this.title = scene.add.text(VIEW.w / 2, y, '', { fontFamily: FONT, fontSize: '24px', fontStyle: 'bold', color: C.madder }).setOrigin(0.5);
    this.root = scene.add.container(0, 0, [dim, strip, this.title]).setDepth(UI_DEPTH + 10).setVisible(false);
  }

  /** Shows these boon choices, or the roads once the boon is taken, or hides the panel for both null. Rebuilds the cards only when they change. */
  show(choices: BoonId[] | null, roads: Road[] | null, ranks: Partial<Record<BoonId, number>>, stage: number) {
    const key = choices ? `boons:${choices.join()}` : roads ? `roads:${roads.join()}` : null;
    if (key === this.shown) return;
    this.shown = key;
    this.root.each((child: Phaser.GameObjects.GameObject) => {
      if (child.getData('card')) child.destroy();
    });
    this.cards = [];
    this.root.setVisible(!!key);
    if (choices) {
      this.title.setText(`Checkpoint ${stage}! Choose a boon`);
      const xs = CARDS.xs[choices.length] ?? CARDS.xs[2];
      choices.forEach((id, i) => this.addCard(id, xs[i], ranks[id] ?? 0, ranks));
    } else if (roads) {
      this.title.setText(`Choose your road for stage ${stage + 1}`);
      roads.forEach((road, i) => this.addRoadCard(road, CARDS.xs[2][i]));
    }
  }

  /** A vellum card at `x` with an icon and a name, and whatever it offers; tapping it calls `onTap`. */
  private card(id: BoonId | Road, x: number, texture: string, icon: string, name: string, parts: Phaser.GameObjects.GameObject[], onTap: () => void) {
    const { y, w, h } = CARDS;
    const scene = this.scene;
    const bg = scene.add.image(0, 0, texture);
    const glow = scene.add.rectangle(0, 0, w + 4, h + 4).setStrokeStyle(4, N.madder).setVisible(false);
    const iconImage = scene.add.image(0, -h / 2 + 62, icon);
    const title = scene.add
      .text(0, -h / 2 + 122, name, { fontFamily: FONT, fontSize: '22px', fontStyle: 'bold', color: C.madder, align: 'center' })
      .setOrigin(0.5);
    const card = scene.add.container(x, y, [bg, glow, iconImage, title, ...parts]).setData('card', true);
    bg.setInteractive({ useHandCursor: true })
      .on('pointerover', () => glow.setVisible(true))
      .on('pointerout', () => glow.setVisible(false))
      .on('pointerdown', onTap);
    this.root.add(card);
    this.cards.push({ id, x, y, w, h });
  }

  private addCard(id: BoonId, x: number, rank: number, ranks: Partial<Record<BoonId, number>>) {
    const b = BOONS[id];
    const { w, h } = CARDS;
    const scene = this.scene;
    const rankText = b.cursed ? 'Cursed: a gift with a price' : b.filler ? 'Heal' : rank === 0 ? (b.maxRank === 1 ? 'New' : `New, ${b.maxRank} ranks`) : `Rank ${rank + 1} of ${b.maxRank}`;
    const ranked = scene.add
      .text(0, -h / 2 + 148, rankText, { fontFamily: FONT, fontSize: '14px', fontStyle: b.cursed ? 'bold italic' : 'italic', color: b.cursed ? C.madder : rank === 0 ? '#2f7a4a' : C.lapis })
      .setOrigin(0.5);
    const text = scene.add
      .text(0, -h / 2 + 172, b.text, { fontFamily: FONT, fontSize: '17px', color: C.ink, align: 'center', wordWrap: { width: w - 44 } })
      .setOrigin(0.5, 0);
    const parts: Phaser.GameObjects.GameObject[] = [ranked, text];
    // The hint of a pair: what holding this boon with its partner unlocks.
    const pair = pairFor(id);
    if (pair) {
      const held = (ranks[pair.partner] ?? 0) > 0;
      const hint = held ? `With ${BOONS[pair.partner].name}: ${pair.pair.name}, ${pair.pair.text}` : `Pairs with ${BOONS[pair.partner].name}: ${pair.pair.text}`;
      parts.push(
        scene.add
          .text(0, h / 2 - 16, hint, { fontFamily: FONT, fontSize: '11.5px', fontStyle: held ? 'bold italic' : 'italic', color: held ? '#2f7a4a' : C.lapis, align: 'center', wordWrap: { width: w - 40 } })
          .setOrigin(0.5, 1),
      );
    }
    this.card(id, x, b.cursed ? 'card-cursed' : 'card', iconTexture(id), b.name, parts, () => this.onPick(id));
  }

  private addRoadCard(road: Road, x: number) {
    const r = ROADS[road];
    const { w, h } = CARDS;
    const scene = this.scene;
    const kind = scene.add
      .text(0, -h / 2 + 148, road === 'high' ? 'Bolder: more coins, more foes' : 'Safer: fewer foes, a shrine', { fontFamily: FONT, fontSize: '14px', fontStyle: 'italic', color: road === 'high' ? C.madder : '#2f7a4a' })
      .setOrigin(0.5);
    const text = scene.add
      .text(0, -h / 2 + 172, r.text, { fontFamily: FONT, fontSize: '17px', color: C.ink, align: 'center', wordWrap: { width: w - 44 } })
      .setOrigin(0.5, 0);
    this.card(road, x, 'card', roadIcon(road), r.name, [kind, text], () => this.onRoad(road));
  }
}
