#[cfg(test)]
mod tests;

use ecs_macro::entity;

pub type EntityId = u64;

entity! {
  entity Entity entity_id: EntityId tables();

  component location: LocationComponent tables(location_components) { location_entity_id: EntityId }
  component path: PathComponent tables(path_components) { destination_entity_id: EntityId }
}

pub fn sandbox(ctx: &spacetimedb::ReducerContext) {
    let e = EntityHandle { entity_id: 0, ctx };
}
