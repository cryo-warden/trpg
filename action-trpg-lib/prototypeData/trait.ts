import { createActionRecord } from "../src/structures/Action";
import { createTrait, createTraitRecord } from "../src/structures/StatBlock";
import { action } from "./action";

export const trait = createTraitRecord([
  createTrait("mobile", {
    actionRecord: createActionRecord([action.move]),
  }),
  createTrait("collecting", {
    actionRecord: createActionRecord([action.take, action.drop]),
  }),
  createTrait("equipping", {
    actionRecord: createActionRecord([action.equip, action.unequip]),
  }),
  createTrait("soft", { defense: -2 }),
  createTrait("tiny", { attack: -1, defense: -1 }),
  createTrait("little", { mhp: -1 }),
  createTrait("hero", { mhp: 5, mep: 5 }),
  createTrait("champion", { mhp: 2, mep: 2 }),
]);
