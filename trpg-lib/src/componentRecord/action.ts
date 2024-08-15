import { defineComponent, ISchema, Types } from "bitecs";
import { vectorSchema } from "../vector";

export const actionSchema = {
  nextProgressTime: Types.f64,
} as const satisfies ISchema;

export type ActionSchema = typeof actionSchema;

export const createActionComponentRecord = () => {
  return {
    MoveAction: defineComponent({
      ...actionSchema,
      target: vectorSchema,
    }),
  };
};

export type ActionComponentRecord = ReturnType<
  typeof createActionComponentRecord
>;
