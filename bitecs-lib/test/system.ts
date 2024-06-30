import { defineQuery, System } from "../src";
import { componentRecord } from "./componentRecord";

const { Player, Position, RandomFlier } = componentRecord;

const playerQuery = defineQuery([Player]);
const positionQuery = defineQuery([Position]);
const randomFlierPositionQuery = defineQuery([Position, RandomFlier]);

export const randomWalkSystem: System = (world) => {
  const entities = randomFlierPositionQuery(world);
  for (let i = 0; i < entities.length; i++) {
    const entity = entities[i];
    Position.x[entity] +=
      2 * (Math.random() - 0.5) * RandomFlier.topSpeed[entity];
    Position.y[entity] +=
      2 * (Math.random() - 0.5) * RandomFlier.topSpeed[entity];
    Position.z[entity] +=
      2 * (Math.random() - 0.5) * RandomFlier.topSpeed[entity];
  }
  return world;
};

export const playerObservationSystem: System = (world) => {
  const players = playerQuery(world);
  const entities = positionQuery(world);
  for (let i = 0; i < players.length; ++i) {
    const playerId = players[i];
    for (let j = 0; j < entities.length; ++j) {
      const entityId = entities[j];
      if (playerId === entityId) {
        continue;
      }

      const distance = Math.hypot(
        Position.x[playerId] - Position.x[entityId],
        Position.y[playerId] - Position.y[entityId],
        Position.z[playerId] - Position.z[entityId]
      );
      console.log(`Something ${entityId} is ${distance} away.`);
    }
  }
  return world;
};
