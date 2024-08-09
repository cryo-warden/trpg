import { createEphemeralDictionary } from "bitecs-helpers";
import { defineQuery, IWorld } from "bitecs";
import { Clock } from "../resources/clock";
import { ComponentRecord } from "../componentRecord";
import { actions } from "../resources/action";

export const createActionController = ({ Actor }: ComponentRecord) => {
  return {
    isActive: (actor: number) =>
      Actor.actions[actor][Actor.currentActionIndex[actor]] !== 0,
    timeUntilProgress: (actor: number, now: number) =>
      Actor.timeOfNextPhase[actor] - now,
    rotateActions: (actor: number) => {
      Actor.currentActionPhase[actor] = 0;
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
  const { isActive, timeUntilProgress, rotateActions } =
    createActionController(componentRecord);

  return (world: IWorld, { now }: Clock) => {
    const actors = actorQuery(world);
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
      if (isActive(actor) && timeUntilProgress(actor, now) <= 0) {
        const action = actions[Actor.currentActionIndex[actor]];
        if (Actor.currentActionPhase[actor] < action.phases.length) {
          const phase = action.phases[Actor.currentActionPhase[actor]];
          Actor.currentActionPhase[actor] += 1; // Could be combined with the above via post ++, but let the JIT compiler handle such a simple optimization.

          if (phase.type === "delay") {
            Actor.timeOfNextPhase[actor] += phase.delaySeconds;
          } else {
            phase.effect();
            // Effect phase takes 0 time, so immediately step to next one.
            Actor.currentActionPhase[actor] += 1;
          }
        } else {
          // TODO Do another pass over this code to fully work through initialization and rotation.
          // Do we need to set the timeOfNextPhase elsewhere, when we assign a new action?
        }
        console.log("COMPLETING ACTION:", actor);
        rotateActions(actor);
      }
    }
    return world;
  };
};
