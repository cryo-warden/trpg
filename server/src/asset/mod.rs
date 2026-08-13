use std::collections::HashMap;

use ecs::WithEcs;
use spacetimedb::{reducer, table, ReducerContext, SpacetimeType, Table};

use crate::{
    action::{action_rounds, actions, Action, ActionRound},
    appearance::{appearance_features, AppearanceFeature},
    asset::{
        types::{
            EntityBlobAsset, EntityBlobsSamplerAsset, ItemRefAsset, NamedActionAsset,
            NamedAppearanceFeatureAsset, NamedEncounterAsset, NamedEntityBlobAsset,
            NamedLocationMapAsset, NamedLocationMapThemeAsset, NamedStanceAsset,
            NamedStatBlockAsset, StatBlockAsset,
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
        armament::{armaments, Armament},
        armor::{armors, Armor},
        r#trait::{traits, Trait},
        relic::{relics, Relic},
        stance::{special_stances, stances, SpecialStance, SpecialStanceKey, Stance},
        stat_block::StatBlock,
    },
    ecs_extension::EcsExtension,
    entity::{
        named_entities, ActionsComponentBlob, ActiveStanceComponentBlob,
        AppearanceFeaturesComponentBlob, ArmorComponentBlob, BaselineComponentBlob,
        CheckpointBindingComponentBlob, EntityBlob,
        EquipmentComponentBlob, FindEntityHandle, InstantiateEntityBlob, ItemComponentBlob,
        NewEntityHandle, PinnedActionsComponentBlob, RelicsComponentBlob, TraitsComponentBlob,
    },
    item::ItemRef,
};

pub mod types;
pub mod armament;
pub mod armor;
pub mod baseline;
pub mod relic;
pub mod encounter;
pub mod location_map;
pub mod location_map_theme;
pub mod rng_range;
pub mod stance;
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

/// Every Record-authored kind arrives as a Vec of name+value pairs — the
/// client's Record entries verbatim (SATS has no map type), names untouched
/// by any client processing.
#[derive(SpacetimeType)]
pub struct AssetPack {
    actions: Vec<NamedActionAsset>,
    appearance_features: Vec<NamedAppearanceFeatureAsset>,
    baselines: Vec<NamedStatBlockAsset>,
    traits: Vec<NamedStatBlockAsset>,
    armaments: Vec<NamedStatBlockAsset>,
    armors: Vec<NamedStatBlockAsset>,
    relics: Vec<NamedStatBlockAsset>,
    stances: Vec<NamedStanceAsset>,
    /// Which stance intimidation forces entities into; a pack without
    /// morale-relevant content may omit it (forcing then fails loudly).
    cowering_stance_name: Option<String>,
    /// Which stance a dive lands in; same omission semantics.
    prone_stance_name: Option<String>,
    encounter_blobs: Vec<NamedEntityBlobAsset>,
    encounters: Vec<NamedEncounterAsset>,
    location_map_themes: Vec<NamedLocationMapThemeAsset>,
    location_maps: Vec<NamedLocationMapAsset>,

    named_instantiate_entity_blobs: Vec<NamedEntityBlobAsset>,

    instantiate_entity_blobs: Vec<EntityBlobAsset>,

    new_player_blob: EntityBlobAsset,
}

/// Match a kind's authored names against its existing rows: a matched name
/// keeps its id forever, a new name gets a fresh id (ids are never reused or
/// reindexed). Fails fast on a duplicate authored name — and on an existing
/// name that the push omits: assets are never dropped implicitly, so removal
/// has to become an explicit operation, never a push side effect.
fn match_names<'a>(
    kind: &str,
    existing: impl Iterator<Item = (String, u32)>,
    incoming: impl Iterator<Item = &'a String>,
) -> Result<HashMap<String, u32>, String> {
    let existing: HashMap<String, u32> = existing.collect();
    let mut next_id = existing.values().max().map_or(0, |max| max + 1);
    let mut ids = HashMap::new();
    for name in incoming {
        let id = existing.get(name).copied().unwrap_or_else(|| {
            let id = next_id;
            next_id += 1;
            id
        });
        if ids.insert(name.to_owned(), id).is_some() {
            return Err(format!("Duplicate {} name \"{}\".", kind, name));
        }
    }
    for name in existing.keys() {
        if !ids.contains_key(name) {
            return Err(format!(
                "The {} \"{}\" exists but is missing from the pushed assets; assets cannot be removed implicitly.",
                kind, name
            ));
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
    armaments: HashMap<String, u32>,
    armors: HashMap<String, u32>,
    relics: HashMap<String, u32>,
    stances: HashMap<String, u32>,
    location_maps: HashMap<String, u32>,
}

/// Resolve an authored blob's asset-name references into the stored
/// EntityBlob's integer ids. Runtime-state components are never authored, so
/// they are always None here.
fn resolve_entity_blob(
    author: EntityBlobAsset,
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
        active_stance: author
            .stance_name
            .map(|n| {
                Ok::<_, String>(ActiveStanceComponentBlob {
                    stance_id: resolve_name(&maps.stances, "stance", &n)?,
                })
            })
            .transpose()?,
        equipment: author
            .armament_names
            .map(|names| {
                Ok::<_, String>(EquipmentComponentBlob {
                    armament_ids: names
                        .iter()
                        .map(|n| resolve_name(&maps.armaments, "armament", n))
                        .collect::<Result<_, _>>()?,
                })
            })
            .transpose()?,
        armor: author
            .armor_name
            .map(|n| {
                Ok::<_, String>(ArmorComponentBlob {
                    armor_id: resolve_name(&maps.armors, "armor", &n)?,
                })
            })
            .transpose()?,
        relics: author
            .relic_names
            .map(|names| {
                Ok::<_, String>(RelicsComponentBlob {
                    relic_ids: names
                        .iter()
                        .map(|n| resolve_name(&maps.relics, "relic", n))
                        .collect::<Result<_, _>>()?,
                })
            })
            .transpose()?,
        item: author
            .item
            .map(|item| {
                Ok::<_, String>(ItemComponentBlob {
                    item_ref: match item {
                        ItemRefAsset::Armament(n) => {
                            ItemRef::Armament(resolve_name(&maps.armaments, "armament", &n)?)
                        }
                        ItemRefAsset::Armor(n) => {
                            ItemRef::Armor(resolve_name(&maps.armors, "armor", &n)?)
                        }
                        ItemRefAsset::Relic(n) => {
                            ItemRef::Relic(resolve_name(&maps.relics, "relic", &n)?)
                        }
                    },
                })
            })
            .transpose()?,
        stance_loadouts: None,
        known_stances: None,
        checkpoint_object: author.checkpoint_object,
        checkpoint_binding: author
            .checkpoint_binding
            .map(|binding| {
                Ok::<_, String>(CheckpointBindingComponentBlob {
                    location_map_id: resolve_name(
                        &maps.location_maps,
                        "location map",
                        &binding.location_map_name,
                    )?,
                    checkpoint_index: binding.checkpoint_index,
                })
            })
            .transpose()?,
        checkpoint: None,
        map_instance: None,
        map_checkpoints: None,
        respawn_timer: None,
        total_stat_block: None,
        fear_status: None,
        courage_status: None,
        braced_status: None,
        status_stat_block_dirty_flag: None,
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
        pinned_actions: author
            .pinned_action_names
            .map(|names| {
                Ok::<_, String>(PinnedActionsComponentBlob {
                    action_ids: names
                        .iter()
                        .map(|n| resolve_name(&maps.actions, "action", n))
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
        equipment_stat_block_dirty_flag: None,
        total_stat_block_dirty_flag: None,
        action_state: None,
        queued_action_state: None,
        entity_deletion_timer: None,
        player_deactivation_timer: None,
        location_map: None,
    })
}

fn resolve_entity_blobs_sampler(
    author: EntityBlobsSamplerAsset,
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

/// The forward (name -> id) conversion for effect payloads, mirroring every
/// other asset reference.
fn resolve_action_effect(
    author: types::ActionEffectAsset,
    maps: &AssetNameMaps,
) -> Result<crate::action::ActionEffect, String> {
    use crate::action::ActionEffect;
    use types::ActionEffectAsset;
    Ok(match author {
        ActionEffectAsset::Buff(buff) => ActionEffect::Buff(buff),
        ActionEffectAsset::Attack(damage) => ActionEffect::Attack(damage),
        ActionEffectAsset::Heal(heal) => ActionEffect::Heal(heal),
        ActionEffectAsset::Move => ActionEffect::Move,
        ActionEffectAsset::Take => ActionEffect::Take,
        ActionEffectAsset::Drop => ActionEffect::Drop,
        ActionEffectAsset::Equip => ActionEffect::Equip,
        ActionEffectAsset::Unequip => ActionEffect::Unequip,
        ActionEffectAsset::Intimidate(magnitude) => ActionEffect::Intimidate(magnitude),
        ActionEffectAsset::Rally => ActionEffect::Rally,
        ActionEffectAsset::Dive(defense) => ActionEffect::Dive(defense),
        ActionEffectAsset::Attune => ActionEffect::Attune,
        ActionEffectAsset::SetStance(name) => {
            ActionEffect::SetStance(resolve_name(&maps.stances, "stance", &name)?)
        }
    })
}

fn resolve_stat_block(author: StatBlockAsset, maps: &AssetNameMaps) -> Result<StatBlock, String> {
    let StatBlockAsset {
        attack,
        mhp,
        defense,
        mep,
        hand,
        gait,
        reach,
        blunt,
        bladed,
        pole,
        ward,
        focus,
        wing,
        size,
        morale,
        action_names,
        appearance_feature_names,
        stance_names,
    } = author;
    Ok(StatBlock {
        attack,
        mhp,
        defense,
        mep,
        hand,
        gait,
        reach,
        blunt,
        bladed,
        pole,
        ward,
        focus,
        wing,
        size,
        morale,
        action_ids: action_names
            .iter()
            .map(|n| resolve_name(&maps.actions, "action", n))
            .collect::<Result<_, _>>()?,
        appearance_feature_ids: appearance_feature_names
            .iter()
            .map(|n| resolve_name(&maps.appearance_features, "appearance feature", n))
            .collect::<Result<_, _>>()?,
        stance_ids: stance_names
            .iter()
            .map(|n| resolve_name(&maps.stances, "stance", n))
            .collect::<Result<_, _>>()?,
    })
}

// The forward (name -> id) conversion lives HERE and only here. The server
// owns id assignment and the migration of already-stored rows, so it is the
// only party that can resolve authored names against the authoritative id
// space. The client only ever converts the other way (id -> name, from its
// subscription of these tables) for display.
//
// A push is incremental and strict: matched names keep their ids and get
// their bodies rewritten, new names get fresh ids, and anything that cannot
// be applied exactly — an omitted existing asset, an unknown reference, an
// anonymous blob on an update — fails the whole reducer immediately.
#[reducer]
fn push_assets(ctx: &ReducerContext, asset_pack: AssetPack) -> Result<(), String> {
    // Only an admin account is trusted to alter game content; clients never
    // push automatically.
    crate::role::require_admin(ctx)?;
    log::debug!("Loading asset pack from {}.", ctx.sender());

    let is_update = ctx.get_new_player_blob().is_some();

    // All name -> id maps come first: effect payloads (e.g. SetStance) may
    // reference any kind, so the action loop below already needs them.
    let maps = AssetNameMaps {
        actions: match_names(
            "action",
            ctx.db.actions().iter().map(|a| (a.name, a.id)),
            asset_pack.actions.iter().map(|a| &a.name),
        )?,
        appearance_features: match_names(
            "appearance feature",
            ctx.db.appearance_features().iter().map(|a| (a.name, a.index)),
            asset_pack.appearance_features.iter().map(|a| &a.name),
        )?,
        baselines: match_names(
            "baseline",
            ctx.db.baselines().iter().map(|b| (b.name, b.id)),
            asset_pack.baselines.iter().map(|b| &b.name),
        )?,
        traits: match_names(
            "trait",
            ctx.db.traits().iter().map(|t| (t.name, t.id)),
            asset_pack.traits.iter().map(|t| &t.name),
        )?,
        armaments: match_names(
            "armament",
            ctx.db.armaments().iter().map(|a| (a.name, a.id)),
            asset_pack.armaments.iter().map(|a| &a.name),
        )?,
        armors: match_names(
            "armor",
            ctx.db.armors().iter().map(|a| (a.name, a.id)),
            asset_pack.armors.iter().map(|a| &a.name),
        )?,
        relics: match_names(
            "relic",
            ctx.db.relics().iter().map(|r| (r.name, r.id)),
            asset_pack.relics.iter().map(|r| &r.name),
        )?,
        stances: match_names(
            "stance",
            ctx.db.stances().iter().map(|s| (s.name, s.id)),
            asset_pack.stances.iter().map(|s| &s.name),
        )?,
        location_maps: match_names(
            "location map",
            ctx.db.location_maps().iter().map(|m| (m.name, m.id)),
            asset_pack.location_maps.iter().map(|m| &m.name),
        )?,
    };

    // Action rounds are derived rows and nothing references their ids, so
    // each push rebuilds them wholesale. Every authored round gets a row —
    // including empty (wait) rounds, because round-row existence is what
    // keeps an action alive.
    let stale_round_ids: Vec<u64> = ctx.db.action_rounds().iter().map(|r| r.id).collect();
    for id in stale_round_ids {
        ctx.db.action_rounds().id().delete(id);
    }
    let mut next_action_round_id: u64 = 1;
    for a in asset_pack.actions {
        let action_id = maps.actions[&a.name];
        let row = Action {
            id: action_id,
            name: a.name,
            action_type: a.value.action_type,
            requirements: a.value.requirements,
        };
        if ctx.db.actions().id().find(action_id).is_some() {
            ctx.db.actions().id().update(row);
        } else {
            ctx.db.actions().insert(row);
        }
        for (sequence_index, round) in a.value.rounds.into_iter().enumerate() {
            ctx.db.action_rounds().insert(ActionRound {
                id: next_action_round_id,
                action_id,
                sequence_index: sequence_index as i32,
                effects: round
                    .effects
                    .into_iter()
                    .map(|effect| resolve_action_effect(effect, &maps))
                    .collect::<Result<_, _>>()?,
                interruptible: round.interruptible,
            });
            next_action_round_id += 1;
        }
    }

    for a in asset_pack.appearance_features {
        let index = maps.appearance_features[&a.name];
        let row = AppearanceFeature {
            index,
            name: a.name,
            text: a.value.text,
            appearance_feature_type: a.value.appearance_feature_type,
            priority: a.value.priority,
        };
        if ctx.db.appearance_features().index().find(index).is_some() {
            ctx.db.appearance_features().index().update(row);
        } else {
            ctx.db.appearance_features().insert(row);
        }
    }

    for b in asset_pack.baselines {
        let id = maps.baselines[&b.name];
        let row = Baseline {
            id,
            name: b.name,
            stat_block: resolve_stat_block(b.value, &maps)?,
        };
        if ctx.db.baselines().id().find(id).is_some() {
            ctx.db.baselines().id().update(row);
        } else {
            ctx.db.baselines().insert(row);
        }
    }

    for t in asset_pack.traits {
        let id = maps.traits[&t.name];
        let row = Trait {
            id,
            name: t.name,
            stat_block: resolve_stat_block(t.value, &maps)?,
        };
        if ctx.db.traits().id().find(id).is_some() {
            ctx.db.traits().id().update(row);
        } else {
            ctx.db.traits().insert(row);
        }
    }

    for a in asset_pack.armaments {
        let id = maps.armaments[&a.name];
        let row = Armament {
            id,
            name: a.name,
            stat_block: resolve_stat_block(a.value, &maps)?,
        };
        if ctx.db.armaments().id().find(id).is_some() {
            ctx.db.armaments().id().update(row);
        } else {
            ctx.db.armaments().insert(row);
        }
    }

    for a in asset_pack.armors {
        let id = maps.armors[&a.name];
        let row = Armor {
            id,
            name: a.name,
            stat_block: resolve_stat_block(a.value, &maps)?,
        };
        if ctx.db.armors().id().find(id).is_some() {
            ctx.db.armors().id().update(row);
        } else {
            ctx.db.armors().insert(row);
        }
    }

    for r in asset_pack.relics {
        let id = maps.relics[&r.name];
        let row = Relic {
            id,
            name: r.name,
            stat_block: resolve_stat_block(r.value, &maps)?,
        };
        if ctx.db.relics().id().find(id).is_some() {
            ctx.db.relics().id().update(row);
        } else {
            ctx.db.relics().insert(row);
        }
    }

    for s in asset_pack.stances {
        let id = maps.stances[&s.name];
        let stat_block = resolve_stat_block(s.value.stat_block, &maps)?;
        // Six is the design ceiling for simultaneously available battle
        // actions; a stance authoring more can never fit them.
        if stat_block.action_ids.len() > 6 {
            return Err(format!(
                "Stance \"{}\" grants {} actions; the ceiling is 6.",
                s.name,
                stat_block.action_ids.len()
            ));
        }
        let row = Stance {
            id,
            name: s.name,
            requirements: s.value.requirements,
            stat_block,
        };
        if ctx.db.stances().id().find(id).is_some() {
            ctx.db.stances().id().update(row);
        } else {
            ctx.db.stances().insert(row);
        }
    }

    let special_stance_entries = [
        (SpecialStanceKey::Cowering, asset_pack.cowering_stance_name),
        (SpecialStanceKey::Prone, asset_pack.prone_stance_name),
    ];
    for (key, name) in special_stance_entries {
        if let Some(name) = name {
            let row = SpecialStance {
                key: key.clone(),
                stance_id: resolve_name(&maps.stances, "stance", &name)?,
            };
            if ctx.db.special_stances().key().find(key).is_some() {
                ctx.db.special_stances().key().update(row);
            } else {
                ctx.db.special_stances().insert(row);
            }
        }
    }

    let encounter_blob_ids = match_names(
        "encounter blob",
        ctx.db.encounter_blobs().iter().map(|b| (b.name, b.id)),
        asset_pack.encounter_blobs.iter().map(|b| &b.name),
    )?;
    for b in asset_pack.encounter_blobs {
        let id = encounter_blob_ids[&b.name];
        let row = EncounterBlob {
            id,
            name: b.name,
            blob: resolve_entity_blob(b.value, &maps)?,
        };
        if ctx.db.encounter_blobs().id().find(id).is_some() {
            ctx.db.encounter_blobs().id().update(row);
        } else {
            ctx.db.encounter_blobs().insert(row);
        }
    }

    let encounter_ids = match_names(
        "encounter",
        ctx.db.encounters().iter().map(|e| (e.name, e.id)),
        asset_pack.encounters.iter().map(|e| &e.name),
    )?;
    for e in asset_pack.encounters {
        let id = encounter_ids[&e.name];
        let row = Encounter {
            id,
            name: e.name,
            categoric_blob_id: resolve_name(
                &encounter_blob_ids,
                "encounter blob",
                &e.value.categoric_blob_name,
            )?,
            blob_ids: e
                .value
                .blob_names
                .iter()
                .map(|n| resolve_name(&encounter_blob_ids, "encounter blob", n))
                .collect::<Result<_, _>>()?,
        };
        if ctx.db.encounters().id().find(id).is_some() {
            ctx.db.encounters().id().update(row);
        } else {
            ctx.db.encounters().insert(row);
        }
    }

    let theme_ids = match_names(
        "location map theme",
        ctx.db.location_map_themes().iter().map(|t| (t.name, t.id)),
        asset_pack.location_map_themes.iter().map(|t| &t.name),
    )?;
    for t in asset_pack.location_map_themes {
        let id = theme_ids[&t.name];
        let row = LocationMapTheme {
            id,
            name: t.name,
            decorations_selector: resolve_entity_blobs_sampler(
                t.value.decorations_selector,
                &maps,
            )?,
            min_decoration_count: t.value.min_decoration_count,
            max_decoration_count: t.value.max_decoration_count,
            paths_selector: resolve_entity_blobs_sampler(t.value.paths_selector, &maps)?,
            rooms_selector: resolve_entity_blobs_sampler(t.value.rooms_selector, &maps)?,
            checkpoints_selector: resolve_entity_blobs_sampler(
                t.value.checkpoints_selector,
                &maps,
            )?,
        };
        if ctx.db.location_map_themes().id().find(id).is_some() {
            ctx.db.location_map_themes().id().update(row);
        } else {
            ctx.db.location_map_themes().insert(row);
        }
    }

    // (Matched early, in AssetNameMaps, because blobs may reference maps
    // through checkpoint bindings.)
    let location_map_ids = &maps.location_maps;
    // Connections are derived rows and nothing references their ids, so each
    // push rebuilds them wholesale.
    let stale_connection_ids: Vec<u32> = ctx
        .db
        .location_map_connections()
        .iter()
        .map(|c| c.id)
        .collect();
    for id in stale_connection_ids {
        ctx.db.location_map_connections().id().delete(id);
    }
    let mut next_connection_id: u32 = 0;
    for m in asset_pack.location_maps {
        let NamedLocationMapAsset { name, value: m } = m;
        let id = location_map_ids[&name];
        for destination_name in &m.connection_names {
            ctx.db
                .location_map_connections()
                .insert(LocationMapConnection {
                    id: next_connection_id,
                    exit_location_map_id: id,
                    destination_location_map_id: resolve_name(
                        &location_map_ids,
                        "location map",
                        destination_name,
                    )?,
                });
            next_connection_id += 1;
        }
        let row = LocationMap {
            id,
            name,
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
        };
        if ctx.db.location_maps().id().find(id).is_some() {
            ctx.db.location_maps().id().update(row);
        } else {
            ctx.db.location_maps().insert(row);
        }
    }

    // Named blobs first: anonymous blobs may reference them by name. A name
    // already in the registry means the entity exists: the blob is imprinted
    // onto it (components upserted) rather than instantiated again. And like
    // every other named kind, an existing registration missing from the push
    // is an error.
    let pushed_names: std::collections::HashSet<&String> = asset_pack
        .named_instantiate_entity_blobs
        .iter()
        .map(|nb| &nb.name)
        .collect();
    for row in ctx.db.named_entities().iter() {
        if !pushed_names.contains(&row.name) {
            return Err(format!(
                "The named entity \"{}\" is registered but missing from the pushed assets; assets cannot be removed implicitly.",
                row.name
            ));
        }
    }
    for nb in asset_pack.named_instantiate_entity_blobs {
        let blob = resolve_entity_blob(nb.value, &maps)?;
        match ctx.db.named_entities().name().find(nb.name.to_owned()) {
            Some(registered) => {
                ctx.ecs()
                    .find(registered.entity_id)
                    .instantiate_blob(blob, &ctx.ecs().instantiation_scope())?;
            }
            None => {
                ctx.ecs()
                    .new()
                    .instantiate_blob(blob, &ctx.ecs().instantiation_scope())?
                    .register_name(nb.name)?;
            }
        }
    }

    // Anonymous blobs have no name to match, so on an update push there is no
    // way to tell "already instantiated" from "new" — instantiating would
    // silently duplicate world entities. Fail instead: recurring content must
    // be named.
    if is_update && !asset_pack.instantiate_entity_blobs.is_empty() {
        return Err(
            "Anonymous instantiate blobs cannot be re-pushed; name them to make updates addressable."
                .to_string(),
        );
    }
    for b in asset_pack.instantiate_entity_blobs {
        ctx.ecs().new().instantiate_blob(
            resolve_entity_blob(b, &maps)?,
            &ctx.ecs().instantiation_scope(),
        )?;
    }

    let new_player_blob = SpecialEntityBlob {
        key: SpecialEntityBlobKey::NewPlayer,
        blob: resolve_entity_blob(asset_pack.new_player_blob, &maps)?,
    };
    if is_update {
        ctx.db.special_entity_blobs().key().update(new_player_blob);
    } else {
        ctx.db.special_entity_blobs().insert(new_player_blob);
    }

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
