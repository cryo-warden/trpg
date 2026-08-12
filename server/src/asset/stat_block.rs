// Stats are deliberately narrow: play-relevant values live in roughly the
// -20..20 realm, so i8 covers them; only the HP/EP pools merit i16. Merging
// saturates instead of wrapping so extreme stacking clamps at the type's
// bounds rather than corrupting the total.
//
// The small-int section also holds the counted PROPERTY stats (hand, gait,
// reach, ...): bodies, traits, stances, and equipment provide them as
// positive contributions, circumstances consume them as negative ones, and
// action/stance requirements check thresholds against the merged total.
secador::secador_multi!(
    seca_small_int!(
        stat,
        [attack, defense, hand, gait, reach, blunt, bladed, pole, ward, focus, wing]
    ),
    seca_wide_int!(stat, [mhp, mep]),
    seca_id_vec!(
        (stat, StatType),
        [
            (action_ids, ActionId),
            (appearance_feature_ids, u32),
            (stance_ids, u32)
        ]
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

        /// Explicitly named minimum thresholds over the int stats: an absent
        /// entry means "this stat is not checked" — never inferred from a
        /// zero, because stats are signed and a debuffed stat must not fail a
        /// requirement that never meant to check it. The same type serves
        /// assets and stored rows: thresholds carry no asset-name references,
        /// so there is nothing for a push to resolve.
        #[derive(Debug, Clone, SpacetimeType, Default)]
        pub struct StatRequirements {
            __seca_small_int: __1,
            pub __stat: Option<i8>,
            __seca_wide_int: __1,
            pub __stat: Option<i16>,
        }

        impl StatBlock {
            pub fn meets(&self, requirements: &StatRequirements) -> bool {
                seca_small_int!(1);
                if requirements.__stat.is_some_and(|min| self.__stat < min) {
                    return false;
                }
                seca_wide_int!(1);
                if requirements.__stat.is_some_and(|min| self.__stat < min) {
                    return false;
                }
                true
            }
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
    use super::{StatBlock, StatRequirements};

    #[test]
    fn meets_checks_only_named_thresholds() {
        let mut block = StatBlock::default();
        block.attack = -5; // Debuffed, but no requirement names attack.
        block.gait = 2;

        let mut requirements = StatRequirements::default();
        requirements.gait = Some(1);

        assert!(block.meets(&requirements));

        requirements.gait = Some(3);
        assert!(!block.meets(&requirements));
    }

    #[test]
    fn meets_with_no_thresholds_always_passes() {
        let mut block = StatBlock::default();
        block.attack = -10;
        block.mhp = -10;
        assert!(block.meets(&StatRequirements::default()));
    }

    #[test]
    fn meets_checks_wide_stats_too() {
        let mut block = StatBlock::default();
        block.mhp = 10;

        let mut requirements = StatRequirements::default();
        requirements.mhp = Some(11);
        assert!(!block.meets(&requirements));

        requirements.mhp = Some(10);
        assert!(block.meets(&requirements));
    }

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
