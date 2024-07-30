import { defineQuery } from "bitecs";
import { createSystemOf2Queries, EntityId } from "bitecs-helpers";
import { getDistance } from "../vector";
import { ComponentRecord } from "../componentRecord";

// TODO Create a collision-detection-strategy resource type which provides logic for optimizing collision detections.

// TODO Create an Observation type to hold all data to be sent to an Observer.
export type ObservationHandler = (
  observer: EntityId,
  appearance: number,
  distance: number
) => void;

export type ObservationTransmitter = {
  observationHandler: ObservationHandler;
};

export const createObservationSystem = ({
  Observer,
  Position,
  Observable,
}: ComponentRecord) =>
  createSystemOf2Queries(
    [defineQuery([Observer, Position]), defineQuery([Observable, Position])],
    (
      observer,
      observable,
      _,
      { observationHandler }: ObservationTransmitter
    ) => {
      const distance = getDistance(observer, observable, Position);

      if (distance < Observer.range[observer] + Observable.range[observer]) {
        observationHandler(
          observer,
          Observable.appearance[observable],
          distance
        );
      }
    }
  );
