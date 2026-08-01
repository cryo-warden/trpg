use ecs::WithEcs;
use spacetimedb::{reducer, table, ReducerContext, SpacetimeType, Table};

use crate::{
    action::{action_steps, actions, Action, ActionStep},
    appearance::{appearance_features, AppearanceFeature},
    asset::{
        baseline::{baselines, Baseline},
        encounter::{encounter_blobs, encounters, Encounter, EncounterBlob},
        location_map::{
            location_map_connections, location_maps, LocationMap, LocationMapConnection,
        },
        location_map_theme::{location_map_themes, LocationMapTheme},
        r#trait::{traits, Trait},
    },
    entity::{EntityBlob, InstantiateEntityBlob, NewEntityHandle},
};

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

secador::secador!(
    (assets, Asset),
    [
        (actions, Action),
        (action_steps, ActionStep),
        (appearance_features, AppearanceFeature),
        (baselines, Baseline),
        (traits, Trait),
        (encounter_blobs, EncounterBlob),
        (encounters, Encounter),
        (location_map_themes, LocationMapTheme),
        (location_maps, LocationMap),
        (location_map_connections, LocationMapConnection),
    ],
    {
        #[derive(SpacetimeType)]
        struct AssetPack {
            __seca: __1,
            __assets: Vec<__Asset>,

            instantiate_entity_blobs: Vec<EntityBlob>,

            new_player_blob: EntityBlob,
        }
        #[reducer]
        fn push_assets(ctx: &ReducerContext, asset_pack: AssetPack) -> Result<(), String> {
            log::debug!("Loading asset pack from {}.", ctx.sender());

            if ctx.get_new_player_blob().is_some() {
                log::debug!("Assets are already populated. Skipped loading.");
                return Ok(());
            }

            seca!(1);
            for asset in asset_pack.__assets {
                ctx.db.__assets().insert(asset);
            }

            for b in asset_pack.instantiate_entity_blobs {
                ctx.ecs().new().instantiate_blob(b);
            }

            ctx.db.special_entity_blobs().insert(SpecialEntityBlob {
                key: SpecialEntityBlobKey::NewPlayer,
                blob: asset_pack.new_player_blob,
            });

            Ok(())
        }
    }
);

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
