import { useMemo } from "react";
import { useAppearanceFeaturesComponents } from "../Game/context/StdbContext/components";
import { EntityId } from "../Game/trpg";
import { appearanceFeatures, AppearanceFeatureAsset } from "../Game/assets";

const compareAppearanceFeatures = (
  a: AppearanceFeatureAsset,
  b: AppearanceFeatureAsset
) => b.priority - a.priority;

const getText = (a: AppearanceFeatureAsset) => a.text;

const getAppearanceFeatures = (ids: number[]) =>
  ids.map((id) => appearanceFeatures[id]).filter((af) => af != null);

// TODO Return different functions for different languages.
export const useGetName = (viewpointEntityId: EntityId | null) => {
  const appearanceFeaturesComponents = useAppearanceFeaturesComponents();

  return useMemo(() => {
    const entityIdToAppearanceFeaturesComponent = new Map(
      appearanceFeaturesComponents.map((c) => [c.entityId, c])
    );
    const entityIdToName = (entityId: EntityId): string => {
      const appearanceFeaturesComponent =
        entityIdToAppearanceFeaturesComponent.get(entityId);

      if (appearanceFeaturesComponent == null) {
        return "something";
      }

      const appearanceFeatures = getAppearanceFeatures(
        appearanceFeaturesComponent.appearanceFeatureIndexes
      );

      const noun =
        appearanceFeatures
          .filter((af) => af.type === "noun")
          .sort(compareAppearanceFeatures)[0]?.text ?? "something";

      const adjectives = appearanceFeatures
        .filter((af) => af.type === "adjective")
        .sort(compareAppearanceFeatures)
        .map(getText)
        .slice(0, 3)
        .reverse();

      return (adjectives.length > 0 ? adjectives.join(", ") + " " : "") + noun;
    };
    return (
      namedEntityId: EntityId | string | undefined,
      subjectEntityId?: EntityId | string | undefined
    ): string | null => {
      if (namedEntityId == null) {
        return null;
      }
      if (typeof namedEntityId === "string") {
        return namedEntityId;
      }
      if (viewpointEntityId === namedEntityId) {
        if (subjectEntityId === namedEntityId) {
          return "yourself";
        } else {
          return "you";
        }
      }
      return entityIdToName(namedEntityId);
    };
  }, [appearanceFeaturesComponents, viewpointEntityId]);
};
