use archetype::ecs;
use spacetimedb::{SpacetimeType, Table, table};

#[derive(SpacetimeType)]
struct LocationComponent {}
#[derive(SpacetimeType)]
struct PathComponent {}
#[derive(SpacetimeType)]
struct InventoryComponent {}
#[derive(SpacetimeType)]
struct EquipmentComponent {}

ecs! {
  shared {
    #[primary_key]
    entity_id: u64,
  }

  components {
    location: LocationComponent,
    path: PathComponent,
    inventory: InventoryComponent,
    equipment: EquipmentComponent,
  }

  #[table(name = actor_archetypes)]
  archetype Actor tables (actor_archetypes) {
    location,
    inventory,
    equipment,
  }

  #[table(name = path_archetypes)]
  archetype Path tables (path_archetypes) { location, path }

  query WithLocation { location }
}

#[cfg(test)]
pub mod tests {
    // use super::*;
    // use spacetimedb::ReducerContext;

    #[test]
    fn it_works() {
        // let ctx = ReducerContext::__dummy();
        // for l in WithLocation::iter(&ctx) {
        //     l.location;
        // }
    }
}
