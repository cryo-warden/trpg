import { GroupedBlockAsset } from "../../stdb/types";

/** A FLAT authoring shorthand over the four canonical group blocks: anything not
 * mentioned contributes nothing. The client distributes these loose fields into
 * the generated {@link GroupedBlockAsset} (stats / body-capacity / readiness /
 * appearance) at author time; the wire types stay exact.
 *
 * `hand` is special: it is a stat in TWO blocks — body-capacity `hand` (slots to
 * HOLD gear) and readiness `hand` (free hands to STRIKE with). A single `hand`
 * here sets BOTH (a body with two hands has two free; gear that occupies grip
 * also removes a free hand), which is the common case. Gear that occupies grip
 * WITHOUT costing a free strike — gauntlets, certain shields — sets
 * `handReadiness` explicitly to override the readiness side. */
export type FlatBlock = {
  // stats
  mhp?: number;
  mep?: number;
  attack?: number;
  defense?: number;
  size?: number;
  // body-capacity
  hand?: number;
  body?: number;
  relic?: number;
  // readiness
  morale?: number;
  bladed?: number;
  blunt?: number;
  pole?: number;
  ward?: number;
  focus?: number;
  gait?: number;
  reach?: number;
  wing?: number;
  upright?: number;
  /** Explicit readiness-hand override; defaults to `hand` when omitted. */
  handReadiness?: number;
  jaw?: number;
  claw?: number;
  ooze?: number;
  // elemental channeling readiness — see ReadinessBlock. Paired with `focus`
  // on casting stances and channeling armaments; a spell needs both.
  fire?: number;
  ice?: number;
  lightning?: number;
  light?: number;
  shadow?: number;
  // body-composition posture readiness — see ReadinessBlock. A body's own
  // anatomy: `foot` (legged footing) and `amorphous` (formlessness) gate which
  // stances it can adopt. Come from the body, never from gear.
  foot?: number;
  amorphous?: number;
  ethereal?: number;
  // appearance GRANTED to the bearer (a body's own look, or a source's added
  // features). Gear's OWN look is the second arg to `gear`, never this.
  appearanceFeatureNames?: string[];
};

/** Distribute a flat authoring literal into the canonical grouped block. */
export const statBlock = (partial: FlatBlock): GroupedBlockAsset => {
  const hand = partial.hand ?? 0;
  return {
    stats: {
      mhp: partial.mhp ?? 0,
      mep: partial.mep ?? 0,
      attack: partial.attack ?? 0,
      defense: partial.defense ?? 0,
      size: partial.size ?? 0,
    },
    appearance: { featureNames: partial.appearanceFeatureNames ?? [] },
    bodyCapacity: {
      hand,
      body: partial.body ?? 0,
      relic: partial.relic ?? 0,
    },
    readiness: {
      morale: partial.morale ?? 0,
      bladed: partial.bladed ?? 0,
      blunt: partial.blunt ?? 0,
      pole: partial.pole ?? 0,
      ward: partial.ward ?? 0,
      focus: partial.focus ?? 0,
      gait: partial.gait ?? 0,
      reach: partial.reach ?? 0,
      wing: partial.wing ?? 0,
      upright: partial.upright ?? 0,
      // Most hand-occupying gear removes a free hand alongside the grip slot;
      // gauntlets and certain shields keep it via an explicit override.
      hand: partial.handReadiness ?? hand,
      jaw: partial.jaw ?? 0,
      claw: partial.claw ?? 0,
      ooze: partial.ooze ?? 0,
      fire: partial.fire ?? 0,
      ice: partial.ice ?? 0,
      lightning: partial.lightning ?? 0,
      light: partial.light ?? 0,
      shadow: partial.shadow ?? 0,
      foot: partial.foot ?? 0,
      amorphous: partial.amorphous ?? 0,
      ethereal: partial.ethereal ?? 0,
    },
  };
};
