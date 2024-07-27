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
  assignee: EntityId,
  a: EntityId,
  VectorAssignee: Vector,
  VectorA: Vector = VectorAssignee
) => {
  VectorAssignee.x[assignee] += VectorA.x[a] * scale;
  VectorAssignee.y[assignee] += VectorA.y[a] * scale;
  VectorAssignee.z[assignee] += VectorA.z[a] * scale;
};

export const direct = (
  magnitude: number,
  assignee: EntityId,
  start: EntityId,
  end: EntityId,
  VectorAssignee: Vector,
  VectorStart: Vector = VectorAssignee,
  VectorEnd: Vector = VectorAssignee
) => {
  let x = VectorEnd.x[end] - VectorStart.x[start];
  let y = VectorEnd.y[end] - VectorStart.y[start];
  let z = VectorEnd.z[end] - VectorStart.z[start];
  const m = magnitude / Math.hypot(x, y, z);

  VectorAssignee.x[assignee] = x * m;
  VectorAssignee.y[assignee] = y * m;
  VectorAssignee.z[assignee] = z * m;
};

// WIP Add more vector ops.
