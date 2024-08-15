import { defineQuery } from "bitecs";
import { createSystemOfQuery } from "bitecs-helpers";
import { ComponentRecord } from "../componentRecord";

export const movementSystem = ({ Movement, Velocity }: ComponentRecord) =>
  createSystemOfQuery(defineQuery([Movement, Velocity]), (id) => {
    // TODO Add data to constrain movement according to surroundings.  Not everyone can fly, but most can swim. Not everyone can climb a wall, but most can climb stairs.
    Velocity.x[id] = Movement.target.x[id];
    Velocity.y[id] = Movement.target.y[id];
    Velocity.z[id] = Movement.target.z[id];
  });

new DataView(new ArrayBuffer(32)).getInt32(5);
