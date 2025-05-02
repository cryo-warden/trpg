import { type RoomEntity } from "../../structures/Map";
import { createSystem } from "../createSystem";

export default createSystem((engine) => {
  const unlocatedPlayerEntities = engine.world
    .with("playerController", "locationMapName")
    .without("location");
  const realizedMapEntities = engine.world.with(
    "name",
    "mapThemeName",
    "mapLayout",
    "mapTotalRoomCount",
    "mapMinDecorationCount",
    "mapMaxDecorationCount",
    "seed",
    "mapRealizedRoomEntities"
  );

  return () => {
    if (unlocatedPlayerEntities.size < 1) {
      return;
    }

    const nameEntryRoomMap = new Map<string, RoomEntity<any>>();
    for (const entity of realizedMapEntities) {
      nameEntryRoomMap.set(entity.name, entity.mapRealizedRoomEntities[0]);
    }

    for (const entity of unlocatedPlayerEntities) {
      const room = nameEntryRoomMap.get(entity.locationMapName);
      if (room == null) {
        continue;
      }

      engine.world.addComponent(entity, "location", room);
    }
  };
});
