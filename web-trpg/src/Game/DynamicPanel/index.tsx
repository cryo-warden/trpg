import { ComponentPropsWithRef } from "react";
import { Panel } from "../../structural/Panel";
import { Scroller } from "../../structural/Scroller";
import "./index.css";
import { useDynamicPanelMode } from "../context/DynamicPanelContext";
import { sortByProminenceDescending } from "../domain/prominence";
import {
  useEntityPresentations,
  useHostiles,
  useLocation,
  useLocationEntities,
  useOpenContainerContents,
  usePlayerEntity,
} from "../context/StdbContext/components";
import { LoadoutPanel } from "../LoadoutPanel";
import { StancesMenu } from "../StancesMenu";
import { targetHotkeyFor } from "../domain/hotkeys";
import { EntityId } from "../trpg";
import { EntitiesDisplay } from "./EntitiesDisplay";

/** LEFT home-row keys assigned down the displayed order. */
const targetHotkeys = (ordered: EntityId[]): Map<EntityId, string> => {
  const map = new Map<EntityId, string>();
  ordered.forEach((entity, index) => {
    const key = targetHotkeyFor(index);
    if (key != null) {
      map.set(entity, key);
    }
  });
  return map;
};

export const DynamicPanel = (props: ComponentPropsWithRef<typeof Panel>) => {
  const mode = useDynamicPanelMode();
  const playerEntity = usePlayerEntity();
  const location = useLocation(playerEntity);
  const locationEntities = useLocationEntities(location);
  // An opened container's contents show beside it — revealed, intact,
  // takeable in place.
  const revealedContents = useOpenContainerContents(locationEntities);
  const playerContents = useLocationEntities(playerEntity);
  const entities: EntityId[] =
    mode === "location"
      ? [...locationEntities, ...revealedContents]
      : mode === "inventory"
      ? playerContents
      : [];
  const entityPresentations = useEntityPresentations(entities);
  const sortedEntities = sortByProminenceDescending({
    presentations: entityPresentations,
    exclude: playerEntity,
  });
  const hostiles = useHostiles();

  // The stances menu owns its own scrolling: snap-locked horizontally
  // between stance cards, free vertically within each.
  if (mode === "stances") {
    return (
      <Panel {...props}>
        <StancesMenu />
      </Panel>
    );
  }

  // The worn-gear menu (armor + relics) lives in the equipment slot of the
  // dynamic panel.
  if (mode === "equipment") {
    return (
      <Panel {...props}>
        <Scroller>
          <LoadoutPanel />
        </Scroller>
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
      // Target hotkeys run down the DISPLAY order, threats first.
      const hotkeysByEntity = targetHotkeys([...hostiles, ...surroundings]);
      return (
        <Panel {...props}>
          <div className="DynamicSections">
            <section className="hostiles">
              <h3>Threats</h3>
              <Scroller>
                <EntitiesDisplay
                  entityIds={hostiles}
                  hotkeysByEntity={hotkeysByEntity}
                />
              </Scroller>
            </section>
            {surroundings.length > 0 && (
              <section className="surroundings">
                <h3>Surroundings</h3>
                <Scroller>
                  <EntitiesDisplay
                    entityIds={surroundings}
                    hotkeysByEntity={hotkeysByEntity}
                  />
                </Scroller>
              </section>
            )}
          </div>
        </Panel>
      );
    }
    const paths = sortedEntities.filter((id) => pathIds.has(id));
    const present = sortedEntities.filter((id) => !pathIds.has(id));
    const hotkeysByEntity = targetHotkeys([...paths, ...present]);
    return (
      <Panel {...props}>
        <div className="DynamicSections">
          {paths.length > 0 && (
            <section className="paths">
              <h3>Paths</h3>
              <Scroller>
                <EntitiesDisplay
                  entityIds={paths}
                  hotkeysByEntity={hotkeysByEntity}
                />
              </Scroller>
            </section>
          )}
          <section className="present">
            <h3>Here</h3>
            <Scroller>
              <EntitiesDisplay
                entityIds={present}
                hotkeysByEntity={hotkeysByEntity}
              />
            </Scroller>
          </section>
        </div>
      </Panel>
    );
  }

  // TODO Extend the token concept to also handle references between entities.
  return (
    <Panel {...props}>
      <Scroller>
        <EntitiesDisplay
          entityIds={sortedEntities}
          hotkeysByEntity={targetHotkeys(sortedEntities)}
        />
      </Scroller>
    </Panel>
  );
};
