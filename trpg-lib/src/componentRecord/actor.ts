import { defineComponent, Types } from "bitecs";
import { ComponentData, toMappedComponent } from "bitecs-helpers";
import { vectorSchema } from "../vector";

export const createActor = () =>
  toMappedComponent(
    defineComponent({
      id: Types.ui16,
      actions: [Types.ui16, 8],
      currentActionIndex: Types.ui8,
      currentActionPhase: Types.ui8,
      timeOfNextPhase: Types.f64,
      targetPosition: vectorSchema,
      targetEntity: Types.eid,
    }),
    {
      map: (value) => ({ ...value, targetEntity: null }),
      demap: (value) => ({ ...value, targetEntity: 0 }),
    }
  );

export const actorData: ComponentData<ReturnType<typeof createActor>> = {
  id: 0,
  actions: [0, 0, 0, 0, 0, 0, 0, 0],
  currentActionIndex: 0,
  currentActionPhase: 0,
  timeOfNextPhase: 0,
  targetPosition: { x: 0, y: 0, z: 0 },
  targetEntity: null,
};
