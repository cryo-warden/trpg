import type { Action } from "./Action";

export type PlayerController = { type: "player"; id: string };

export type SequenceController = { type: "sequence"; sequence: Action[] };

export type Controller = PlayerController | SequenceController;
