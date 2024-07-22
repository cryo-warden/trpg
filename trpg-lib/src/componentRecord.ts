import { defineComponent, Types } from "bitecs";
import { vectorSchema } from "./vector";

export const createComponentRecord = () => {
  return {
    Actor: defineComponent({
      id: Types.ui16,
      actions: [Types.ui16, 8],
      timeOfNextAction: Types.f64,
      // WIP Include the time until next action here. Plan to later include more data about the next 1 to 4 actions. All other queued actions can go into a seldom-touched companion to the Actor component.
      // WIP how the hell do we add a queue within this format?
      // how to represent an Action?
    }),
    Damage: defineComponent({ value: Types.f64 }),
    Death: defineComponent(),
    Life: defineComponent({ value: Types.f64 }),
    Observable: defineComponent({ range: Types.f64, appearance: Types.i32 }),
    Observer: defineComponent({ range: Types.f64 }),
    Position: defineComponent(vectorSchema),
    Velocity: defineComponent(vectorSchema),
  };
};

export type ComponentRecord = ReturnType<typeof createComponentRecord>;
