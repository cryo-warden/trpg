import { World as MiniplexWorld } from "miniplex";
import type { Entity } from "./Entity";

type PathState = "open" | "closed" | "locked";
export type Path = {
  room: Room;
  state: PathState;
};
type Room = {
  entities: Entity[];
};
// export type World = {
//   turnRate: number;
//   lastTurnTime: number;
//   time: number;
//   deltaTime: number;
//   entities: Entity[];
//   rooms: Room[];
// };

// export const updateWorld = (world: World) => {
//   const { time } = world;
//   world.time = Date.now();
//   world.deltaTime = world.time - time;

//   for (let i = 0; i < world.entities.length; ++i) {
//     const actor = world.entities[i];
//   }
// };

export type World = MiniplexWorld<Entity>;

export const createWorld = () => new MiniplexWorld<Entity>();
