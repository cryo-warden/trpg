import { defineQuery, System } from "bitecs";
import { EntityId } from "bitecs-helpers";
import { getDistance } from "../vector";
import { ComponentRecord } from "../componentRecord";

// TODO Create a collision-detection-strategy resource type which provides logic for optimizing collision detections.

// TODO Create an Observation type to hold all data to be sent to an Observer.
export type Observation = [
  observer: EntityId,
  appearance: number,
  distance: number
];

export type ObservationTransmitter = {
  observations: Observation[];
};

// TODO Create an ActionObservationSystem to display actions of entities observed.

export const createObservationSystem = ({
  Observer,
  Position,
  Observable,
}: ComponentRecord): System<[ObservationTransmitter]> => {
  const observerQuery = defineQuery([Observer, Position]);
  const observableQuery = defineQuery([Observable, Position]);

  return (world, resourceRecord: ObservationTransmitter) => {
    const observers = observerQuery(world) as EntityId[];
    const observables = observableQuery(world) as EntityId[];

    resourceRecord.observations = [];

    // TODO Move this brute-force checking into a test-only library and use an AABB to allow two non-nested passes.

    for (let i = 0; i < observers.length; ++i) {
      const observer = observers[i];
      for (let i = 0; i < observables.length; ++i) {
        const observable = observables[i];

        if (observer === observable) {
          continue;
        }

        const distance = getDistance(observer, observable, Position);

        if (
          distance <
          Observer.range[observer] + Observable.range[observable]
        ) {
          resourceRecord.observations.push([
            observer,
            Observable.appearance[observable],
            distance,
          ]);
        }
      }
    }

    return world;
  };
};
