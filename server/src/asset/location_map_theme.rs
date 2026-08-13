use crate::{
    asset::{
        rng_range::RngRange,
        weighted_sampler::{WeightedSample, WeightedSampler},
    },
    ecs_extension::EcsExtension,
    entity::*,
};
use spacetimedb::{rand::rngs::StdRng, table, SpacetimeType};

#[derive(Debug, Clone, SpacetimeType)]
pub struct EntityBlobSample {
    pub weight: u8,
    pub blob: EntityBlob,
}

impl WeightedSample for EntityBlobSample {
    type Result = EntityBlob;
    fn value(&self) -> &Self::Result {
        &self.blob
    }
    fn weight(&self) -> super::weighted_sampler::Weight {
        self.weight as u32
    }
}

#[derive(Debug, Clone, SpacetimeType)]
pub struct EntityBlobsSampler {
    pub selections: Vec<EntityBlobSample>,
}

impl WeightedSampler for EntityBlobsSampler {
    type Result = EntityBlob;
    type Sample = EntityBlobSample;
    fn selections(&self) -> &Vec<Self::Sample> {
        &self.selections
    }
}

#[table(accessor = location_map_themes)]
pub struct LocationMapTheme {
    #[primary_key]
    pub id: u32,
    #[unique]
    pub name: String,
    pub decorations_selector: EntityBlobsSampler,
    pub min_decoration_count: u8,
    pub max_decoration_count: u8,
    pub paths_selector: EntityBlobsSampler,
    pub rooms_selector: EntityBlobsSampler,
    /// The themed fortune-telling scenery (bone dice, scrying bowls, fate
    /// decks) placed in each map's guaranteed checkpoint room.
    pub checkpoints_selector: EntityBlobsSampler,
}

impl LocationMapTheme {
    pub fn decorate(&self, room: &EntityHandle, rng: &mut StdRng) -> Result<(), String> {
        let decoration_count: usize =
            rng.get_range(self.min_decoration_count, self.max_decoration_count);

        for _ in 0..decoration_count {
            if let Some(d) = self.decorations_selector.sample(rng) {
                room.ecs()
                    .new()
                    .instantiate_blob(d.to_owned(), &room.ecs().instantiation_scope())?
                    .insert_new_location(room.entity_id());
            }
        }
        Ok(())
    }
}
