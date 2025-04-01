import { Entity } from "action-trpg-lib";
import { Panel, PanelProps } from "../../structural/Panel";
import { useControllerEntity } from "../context/ControllerContext";
import { useDynamicPanelMode } from "../context/DynamicPanelContext";
import { EntitiesDisplay } from "./EntitiesDisplay";

const weighEntity = (entity: Entity) =>
  (entity.controller != null && !entity.unconscious ? 1 << 7 : 0) |
  (entity.path != null ? 1 << 6 : 0) |
  (entity.mhp != null ? 1 << 5 : 0) |
  (entity.contents != null ? 1 << 4 : 0) |
  (entity.equippable != null ? 1 << 3 : 0) |
  (entity.takeable != null ? 1 << 2 : 0);

export const DynamicPanel = (props: PanelProps) => {
  const mode = useDynamicPanelMode();
  const selfEntity = useControllerEntity();
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
