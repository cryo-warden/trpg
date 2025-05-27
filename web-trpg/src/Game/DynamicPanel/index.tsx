import { ComponentPropsWithRef } from "react";
import { Panel } from "../../structural/Panel";
import { useDynamicPanelMode } from "../context/DynamicPanelContext";
import { EPBar } from "../EntityPanel/EPBar";
import { HPBar } from "../EntityPanel/HPBar";
import { EntitiesDisplay } from "./EntitiesDisplay";
import { EntityId } from "../trpg";

// WIP
const weighEntity = (entity: EntityId) => Number(entity);
// (entity.sequenceController != null && !entity.unconscious ? 1 << 7 : 0) |
// (entity.path != null ? 1 << 6 : 0) |
// (entity.mhp != null ? 1 << 5 : 0) |
// (entity.contents != null ? 1 << 4 : 0) |
// (entity.equippable != null ? 1 << 3 : 0) |
// (entity.takeable != null ? 1 << 2 : 0);

export const DynamicPanel = (props: ComponentPropsWithRef<typeof Panel>) => {
  const mode = useDynamicPanelMode();
  const selfEntity = 1n; // WIP useControllerEntity();

  if (mode === "stats") {
    if (selfEntity == null) {
      return <Panel {...props} />;
    }

    return (
      <Panel {...props}>
        <div>{"WIP selfEntity.name"}</div>
        <HPBar entity={selfEntity} />
        <EPBar entity={selfEntity} />
        <div>Attack: {"WIP selfEntity.value.attack ?? 0"}</div>
        <div>Defense: {"WIP selfEntity.value.defense ?? 0"}</div>
        <div>
          Critical Defense: {"WIP selfEntity.value.criticalDefense ?? 0"}
        </div>
        <div>
          Critical Damage Threshold:{" "}
          {"selfEntity.value.criticalDamageThreshold ?? 1"}
        </div>
      </Panel>
    );
  }

  // WIP
  const entities: EntityId[] = [];
  // mode === "location"
  //   ? selfEntity.value?.location?.contents ?? []
  //   : mode === "inventory"
  //   ? selfEntity.value?.contents ?? []
  //   : mode === "equipment"
  //   ? selfEntity.value?.equipment ?? []
  //   : [];
  const sortedEntities = entities
    .filter((entity) => entity !== selfEntity)
    .toSorted((a, b) => weighEntity(b) - weighEntity(a));

  // TODO Extend the token concept to also handle references between entities.
  return (
    <Panel {...props}>
      <EntitiesDisplay entityIds={sortedEntities} />
    </Panel>
  );
};
