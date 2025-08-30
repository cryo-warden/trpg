secador::secador_multi!(
    seca_int!((stat), [(attack), (mhp), (defense), (mep)]),
    seca_id_vec!((stat), [(action_ids), (appearance_feature_ids)]),
    {
        use std::ops::AddAssign;

        use derive_builder::Builder;
        use spacetimedb::{table, ReducerContext, SpacetimeType, Table};

        #[derive(Debug, Clone, SpacetimeType, Builder, Default)]
        #[builder(default)]
        pub struct StatBlock {
            __seca_int: __1,
            pub __stat: i32,
            __seca_id_vec: __1,
            pub __stat: Vec<u64>,
        }

        impl AddAssign<&Self> for StatBlock {
            fn add_assign(&mut self, other: &Self) {
                seca_int!(1);
                self.__stat += other.__stat;
                seca_id_vec!(1);
                if other.__stat.len() > 0 {
                    self.__stat.extend(&other.__stat);
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

            pub fn insert_baseline(
                self,
                name: &str,
                stat_block_builder: &StatBlockBuilder,
            ) -> Self {
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
    }
);
