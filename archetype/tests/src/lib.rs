use archetype::ecs;
use spacetimedb::{SpacetimeType, table};

#[derive(SpacetimeType)]
struct LocationComponent {}
#[derive(SpacetimeType)]
struct PathComponent {}
#[derive(SpacetimeType)]
struct InventoryComponent {}
#[derive(SpacetimeType)]
struct EquipmentComponent {}

ecs! {
  components {
    location: LocationComponent,
    path: PathComponent,
    inventory: InventoryComponent,
    equipment: EquipmentComponent,
  }

  #[table(name = archetypes)]
  archetype Actor {
    location,
    inventory,
    equipment,
  }

  archetype Path { location, path }

  query WithLocation { location }
}

#[cfg(test)]
pub mod tests {
    use super::*;

    #[test]
    fn it_works() {
        for l in WithLocation::iter() {
            l.location;
        }
    }
}
