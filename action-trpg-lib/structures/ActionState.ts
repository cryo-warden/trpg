import type { Action } from "./Action";
import type { Target } from "./Target";

export type ActionState = {
  action: Action;
  effectSequenceIndex: number;
  target: Target;
};
export const createActionState = (
  action: Action,
  target: Target
): ActionState => ({
  action,
  effectSequenceIndex: 0,
  target,
});
