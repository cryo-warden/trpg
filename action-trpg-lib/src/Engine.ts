import { World as MiniplexWorld } from "miniplex";
import type { Entity } from "./Entity";
import type { Resource } from "./structures/Resource";

export type Engine<TResource extends Resource<TResource>> = {
  world: MiniplexWorld<Entity<TResource>>;
  time: number;
  deltaTime: number;
  resource: TResource;
};

export const createEngine = <const TResource extends Resource<TResource>>(
  resource: TResource
): Engine<TResource> => ({
  world: new MiniplexWorld<Entity<TResource>>(),
  deltaTime: 0,
  time: Date.now(),
  resource,
});

export const updateEngine = (engine: Engine<any>) => {
  const { time } = engine;
  engine.time = Date.now();
  engine.deltaTime = engine.time - time;
};
