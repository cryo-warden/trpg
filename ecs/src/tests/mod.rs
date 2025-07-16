#![cfg(test)]

use ecs_macro::entity;

use crate::WithEcs;

mod ecs {
    pub use crate::*;
}

type EntityId = u64;

entity! {
  #[derive(Clone, Debug)]
  struct_attrs;

  entity Entity entity_id: EntityId in entities;
  blob in entity_blobs;

  component LocationComponent [
    location in location_components,
    secondary_location in secondary_location_components,
  ] {
    pub location_entity_id: EntityId,
  }

  component PathComponent [
    path in path_components,
    excess_path in excess_path_components
  ] {
    pub destination_entity_id: EntityId,
  }
}

impl<'a> EntityHandle<'a> {
    pub fn peek() {}
}

#[allow(dead_code, unused_must_use, unused_variables, path_statements)]
fn sandbox(ctx: &spacetimedb::ReducerContext) -> Option<()> {
    let e = EntityHandle {
        entity_id: 0,
        ecs: ctx.ecs(),
    };
    LocationComponent::new(1).into_location_handle(ctx);
    EntityHandle::peek();
    ctx.ecs().new().delete();
    ctx.ecs().new().new_blob();
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
