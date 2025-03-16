import type { Entity } from "../Entity";
import type { Action } from "./Action";

export type PlayerController = {
  type: "player";
  id: string;
  actionQueue: { action: Action; targets: Entity[] }[];
};

export type SequenceController = { type: "sequence"; sequence: Action[] };

export type Controller = PlayerController | SequenceController;
