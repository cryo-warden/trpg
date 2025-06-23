#[cfg(test)]
mod tests;

use std::fmt::Debug;

#[derive(Clone, Copy)]
pub struct EntityHandleHidden<'a> {
    pub ctx: &'a spacetimedb::ReducerContext,
}

impl<'a> Debug for EntityHandleHidden<'a> {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str("EntityHandleHidden")?;
        Ok(())
    }
}

use ecs_macro::entity;

pub type EntityId = u64;

entity! {
  #[derive(Clone, Debug)]
  struct_attrs

  entity Entity entity_id: EntityId tables(entities);

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

#[allow(dead_code, unused_must_use, unused_variables, path_statements)]
fn sandbox(ctx: &spacetimedb::ReducerContext) -> Option<()> {
    let e = EntityHandle {
        entity_id: 0,
        hidden: EntityHandleHidden { ctx },
    };
    LocationComponent::new().into_location_handle(ctx);
    EntityHandle::peek();
    let e = e.with_path()?.with_location()?.with_secondary_location()?;
    for lp in LocationComponent::iter_location(ctx).with_path() {
        println!("{:?}", lp.path());
    }
    for pl in PathComponent::iter_path(ctx)
        .with_location()
        .with_excess_path()
        .with_secondary_location()
    {
        println!("{:?}", pl.location());
        println!("{:?}", pl.path());
        println!("{:?}", pl.excess_path());
        println!("{:?}", pl.secondary_location());
    }
    e.location();
    e.path();
    e.secondary_location();
    LocationComponent::clone;
    Some(())
}
