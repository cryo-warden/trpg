export type Vector = {
  x: number;
  y: number;
  z: number;
};

export const createVector = (x = 0, y = 0, z = 0): Vector => ({ x, y, z });

export const copy = ({ x, y, z }: Vector): Vector => ({ x, y, z });

export const add = (assignee: Vector, v: Vector, scale: number = 1) => {
  assignee.x += v.x * scale;
  assignee.y += v.y * scale;
  assignee.z += v.z * scale;
};

export const distance = (a: Vector, b: Vector) =>
  Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y), Math.abs(a.z - b.z));

export const direct = (
  assignee: Vector,
  start: Vector,
  end: Vector,
  magnitude: number
) => {
  const diffX = end.x - start.x;
  const diffY = end.y - start.y;
  const diffZ = end.z - start.z;
  const normalizer = magnitude / Math.hypot(diffX, diffY, diffZ);
  assignee.x = diffX * normalizer;
  assignee.y = diffY * normalizer;
  assignee.z = diffZ * normalizer;
};
