import { defineQuery } from "bitecs";
import { createSystemOf2QueriesDistinct } from "../../src";
import { Player } from "../components/Player";
import { Position } from "../components/Position";

export const createPlayerObserverSystem = (log: (text: string) => void) =>
  createSystemOf2QueriesDistinct(
    defineQuery([Player]),
    defineQuery([Position]),
    (playerId, id) => {
      const distance = Math.hypot(
        Position.x[playerId] - Position.x[id],
        Position.y[playerId] - Position.y[id],
        Position.z[playerId] - Position.z[id]
      );
      log(`Another entity ${id} is ${distance} away.`);
    }
  );
