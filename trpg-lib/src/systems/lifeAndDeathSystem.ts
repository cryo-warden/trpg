import { addComponent, defineQuery, IWorld, Not } from "bitecs";
import { createSystemOfQuery } from "bitecs-helpers";
import { ComponentRecord } from "../componentRecord";
import { Clock } from "../resources/clock";

export const lifeAndDeathSystem = ({ Life, Death }: ComponentRecord) =>
  createSystemOfQuery<[Clock]>(
    defineQuery([Life, Not(Death)]),
    (id, world: IWorld, { now }) => {
      if (Life.value[id] <= 0) {
        Life.value[id] = 0;
        addComponent(world, Death, id);
        Death.timeOfDeath[id] = now;
      }
    }
  );
