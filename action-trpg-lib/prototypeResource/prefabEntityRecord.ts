import { createPrefabEntity, createPrefabEntityRecord } from "../src/Resource";

export const prefabEntityRecord = createPrefabEntityRecord([
  createPrefabEntity("anvil", {}),
  createPrefabEntity("sprocket", { takeable: true }),
  createPrefabEntity("gizmo", { takeable: true }),
  createPrefabEntity("dealymabob", { takeable: true }),
  createPrefabEntity("thingamajig", { takeable: true }),
  createPrefabEntity("stalactite", {}),
  createPrefabEntity("stalagmite", {}),
  createPrefabEntity("boulder", {}),
  createPrefabEntity("stone", { takeable: true }),
  createPrefabEntity("pebble", { takeable: true }),
]);
