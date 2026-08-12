import { ComponentPropsWithRef } from "react";
import { Panel } from "../../structural/Panel";
import { useDynamicPanelMode } from "../context/DynamicPanelContext";
import { sortByProminenceDescending } from "../domain/prominence";
import {
  useAttackComponent,
  useEntityPresentations,
  useHpComponent,
  useLocation,
  useLocationEntities,
  usePlayerEntity,
} from "../context/StdbContext/components";
import { EntityName } from "../EntityName";
import { EPBar } from "../EntityPanel/EPBar";
import { HPBar } from "../EntityPanel/HPBar";
import { EntityId } from "../trpg";
import { EntitiesDisplay } from "./EntitiesDisplay";

export const DynamicPanel = (props: ComponentPropsWithRef<typeof Panel>) => {
  const mode = useDynamicPanelMode();
  const playerEntity = usePlayerEntity();
  const location = useLocation(playerEntity);
  const locationEntities = useLocationEntities(location);
  const playerContents = useLocationEntities(playerEntity);
  const hpComponent = useHpComponent(playerEntity);
  const attackComponent = useAttackComponent(playerEntity);
  const entities: EntityId[] =
    mode === "location"
      ? locationEntities
      : mode === "inventory"
      ? playerContents
      : mode === "equipment"
      ? [] // WIP Add equipment
      : [];
  const entityPresentations = useEntityPresentations(entities);
  const sortedEntities = sortByProminenceDescending({
    presentations: entityPresentations,
    exclude: playerEntity,
  });

  if (mode === "stats") {
    if (playerEntity == null) {
      return <Panel {...props} />;
    }

    return (
      <Panel {...props}>
        <div>
          <EntityName entityId={playerEntity} />
        </div>
        <HPBar entity={playerEntity} />
        <EPBar entity={playerEntity} />
        <div>Attack: {attackComponent?.attack ?? 0}</div>
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
