import { defineQuery } from "bitecs";
import { createSystem } from "../../src";
import { Player } from "../components/Player";
import { Position } from "../components/Position";

export const createPlayerObserverSystem = (log: (text: string) => void) =>
  createSystem({
    queries: [defineQuery([Player]), defineQuery([Position])],
    crossAction: (playerId, id) => {
      const distance = Math.hypot(
        Position.x[playerId] - Position.x[id],
        Position.y[playerId] - Position.y[id],
        Position.z[playerId] - Position.z[id]
      );
      log(`Another entity ${id} is ${distance} away.`);
    },
  });
