import "./index.css";
import {
  Entity,
  createEngine,
  bindRootSystem,
  updateEngine,
  createEntityFactory,
} from "action-trpg-lib";
import { useMemo, useEffect } from "react";
import { WithController } from "./ControllerContext";
import { WithEngine } from "./EngineContext";
import { EntitiesDisplay } from "./EntitiesDisplay";
import { Panel } from "../structural/Panel";
import { SelfDisplay } from "./SelfDisplay";
import { usePeriodicEffect } from "../structural/usePeriodicEffect";
import { updateWatchable } from "../structural/useWatchable";

const createEntity = createEntityFactory({
  name: "Unknown",
  hp: 5,
  mhp: 5,
  cdp: 0,
  ep: 5,
  mep: 5,
  actor: { attack: 0, actionState: null },
  controller: { type: "sequence", sequence: [] },
  healingTaker: { accumulatedHealing: 0 },
  damageTaker: {
    accumulatedDamage: 0,
    defense: 0,
    criticalDamageThreshold: 4,
  },
  criticalDamageTaker: {
    accumulatedCriticalDamage: 0,
    criticalDefense: 0,
  },
});

const createBat = createEntityFactory(
  createEntity({
    name: "Small Bat",
    hp: 3,
    mhp: 3,
    ep: 3,
    mep: 3,
    controller: { type: "sequence", sequence: [] },
  })
);

const entities = [
  createEntity({
    name: "Human",
    hp: 10,
    mhp: 10,
    ep: 10,
    mep: 10,
    controller: { type: "player", id: "me" },
  }),
  createBat({}),
  createBat({}),
  createBat({}),
  createBat({}),
  createBat({}),
] satisfies Entity[];

export const Game = ({
  period,
  controllerId,
}: {
  period: number;
  controllerId: string;
}) => {
  const engine = useMemo(() => createEngine(), []);

  (window as any).dev = { engine, updateWatchable };

  usePeriodicEffect(
    () => {
      const system = bindRootSystem(engine);

      return () => {
        updateEngine(engine);
        system();
        updateWatchable(engine);
        for (const entity of engine.world.with()) {
          updateWatchable(entity);
        }
      };
    },
    period,
    [engine]
  );

  useEffect(() => {
    for (const entity of entities) {
      engine.world.add(entity);
    }
    console.log("Adding initial entities.");
    updateWatchable(engine);
  }, [engine]);

  return (
    <WithEngine engine={engine}>
      <WithController controllerId={controllerId}>
        <div className="Game">
          <Panel className="events">Events</Panel>
          <Panel className="entities">
            <EntitiesDisplay />
          </Panel>
          <Panel className="self">
            <SelfDisplay />
          </Panel>
          <Panel className="target">Target</Panel>
          <Panel className="queue">Queue</Panel>
        </div>
      </WithController>
    </WithEngine>
  );
};
