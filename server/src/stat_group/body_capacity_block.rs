use std::ops::AddAssign;

use spacetimedb::SpacetimeType;

/// The equipment CAPACITY stats — the ONLY group that gates equipment, and so
/// the only group whose change need re-derive equipment computation:
///   hand  — grip capacity for armaments (each armament consumes some),
///   body  — the lone worn-armor slot (the body provides 1, worn armor
///           consumes 1),
///   relic — the four relic slots (the body provides 4, each worn relic
///           consumes 1).
/// A body provides the positive capacity; each equipped item consumes it
/// (negative). Merging saturates; `negated()` is the unequip delta.
#[derive(Debug, Clone, Default, SpacetimeType)]
pub struct BodyCapacityBlock {
    pub hand: i8,
    pub body: i8,
    pub relic: i8,
}

impl BodyCapacityBlock {
    /// Whether an equipped item's capacity block applies on top of `self` (the
    /// running total of everything applied so far — every other source plus the
    /// equipment already kept). An item applies unless it would drive a
    /// capacity it CONSUMES below zero.
    ///
    /// The test is per-item CAUSATION, not "is the total valid": a capacity
    /// already spent below zero by non-equipment sources (a stacked hand
    /// debuff, say) never disables an item that doesn't consume that
    /// capacity — a hand curse drops an armament, never your armor. An item
    /// whose contribution to a capacity is non-negative can never be the cause,
    /// so only consumed capacities are checked.
    pub fn admits_equipment_item(&self, item: &BodyCapacityBlock) -> bool {
        let admits = |running: i8, delta: i8| delta >= 0 || running.saturating_add(delta) >= 0;
        admits(self.hand, item.hand)
            && admits(self.body, item.body)
            && admits(self.relic, item.relic)
    }

    /// The sign-flipped copy: the delta that removing this source applies.
    /// Saturating — i8::MIN flips to i8::MAX rather than panicking.
    pub fn negated(&self) -> BodyCapacityBlock {
        BodyCapacityBlock {
            hand: self.hand.saturating_neg(),
            body: self.body.saturating_neg(),
            relic: self.relic.saturating_neg(),
        }
    }
}

impl AddAssign<&Self> for BodyCapacityBlock {
    fn add_assign(&mut self, other: &Self) {
        self.hand = self.hand.saturating_add(other.hand);
        self.body = self.body.saturating_add(other.body);
        self.relic = self.relic.saturating_add(other.relic);
    }
}

#[cfg(test)]
mod tests {
    use super::BodyCapacityBlock;

    #[test]
    fn admits_item_that_leaves_capacity_at_zero() {
        let running = BodyCapacityBlock {
            hand: 1, // one free hand
            ..Default::default()
        };
        let item = BodyCapacityBlock {
            hand: -1, // a one-handed armament
            ..Default::default()
        };
        assert!(running.admits_equipment_item(&item));
    }

    #[test]
    fn rejects_item_that_drives_a_capacity_it_consumes_below_zero() {
        let running = BodyCapacityBlock {
            hand: 0, // no free hands left
            ..Default::default()
        };
        let item = BodyCapacityBlock {
            hand: -1,
            ..Default::default()
        };
        assert!(!running.admits_equipment_item(&item));
    }

    #[test]
    fn a_spent_capacity_never_blocks_an_item_that_does_not_consume_it() {
        // Grip is exhausted (a hand debuff dug it below zero), but armor
        // consumes the BODY slot, not hands — a hand curse must not strip it.
        let running = BodyCapacityBlock {
            hand: -1,
            body: 1,
            ..Default::default()
        };
        let armor = BodyCapacityBlock {
            body: -1,
            ..Default::default()
        };
        assert!(running.admits_equipment_item(&armor));
    }

    #[test]
    fn rejects_relic_when_all_four_relic_slots_are_spent() {
        let running = BodyCapacityBlock {
            relic: 0, // four relics already applied
            ..Default::default()
        };
        let relic = BodyCapacityBlock {
            relic: -1,
            ..Default::default()
        };
        assert!(!running.admits_equipment_item(&relic));
    }

    #[test]
    fn admits_item_that_grants_capacity() {
        // A non-negative contribution to a capacity can never be the cause of a
        // violation, so it always passes that stat's gate.
        let running = BodyCapacityBlock {
            hand: -3,
            ..Default::default()
        };
        let item = BodyCapacityBlock {
            hand: 1, // grants grip rather than consuming it
            ..Default::default()
        };
        assert!(running.admits_equipment_item(&item));
    }

    #[test]
    fn add_assign_sums_every_field() {
        let mut a = BodyCapacityBlock {
            hand: 1,
            body: 2,
            relic: 3,
        };
        let b = BodyCapacityBlock {
            hand: 10,
            body: 20,
            relic: 30,
        };
        a += &b;
        assert_eq!(a.hand, 11);
        assert_eq!(a.body, 22);
        assert_eq!(a.relic, 33);
    }

    #[test]
    fn negated_flips_signs_and_saturates() {
        let block = BodyCapacityBlock {
            hand: i8::MIN,
            body: 4,
            relic: -2,
        };
        let negated = block.negated();
        assert_eq!(negated.hand, i8::MAX);
        assert_eq!(negated.body, -4);
        assert_eq!(negated.relic, 2);
    }
}
