import type { Entity } from "../../Entity";
import type { EntityEvent } from "../../structures/EntityEvent";
import { applyStatBlock } from "../../structures/StatBlock";
import { applyStatusEffectMap } from "../../structures/StatusEffectMap";
import { createSystem } from "../createSystem";

export default createSystem((engine) => {
  const unlocatedSelfObservers = engine.world
    .with("events", "observer")
    .without("location");
  const locatedObservers = engine.world.with("location", "observer");
  const locatedEventHavers = engine.world.with("location", "events");

  const eventHavers = engine.world.with("events");

  return () => {
    for (const entity of unlocatedSelfObservers) {
      // Allow self observation even without location.
      entity.observer.push(...entity.events);
    }

    const locationEventsMap = new Map<Entity, EntityEvent[]>();
    for (const entity of locatedEventHavers) {
      if (!locationEventsMap.has(entity.location)) {
        locationEventsMap.set(entity.location, []);
      }
      locationEventsMap.get(entity.location)!.push(...entity.events);
    }

    for (const entity of locatedObservers) {
      const events = locationEventsMap.get(entity.location);
      if (events == null) {
        continue;
      }
      entity.observer.push(...events);
    }

    for (const eventHaver of eventHavers) {
      const { events } = eventHaver;
      // Any new events triggered during resolution will wait for the next pass.
      // Also, if anything goes wrong, events will fail to resolve rather than resolve repeatedly.
      engine.world.removeComponent(eventHaver, "events");
      for (const event of events) {
        switch (event.type) {
          case "action": {
            break;
          }
          case "damage": {
            if (event.damage > 0) {
              engine.world.addComponent(event.target, "accumulatedDamage", 0);
              event.target.accumulatedDamage! += event.damage;
            }
            if (event.criticalDamage > 0) {
              engine.world.addComponent(
                event.target,
                "accumulatedCriticalDamage",
                0
              );
              event.target.accumulatedCriticalDamage! += event.criticalDamage;
            }
            break;
          }
          case "dead": {
            engine.world.addComponent(event.source, "dead", true);
            break;
          }
          case "drop": {
            const { source: source, target } = event;
            if (target.location != null) {
              // Trigger update of old location contents.
              engine.world.removeComponent(
                target.location,
                "contentsCleanFlag"
              );
            }
            const newLocation = source.location ?? source;
            engine.world.addComponent(target, "location", newLocation);
            target.location = newLocation;
            // Trigger update of new location contents.
            engine.world.removeComponent(newLocation, "contentsCleanFlag");
            break;
          }
          case "equip": {
            const { source: source, target } = event;
            if (source.equipment == null || source.contents == null) {
              break;
            }

            source.equipment.push(target);
            engine.world.removeComponent(source, "equipmentStatBlockCleanFlag");
            break;
          }
          case "heal": {
            engine.world.addComponent(event.target, "accumulatedHealing", 0);
            event.target.accumulatedHealing! += event.heal;
            break;
          }
          case "move": {
            const { source: source, target } = event;
            if (target.path == null) {
              break;
            }

            if (source.location != null) {
              // Trigger update of old location contents.
              engine.world.removeComponent(
                source.location,
                "contentsCleanFlag"
              );
            }
            engine.world.addComponent(
              source,
              "location",
              target.path.destination
            );
            source.location = target.path.destination;
            // Trigger update of new location contents.
            engine.world.removeComponent(source.location, "contentsCleanFlag");
            break;
          }
          case "stats": {
            const { source: entity, statBlock } = event;
            applyStatBlock(engine, entity, statBlock);
            engine.world.addComponent(entity, "statsCleanFlag", true);
            break;
          }
          case "status": {
            applyStatusEffectMap(engine, event.target, event.statusEffectMap);
            break;
          }
          case "take": {
            const { source: source, target } = event;
            if (target.location != null) {
              // Trigger update of old location contents.
              engine.world.removeComponent(
                target.location,
                "contentsCleanFlag"
              );
            }
            engine.world.addComponent(target, "location", source);
            target.location = source;
            // Trigger update of new location contents.
            engine.world.removeComponent(target.location, "contentsCleanFlag");
            break;
          }
          case "unconscious": {
            engine.world.addComponent(event.source, "unconscious", true);
            break;
          }
          case "unequip": {
            const { source: source, target } = event;
            if (source.equipment == null) {
              break;
            }

            const equippedIndex = source.equipment.indexOf(target);
            if (equippedIndex < 0) {
              break;
            }

            source.equipment.splice(equippedIndex, 1);
            engine.world.removeComponent(source, "equipmentStatBlockCleanFlag");
            break;
          }
        }
      }
    }
  };
});
