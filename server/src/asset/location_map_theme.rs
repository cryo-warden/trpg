use crate::{asset::weighted_selector::WeightedSelector, entity::*};
use spacetimedb::{
    rand::{rngs::StdRng, RngCore},
    table,
};

#[table(accessor = location_map_themes)]
pub struct LocationMapTheme {
    #[primary_key]
    pub id: u32,
    pub decorations_selector: WeightedSelector<EntityBlob>,
    pub min_decoration_count: u8,
    pub max_decoration_count: u8,
    pub paths_selector: WeightedSelector<EntityBlob>,
    pub rooms_selector: WeightedSelector<EntityBlob>,
}

impl LocationMapTheme {
    pub fn decorate(&self, room: &EntityHandle, rng: &mut StdRng) {
        let decoration_count = rng.next_u32()
            % (self.max_decoration_count - self.min_decoration_count) as u32
            + self.min_decoration_count as u32;

        for _ in 0..decoration_count {
            let d = self.decorations_selector.sample(rng);
            room.ecs()
                .new()
                .instantiate_blob(d.to_owned())
                .insert_new_location(room.entity_id());
        }
    }
}
