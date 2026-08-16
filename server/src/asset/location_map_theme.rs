use crate::{
    appearance::appearance_features,
    asset::{
        r#trait::traits,
        rng_range::RngRange,
        weighted_sampler::{WeightedSample, WeightedSampler},
    },
    ecs_extension::EcsExtension,
    entity::*,
};
use ecs::Ecs;
use spacetimedb::{
    rand::{rngs::StdRng, seq::SliceRandom},
    table, SpacetimeType,
};
use std::collections::HashSet;

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

/// A MATCHED pair of path presentations: the two directions between two
/// rooms are one authored fact, never two independent samples — an
/// opening pairs with an opening, a chasm with the rock wall you climb
/// back up. `forward` is the direction leading DEEPER (the exploring
/// direction); `backward` faces home.
#[derive(Debug, Clone, SpacetimeType)]
pub struct PathBlobPair {
    pub forward: EntityBlob,
    pub backward: EntityBlob,
}

#[derive(Debug, Clone, SpacetimeType)]
pub struct PathBlobPairSample {
    pub weight: u8,
    pub pair: PathBlobPair,
}

impl WeightedSample for PathBlobPairSample {
    type Result = PathBlobPair;
    fn value(&self) -> &Self::Result {
        &self.pair
    }
    fn weight(&self) -> super::weighted_sampler::Weight {
        self.weight as u32
    }
}

#[derive(Debug, Clone, SpacetimeType)]
pub struct PathBlobPairsSampler {
    pub selections: Vec<PathBlobPairSample>,
}

impl WeightedSampler for PathBlobPairsSampler {
    type Result = PathBlobPair;
    type Sample = PathBlobPairSample;
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
    pub paths_selector: PathBlobPairsSampler,
    pub rooms_selector: EntityBlobsSampler,
    /// The themed fortune-telling scenery (bone dice, scrying bowls, fate
    /// decks) placed in each map's guaranteed checkpoint room.
    pub checkpoints_selector: EntityBlobsSampler,
    /// Themed breakable containers (jars, crates, chests) generation
    /// scatters through side branches and the far end; downstream layers
    /// may hide loot inside them. Count range is half-open like the other
    /// count ranges.
    pub containers_selector: EntityBlobsSampler,
    pub min_container_count: u8,
    pub max_container_count: u8,
    /// Themed breakable walls (boulders, barricades, thickets) that block
    /// hidden paths and shortcuts until smashed. Authored with hp and
    /// remains like any breakable.
    pub blockers_selector: EntityBlobsSampler,
    /// Optional path-variation TRAITS (by id): adjective-bearing traits rolled
    /// into a path at generation and applied to BOTH directions so a crossing
    /// reads the same coming and going. The path carries applies_appearance_
    /// features, so these ride the ordinary trait pipeline — their appearance
    /// features surface on the path like any creature's. Empty leaves this
    /// theme's paths plain.
    pub path_variation_trait_ids: Vec<u32>,
    /// Weighted count distribution for path variations: index = number of
    /// variations rolled, value = its weight (index 1 usually dominant, 2
    /// small, 3 vanishing; index 0 = plain). Empty disables variations.
    pub path_variation_count_weights: Vec<u8>,
}

impl LocationMapTheme {
    pub fn decorate(&self, room: &EntityHandle, rng: &mut StdRng) -> Result<(), String> {
        let decoration_count: usize =
            rng.get_range(self.min_decoration_count, self.max_decoration_count);

        let mut decoration_ids: Vec<u64> = Vec::new();
        for _ in 0..decoration_count {
            if let Some(d) = self.decorations_selector.sample(rng) {
                let decoration = room
                    .ecs()
                    .new()
                    .instantiate_blob(d.to_owned(), &room.ecs().instantiation_scope())?;
                let decoration_id = decoration.entity_id();
                decoration.insert_new_location(room.entity_id(), LocationKind::Interior);
                decoration_ids.push(decoration_id);
            }
        }
        // Item/scenery decorations that opted in (a differentiable component)
        // get their decorative variety here, differentiated within the room.
        crate::asset::encounter::apply_variety(room.ecs(), &decoration_ids);
        Ok(())
    }

    /// Roll the variation TRAIT ids to add to ONE path pair: a weighted count,
    /// then that many traits drawn WITHOUT repeating an exclusion group (no
    /// "wide narrow", no redundant "dim dark") — grouped by each trait's first
    /// appearance feature, exactly as pack variety is. The caller adds the
    /// returned set to both directions so a crossing reads the same coming and
    /// going. Consumes NO rng when the theme declares no variations, keeping
    /// variation-free themes byte-for-byte stable.
    pub fn roll_path_variations(&self, ecs: Ecs, rng: &mut StdRng) -> Vec<u32> {
        if self.path_variation_trait_ids.is_empty()
            || self.path_variation_count_weights.is_empty()
        {
            return Vec::new();
        }
        let count = weighted_index(&self.path_variation_count_weights, rng);
        if count == 0 {
            return Vec::new();
        }
        pick_distinct_group(
            self.path_variation_trait_ids.clone(),
            count,
            |id| variety_group_of(ecs, id),
            rng,
        )
    }
}

/// A trait's variety group: the exclusion group of its FIRST appearance
/// feature (brawny/scrawny share "build"; wide/narrow share "width"), so a
/// single draw never takes two traits of the same axis. Shared by path-
/// variation rolls and pack/item variety.
pub(crate) fn variety_group_of(ecs: Ecs, trait_id: u32) -> Option<String> {
    let t = ecs.db.traits().id().find(trait_id)?;
    let feature_id = *t.stat_block.appearance_feature_ids.first()?;
    ecs.db
        .appearance_features()
        .index()
        .find(feature_id)?
        .exclusion_group
}

/// Pick an index into `weights` with probability proportional to its weight.
/// An all-zero (or empty) slice yields 0.
pub(crate) fn weighted_index(weights: &[u8], rng: &mut StdRng) -> usize {
    let total: u32 = weights.iter().map(|w| u32::from(*w)).sum();
    if total == 0 {
        return 0;
    }
    let mut roll: u32 = rng.get_range::<u32, u32>(0, total - 1);
    for (index, weight) in weights.iter().enumerate() {
        let weight = u32::from(*weight);
        if roll < weight {
            return index;
        }
        roll -= weight;
    }
    weights.len().saturating_sub(1)
}

/// Draw up to `count` ids from a shuffled `pool`, skipping any whose exclusion
/// group (via `group_of`) was already taken — so a pick never pairs opposites
/// or redundants. Groupless ids always take. Pure over its group lookup so
/// the selection rule is unit-testable without a database.
pub(crate) fn pick_distinct_group(
    mut pool: Vec<u32>,
    count: usize,
    group_of: impl Fn(u32) -> Option<String>,
    rng: &mut StdRng,
) -> Vec<u32> {
    pool.shuffle(rng);
    let mut chosen: Vec<u32> = Vec::new();
    let mut taken_groups: HashSet<String> = HashSet::new();
    for id in pool {
        if chosen.len() >= count {
            break;
        }
        match group_of(id) {
            Some(group) if taken_groups.contains(&group) => continue,
            Some(group) => {
                taken_groups.insert(group);
            }
            None => {}
        }
        chosen.push(id);
    }
    chosen
}

#[cfg(test)]
mod tests {
    use super::{pick_distinct_group, weighted_index};
    use spacetimedb::rand::{rngs::StdRng, SeedableRng};
    use std::collections::HashMap;

    #[test]
    fn weighted_index_never_picks_a_zero_weight_bucket() {
        // Index 0 weighs 0, so only index 1 is ever chosen.
        let mut rng = StdRng::seed_from_u64(1);
        for _ in 0..50 {
            assert_eq!(weighted_index(&[0, 1], &mut rng), 1);
        }
    }

    #[test]
    fn weighted_index_all_zero_or_empty_yields_zero() {
        let mut rng = StdRng::seed_from_u64(1);
        assert_eq!(weighted_index(&[], &mut rng), 0);
        assert_eq!(weighted_index(&[0, 0], &mut rng), 0);
    }

    #[test]
    fn pick_distinct_group_takes_one_per_group() {
        // 1 and 2 share "width"; 3 stands alone. Asking for 3 yields exactly
        // one of the width pair plus the groupless 3 — never both 1 and 2.
        let groups: HashMap<u32, &str> = [(1, "width"), (2, "width")].into_iter().collect();
        let group_of = |id: u32| groups.get(&id).map(|g| (*g).to_string());
        let mut rng = StdRng::seed_from_u64(7);
        let chosen = pick_distinct_group(vec![1, 2, 3], 3, group_of, &mut rng);
        assert_eq!(chosen.len(), 2);
        assert_eq!(chosen.iter().filter(|id| **id == 1 || **id == 2).count(), 1);
        assert!(chosen.contains(&3));
    }

    #[test]
    fn pick_distinct_group_caps_at_count() {
        let mut rng = StdRng::seed_from_u64(3);
        let chosen = pick_distinct_group(vec![1, 2, 3, 4], 2, |_| None, &mut rng);
        assert_eq!(chosen.len(), 2);
    }
}
