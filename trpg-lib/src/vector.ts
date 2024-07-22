import { ComponentType, Types } from "bitecs";
import { EntityId } from "bitecs-helpers";

export const vectorSchema = {
  x: Types.f64,
  y: Types.f64,
  z: Types.f64,
};

export type Vector = ComponentType<typeof vectorSchema>;

export const getDistance = (
  a: EntityId,
  b: EntityId,
  VectorA: Vector,
  VectorB: Vector = VectorA
) =>
  Math.max(
    Math.abs(VectorA.x[a] - VectorB.x[b]),
    Math.abs(VectorA.y[a] - VectorB.y[b]),
    Math.abs(VectorA.z[a] - VectorB.z[b])
  );

export const add = (
  scale: number,
  a: EntityId,
  b: EntityId,
  VectorA: Vector,
  VectorB: Vector = VectorA
) => {
  VectorA.x[a] += VectorB.x[b] * scale;
  VectorA.y[a] += VectorB.y[b] * scale;
  VectorA.z[a] += VectorB.z[b] * scale;
};

// WIP Add more vector ops.
