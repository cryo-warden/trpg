import { defineQuery } from "bitecs";
import { createResourceSystem, EntityId } from "bitecs-helpers";
import { getDistance } from "../vector";
import { ComponentRecord } from "../componentRecord";

// TODO Create a collision-detection-strategy resource type which provides logic for optimizing collision detections.

// TODO Create an Observation type to hold all data to be sent to an Observer.
export type ObservationHandler = (
  observer: EntityId,
  appearance: number,
  distance: number
) => void;

export const createObservationSystem = ({
  Observer,
  Position,
  Observable,
}: ComponentRecord) =>
  createResourceSystem({
    queries: [
      defineQuery([Observer, Position]),
      defineQuery([Observable, Position]),
    ],
    crossAction:
      ({ observationHandler }: { observationHandler: ObservationHandler }) =>
      (observer, observable) => {
        const distance = getDistance(observer, observable, Position);

        if (distance < Observer.range[observer] + Observable.range[observer]) {
          observationHandler(
            observer,
            Observable.appearance[observable],
            distance
          );
        }
      },
  });
