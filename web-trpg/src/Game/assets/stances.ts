import { StanceAsset } from "../../stdb/types";
import { statBlock } from "./stat_block";
import { NO_REQUIREMENTS, requirements } from "./stat_requirements";

// A stance's stat block is an ordinary contribution to the entity's total —
// including its actionNames, the stance's granted techniques (at most 6;
// enforced at push). Its requirements gate ADOPTING it and are checked
// against the entity's stance-free base (body + traits + equipment).
//
// UPRIGHT is the posture stat: stances provide it, and actions that need
// footing require it (dive and lie_down need upright 1), so "you can't
// dive when already flat" is ordinary requirement filtering — no special
// cases. (A posture into the stance already held is separately filtered
// out of the derived actions: you can't stand when already standing.)
export const STANCES = {
  // The improvising default: nothing required, nothing granted, nothing
  // changed. What you can do standing is exactly what your body, traits, and
  // armaments provide.
  standing: {
    requirements: NO_REQUIREMENTS,
    statBlock: statBlock({ upright: 2, actionNames: ["dive"] }),
  },
  // Knocked down: harder to fight from, and gait sinks below what movement
  // actions require, so they drop out of the derived available actions.
  prone: {
    requirements: NO_REQUIREMENTS,
    statBlock: statBlock({ attack: -1, defense: -1, gait: -2 }),
  },
  sitting: {
    requirements: NO_REQUIREMENTS,
    statBlock: statBlock({
      defense: -1,
      gait: -2,
      upright: 1,
      actionNames: ["dive"],
    }),
  },
  // Defensive footing. Later this stance also carries the actions whose
  // added benefit is a favorable transition into another stance.
  ready: {
    requirements: NO_REQUIREMENTS,
    statBlock: statBlock({ defense: 1, upright: 2, actionNames: ["guard"] }),
  },
  brawler: {
    requirements: requirements({ hand: 1 }),
    statBlock: statBlock({ upright: 2 }),
  },
  dueling: {
    requirements: requirements({ bladed: 1 }),
    statBlock: statBlock({ attack: 1, upright: 2, actionNames: ["lunge"] }),
  },
  // Built for covering ground.
  striding: {
    requirements: NO_REQUIREMENTS,
    statBlock: statBlock({
      gait: 1,
      upright: 2,
      // Movement is offered by paths, never granted by stances.
      actionNames: [],
    }),
  },
  perched: {
    requirements: requirements({ wing: 1 }),
    statBlock: statBlock({ defense: 1, gait: -2, upright: 1 }),
  },
  flapping: {
    requirements: requirements({ wing: 2 }),
    statBlock: statBlock({
      gait: 2,
      upright: 2,
      // Movement is offered by paths, never granted by stances.
      actionNames: [],
    }),
  },
  // General magic; the elemental specializations trade breadth for a
  // sharper granted technique. (No mep grant: the maxima are a ratchet, so
  // a stance-carried maximum would be a one-time permanent boost.)
  casting: {
    requirements: requirements({ focus: 1 }),
    statBlock: statBlock({ upright: 2, actionNames: ["heal"] }),
  },
  fire_casting: {
    requirements: requirements({ focus: 1 }),
    statBlock: statBlock({ upright: 2, actionNames: ["fire_bolt"] }),
  },
  ice_casting: {
    requirements: requirements({ focus: 1 }),
    statBlock: statBlock({ defense: 1, upright: 2, actionNames: ["ice_shard"] }),
  },
  lightning_casting: {
    requirements: requirements({ focus: 1 }),
    statBlock: statBlock({ upright: 2, actionNames: ["lightning_arc"] }),
  },
  amorphous: {
    requirements: NO_REQUIREMENTS,
    statBlock: statBlock({}),
  },
  // The FORCED stance intimidation breaks entities into (registered via
  // coweringStanceName). Hands wrap around the head — hand-gated actions
  // starve out — but a crawl survives, and rally is the way back up.
  // Upright 1: huddled on knees, still able to throw yourself flat at a
  // weapon (the dive grab whose wielded morale can overcome the fear).
  cowering: {
    requirements: NO_REQUIREMENTS,
    statBlock: statBlock({
      attack: -1,
      defense: -1,
      hand: -2,
      gait: -1,
      upright: 1,
      actionNames: ["rally", "dive"],
    }),
  },
} satisfies Record<string, StanceAsset>;

export type StanceName = keyof typeof STANCES;

/** What a person reads as a stance card's title (see
 * ARMAMENT_DISPLAY_NAMES). */
export const STANCE_DISPLAY_NAMES: Record<StanceName, string> = {
  standing: "Standing",
  prone: "Prone",
  sitting: "Sitting",
  ready: "Ready",
  brawler: "Brawler",
  dueling: "Dueling",
  striding: "Striding",
  perched: "Perched",
  flapping: "Flapping",
  casting: "Casting",
  fire_casting: "Fire Casting",
  ice_casting: "Ice Casting",
  lightning_casting: "Lightning Casting",
  amorphous: "Amorphous",
  cowering: "Cowering",
};
