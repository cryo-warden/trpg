import { System } from "bitecs";
import { EntityId } from "bitecs-helpers";
import { Clock } from "../resources/clock";
import { ComponentRecord } from "../componentRecord";

export type InputActions = {
  actions: { actor: EntityId; command: string }[];
};

export const inputSystem =
  ({ Actor }: ComponentRecord): System<[InputActions & Clock]> =>
  (world, resource) => {
    const { now, actions } = resource;

    resource.actions = [];

    for (let i = 0; i < actions.length; ++i) {
      const { actor, command } = actions[i];
      // WIP Introduce configuration for various types of actions, with various phases, timings, and effects.
      if (command === "go") {
        Actor.actions[actor][Actor.currentActionIndex[actor]] = 1;
        Actor.timeOfNextPhase[actor] = now + 3;
      }
    }
    return world;
  };
