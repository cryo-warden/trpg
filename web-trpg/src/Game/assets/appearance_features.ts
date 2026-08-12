import { AppearanceFeatureAsset } from "../../stdb/types";

// The TS assets ARE the generated wire types; the helpers just construct
// those generated shapes.

const noun = (text: string, priority: number): AppearanceFeatureAsset => ({
  text,
  appearanceFeatureType: { tag: "Noun" },
  priority,
});

const adjective = (
  text: string,
  priority: number,
): AppearanceFeatureAsset => ({
  text,
  appearanceFeatureType: { tag: "Adjective" },
  priority,
});

export const APPEARANCE_FEATURES = {
  human: noun("human", -100),
  slime: noun("slime", 100),
  bat: noun("slime", 100),
  path: noun("path", 10000),
  rock: noun("rock", 10000),
  stone: noun("stone", 10000),
  boulder: noun("boulder", 10000),
  trail: noun("trail", 10000),
  opening: noun("opening", 10000),
  hole: noun("hole", 10000),
  chasm: noun("chasm", 10000),
  crack: noun("crack", 10000),
  room: noun("room", 10000),
  enclosure: noun("enclosure", 10000),
  tent: noun("tent", 10000),
  chamber: noun("chamber", 10000),
  dome: noun("dome", 10000),
  cavern: noun("cavern", 10000),
  tiny: adjective("tiny", 1000),
  small: adjective("small", 900),
  big: adjective("big", 900),
  huge: adjective("huge", 1000),
} satisfies Record<string, AppearanceFeatureAsset>;

export type AppearanceFeatureName = keyof typeof APPEARANCE_FEATURES;
