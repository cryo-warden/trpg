import type { Entity } from "../Entity";
import type { Resource } from "../Resource";
import type { ResourceActionName } from "../Resource/Action";

export type PlayerController<TResource extends Resource<TResource>> = {
  id: string;
  actionQueue: {
    action: ResourceActionName<TResource>;
    targets: readonly Entity<TResource>[];
  }[];
  hotkeyMap: Record<string, string>;
};

export type SequenceController = { type: "sequence"; sequenceIndex: number };

export type AwarenessState = "idle" | "alert";

export type AwarenessController<TResource extends Resource<TResource>> = {
  type: "awareness";
  state: AwarenessState;
};
