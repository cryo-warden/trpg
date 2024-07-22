import { defineQuery } from "bitecs";
import { createResourceSystem } from "bitecs-helpers";
import { Clock } from "../resources/clock";
import { ComponentRecord } from "../components";
import { add } from "../vector";

export const createVelocitySystem = ({ Velocity, Position }: ComponentRecord) =>
  createResourceSystem({
    query: defineQuery([Velocity, Position]),
    action:
      ({ clock }: { clock: Clock }) =>
      (entity) => {
        add(clock.deltaTimeSeconds, entity, entity, Position, Velocity);
      },
  });
