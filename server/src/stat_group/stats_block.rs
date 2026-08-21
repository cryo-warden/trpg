use std::ops::AddAssign;

use spacetimedb::SpacetimeType;

/// The universal physical-object stats: every physical object — creature,
/// corpse, breakable prop — has hit/effort maxima, an attack and defense, and a
/// size. Values stay narrow (roughly -20..20), so i8 covers all but the HP/EP
/// maxima, which merit i16.
///
/// Merging saturates rather than wrapping, so extreme stacking clamps at the
/// type's bounds instead of corrupting the total. `negated()` is the delta an
/// unequip (or any removed source) applies.
#[derive(Debug, Clone, Default, SpacetimeType)]
pub struct StatsBlock {
    pub mhp: i16,
    pub mep: i16,
    pub attack: i8,
    pub defense: i8,
    /// Granular size: contests, intimidation, pickup and gear gating all
    /// compare DELTAS, so nothing is inherently gargantuan — a kaiju battle and
    /// a fairy battle share mechanics.
    pub size: i8,
}

impl StatsBlock {
    /// The sign-flipped copy: the delta that removing this source applies.
    /// Saturating — i8::MIN flips to i8::MAX rather than panicking.
    pub fn negated(&self) -> StatsBlock {
        StatsBlock {
            mhp: self.mhp.saturating_neg(),
            mep: self.mep.saturating_neg(),
            attack: self.attack.saturating_neg(),
            defense: self.defense.saturating_neg(),
            size: self.size.saturating_neg(),
        }
    }
}

impl AddAssign<&Self> for StatsBlock {
    fn add_assign(&mut self, other: &Self) {
        self.mhp = self.mhp.saturating_add(other.mhp);
        self.mep = self.mep.saturating_add(other.mep);
        self.attack = self.attack.saturating_add(other.attack);
        self.defense = self.defense.saturating_add(other.defense);
        self.size = self.size.saturating_add(other.size);
    }
}

#[cfg(test)]
mod tests {
    use super::StatsBlock;

    #[test]
    fn add_assign_sums_every_field() {
        let mut a = StatsBlock {
            mhp: 1,
            mep: 2,
            attack: 3,
            defense: 4,
            size: 5,
        };
        let b = StatsBlock {
            mhp: 10,
            mep: 20,
            attack: 30,
            defense: 40,
            size: 50,
        };
        a += &b;
        assert_eq!(a.mhp, 11);
        assert_eq!(a.mep, 22);
        assert_eq!(a.attack, 33);
        assert_eq!(a.defense, 44);
        assert_eq!(a.size, 55);
    }

    #[test]
    fn add_assign_saturates_at_type_bounds() {
        let mut a = StatsBlock {
            mhp: i16::MAX,
            attack: i8::MIN,
            ..Default::default()
        };
        let b = StatsBlock {
            mhp: 1,
            attack: -1,
            ..Default::default()
        };
        a += &b;
        assert_eq!(a.mhp, i16::MAX);
        assert_eq!(a.attack, i8::MIN);
    }

    #[test]
    fn negated_flips_signs_and_saturates() {
        let block = StatsBlock {
            mhp: i16::MIN,
            mep: 7,
            attack: i8::MIN,
            defense: -3,
            size: 2,
        };
        let negated = block.negated();
        assert_eq!(negated.mhp, i16::MAX);
        assert_eq!(negated.mep, -7);
        assert_eq!(negated.attack, i8::MAX);
        assert_eq!(negated.defense, 3);
        assert_eq!(negated.size, -2);
    }
}
