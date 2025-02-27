import { type Actor } from "./ActionSystem/Actor";
import type { Item } from "./Item";

type PathState = "open" | "closed" | "locked";
export type Path = {
  room: Room;
  state: PathState;
};
type Room = {
  actors: Actor[];
  items: Item[];
  paths: Path[];
};
export type World = {
  turnRate: number;
  lastTurnTime: number;
  time: number;
  deltaTime: number;
  actors: Actor[];
  rooms: Room[];
};

export const updateWorld = (world: World) => {
  const { time } = world;
  world.time = Date.now();
  world.deltaTime = world.time - time;

  for (let i = 0; i < world.actors.length; ++i) {
    const actor = world.actors[i];
  }
};
