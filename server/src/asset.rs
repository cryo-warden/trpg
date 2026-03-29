use ecs::WithEcs;
use spacetimedb::{reducer, table, ReducerContext, SpacetimeType, Table};

use crate::{
    action::{action_steps, actions, Action, ActionStep},
    appearance::{appearance_features, AppearanceFeature},
    entity::{EntityBlob, InstantiateEntityBlob, NewEntityHandle},
    stat_block::{baselines, traits, Baseline, Trait},
};

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
struct AssetPack {
    new_player_blob: EntityBlob,
    baselines: Vec<Baseline>,
    traits: Vec<Trait>,
    actions: Vec<Action>,
    action_steps: Vec<ActionStep>,
    appearance_features: Vec<AppearanceFeature>,
    instantiate_entity_blobs: Vec<EntityBlob>,
}

#[reducer]
fn push_assets(ctx: &ReducerContext, asset_pack: AssetPack) -> Result<(), String> {
    log::debug!("Loading asset pack from {}.", ctx.sender());

    if ctx.get_new_player_blob().is_some() {
        log::debug!("Assets are already populated. Skipped loading.");
        return Ok(());
    }

    ctx.db.special_entity_blobs().insert(SpecialEntityBlob {
        key: SpecialEntityBlobKey::NewPlayer,
        blob: asset_pack.new_player_blob,
    });
    for b in asset_pack.baselines {
        ctx.db.baselines().insert(b);
    }
    for t in asset_pack.traits {
        ctx.db.traits().insert(t);
    }
    for a in asset_pack.actions {
        ctx.db.actions().insert(a);
    }
    for a in asset_pack.action_steps {
        ctx.db.action_steps().insert(a);
    }
    for a in asset_pack.appearance_features {
        ctx.db.appearance_features().insert(a);
    }
    for b in asset_pack.instantiate_entity_blobs {
        ctx.ecs().new().instantiate_blob(b);
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
