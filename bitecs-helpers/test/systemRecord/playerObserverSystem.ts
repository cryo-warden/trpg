import { defineQuery } from "bitecs";
import { createSystemOf2Queries } from "../../src";
import { ComponentRecord } from "../componentRecord";

export const playerObserverSystem = ({ Player, Position }: ComponentRecord) =>
  createSystemOf2Queries(
    [defineQuery([Player]), defineQuery([Position])],
    (playerId, id, _, { log }: { log: (...args: any) => void }) => {
      const distance = Math.hypot(
        Position.x[playerId] - Position.x[id],
        Position.y[playerId] - Position.y[id],
        Position.z[playerId] - Position.z[id]
      );
      log(`Another entity ${id} is ${distance} away.`);
    }
  );
