// Stats are deliberately narrow: play-relevant values live in roughly the
// -20..20 realm, so i8 covers them; only the HP/EP pools merit i16. Merging
// saturates instead of wrapping so extreme stacking clamps at the type's
// bounds rather than corrupting the total.
secador::secador_multi!(
    seca_small_int!(stat, [attack, defense]),
    seca_wide_int!(stat, [mhp, mep]),
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
            __seca_small_int: __1,
            pub __stat: i8,
            __seca_wide_int: __1,
            pub __stat: i16,
            __seca_id_vec: __1,
            pub __stat: Vec<__StatType>,
        }

        impl AddAssign<&Self> for StatBlock {
            fn add_assign(&mut self, other: &Self) {
                seca_small_int!(1);
                self.__stat = self.__stat.saturating_add(other.__stat);
                seca_wide_int!(1);
                self.__stat = self.__stat.saturating_add(other.__stat);
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

#[cfg(test)]
mod tests {
    use super::StatBlock;

    #[test]
    fn add_assign_sums_int_stats() {
        let mut a = StatBlock::default();
        a.attack = 1;
        a.mhp = 2;
        a.defense = 3;
        a.mep = 4;

        let mut b = StatBlock::default();
        b.attack = 10;
        b.mhp = 20;
        b.defense = 30;
        b.mep = 40;

        a += &b;

        assert_eq!(a.attack, 11);
        assert_eq!(a.mhp, 22);
        assert_eq!(a.defense, 33);
        assert_eq!(a.mep, 44);
    }

    #[test]
    fn add_assign_saturates_at_type_bounds() {
        let mut a = StatBlock::default();
        a.attack = i8::MAX;
        a.mhp = i16::MIN;

        let mut b = StatBlock::default();
        b.attack = 1;
        b.mhp = -1;

        a += &b;

        assert_eq!(a.attack, i8::MAX);
        assert_eq!(a.mhp, i16::MIN);
    }

    #[test]
    fn add_assign_unions_id_vecs_without_duplicates() {
        let mut a = StatBlock::default();
        a.action_ids = vec![1, 2];
        a.appearance_feature_ids = vec![7];

        let mut b = StatBlock::default();
        b.action_ids = vec![2, 3]; // 2 already present
        b.appearance_feature_ids = vec![7, 8]; // 7 already present

        a += &b;

        assert_eq!(a.action_ids, vec![1, 2, 3]);
        assert_eq!(a.appearance_feature_ids, vec![7, 8]);
    }

    #[test]
    fn add_assign_dedups_within_the_incoming_block() {
        let mut a = StatBlock::default();
        a.action_ids = vec![1];

        let mut b = StatBlock::default();
        b.action_ids = vec![2, 2, 2]; // internal duplicates

        a += &b;

        assert_eq!(a.action_ids, vec![1, 2]);
    }
}
