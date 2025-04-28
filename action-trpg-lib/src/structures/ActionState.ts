import type { Engine } from "../Engine";
import type { Entity } from "../Entity";
import type { Resource } from "../Resource";
import type { ResourceActionName } from "../Resource/Action";

export type ActionState<TResource extends Resource<TResource>> = {
  action: ResourceActionName<TResource>;
  effectSequenceIndex: number;
  targets: readonly Entity<TResource>[];
};
export const createActionState = <const TResource extends Resource<TResource>>(
  /** `_engine` is included for type safety. */
  _engine: Engine<TResource>,
  action: ResourceActionName<TResource>,
  targets: readonly Entity<TResource>[]
): ActionState<TResource> => ({
  action,
  effectSequenceIndex: 0,
  targets,
});
