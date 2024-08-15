import { Vector } from "./vector";

// TODO Implement Appearance serialization with a numeric tuple that's efficient to transfer over network. Values from specific entities can then be transferred exactly once, on first observation.
export type Appearance = {
  name: string;
  description: string;
};

export type Action = {
  type: "move";
  destination: Vector;
};

export type Observation = { distance: number };

export type Entity = Partial<{
  position: Vector;
  velocity: Vector;
  observer: { range: number; observationMap: Map<Entity, Observation> };
  observable: { range: number; appearance: Appearance };
  actor: { timeOfNextAction: number; actionQueue: Action[] };
}>;
