import { bindRootSystem, updateEngine } from "action-trpg-lib";
import { useEffect, useMemo } from "react";
import { regenerateToken } from "../structural/mutable";
import { Panel } from "../structural/Panel";
import { usePeriodicEffect } from "../structural/usePeriodicEffect";
import { WithController } from "./context/ControllerContext";
import { WithDynamicPanel } from "./context/DynamicPanelContext";
import { WithEngine } from "./context/EngineContext";
import { WithTarget } from "./context/TargetContext";
import { DynamicPanel } from "./DynamicPanel";
import { createEngine, createEntities } from "./trpg";
import { EventsPanel } from "./EventsPanel";
import "./index.css";
import { SelfPanel } from "./SelfPanel";
import { TargetPanel } from "./TargetPanel";

export const Game = ({
  period,
  controllerId,
}: {
  period: number;
  controllerId: string;
}) => {
  const engine = useMemo(() => createEngine(), []);
  const entities = useMemo(() => createEntities(engine), [engine]);

  (window as any).dev = {
    engine,
    regenerateToken,
    // TODO Also pass split version of entity lists, or add queryable system to find actions, rooms, paths, etc.
    // rooms,
    // paths,
    // items,
    // actors,
  };

  usePeriodicEffect(
    () => {
      const system = bindRootSystem(period)(engine);
      const allEntities = engine.world.with();

      return () => {
        updateEngine(engine);
        system();
        regenerateToken({ value: engine });
        for (const entity of allEntities) {
          regenerateToken({ value: entity });
        }
      };
    },
    500,
    [period, engine]
  );

  useEffect(() => {
    for (const entity of entities) {
      engine.world.add(entity);
    }
    regenerateToken({ value: engine });
  }, [engine]);

  return (
    <WithEngine engine={engine}>
      <WithDynamicPanel>
        <WithController controllerId={controllerId}>
          <WithTarget>
            <div className="Game">
              <EventsPanel className="events" />
              <DynamicPanel className="dynamic" />
              <SelfPanel className="self" />
              <TargetPanel className="target" />
              <Panel className="queue">Queue</Panel>
            </div>
          </WithTarget>
        </WithController>
      </WithDynamicPanel>
    </WithEngine>
  );
};
