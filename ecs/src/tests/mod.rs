#![cfg(test)]

use ecs_macro::entity;

use crate::WithEcs;

mod ecs {
    pub use crate::*;
}

entity!(
    type EntityId = u64;

    #[struct_attrs]
    #[derive(Clone, Debug)]
    struct StructAttrs;

    #[entity(table = entities)]
    pub struct Entity {
        entity_id: EntityId,
    }

    #[blob(table = entity_blobs)]
    pub struct EntityBlob;

    #[registry(table = named_entities)]
    pub struct NamedEntity;

    #[component(
      location in location_components,
      secondary_location in secondary_location_components,
    )]
    pub struct LocationComponent {
        pub location_entity_id: EntityId,
    }

    #[component(
      path in path_components,
      excess_path in excess_path_components
    )]
    pub struct PathComponent {
        pub destination_entity_id: EntityId,
    }
);

impl<'a> EntityHandle<'a> {
    pub fn peek() {}
}

#[allow(dead_code, unused_must_use, unused_variables, path_statements)]
fn sandbox(ctx: &spacetimedb::ReducerContext) -> Option<()> {
    let e = ctx.ecs().find(0);
    let scope = InstantiationScope {
        ecs: ctx.ecs(),
        locals: vec![4, 5],
    };
    let blob = LocationComponentBlob {
        location_entity_id: EntityIdSelector::Literal(1),
    };
    let component: LocationComponent = blob.clone().into_component(7, &scope).ok()?;
    let round_tripped: LocationComponentBlob = component.clone().into();
    assert!(matches!(
        round_tripped.location_entity_id,
        EntityIdSelector::Literal(1)
    ));
    assert_eq!(EntityIdSelector::Local(1).resolve(&scope).ok()?, 5);
    assert!(EntityIdSelector::Local(2).resolve(&scope).is_err());
    EntityIdSelector::Named("the_place".to_string())
        .resolve(&scope)
        .ok();
    ctx.ecs().into_location_handle(component);
    ctx.ecs().new().register_name("thing1".to_string()).ok()?;
    ctx.ecs()
        .new()
        .instantiate_blob(
            EntityBlob {
                location: Some(blob),
                secondary_location: Some(LocationComponentBlob {
                    location_entity_id: EntityIdSelector::Named("the_place".to_string()),
                }),
                path: Some(PathComponentBlob {
                    destination_entity_id: EntityIdSelector::Local(0),
                }),
                excess_path: None,
            },
            &scope,
        )
        .ok()?;
    assert_eq!(
        ctx.ecs()
            .new()
            .upsert_new_location(2)
            .location
            .location_entity_id,
        2
    );
    EntityHandle::peek();
    ctx.ecs().new().delete();
    ctx.ecs().new().new_blob();
    e.location();
    e.path();
    e.secondary_location();
    let e = e.with_path().with_location().with_secondary_location();
    for lp in ctx.ecs().iter_location().with_path() {
        println!("{:?}", lp.path());
    }
    for pl in ctx
        .ecs()
        .iter_path()
        .with_location()
        .with_excess_path()
        .with_secondary_location()
    {
        println!("{:?}", pl.location());
        println!("{:?}", pl.path());
        println!("{:?}", pl.excess_path());
        println!("{:?}", pl.secondary_location());
    }
    LocationComponent::clone;
    Some(())
}
