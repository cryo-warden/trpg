import { Entity } from "action-trpg-lib";
import { ComponentPropsWithRef } from "react";
import { Panel } from "../../structural/Panel";
import { useControllerEntity } from "../context/ControllerContext";
import { useDynamicPanelMode } from "../context/DynamicPanelContext";
import { EPBar } from "../EntityPanel/EPBar";
import { HPBar } from "../EntityPanel/HPBar";
import { EntitiesDisplay } from "./EntitiesDisplay";

const weighEntity = (entity: Entity) =>
  (entity.controller != null && !entity.unconscious ? 1 << 7 : 0) |
  (entity.path != null ? 1 << 6 : 0) |
  (entity.mhp != null ? 1 << 5 : 0) |
  (entity.contents != null ? 1 << 4 : 0) |
  (entity.equippable != null ? 1 << 3 : 0) |
  (entity.takeable != null ? 1 << 2 : 0);

export const DynamicPanel = (props: ComponentPropsWithRef<typeof Panel>) => {
  const mode = useDynamicPanelMode();
  const selfEntity = useControllerEntity();

  if (mode === "stats") {
    if (selfEntity == null) {
      return <Panel {...props} />;
    }

    return (
      <Panel {...props}>
        <div>{selfEntity.name}</div>
        <HPBar entity={selfEntity} />
        <EPBar entity={selfEntity} />
        <div>Attack: {selfEntity.attack ?? 0}</div>
        <div>Defense: {selfEntity.defense ?? 0}</div>
        <div>Critical Defense: {selfEntity.criticalDefense ?? 0}</div>
        <div>
          Critical Damage Threshold: {selfEntity.criticalDamageThreshold ?? 1}
        </div>
      </Panel>
    );
  }

  const entities =
    mode === "location"
      ? selfEntity?.location?.contents ?? []
      : mode === "inventory"
      ? selfEntity?.contents ?? []
      : mode === "equipment"
      ? selfEntity?.equipment ?? []
      : [];
  const sortedEntities = entities
    .filter((entity) => entity !== selfEntity)
    .toSorted((a, b) => weighEntity(b) - weighEntity(a));

  return (
    <Panel {...props}>
      <EntitiesDisplay entities={sortedEntities} />
    </Panel>
  );
};
