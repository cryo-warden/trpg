secador::secador_multi!(
    seca_int!(stat, [attack, mhp, defense, mep]),
    seca_id_vec!(
        (stat, StatType),
        [(action_ids, ActionId), (appearance_feature_ids, u32)]
    ),
    {
        use std::ops::AddAssign;

        use crate::action::ActionId;
        use derive_builder::Builder;
        use spacetimedb::{table, SpacetimeType};

        #[derive(Debug, Clone, SpacetimeType, Builder, Default)]
        #[builder(default)]
        pub struct StatBlock {
            __seca_int: __1,
            pub __stat: i32,
            __seca_id_vec: __1,
            pub __stat: Vec<__StatType>,
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

        #[table(accessor = baselines, public)]
        #[derive(Debug, Clone)]
        pub struct Baseline {
            #[primary_key]
            pub id: u32,
            #[unique]
            pub name: String,
            pub stat_block: StatBlock,
        }

        #[table(accessor = traits, public)]
        #[derive(Debug, Clone)]
        pub struct Trait {
            #[primary_key]
            pub id: u32,
            #[unique]
            pub name: String,
            pub stat_block: StatBlock,
        }
    }
);
