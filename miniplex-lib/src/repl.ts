import {
  createMovementSystem,
  createObservationSystem,
  System,
} from "./system";
import { createActionSystem } from "./system/actionSystem";
import { createWorld } from "./world";

const world = createWorld();
const worldClock = { now: 0 };

const movementSystem = createMovementSystem(world);
const observationSystem = createObservationSystem(world);
const actionSystem = createActionSystem(world, worldClock);

const system: System = (dt) => {
  actionSystem(dt);
  movementSystem(dt);
  observationSystem(dt);
};

const player = world.add({
  actor: { timeOfNextAction: 0, actionQueue: [] },
  observer: { range: 30, observationMap: new Map() },
  position: { x: 0, y: 0, z: 0 },
  velocity: { x: 0, y: 0, z: 0 },
  observable: {
    range: 1,
    appearance: {
      name: "The Player",
      description: "An embodied incursion from an exterior reality.",
    },
  },
  // Life: { value: 10, maximumValue: 10 },
});

const city = world.add({
  position: { x: 0, y: 400, z: 0 },
  observable: {
    range: 1000,
    appearance: {
      name: "A City",
      description: "Not to be confused with B City.",
    },
  },
});

const prompt = () => {
  console.log(`(${worldClock.now.toFixed(2)}) Enter your next action:`);
};

prompt();
for await (const line of console) {
  const lastInputTime = worldClock.now;
  console.log(`You entered "${line}".`);
  if (line.toLowerCase() == "exit") {
    break;
  }

  if (line === "go") {
    // TODO Use focus as destination. Rename action type to "approach".
    player.actor.timeOfNextAction = worldClock.now + 3;
    player.actor.actionQueue.push({ type: "move", destination: city.position });
  }

  // WIP Watching the player Actor for now to develop multi-phasic actions and action queue.

  console.log(player.observer.observationMap);
  console.log(player.actor);

  for (let i = 0; player.actor.actionQueue.length > 0; ++i) {
    worldClock.now += 1 / 60;
    system(1 / 60);

    if (worldClock.now >= lastInputTime + 10) {
      throw new Error(
        "Exceeded time limit waiting for player to finish their activity."
      );
    }

    if (i >= 10000) {
      throw new Error(
        "Exceeded iteration limit waiting for player to finish their activity."
      );
    }
  }

  console.log(player.observer.observationMap);
  console.log(player.actor);
  console.log(player.velocity);

  prompt();
}
