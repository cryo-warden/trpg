import type { Entity } from "../Entity";
import type { Action } from "./Action";

export type PlayerController = {
  type: "player";
  id: string;
  actionQueue: { action: Action; targets: Entity[] }[];
  hotkeyMap: Record<string, string>;
};

export type SequenceController = { type: "sequence"; sequenceIndex: number };

export type AwarenessState = "idle" | "alert";

export type AwarenessController = { type: "awareness"; state: AwarenessState };

export type Controller =
  | PlayerController
  | SequenceController
  | AwarenessController;
