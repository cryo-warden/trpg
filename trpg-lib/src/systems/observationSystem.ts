import { defineQuery } from "bitecs";
import { createResourceSystem, EntityId } from "bitecs-helpers";
import { Observable } from "../components/Observable";
import { Observer } from "../components/Observer";
import { Position } from "../components/Position";

// TODO Create a collision-detection-strategy resource type which provides logic for optimizing collision detections.

// TODO Create an Observation type to hold all data to be sent to an Observer.
export type ObservationHandler = (
  observer: EntityId,
  appearance: number,
  distance: number
) => void;

export const observationSystem = createResourceSystem({
  queries: [
    defineQuery([Observer, Position]),
    defineQuery([Observable, Position]),
  ],
  crossAction:
    ({ observationHandler }: { observationHandler: ObservationHandler }) =>
    (observer, observable) => {
      const distance = Math.max(
        Math.abs(Position.x[observer] - Position.x[observable]),
        Math.abs(Position.y[observer] - Position.y[observable]),
        Math.abs(Position.z[observer] - Position.z[observable])
      );

      if (distance < Observer.range[observer] + Observable.range[observer]) {
        observationHandler(
          observer,
          Observable.appearance[observable],
          distance
        );
      }
    },
});
