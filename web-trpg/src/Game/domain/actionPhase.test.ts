import { test, expect } from "bun:test";
import { actionPhaseOf } from "./actionPhase";

// A heavy attack: prepare, strike, recover.
const rounds = [
  { sequenceIndex: 0, hasEffects: false },
  { sequenceIndex: 1, hasEffects: true },
  { sequenceIndex: 2, hasEffects: false },
];

test("an empty round before an effect round is preparation", () => {
  expect(actionPhaseOf({ sequenceIndex: 0, rounds })).toBe("preparing");
});

test("a round with effects is acting", () => {
  expect(actionPhaseOf({ sequenceIndex: 1, rounds })).toBe("acting");
});

test("an empty round after the last effect round is recovery", () => {
  expect(actionPhaseOf({ sequenceIndex: 2, rounds })).toBe("recovering");
});
