#[cfg(test)]
mod tests;

use ecs_macro::entity;

pub type EntityId = u64;

entity! {
  entity Entity entity_id: EntityId tables();

  component LocationComponent [
    (location, location_components),
    (secondary_location, secondary_location_components),
  ] {
    pub location_entity_id: EntityId,
  }
  component PathComponent [
    (path, path_components),
    (excess_path, excess_path_components)
  ] {
    pub destination_entity_id: EntityId,
  }
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
fn sandbox(ctx: &spacetimedb::ReducerContext) -> Option<()> {
    let e = EntityHandle { entity_id: 0, ctx };
    LocationComponent::new();
    EntityHandle::peek();
    let e = e.with_path()?.with_location()?.with_secondary_location()?;
    e.location();
    e.path();
    e.secondary_location();
    Some(())
}
