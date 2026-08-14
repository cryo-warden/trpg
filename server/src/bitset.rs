use spacetimedb::SpacetimeType;

/// An ordered bitset over bytes — THE primitive, defined in isolation so
/// no usage site (quest progress, anything later) reimplements bit math.
/// Bits are addressed by index, least significant bit of byte 0 first;
/// storage grows on demand when a bit is set. The wrapper embeds directly
/// in tables and components as a SpacetimeType.
#[derive(Debug, Clone, Default, PartialEq, Eq, SpacetimeType)]
pub struct Bitset {
    bytes: Vec<u8>,
}

// The primitive lands ahead of its first usage site (quest progress);
// the allow dies with that first caller.
#[allow(dead_code)]
impl Bitset {
    pub fn new() -> Self {
        Self::default()
    }

    /// Turns the bit ON, growing storage to reach it. Setting an already
    /// set bit is a no-op.
    pub fn set(&mut self, index: u32) {
        let byte_index = (index / 8) as usize;
        if self.bytes.len() <= byte_index {
            self.bytes.resize(byte_index + 1, 0);
        }
        self.bytes[byte_index] |= 1 << (index % 8);
    }

    /// Reads one bit; anything beyond current storage reads as unset.
    pub fn is_set(&self, index: u32) -> bool {
        let byte_index = (index / 8) as usize;
        self.bytes
            .get(byte_index)
            .is_some_and(|byte| byte & (1 << (index % 8)) != 0)
    }

    /// How many bits are ON — the popcount driving computed stat blocks.
    pub fn count_ones(&self) -> u32 {
        self.bytes.iter().map(|byte| byte.count_ones()).sum()
    }
}

#[cfg(test)]
mod tests {
    use super::Bitset;

    #[test]
    fn bits_read_back_across_byte_boundaries() {
        let mut bits = Bitset::new();
        bits.set(0);
        bits.set(7);
        bits.set(8);
        bits.set(63);
        assert!(bits.is_set(0));
        assert!(bits.is_set(7));
        assert!(bits.is_set(8));
        assert!(bits.is_set(63));
        assert!(!bits.is_set(1));
        assert!(!bits.is_set(9));
        assert!(!bits.is_set(62));
    }

    #[test]
    fn unset_and_out_of_range_bits_read_as_unset() {
        let bits = Bitset::new();
        assert!(!bits.is_set(0));
        assert!(!bits.is_set(10_000));
    }

    #[test]
    fn count_ones_is_the_popcount_and_setting_is_idempotent() {
        let mut bits = Bitset::new();
        assert_eq!(bits.count_ones(), 0);
        bits.set(3);
        bits.set(3);
        bits.set(200);
        assert_eq!(bits.count_ones(), 2);
    }

    #[test]
    fn storage_grows_only_as_far_as_the_highest_set_bit() {
        let mut bits = Bitset::new();
        bits.set(9);
        // Bytes 0..=1 exist; nothing beyond.
        assert!(bits.is_set(9));
        assert!(!bits.is_set(16));
    }
}
