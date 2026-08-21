use std::ops::AddAssign;

use spacetimedb::SpacetimeType;

/// The set of appearance feature ids an entity presents. Every physical object
/// has these. Unlike the numeric groups, appearance MERGES as a set union: two
/// sources granting the same feature grant it once, and a removed source is not
/// modelled by negation (there is no "negative feature") — a recompute rebuilds
/// the set from the surviving sources.
#[derive(Debug, Clone, Default, SpacetimeType)]
pub struct AppearanceBlock {
    pub feature_ids: Vec<u32>,
}

impl AddAssign<&Self> for AppearanceBlock {
    fn add_assign(&mut self, other: &Self) {
        for id in &other.feature_ids {
            if !self.feature_ids.contains(id) {
                self.feature_ids.push(*id);
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::AppearanceBlock;

    #[test]
    fn add_assign_unions_without_duplicates() {
        let mut a = AppearanceBlock {
            feature_ids: vec![1, 2],
        };
        let b = AppearanceBlock {
            feature_ids: vec![2, 3], // 2 already present
        };
        a += &b;
        assert_eq!(a.feature_ids, vec![1, 2, 3]);
    }

    #[test]
    fn add_assign_dedups_within_the_incoming_block() {
        let mut a = AppearanceBlock {
            feature_ids: vec![1],
        };
        let b = AppearanceBlock {
            feature_ids: vec![2, 2, 2], // internal duplicates
        };
        a += &b;
        assert_eq!(a.feature_ids, vec![1, 2]);
    }
}
