import { createEphemeralDictionary, EntityId } from "bitecs-helpers";
import { defineQuery, IWorld } from "bitecs";
import { Clock } from "../resources/clock";
import { ComponentRecord } from "../componentRecord";

export const createActionController = ({ Actor }: ComponentRecord) => {
  return {
    isActive: (actor: EntityId) =>
      Actor.actions[actor][Actor.currentActionIndex[actor]] !== 0,
    timeUntilAction: (actor: EntityId, now: number) =>
      Actor.timeOfNextPhase[actor] - now,
    rotateActions: (actor: EntityId) => {
      Actor.actions[actor][Actor.currentActionIndex[actor]] = 0;
      Actor.currentActionIndex[actor] =
        (Actor.currentActionIndex[actor] + 1) % Actor.actions[actor].length;
    },
  };
};

export const createActionSystem = (componentRecord: ComponentRecord) => {
  const { Actor } = componentRecord;
  const dictionary = createEphemeralDictionary<any>();
  const actorQuery = defineQuery([Actor]);
  const { isActive, timeUntilAction, rotateActions } =
    createActionController(componentRecord);

  return (world: IWorld, { now }: Clock) => {
    const actors = actorQuery(world) as EntityId[];
    // WIP
    for (let i = 0; i < actors.length; ++i) {
      const actor = actors[i];
      // TODO Check the current/next action directly within the component.
      // Only proceed to check the dictionary if its data is needed to trigger the next step.
      if (Actor.id[actor] < 1) {
        Actor.id[actor] = dictionary.insert({});
      }
      // TODO Do stuff with the dictionary.
      // TODO Call dictionary.compress() and assign the new IDs every few thousand frames, or specifically if the frame rate is very high. Probably balance these two factors against each other.
      if (isActive(actor) && timeUntilAction(actor, now) <= 0) {
        console.log("COMPLETING ACTION:", actor);
        rotateActions(actor);
      }
    }
    return world;
  };
};
