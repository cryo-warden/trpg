#[cfg(test)]
mod tests;

use ecs_macro::entity;

pub type EntityId = u64;

entity! {
  entity Entity entity_id: EntityId tables();

  component location: LocationComponent tables(location_components) { pub location_entity_id: EntityId }
  component path: PathComponent tables(path_components) { pub destination_entity_id: EntityId }
}

impl LocationComponent {
    pub fn new() -> Self {
        Self {
            entity_id: 0,
            location_entity_id: 0,
        }
    }
}

impl<'a> EntityHandle<'a> {
    pub fn peek() {}
}

#[allow(unused_variables, dead_code)]
fn sandbox(ctx: &spacetimedb::ReducerContext) {
    let e = EntityHandle { entity_id: 0, ctx };
    LocationComponent::new();
    EntityHandle::peek();
}
