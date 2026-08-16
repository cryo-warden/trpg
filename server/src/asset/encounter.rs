use ecs::Ecs;
use spacetimedb::{
    rand::{rngs::StdRng, Rng, SeedableRng},
    table,
};
use std::collections::{HashMap, HashSet};

use crate::{
    appearance::appearance_features,
    asset::{
        location_map_theme::{pick_distinct_group, weighted_index},
        r#trait::traits,
        trait_palette::trait_palettes,
    },
    ecs_extension::EcsExtension,
    entity::{
        EntityBlob, EntityHandle, FindEntityHandle, InstantiateEntityBlob, LocationKind,
        NewEntityHandle, WithEntityHandle, __appearance_features__Option,
        __appearance_features__OptionGet, __applies_stat_block__OptionGet,
        __differentiable__OptionGet, __location__Option, __traits__Option, __traits__OptionGet,
    },
};

#[table(accessor = encounter_blobs)]
pub struct EncounterBlob {
    #[primary_key]
    pub id: u32,
    #[unique]
    pub name: String,
    pub blob: EntityBlob,
}

#[table(accessor = encounters)]
pub struct Encounter {
    #[primary_key]
    pub id: u32,
    #[unique]
    pub name: String,
    pub categoric_blob_id: u32,
    pub blob_ids: Vec<u32>,
}

impl Encounter {
    /// Spawns the encounter's blobs into the room and returns the spawned
    /// entity ids, so callers (the quest room-claim layer) can stamp
    /// claim-specific components onto exactly what was created.
    pub fn populate(&self, room: &EntityHandle) -> Result<Vec<u64>, String> {
        let ecs: Ecs = room.ecs();
        // TODO Make it easier to grab a default empty EntityBlob.
        let categoric_blob =
            if let Some(c) = ecs.db.encounter_blobs().id().find(self.categoric_blob_id) {
                c.blob
            } else {
                return Ok(Vec::new());
            };
        log::debug!(
            "Grabbed categoric_blob {} {:?}",
            self.categoric_blob_id,
            categoric_blob
        );
        let scope = ecs.instantiation_scope();
        let mut spawned_entity_ids: Vec<u64> = Vec::new();
        for id in &self.blob_ids {
            if let Some(e) = ecs.db.encounter_blobs().id().find(id) {
                let spawn = ecs
                    .new()
                    .instantiate_blob(categoric_blob.clone(), &scope)?
                    .instantiate_blob(e.blob, &scope)?;
                spawned_entity_ids.push(spawn.entity_id());
                spawn.upsert_new_location(room.entity_id(), LocationKind::Interior);
            }
        }
        apply_variety(ecs, &spawned_entity_ids);
        Ok(spawned_entity_ids)
    }
}

/// Draw DISTINCT variety traits onto the just-spawned entities that opted in
/// (a differentiable component). Entities sharing a palette differ from EACH
/// OTHER where the palette is large enough — a pack reads as individuals, not
/// "wolf 1-4" — while WITHIN one entity an exclusion group never repeats (no
/// "brawny runt"). Opposite-group traits ACROSS entities are welcome (the
/// leader and the runt). A combatant gets the trait through its stat pipeline;
/// an item/scenery gets only the trait's appearance features merged on.
pub(crate) fn apply_variety(ecs: Ecs, entity_ids: &[u64]) {
    let mut by_palette: HashMap<u32, Vec<u64>> = HashMap::new();
    for &entity_id in entity_ids {
        if let Some(d) = ecs.find(entity_id).differentiable() {
            by_palette.entry(d.trait_palette_id).or_default().push(entity_id);
        }
    }
    if by_palette.is_empty() {
        return;
    }
    // Anchor picks need no cross-tick determinism; seed from the tick's rng.
    let mut rng = StdRng::seed_from_u64(ecs.rng().gen::<u64>());
    for (palette_id, members) in by_palette {
        let Some(palette) = ecs.db.trait_palettes().id().find(palette_id) else {
            continue;
        };
        if palette.trait_ids.is_empty() || palette.count_weights.is_empty() {
            continue;
        }
        // A trait's variety group is its first appearance feature's exclusion
        // group (brawny/runt share "build"), so a single member never draws
        // two of the same axis.
        let group_of = |trait_id: u32| -> Option<String> {
            let t = ecs.db.traits().id().find(trait_id)?;
            let feature_id = *t.stat_block.appearance_feature_ids.first()?;
            ecs.db
                .appearance_features()
                .index()
                .find(feature_id)?
                .exclusion_group
        };
        let mut used_across_pack: HashSet<u32> = HashSet::new();
        for entity_id in members {
            let count = weighted_index(&palette.count_weights, &mut rng);
            if count == 0 {
                continue;
            }
            // Prefer traits not yet used in this pack (so members differ),
            // falling back to the full set when that would run dry.
            let fresh: Vec<u32> = palette
                .trait_ids
                .iter()
                .copied()
                .filter(|id| !used_across_pack.contains(id))
                .collect();
            let candidates = if fresh.len() >= count {
                fresh
            } else {
                palette.trait_ids.clone()
            };
            let chosen = pick_distinct_group(candidates, count, &group_of, &mut rng);
            if chosen.is_empty() {
                continue;
            }
            for id in &chosen {
                used_across_pack.insert(*id);
            }
            let entity = ecs.find(entity_id);
            if entity.applies_stat_block().is_some() {
                // A combatant: the trait rides the stat pipeline, so both its
                // stats and its appearance apply.
                let mut trait_ids =
                    entity.traits().map(|t| t.trait_ids).unwrap_or_default();
                for id in chosen {
                    if !trait_ids.contains(&id) {
                        trait_ids.push(id);
                    }
                }
                entity.upsert_new_traits(trait_ids);
            } else {
                // An item or scenery: no stat block runs for it, so merge the
                // chosen traits' APPEARANCE features straight on — decorative
                // variety only (an item's stats come from its asset, not here).
                let mut feature_ids = entity
                    .appearance_features()
                    .map(|c| c.appearance_feature_indexes)
                    .unwrap_or_default();
                for id in chosen {
                    if let Some(t) = ecs.db.traits().id().find(id) {
                        for feature_id in t.stat_block.appearance_feature_ids {
                            if !feature_ids.contains(&feature_id) {
                                feature_ids.push(feature_id);
                            }
                        }
                    }
                }
                entity.upsert_new_appearance_features(feature_ids);
            }
        }
    }
}
