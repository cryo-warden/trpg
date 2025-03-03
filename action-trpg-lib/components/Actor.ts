import type { ActionState } from "../structures/ActionState";

/** An Actor capable of participating in combat. */
export type Actor = {
  /** Attack added to attack effects */
  attack: number;
  /** Action State */
  actionState: null | ActionState;
};
