import { defineQuery } from "bitecs";
import { createResourceSystem } from "../../src";
import { ComponentRecord } from "../componentRecord";

export const playerObserverSystem = ({ Player, Position }: ComponentRecord) =>
  createResourceSystem({
    queries: [defineQuery([Player]), defineQuery([Position])],
    crossAction:
      ({ log }: { log: (...args: any) => void }) =>
      (playerId, id) => {
        const distance = Math.hypot(
          Position.x[playerId] - Position.x[id],
          Position.y[playerId] - Position.y[id],
          Position.z[playerId] - Position.z[id]
        );
        log(`Another entity ${id} is ${distance} away.`);
      },
  });
