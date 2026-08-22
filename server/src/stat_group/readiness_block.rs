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
/// action-suggesting tags (jaw, claw, ooze, and further ones) join here.
/// Merging saturates; `negated()` is the delta a removed source applies.
#[derive(Debug, Clone, Default, PartialEq, Eq, SpacetimeType)]
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
    /// FREE-HAND readiness for unarmed strikes — distinct from the body-capacity
    /// `hand` that counts slots to HOLD gear. A body with hands grants both;
    /// most hand-occupying gear consumes the capacity AND removes this readiness
    /// (a full hand can't bop), while gauntlets and certain shields keep it.
    pub hand: i8,
    /// A mouth to bite with (formerly `fang`): humans have jaws too, so this
    /// names the jaw, not a fanged maw. A higher jaw unlocks stronger bites.
    pub jaw: i8,
    pub claw: i8,
    pub ooze: i8,
    /// Elemental channeling tags. A spell requires `focus` (the discipline to
    /// channel) AND its matching element (the affinity): an element without focus
    /// casts nothing, and focus without an element casts nothing. Elements come
    /// from casting stances and from channeling armaments (staves, orbs,
    /// talismans), never from a body — any element can ride any creature.
    pub fire: i8,
    pub ice: i8,
    pub lightning: i8,
    /// Light drives healing and the occasional radiant strike; shadow drives
    /// magical buffs and debuffs.
    pub light: i8,
    pub shadow: i8,
    /// Body-composition posture tags: what the body is BUILT to do, so a stance
    /// only its anatomy supports is adoptable. `foot` is legged footing (standing,
    /// striding, sitting, ready, and the upright combat stances); `amorphous` is
    /// formlessness (the amorphous stance). Like `wing`, these come from the body
    /// itself, never from gear — a human cannot pour itself amorphous, and a slime
    /// cannot stand. `prone` stays ungated: anything can be knocked flat, and the
    /// defeat system forces prone on any body.
    pub foot: i8,
    pub amorphous: i8,
    /// Ethereal beings (sprites, wisps) are part-incorporeal. Gates the
    /// intangible stance — a body no blow fully lands on grows harder to hit —
    /// and, like the other body-composition tags, comes from the body itself.
    pub ethereal: i8,
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
            hand: self.hand.saturating_neg(),
            jaw: self.jaw.saturating_neg(),
            claw: self.claw.saturating_neg(),
            ooze: self.ooze.saturating_neg(),
            fire: self.fire.saturating_neg(),
            ice: self.ice.saturating_neg(),
            lightning: self.lightning.saturating_neg(),
            light: self.light.saturating_neg(),
            shadow: self.shadow.saturating_neg(),
            foot: self.foot.saturating_neg(),
            amorphous: self.amorphous.saturating_neg(),
            ethereal: self.ethereal.saturating_neg(),
        }
    }

    /// Whether the readiness total clears every threshold. A threshold of 0 means
    /// "this tag is not checked" — never a floor of `value >= 0`, because tags are
    /// signed: a debuffed tag (a feared entity's negative morale) must not fail a
    /// requirement that never meant to check it, and rally carries no requirements
    /// yet must stay usable while feared.
    ///
    /// Branchless on purpose: a readiness gate runs on every offered/derived
    /// action, so we compute every comparison and combine with bitwise `&`/`|`
    /// rather than short-circuiting — the numeric compares are cheaper than the
    /// branches they would replace.
    pub fn meets(&self, requirements: &ReadinessRequirements) -> bool {
        let unmet = |value: i8, min: i8| (min > 0) & (value < min);
        !(unmet(self.morale, requirements.morale)
            | unmet(self.bladed, requirements.bladed)
            | unmet(self.blunt, requirements.blunt)
            | unmet(self.pole, requirements.pole)
            | unmet(self.ward, requirements.ward)
            | unmet(self.focus, requirements.focus)
            | unmet(self.gait, requirements.gait)
            | unmet(self.reach, requirements.reach)
            | unmet(self.wing, requirements.wing)
            | unmet(self.upright, requirements.upright)
            | unmet(self.hand, requirements.hand)
            | unmet(self.jaw, requirements.jaw)
            | unmet(self.claw, requirements.claw)
            | unmet(self.ooze, requirements.ooze)
            | unmet(self.fire, requirements.fire)
            | unmet(self.ice, requirements.ice)
            | unmet(self.lightning, requirements.lightning)
            | unmet(self.light, requirements.light)
            | unmet(self.shadow, requirements.shadow)
            | unmet(self.foot, requirements.foot)
            | unmet(self.amorphous, requirements.amorphous)
            | unmet(self.ethereal, requirements.ethereal))
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
        self.hand = self.hand.saturating_add(other.hand);
        self.jaw = self.jaw.saturating_add(other.jaw);
        self.claw = self.claw.saturating_add(other.claw);
        self.ooze = self.ooze.saturating_add(other.ooze);
        self.fire = self.fire.saturating_add(other.fire);
        self.ice = self.ice.saturating_add(other.ice);
        self.lightning = self.lightning.saturating_add(other.lightning);
        self.light = self.light.saturating_add(other.light);
        self.shadow = self.shadow.saturating_add(other.shadow);
        self.foot = self.foot.saturating_add(other.foot);
        self.amorphous = self.amorphous.saturating_add(other.amorphous);
        self.ethereal = self.ethereal.saturating_add(other.ethereal);
    }
}

/// Minimum thresholds over the readiness tags: 0 means the tag is not checked
/// (see `meets`). Plain `i8` rather than `Option<i8>` on purpose — an option
/// would spend an extra discriminant byte per field and double this stored row,
/// and 0 is a perfectly good "no floor" bottom since no requirement ever wants a
/// negative minimum. Carries no name references, so a requirement is the same
/// shape whether authored or stored.
#[derive(Debug, Clone, Default, PartialEq, Eq, SpacetimeType)]
pub struct ReadinessRequirements {
    pub morale: i8,
    pub bladed: i8,
    pub blunt: i8,
    pub pole: i8,
    pub ward: i8,
    pub focus: i8,
    pub gait: i8,
    pub reach: i8,
    pub wing: i8,
    pub upright: i8,
    pub hand: i8,
    pub jaw: i8,
    pub claw: i8,
    pub ooze: i8,
    pub fire: i8,
    pub ice: i8,
    pub lightning: i8,
    pub light: i8,
    pub shadow: i8,
    pub foot: i8,
    pub amorphous: i8,
    pub ethereal: i8,
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
            jaw: 11,
            claw: 12,
            ooze: 13,
            hand: 14,
            fire: 15,
            ice: 16,
            lightning: 17,
            light: 18,
            shadow: 19,
            foot: 20,
            amorphous: 21,
            ethereal: 22,
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
            jaw: 100,
            claw: 100,
            ooze: 100,
            hand: 100,
            fire: 100,
            ice: 100,
            lightning: 100,
            light: 100,
            shadow: 100,
            foot: 100,
            amorphous: 100,
            ethereal: 100,
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
        assert_eq!(a.jaw, 111);
        assert_eq!(a.claw, 112);
        assert_eq!(a.ooze, 113);
        assert_eq!(a.hand, 114);
        assert_eq!(a.fire, 115);
        assert_eq!(a.ice, 116);
        assert_eq!(a.lightning, 117);
        assert_eq!(a.light, 118);
        assert_eq!(a.shadow, 119);
        assert_eq!(a.foot, 120);
        assert_eq!(a.amorphous, 121);
        assert_eq!(a.ethereal, 122);
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
    fn meets_ignores_zero_thresholds() {
        let block = ReadinessBlock {
            morale: -5, // debuffed, but the morale threshold is 0 (unchecked)
            bladed: 2,
            ..Default::default()
        };
        let mut requirements = ReadinessRequirements {
            bladed: 1,
            ..Default::default()
        };
        assert!(block.meets(&requirements));

        requirements.bladed = 3;
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
            morale: 3,
            ..Default::default()
        };
        assert!(!block.meets(&requirements));

        requirements.morale = 2;
        assert!(block.meets(&requirements));
    }
}
