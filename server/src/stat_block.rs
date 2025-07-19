use std::ops::AddAssign;

use derive_builder::Builder;
use spacetimedb::{table, ReducerContext, SpacetimeType, Table};

#[derive(Debug, Clone, SpacetimeType, Builder, Default)]
#[builder(default)]
pub struct StatBlock {
    pub attack: i32,
    pub mhp: i32,
    pub defense: i32,
    pub mep: i32,
    pub action_ids: Vec<u64>,
    pub appearance_feature_ids: Vec<u64>,
}

impl AddAssign<&Self> for StatBlock {
    fn add_assign(&mut self, other: &Self) {
        self.attack += other.attack;
        self.mhp += other.mhp;
        self.defense += other.defense;
        self.mep += other.mep;
        if other.action_ids.len() > 0 {
            self.action_ids.extend(&other.action_ids);
        }
        if other.appearance_feature_ids.len() > 0 {
            self.appearance_feature_ids
                .extend(&other.appearance_feature_ids);
        }
    }
}

#[table(name = baselines, public)]
#[derive(Debug, Clone)]
pub struct Baseline {
    #[primary_key]
    #[auto_inc]
    pub id: u64,
    #[unique]
    pub name: String,
    pub stat_block: StatBlock,
}

#[table(name = traits, public)]
#[derive(Debug, Clone)]
pub struct Trait {
    #[primary_key]
    #[auto_inc]
    pub id: u64,
    #[unique]
    pub name: String,
    pub stat_block: StatBlock,
}

pub struct StatBlockContext<'a> {
    ctx: &'a ReducerContext,
}

impl<'a> StatBlockContext<'a> {
    pub fn new(ctx: &'a ReducerContext) -> Self {
        Self { ctx }
    }

    pub fn insert_baseline(self, name: &str, stat_block_builder: &StatBlockBuilder) -> Self {
        self.ctx.db.baselines().insert(Baseline {
            id: 0,
            name: name.to_string(),
            stat_block: stat_block_builder.build().unwrap(), // TODO Return Result instead.
        });
        self
    }

    pub fn insert_trait(self, name: &str, stat_block_builder: &StatBlockBuilder) -> Self {
        self.ctx.db.traits().insert(Trait {
            id: 0,
            name: name.to_string(),
            stat_block: stat_block_builder.build().unwrap(), // TODO Return Result instead.
        });
        self
    }
}
