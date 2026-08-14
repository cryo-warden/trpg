import { EntityId } from "../trpg";

/**
 * Counted-multiset logic over item INSTANCES referencing shared asset ids:
 * among the owned instances of one asset, the first `count` (in stable
 * enumeration order) read as "on" — equipped, worn, assigned. Pure and
 * shared by every menu and option rule that proposes or reads a counted
 * set, so an instance's on/off answer can never differ between them.
 */
export type CountedInstance = { entityId: EntityId; assetId: number };

export const instanceIndex = (
  items: readonly CountedInstance[],
  item: CountedInstance,
): number =>
  items
    .filter((other) => other.assetId === item.assetId)
    .findIndex((other) => other.entityId === item.entityId);

export const assetInstanceIsOn = ({
  ids,
  item,
  items,
}: {
  ids: readonly number[];
  item: CountedInstance;
  items: readonly CountedInstance[];
}): boolean =>
  instanceIndex(items, item) <
  ids.filter((id) => id === item.assetId).length;

export const toggledAssetIds = ({
  ids,
  item,
  items,
}: {
  ids: readonly number[];
  item: CountedInstance;
  items: readonly CountedInstance[];
}): number[] => {
  if (assetInstanceIsOn({ ids, item, items })) {
    const next = [...ids];
    next.splice(next.indexOf(item.assetId), 1);
    return next;
  }
  return [...ids, item.assetId];
};
