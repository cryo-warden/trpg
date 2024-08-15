import { defineComponent, Types } from "bitecs";
import { vectorSchema } from "../vector";
import { createActor } from "./actor";
import { createActionComponentRecord } from "./action";

export const createComponentRecord = () => {
  return {
    ...createActionComponentRecord(),
    Actor: createActor(),
    Damage: defineComponent({ value: Types.f64 }),
    Death: defineComponent({ timeOfDeath: Types.f64 }),
    Life: defineComponent({ value: Types.f32, maximumValue: Types.f32 }),
    Movement: defineComponent({
      target: vectorSchema,
    }),
    Observable: defineComponent({ range: Types.f64, appearance: Types.i32 }),
    Observer: defineComponent({ range: Types.f64 }),
    Position: defineComponent(vectorSchema),
    Velocity: defineComponent(vectorSchema),
  };
};

export type ComponentRecord = ReturnType<typeof createComponentRecord>;
