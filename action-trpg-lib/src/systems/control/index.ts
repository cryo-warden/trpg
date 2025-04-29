import playerControl from "./playerControl";
import sequenceControl from "./sequenceControl";
import validate from "./validate";

export const control = {
  playerControl,
  sequenceControl,
  validate,
} as const;
