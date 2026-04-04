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
        use spacetimedb::SpacetimeType;

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
                    for v in &other.__stat {
                        if !self.__stat.contains(v) {
                            self.__stat.push(*v);
                        }
                    }
                }
            }
        }
    }
);
