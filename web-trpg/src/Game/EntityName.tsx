import { useMemo } from "react";
import {
  useBaseline,
  useBaselineComponent,
  useTraits,
  useTraitsComponent,
} from "./context/StdbContext";
import { EntityId } from "./trpg";

export const EntityName = ({ entityId }: { entityId: EntityId }) => {
  const baselineComponent = useBaselineComponent(entityId);
  const baseline = useBaseline(baselineComponent?.baselineId ?? null);
  const traitsComponent = useTraitsComponent(entityId);
  const traits = useTraits();
  const idToTraitName = useMemo(
    () => new Map(traits.map((t) => [t.id, t.name])),
    [traits]
  );
  const adjectives = (traitsComponent?.traitIds ?? []).map((id) =>
    idToTraitName.get(id)
  );
  if (baseline == null) {
    return "something";
  }
  return (
    (adjectives.length > 0 ? adjectives.join(", ") + " " : "") + baseline.name
  );
};
