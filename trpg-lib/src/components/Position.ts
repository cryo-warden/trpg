import { defineComponent, Types } from "bitecs";

// TODO Create a vector library to hold Position structure and distance calculations.

export const Position = defineComponent({
  x: Types.f64,
  y: Types.f64,
  z: Types.f64,
});
