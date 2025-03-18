import "./index.css";
import {
  Entity,
  createEngine,
  bindRootSystem,
  updateEngine,
  createEntityFactory,
  createMapEntities,
  createRoom,
  createMutualPaths,
  baseline,
  trait,
} from "action-trpg-lib";
import { useMemo, useEffect } from "react";
import { WithController } from "./context/ControllerContext";
import { WithEngine } from "./context/EngineContext";
import { EntitiesDisplay } from "./EntitiesDisplay";
import { Panel } from "../structural/Panel";
import { SelfDisplay } from "./SelfDisplay";
import { usePeriodicEffect } from "../structural/usePeriodicEffect";
import { updateWatchable } from "../structural/useWatchable";
import { WithTarget } from "./context/TargetContext";
import { TargetDisplay } from "./TargetDisplay";

const mapEntities = createMapEntities({
  theme: "debug",
  exits: [],
  roomCount: 20,
  mainPathRoomCount: 10,
  loopCount: 5,
  decorationRange: { min: 1, max: 5 },
});

const rooms = [
  createRoom("Origin"),
  createRoom("Second Room"),
  ...mapEntities.rooms,
] satisfies Entity[];

const paths = [
  ...createMutualPaths(rooms[0], rooms[1]),
  ...createMutualPaths(rooms[0], rooms[2]),
  ...mapEntities.paths,
] satisfies Entity[];

const createActor = createEntityFactory({
  name: "Unknown",
  location: rooms[0],
  hp: 5,
  mhp: 5,
  cdp: 0,
  ep: 5,
  mep: 5,
  actor: { actionState: null },
  controller: { type: "sequence", sequence: [] },
  healingTaker: { accumulatedHealing: 0 },
  damageTaker: {
    accumulatedDamage: 0,
    criticalDamageThreshold: 4,
  },
  criticalDamageTaker: {
    accumulatedCriticalDamage: 0,
  },
});

const createBat = createEntityFactory(
  createActor({
    name: "Small Bat",
    hp: 3,
    mhp: 3,
    ep: 3,
    mep: 3,
    controller: { type: "sequence", sequence: [] },
  })
);

const createSlime = createEntityFactory(
  createActor({
    name: "Small Slime",
    hp: 1,
    mhp: 1,
    ep: 2,
    mep: 2,
    controller: { type: "sequence", sequence: [] },
    damageTaker: {
      accumulatedDamage: 0,
      criticalDamageThreshold: 2,
    },
  })
);

const actors = [
  createActor({
    name: "Human",
    location: rooms[0],
    hp: 10,
    mhp: 10,
    ep: 10,
    mep: 10,
    baseline: baseline.human,
    traits: [trait.hero],
    controller: { type: "player", id: "me", actionQueue: [] },
  }),
  ...Array.from({ length: 3 }, () => createBat({ location: rooms[0] })),
  ...Array.from({ length: 4 }, () => createSlime({ location: rooms[1] })),
] satisfies Entity[];

const entities = [
  ...rooms,
  ...paths,
  ...mapEntities.decorations,
  ...actors,
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
      const system = bindRootSystem(period)(engine);

      return () => {
        updateEngine(engine);
        system();
        updateWatchable(engine);
        for (const entity of engine.world.with()) {
          updateWatchable(entity);
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
    updateWatchable(engine);
  }, [engine]);

  return (
    <WithEngine engine={engine}>
      <WithController controllerId={controllerId}>
        <WithTarget>
          <div className="Game">
            <Panel className="events">Events</Panel>
            <Panel className="entities">
              <EntitiesDisplay />
            </Panel>
            <Panel className="self">
              <SelfDisplay />
            </Panel>
            <Panel className="target">
              <TargetDisplay />
            </Panel>
            <Panel className="queue">Queue</Panel>
          </div>
        </WithTarget>
      </WithController>
    </WithEngine>
  );
};
