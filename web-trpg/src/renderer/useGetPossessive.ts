import { useMemo } from "react";
import { useAppearanceFeatureAssetsOf } from "../Game/context/StdbContext/assetLookup";
import { useAppearanceFeaturesComponents } from "../Game/context/StdbContext/components";
import { possessiveForNoun } from "./en-us/appearanceFeatures";
import { EntityId } from "../Game/trpg";
import { getPossessive } from "../Game/domain/appearance";
import { NarrationPossessive } from "../Game/domain/narration";

/** Binds the possessive-pronoun rule to the live appearance data and the
 * current viewpoint, mirroring useGetName. */
export const useGetPossessive = (
  viewpointEntityId: EntityId | null,
): NarrationPossessive => {
  const appearanceFeaturesComponents = useAppearanceFeaturesComponents();
  const appearanceFeatureAssetsOf = useAppearanceFeatureAssetsOf();

  return useMemo(() => {
    const appearanceFeatureIndexesByEntityId = new Map(
      appearanceFeaturesComponents.map((c) => [
        c.entityId,
        c.appearanceFeatureIndexes,
      ]),
    );

    return (named) =>
      getPossessive({
        named,
        viewpoint: viewpointEntityId,
        appearanceFeaturesOf: (entityId) =>
          appearanceFeatureAssetsOf(
            appearanceFeatureIndexesByEntityId.get(entityId) ?? null,
          ),
        possessiveForNoun,
      });
  }, [
    appearanceFeaturesComponents,
    appearanceFeatureAssetsOf,
    viewpointEntityId,
  ]);
};
