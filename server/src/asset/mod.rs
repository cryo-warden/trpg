use std::collections::HashMap;

use ecs::WithEcs;
use spacetimedb::{reducer, table, ReducerContext, SpacetimeType, Table};

use crate::{
    action::{action_steps, actions, Action, ActionStep},
    appearance::{appearance_features, AppearanceFeature},
    asset::{
        author::{
            ActionAuthor, AppearanceFeatureAuthor, EncounterAuthor, EncounterBlobAuthor,
            EntityBlobAuthor, EntityBlobsSamplerAuthor, LocationMapAuthor, LocationMapThemeAuthor,
            NamedEntityBlobAuthor, StatBlockAuthor, StatBlockOwnerAuthor,
        },
        baseline::{baselines, Baseline},
        encounter::{encounter_blobs, encounters, Encounter, EncounterBlob},
        location_map::{
            location_map_connections, location_maps, EncounterIdSample, EncounterIdsSampler,
            LocationMap, LocationMapConnection,
        },
        location_map_theme::{
            location_map_themes, EntityBlobSample, EntityBlobsSampler, LocationMapTheme,
        },
        r#trait::{traits, Trait},
        stat_block::StatBlock,
    },
    ecs_extension::EcsExtension,
    entity::{
        ActionHotkey, ActionHotkeysComponentBlob, ActionsComponentBlob,
        AppearanceFeaturesComponentBlob, BaselineComponentBlob, EntityBlob, InstantiateEntityBlob,
        NewEntityHandle, TraitsComponentBlob,
    },
};

pub mod author;
pub mod baseline;
pub mod encounter;
pub mod location_map;
pub mod location_map_theme;
pub mod rng_range;
pub mod stat_block;
pub mod r#trait;
pub mod weighted_sampler;

#[derive(Debug, Clone, SpacetimeType, PartialEq, Eq, Hash)]
pub enum SpecialEntityBlobKey {
    NewPlayer,
}

#[table(accessor = special_entity_blobs)]
struct SpecialEntityBlob {
    #[primary_key]
    key: SpecialEntityBlobKey,
    blob: EntityBlob,
}

#[derive(SpacetimeType)]
pub struct AssetPack {
    actions: Vec<ActionAuthor>,
    appearance_features: Vec<AppearanceFeatureAuthor>,
    baselines: Vec<StatBlockOwnerAuthor>,
    traits: Vec<StatBlockOwnerAuthor>,
    encounter_blobs: Vec<EncounterBlobAuthor>,
    encounters: Vec<EncounterAuthor>,
    location_map_themes: Vec<LocationMapThemeAuthor>,
    location_maps: Vec<LocationMapAuthor>,

    named_instantiate_entity_blobs: Vec<NamedEntityBlobAuthor>,

    instantiate_entity_blobs: Vec<EntityBlobAuthor>,

    new_player_blob: EntityBlobAuthor,
}

/// Assign ids to a kind's authored names by enumeration order, rejecting
/// duplicates. The resulting map is what name references resolve through.
fn intern_names<'a>(
    kind: &str,
    names: impl Iterator<Item = &'a String>,
) -> Result<HashMap<String, u32>, String> {
    let mut ids = HashMap::new();
    for (id, name) in names.enumerate() {
        if ids.insert(name.to_owned(), id as u32).is_some() {
            return Err(format!("Duplicate {} name \"{}\".", kind, name));
        }
    }
    Ok(ids)
}

fn resolve_name(ids: &HashMap<String, u32>, kind: &str, name: &str) -> Result<u32, String> {
    ids.get(name)
        .copied()
        .ok_or_else(|| format!("Unknown {} name \"{}\".", kind, name))
}

/// The per-kind name -> id maps a blob author needs; built once per push.
struct AssetNameMaps {
    actions: HashMap<String, u32>,
    appearance_features: HashMap<String, u32>,
    baselines: HashMap<String, u32>,
    traits: HashMap<String, u32>,
}

/// Resolve an authored blob's asset-name references into the stored
/// EntityBlob's integer ids. Runtime-state components are never authored, so
/// they are always None here.
fn resolve_entity_blob(
    author: EntityBlobAuthor,
    maps: &AssetNameMaps,
) -> Result<EntityBlob, String> {
    Ok(EntityBlob {
        name: author.name,
        location: author.location,
        path: author.path,
        allegiance: author.allegiance,
        baseline: author
            .baseline_name
            .map(|n| {
                Ok::<_, String>(BaselineComponentBlob {
                    baseline_id: resolve_name(&maps.baselines, "baseline", &n)?,
                })
            })
            .transpose()?,
        traits: author
            .trait_names
            .map(|names| {
                Ok::<_, String>(TraitsComponentBlob {
                    trait_ids: names
                        .iter()
                        .map(|n| resolve_name(&maps.traits, "trait", n))
                        .collect::<Result<_, _>>()?,
                })
            })
            .transpose()?,
        actions: author
            .action_names
            .map(|names| {
                Ok::<_, String>(ActionsComponentBlob {
                    action_ids: names
                        .iter()
                        .map(|n| resolve_name(&maps.actions, "action", n))
                        .collect::<Result<_, _>>()?,
                })
            })
            .transpose()?,
        action_hotkeys: author
            .action_hotkeys
            .map(|hotkeys| {
                Ok::<_, String>(ActionHotkeysComponentBlob {
                    action_hotkeys: hotkeys
                        .into_iter()
                        .map(|h| {
                            Ok::<_, String>(ActionHotkey {
                                action_id: resolve_name(&maps.actions, "action", &h.action_name)?,
                                character_code: h.character_code,
                            })
                        })
                        .collect::<Result<_, _>>()?,
                })
            })
            .transpose()?,
        appearance_features: author
            .appearance_feature_names
            .map(|names| {
                Ok::<_, String>(AppearanceFeaturesComponentBlob {
                    appearance_feature_indexes: names
                        .iter()
                        .map(|n| resolve_name(&maps.appearance_features, "appearance feature", n))
                        .collect::<Result<_, _>>()?,
                })
            })
            .transpose()?,
        hp: author.hp,
        ep: author.ep,
        attack: author.attack,
        player_controller: author.player_controller,
        enemy_controller: author.enemy_controller,
        equipment_stat_block_cache: None,
        status_stat_block_cache: None,
        traits_stat_block_cache: None,
        traits_stat_block_dirty_flag: None,
        total_stat_block_dirty_flag: None,
        action_state: None,
        queued_action_state: None,
        entity_prominence: None,
        entity_deletion_timer: None,
        player_deactivation_timer: None,
        location_map: None,
    })
}

fn resolve_entity_blobs_sampler(
    author: EntityBlobsSamplerAuthor,
    maps: &AssetNameMaps,
) -> Result<EntityBlobsSampler, String> {
    Ok(EntityBlobsSampler {
        selections: author
            .selections
            .into_iter()
            .map(|s| {
                Ok::<_, String>(EntityBlobSample {
                    weight: s.weight,
                    blob: resolve_entity_blob(s.blob, maps)?,
                })
            })
            .collect::<Result<_, _>>()?,
    })
}

fn resolve_stat_block(author: StatBlockAuthor, maps: &AssetNameMaps) -> Result<StatBlock, String> {
    let StatBlockAuthor {
        attack,
        mhp,
        defense,
        mep,
        action_names,
        appearance_feature_names,
    } = author;
    Ok(StatBlock {
        attack,
        mhp,
        defense,
        mep,
        action_ids: action_names
            .iter()
            .map(|n| resolve_name(&maps.actions, "action", n))
            .collect::<Result<_, _>>()?,
        appearance_feature_ids: appearance_feature_names
            .iter()
            .map(|n| resolve_name(&maps.appearance_features, "appearance feature", n))
            .collect::<Result<_, _>>()?,
    })
}

// The forward (name -> id) conversion lives HERE and only here. The server
// owns id assignment — and, once incremental updates land, the migration of
// already-stored rows — so it is the only party that can resolve authored
// names against the authoritative id space. The client only ever converts the
// other way (id -> name, from its subscription of these tables) for display.
#[reducer]
fn push_assets(ctx: &ReducerContext, asset_pack: AssetPack) -> Result<(), String> {
    log::debug!("Loading asset pack from {}.", ctx.sender());

    if ctx.get_new_player_blob().is_some() {
        log::debug!("Assets are already populated. Skipped loading.");
        return Ok(());
    }

    let action_ids = intern_names("action", asset_pack.actions.iter().map(|a| &a.name))?;
    let mut next_action_step_id: u64 = 1;
    for (id, a) in asset_pack.actions.into_iter().enumerate() {
        let action_id = id as u32;
        ctx.db.actions().insert(Action {
            id: action_id,
            name: a.name,
            action_type: a.action_type,
        });
        for (sequence_index, action_effect) in a.steps.into_iter().enumerate() {
            ctx.db.action_steps().insert(ActionStep {
                id: next_action_step_id,
                action_id,
                sequence_index: sequence_index as i32,
                action_effect,
            });
            next_action_step_id += 1;
        }
    }

    let appearance_feature_ids = intern_names(
        "appearance feature",
        asset_pack.appearance_features.iter().map(|a| &a.name),
    )?;
    let maps = AssetNameMaps {
        actions: action_ids,
        appearance_features: appearance_feature_ids,
        baselines: intern_names("baseline", asset_pack.baselines.iter().map(|b| &b.name))?,
        traits: intern_names("trait", asset_pack.traits.iter().map(|t| &t.name))?,
    };
    for (id, a) in asset_pack.appearance_features.into_iter().enumerate() {
        ctx.db.appearance_features().insert(AppearanceFeature {
            index: id as u32,
            name: a.name,
            text: a.text,
            appearance_feature_type: a.appearance_feature_type,
            priority: a.priority,
        });
    }

    for (id, b) in asset_pack.baselines.into_iter().enumerate() {
        ctx.db.baselines().insert(Baseline {
            id: id as u32,
            name: b.name,
            stat_block: resolve_stat_block(b.stat_block, &maps)?,
        });
    }

    for (id, t) in asset_pack.traits.into_iter().enumerate() {
        ctx.db.traits().insert(Trait {
            id: id as u32,
            name: t.name,
            stat_block: resolve_stat_block(t.stat_block, &maps)?,
        });
    }

    let encounter_blob_ids = intern_names(
        "encounter blob",
        asset_pack.encounter_blobs.iter().map(|b| &b.name),
    )?;
    for (id, b) in asset_pack.encounter_blobs.into_iter().enumerate() {
        ctx.db.encounter_blobs().insert(EncounterBlob {
            id: id as u32,
            name: b.name,
            blob: resolve_entity_blob(b.blob, &maps)?,
        });
    }

    let encounter_ids =
        intern_names("encounter", asset_pack.encounters.iter().map(|e| &e.name))?;
    for (id, e) in asset_pack.encounters.into_iter().enumerate() {
        ctx.db.encounters().insert(Encounter {
            id: id as u32,
            name: e.name,
            categoric_blob_id: resolve_name(
                &encounter_blob_ids,
                "encounter blob",
                &e.categoric_blob_name,
            )?,
            blob_ids: e
                .blob_names
                .iter()
                .map(|n| resolve_name(&encounter_blob_ids, "encounter blob", n))
                .collect::<Result<_, _>>()?,
        });
    }

    let theme_ids = intern_names(
        "location map theme",
        asset_pack.location_map_themes.iter().map(|t| &t.name),
    )?;
    for (id, t) in asset_pack.location_map_themes.into_iter().enumerate() {
        ctx.db.location_map_themes().insert(LocationMapTheme {
            id: id as u32,
            name: t.name,
            decorations_selector: resolve_entity_blobs_sampler(t.decorations_selector, &maps)?,
            min_decoration_count: t.min_decoration_count,
            max_decoration_count: t.max_decoration_count,
            paths_selector: resolve_entity_blobs_sampler(t.paths_selector, &maps)?,
            rooms_selector: resolve_entity_blobs_sampler(t.rooms_selector, &maps)?,
        });
    }

    let location_map_ids = intern_names(
        "location map",
        asset_pack.location_maps.iter().map(|m| &m.name),
    )?;
    let mut next_connection_id: u32 = 0;
    for (id, m) in asset_pack.location_maps.into_iter().enumerate() {
        let exit_location_map_id = id as u32;
        for destination_name in &m.connection_names {
            ctx.db
                .location_map_connections()
                .insert(LocationMapConnection {
                    id: next_connection_id,
                    exit_location_map_id,
                    destination_location_map_id: resolve_name(
                        &location_map_ids,
                        "location map",
                        destination_name,
                    )?,
                });
            next_connection_id += 1;
        }
        ctx.db.location_maps().insert(LocationMap {
            id: exit_location_map_id,
            name: m.name,
            theme_id: resolve_name(&theme_ids, "location map theme", &m.theme_name)?,
            layout: m.layout,
            rng_seed: m.rng_seed,
            extra_room_count: m.extra_room_count,
            main_room_count: m.main_room_count,
            loop_count: m.loop_count,
            encounter_ids_sampler: EncounterIdsSampler {
                selections: m
                    .encounter_names_sampler
                    .iter()
                    .map(|s| {
                        Ok(EncounterIdSample {
                            weight: s.weight,
                            id: resolve_name(&encounter_ids, "encounter", &s.name)?,
                        })
                    })
                    .collect::<Result<_, String>>()?,
            },
            min_encounter_count: m.min_encounter_count,
            max_encounter_count: m.max_encounter_count,
        });
    }

    // Named blobs first: anonymous blobs may reference them by name.
    for nb in asset_pack.named_instantiate_entity_blobs {
        ctx.ecs()
            .new()
            .instantiate_blob(
                resolve_entity_blob(nb.blob, &maps)?,
                &ctx.ecs().instantiation_scope(),
            )?
            .register_name(nb.name)?;
    }

    for b in asset_pack.instantiate_entity_blobs {
        ctx.ecs().new().instantiate_blob(
            resolve_entity_blob(b, &maps)?,
            &ctx.ecs().instantiation_scope(),
        )?;
    }

    ctx.db.special_entity_blobs().insert(SpecialEntityBlob {
        key: SpecialEntityBlobKey::NewPlayer,
        blob: resolve_entity_blob(asset_pack.new_player_blob, &maps)?,
    });

    Ok(())
}

pub trait ReducerContextExtension {
    fn get_new_player_blob(&self) -> Option<EntityBlob>;
}

impl ReducerContextExtension for ReducerContext {
    fn get_new_player_blob(&self) -> Option<EntityBlob> {
        self.db
            .special_entity_blobs()
            .key()
            .find(SpecialEntityBlobKey::NewPlayer)
            .map(|b| b.blob)
    }
}
