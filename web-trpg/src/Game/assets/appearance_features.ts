export type AppearanceFeatureType = "noun" | "adjective";

export type AppearanceFeatureAsset = {
  name: string;
  type: AppearanceFeatureType;
  text: string;
  priority: number;
};

const NOUN_APPEARANCE_FEATURES = [
  { name: "human", text: "human", priority: -100 },
  { name: "slime", text: "slime", priority: 100 },
  { name: "path", text: "path", priority: 10000 },
  { name: "rock", text: "rock", priority: 10000 },
  { name: "stone", text: "stone", priority: 10000 },
  { name: "boulder", text: "boulder", priority: 10000 },
  { name: "opening", text: "opening", priority: 10000 },
  { name: "hole", text: "hole", priority: 10000 },
  { name: "chasm", text: "chasm", priority: 10000 },
  { name: "crack", text: "crack", priority: 10000 },
  { name: "room", text: "room", priority: 10000 },
  { name: "chamber", text: "chamber", priority: 10000 },
  { name: "dome", text: "dome", priority: 10000 },
  { name: "cavern", text: "cavern", priority: 10000 },
] as const;

const ADJECTIVE_APPEARANCE_FEATURES = [
  { name: "tiny", text: "tiny", priority: 1000 },
  { name: "small", text: "small", priority: 900 },
  { name: "big", text: "big", priority: 900 },
  { name: "huge", text: "huge", priority: 1000 },
] as const;

export const APPEARANCE_FEATURES = [
  ...NOUN_APPEARANCE_FEATURES.map(
    (af) =>
      ({
        ...af,
        type: "noun",
      }) as const,
  ),
  ...ADJECTIVE_APPEARANCE_FEATURES.map(
    (af) =>
      ({
        ...af,
        type: "adjective",
      }) as const,
  ),
] as const satisfies readonly AppearanceFeatureAsset[];
