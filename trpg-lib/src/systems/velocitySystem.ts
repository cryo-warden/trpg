import { defineQuery } from "bitecs";
import { ComponentRecord } from "../componentRecord";
import { add } from "../vector";
import { createSystemOfQuery } from "bitecs-helpers";
import { Clock } from "../resources/clock";

export const createVelocitySystem = ({ Velocity, Position }: ComponentRecord) =>
  createSystemOfQuery<[Clock]>(
    defineQuery([Velocity, Position]),
    (entity, _, { dt }) => {
      add(dt, entity, entity, Position, Velocity);
    }
  );
