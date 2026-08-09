import { useMemo } from "react";
import { useAppearanceFeatureAssetsOf } from "../Game/context/StdbContext/assetLookup";
import { useAppearanceFeaturesComponents } from "../Game/context/StdbContext/components";
import { EntityId } from "../Game/trpg";
import { getName } from "../Game/domain/appearance";

/**
 * Pulls appearance data and exposes the domain naming rule bound to a viewpoint.
 * Names currently come straight from the English strings embedded in the
 * appearance assets, which every language leverages for now. A future language
 * plugin will supply its own vocabulary picker here instead.
 */
export const useGetName = (viewpointEntityId: EntityId | null) => {
  const appearanceFeaturesComponents = useAppearanceFeaturesComponents();
  const appearanceFeatureAssetsOf = useAppearanceFeatureAssetsOf();

  return useMemo(() => {
    const appearanceFeatureIndexesByEntityId = new Map(
      appearanceFeaturesComponents.map((c) => [
        c.entityId,
        c.appearanceFeatureIndexes,
      ]),
    );

    return (input: {
      named: EntityId | string | undefined;
      subject?: EntityId | string | undefined;
    }): string | null =>
      getName({
        ...input,
        viewpoint: viewpointEntityId,
        appearanceFeaturesOf: (entityId) =>
          appearanceFeatureAssetsOf(
            appearanceFeatureIndexesByEntityId.get(entityId) ?? null,
          ),
      });
  }, [
    appearanceFeaturesComponents,
    appearanceFeatureAssetsOf,
    viewpointEntityId,
  ]);
};
