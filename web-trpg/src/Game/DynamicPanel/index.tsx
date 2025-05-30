import { ComponentPropsWithRef } from "react";
import { Panel } from "../../structural/Panel";
import { useDynamicPanelMode } from "../context/DynamicPanelContext";
import { EPBar } from "../EntityPanel/EPBar";
import { HPBar } from "../EntityPanel/HPBar";
import { EntitiesDisplay } from "./EntitiesDisplay";
import { EntityId } from "../trpg";
import {
  useHpComponent,
  useLocation,
  useLocationEntities,
  usePlayerEntity,
} from "../context/StdbContext";

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
  const playerEntity = usePlayerEntity();
  const location = useLocation(playerEntity);
  const locationEntities = useLocationEntities(location);
  const playerContents = useLocationEntities(playerEntity);
  const hpComponent = useHpComponent(playerEntity);

  if (mode === "stats") {
    if (playerEntity == null) {
      return <Panel {...props} />;
    }

    return (
      <Panel {...props}>
        <div>{/* WIP Show name. */ `Entity ${playerEntity}`}</div>
        <HPBar entity={playerEntity} />
        <EPBar entity={playerEntity} />
        <div>Attack: {/* WIP Add attack component. */ 0}</div>
        <div>Defense: {hpComponent?.defense ?? 0}</div>
      </Panel>
    );
  }

  const entities: EntityId[] =
    mode === "location"
      ? locationEntities
      : mode === "inventory"
      ? playerContents
      : mode === "equipment"
      ? [] // WIP Add equipment
      : [];
  const sortedEntities = entities
    .filter((entity) => entity !== playerEntity)
    .toSorted((a, b) => weighEntity(b) - weighEntity(a));

  // TODO Extend the token concept to also handle references between entities.
  return (
    <Panel {...props}>
      <EntitiesDisplay entityIds={sortedEntities} />
    </Panel>
  );
};
