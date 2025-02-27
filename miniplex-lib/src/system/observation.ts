import { World } from "miniplex";
import { Entity } from "../entity";
import { gridDistance } from "../vector";
import { System } from ".";

export const createObservationSystem = (world: World<Entity>): System => {
  const observerEntities = world.with("observer", "position");
  const observableEntities = world.with("observable", "position");

  // TODO Implement more efficient collision detection via AABB. Move this brute-force implementation to tests to cross-check that version.
  return () => {
    for (const observer of observerEntities) {
      observer.observer.observationMap = new Map();

      for (const observable of observableEntities) {
        const d = gridDistance(observer.position, observable.position);
        if (d < observer.observer.range + observable.observable.range) {
          observer.observer.observationMap.set(observable, { distance: d });
        }
      }
    }
  };
};
