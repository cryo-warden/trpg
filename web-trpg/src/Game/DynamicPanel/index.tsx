import { ComponentPropsWithRef } from "react";
import { Panel } from "../../structural/Panel";
import { useControllerEntityToken } from "../context/ControllerContext";
import { useDynamicPanelMode } from "../context/DynamicPanelContext";
import { EPBar } from "../EntityPanel/EPBar";
import { HPBar } from "../EntityPanel/HPBar";
import { EntitiesDisplay } from "./EntitiesDisplay";
import { Entity } from "../trpg";

const weighEntity = (entity: Entity) =>
  (entity.sequenceController != null && !entity.unconscious ? 1 << 7 : 0) |
  (entity.path != null ? 1 << 6 : 0) |
  (entity.mhp != null ? 1 << 5 : 0) |
  (entity.contents != null ? 1 << 4 : 0) |
  (entity.equippable != null ? 1 << 3 : 0) |
  (entity.takeable != null ? 1 << 2 : 0);

export const DynamicPanel = (props: ComponentPropsWithRef<typeof Panel>) => {
  const mode = useDynamicPanelMode();
  const selfEntityToken = useControllerEntityToken();

  if (mode === "stats") {
    if (selfEntityToken.value == null) {
      return <Panel {...props} />;
    }

    return (
      <Panel {...props}>
        <div>{selfEntityToken.value.name}</div>
        <HPBar entityToken={selfEntityToken} />
        <EPBar entityToken={selfEntityToken} />
        <div>Attack: {selfEntityToken.value.attack ?? 0}</div>
        <div>Defense: {selfEntityToken.value.defense ?? 0}</div>
        <div>
          Critical Defense: {selfEntityToken.value.criticalDefense ?? 0}
        </div>
        <div>
          Critical Damage Threshold:{" "}
          {selfEntityToken.value.criticalDamageThreshold ?? 1}
        </div>
      </Panel>
    );
  }

  const entities =
    mode === "location"
      ? selfEntityToken.value?.location?.contents ?? []
      : mode === "inventory"
      ? selfEntityToken.value?.contents ?? []
      : mode === "equipment"
      ? selfEntityToken.value?.equipment ?? []
      : [];
  const sortedEntities = entities
    .filter((entity) => entity !== selfEntityToken.value)
    .toSorted((a, b) => weighEntity(b) - weighEntity(a));

  // TODO Extend the token concept to also handle references between entities.
  return (
    <Panel {...props}>
      <EntitiesDisplay entities={sortedEntities} />
    </Panel>
  );
};
