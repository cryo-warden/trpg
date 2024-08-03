import { defineComponent, Types } from "bitecs";
import { vectorSchema } from "./vector";
import { TsComponent } from "bitecs-helpers";

export const createActor = (): TsComponent<ComponentRecord["Actor"]> => {
  return {
    id: 0,
    actions: [0, 0, 0, 0, 0, 0, 0, 0],
    currentActionIndex: 0,
    currentActionPhase: 0,
    timeOfNextPhase: 0,
    target: { x: 0, y: 0, z: 0 },
  };
};

export const createComponentRecord = () => {
  return {
    Actor: defineComponent({
      id: Types.ui16,
      actions: [Types.ui16, 8],
      currentActionIndex: Types.ui8,
      currentActionPhase: Types.ui8,
      timeOfNextPhase: Types.f64,
      target: vectorSchema,
    }),
    Damage: defineComponent({ value: Types.f64 }),
    Death: defineComponent({ timeOfDeath: Types.f64 }),
    Life: defineComponent({ value: Types.f32, maximumValue: Types.f32 }),
    Observable: defineComponent({ range: Types.f64, appearance: Types.i32 }),
    Observer: defineComponent({ range: Types.f64 }),
    Position: defineComponent(vectorSchema),
    Velocity: defineComponent(vectorSchema),
  };
};

export type ComponentRecord = ReturnType<typeof createComponentRecord>;
