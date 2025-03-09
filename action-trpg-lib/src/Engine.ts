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

export type World = MiniplexWorld<Entity>;

export type Engine = {
  world: World;
  time: number;
  deltaTime: number;
};

export const createEngine = (): Engine => ({
  world: new MiniplexWorld<Entity>(),
  deltaTime: 0,
  time: Date.now(),
});

export const updateEngine = (engine: Engine) => {
  const { time } = engine;
  engine.time = Date.now();
  engine.deltaTime = engine.time - time;
};
