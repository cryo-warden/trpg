import { test, expect } from "bun:test";
import { LOCATION_MAPS, LOCATION_MAP_CONNECTIONS } from "./location_maps";

// The world graph must be CONNECTED: every authored map reachable from the
// starting zone through the connection list. A map missing from the graph
// is authored content no player can ever stand in.
test("every authored location map is reachable from start_zone", () => {
  const neighbors = new Map<string, string[]>();
  for (const connection of LOCATION_MAP_CONNECTIONS) {
    const from = connection.exitLocationMapName;
    const to = connection.destinationLocationMapName;
    neighbors.set(from, [...(neighbors.get(from) ?? []), to]);
    if (connection.bothWays) {
      neighbors.set(to, [...(neighbors.get(to) ?? []), from]);
    }
  }

  const reached = new Set<string>();
  const queue = ["start_zone"];
  while (queue.length > 0) {
    const current = queue.pop()!;
    if (reached.has(current)) {
      continue;
    }
    reached.add(current);
    queue.push(...(neighbors.get(current) ?? []));
  }

  const unreachable = Object.keys(LOCATION_MAPS).filter(
    (name) => !reached.has(name),
  );
  expect(unreachable).toEqual([]);
});

// Connections must also only NAME authored maps: a typo here would fail
// the asset push at runtime; fail it at test time instead.
test("every connection endpoint names an authored map", () => {
  const known = new Set(Object.keys(LOCATION_MAPS));
  for (const connection of LOCATION_MAP_CONNECTIONS) {
    expect(known.has(connection.exitLocationMapName)).toBe(true);
    expect(known.has(connection.destinationLocationMapName)).toBe(true);
  }
});
