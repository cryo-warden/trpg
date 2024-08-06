import { ComponentType, Types } from "bitecs";

export const vectorSchema = {
  x: Types.f64,
  y: Types.f64,
  z: Types.f64,
};

export type Vector = ComponentType<typeof vectorSchema>;

export const getDistance = (
  endEntity: number,
  startEntity: number,
  VectorA: Vector,
  VectorB: Vector = VectorA
) =>
  Math.max(
    Math.abs(VectorA.x[endEntity] - VectorB.x[startEntity]),
    Math.abs(VectorA.y[endEntity] - VectorB.y[startEntity]),
    Math.abs(VectorA.z[endEntity] - VectorB.z[startEntity])
  );

export const add = (
  scale: number,
  assigneeEntity: number,
  entity: number,
  VectorAssignee: Vector,
  VectorA: Vector = VectorAssignee
) => {
  VectorAssignee.x[assigneeEntity] += VectorA.x[entity] * scale;
  VectorAssignee.y[assigneeEntity] += VectorA.y[entity] * scale;
  VectorAssignee.z[assigneeEntity] += VectorA.z[entity] * scale;
};

export const direct = (
  magnitude: number,
  assigneeEntity: number,
  startEntity: number,
  endEntity: number,
  VectorAssignee: Vector,
  VectorStart: Vector = VectorAssignee,
  VectorEnd: Vector = VectorAssignee
) => {
  let x = VectorEnd.x[endEntity] - VectorStart.x[startEntity];
  let y = VectorEnd.y[endEntity] - VectorStart.y[startEntity];
  let z = VectorEnd.z[endEntity] - VectorStart.z[startEntity];
  const m = magnitude / Math.hypot(x, y, z);

  VectorAssignee.x[assigneeEntity] = x * m;
  VectorAssignee.y[assigneeEntity] = y * m;
  VectorAssignee.z[assigneeEntity] = z * m;
};

// WIP Add more vector ops.
