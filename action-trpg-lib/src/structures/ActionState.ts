import type { Entity } from "../Entity";
import type { Action } from "./Action";

export type ActionState = {
  action: Action;
  effectSequenceIndex: number;
  targets: Entity[];
};
export const createActionState = (
  action: Action,
  targets: Entity[]
): ActionState => ({
  action,
  effectSequenceIndex: 0,
  targets,
});
