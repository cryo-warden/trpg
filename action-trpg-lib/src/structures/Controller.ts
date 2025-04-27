import type { Entity } from "../Entity";
import type { Resource, ResourceActionName } from "./Resource";

export type PlayerController<TResource extends Resource<TResource>> = {
  type: "player";
  id: string;
  actionQueue: {
    action: ResourceActionName<TResource>;
    targets: readonly Entity<TResource>[];
  }[];
  hotkeyMap: Record<string, string>;
};

export type SequenceController = { type: "sequence"; sequenceIndex: number };

export type AwarenessState = "idle" | "alert";

export type AwarenessController = { type: "awareness"; state: AwarenessState };

export type Controller<TResource extends Resource<TResource>> =
  | PlayerController<TResource>
  | SequenceController
  | AwarenessController;
