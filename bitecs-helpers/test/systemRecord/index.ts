import { mergeFactoryRecords } from "../../src";
import { playerObserverSystem } from "./playerObserverSystem";
import { randomFlySystem } from "./randomFlySystem";

export const createSystemRecord = mergeFactoryRecords({
  randomFlySystem,
  playerObserverSystem,
});

export type SystemRecord = ReturnType<typeof createSystemRecord>;
