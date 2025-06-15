#[cfg(test)]
mod tests {
    use archetype::ecs;

    struct LocationComponent {}
    struct PathComponent {}
    struct InventoryComponent {}
    struct EquipmentComponent {}

    ecs! {
      components {
        location: LocationComponent,
        path: PathComponent,
        inventory: InventoryComponent,
        equipment: EquipmentComponent,
      }

      archetype Actor {
        location,
        inventory,
        equipment,
      }

      archetype Path { location, path }

      query WithLocation { location }
    }

    #[test]
    fn it_works() {
        for l in WithLocation::iter() {
            l.location;
        }
    }
}
