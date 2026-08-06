use spacetimedb::rand::{rngs::StdRng, RngCore};

pub trait RngRange {
    fn get_range<T, U>(&mut self, min: T, max: T) -> U
    where
        T: Into<u32>,
        U: TryFrom<u32> + Default;
}

impl RngRange for StdRng {
    fn get_range<T, U>(&mut self, min: T, max: T) -> U
    where
        T: Into<u32>,
        U: TryFrom<u32> + Default,
    {
        let min = min.into();
        let max = max.into();

        if min >= max {
            min
        } else {
            min + self.next_u32() % (max - min)
        }
        .try_into()
        .unwrap_or_default()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use spacetimedb::rand::SeedableRng;

    #[test]
    fn results_stay_within_the_half_open_range() {
        let mut rng = StdRng::seed_from_u64(0);
        for _ in 0..10_000 {
            let v: u32 = rng.get_range(3u32, 7u32);
            assert!((3..7).contains(&v), "{v} out of [3, 7)");
        }
    }

    #[test]
    fn an_empty_range_returns_its_lower_bound() {
        let mut rng = StdRng::seed_from_u64(0);
        // min >= max short-circuits to min, so this never divides by zero.
        assert_eq!(rng.get_range::<u32, u32>(5, 5), 5);
        assert_eq!(rng.get_range::<u32, u32>(9, 2), 9);
    }

    #[test]
    fn both_endpoints_of_the_range_are_reachable() {
        let mut rng = StdRng::seed_from_u64(0);
        let mut saw_min = false;
        let mut saw_max = false;
        for _ in 0..10_000 {
            let v: u32 = rng.get_range(0u32, 3u32);
            saw_min |= v == 0;
            saw_max |= v == 2;
        }
        assert!(saw_min && saw_max, "range endpoints not covered");
    }
}
