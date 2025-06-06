import { useMemo } from "react";
import {
  useAppearanceFeatures,
  useAppearanceFeaturesComponent,
} from "./context/StdbContext";
import { EntityId } from "./trpg";

export const EntityName = ({ entityId }: { entityId: EntityId }) => {
  const appearanceFeaturesComponent = useAppearanceFeaturesComponent(entityId);
  const allAppearanceFeatures = useAppearanceFeatures();
  const idToAppearanceFeature = useMemo(
    () => new Map(allAppearanceFeatures.map((af) => [af.id, af])),
    [allAppearanceFeatures]
  );
  const appearanceFeatures = useMemo(
    () =>
      (appearanceFeaturesComponent?.appearanceFeatureIds ?? [])
        .map((id) => idToAppearanceFeature.get(id))
        .filter((id) => id != null),
    [appearanceFeaturesComponent, idToAppearanceFeature]
  );
  const adjectives = useMemo(
    () =>
      appearanceFeatures
        .filter((af) => af.appearanceFeatureType.tag === "Adjective")
        .toSorted((a, b) => a.priority - b.priority)
        .map((af) => af.text)
        .slice(0, 3),
    [appearanceFeatures]
  );
  const noun = useMemo(
    () =>
      appearanceFeatures
        .filter((af) => af.appearanceFeatureType.tag === "Noun")
        .toSorted((a, b) => a.priority - b.priority)[0]?.text ?? "something",
    [appearanceFeatures]
  );
  return (adjectives.length > 0 ? adjectives.join(", ") + " " : "") + noun;
};
