//! The seam ABOVE map generation. Generation is quest-agnostic: it builds
//! the map's shape and returns a role-tagged MapGenerationResult. The
//! application layers here consume that result to inject everything the
//! shape alone cannot know — quest items today; bosses and treasure
//! later. Runtime demand for a map instance goes through materialize_map,
//! never through generate_entities directly.

use crate::asset::location_map::{LocationMap, MapGenerationResult};
use ecs::Ecs;

pub fn materialize_map(ecs: Ecs, map: &LocationMap) -> Result<MapGenerationResult, String> {
    let result = map.generate_entities(ecs)?;
    crate::quest::apply_quest_spawns(ecs, map, &result)?;
    Ok(result)
}
