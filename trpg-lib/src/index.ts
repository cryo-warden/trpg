import { addEntity, createWorld } from "bitecs";
import { createSystemOfPipeline, EntityId } from "bitecs-helpers";
import {
  createObservationSystem,
  ObservationTransmitter,
} from "./systems/observationSystem";
import { createActor, createComponentRecord } from "./componentRecord";
import { createVelocitySystem } from "./systems/velocitySystem";
import { Clock, clockSystem } from "./resources/clock";
import {
  createActionController,
  createActionSystem,
} from "./systems/actionSystem";
import { createEntitySerializer } from "./entity";
import { InputActions, inputSystem } from "./systems/inputSystem";

type EntityConfig = { nullEntity: EntityId };

const world = createWorld();

const resourceRecord: EntityConfig &
  InputActions &
  Clock &
  ObservationTransmitter = {
  nullEntity: addEntity(world) as EntityId,
  now: 0,
  dt: 1 / 60,
  observations: [],
  actions: [],
};

const componentRecord = createComponentRecord();

const { isActive } = createActionController(componentRecord);

const system = createSystemOfPipeline(
  clockSystem,
  inputSystem(componentRecord),
  createActionSystem(componentRecord),
  createVelocitySystem(componentRecord),
  createObservationSystem(componentRecord)
);

const { deserializeEntity, serializeEntity } =
  createEntitySerializer(componentRecord);

const player = deserializeEntity(world, {
  Actor: createActor(),
  Observer: { range: 30 },
  Position: { x: 0, y: 0, z: 0 },
  Velocity: { x: 0, y: 0, z: 0 },
  Observable: { range: 1, appearance: 15 },
  Life: { value: 10, maximumValue: 10 },
});

// A city, but need to add proper serialization of appearances.
deserializeEntity(world, {
  Position: { x: 0, y: 400, z: 0 },
  Observable: { range: 1000, appearance: 1027 },
});

const prompt = () => {
  console.log(`(${resourceRecord.now.toFixed(2)}) Enter your next action:`);
};

prompt();
for await (const line of console) {
  console.log(`You entered "${line}".`);
  if (line.toLowerCase() == "exit") {
    break;
  }

  resourceRecord.actions.push({ actor: player, command: line });

  const { now: lastInputTime } = resourceRecord;

  // WIP Watching the player Actor for now to develop multi-phasic actions and action queue.

  system(world, resourceRecord);
  console.log(resourceRecord.observations);
  console.log(serializeEntity(world, player).Actor);

  for (let i = 0; isActive(player); ++i) {
    system(world, resourceRecord);
    console.log(resourceRecord.observations);
    console.log(serializeEntity(world, player).Actor);

    if (resourceRecord.now >= lastInputTime + 10) {
      throw new Error(
        "Exceeded time limit waiting for player to finish their activity."
      );
    }

    if (i >= 10000) {
      throw new Error(
        "Exceeded iteration limit waiting for player to finish their activity."
      );
    }
  }

  prompt();
}
