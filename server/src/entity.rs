use crate::{
    action::{actions, ActionType},
    appearance::AppearanceFeatureContext,
    stat_block::{baselines, traits, StatBlock},
};
use ecs::{entity, Ecs, WithEcs};
use spacetimedb::{
    rand::{rngs::StdRng, RngCore, SeedableRng},
    table, Identity, ReducerContext, SpacetimeType, Table, Timestamp,
};

entity!(
    #[struct_attrs]
    #[derive(Debug, Clone)]
    struct StructAttrs;

    type EntityId = u64;

    #[entity(table = entities)]
    pub struct Entity {
        entity_id: EntityId,
    }

    #[blob(table = entity_blobs)]
    pub struct EntityBlob;

    #[component(name in name_components)]
    struct NameComponent {
        #[unique]
        pub name: String,
    }

    #[component(location in location_components)]
    struct LocationComponent {
        #[index(btree)]
        pub location_entity_id: EntityId,
    }

    #[component(path in path_components)]
    struct PathComponent {
        #[index(btree)]
        pub destination_entity_id: EntityId,
    }

    #[component(allegiance in allegiance_components)]
    struct AllegianceComponent {
        #[index(btree)]
        pub allegiance_entity_id: EntityId,
    }

    #[component(baseline in baseline_components)]
    struct BaselineComponent {
        pub baseline_id: u64,
    }

    #[component(traits in traits_components)]
    struct TraitsComponent {
        pub trait_ids: Vec<u64>,
    }

    // TODO Add StatBlock caches for equipment and status effects.
    #[component(
    traits_stat_block_cache in traits_stat_block_cache_components,
  )]
    struct StatBlockCacheComponent {
        pub stat_block: StatBlock,
    }

    // TODO Equipment and Status Effects
    #[component(
    traits_stat_block_dirty_flag in traits_stat_block_dirty_flag_components,
    total_stat_block_dirty_flag in total_stat_block_dirty_flag_components,
  )]
    struct FlagComponent {}

    #[component(attack in attack_components)]
    struct AttackComponent {
        pub attack: i32,
    }

    #[component(hp in hp_components)]
    struct HpComponent {
        pub hp: i32,
        pub mhp: i32,
        pub defense: i32,
        pub accumulated_damage: i32,
        pub accumulated_healing: i32,
    }

    #[component(ep in ep_components)]
    struct EpComponent {
        pub ep: i32,
        pub mep: i32,
    }

    #[component(player_controller in player_controller_components)]
    struct PlayerControllerComponent {
        #[unique]
        pub identity: Identity,
    }

    #[component(target in target_components)]
    struct TargetComponent {
        pub target_entity_id: EntityId,
    }

    #[component(
    action_state in action_state_components,
    queued_action_state in queued_action_state_components,
  )]
    struct ActionStateComponent {
        pub target_entity_id: EntityId,
        pub action_id: u64,
        pub sequence_index: i32,
    }

    #[component(actions in actions_components)]
    struct ActionsComponent {
        pub action_ids: Vec<u64>,
    }

    #[derive(Debug, Clone, SpacetimeType)]
    pub struct ActionHotkey {
        pub action_id: u64,
        pub character_code: u32,
    }

    #[component(action_hotkeys in action_hotkeys_components)]
    struct ActionHotkeysComponent {
        pub action_hotkeys: Vec<ActionHotkey>,
    }

    #[derive(Debug, Clone, SpacetimeType)]
    pub struct ActionOption {
        pub action_id: u64,
        pub target_entity_id: EntityId,
    }

    #[component(action_options in action_options_components)]
    struct ActionOptionsComponent {
        pub action_options: Vec<ActionOption>,
    }

    #[component(entity_prominence in entity_prominence_components)]
    struct EntityProminenceComponent {
        pub prominence: i32,
    }

    #[component(
    entity_deactivation_timer in entity_deactivation_timer_components
  )]
    struct TimerComponent {
        pub timestamp: Timestamp,
    }

    #[component(rng_seed in rng_seed_components)]
    struct RngSeedComponent {
        pub rng_seed: u64,
    }

    #[component(location_map in location_map_components)]
    struct LocationMapComponent {
        pub map_entity_id: EntityId,
    }

    #[derive(Debug, Clone, SpacetimeType)]
    pub enum MapLayout {
        Path,
        Hub,
    }

    #[component(
    realized_map in realized_map_components,
    unrealized_map in unrealized_map_components,
  )]
    struct MapComponent {
        pub map_theme_id: u64,
        pub map_layout: MapLayout,
        pub extra_room_count: u8,
        pub main_room_count: u8,
        pub loop_count: u8,
    }

    #[component(appearance_features in appearance_features_components)]
    struct AppearanceFeaturesComponent {
        pub appearance_feature_ids: Vec<u64>,
    }
);

#[table(name = entity_observations, public)]
#[derive(Debug, Clone)]
pub struct EntityObservations {
    #[index(btree)]
    pub entity_id: u64,
    #[index(btree)]
    pub observable_event_id: u64,
}

pub trait GetRng {
    fn get_rng(&self) -> StdRng;
}

impl<T: __rng_seed__Trait> GetRng for T {
    fn get_rng(&self) -> StdRng {
        StdRng::seed_from_u64(self.rng_seed().rng_seed)
    }
}

pub struct MapGenerationResult {
    pub room_ids: Vec<u64>,
}

pub trait MapGenerator {
    fn generate(&self, ctx: &ReducerContext) -> MapGenerationResult;
}

pub trait EcsExtension<'a> {
    fn new_room(
        self,
        appearance_feature_ids: Vec<u64>,
        location_map_entity_id: u64,
    ) -> EntityHandle<'a>;
    fn new_path(
        self,
        appearance_feature_ids: Vec<u64>,
        location_entity_id: u64,
        destination_entity_id: u64,
    ) -> EntityHandle<'a>;
    fn from_player_identity(self) -> Option<With__player_controller__Component<EntityHandle<'a>>>;
    fn from_name(self, name: &str) -> Option<With__name__Component<EntityHandle<'a>>>;
    fn new_player(self) -> Result<EntityHandle<'a>, String>;
}

impl<'a> EcsExtension<'a> for Ecs<'a> {
    fn new_room(
        self,
        appearance_feature_ids: Vec<u64>,
        location_map_entity_id: u64,
    ) -> EntityHandle<'a> {
        self.new()
            .upsert_new_appearance_features(appearance_feature_ids)
            .upsert_new_location_map(location_map_entity_id)
            .into_handle()
    }
    fn new_path(
        self,
        appearance_feature_ids: Vec<u64>,
        location_entity_id: u64,
        destination_entity_id: u64,
    ) -> EntityHandle<'a> {
        self.new()
            .upsert_new_appearance_features(appearance_feature_ids)
            .upsert_new_location(location_entity_id)
            .upsert_new_path(destination_entity_id)
            .into_handle()
    }
    fn from_player_identity(self) -> Option<With__player_controller__Component<EntityHandle<'a>>> {
        self.db
            .player_controller_components()
            .identity()
            .find(self.sender)
            .map(|p| self.into_player_controller_handle(p))
    }

    fn from_name(self, name: &str) -> Option<With__name__Component<EntityHandle<'a>>> {
        self.db
            .name_components()
            .name()
            .find(name.to_string())
            .map(|n| self.into_name_handle(n))
    }

    fn new_player(self) -> Result<EntityHandle<'a>, String> {
        Ok(self
            .new()
            .upsert_new_player_controller(self.sender)
            .upsert_new_allegiance(
                self.from_name("allegiance1")
                    .ok_or("Cannot find starting allegiance.")?
                    .entity_id(),
            )
            .upsert_new_location(
                self.from_name("room1")
                    .ok_or("Cannot find starting room.")?
                    .entity_id(),
            )
            .into_handle()
            .set_baseline("human")
            .add_trait("admin")
            .add_trait("mobile")
            .add_trait("bopper")
            .set_hotkey("bop", 'b')
            .set_hotkey("boppity_bop", 'v')
            .set_hotkey("quick_move", 'm')
            .set_hotkey("divine_heal", 'h'))
    }
}

impl<'a, T: WithEntityHandle<'a> + __unrealized_map__Trait + __rng_seed__Trait> MapGenerator for T {
    fn generate(&self, ctx: &ReducerContext) -> MapGenerationResult {
        let af_ctx = AppearanceFeatureContext::new(ctx);
        let map = self.unrealized_map();
        let mut rng = self.get_rng();
        let total_room_count = map.extra_room_count + map.main_room_count;
        let room_handles: Vec<EntityHandle> = (0..total_room_count)
            .map(|_| {
                ctx.ecs()
                    .new_room(af_ctx.by_texts(&["room"]), self.entity_id())
            })
            .collect();

        for i in 0..(map.main_room_count as usize - 1) {
            let a = &room_handles[i];
            let b = &room_handles[i + 1];
            ctx.ecs()
                .new_path(af_ctx.by_texts(&["path"]), a.entity_id, b.entity_id);
            ctx.ecs()
                .new_path(af_ctx.by_texts(&["path"]), b.entity_id, a.entity_id);
        }

        for i in (map.main_room_count as u32)..(total_room_count as u32) {
            let a = &room_handles[i as usize];
            let b = &room_handles[(rng.next_u32() % i) as usize];
            ctx.ecs()
                .new_path(af_ctx.by_texts(&["path"]), a.entity_id, b.entity_id);
            ctx.ecs()
                .new_path(af_ctx.by_texts(&["path"]), b.entity_id, a.entity_id);
        }

        MapGenerationResult {
            room_ids: room_handles.iter().map(|h| h.entity_id).collect(),
        }
    }
}

#[derive(Debug, Clone, SpacetimeType)]
pub struct ComponentSet {
    pub entity_id: u64,
    pub hp_component: Option<HpComponent>,
    pub ep_component: Option<EpComponent>,
    pub actions_component: Option<ActionsComponent>,
    pub action_hotkeys_component: Option<ActionHotkeysComponent>,
    pub allegiance_component: Option<AllegianceComponent>,
    pub player_controller_component: Option<PlayerControllerComponent>,
    pub baseline_component: Option<BaselineComponent>,
    pub traits_component: Option<TraitsComponent>,
}

#[table(name = named_inactive_entities)]
#[derive(Debug, Clone)]
pub struct NamedInactiveEntity {
    #[primary_key]
    pub prefab_name: String,
    pub component_set: ComponentSet,
}

#[table(name = identity_inactive_entities)]
#[derive(Debug, Clone)]
pub struct IdentityInactiveEntity {
    #[unique]
    pub identity: Identity,
    pub component_set: ComponentSet,
}

pub struct InactiveEntityHandle<'a> {
    pub ctx: &'a ReducerContext,
    pub component_set: ComponentSet,
}

impl<'a> InactiveEntityHandle<'a> {
    pub fn from_player_identity(ctx: &'a ReducerContext) -> Option<Self> {
        let result = ctx
            .db
            .identity_inactive_entities()
            .identity()
            .find(ctx.sender)
            .map(|i| Self {
                ctx,
                component_set: i.component_set,
            });
        ctx.db
            .identity_inactive_entities()
            .identity()
            .delete(ctx.sender);
        result
    }

    pub fn activate(self) -> EntityHandle<'a> {
        let id = self.component_set.entity_id;
        self.activate_with_id(id)
    }

    pub fn activate_with_id(self, id: u64) -> EntityHandle<'a> {
        let e = EntityHandle::insert_id(self.ctx, id);
        if let Some(mut c) = self.component_set.actions_component {
            c.entity_id = e.entity_id;
            self.ctx.db.actions_components().insert(c);
        }
        if let Some(mut c) = self.component_set.action_hotkeys_component {
            c.entity_id = e.entity_id;
            self.ctx.db.action_hotkeys_components().insert(c);
        }
        if let Some(mut c) = self.component_set.allegiance_component {
            c.entity_id = e.entity_id;
            self.ctx.db.allegiance_components().insert(c);
        }
        if let Some(mut c) = self.component_set.ep_component {
            c.entity_id = e.entity_id;
            self.ctx.db.ep_components().insert(c);
        }
        if let Some(mut c) = self.component_set.hp_component {
            c.entity_id = e.entity_id;
            self.ctx.db.hp_components().insert(c);
        }
        if let Some(mut c) = self.component_set.player_controller_component {
            c.entity_id = e.entity_id;
            self.ctx.db.player_controller_components().insert(c);
        }
        if let Some(mut c) = self.component_set.baseline_component {
            c.entity_id = e.entity_id;
            self.ctx.db.baseline_components().insert(c);
            self.ctx
                .db
                .total_stat_block_dirty_flag_components()
                .insert(FlagComponent {
                    entity_id: e.entity_id,
                });
        }
        if let Some(mut c) = self.component_set.traits_component {
            c.entity_id = e.entity_id;
            self.ctx.db.traits_components().insert(c);
            self.ctx
                .db
                .traits_stat_block_dirty_flag_components()
                .insert(FlagComponent {
                    entity_id: e.entity_id,
                });
        }
        e
    }
}

impl<'a> EntityHandle<'a> {
    pub fn insert_id(ctx: &'a ReducerContext, id: u64) -> Self {
        let entity = ctx.db.entities().insert(Entity { id });
        Self {
            entity_id: entity.id,
            ecs: ctx.ecs(),
        }
    }

    pub fn generate_prominence(self) -> Self {
        let mut prominence = 0;
        if self.path().is_some() {
            prominence |= 1 << 8;
        }
        // TODO Add other controller types.
        if self.player_controller().is_some() {
            prominence |= 1 << 7;
        }
        if self.hp().is_some() {
            prominence |= 1 << 6;
        }

        self.insert_new_entity_prominence(prominence);
        self
    }

    pub fn set_name(self, name: &str) -> Self {
        self.upsert_new_name(name.to_string()).into_handle()
    }

    pub fn set_target(self, target_entity_id: u64) -> Self {
        self.upsert_new_target(target_entity_id).into_handle()
    }

    pub fn set_allegiance(self, allegiance_entity_id: u64) -> Self {
        self.upsert_new_allegiance(allegiance_entity_id)
            .into_handle()
    }

    pub fn allegiance_id(&self) -> Option<u64> {
        self.allegiance().map(|a| a.allegiance_entity_id)
    }

    pub fn is_ally(&self, other_entity_id: u64) -> bool {
        if self.entity_id == other_entity_id {
            return true;
        }

        if let (Some(a), Some(o)) = (
            self.allegiance_id(),
            self.ecs.find(other_entity_id).allegiance_id(),
        ) {
            a == o
        } else {
            false
        }
    }

    pub fn set_actions(self, action_ids: Vec<u64>) -> Self {
        if let Some(mut c) = self.actions() {
            c.action_ids = action_ids;
            self.update_actions(c);
        } else {
            self.insert_new_actions(action_ids);
        }
        self
    }

    pub fn set_baseline(self, name: &str) -> Self {
        if let Some(b) = self.ecs.db.baselines().name().find(name.to_string()) {
            self.upsert_new_baseline(b.id)
                .upsert_new_total_stat_block_dirty_flag()
                .into_handle()
        } else {
            self
        }
    }

    pub fn add_trait(self, name: &str) -> Self {
        if let Some(t) = self.ecs.db.traits().name().find(name.to_string()) {
            if let Some(mut c) = self.traits() {
                c.trait_ids.push(t.id);
                self.update_traits(c);
            } else {
                self.insert_traits(TraitsComponent {
                    entity_id: self.entity_id,
                    trait_ids: vec![t.id],
                });
            }

            self.upsert_new_traits_stat_block_dirty_flag().into_handle()
        } else {
            self
        }
    }

    pub fn set_appearance_feature_ids(self, appearance_feature_ids: Vec<u64>) -> Self {
        self.upsert_new_appearance_features(appearance_feature_ids)
            .into_handle()
    }

    pub fn apply_stat_block(self, stat_block: StatBlock) -> Self {
        self.delete_total_stat_block_dirty_flag();

        let mut action_ids = stat_block.additive_action_ids.clone();
        action_ids.retain(|id| !stat_block.subtractive_action_ids.contains(id));
        self.set_attack(stat_block.attack)
            .set_mhp(stat_block.mhp)
            .set_mep(stat_block.mep)
            .set_defense(stat_block.defense)
            .set_actions(action_ids)
            .set_appearance_feature_ids(stat_block.appearance_feature_ids)
    }

    pub fn set_traits_stat_block_cache(self, stat_block: StatBlock) -> Self {
        self.delete_traits_stat_block_dirty_flag();
        self.upsert_new_traits_stat_block_cache(stat_block)
            .into_handle()
    }

    pub fn set_attack(self, attack: i32) -> Self {
        self.upsert_new_attack(attack).into_handle()
    }

    pub fn set_mhp(self, mhp: i32) -> Self {
        if let Some(mut hp) = self.hp() {
            hp.mhp = mhp;
            self.update_hp(hp);
        } else {
            self.insert_new_hp(mhp, mhp, 0, 0, 0);
        }
        self
    }

    pub fn set_defense(self, defense: i32) -> Self {
        if let Some(mut hp_component) = self.hp() {
            hp_component.defense = defense;
            self.update_hp(hp_component);
        } else {
            self.insert_new_hp(0, 0, defense, 0, 0);
        }
        self
    }

    pub fn set_mep(self, mep: i32) -> Self {
        if let Some(mut ep_component) = self.ep() {
            ep_component.mep = mep;
            self.update_ep(ep_component);
        } else {
            self.insert_new_ep(mep, mep);
        }
        self
    }

    pub fn add_action_option(self, action_id: u64, target_entity_id: u64) -> Self {
        if let Some(mut a) = self.action_options() {
            a.action_options.push(ActionOption {
                action_id,
                target_entity_id,
            });
            self.update_action_options(a);
        } else {
            self.insert_action_options(ActionOptionsComponent {
                entity_id: self.entity_id,
                action_options: vec![ActionOption {
                    action_id,
                    target_entity_id,
                }],
            });
        }
        self
    }

    pub fn set_queued_action_state(self, action_id: u64, target_entity_id: u64) -> Self {
        self.delete_queued_action_state();
        self.insert_queued_action_state(ActionStateComponent {
            action_id,
            entity_id: self.entity_id,
            sequence_index: 0,
            target_entity_id,
        });
        self
    }

    pub fn shift_queued_action_state(self) -> Self {
        if let Some(queued_action_state) = self.queued_action_state() {
            self.delete_queued_action_state();
            self.insert_action_state(queued_action_state);
        }
        self
    }

    pub fn set_hotkey(self, name: &str, character: char) -> Self {
        let action_id = if let Some(action) = self.ecs.db.actions().name().find(name.to_string()) {
            action.id
        } else {
            return self;
        };
        let character_code = character as u32;
        if let Some(mut a) = self.action_hotkeys() {
            a.action_hotkeys
                .retain(|h| h.action_id != action_id && h.character_code != character_code);
            a.action_hotkeys.push(ActionHotkey {
                action_id,
                character_code,
            });
            self.update_action_hotkeys(a);
        } else {
            self.insert_new_action_hotkeys(vec![ActionHotkey {
                action_id,
                character_code,
            }]);
        }
        self
    }

    pub fn can_target_other(&self, other_entity_id: u64, action_id: u64) -> bool {
        if let Some(a) = self.ecs.db.actions().id().find(action_id) {
            let o = self.ecs.find(other_entity_id);
            match a.action_type {
                ActionType::Attack => o.hp().is_some() && !self.is_ally(other_entity_id),
                ActionType::Buff => o.hp().is_some() && self.is_ally(other_entity_id),
                ActionType::Equip => true,     // WIP
                ActionType::Inventory => true, // WIP
                ActionType::Move => o.path().is_some(),
            }
        } else {
            false
        }
    }
}
