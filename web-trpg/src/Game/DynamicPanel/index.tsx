import { ComponentPropsWithRef } from "react";
import { Panel } from "../../structural/Panel";
import { useDynamicPanelMode } from "../context/DynamicPanelContext";
import { EPBar } from "../EntityPanel/EPBar";
import { HPBar } from "../EntityPanel/HPBar";
import { EntitiesDisplay } from "./EntitiesDisplay";
import { EntityId } from "../trpg";
import {
  useEntityProminences,
  useHpComponent,
  useLocation,
  useLocationEntities,
  usePlayerEntity,
} from "../context/StdbContext";

export const DynamicPanel = (props: ComponentPropsWithRef<typeof Panel>) => {
  const mode = useDynamicPanelMode();
  const playerEntity = usePlayerEntity();
  const location = useLocation(playerEntity);
  const locationEntities = useLocationEntities(location);
  const playerContents = useLocationEntities(playerEntity);
  const hpComponent = useHpComponent(playerEntity);
  const entities: EntityId[] =
    mode === "location"
      ? locationEntities
      : mode === "inventory"
      ? playerContents
      : mode === "equipment"
      ? [] // WIP Add equipment
      : [];
  const entityProminences = useEntityProminences(entities);
  const sortedEntities = entityProminences
    .filter((ep) => ep.entityId !== playerEntity)
    .toSorted((a, b) => b.prominence - a.prominence)
    .map((ep) => ep.entityId);

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

  // TODO Extend the token concept to also handle references between entities.
  return (
    <Panel {...props}>
      <EntitiesDisplay entityIds={sortedEntities} />
    </Panel>
  );
};
