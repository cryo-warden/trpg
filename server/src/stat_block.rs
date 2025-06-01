use derive_builder::Builder;
use spacetimedb::{table, ReducerContext, SpacetimeType, Table};

#[derive(Debug, Clone, SpacetimeType, Builder, Default)]
#[builder(default)]
pub struct StatBlock {
    pub mhp: i32,
    pub defense: i32,
    pub mep: i32,
}

#[allow(dead_code)]
impl StatBlock {
    pub fn add(&mut self, other: StatBlock) {
        self.mhp += other.mhp;
        self.defense += other.defense;
        self.mep += other.mep;
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
