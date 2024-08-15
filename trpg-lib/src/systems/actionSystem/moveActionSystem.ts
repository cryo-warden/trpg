import {
  addComponent,
  defineQuery,
  hasComponent,
  IWorld,
  removeComponent,
} from "bitecs";
import { createSystemOfQuery } from "bitecs-helpers";
import { ComponentRecord } from "../../componentRecord";
import { Clock } from "../../resources/clock";

export const moveActionSystem = ({ MoveAction, Movement }: ComponentRecord) =>
  createSystemOfQuery<[Clock]>(
    defineQuery([MoveAction]),
    (id, world: IWorld, { now }) => {
      if (MoveAction.nextProgressTime[id] <= now) {
        if (!hasComponent(world, Movement, id)) {
          addComponent(world, Movement, id);
        }

        Movement.target.x[id] = MoveAction.target.x[id];
        Movement.target.y[id] = MoveAction.target.y[id];
        Movement.target.z[id] = MoveAction.target.z[id];

        removeComponent(world, MoveAction, id);
      }
    }
  );
