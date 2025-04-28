import { createTrait, createTraitRecord } from "../src/Resource/Trait";

export const traitRecord = createTraitRecord([
  createTrait("mobile", {
    actionSet: new Set(["move"]),
  }),
  createTrait("collecting", {
    actionSet: new Set(["take", "drop"]),
  }),
  createTrait("equipping", {
    actionSet: new Set(["equip", "unequip"]),
  }),
  createTrait("soft", { defense: -2 }),
  createTrait("tiny", { attack: -1, defense: -1 }),
  createTrait("little", { mhp: -1 }),
  createTrait("hero", { mhp: 5, mep: 5 }),
  createTrait("champion", { mhp: 2, mep: 2 }),
]);
