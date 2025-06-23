use ecs::entity;
// use spacetimedb::rand::RngCore;
use spacetimedb::table;
use spacetimedb::Identity;
use spacetimedb::ReducerContext;
use spacetimedb::SpacetimeType;
use spacetimedb::Timestamp;

// use crate::appearance::AppearanceFeatureContext;
use crate::stat_block::StatBlock;

type EntityId = u64;

#[derive(Debug, Clone, SpacetimeType)]
pub struct ActionHotkey {
    pub action_id: u64,
    pub character_code: u32,
}

#[derive(Debug, Clone, SpacetimeType)]
pub struct ActionOption {
    pub action_id: u64,
    pub target_entity_id: EntityId,
}

#[derive(Debug, Clone, SpacetimeType)]
pub enum MapLayout {
    Path,
    Hub,
}

entity! {
  #[derive(Debug, Clone)]
  struct_attrs

  entity Entity entity_id: EntityId tables(entities);

  component NameComponent [(name, name_components)] {
    #[unique]
    pub name: String,
  }

  component LocationComponent [(location, location_components)] {
    #[index(btree)]
    pub location_entity_id: EntityId,
  }

  component PathComponent [(path, path_components)] {
    #[index(btree)]
    pub destination_entity_id: EntityId,
  }

  component AllegianceComponent [(allegiance, allegiance_components)] {
    #[index(btree)]
    pub allegiance_entity_id: EntityId,
  }

  component BaselineComponent [(baseline, baseline_components)] {
    pub baseline_id: u64,
  }

  component TraitsComponent [(traits, traits_components)] {
    pub trait_ids: Vec<u64>,
  }

  // TODO Add StatBlock caches for equipment and status effects.
  component StatBlockCacheComponent [
    (traits_stat_block_cache, traits_stat_block_cache_components)
  ] {
    pub stat_block: StatBlock,
  }

  // TODO Equipment and Status Effects
  component FlagComponent [
    (traits_stat_block_dirty_flag, traits_stat_block_dirty_flag_components),
    (total_stat_block_dirty_flag, total_stat_block_dirty_flag_components),
  ] {}

  component AttackComponent [(attack, attack_components)] {
    pub attack: i32,
  }

  component HpComponent [(hp, hp_components)] {
    pub hp: i32,
    pub mhp: i32,
    pub defense: i32,
    pub accumulated_damage: i32,
    pub accumulated_healing: i32,
  }

  component EpComponent [(ep, ep_components)] {
    pub ep: i32,
    pub mep: i32,
  }

  component PlayerControllerComponent [(player_controller, player_controller_components)] {
    #[unique]
    pub identity: Identity,
  }

  component TargetComponent [(target, target_components)] {
    pub target_entity_id: EntityId,
  }

  component ActionStateComponent [
    (action_state, action_state_components),
    (queued_action_state, queued_action_state_components),
  ] {
    pub target_entity_id: EntityId,
    pub action_id: u64,
    pub sequence_index: i32,
  }

  component ActionsComponent [(actions, actions_components)] {
    pub action_ids: Vec<u64>,
  }

  component ActionHotkeysComponent [(action_hotkeys, action_hotkeys_components)] {
    pub action_hotkeys: Vec<ActionHotkey>,
  }

  component ActionOptionsComponent [(action_options, action_options_components)] {
    pub action_options: Vec<ActionOption>,
  }

  component EntityProminenceComponent [(entity_prominence, entity_prominence_components)] {
    pub prominence: i32,
  }

  component TimerComponent [(entity_deactivation_timer, entity_deactivation_timer_components)] {
    pub timestamp: Timestamp,
  }

  component RngSeedComponent [(rng_seed, rng_seed_components)] {
    pub rng_seed: u64,
  }

  component LocationMapComponent [(location_map, location_map_components)] {
    pub map_entity_id: EntityId,
  }

  component MapComponent [
    (realized_map, realized_map_components),
    (unrealized_map, unrealized_map_components),
  ] {
    pub map_theme_id: u64,
    pub map_layout: MapLayout,
    pub extra_room_count: u8,
    pub main_room_count: u8,
    pub loop_count: u8,
  }

  component AppearanceFeaturesComponent [(appearance_features, appearance_features_components)] {
    pub appearance_feature_ids: Vec<u64>,
  }
}

#[table(name = observer_components, public)]
#[derive(Debug, Clone)]
pub struct ObserverComponent {
    #[index(btree)]
    pub entity_id: u64,
    #[index(btree)]
    pub observable_event_id: u64,
}

pub struct MapGenerationResult {
    pub room_ids: Vec<u64>,
}

// impl<'a> EntityHandle<'a> {
//     pub fn new(ctx: &'a ReducerContext) -> Self {
//         Self {
//             entity_id: 0,
//             hidden: ecs::EntityHandleHidden { ctx },
//         }
//     }
// }

impl MapComponent {
    pub fn generate(&self, _ctx: &ReducerContext) -> MapGenerationResult {
        // let af_ctx = AppearanceFeatureContext::new(ctx);
        // let e = self.into_realized_map_handle(ctx);
        // let mut rng = ctx.rng(); // WIP e.get_rng();
        // let total_room_count = self.extra_room_count + self.main_room_count;
        // let room_handles: Vec<EntityHandle> = (0..total_room_count)
        //     .map(|_| {
        //         EntityHandle::new(ctx)
        //             .set_appearance_feature_ids(af_ctx.by_texts(&["room"]))
        //             .set_location_map(self.entity_id)
        //     })
        //     .collect();

        // for i in 0..(self.main_room_count as usize - 1) {
        //     let a = &room_handles[i];
        //     let b = &room_handles[i + 1];
        //     EntityHandle::new(ctx)
        //         .set_appearance_feature_ids(af_ctx.by_texts(&["path"]))
        //         .add_location(a.entity_id)
        //         .add_path(b.entity_id);
        //     EntityHandle::new(ctx)
        //         .set_appearance_feature_ids(af_ctx.by_texts(&["path"]))
        //         .add_location(b.entity_id)
        //         .add_path(a.entity_id);
        // }

        // for i in (self.main_room_count as u32)..(total_room_count as u32) {
        //     let a = &room_handles[i as usize];
        //     let b = &room_handles[(rng.next_u32() % i) as usize];
        //     EntityHandle::new(ctx)
        //         .set_appearance_feature_ids(af_ctx.by_texts(&["path"]))
        //         .add_location(a.entity_id)
        //         .add_path(b.entity_id);
        //     EntityHandle::new(ctx)
        //         .set_appearance_feature_ids(af_ctx.by_texts(&["path"]))
        //         .add_location(b.entity_id)
        //         .add_path(a.entity_id);
        // }

        // MapGenerationResult {
        //     room_ids: room_handles.iter().map(|h| h.entity_id).collect(),
        // }
        MapGenerationResult { room_ids: vec![] }
    }
}
