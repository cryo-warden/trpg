import { Types } from "../src";

export const Player = {} as const;

export const Position = {
  x: Types.f64,
  y: Types.f64,
  z: Types.f64,
} as const;

export const RandomFlier = {
  topSpeed: Types.f64,
} as const;
