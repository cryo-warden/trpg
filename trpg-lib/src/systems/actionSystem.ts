import { createEphemeralDictionary } from "bitecs-helpers";
import { defineQuery, IWorld } from "bitecs";
import { Clock } from "../resources/clock";
import { ComponentRecord } from "../components";

export const actionSystem = ({ Actor }: ComponentRecord) => {
  const dictionary = createEphemeralDictionary<any>();
  const actorQuery = defineQuery([Actor]);

  return ({ clock }: { clock: Clock }) =>
    (world: IWorld) => {
      const actors = actorQuery(world);
      // WIP
      console.log(clock);
      for (let i = 0; i < actors.length; ++i) {
        const actor = actors[i];
        // TODO Define TrpgSystem which is a System with extra resources, especially dt and current time.
        // TODO Check the current/next action directly within the component.
        // Only proceed to check the dictionary if its data is needed to trigger the next step.
        if (Actor.id[actor] < 1) {
          Actor.id[actor] = dictionary.insert({});
        }
        // TODO Do stuff with the dictionary.
        // TODO Call dictionary.compress() and assign the new IDs every few thousand frames, or specifically if the frame rate is very high. Probably balance these two factors against each other.
      }
      return world;
    };
};
