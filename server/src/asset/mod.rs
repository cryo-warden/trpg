use std::collections::HashMap;

use ecs::WithEcs;
use spacetimedb::{reducer, table, ReducerContext, SpacetimeType, Table};

use crate::{
    action::{action_rounds, actions, special_actions, Action, ActionRound},
    appearance::{appearance_features, AppearanceFeature},
    asset::{
        types::{
            AppearanceBlockAsset, EntityBlobAsset, EntityBlobsSamplerAsset, GroupedBlockAsset,
            ItemRefAsset, NamedActionAsset, NamedAppearanceFeatureAsset, NamedEncounterAsset,
            NamedEntityBlobAsset, NamedGroupedBlockAsset, NamedLocationMapAsset,
            NamedLocationMapThemeAsset, NamedQuestAsset, NamedStanceAsset, NamedTraitPaletteAsset,
        },
        quest::{quests, Quest},
        baseline::{baselines, Baseline},
        encounter::{encounters, Encounter},
        entity_blob_asset::{entity_blob_assets, EntityBlobAssetRow},
        location_map::{
            location_map_connections, location_maps, EncounterIdSample, EncounterIdsSampler,
            LocationMap, LocationMapConnection,
        },
        location_map_theme::{
            location_map_themes, EntityBlobSample, EntityBlobsSampler, LocationMapTheme,
            PathBlobPair, PathBlobPairSample, PathBlobPairsSampler,
        },
        r#trait::{traits, Trait},
        trait_palette::{trait_palettes, TraitPalette},
        stance::{special_stances, stances, SpecialStance, SpecialStanceKey, Stance},
    },
    ecs_extension::EcsExtension,
    entity::{
        appearance_dirty_flag_components, baseline_components, body_capacity_dirty_flag_components,
        equipment_dirty_flag_components, named_entities, quest_dirty_flag_components,
        readiness_dirty_flag_components, stats_dirty_flag_components, traits_dirty_flag_components,
        ActionsComponentBlob, ActiveStanceComponentBlob,
        AppearanceFeaturesComponentBlob, BaselineComponentBlob,
        CheckpointBindingComponentBlob, CheckpointComponentBlob, DifferentiableComponentBlob,
        EntityBlob,
        EquipmentBlobbedComponentBlob, EquippableComponentBlob,
        FindEntityHandle, FlagComponent, InstantiateEntityBlob,
        ItemComponentBlob, NewEntityHandle, PinnedActionsComponentBlob,
        RemainsComponentBlob, StartingGearComponentBlob, TraitsComponentBlob,
    },
    item::ItemRef,
    stat_group::{AppearanceBlock, BodyCapacityBlock, ReadinessBlock, StatsBlock},
};

pub mod types;
pub mod quest;
pub mod baseline;
pub mod encounter;
pub mod entity_blob_asset;
pub mod location_map;
pub mod location_map_theme;
pub mod rng_range;
pub mod stance;
pub mod r#trait;
pub mod trait_palette;
pub mod weighted_sampler;

/// Key for the process-wide singleton refs stored below. An explicit
/// single-variant key (not a magic sentinel row) so the new-player selection is
/// a typed row, and so more singletons can join it without reshaping the table.
#[derive(Debug, Clone, SpacetimeType, PartialEq, Eq, Hash)]
pub enum SingletonBlobKey {
    NewPlayer,
}

/// Which unified-table blob is the new-player template. Storing the ID (not the
/// blob) keeps the blob body in ONE place — the unified table — so a re-push
/// that rewrites that blob is reflected here with no extra work. Its PRESENCE is
/// also the "instance already bootstrapped" signal (see push_assets is_update).
#[table(accessor = singleton_blob_refs)]
struct SingletonBlobRef {
    #[primary_key]
    key: SingletonBlobKey,
    blob_id: u32,
}

/// Every Record-authored kind arrives as a Vec of name+value pairs — the
/// client's Record entries verbatim (SATS has no map type), names untouched
/// by any client processing.
#[derive(SpacetimeType)]
pub struct AssetPack {
    actions: Vec<NamedActionAsset>,
    appearance_features: Vec<NamedAppearanceFeatureAsset>,
    baselines: Vec<NamedGroupedBlockAsset>,
    traits: Vec<NamedGroupedBlockAsset>,
    trait_palettes: Vec<NamedTraitPaletteAsset>,
    stances: Vec<NamedStanceAsset>,
    quests: Vec<NamedQuestAsset>,
    /// Which stance a dive lands in; a pack without morale-relevant content
    /// may omit it (forcing then fails loudly).
    prone_stance_name: Option<String>,
    /// The DERIVED item verbs: which authored action serves each role
    /// (take/drop/equip/unequip/eat). Registered, never sniffed from
    /// effects; a pack without item interaction may omit any of them
    /// (the offer then simply never derives).
    take_action_name: Option<String>,
    drop_action_name: Option<String>,
    equip_action_name: Option<String>,
    unequip_action_name: Option<String>,
    eat_action_name: Option<String>,
    /// The reconciliation system's forced re-arm (never offered to
    /// anyone); a pack without equipment reconfiguration may omit it —
    /// equipment then simply never diverges from configuration.
    rearm_action_name: Option<String>,
    /// The COMMON move verb, registered so the bar menus can give it a
    /// stable configured slot (paths still decide what they offer).
    move_action_name: Option<String>,
    encounters: Vec<NamedEncounterAsset>,
    location_map_themes: Vec<NamedLocationMapThemeAsset>,
    location_maps: Vec<NamedLocationMapAsset>,

    /// Cross-map connections: a join list, not per-map fields.
    connections: Vec<types::LocationMapConnectionAsset>,

    /// The ONE unified store of entity-blob TEMPLATES, name-keyed. Every kind of
    /// blob (gear, encounter members, decorations/rooms/paths/etc., quest items,
    /// the new-player template, and the world entities instantiated at push)
    /// arrives here; every cross-reference resolves by NAME against it.
    entity_blobs: Vec<NamedEntityBlobAsset>,

    /// Names (into `entity_blobs`) of blobs to INSTANTIATE as world entities at
    /// push. Each is registered under its name so a re-push imprints onto the
    /// existing entity rather than duplicating it.
    instantiate_entity_blob_names: Vec<String>,

    /// Name (into `entity_blobs`) of the new-player template.
    new_player_blob_name: String,
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
    trait_palettes: HashMap<String, u32>,
    // The ONE unified entity-blob map (name -> id). ALL blob references resolve
    // against it: a creature's armament_names / armor_name / relic_names (the
    // equip SLOT is decided by which field, not by a per-kind table), an
    // encounter's members, a theme sampler's blob, a quest's item, the
    // new-player template, and the instantiate-at-push names.
    entity_blobs: HashMap<String, u32>,
    stances: HashMap<String, u32>,
    quests: HashMap<String, u32>,
    location_maps: HashMap<String, u32>,
    // Each blob's resolved Equippable GRANT, keyed by its unified-table id —
    // filled in a PRE-SCAN pass over every entity blob's authored equippable,
    // BEFORE any creature blob resolves, so a creature can sum its NPC
    // EquipmentBlobbed from referenced gear regardless of authoring order.
    gear_equippables: HashMap<u32, EquippableComponentBlob>,
}

/// Resolve an authored blob's asset-name references into the stored
/// EntityBlob's integer ids. Runtime-state components are never authored, so
/// they are always None here.
fn resolve_entity_blob(
    author: EntityBlobAsset,
    maps: &AssetNameMaps,
) -> Result<EntityBlob, String> {
    // The item's resolved reference, shared by the ItemComponent and the
    // Equippable stamp below so a name resolves exactly once.
    let item_ref: Option<ItemRef> = author
        .item
        .as_ref()
        .map(|item| {
            Ok::<_, String>(match item {
                ItemRefAsset::Armament => ItemRef::Armament,
                ItemRefAsset::Armor => ItemRef::Armor,
                ItemRefAsset::Relic => ItemRef::Relic,
                ItemRefAsset::QuestItem(q) => ItemRef::QuestItem(crate::item::QuestItemRef {
                    quest_id: resolve_name(&maps.quests, "quest", &q.quest_name)?,
                    index: q.index,
                }),
            })
        })
        .transpose()?;
    // An equippable item entity carries its OWN authored GRANT (the per-group
    // contributions it confers when worn — the hand/body/relic cost and the
    // readiness tags that make actions available). Authored directly on the blob
    // like any component; the item's OWN look is the ordinary appearance channel.
    let equippable = author
        .equippable
        .map(|block| {
            let g = resolve_grouped_block(block, maps)?;
            Ok::<_, String>(EquippableComponentBlob {
                stats: g.stats,
                appearance: g.appearance,
                body_capacity: g.body_capacity,
                readiness: g.readiness,
            })
        })
        .transpose()?;
    // NPC gear kept light: the summed GRANT of the authored armaments, armor,
    // and relics — the same per-group total a player's per-item Equippable sum
    // produces. Each referenced gear blob is looked up by name and its own
    // Equippable folded in; each group folds through its own AddAssign.
    let equipment_blobbed = {
        let mut summed = ResolvedGroups::default();
        let mut any = false;
        let mut gear_names: Vec<&String> = Vec::new();
        if let Some(names) = author.armament_names.as_ref() {
            gear_names.extend(names);
        }
        if let Some(n) = author.armor_name.as_ref() {
            gear_names.push(n);
        }
        if let Some(names) = author.relic_names.as_ref() {
            gear_names.extend(names);
        }
        for n in gear_names {
            let id = resolve_name(&maps.entity_blobs, "gear", n)?;
            if let Some(eq) = maps.gear_equippables.get(&id) {
                summed.stats += &eq.stats;
                summed.appearance += &eq.appearance;
                summed.body_capacity += &eq.body_capacity;
                summed.readiness += &eq.readiness;
                any = true;
            }
        }
        any.then_some(EquipmentBlobbedComponentBlob {
            stats: summed.stats,
            appearance: summed.appearance,
            body_capacity: summed.body_capacity,
            readiness: summed.readiness,
        })
    };
    Ok(EntityBlob {
        name: author.name,
        location: author.location,
        path: author.path,
        // Not authorable yet: blockers exist only through generation.
        path_blocker: None,
        // Shared-HP links are forged at generation (paired paths), never
        // authored on a blob.
        hp_share: None,
        // Transient per-tick state; never authored, cleared each transaction.
        hp_share_applied: None,
        // Party membership is granted at player creation, not authored on a blob.
        party: None,
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
        // Blobs never author the runtime EquipmentComponent (concrete item
        // entities): players spawn their owned items from the manifest below
        // at provisioning; NPCs run stat-only on EquipmentBlobbed. Born
        // config-less, so the reconciliation system finds nothing to converge.
        equipment: None,
        // Derived state only — the equipment stat computation writes it when
        // something is unapplied; never authored.
        equipment_disabled: None,
        // The authored starting-gear MANIFEST (gear-blob ids, resolved via
        // maps.gear): player provisioning spawns owned item entities from it.
        // Inert on NPCs.
        starting_gear: {
            let armament_ids: Vec<u32> = author
                .armament_names
                .as_ref()
                .map(|names| {
                    names
                        .iter()
                        .map(|n| resolve_name(&maps.entity_blobs, "gear", n))
                        .collect::<Result<_, _>>()
                })
                .transpose()?
                .unwrap_or_default();
            let worn_armor_id: Option<u32> = author
                .armor_name
                .as_ref()
                .map(|n| resolve_name(&maps.entity_blobs, "gear", n))
                .transpose()?;
            let worn_relic_ids: Vec<u32> = author
                .relic_names
                .as_ref()
                .map(|names| {
                    names
                        .iter()
                        .map(|n| resolve_name(&maps.entity_blobs, "gear", n))
                        .collect::<Result<_, _>>()
                })
                .transpose()?
                .unwrap_or_default();
            if armament_ids.is_empty() && worn_armor_id.is_none() && worn_relic_ids.is_empty()
            {
                None
            } else {
                Some(StartingGearComponentBlob {
                    armament_ids,
                    worn_armor_id,
                    worn_relic_ids,
                })
            }
        },
        // NO configuration from blobs: configurations (all entity-id lists)
        // exist only where something reconfigures — players, via menus and
        // acts. NPC gear stats come from EquipmentBlobbed alone.
        default_armaments: None,
        armor: None,
        relics: None,
        item: item_ref.map(|item_ref| ItemComponentBlob { item_ref }),
        equippable,
        equipment_blobbed,
        stance_customizations: None,
        checkpoint_object: author.checkpoint_object,
        immobile: author.immobile,
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
        checkpoint: author
            .checkpoint
            .map(|c| {
                Ok::<_, String>(CheckpointComponentBlob {
                    location_map_id: resolve_name(
                        &maps.location_maps,
                        "location map",
                        &c.location_map_name,
                    )?,
                    checkpoint_index: c.checkpoint_index,
                })
            })
            .transpose()?,
        map_instance: None,
        map_checkpoints: None,
        map_rooms: None,
        pending_connections: None,
        respawn_timer: None,
        map_cleanup_timer: None,
        fear_status: None,
        courage_status: None,
        braced_status: None,
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
        // Configured in play (the equip menu), never authored.
        default_actions: None,
        offered_actions: author
            .offered_action_names
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
        // An entity's own look: its authored appearance features. Gear is an
        // entity like any other, so its look comes through this same channel —
        // never a separate gear-asset appearance.
        appearance_features: author
            .appearance_feature_names
            .map(|names| {
                Ok::<_, String>(AppearanceFeaturesComponentBlob {
                    appearance_feature_indexes: resolve_appearance_names(&names, maps)?,
                })
            })
            .transpose()?,
        remains: author
            .remains_appearance_feature_names
            .map(|names| {
                Ok::<_, String>(RemainsComponentBlob {
                    appearance_feature_ids: names
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
        // Per-group source caches, group totals, dirty flags, and the transient
        // maxima raise are all runtime state — derived by the stats systems,
        // never authored.
        traits_stats_cache: None,
        status_stats_cache: None,
        quest_stats_cache: None,
        equipment_stats_cache: None,
        traits_appearance_cache: None,
        quest_appearance_cache: None,
        equipment_appearance_cache: None,
        traits_readiness_cache: None,
        status_readiness_cache: None,
        quest_readiness_cache: None,
        equipment_readiness_cache: None,
        traits_body_capacity_cache: None,
        quest_body_capacity_cache: None,
        equipment_body_capacity_cache: None,
        stats_total: None,
        readiness_total: None,
        body_capacity_total: None,
        maxima_raise: None,
        traits_dirty_flag: None,
        status_dirty_flag: None,
        quest_dirty_flag: None,
        equipment_dirty_flag: None,
        stats_dirty_flag: None,
        appearance_dirty_flag: None,
        body_capacity_dirty_flag: None,
        readiness_dirty_flag: None,
        action_state: None,
        action_queue: None,
        // The enemy AI's rotation cursor is runtime-only.
        action_cursor: None,
        entity_deletion_timer: None,
        player_deactivation_timer: None,
        actionless_since: None,
        turn_paused: None,
        // Runtime state: a container is authored closed and opened in play.
        open: None,
        // Runtime state: only forced transitions set it.
        stance_forced: None,
        // Runtime state: queue mutations set it.
        action_queue_dirty: None,
        // Runtime state: the death system's one-shot latch.
        perished: None,
        destroyed: None,
        differentiable: author
            .differentiable
            .map(|d| {
                Ok::<_, String>(DifferentiableComponentBlob {
                    trait_palette_id: resolve_name(
                        &maps.trait_palettes,
                        "trait palette",
                        &d.trait_palette_name,
                    )?,
                })
            })
            .transpose()?,
        // Stamped by the quest room-claim application, never authored.
        defeat_drop: None,
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
                    blob_id: resolve_name(&maps.entity_blobs, "entity blob", &s.blob_name)?,
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
        ActionEffectAsset::Eat => ActionEffect::Eat,
        ActionEffectAsset::Intimidate(magnitude) => ActionEffect::Intimidate(magnitude),
        ActionEffectAsset::Rally => ActionEffect::Rally,
        ActionEffectAsset::Dive(defense) => ActionEffect::Dive(defense),
        ActionEffectAsset::Attune => ActionEffect::Attune,
        ActionEffectAsset::SetStance(name) => {
            ActionEffect::SetStance(resolve_name(&maps.stances, "stance", &name)?)
        }
        ActionEffectAsset::Open => ActionEffect::Open,
        ActionEffectAsset::Dump => ActionEffect::Dump,
        ActionEffectAsset::Rearm => ActionEffect::Rearm,
    })
}

fn resolve_appearance_names(
    names: &[String],
    maps: &AssetNameMaps,
) -> Result<Vec<u32>, String> {
    names
        .iter()
        .map(|n| resolve_name(&maps.appearance_features, "appearance feature", n))
        .collect()
}

/// The four independent group values a source contributes, resolved from its
/// authored form. NOT a runtime aggregate — there is no stored StatBlock — just
/// the natural carrier for the four values resolution produces together, fanned
/// out into separate row fields / component fields at every call site.
#[derive(Debug, Clone, Default)]
struct ResolvedGroups {
    stats: StatsBlock,
    appearance: AppearanceBlock,
    body_capacity: BodyCapacityBlock,
    readiness: ReadinessBlock,
}

fn resolve_appearance_block(
    author: &AppearanceBlockAsset,
    maps: &AssetNameMaps,
) -> Result<AppearanceBlock, String> {
    Ok(AppearanceBlock {
        feature_ids: resolve_appearance_names(&author.feature_names, maps)?,
    })
}

/// Resolve an authored per-group source block: only the appearance group names
/// need resolving; the numeric group blocks carry no references and pass
/// through verbatim.
fn resolve_grouped_block(
    author: GroupedBlockAsset,
    maps: &AssetNameMaps,
) -> Result<ResolvedGroups, String> {
    Ok(ResolvedGroups {
        stats: author.stats,
        appearance: resolve_appearance_block(&author.appearance, maps)?,
        body_capacity: author.body_capacity,
        readiness: author.readiness,
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
    // The FIRST push bootstraps an EMPTY instance and is open to any
    // authenticated connection: an auto-entry (dev smooth-entry)
    // deployment has no admin logging in to deliver the bundle, and
    // without assets the player-provision trigger waits forever. The
    // window self-closes — every subsequent push (an UPDATE) is
    // admin-only, and no role is granted to whoever bootstrapped.
    let is_update = ctx.get_new_player_blob().is_some();
    if is_update {
        crate::role::require_admin(ctx)?;
    }
    log::debug!("Loading asset pack from {}.", ctx.sender());

    // All name -> id maps come first: effect payloads (e.g. SetStance) may
    // reference any kind, so the action loop below already needs them.
    let mut maps = AssetNameMaps {
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
        trait_palettes: match_names(
            "trait palette",
            ctx.db.trait_palettes().iter().map(|p| (p.name, p.id)),
            asset_pack.trait_palettes.iter().map(|p| &p.name),
        )?,
        entity_blobs: match_names(
            "entity blob",
            ctx.db.entity_blob_assets().iter().map(|b| (b.name, b.id)),
            asset_pack.entity_blobs.iter().map(|b| &b.name),
        )?,
        gear_equippables: HashMap::new(),
        stances: match_names(
            "stance",
            ctx.db.stances().iter().map(|s| (s.name, s.id)),
            asset_pack.stances.iter().map(|s| &s.name),
        )?,
        quests: match_names(
            "quest",
            ctx.db.quests().iter().map(|q| (q.name, q.id)),
            asset_pack.quests.iter().map(|q| &q.name),
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
    // (Round rows are rebuilt below; derived per-entity state is re-dirtied
    // at the end of the push.)
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
            appearance_feature_type: a.value.appearance_feature_type,
            priority: a.value.priority,
            exclusion_group: a.value.exclusion_group,
        };
        if ctx.db.appearance_features().index().find(index).is_some() {
            ctx.db.appearance_features().index().update(row);
        } else {
            ctx.db.appearance_features().insert(row);
        }
    }

    for b in asset_pack.baselines {
        let id = maps.baselines[&b.name];
        let g = resolve_grouped_block(b.value, &maps)?;
        let row = Baseline {
            id,
            name: b.name,
            stats: g.stats,
            appearance: g.appearance,
            body_capacity: g.body_capacity,
            readiness: g.readiness,
        };
        if ctx.db.baselines().id().find(id).is_some() {
            ctx.db.baselines().id().update(row);
        } else {
            ctx.db.baselines().insert(row);
        }
    }

    for t in asset_pack.traits {
        let id = maps.traits[&t.name];
        let g = resolve_grouped_block(t.value, &maps)?;
        let row = Trait {
            id,
            name: t.name,
            stats: g.stats,
            appearance: g.appearance,
            body_capacity: g.body_capacity,
            readiness: g.readiness,
        };
        if ctx.db.traits().id().find(id).is_some() {
            ctx.db.traits().id().update(row);
        } else {
            ctx.db.traits().insert(row);
        }
    }

    for p in asset_pack.trait_palettes {
        let id = maps.trait_palettes[&p.name];
        let row = TraitPalette {
            id,
            name: p.name,
            trait_ids: p
                .value
                .trait_names
                .iter()
                .map(|n| resolve_name(&maps.traits, "trait", n))
                .collect::<Result<_, _>>()?,
            count_weights: p.value.count_weights,
        };
        if ctx.db.trait_palettes().id().find(id).is_some() {
            ctx.db.trait_palettes().id().update(row);
        } else {
            ctx.db.trait_palettes().insert(row);
        }
    }

    // PASS 1 (pre-scan): resolve EVERY entity blob's authored Equippable grant
    // and index it by id BEFORE any blob resolves its creature EquipmentBlobbed
    // sum. A creature may reference a gear blob that appears anywhere in the
    // unified list (or nowhere in particular order), so the summed NPC equipment
    // (see resolve_entity_blob) must be able to look up any referenced blob's
    // grant regardless of authoring order.
    for b in &asset_pack.entity_blobs {
        if let Some(block) = b.value.equippable.as_ref() {
            let id = maps.entity_blobs[&b.name];
            let g = resolve_grouped_block(block.clone(), &maps)?;
            maps.gear_equippables.insert(
                id,
                EquippableComponentBlob {
                    stats: g.stats,
                    appearance: g.appearance,
                    body_capacity: g.body_capacity,
                    readiness: g.readiness,
                },
            );
        }
    }

    // PASS 2: resolve each blob fully and store it name-keyed in the ONE unified
    // table. Players spawn owned copies (gear), creatures sum their NPC
    // equipment (via the pre-scanned grants above), map generation and quest
    // layers fetch by id, and the instantiate/new-player steps below reference
    // these same rows by name.
    for b in asset_pack.entity_blobs {
        let id = maps.entity_blobs[&b.name];
        let blob = resolve_entity_blob(b.value, &maps)?;
        let row = EntityBlobAssetRow {
            id,
            name: b.name,
            blob,
        };
        if ctx.db.entity_blob_assets().id().find(id).is_some() {
            ctx.db.entity_blob_assets().id().update(row);
        } else {
            ctx.db.entity_blob_assets().insert(row);
        }
    }

    for q in asset_pack.quests {
        let id = maps.quests[&q.name];
        let g = resolve_grouped_block(q.value.per_bit_block, &maps)?;
        let row = Quest {
            id,
            name: q.name,
            per_bit_stats: g.stats,
            per_bit_appearance: g.appearance,
            per_bit_body_capacity: g.body_capacity,
            per_bit_readiness: g.readiness,
            bit_count: q.value.bit_count,
        };
        if ctx.db.quests().id().find(id).is_some() {
            ctx.db.quests().id().update(row);
        } else {
            ctx.db.quests().insert(row);
        }
    }

    for s in asset_pack.stances {
        let id = maps.stances[&s.name];
        // A stance grants no appearance; its stats/readiness/body-capacity
        // contribute to the corresponding totals. Actions are no longer granted
        // (they derive from the readiness filter), so there is no per-stance
        // action ceiling to enforce here.
        let g = resolve_grouped_block(s.value.block, &maps)?;
        let row = Stance {
            id,
            name: s.name,
            requirements: s.value.requirements,
            stats: g.stats,
            body_capacity: g.body_capacity,
            readiness: g.readiness,
        };
        if ctx.db.stances().id().find(id).is_some() {
            ctx.db.stances().id().update(row);
        } else {
            ctx.db.stances().insert(row);
        }
    }

    let special_stance_entries = [(SpecialStanceKey::Prone, asset_pack.prone_stance_name)];
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

    let special_action_entries = [
        (
            crate::action::SpecialActionKey::Take,
            asset_pack.take_action_name,
        ),
        (
            crate::action::SpecialActionKey::Drop,
            asset_pack.drop_action_name,
        ),
        (
            crate::action::SpecialActionKey::Equip,
            asset_pack.equip_action_name,
        ),
        (
            crate::action::SpecialActionKey::Unequip,
            asset_pack.unequip_action_name,
        ),
        (
            crate::action::SpecialActionKey::Eat,
            asset_pack.eat_action_name,
        ),
        (
            crate::action::SpecialActionKey::Rearm,
            asset_pack.rearm_action_name,
        ),
        (
            crate::action::SpecialActionKey::Move,
            asset_pack.move_action_name,
        ),
    ];
    for (key, name) in special_action_entries {
        if let Some(name) = name {
            let row = crate::action::SpecialAction {
                key: key.clone(),
                action_id: resolve_name(&maps.actions, "action", &name)?,
            };
            if ctx.db.special_actions().key().find(key).is_some() {
                ctx.db.special_actions().key().update(row);
            } else {
                ctx.db.special_actions().insert(row);
            }
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
                &maps.entity_blobs,
                "entity blob",
                &e.value.categoric_blob_name,
            )?,
            blob_ids: e
                .value
                .blob_names
                .iter()
                .map(|n| resolve_name(&maps.entity_blobs, "entity blob", n))
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
            paths_selector: PathBlobPairsSampler {
                selections: t
                    .value
                    .paths_selector
                    .selections
                    .into_iter()
                    .map(|s| {
                        Ok::<_, String>(PathBlobPairSample {
                            weight: s.weight,
                            pair: PathBlobPair {
                                forward_id: resolve_name(
                                    &maps.entity_blobs,
                                    "entity blob",
                                    &s.pair.forward_name,
                                )?,
                                backward_id: resolve_name(
                                    &maps.entity_blobs,
                                    "entity blob",
                                    &s.pair.backward_name,
                                )?,
                            },
                        })
                    })
                    .collect::<Result<_, _>>()?,
            },
            rooms_selector: resolve_entity_blobs_sampler(t.value.rooms_selector, &maps)?,
            checkpoints_selector: resolve_entity_blobs_sampler(
                t.value.checkpoints_selector,
                &maps,
            )?,
            containers_selector: resolve_entity_blobs_sampler(
                t.value.containers_selector,
                &maps,
            )?,
            min_container_count: t.value.min_container_count,
            max_container_count: t.value.max_container_count,
            blockers_selector: resolve_entity_blobs_sampler(
                t.value.blockers_selector,
                &maps,
            )?,
            path_variation_trait_ids: t
                .value
                .path_variation_trait_names
                .iter()
                .map(|n| resolve_name(&maps.traits, "trait", n))
                .collect::<Result<_, _>>()?,
            path_variation_count_weights: t.value.path_variation_count_weights,
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
    // Authored as a JOIN list; both-ways rows expand into one directed row
    // per direction.
    let mut next_connection_id: u32 = 0;
    for connection in asset_pack.connections {
        let exit_id = resolve_name(
            location_map_ids,
            "location map",
            &connection.exit_location_map_name,
        )?;
        let destination_id = resolve_name(
            location_map_ids,
            "location map",
            &connection.destination_location_map_name,
        )?;
        // ONE row per crossing now (materialize_connection builds both
        // directions at once): the authored pair rides along whole — forward is
        // the exit->destination look, backward the destination->exit one.
        let (forward_path_blob_id, backward_path_blob_id) = match connection.path_pair {
            Some(pair) => (
                Some(resolve_name(&maps.entity_blobs, "entity blob", &pair.forward_name)?),
                Some(resolve_name(&maps.entity_blobs, "entity blob", &pair.backward_name)?),
            ),
            None => (None, None),
        };
        ctx.db
            .location_map_connections()
            .insert(LocationMapConnection {
                id: next_connection_id,
                exit_location_map_id: exit_id,
                destination_location_map_id: destination_id,
                exit_anchor: connection.exit_anchor,
                destination_anchor: connection.destination_anchor,
                both_ways: connection.both_ways,
                forward_path_blob_id,
                backward_path_blob_id,
            });
        next_connection_id += 1;
    }
    // Union of every map's window per quest: any bit of a windowed quest
    // that no map can spawn is a supply hole (that bit could never be
    // earned) and fails the push. Quests with no windows at all are
    // exempt — their items arrive by authored blobs instead.
    let mut spawnable_indexes: HashMap<u32, crate::bitset::Bitset> = HashMap::new();
    for m in asset_pack.location_maps {
        let NamedLocationMapAsset { name, value: m } = m;
        let id = location_map_ids[&name];
        let mut quest_spawns: Vec<crate::quest::QuestSpawn> = Vec::new();
        for spawn in m.quest_spawns {
            let quest_id = resolve_name(&maps.quests, "quest", &spawn.quest_name)?;
            let quest = ctx
                .db
                .quests()
                .id()
                .find(quest_id)
                .ok_or_else(|| format!("Quest {} vanished during push.", spawn.quest_name))?;
            for index in spawn
                .guaranteed_indexes
                .iter()
                .chain(spawn.eligible_indexes.iter())
            {
                if *index >= quest.bit_count {
                    return Err(format!(
                        "Map \"{}\" spawns index {} of quest \"{}\", beyond its bit count {}.",
                        name, index, spawn.quest_name, quest.bit_count
                    ));
                }
            }
            let guaranteed_indexes =
                crate::bitset::Bitset::from_indexes(spawn.guaranteed_indexes);
            let eligible_indexes =
                crate::bitset::Bitset::from_indexes(spawn.eligible_indexes);
            let spawnable = spawnable_indexes.entry(quest_id).or_default();
            spawnable.union_with(&guaranteed_indexes);
            spawnable.union_with(&eligible_indexes);
            quest_spawns.push(crate::quest::QuestSpawn {
                quest_id,
                item_blob_id: resolve_name(
                    &maps.entity_blobs,
                    "entity blob",
                    &spawn.item_blob_name,
                )?,
                guaranteed_indexes,
                eligible_indexes,
                min_eligible_count: spawn.min_eligible_count,
                max_eligible_count: spawn.max_eligible_count,
            });
        }
        let mut quest_room_claims: Vec<crate::quest::QuestRoomClaim> = Vec::new();
        for claim in m.quest_room_claims {
            let quest_id = resolve_name(&maps.quests, "quest", &claim.quest_name)?;
            let defeat_drop = claim
                .defeat_drop
                .map(|drop| {
                    // The drop names its OWN quest: same quest for a
                    // self-contained boss reward, or another quest's item
                    // in this quest's monster's clutches.
                    let drop_quest_id =
                        resolve_name(&maps.quests, "quest", &drop.quest_name)?;
                    let drop_quest = ctx.db.quests().id().find(drop_quest_id).ok_or_else(
                        || format!("Quest {} vanished during push.", drop.quest_name),
                    )?;
                    if drop.index >= drop_quest.bit_count {
                        return Err(format!(
                            "Map \"{}\" drops defeat bit {} of quest \"{}\", beyond its bit count {}.",
                            name, drop.index, drop.quest_name, drop_quest.bit_count
                        ));
                    }
                    Ok::<_, String>(crate::quest::QuestDefeatDrop {
                        quest_id: drop_quest_id,
                        index: drop.index,
                        item_blob_id: resolve_name(
                            &maps.entity_blobs,
                            "entity blob",
                            &drop.item_blob_name,
                        )?,
                    })
                })
                .transpose()?;
            quest_room_claims.push(crate::quest::QuestRoomClaim {
                quest_id,
                role: claim.role,
                encounter_id: resolve_name(&encounter_ids, "encounter", &claim.encounter_name)?,
                spawn_checkpoint_before: claim.spawn_checkpoint_before,
                defeat_drop,
            });
        }
        let row = LocationMap {
            id,
            name,
            theme_id: resolve_name(&theme_ids, "location map theme", &m.theme_name)?,
            layout: m.layout,
            zone_kind: m.zone_kind,
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
            min_hidden_room_count: m.min_hidden_room_count,
            max_hidden_room_count: m.max_hidden_room_count,
            quest_spawns,
            quest_room_claims,
            room_location: m.room_location,
        };
        if ctx.db.location_maps().id().find(id).is_some() {
            ctx.db.location_maps().id().update(row);
        } else {
            ctx.db.location_maps().insert(row);
        }
    }
    for (quest_id, spawnable) in &spawnable_indexes {
        let quest = ctx
            .db
            .quests()
            .id()
            .find(*quest_id)
            .ok_or("Windowed quest vanished during push.")?;
        let missing: Vec<u32> = (0..quest.bit_count)
            .filter(|index| !spawnable.is_set(*index))
            .collect();
        if !missing.is_empty() {
            return Err(format!(
                "Quest \"{}\" has bits no map can spawn: {:?} of bit count {}; every bit of a windowed quest needs at least one map whose window includes it.",
                quest.name, missing, quest.bit_count
            ));
        }
    }

    // World entities to instantiate at push, each named by an entity-blob-asset
    // name. Every instantiation is NAMED: the world entity is registered under
    // its blob-asset name, so a re-push imprints the (possibly rewritten) blob
    // onto the existing entity rather than duplicating it — no anonymous path,
    // and thus no need for an update-time duplication guard. Like every other
    // named kind, a registration missing from the push is an error.
    let pushed_names: std::collections::HashSet<&String> =
        asset_pack.instantiate_entity_blob_names.iter().collect();
    for row in ctx.db.named_entities().iter() {
        if !pushed_names.contains(&row.name) {
            return Err(format!(
                "The named entity \"{}\" is registered but missing from the pushed assets; assets cannot be removed implicitly.",
                row.name
            ));
        }
    }
    for name in &asset_pack.instantiate_entity_blob_names {
        let id = resolve_name(&maps.entity_blobs, "entity blob", name)?;
        let blob = ctx
            .db
            .entity_blob_assets()
            .id()
            .find(id)
            .ok_or_else(|| format!("Entity blob \"{}\" vanished during push.", name))?
            .blob;
        match ctx.db.named_entities().name().find(name.to_owned()) {
            Some(registered) => {
                ctx.ecs()
                    .find(registered.entity_id)
                    .instantiate_blob(blob, &ctx.ecs().instantiation_scope())?;
            }
            None => {
                ctx.ecs()
                    .new()
                    .instantiate_blob(blob, &ctx.ecs().instantiation_scope())?
                    .register_name(name.to_owned())?;
            }
        }
    }

    // Record WHICH unified-table blob is the new-player template (by id, not by
    // value — the body lives once, in the unified table). Its presence is the
    // is_update signal on the next push.
    let new_player_ref = SingletonBlobRef {
        key: SingletonBlobKey::NewPlayer,
        blob_id: resolve_name(
            &maps.entity_blobs,
            "entity blob",
            &asset_pack.new_player_blob_name,
        )?,
    };
    if is_update {
        ctx.db.singleton_blob_refs().key().update(new_player_ref);
    } else {
        ctx.db.singleton_blob_refs().insert(new_player_ref);
    }

    // The push changed the truth every per-entity derivation was computed
    // from (baseline bodies, trait and gear stat blocks, action
    // requirements), so every stat-bearing entity re-derives. Without this,
    // an existing character keeps a derived action set filtered under the
    // OLD requirements until something else happens to dirty it.
    for baseline in ctx.db.baseline_components().iter() {
        let entity_id = baseline.entity_id;
        let flag = FlagComponent { entity_id };
        // Re-fold the cached sources (traits/quest/equipment) and recompute
        // every group total. Baseline and stance are read live, so seeding the
        // group flags re-applies them too; status is runtime-only and re-dirties
        // itself when a status changes.
        let seed = |present: bool, insert: &dyn Fn(FlagComponent)| {
            if !present {
                insert(flag.clone());
            }
        };
        seed(
            ctx.db.traits_dirty_flag_components().entity_id().find(entity_id).is_some(),
            &|f| {
                ctx.db.traits_dirty_flag_components().insert(f);
            },
        );
        seed(
            ctx.db.quest_dirty_flag_components().entity_id().find(entity_id).is_some(),
            &|f| {
                ctx.db.quest_dirty_flag_components().insert(f);
            },
        );
        seed(
            ctx.db.equipment_dirty_flag_components().entity_id().find(entity_id).is_some(),
            &|f| {
                ctx.db.equipment_dirty_flag_components().insert(f);
            },
        );
        seed(
            ctx.db.stats_dirty_flag_components().entity_id().find(entity_id).is_some(),
            &|f| {
                ctx.db.stats_dirty_flag_components().insert(f);
            },
        );
        seed(
            ctx.db.appearance_dirty_flag_components().entity_id().find(entity_id).is_some(),
            &|f| {
                ctx.db.appearance_dirty_flag_components().insert(f);
            },
        );
        seed(
            ctx.db.body_capacity_dirty_flag_components().entity_id().find(entity_id).is_some(),
            &|f| {
                ctx.db.body_capacity_dirty_flag_components().insert(f);
            },
        );
        seed(
            ctx.db.readiness_dirty_flag_components().entity_id().find(entity_id).is_some(),
            &|f| {
                ctx.db.readiness_dirty_flag_components().insert(f);
            },
        );
    }

    Ok(())
}

pub trait ReducerContextExtension {
    fn get_new_player_blob(&self) -> Option<EntityBlob>;
}

impl ReducerContextExtension for ReducerContext {
    fn get_new_player_blob(&self) -> Option<EntityBlob> {
        self.db
            .singleton_blob_refs()
            .key()
            .find(SingletonBlobKey::NewPlayer)
            .and_then(|r| self.db.entity_blob_assets().id().find(r.blob_id))
            .map(|row| row.blob)
    }
}
