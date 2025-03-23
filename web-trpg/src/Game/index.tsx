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
  createStatBlock,
  action,
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

const createAllegiance = createEntityFactory({ name: "Unknown Allegiance" });

const humanity = createAllegiance({ name: "Humanity" });
const batkind = createAllegiance({ name: "Batkind" });
const slimekind = createAllegiance({ name: "Slimekind" });

const allegiances = [humanity, batkind, slimekind] satisfies Entity[];

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

const createItem = createEntityFactory({
  name: "item",
  location: rooms[0],
  takeable: true,
});

const createActor = createEntityFactory({
  name: "Unknown",
  location: rooms[0],
  hp: 5,
  mhp: 5,
  cdp: 0,
  ep: 5,
  mep: 5,
  controller: { type: "sequence", sequenceIndex: 0 },
  criticalDamageThreshold: 4,
  status: {},
});

const magicHat = createItem({
  name: "magic hat",
  equippable: {
    capacityCost: 2,
    slot: "head",
    statBlock: createStatBlock({ mep: 10 }),
  },
});

const items = [
  magicHat,
  createItem({
    name: "magic stick",
    equippable: {
      capacityCost: 2,
      slot: "hand",
      statBlock: createStatBlock({ actions: [action.jab] }),
    },
  }),
] satisfies Entity[];

const createHuman = createEntityFactory(
  createActor({
    name: "Human",
    location: null,
    contents: [],
    allegiance: humanity,
    baseline: baseline.human,
  })
);

const player = createHuman({
  name: "Player",
  location: rooms[0],
  contents: [],
  hp: 10,
  mhp: 12,
  ep: 20,
  mep: 10,
  traits: [
    trait.hero,
    trait.hero,
    trait.hero,
    trait.mobile,
    trait.collecting,
    trait.equipping,
  ],
  equipment: [magicHat],
  controller: { type: "player", id: "me", actionQueue: [] },
});

magicHat.location = player;

const createBat = createEntityFactory(
  createActor({
    name: "Bat",
    allegiance: batkind,
    baseline: baseline.bat,
  })
);

const createSlime = createEntityFactory(
  createActor({
    name: "Slime",
    allegiance: slimekind,
    baseline: baseline.slime,
    criticalDamageThreshold: 2,
  })
);

const actors = [
  player,
  ...Array.from({ length: 3 }, () => createBat({ location: rooms[0] })),
  ...Array.from({ length: 4 }, () => createSlime({ location: rooms[1] })),
] satisfies Entity[];

const entities = [
  ...allegiances,
  ...rooms,
  ...paths,
  ...mapEntities.decorations,
  ...items,
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

  (window as any).dev = {
    engine,
    updateWatchable,
    rooms,
    paths,
    items,
    actors,
  };

  usePeriodicEffect(
    () => {
      const system = bindRootSystem(period)(engine);
      const allEntities = engine.world.with();

      return () => {
        updateEngine(engine);
        system();
        updateWatchable(engine);
        for (const entity of allEntities) {
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
