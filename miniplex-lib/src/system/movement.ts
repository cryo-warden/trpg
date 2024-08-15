import { World } from "miniplex";
import { Entity } from "../entity";
import { add } from "../vector";
import { System } from ".";

export const createMovementSystem = (world: World<Entity>): System => {
  const movingEntities = world.with("position", "velocity");

  return (dt) => {
    for (const { position, velocity } of movingEntities) {
      add(position, velocity, dt);
    }
  };
};
