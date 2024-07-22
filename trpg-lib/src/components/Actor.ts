import { defineComponent, Types } from "bitecs";
import { EntityId } from "bitecs-helpers";

// TODO Move to custom math library.
export type Vector3 = {
  x: number;
  y: number;
  z: number;
};

export type Action =
  | {
      type: "ability";
      targets: EntityId[];
    }
  | {
      type: "move";
      destination: Vector3;
    }
  | {
      type: "equip";
      item: EntityId;
    };

export const Actor = () =>
  defineComponent({
    id: Types.ui16,
    actions: [Types.ui16, 8],
    timeOfNextAction: Types.f64,
    // WIP Include the time until next action here. Plan to later include more data about the next 1 to 4 actions. All other queued actions can go into a seldom-touched companion to the Actor component.
    // WIP how the hell do we add a queue within this format?
    // how to represent an Action?
  });
