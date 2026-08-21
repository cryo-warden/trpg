use std::ops::AddAssign;

use spacetimedb::SpacetimeType;

/// What an entity is READY to do: morale plus the action-suggesting tags. Only
/// meaningful on entities that can act (those with an action component), so this
/// is the group that owns the action-gating requirements check (`meets`).
///
/// Each tag counts a KIND of readiness a source provides (a stance grants
/// `upright`, a blade grants `bladed`, wings grant `wing`, ...) and a
/// circumstance consumes (negative); an action or stance requirement checks a
/// threshold against the merged total. The tag list is open by design — new
/// action-suggesting tags (fang, claw, ooze, and further ones) join here.
/// Merging saturates; `negated()` is the delta a removed source applies.
#[derive(Debug, Clone, Default, SpacetimeType)]
pub struct ReadinessBlock {
    /// Morale is RIGID: it rides readiness like a tag, never a fluid component.
    /// Fear/courage statuses contribute through their stat source.
    pub morale: i8,
    pub bladed: i8,
    pub blunt: i8,
    pub pole: i8,
    pub ward: i8,
    pub focus: i8,
    pub gait: i8,
    pub reach: i8,
    pub wing: i8,
    /// How upright the posture leaves the body: stances provide it, and actions
    /// that need footing (dive, lying down) require it.
    pub upright: i8,
    pub fang: i8,
    pub claw: i8,
    pub ooze: i8,
}

impl ReadinessBlock {
    /// The sign-flipped copy: the delta that removing this source applies.
    /// Saturating — i8::MIN flips to i8::MAX rather than panicking.
    pub fn negated(&self) -> ReadinessBlock {
        ReadinessBlock {
            morale: self.morale.saturating_neg(),
            bladed: self.bladed.saturating_neg(),
            blunt: self.blunt.saturating_neg(),
            pole: self.pole.saturating_neg(),
            ward: self.ward.saturating_neg(),
            focus: self.focus.saturating_neg(),
            gait: self.gait.saturating_neg(),
            reach: self.reach.saturating_neg(),
            wing: self.wing.saturating_neg(),
            upright: self.upright.saturating_neg(),
            fang: self.fang.saturating_neg(),
            claw: self.claw.saturating_neg(),
            ooze: self.ooze.saturating_neg(),
        }
    }

    /// Whether the readiness total clears every named threshold. An absent
    /// requirement (None) means "this tag is not checked" — never inferred from
    /// a zero, because tags are signed and a debuffed tag must not fail a
    /// requirement that never meant to check it.
    pub fn meets(&self, requirements: &ReadinessRequirements) -> bool {
        let unmet = |value: i8, min: Option<i8>| min.is_some_and(|min| value < min);
        !(unmet(self.morale, requirements.morale)
            || unmet(self.bladed, requirements.bladed)
            || unmet(self.blunt, requirements.blunt)
            || unmet(self.pole, requirements.pole)
            || unmet(self.ward, requirements.ward)
            || unmet(self.focus, requirements.focus)
            || unmet(self.gait, requirements.gait)
            || unmet(self.reach, requirements.reach)
            || unmet(self.wing, requirements.wing)
            || unmet(self.upright, requirements.upright)
            || unmet(self.fang, requirements.fang)
            || unmet(self.claw, requirements.claw)
            || unmet(self.ooze, requirements.ooze))
    }
}

impl AddAssign<&Self> for ReadinessBlock {
    fn add_assign(&mut self, other: &Self) {
        self.morale = self.morale.saturating_add(other.morale);
        self.bladed = self.bladed.saturating_add(other.bladed);
        self.blunt = self.blunt.saturating_add(other.blunt);
        self.pole = self.pole.saturating_add(other.pole);
        self.ward = self.ward.saturating_add(other.ward);
        self.focus = self.focus.saturating_add(other.focus);
        self.gait = self.gait.saturating_add(other.gait);
        self.reach = self.reach.saturating_add(other.reach);
        self.wing = self.wing.saturating_add(other.wing);
        self.upright = self.upright.saturating_add(other.upright);
        self.fang = self.fang.saturating_add(other.fang);
        self.claw = self.claw.saturating_add(other.claw);
        self.ooze = self.ooze.saturating_add(other.ooze);
    }
}

/// Explicitly named minimum thresholds over the readiness tags: an absent entry
/// means the tag is not checked (see `meets`). Carries no name references, so a
/// requirement is the same shape whether authored or stored.
#[derive(Debug, Clone, Default, SpacetimeType)]
pub struct ReadinessRequirements {
    pub morale: Option<i8>,
    pub bladed: Option<i8>,
    pub blunt: Option<i8>,
    pub pole: Option<i8>,
    pub ward: Option<i8>,
    pub focus: Option<i8>,
    pub gait: Option<i8>,
    pub reach: Option<i8>,
    pub wing: Option<i8>,
    pub upright: Option<i8>,
    pub fang: Option<i8>,
    pub claw: Option<i8>,
    pub ooze: Option<i8>,
}

#[cfg(test)]
mod tests {
    use super::{ReadinessBlock, ReadinessRequirements};

    #[test]
    fn add_assign_sums_every_field() {
        let mut a = ReadinessBlock {
            morale: 1,
            bladed: 2,
            blunt: 3,
            pole: 4,
            ward: 5,
            focus: 6,
            gait: 7,
            reach: 8,
            wing: 9,
            upright: 10,
            fang: 11,
            claw: 12,
            ooze: 13,
        };
        let b = ReadinessBlock {
            morale: 100,
            bladed: 100,
            blunt: 100,
            pole: 100,
            ward: 100,
            focus: 100,
            gait: 100,
            reach: 100,
            wing: 100,
            upright: 100,
            fang: 100,
            claw: 100,
            ooze: 100,
        };
        a += &b;
        assert_eq!(a.morale, 101);
        assert_eq!(a.bladed, 102);
        assert_eq!(a.blunt, 103);
        assert_eq!(a.pole, 104);
        assert_eq!(a.ward, 105);
        assert_eq!(a.focus, 106);
        assert_eq!(a.gait, 107);
        assert_eq!(a.reach, 108);
        assert_eq!(a.wing, 109);
        assert_eq!(a.upright, 110);
        assert_eq!(a.fang, 111);
        assert_eq!(a.claw, 112);
        assert_eq!(a.ooze, 113);
    }

    #[test]
    fn add_assign_saturates_at_type_bounds() {
        let mut a = ReadinessBlock {
            morale: i8::MAX,
            ooze: i8::MIN,
            ..Default::default()
        };
        let b = ReadinessBlock {
            morale: 1,
            ooze: -1,
            ..Default::default()
        };
        a += &b;
        assert_eq!(a.morale, i8::MAX);
        assert_eq!(a.ooze, i8::MIN);
    }

    #[test]
    fn negated_flips_signs_and_saturates() {
        let block = ReadinessBlock {
            morale: i8::MIN,
            bladed: 3,
            ooze: -4,
            ..Default::default()
        };
        let negated = block.negated();
        assert_eq!(negated.morale, i8::MAX);
        assert_eq!(negated.bladed, -3);
        assert_eq!(negated.ooze, 4);
    }

    #[test]
    fn meets_checks_only_named_thresholds() {
        let block = ReadinessBlock {
            morale: -5, // debuffed, but no requirement names morale
            bladed: 2,
            ..Default::default()
        };
        let mut requirements = ReadinessRequirements {
            bladed: Some(1),
            ..Default::default()
        };
        assert!(block.meets(&requirements));

        requirements.bladed = Some(3);
        assert!(!block.meets(&requirements));
    }

    #[test]
    fn meets_with_no_thresholds_always_passes() {
        let block = ReadinessBlock {
            morale: -10,
            upright: -10,
            ..Default::default()
        };
        assert!(block.meets(&ReadinessRequirements::default()));
    }

    #[test]
    fn meets_checks_morale_like_any_tag() {
        let block = ReadinessBlock {
            morale: 2,
            ..Default::default()
        };
        let mut requirements = ReadinessRequirements {
            morale: Some(3),
            ..Default::default()
        };
        assert!(!block.meets(&requirements));

        requirements.morale = Some(2);
        assert!(block.meets(&requirements));
    }
}
