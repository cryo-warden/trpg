// Stats are deliberately narrow: play-relevant values live in roughly the
// -20..20 realm, so i8 covers them; only the HP/EP maxima merit i16. Merging
// saturates instead of wrapping so extreme stacking clamps at the type's
// bounds rather than corrupting the total.
//
// The small-int section also holds the counted PROPERTY stats (hand, gait,
// reach, ...): bodies, traits, stances, and equipment provide them as
// positive contributions, circumstances consume them as negative ones, and
// action/stance requirements check thresholds against the merged total.
//
// Three of them are equipment CAPACITY stats — hand (armaments), body (the
// lone worn-armor slot), and relic (four relic slots): the body provides the
// positive capacity, each equipped item consumes one (negative), and the
// equipment stat computation applies an item only while the running capacity
// stays >= 0 (see capacity_requirements / entity_stats_system).
secador::secador_multi!(
    seca_small_int!(
        stat,
        [
            attack, defense, hand, body, relic, gait, reach, blunt, bladed, pole, ward, focus, wing,
            upright, size, morale
        ]
    ),
    seca_wide_int!(stat, [mhp, mep]),
    seca_id_vec!(
        (stat, StatType),
        [
            (action_ids, ActionId),
            (appearance_feature_ids, u32)
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
            /// Whether an equipped item's block applies on top of `self` (the
            /// running total of everything applied so far — every other stat
            /// source plus the equipment already kept). An item applies unless
            /// it would drive a CAPACITY stat it CONSUMES below zero: hand
            /// (grip), body (the lone worn-armor slot), or relic (the four
            /// relic slots) — the three stats named explicitly here, the one
            /// place that knows which stats gate equipment.
            ///
            /// The test is per-item CAUSATION, not "is the total valid": a
            /// capacity already spent below zero by non-equipment sources (a
            /// stacked hand debuff, say) never disables an item that doesn't
            /// consume that capacity — a hand curse drops an armament, never
            /// your armor. An item whose contribution to a capacity is
            /// non-negative can never be the cause, so only consumed
            /// capacities are checked.
            pub fn admits_equipment_item(&self, item: &StatBlock) -> bool {
                let admits = |running: i8, delta: i8| {
                    delta >= 0 || running.saturating_add(delta) >= 0
                };
                admits(self.hand, item.hand)
                    && admits(self.body, item.body)
                    && admits(self.relic, item.relic)
            }

            /// The sign-flipped copy of the INT stats (id vecs stay empty):
            /// the delta an unequip applies. Saturating — i8::MIN flips to
            /// i8::MAX rather than panicking.
            pub fn negated(&self) -> StatBlock {
                let mut negated = StatBlock::default();
                seca_small_int!(1);
                negated.__stat = self.__stat.saturating_neg();
                seca_wide_int!(1);
                negated.__stat = self.__stat.saturating_neg();
                negated
            }

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
    fn admits_item_that_leaves_capacity_at_zero() {
        let mut running = StatBlock::default();
        running.hand = 1; // one free hand
        let mut item = StatBlock::default();
        item.hand = -1; // a one-handed armament
        assert!(running.admits_equipment_item(&item));
    }

    #[test]
    fn rejects_item_that_drives_a_capacity_it_consumes_below_zero() {
        let mut running = StatBlock::default();
        running.hand = 0; // no free hands left
        let mut item = StatBlock::default();
        item.hand = -1;
        assert!(!running.admits_equipment_item(&item));
    }

    #[test]
    fn a_spent_capacity_never_blocks_an_item_that_does_not_consume_it() {
        // Grip is exhausted (a hand debuff dug it below zero), but armor
        // consumes the BODY slot, not hands — a hand curse must not strip it.
        let mut running = StatBlock::default();
        running.hand = -1;
        running.body = 1;
        let mut armor = StatBlock::default();
        armor.body = -1;
        armor.defense = 2;
        assert!(running.admits_equipment_item(&armor));
    }

    #[test]
    fn rejects_relic_when_all_four_relic_slots_are_spent() {
        let mut running = StatBlock::default();
        running.relic = 0; // four relics already applied
        let mut relic = StatBlock::default();
        relic.relic = -1;
        assert!(!running.admits_equipment_item(&relic));
    }

    #[test]
    fn admits_item_that_grants_capacity() {
        // A non-negative contribution to a capacity can never be the cause of
        // a violation, so it always passes that stat's gate.
        let mut running = StatBlock::default();
        running.hand = -3;
        let mut item = StatBlock::default();
        item.hand = 1; // grants grip rather than consuming it
        assert!(running.admits_equipment_item(&item));
    }

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
