use crate::{
    action::{actions, ActionId, ActionType},
    asset::ReducerContextExtension,
    stat_block::{baselines, traits, StatBlock},
};
use ecs::{entity, Ecs, WithEcs};
use spacetimedb::{
    rand::{rngs::StdRng, RngCore, SeedableRng},
    table, Identity, ReducerContext, SpacetimeType, Timestamp,
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
        pub baseline_id: u32,
    }

    #[component(traits in traits_components)]
    struct TraitsComponent {
        pub trait_ids: Vec<u32>,
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

    #[component(
      action_state in action_state_components,
      queued_action_state in queued_action_state_components,
    )]
    struct ActionStateComponent {
        pub target_entity_id: EntityId,
        pub action_id: ActionId,
        pub sequence_index: i32,
    }

    #[component(actions in actions_components)]
    struct ActionsComponent {
        pub action_ids: Vec<ActionId>,
    }

    #[derive(Debug, Clone, SpacetimeType)]
    pub struct ActionHotkey {
        pub action_id: ActionId,
        pub character_code: u32,
    }

    #[component(action_hotkeys in action_hotkeys_components)]
    struct ActionHotkeysComponent {
        pub action_hotkeys: Vec<ActionHotkey>,
    }

    #[component(entity_prominence in entity_prominence_components)]
    struct EntityProminenceComponent {
        pub prominence: i32,
    }

    #[component(
      entity_deletion_timer in entity_deletion_timer_components,
      player_deactivation_timer in player_deactivation_timer_components,
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
        pub appearance_feature_indexes: Vec<u32>,
    }
);

pub trait GetRng {
    fn get_rng(&self) -> StdRng;
}

impl<T: rng_seed_component::Some> GetRng for T {
    fn get_rng(&self) -> StdRng {
        StdRng::seed_from_u64(self.rng_seed().rng_seed)
    }
}

#[allow(dead_code)]
pub struct MapGenerationResult {
    pub room_ids: Vec<u64>,
}

#[allow(dead_code)]
pub trait MapGenerator {
    fn generate(&self, ctx: &ReducerContext) -> MapGenerationResult;
}

pub trait EcsExtension<'a> {
    fn new_room(
        self,
        appearance_feature_indexes: Vec<u32>,
        location_map_entity_id: u64,
    ) -> EntityHandle<'a>;
    fn new_path(
        self,
        appearance_feature_indexes: Vec<u32>,
        location_entity_id: u64,
        destination_entity_id: u64,
    ) -> EntityHandle<'a>;
    fn from_player_identity(
        self,
        identity: Identity,
    ) -> Option<player_controller_component::WithComponent<EntityHandle<'a>>>;
    fn from_name(self, name: &str) -> Option<name_component::WithComponent<EntityHandle<'a>>>;
    fn new_player(
        self,
        identity: Identity,
    ) -> Result<player_controller_component::WithComponent<EntityHandle<'a>>, String>;
}

impl<'a> EcsExtension<'a> for Ecs<'a> {
    fn new_room(
        self,
        appearance_feature_indexes: Vec<u32>,
        location_map_entity_id: u64,
    ) -> EntityHandle<'a> {
        self.new()
            .upsert_new_appearance_features(appearance_feature_indexes)
            .upsert_new_location_map(location_map_entity_id)
            .into_handle()
    }
    fn new_path(
        self,
        appearance_feature_indexes: Vec<u32>,
        location_entity_id: u64,
        destination_entity_id: u64,
    ) -> EntityHandle<'a> {
        self.new()
            .upsert_new_appearance_features(appearance_feature_indexes)
            .upsert_new_location(location_entity_id)
            .upsert_new_path(destination_entity_id)
            .into_handle()
    }
    fn from_player_identity(
        self,
        identity: Identity,
    ) -> Option<player_controller_component::WithComponent<EntityHandle<'a>>> {
        self.db
            .player_controller_components()
            .identity()
            .find(identity)
            .map(|p| self.into_player_controller_handle(p))
    }

    fn from_name(self, name: &str) -> Option<name_component::WithComponent<EntityHandle<'a>>> {
        self.db
            .name_components()
            .name()
            .find(name.to_string())
            .map(|n| self.into_name_handle(n))
    }

    fn new_player(
        self,
        identity: Identity,
    ) -> Result<player_controller_component::WithComponent<EntityHandle<'a>>, String> {
        // WIP Get new player entity blob from its table.
        // Add the player controller to it.
        // Design how to handle references to other entities (like allegiances, rooms, etc) in entity blobs.
        // Reference concept: For special entities, the relationships would be hardcoded. Other relationships can simply use IDs of real entities.
        // Consider adding a SpecialEntityComponent type which simply points sepcific enum variants to specific entity IDs.
        let e = self.new();
        e.instantiate_blob(
            self.get_new_player_blob()
                .ok_or("Failed to obtain the new player entity blob.")?,
        );
        Ok(e.upsert_new_allegiance(
            // WIP NewPlayerAllegiance SpecialEntityComponent?
            self.from_name("allegiance1")
                .ok_or("Cannot find starting allegiance.")?
                .entity_id(),
        )
        .upsert_new_location(
            // WIP Must generate new entity to hold new player starting room and map.
            // Player should not be immediately dropped into a shared instance.
            self.from_name("room1")
                .ok_or("Cannot find starting room.")?
                .entity_id(),
        )
        // WIP Remove all these, since it is built into the asset.
        .set_baseline("human")
        .add_trait("admin")
        .add_trait("mobile")
        .add_trait("bopper")
        .set_hotkey("bop", 'b')
        .set_hotkey("boppity_bop", 'v')
        .set_hotkey("quick_move", 'm')
        .set_hotkey("divine_heal", 'h')
        .into_handle()
        .upsert_new_player_controller(identity))
    }
}

impl<'a, T: WithEntityHandle<'a> + unrealized_map_component::Some + rng_seed_component::Some>
    MapGenerator for T
{
    fn generate(&self, ctx: &ReducerContext) -> MapGenerationResult {
        let map = self.unrealized_map();
        let mut rng = self.get_rng();
        let total_room_count = map.extra_room_count + map.main_room_count;
        let room_handles: Vec<EntityHandle> = (0..total_room_count)
            .map(|_| {
                ctx.ecs() // WIP Use entity blobs to initialize rooms and paths.
                    .new_room(vec![], self.entity_id())
            })
            .collect();

        for i in 0..(map.main_room_count as usize - 1) {
            let a = &room_handles[i];
            let b = &room_handles[i + 1];
            ctx.ecs().new_path(vec![], a.entity_id, b.entity_id);
            ctx.ecs().new_path(vec![], b.entity_id, a.entity_id);
        }

        for i in (map.main_room_count as u32)..(total_room_count as u32) {
            let a = &room_handles[i as usize];
            let b = &room_handles[(rng.next_u32() % i) as usize];
            ctx.ecs().new_path(vec![], a.entity_id, b.entity_id);
            ctx.ecs().new_path(vec![], b.entity_id, a.entity_id);
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

#[table(accessor = named_inactive_entities)]
#[derive(Debug, Clone)]
pub struct NamedInactiveEntity {
    #[primary_key]
    pub prefab_name: String,
    pub component_set: ComponentSet,
}

#[table(accessor = identity_inactive_entities)]
#[derive(Debug, Clone)]
pub struct IdentityInactiveEntity {
    #[unique]
    pub identity: Identity,
    pub component_set: ComponentSet,
}

pub trait EntityHandleExtension {
    fn apply_stat_block(self, stat_block: StatBlock) -> Self;
    fn set_mhp(self, mhp: i32) -> Self;
    fn set_defense(self, defense: i32) -> Self;
    fn set_mep(self, mep: i32) -> Self;
    fn set_actions(self, action_ids: Vec<ActionId>) -> Self;
    fn set_baseline(self, name: &str) -> Self;
    fn add_trait(self, name: &str) -> Self;
    fn set_appearance_feature_ids(self, appearance_feature_ids: Vec<u32>) -> Self;
    fn generate_prominence(self) -> Self;
    fn allegiance_id(&self) -> Option<u64>;
    fn is_ally(&self, other_entity_id: u64) -> bool;
    fn set_queued_action_state(self, action_id: ActionId, target_entity_id: u64) -> Self;
    fn shift_queued_action_state(self) -> Self;
    fn set_hotkey(self, name: &str, character: char) -> Self;
    fn can_target_other(&self, other_entity_id: u64, action_id: ActionId) -> bool;
}

impl<'a, T: WithEntityHandle<'a>> EntityHandleExtension for T {
    fn apply_stat_block(self, stat_block: StatBlock) -> Self {
        self.to_handle()
            .clone()
            .upsert_new_attack(stat_block.attack)
            .set_mhp(stat_block.mhp)
            .set_mep(stat_block.mep)
            .set_defense(stat_block.defense)
            .set_actions(stat_block.action_ids)
            .set_appearance_feature_ids(stat_block.appearance_feature_ids);
        self
    }

    fn set_mhp(self, mhp: i32) -> Self {
        let e = self.to_handle();
        if let Some(mut hp) = e.hp() {
            hp.mhp = mhp;
            e.update_hp(hp);
        } else {
            e.insert_new_hp(mhp, mhp, 0, 0, 0);
        }
        self
    }

    fn set_defense(self, defense: i32) -> Self {
        let e = self.to_handle();
        if let Some(mut hp_component) = e.hp() {
            hp_component.defense = defense;
            e.update_hp(hp_component);
        } else {
            e.insert_new_hp(0, 0, defense, 0, 0);
        }
        self
    }

    fn set_mep(self, mep: i32) -> Self {
        let e = self.to_handle();
        if let Some(mut ep_component) = e.ep() {
            ep_component.mep = mep;
            e.update_ep(ep_component);
        } else {
            e.insert_new_ep(mep, mep);
        }
        self
    }

    fn set_actions(self, action_ids: Vec<ActionId>) -> Self {
        let e = self.to_handle();
        if let Some(mut c) = e.actions() {
            c.action_ids = action_ids;
            e.update_actions(c);
        } else {
            e.insert_new_actions(action_ids);
        }
        self
    }

    fn set_baseline(self, name: &str) -> Self {
        let e = self.to_handle();
        if let Some(b) = e.ecs.db.baselines().name().find(name.to_string()) {
            e.clone()
                .upsert_new_baseline(b.id)
                .upsert_new_total_stat_block_dirty_flag();
        }
        self
    }

    fn add_trait(self, name: &str) -> Self {
        let e = self.to_handle();
        if let Some(t) = e.ecs.db.traits().name().find(name.to_string()) {
            if let Some(mut c) = e.traits() {
                c.trait_ids.push(t.id);
                e.update_traits(c);
            } else {
                e.insert_traits(TraitsComponent {
                    entity_id: e.entity_id,
                    trait_ids: vec![t.id],
                });
            }

            e.clone().upsert_new_traits_stat_block_dirty_flag();
        }
        self
    }

    fn set_appearance_feature_ids(self, appearance_feature_ids: Vec<u32>) -> Self {
        self.to_handle()
            .clone()
            .upsert_new_appearance_features(appearance_feature_ids);
        self
    }

    fn generate_prominence(self) -> Self {
        let e = self.to_handle();
        let mut prominence = 0;
        if e.path().is_some() {
            prominence |= 1 << 8;
        }
        // TODO Add other controller types.
        if e.player_controller().is_some() {
            prominence |= 1 << 7;
        }
        if e.hp().is_some() {
            prominence |= 1 << 6;
        }
        e.insert_new_entity_prominence(prominence);
        self
    }

    fn allegiance_id(&self) -> Option<u64> {
        self.to_handle()
            .allegiance()
            .map(|a| a.allegiance_entity_id)
    }

    fn is_ally(&self, other_entity_id: u64) -> bool {
        let e = self.to_handle();
        if e.entity_id == other_entity_id {
            return true;
        }
        if let (Some(a), Some(o)) = (
            e.allegiance_id(),
            e.ecs.find(other_entity_id).allegiance_id(),
        ) {
            a == o
        } else {
            false
        }
    }

    fn set_queued_action_state(self, action_id: ActionId, target_entity_id: u64) -> Self {
        let e = self.to_handle();
        e.delete_queued_action_state();
        e.insert_queued_action_state(ActionStateComponent {
            action_id,
            entity_id: e.entity_id,
            sequence_index: 0,
            target_entity_id,
        });
        self
    }

    fn shift_queued_action_state(self) -> Self {
        let e = self.to_handle();
        if let Some(queued_action_state) = e.queued_action_state() {
            e.delete_queued_action_state();
            e.insert_action_state(queued_action_state);
        }
        self
    }

    fn set_hotkey(self, name: &str, character: char) -> Self {
        let e = self.to_handle();
        let action_id = if let Some(action) = e.ecs.db.actions().name().find(name.to_string()) {
            action.id
        } else {
            return self;
        };
        let character_code = character as u32;
        if let Some(mut a) = e.action_hotkeys() {
            a.action_hotkeys
                .retain(|h| h.action_id != action_id && h.character_code != character_code);
            a.action_hotkeys.push(ActionHotkey {
                action_id,
                character_code,
            });
            e.update_action_hotkeys(a);
        } else {
            e.insert_new_action_hotkeys(vec![ActionHotkey {
                action_id,
                character_code,
            }]);
        }
        self
    }

    fn can_target_other(&self, other_entity_id: u64, action_id: ActionId) -> bool {
        let e = self.to_handle();
        if let Some(a) = e.ecs.db.actions().id().find(action_id) {
            let o = e.ecs.find(other_entity_id);
            // TODO Add same-location check as a separate function, which is also used to validate individual effects before they're resolved.
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
