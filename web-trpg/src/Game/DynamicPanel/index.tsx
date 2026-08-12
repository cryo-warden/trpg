import { ComponentPropsWithRef } from "react";
import { Panel } from "../../structural/Panel";
import { useDynamicPanelMode } from "../context/DynamicPanelContext";
import { sortByProminenceDescending } from "../domain/prominence";
import {
  useAttackComponent,
  useCourageStatusComponent,
  useEntityPresentations,
  useFearStatusComponent,
  useHostiles,
  useHpComponent,
  useLocation,
  useLocationEntities,
  useMoraleComponent,
  usePlayerEntity,
} from "../context/StdbContext/components";
import { EntityName } from "../EntityName";
import { EPBar } from "../EntityPanel/EPBar";
import { HPBar } from "../EntityPanel/HPBar";
import { LoadoutPanel } from "../LoadoutPanel";
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
  const moraleComponent = useMoraleComponent(playerEntity);
  const fearStatus = useFearStatusComponent(playerEntity);
  const courageStatus = useCourageStatusComponent(playerEntity);
  const entities: EntityId[] =
    mode === "location"
      ? locationEntities
      : mode === "inventory"
      ? playerContents
      : [];
  const entityPresentations = useEntityPresentations(entities);
  const sortedEntities = sortByProminenceDescending({
    presentations: entityPresentations,
    exclude: playerEntity,
  });
  const hostiles = useHostiles();

  // The stance-customization menu lives in the equipment slot of the
  // dynamic panel.
  if (mode === "equipment") {
    return (
      <Panel {...props}>
        <LoadoutPanel />
      </Panel>
    );
  }

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
        <div>
          Morale: {moraleComponent?.morale ?? 0}
          {courageStatus != null && ` (+${courageStatus.morale} courage)`}
          {fearStatus != null && ` — fear ${fearStatus.intimidation}`}
        </div>
      </Panel>
    );
  }

  // The location renders as two views of the one system: threatened, the
  // hostiles lead and everything else — paths included — demotes into
  // surroundings; calm, paths get their own section on top. Nothing is ever
  // filtered out, only regrouped.
  if (mode === "location") {
    const threatened = hostiles.length > 0;
    const hostileSet = new Set(hostiles);
    const pathIds = new Set(
      entityPresentations
        .filter((presentation) => presentation.hasPath)
        .map((presentation) => presentation.entityId),
    );
    if (threatened) {
      const surroundings = sortedEntities.filter((id) => !hostileSet.has(id));
      return (
        <Panel {...props}>
          <section className="hostiles">
            <h3>Threats</h3>
            <EntitiesDisplay entityIds={hostiles} />
          </section>
          {surroundings.length > 0 && (
            <section className="surroundings">
              <h3>Surroundings</h3>
              <EntitiesDisplay entityIds={surroundings} />
            </section>
          )}
        </Panel>
      );
    }
    const paths = sortedEntities.filter((id) => pathIds.has(id));
    const present = sortedEntities.filter((id) => !pathIds.has(id));
    return (
      <Panel {...props}>
        {paths.length > 0 && (
          <section className="paths">
            <h3>Paths</h3>
            <EntitiesDisplay entityIds={paths} />
          </section>
        )}
        <section className="present">
          <h3>Here</h3>
          <EntitiesDisplay entityIds={present} />
        </section>
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
