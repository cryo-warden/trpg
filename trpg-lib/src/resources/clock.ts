import { System } from "bitecs";

export type Clock = {
  readonly now: number;
  readonly deltaTime: number;
};

type ClockControl = {
  -readonly [key in keyof Clock]: Clock[key];
};

export const createClock = (): Clock => ({
  now: Date.now(),
  deltaTime: Number.MIN_VALUE,
});

// WIP Make Clock a logic-less object and create a clockSystem to perform the update logic.

type CreateClockSystem = (resourceRecord: { clock: ClockControl }) => System;

export const createClockSystem: CreateClockSystem =
  ({ clock }) =>
  (world) => {
    const now = Date.now();
    clock.deltaTime = now - clock.now;
    clock.now = now;

    return world;
  };
