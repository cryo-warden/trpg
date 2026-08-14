import { StanceAsset } from "../../stdb/types";
import { statBlock } from "./stat_block";
import { NO_REQUIREMENTS, requirements } from "./stat_requirements";

// A stance's stat block is an ordinary contribution to the entity's total —
// including its actionNames, the stance's granted techniques (at most 6;
// enforced at push). Its requirements gate ADOPTING it and are checked
// against the entity's stance-free base (body + traits + equipment).
export const STANCES = {
  // The improvising default: nothing required, nothing granted, nothing
  // changed. What you can do standing is exactly what your body, traits, and
  // armaments provide.
  standing: {
    requirements: NO_REQUIREMENTS,
    statBlock: statBlock({ actionNames: ["dive"] }),
  },
  // Knocked down: harder to fight from, and gait sinks below what movement
  // actions require, so they drop out of the derived available actions.
  prone: {
    requirements: NO_REQUIREMENTS,
    statBlock: statBlock({ attack: -1, defense: -1, gait: -2 }),
  },
  sitting: {
    requirements: NO_REQUIREMENTS,
    statBlock: statBlock({ defense: -1, gait: -2, actionNames: ["dive"] }),
  },
  // Defensive footing. Later this stance also carries the actions whose
  // added benefit is a favorable transition into another stance.
  ready: {
    requirements: NO_REQUIREMENTS,
    statBlock: statBlock({ defense: 1, actionNames: ["guard"] }),
  },
  brawler: {
    requirements: requirements({ hand: 1 }),
    statBlock: statBlock({}),
  },
  dueling: {
    requirements: requirements({ bladed: 1 }),
    statBlock: statBlock({ attack: 1, actionNames: ["lunge"] }),
  },
  // Built for covering ground.
  striding: {
    requirements: NO_REQUIREMENTS,
    statBlock: statBlock({ gait: 1, actionNames: ["move", "quick_move"] }),
  },
  perched: {
    requirements: requirements({ wing: 1 }),
    statBlock: statBlock({ defense: 1, gait: -2 }),
  },
  flapping: {
    requirements: requirements({ wing: 2 }),
    statBlock: statBlock({ gait: 2, actionNames: ["move", "quick_move"] }),
  },
  // General magic; the elemental specializations trade breadth for a
  // sharper granted technique. (No mep grant: max pools are a ratchet, so
  // a stance-carried pool would be a one-time permanent boost.)
  casting: {
    requirements: requirements({ focus: 1 }),
    statBlock: statBlock({ actionNames: ["divine_heal"] }),
  },
  fire_casting: {
    requirements: requirements({ focus: 1 }),
    statBlock: statBlock({ actionNames: ["fire_bolt"] }),
  },
  ice_casting: {
    requirements: requirements({ focus: 1 }),
    statBlock: statBlock({ defense: 1, actionNames: ["ice_shard"] }),
  },
  lightning_casting: {
    requirements: requirements({ focus: 1 }),
    statBlock: statBlock({ actionNames: ["lightning_arc"] }),
  },
  amorphous: {
    requirements: NO_REQUIREMENTS,
    statBlock: statBlock({}),
  },
  // The FORCED stance intimidation breaks entities into (registered via
  // coweringStanceName). Hands wrap around the head — hand-gated actions
  // starve out — but a crawl survives, and rally is the way back up.
  cowering: {
    requirements: NO_REQUIREMENTS,
    statBlock: statBlock({
      attack: -1,
      defense: -1,
      hand: -2,
      gait: -1,
      actionNames: ["rally", "dive"],
    }),
  },
} satisfies Record<string, StanceAsset>;

export type StanceName = keyof typeof STANCES;
