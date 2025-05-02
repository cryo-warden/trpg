import { createMapEntities } from "../../structures/Map";
import { createSystem } from "../createSystem";

export default createSystem((engine) => {
  const mappedEntities = engine.world.with("locationMapName");
  const mappedPlayerEntities = engine.world.with(
    "playerController",
    "locationMapName"
  );
  const mapEntities = engine.world.with(
    "name",
    "mapThemeName",
    "mapLayout",
    "mapTotalRoomCount",
    "mapMinDecorationCount",
    "mapMaxDecorationCount",
    "seed"
  );
  const mapWithEntrypointEntities = mapEntities.with("entrypointMapName");
  const unrealizedMapEntities = mapEntities.without("mapRealizedRoomEntities");

  return () => {
    const shouldRealizeMapNameSet = new Set<string>();
    for (const entity of mappedPlayerEntities) {
      shouldRealizeMapNameSet.add(entity.locationMapName);
    }

    for (const entity of mapWithEntrypointEntities) {
      if (shouldRealizeMapNameSet.has(entity.entrypointMapName)) {
        shouldRealizeMapNameSet.add(entity.name);
      }
    }

    for (const entity of mappedEntities) {
      if (!shouldRealizeMapNameSet.has(entity.locationMapName)) {
        engine.world.remove(entity);
      }
    }

    for (const entity of unrealizedMapEntities) {
      if (!shouldRealizeMapNameSet.has(entity.name)) {
        continue;
      }
      const { rooms, allEntities } = createMapEntities(engine, entity);
      engine.world.addComponent(entity, "mapRealizedRoomEntities", rooms);
      for (const newEntity of allEntities) {
        engine.world.add(newEntity);
      }
    }
  };
});
