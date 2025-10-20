export type AppearanceFeatureType = "noun" | "adjective";

export type AppearanceFeatureAsset = {
  name: string;
  type: AppearanceFeatureType;
  text: string;
  priority: number;
};

const NOUN_APPEARANCE_FEATURES = [
  { name: "path", text: "path", priority: 10000 },
  { name: "room", text: "room", priority: 10000 },
  { name: "human", text: "human", priority: -100 },
  { name: "slime", text: "slime", priority: 100 },
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
      } as const)
  ),
  ...ADJECTIVE_APPEARANCE_FEATURES.map(
    (af) =>
      ({
        ...af,
        type: "adjective",
      } as const)
  ),
] as const satisfies readonly AppearanceFeatureAsset[];
